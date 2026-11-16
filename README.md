# LoadWise

**Smart Load Matching & Dispatch Management System for Small Trucking Carriers**

Semester project for Software Construction & Development (Section 5B, Instructor: Sir Waqas)
Student: Ahmed Ali · F24-BSSE-060

## About

Dispatchers for small US trucking carriers choose loads by hand across load boards,
spreadsheets and WhatsApp. This causes empty miles, loads that don't fit the vehicle,
missed invoices and bookings with fraudulent brokers.

LoadWise stores each carrier's vehicle limits and preferences, checks loads against
those limits, ranks loads by real profit, flags risky brokers and tracks bookings
through to invoices.

**User roles:** Admin, Dispatcher, Carrier Owner, Driver

## Tech stack

- **Frontend:** Next.js 16 (App Router, JavaScript) + Tailwind CSS 4
- **Backend & database:** Supabase (PostgreSQL, Auth, Row Level Security) via `@supabase/ssr`
- **Validation:** React Hook Form + Zod (forms and API) and CHECK constraints (database)
- **Matching engine:** own scoring code (`lib/matching/`), straight-line distance × 1.2 for empty miles
- **Multithreading:** Node.js `worker_threads` thread pool + `SharedArrayBuffer` / `Atomics`
- **Design patterns:** Chain of Responsibility (fit filter), Singleton (thread pool)
- **Testing:** Jest (unit tests, including real worker threads)
- **CSV parsing:** Papa Parse
- **Version control & hosting:** GitHub + Vercel

## Features

### Milestone 1 (40%)

| Module | What it does |
|---|---|
| Authentication | Sign up (name, age, phone, role, strong password with live checklist), log in, log out |
| Page protection | `proxy.js` sends logged-out users to `/login`; every page checks the login again on the server |
| Role-based access | Row Level Security: Admin = everything, Dispatcher = own data, Carrier Owner & Driver = view only |
| Carrier Profiles (FR-01) | Add, view, search, edit, delete carriers with home base, preferred states and minimum rate per mile |
| Vehicles | Add, view, search, edit, delete vehicles linked to a carrier, with interior size, payload and pallet limits |
| Load Intake (FR-03) | Add, view, search, edit, delete loads with a validated form |
| CSV Upload (FR-04) | Upload a `.csv`, check columns and every row with the same rules, save valid rows, list rejected rows with reasons |
| Dashboard | Total carriers, vehicles, loads, available loads, and the 5 most recent loads |

### Milestone 2 (50%): Load Matching

| Module | Requirement | What it does |
|---|---|---|
| Hard fit filter | FR-05, Chain of Responsibility | Every load passes a chain of four checks (equipment → weight → pallets → length). Loads heavier than the payload, with more pallets than the vehicle holds, longer than the interior, or needing other equipment are left out, with the reasons listed (a reefer can also carry dry-van freight) |
| Empty miles | FR-06 | Distance from where the truck is now (default: carrier home base) to the pickup: straight-line distance × 1.2 |
| Net rate per mile | FR-07 | (rate − empty miles × fuel cost per mile) ÷ (loaded + empty miles); warns when below the carrier minimum |
| Score 0–100 | FR-08 | Three parts (net rate per mile, low empty miles, preferred lanes), each 0–1, times the weights of the ranking mode; "Why this score?" shows the breakdown |
| Ranking modes | FR-08 | Balanced, Max Profit, Least Empty Miles, Home Lanes: switch instantly, the same loads are re-ranked |
| Stability Check | Multithreading | Tries all 2,003,001 weight mixes on a worker-thread pool to see how often the #1 load stays #1; shared `Atomics` counter, one-thread vs multi-thread time |
| Race condition demo | Multithreading | The same shared counter with `counter++` (loses updates) and with `Atomics.add()` (always exact) |

**Coming in later milestones:** Broker Risk Check, Booking & Invoicing, weekly metrics (shown as "Coming soon" in the sidebar).

## Design patterns

**1. Chain of Responsibility** (`lib/matching/fit-checks.mjs`)
The hard fit filter is a chain of handler objects: `EquipmentCheck → WeightCheck → PalletCheck → LengthCheck`.
Each one extends the abstract `FitCheck`, checks one rule in `check()`, writes down a reason if the load fails,
and passes the load to the next handler (`handle()` → `next.handle()`), so the dispatcher sees every reason.
No handler knows the others; a new rule is one new class linked in `buildFitChain()`, without changing the
existing checks (open/closed principle). `LoadMatcher` sends every load down the chain before ranking it.

