// =====================================================================
// Thread pool built on Node.js worker_threads (multithreading).
//
// - The worker threads are started ONCE and then reused for every run,
//   like a Java ExecutorService. Starting a thread is slow (it loads a
//   new JavaScript engine), so re-using them makes later runs fast.
// - runWeightSearch() splits the weight sets into equal slices, gives one
//   slice to each thread at the same time, waits for ALL of them
//   (like Thread.join()), then merges each thread's best results.
// - It also runs the same job on the main thread only, so the page can
//   show the speed-up, and checks both found the same winner.
// =====================================================================
import { Worker } from "node:worker_threads";
import os from "node:os";
import path from "node:path";
import { allWeightSets, bestWeightSets, insertTop } from "../matching/scoring.mjs";

// About one thread per physical CPU core (most CPUs show 2 "logical"
// cores per physical core, which doesn't help number crunching much),
// between 2 and 8 threads.
export function threadCount() {
  const logical = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
  return Math.max(2, Math.min(Math.ceil(logical / 2), 8));
}

// Path to the worker file. process.cwd() is the project folder (locally
// and on Vercel, where next.config.mjs includes the workers folder).
export function workerFile() {
  return path.join(process.cwd(), "workers", "weight-search.worker.mjs");
}

// ---------------------------------------------------------------------
// The pool (kept between requests while the server is running)
// ---------------------------------------------------------------------
let pool = null; // { file, workers: Worker[] }
let nextTaskId = 0;

function getPool(file, size) {
  if (pool && pool.file === file && pool.workers.length === size) {
    return { workers: pool.workers, started: false };
  }
  shutdownPool();
  const workers = Array.from({ length: size }, () => {
    const worker = new Worker(file);
    worker.unref(); // an idle pool must not keep the server process alive
    // If a thread crashes, throw the whole pool away; the next run makes a new one
    worker.on("error", () => shutdownPool());
    worker.on("exit", () => {
      if (pool?.workers.includes(worker)) pool = null;
    });
    return worker;
  });
  pool = { file, workers };
  return { workers, started: true };
}

export function shutdownPool() {
  if (!pool) return;
  const old = pool;
  pool = null;
  old.workers.forEach((worker) => worker.terminate());
}

// Sends one task to one thread and waits for its answer
function runTask(worker, task) {
  return new Promise((resolve, reject) => {
    const taskId = ++nextTaskId;
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

// Split `total` items into `parts` nearly equal [start, end) ranges
export function splitRanges(total, parts) {
  const size = Math.ceil(total / parts);
  const ranges = [];
  for (let start = 0; start < total; start += size) {
    ranges.push([start, Math.min(start + size, total)]);
  }
  return ranges;
}

export async function runWeightSearch({ pairs, step = 1, keep = 5, threads = threadCount(), file = workerFile() }) {
  const total = allWeightSets(step).length;

  // ---- Multi-threaded run ----
  // One shared 32-bit integer that every thread can see and update
  const progressBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
  const progress = new Int32Array(progressBuffer);

  const multiStart = performance.now();
  const { workers, started } = getPool(file, threads);
  const ranges = splitRanges(total, workers.length);
  const results = await Promise.all(
    ranges.map(([start, end], index) => runTask(workers[index], { start, end, step, pairs, keep, progressBuffer }))
  );
  const multiMs = performance.now() - multiStart;

  // Merge: the overall best are among each thread's best
  const merged = [];
  for (const result of results) {
    for (const item of result.best) insertTop(merged, item, keep);
  }

  // ---- Single-threaded run (same work, for comparison) ----
  const singleStart = performance.now();
  const single = bestWeightSets(allWeightSets(step), pairs, keep);
  const singleMs = performance.now() - singleStart;

  return {
    best: merged,
    total,
    threads: results.length,
    poolStarted: started, // true = this run also had to start the threads
    perThread: results.map((r) => ({ threadId: r.threadId, evaluated: r.evaluated, ms: Math.round(r.ms) })),
    sharedCounter: Atomics.load(progress, 0),
    multiMs: Math.round(multiMs),
    singleMs: Math.round(singleMs),
    sameWinner: sameWeights(merged[0]?.weights, single[0]?.weights),
  };
}

function sameWeights(a, b) {
  if (!a || !b) return a === b;
  return a.rpm === b.rpm && a.deadhead === b.deadhead && a.lane === b.lane && a.broker === b.broker;
}
