// =====================================================================
// The two multithreaded jobs, run on the shared ThreadPool.
// =====================================================================
import { ThreadPool } from "./thread-pool.mjs";
import { countWins, flattenParts, mixCount, splitRows, STEPS } from "../matching/stability.mjs";

// ---------------------------------------------------------------------
// Stability Check: count how often each load is #1 over every weight mix.
// partsList = [{ rpm, deadhead, lane }, ...] in the current ranking order.
// Also runs the same job on the main thread only, to compare the time.
// ---------------------------------------------------------------------
export async function runStabilityCheck(partsList, { steps = STEPS, pool = ThreadPool.getInstance() } = {}) {
  const loadCount = partsList.length;
  const total = mixCount(steps);
  const flat = flattenParts(partsList);

  // ---- Multi-threaded run ----
  // Shared memory: [progress counter, wins of load 0, wins of load 1, ...]
  const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * (1 + loadCount));
  const shared = new Int32Array(sharedBuffer);

  const multiStart = performance.now();
  const groups = splitRows(steps, pool.size);
  const { results, justStarted } = await pool.runAll(
    groups.map((group) => ({ type: "stability", ...group, steps, flat, loadCount, sharedBuffer }))
  );
  const multiMs = performance.now() - multiStart;
  const multiWins = Array.from(shared.subarray(1));

  // ---- Single-threaded run (same work on the main thread) ----
  const singleWins = new Int32Array(loadCount);
  const singleStart = performance.now();
  countWins({ rowStart: 0, rowEnd: steps + 1, steps, flat, loadCount, wins: singleWins });
  const singleMs = performance.now() - singleStart;

  return {
    total,
    wins: multiWins,
    sharedCounter: Atomics.load(shared, 0), // should equal total
    sameResult: multiWins.every((count, i) => count === singleWins[i]),
    threads: results.length,
    justStarted, // true = this run also had to start the threads
    poolRuns: pool.runs,
    perThread: results.map((r, i) => ({ threadId: r.threadId, mixes: groups[i].mixes, ms: round1(r.ms) })),
    multiMs: round1(multiMs),
    singleMs: round1(singleMs),
  };
}

// ---------------------------------------------------------------------
// Race condition demo: every thread adds 1 to a shared counter `times`
// times, without and with synchronization.
// ---------------------------------------------------------------------
export async function runRaceDemo({ times = 1_000_000, pool = ThreadPool.getInstance() } = {}) {
  // 17 ints: index 0 = unsafe counter, index 16 = safe counter (64 bytes apart)
  const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 17);
  const shared = new Int32Array(sharedBuffer);

  const tasks = Array.from({ length: pool.size }, () => ({ type: "race", times, sharedBuffer }));
  const started = performance.now();
  const { results } = await pool.runAll(tasks);

  const expected = times * results.length;
  const unsafe = Atomics.load(shared, 0);
  const safe = Atomics.load(shared, 16);
  return {
    threads: results.length,
    times,
    expected,
    unsafe,
    safe,
    lost: expected - unsafe,
    ms: round1(performance.now() - started),
  };
}

function round1(value) {
  return Math.round(value * 10) / 10;
}
