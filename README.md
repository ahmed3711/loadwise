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
- **Validation:** React Hook Form + Zod (forms) and CHECK constraints (database)
- **CSV parsing:** Papa Parse
- **Version control & hosting:** GitHub + Vercel

## Features in this milestone (40%)

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

**Coming in later milestones:** Matching Engine, Broker Risk Check, Booking & Invoicing (shown as "Coming soon" in the sidebar).

## Project structure

```
app/
  login/, signup/            Login and sign-up pages
  (app)/                     All logged-in pages (share the sidebar layout)
    dashboard/               Dashboard
    carriers/                List, new, [id]/edit
    vehicles/                List, new, [id]/edit
    loads/                   List, new, [id]/edit, upload (CSV)
components/
  ui/                        Reusable Button, Input, Select, Card, Table, Alert, ...
  layout/                    Sidebar, Topbar, AppShell
  carriers/, vehicles/, loads/   Forms and tables for each module
lib/
  supabase/                  Browser client, server client, session proxy
  validation/                Zod rules (shared by forms and CSV upload)
  constants.js               US states, equipment types, roles, statuses
supabase/schema.sql          Tables, CHECK constraints, trigger, RLS policies
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
6. Start the app and open http://localhost:3000:
   ```
   npm run dev
   ```

## Progress (40% milestone)

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
| 11 | Final testing and Vercel deployment | ⬜ Next |