**2. Singleton** (`lib/threads/thread-pool.mjs`)
Starting a worker thread is slow, so the whole server shares exactly one `ThreadPool`.
`ThreadPool.getInstance()` always returns the same object, and calling `new ThreadPool()` from outside throws
an error. The threads are started the first time they are needed and then reused (like Java's ExecutorService).

## Multithreading

The Stability Check (`lib/threads/jobs.mjs`, `workers/matching.worker.mjs`):
- the 2,003,001 weight mixes are split into equal slices, one per thread, all running at the same time;
- the main thread waits for all of them (`Promise.all`, like `Thread.join()`);
- the threads write into **shared memory** (`SharedArrayBuffer`): a progress counter and the win count of every
  load, using `Atomics.add()` so no update is lost. Each thread counts locally first and adds its totals at the
  end, so the threads don't wait for each other (less contention);
- the same job also runs on one thread, so the page shows the speed-up and checks both give the same answer;
- the first run also starts the threads, so it is slower; "Run again" shows the real speed.

The race condition demo runs `counter++` and `Atomics.add(counter, 1)` on every thread at the same time:
the plain version loses updates because "read, add 1, write back" can be interrupted by another thread.

## Project structure


```
app/
  login/, signup/            Login and sign-up pages
  (app)/                     All logged-in pages (share the sidebar layout)
    dashboard/               Dashboard
    carriers/                List, new, [id]/edit
    vehicles/                List, new, [id]/edit
    loads/                   List, new, [id]/edit, upload (CSV)
    matching/                Load Matching (ranked loads per vehicle)
  api/matching/stability/    Stability Check (worker threads)
  api/threads/race/          Race condition demo (worker threads)
components/
  ui/                        Reusable Button, Input, Select, Card, Table, Alert, ...
  layout/                    Sidebar, Topbar, AppShell
  carriers/, vehicles/, loads/   Forms and tables for each module
  matching/                  Ranking mode picker, ranked load cards, threads panel
lib/
  supabase/                  Browser client, server client, session proxy
  validation/                Zod rules (shared by forms and CSV upload)
  constants.js               US states, equipment types, roles, statuses
  matching/fit-checks.mjs    Chain of Responsibility: the fit filter checks
  matching/scoring.mjs       Net rate per mile, part scores (no imports)
  matching/ranking-modes.mjs The four ranking modes (weights)
  matching/load-matcher.mjs  Ranks the loads for one vehicle
  matching/stability.mjs     Weight-mix counting used by the threads
  matching/us-places.mjs     City coordinates for empty-mile estimates
  threads/thread-pool.mjs    Singleton pattern: the worker-thread pool
  threads/jobs.mjs           Stability Check + race demo on the pool
workers/matching.worker.mjs  Code each worker thread runs
supabase/schema.sql          Tables, CHECK constraints, trigger, RLS policies
supabase/schema-part2.sql    Tables for the next milestone (brokers, bookings, invoices)
supabase/demo-data.sql       Optional demo carriers, vehicles and loads
tests/                       Jest unit tests
proxy.js                     Runs before every page (login refresh + protection)
docs/VIVA_GUIDE.md           Explanations, test checklist and demo script
```

## How to run it

1. Install Node.js (LTS).
2. Download or clone this repository, then open the folder in a terminal.
3. Install packages:
   ```
   npm install
   ```
4. Create a `.env.local` file in the project folder (never upload this file):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```
5. In Supabase → SQL Editor, run `supabase/schema.sql` once.
6. Optional: edit the email at the top of `supabase/demo-data.sql` and run it for demo data.
7. Start the app and open http://localhost:3000:
   ```
   npm run dev
   ```
8. Run the tests:
   ```
   npm test
   ```

## Progress

| # | Feature | Status |
|---|---------|--------|
| 1 | Tools, Next.js app, first GitHub push | ✅ Done |
| 2 | Supabase connection + test page | ✅ Done |
| 3 | Database tables + Row Level Security | ✅ Done |
| 4 | Sign-up / login / logout with roles and validation | ✅ Done |
| 5 | Layout (sidebar, top bar) and page protection | ✅ Done |
| 6 | Carriers (add, view, edit, delete) | ✅ Done |
| 7 | Vehicles (add, view, edit, delete) | ✅ Done |
| 8 | Loads (add, view, edit, delete) | ✅ Done |
| 9 | CSV upload for loads | ✅ Done |
| 10 | Dashboard counts and recent loads | ✅ Done |
| 11 | Testing and Vercel deployment (milestone 1) | ✅ Done |
| 12 | Matching engine: fit filter, empty miles, net rate per mile, score | ✅ Done |
| 13 | Fit filter as a Chain of Responsibility, ranking modes | ✅ Done |
| 14 | Thread pool (Singleton), Stability Check, race demo | ✅ Done |
| 15 | Jest unit tests | ✅ Done |
| 16 | Broker risk check, booking, invoices, weekly metrics | ⬜ Next milestone |
