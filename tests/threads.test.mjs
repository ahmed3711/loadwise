// Tests for the multithreaded Weight Lab (lib/threads/pool.mjs).
// These start real Node.js worker threads.
import path from "node:path";
import { runWeightSearch, shutdownPool, splitRanges } from "../lib/threads/pool.mjs";
import { allWeightSets, bestWeightSets } from "../lib/matching/scoring.mjs";

const workerFile = path.resolve("workers/weight-search.worker.mjs");

// Small made-up history: the dispatcher prefers short empty miles and home lanes
const pairs = Array.from({ length: 40 }, (_, i) => ({
  chosen: { rpm: 0.4 + (i % 5) * 0.05, deadhead: 0.9, lane: 1, broker: 1 },
  other: { rpm: 0.8, deadhead: 0.3 + (i % 3) * 0.1, lane: i % 2 ? 0 : 0.5, broker: i % 4 ? 1 : 0.5 },
}));

describe("splitRanges", () => {
  test("covers every item exactly once", () => {
    const ranges = splitRanges(1771, 4);
    expect(ranges[0][0]).toBe(0);
    expect(ranges[ranges.length - 1][1]).toBe(1771);
    const covered = ranges.reduce((sum, [start, end]) => sum + (end - start), 0);
    expect(covered).toBe(1771);
  });
});

describe("runWeightSearch (worker threads)", () => {
  afterAll(() => shutdownPool());

  test("multi-threaded result equals the single-thread result", async () => {
    const result = await runWeightSearch({ pairs, step: 5, keep: 5, threads: 4, file: workerFile });
    const single = bestWeightSets(allWeightSets(5), pairs, 5);

    expect(result.threads).toBe(4);
    expect(result.best[0].weights).toEqual(single[0].weights);
    expect(result.best[0].agreement).toBe(single[0].agreement);
    expect(result.sameWinner).toBe(true);
  }, 30000);

  test("the shared Atomics counter sees every weight set (no lost updates)", async () => {
    const result = await runWeightSearch({ pairs, step: 5, keep: 3, threads: 3, file: workerFile });
    expect(result.total).toBe(1771);
    expect(result.sharedCounter).toBe(1771);
    expect(result.perThread.reduce((sum, t) => sum + t.evaluated, 0)).toBe(1771);
  }, 30000);
});

describe("thread pool reuse", () => {
  afterAll(() => shutdownPool());

  test("threads start once and are reused on the next run", async () => {
    const first = await runWeightSearch({ pairs, step: 10, keep: 3, threads: 2, file: workerFile });
    const second = await runWeightSearch({ pairs, step: 10, keep: 3, threads: 2, file: workerFile });
    expect(first.poolStarted).toBe(true);
    expect(second.poolStarted).toBe(false);
    expect(second.best).toEqual(first.best);
  }, 30000);
});
