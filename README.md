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
- **Backend & database:** Supabase (PostgreSQL, Auth, Row Level Security) via `@supabase/ssr`, Next.js API routes
- **Validation:** React Hook Form + Zod (forms) and CHECK constraints + triggers (database)
- **Matching engine:** own scoring code (`lib/matching/scoring.mjs`), OpenRouteService distances (optional)
- **Broker check:** FMCSA QCMobile API (optional) with a 24-hour cache and manual checks
- **AI:** Claude API (`@anthropic-ai/sdk`) to read pasted loads and explain the top matches (optional)
- **Multithreading:** Node.js `worker_threads` thread pool + `SharedArrayBuffer`/`Atomics` (Weight Lab)
- **Testing:** Jest (39 unit tests, including real worker threads)
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
| Dashboard | Totals and the most recent loads |

### Final milestone (100%)

| Module | Requirement | What it does |
|---|---|---|
| Hard fit filter | FR-05 | Loads over a vehicle's length, pallets or payload, or needing other equipment, are never ranked (also enforced by a database trigger) |
| Empty miles | FR-06 | Distance from the truck's current location (or home base) to pickup: OpenRouteService truck routing, or straight-line × 1.2 if unavailable |
| Net rate per mile | FR-07 | (rate − empty-mile fuel cost) ÷ (loaded + empty miles) |
| Score 0–100 | FR-08 | 40% net RPM · 25% low empty miles · 20% preferred lanes · 15% broker trust, with a breakdown per load |
| Editable weights | FR-09 | Per-carrier weights (must add to 100) on the Matching page |
| **Weight Lab** (multithreading) | Proposal §9.3 | Tests all 176,851 weight sets against past bookings on a worker-thread pool, with a shared `Atomics` counter and single- vs multi-thread timing |
| Broker risk check | FR-10, FR-11, NFR-04 | FMCSA lookup by MC (24-hour cache, labelled), manual checks; inactive or < 12 months = high risk |
| Risk gate | FR-12 | High-risk or unverified broker → dispatcher must tick a confirmation (also a database CHECK constraint) |
| Bookings | FR-13 | Booked → Picked up → In transit → Delivered → Paid, one step at a time; cancel before pickup |
| Weekly invoices | FR-14 | Fee % × line-haul of loads delivered that week, calculated in the database; printable / save as PDF; mark paid |
| Driver view | FR-15 | Drivers see only loads booked on their assigned vehicle ("My Loads") and update pickup/delivery |
| Weekly metrics | FR-16 | Dashboard: gross revenue, average net rate per mile and empty-mile % per carrier, week by week |
| **AI load reader** | FR-03 extra | Paste a load from an email/WhatsApp/load board; Claude fills the form; normal validation still applies |
| **AI dispatch assistant** | FR-08 extra | Claude explains the top 5 matches and flags cautions; it can't change fit checks or scores |

The fit filter, distances and scores are always calculated by LoadWise's own code. The AI only reads text and
explains results, and the dispatcher makes the final decision.

## Project structure

```
app/
  login/, signup/            Login and sign-up pages
  (app)/                     All logged-in pages (share the sidebar layout)
    dashboard/               Dashboard + weekly carrier metrics (driver: My Loads)
    carriers/, vehicles/     List, new, [id]/edit
    loads/                   List, new (with AI paste), [id]/edit, upload (CSV)
    matching/                Ranked loads per vehicle; weights/ = Weight Lab
    bookings/                Booking status tracking
    brokers/                 Broker Check
    invoices/                Generate + list; [id] = printable invoice
  api/
    bookings/                Book a load (re-scores on the server, risk gate)
    brokers/check/           FMCSA lookup with 24-hour cache
    ai/parse-load/           AI: pasted text -> load fields
    ai/match-advice/         AI: explain the top 5 matches
    matching/weight-lab/     Weight Lab (worker threads)
components/                  UI building blocks and one folder per module
lib/
  matching/scoring.mjs       Matching maths (fit, net RPM, score, weight search), no imports
  matching/engine.js         Loads data from Supabase and ranks it
  matching/distance.js       OpenRouteService + fallback; us-places.mjs = city coordinates
  matching/weight-lab.js     Builds (booked vs passed-over) pairs from history
  threads/pool.mjs           Worker-thread pool, SharedArrayBuffer progress counter
  brokers/                   Risk rules (risk.mjs) and FMCSA client
  ai/                        Claude client and prompts
  metrics.mjs                Weekly dashboard numbers
  validation/                Zod rules (shared by forms and CSV upload)
workers/weight-search.worker.mjs   Code each worker thread runs
supabase/schema.sql          Milestone 1 tables, CHECK constraints, RLS
supabase/schema-part2.sql    Final milestone: bookings, invoices, brokers, rules, RLS (adds only)
supabase/demo-data.sql       Optional demo carriers, loads and 3+ weeks of booking history
tests/                       Jest unit tests
proxy.js                     Runs before every page (login refresh + protection)
```

## How to run it

1. Install Node.js (LTS).
2. Download or clone this repository, then open the folder in a terminal.
3. Install packages:
   ```
   npm install
   ```
4. Create a `.env.local` file in the project folder (never upload this file), using `.env.example` as a guide:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   # Optional (features fall back gracefully without them):
   ANTHROPIC_API_KEY=
   FMCSA_WEB_KEY=
   OPENROUTESERVICE_API_KEY=
   ```
5. In Supabase → SQL Editor, run `supabase/schema.sql` once (new projects only, it resets the tables), then
   run `supabase/schema-part2.sql` (safe on an existing database: it only adds).
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
| 2 | Supabase connection | ✅ Done |
| 3 | Database tables + Row Level Security | ✅ Done |
| 4 | Sign-up / login / logout with roles and validation | ✅ Done |
| 5 | Layout (sidebar, top bar) and page protection | ✅ Done |
| 6 | Carriers, vehicles, loads (add, view, edit, delete) | ✅ Done |
| 7 | CSV upload for loads | ✅ Done |
| 8 | Matching engine: fit filter, empty miles, net RPM, score, weights | ✅ Done |
| 9 | Weight Lab with worker threads | ✅ Done |
| 10 | Broker risk check + risk gate | ✅ Done |
| 11 | Bookings and status tracking, driver view | ✅ Done |
| 12 | Weekly invoices | ✅ Done |
| 13 | Dashboard weekly metrics | ✅ Done |
| 14 | AI load reader + AI dispatch assistant | ✅ Done |
| 15 | Jest unit tests | ✅ Done |
| 16 | Final deployment to Vercel | ⬜ Next |
