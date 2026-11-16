// =====================================================================
// Code that runs inside each worker thread (multithreading).
//
// The thread stays alive and waits for tasks, like a thread in a Java
// ExecutorService pool. It understands two kinds of task:
//
// 1. "stability": test one slice of the weight mixes (Stability Check).
//    Results go into SHARED memory (a SharedArrayBuffer that the main
//    thread and every worker thread can see):
//      shared[0]      = progress counter (mixes tested so far)
//      shared[1 + i]  = how many mixes load i won
//    Atomics.add() makes each update one uninterruptible step, so two
//    threads can never overwrite each other's count.
//
// 2. "race": the race condition demo. Every thread adds 1 to a shared
//    counter many times, once WITHOUT synchronization (counter[0]++) and
//    once WITH Atomics.add(). The unsafe counter loses updates.
// =====================================================================
import { parentPort, threadId } from "node:worker_threads";
import { countWins } from "../lib/matching/stability.mjs";

parentPort.on("message", (task) => {
  try {
    const startedAt = performance.now();
    const result = task.type === "race" ? runRace(task) : runStability(task);
    parentPort.postMessage({ taskId: task.taskId, threadId, ms: performance.now() - startedAt, ...result });
  } catch (error) {
    parentPort.postMessage({ taskId: task?.taskId, error: error.message });
  }
});

function runStability({ rowStart, rowEnd, steps, flat, loadCount, sharedBuffer }) {
  const shared = new Int32Array(sharedBuffer);

  // Each thread counts in its own local array first (no waiting for the
  // other threads), and only adds its totals to shared memory at the end.
  const myWins = new Int32Array(loadCount);
  const tested = countWins({
    rowStart,
    rowEnd,
    steps,
    flat,
    loadCount,
    wins: myWins,
    onBatch: (n) => Atomics.add(shared, 0, n), // thread-safe "progress += n"
  });

  for (let i = 0; i < loadCount; i++) {
    if (myWins[i] > 0) Atomics.add(shared, 1 + i, myWins[i]);
  }
  return { tested, rows: [rowStart, rowEnd] };
}

function runRace({ times, sharedBuffer }) {
  const shared = new Int32Array(sharedBuffer);
  for (let i = 0; i < times; i++) {
    shared[0]++; // NOT safe: read, add 1, write back (another thread can write in between)
    Atomics.add(shared, 16, 1); // safe (index 16 = a different part of memory than index 0)
  }
  return { times };
}
