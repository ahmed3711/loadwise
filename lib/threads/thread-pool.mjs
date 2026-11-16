// =====================================================================
// DESIGN PATTERN 2: SINGLETON  (+ multithreading)
//
// ThreadPool starts a few Node.js worker threads ONCE and reuses them for
// every request, like a Java ExecutorService. Starting a thread is slow
// (each one loads a new JavaScript engine), so the whole server must share
// exactly ONE pool. The Singleton pattern makes sure of that:
//   - the constructor is blocked from outside the class, and
//   - ThreadPool.getInstance() always returns the same object.
// =====================================================================
import { Worker } from "node:worker_threads";
import os from "node:os";
import path from "node:path";

// About one thread per physical CPU core (most CPUs show 2 "logical"
// cores per physical core, which doesn't help number crunching much),
// between 2 and 8 threads.
export function defaultThreadCount() {
  const logical = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
  return Math.max(2, Math.min(Math.ceil(logical / 2), 8));
}

// process.cwd() is the project folder (locally and on Vercel, where
// next.config.mjs includes the workers folder in the upload)
export function defaultWorkerFile() {
  return path.join(process.cwd(), "workers", "matching.worker.mjs");
}

export class ThreadPool {
  static #instance = null; // the one and only pool
  static #creating = false; // only getInstance() may call "new"

  static getInstance() {
    if (!ThreadPool.#instance) {
      ThreadPool.#creating = true;
      try {
        ThreadPool.#instance = new ThreadPool(defaultWorkerFile(), defaultThreadCount());
      } finally {
        ThreadPool.#creating = false;
      }
    }
    return ThreadPool.#instance;
  }

  // Stops the threads and forgets the instance (used by the tests, or
  // after a thread crashes; the next getInstance() starts a fresh pool)
  static async reset() {
    const old = ThreadPool.#instance;
    ThreadPool.#instance = null;
    if (old) await old.#terminate();
  }

  #workers = [];
  #nextTaskId = 0;

  constructor(file, size) {
    if (!ThreadPool.#creating) {
      throw new Error("ThreadPool is a Singleton: use ThreadPool.getInstance()");
    }
    this.file = file;
    this.size = size;
    this.startedAt = new Date();
    this.runs = 0; // how many jobs this pool has run (shows it is reused)
  }

  // Threads are started the first time they are needed (lazy start)
  get started() {
    return this.#workers.length > 0;
  }

  #ensureWorkers() {
    if (this.started) return false;
    this.#workers = Array.from({ length: this.size }, () => {
      const worker = new Worker(this.file);
      worker.unref(); // an idle pool must not keep the server running
      worker.on("error", () => ThreadPool.reset()); // a crashed thread -> new pool next time
      return worker;
    });
    return true;
  }

  // Runs one task on every thread at the same time (tasks[i] -> thread i)
  // and waits for ALL of them to finish (like Thread.join()).
  // Returns { results, justStarted }.
  async runAll(tasks) {
    const justStarted = this.#ensureWorkers();
    if (tasks.length > this.#workers.length) {
      throw new Error(`Only ${this.#workers.length} threads for ${tasks.length} tasks`);
    }
    this.runs += 1;
    const results = await Promise.all(tasks.map((task, i) => this.#runOn(this.#workers[i], task)));
    return { results, justStarted };
  }

  // Sends one task to one thread and waits for its answer
  #runOn(worker, task) {
    return new Promise((resolve, reject) => {
      const taskId = ++this.#nextTaskId;
      const onMessage = (message) => {
        if (message.taskId !== taskId) return;
        cleanup();
        if (message.error) reject(new Error(message.error));
        else resolve(message);
      };
      const onError = (error) => {
        cleanup();
        reject(error);
      };
      function cleanup() {
        worker.off("message", onMessage);
        worker.off("error", onError);
      }
      worker.on("message", onMessage);
      worker.once("error", onError);
      worker.postMessage({ ...task, taskId });
    });
  }

  async #terminate() {
    const workers = this.#workers;
    this.#workers = [];
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}
