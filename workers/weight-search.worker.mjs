// =====================================================================
// Worker thread for the Weight Lab (multithreading).
//
// The thread stays alive and waits for tasks (like a thread in a Java
// ExecutorService pool). Each task gives it a slice of the weight sets
// (start..end) to test against the same historical booking pairs.
//
// All threads add to ONE shared progress counter. Atomics.add() makes
// that update a single, uninterruptible step, so two threads can never
// overwrite each other's count (no race condition). A normal
// "progress[0] += n" here could lose updates, like the
// "without synchronization" lab task.
//
// The counter is updated once every 1,000 weight sets, not after every
// set: if 8 threads all fight over the same memory 176,851 times, they
// spend more time waiting for each other than working (contention).
// =====================================================================
import { parentPort, threadId } from "node:worker_threads";
import { allWeightSets, bestWeightSets } from "../lib/matching/scoring.mjs";

const BATCH = 1000;
const setsByStep = new Map(); // weight sets are generated once per thread and reused

parentPort.on("message", (task) => {
  try {
    const { taskId, start, end, step, pairs, keep, progressBuffer } = task;
    const startedAt = performance.now();
    const progress = new Int32Array(progressBuffer);

    if (!setsByStep.has(step)) setsByStep.set(step, allWeightSets(step));
    const mySlice = setsByStep.get(step).slice(start, end);

    let sinceLastUpdate = 0;
    const best = bestWeightSets(mySlice, pairs, keep, () => {
      sinceLastUpdate += 1;
      if (sinceLastUpdate === BATCH) {
        Atomics.add(progress, 0, BATCH); // thread-safe "progress = progress + 1000"
        sinceLastUpdate = 0;
      }
    });
    Atomics.add(progress, 0, sinceLastUpdate); // the last few

    parentPort.postMessage({
      taskId,
      threadId,
      evaluated: mySlice.length,
      best,
      ms: performance.now() - startedAt,
    });
  } catch (error) {
    parentPort.postMessage({ taskId: task?.taskId, error: error.message });
  }
});
