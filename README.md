# LoadWise

**Smart Load Matching & Dispatch Management System for Small Trucking Carriers**

Semester project for Software Construction & Development (Section 5B, Instructor: Sir Waqas)
Student: Ahmed Ali · F24-BSSE-060

**Live website:** https://loadwise-pi.vercel.app

## About

Dispatchers for small US trucking carriers pick loads by hand. They often choose loads that don't fit the
truck or that make the truck drive a long way empty. LoadWise stores each carrier's vehicles and preferences,
checks which loads fit, and ranks the loads by real profit.

**User roles:** Admin, Dispatcher, Carrier Owner, Driver

**Tech stack:** Next.js 16 + Tailwind CSS · Supabase (PostgreSQL, Auth, Row Level Security) · Zod validation ·
Node.js worker threads · Jest tests · GitHub + Vercel

---

## What's new in this milestone (50%): Load Matching

The new **Load Matching** page (sidebar → Load Matching) finds the best loads for one vehicle:

1. **Choose a vehicle** and where the truck is now (default: the carrier's home base) and the fuel cost.
2. **Fit check:** loads that are too heavy, have too many pallets, are too long or need different equipment
   are left out. The page lists every reason under "Left out by the fit chain".
3. **Empty miles:** the distance from the truck to the pickup (straight-line distance × 1.2).
4. **Net rate per mile:** (rate − empty miles × fuel cost) ÷ (loaded miles + empty miles).
   A red badge shows loads below the carrier's minimum rate.
5. **Score 0–100:** made of three parts (pay, few empty miles, preferred lanes).
   "Why this score?" shows how the points were added up.
6. **Ranking modes:** Balanced, Max Profit, Least Empty Miles and Home Lanes. Clicking one re-ranks the loads
   instantly.
7. **Stability Check (multithreaded):** checks whether the #1 load is still #1 if the priorities change.
8. **Race condition demo:** shows why threads need synchronization.

The dashboard also has a new "Load Matching" card, and "Available loads" links to the matching page.

---

## Where the design patterns are used

### 1. Chain of Responsibility: the fit check
File: `lib/matching/fit-checks.mjs`

Every load is passed through a chain of four check objects:

```
EquipmentCheck  →  WeightCheck  →  PalletCheck  →  LengthCheck
```

- Each check is its own class and extends the abstract class `FitCheck`.
- Each check tests **one** rule. If the load fails, it writes down the reason. Then it passes the load to the
  next check (`handle()` calls `next.handle()`).
- The chain is built in `buildFitChain()`. `LoadMatcher` (`lib/matching/load-matcher.mjs`) sends every load
  through it.
- **Why:** to add a new rule (for example hazmat), you write one new class and add it to the chain. The other
  checks don't change.

You can see it on the page under "Left out by the fit chain".

### 2. Singleton: the thread pool
File: `lib/threads/thread-pool.mjs`

- Starting a thread is slow, so the whole server shares **one** pool of worker threads.
- `ThreadPool.getInstance()` always returns the same pool. Calling `new ThreadPool()` from outside the class
  throws an error.
- The threads are started the first time they are needed and then reused. The page shows "threads reused
  from the pool" on the second run.

---

## How multithreading is added

Multithreading uses Node.js **worker threads**. It runs on the server when you click **Run Stability Check**
on the Load Matching page.

**The job:** every ranking mode is a mix of weights (for example 50% pay, 30% empty miles, 20% lanes). The
Stability Check tries **every** mix in 0.05% steps, which is 2,003,001 mixes. For each mix it finds which load
comes first. That is a lot of work, so it is split across threads.

**How it works:**
1. The page sends the request to `app/api/matching/stability/route.js`.
2. `lib/threads/jobs.mjs` splits the 2,003,001 mixes into equal parts, one part per thread.
3. Each thread runs `workers/matching.worker.mjs` on its part, **at the same time** as the others.
4. The threads write their results into **shared memory** (`SharedArrayBuffer`) using `Atomics.add()`.
   This adds safely, so no result is lost.
5. The main thread waits for all threads to finish (`Promise.all`, like `join()` in Java).
6. The same job also runs on **one** thread. The page shows both times and the speed-up (about 2–3× faster).
   It also checks that both gave the same answer.

**Race condition demo** (`app/api/threads/race/route.js`):
- Every thread adds 1 to the same shared counter a million times.
- With plain `counter++`, updates are lost, because two threads can read the same old value at the same time.
- With `Atomics.add()`, the total is always exact.

---

## Milestone 1 features (40%)

| Module | What it does |
|---|---|
| Authentication | Sign up (name, age, phone, role, strong password), log in, log out |
| Page protection | Logged-out users are sent to the login page |
| Roles | Row Level Security: Admin sees everything, Dispatcher sees own data, Carrier Owner & Driver can only view |
| Carriers | Add, view, search, edit and delete carriers (home base, preferred states, minimum rate per mile) |
| Vehicles | Add, view, search, edit and delete vehicles (size, payload and pallet limits) |
| Loads | Add, view, search, edit and delete loads with a validated form |
| CSV upload | Upload many loads from a `.csv`; invalid rows are listed with the reason |
| Dashboard | Counts and the most recent loads |

---

## Main files

```
app/(app)/matching/page.js           Load Matching page
components/matching/                 Page parts: mode picker, load cards, left-out list, threads panel
lib/matching/fit-checks.mjs          Chain of Responsibility (fit check)
lib/matching/load-matcher.mjs        Ranks the loads for one vehicle
lib/matching/scoring.mjs             Net rate per mile and score parts
lib/matching/ranking-modes.mjs       The four ranking modes
lib/threads/thread-pool.mjs          Singleton thread pool
lib/threads/jobs.mjs                 Stability Check and race demo
workers/matching.worker.mjs          Code each worker thread runs
app/api/matching/stability/route.js  Stability Check API
app/api/threads/race/route.js        Race demo API
tests/                               Jest unit tests
supabase/schema.sql                  Database tables and security rules
supabase/schema-part2.sql            Tables for the next milestone
supabase/demo-data.sql               Demo carriers, vehicles and loads
```

## How to run it

1. Install Node.js, then in the project folder run `npm install`.
2. Create a `.env.local` file (never upload it):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```
3. In Supabase → SQL Editor, run `supabase/schema.sql`.
4. Optional demo data: put your email at the top of `supabase/demo-data.sql` and run it.
5. Run `npm run dev` and open http://localhost:3000.
6. Run the tests with `npm test` (23 tests).

## Progress

| # | Feature | Status |
|---|---------|--------|
| 1–11 | Milestone 1: setup, database, login, carriers, vehicles, loads, CSV upload, dashboard, deployment | ✅ Done |
| 12 | Load Matching: fit check, empty miles, net rate per mile, score | ✅ Done |
| 13 | Chain of Responsibility (fit check) and ranking modes | ✅ Done |
| 14 | Singleton thread pool, Stability Check, race condition demo | ✅ Done |
| 15 | Jest unit tests | ✅ Done |
| 16 | Broker risk check, booking, invoices, weekly metrics | ⬜ Next milestone |
