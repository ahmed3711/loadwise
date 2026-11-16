// =====================================================================
// Stability Check: "would my #1 load still be #1 with other weights?"
//
// Every ranking mode is just one mix of weights (e.g. 50/30/20). This check
// tries EVERY mix in steps of 0.05% (2,003,001 mixes) and counts how
// often each load comes out on top. If the top load wins under most
// mixes, it is a safe pick whatever the dispatcher cares about most.
//
// That is a lot of work, so it is split across worker threads
// (lib/threads/thread-pool.mjs). This file has no imports so the worker
// threads, the main thread and the tests all run the same code.
// =====================================================================

export const STEPS = 2000; // 100% / 2000 = 0.05% steps

// Number of weight mixes (rpm + deadhead + lane = STEPS)
export function mixCount(steps = STEPS) {
  return ((steps + 1) * (steps + 2)) / 2;
}

// Row "r" = all mixes with rpm weight r; it holds (steps - r + 1) mixes.
// Splits rows 0..steps into `parts` groups with about the same number of
// mixes, so every thread gets the same amount of work.
export function splitRows(steps, parts) {
  const target = mixCount(steps) / parts;
  const groups = [];
  let start = 0;
  let inGroup = 0;
  for (let r = 0; r <= steps; r++) {
    inGroup += steps - r + 1;
    const isLast = r === steps;
    if ((inGroup >= target && groups.length < parts - 1) || isLast) {
      groups.push({ rowStart: start, rowEnd: r + 1, mixes: inGroup });
      start = r + 1;
      inGroup = 0;
    }
  }
  return groups;
}

// Flattens [{ rpm, deadhead, lane }, ...] into one Float64Array
// (numbers in one block of memory are fast to copy to a thread)
export function flattenParts(partsList) {
  const flat = new Float64Array(partsList.length * 3);
  partsList.forEach((parts, i) => {
    flat[i * 3] = parts.rpm;
    flat[i * 3 + 1] = parts.deadhead;
    flat[i * 3 + 2] = parts.lane;
  });
  return flat;
}

// Tries every mix in rows rowStart..rowEnd-1 and adds 1 to wins[i] each
// time load i has the highest score (a tie goes to the load ranked higher).
// onBatch(n) is called every `batch` mixes (used for the shared progress counter).
export function countWins({ rowStart, rowEnd, steps = STEPS, flat, loadCount, wins, batch = 10000, onBatch = () => {} }) {
  let sinceLast = 0;
  let tested = 0;

  for (let rpm = rowStart; rpm < rowEnd; rpm++) {
    for (let deadhead = 0; deadhead <= steps - rpm; deadhead++) {
      const lane = steps - rpm - deadhead;

      let best = 0;
      let bestScore = -1;
      for (let i = 0; i < loadCount; i++) {
        const score = rpm * flat[i * 3] + deadhead * flat[i * 3 + 1] + lane * flat[i * 3 + 2];
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      }
      wins[best] += 1;

      tested += 1;
      sinceLast += 1;
      if (sinceLast === batch) {
        onBatch(sinceLast);
        sinceLast = 0;
      }
    }
  }
  if (sinceLast > 0) onBatch(sinceLast);
  return tested;
}
