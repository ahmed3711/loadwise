import { ThreadPool } from "../lib/threads/thread-pool.mjs";
import { runRaceDemo, runStabilityCheck } from "../lib/threads/jobs.mjs";
import { countWins, flattenParts, mixCount, splitRows } from "../lib/matching/stability.mjs";

// These tests start REAL worker threads
afterAll(() => ThreadPool.reset());

const partsList = [
  { rpm: 1, deadhead: 0.2, lane: 0.5 }, // best rate
  { rpm: 0.3, deadhead: 1, lane: 0.5 }, // fewest empty miles
  { rpm: 0.4, deadhead: 0.4, lane: 1 }, // best lanes
  { rpm: 0.2, deadhead: 0.2, lane: 0 }, // never the best
];

describe("Design pattern 2: Singleton", () => {
  test("getInstance() always returns the same pool", () => {
    expect(ThreadPool.getInstance()).toBe(ThreadPool.getInstance());
  });

  test("'new ThreadPool()' from outside the class is blocked", () => {
    expect(() => new ThreadPool("file.mjs", 2)).toThrow(/Singleton/);
  });
});

describe("Splitting the work", () => {
  test("mix count formula", () => {
    expect(mixCount(2)).toBe(6); // (0,0,2) (0,1,1) (0,2,0) (1,0,1) (1,1,0) (2,0,0)
    expect(mixCount(2000)).toBe(2003001);
  });

  test("the slices cover every mix exactly once", () => {
    const groups = splitRows(2000, 4);
    expect(groups).toHaveLength(4);
    expect(groups[0].rowStart).toBe(0);
    expect(groups.at(-1).rowEnd).toBe(2001);
    expect(groups.reduce((sum, g) => sum + g.mixes, 0)).toBe(mixCount(2000));
  });

  test("a load that is never the best wins 0 mixes", () => {
    const wins = new Int32Array(partsList.length);
    countWins({ rowStart: 0, rowEnd: 101, steps: 100, flat: flattenParts(partsList), loadCount: 4, wins });
    expect(wins[3]).toBe(0);
    expect(wins.reduce((a, b) => a + b, 0)).toBe(mixCount(100));
  });
});

describe("Multithreading", () => {
  test("worker threads give the same answer as one thread, and the shared counter is exact", async () => {
    const result = await runStabilityCheck(partsList, { steps: 400 });
    expect(result.threads).toBeGreaterThanOrEqual(2);
    expect(result.sameResult).toBe(true);
    expect(result.sharedCounter).toBe(result.total);
    expect(result.wins.reduce((a, b) => a + b, 0)).toBe(result.total);
  });

  test("the second run reuses the threads already in the pool", async () => {
    const result = await runStabilityCheck(partsList, { steps: 400 });
    expect(result.justStarted).toBe(false);
  });

  test("Atomics.add never loses an update", async () => {
    const race = await runRaceDemo({ times: 200000 });
    expect(race.safe).toBe(race.expected);
    expect(race.unsafe).toBeLessThanOrEqual(race.expected);
  });
});
