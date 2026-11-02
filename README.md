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

- **Frontend:** Next.js (App Router, JavaScript) + Tailwind CSS
- **Backend & database:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Validation:** React Hook Form + Zod
- **Version control & hosting:** GitHub + Vercel

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
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Start the app and open http://localhost:3000:
   ```
   npm run dev
   ```

## Progress (40% milestone)

| # | Feature | Status |
|---|---------|--------|
| 1 | Tools, Next.js app, first GitHub push | ✅ Done |
| 2 | Supabase connection + test page | ⬜ Next |
| 3 | Database tables + Row Level Security | ⬜ |
| 4 | Sign-up / login / logout with roles and validation | ⬜ |
| 5 | Layout (sidebar, top bar) and page protection | ⬜ |
| 6 | Carriers (add, view, edit, delete) | ⬜ |
| 7 | Vehicles (add, view, edit, delete) | ⬜ |
| 8 | Loads (add, view, edit, delete) | ⬜ |
| 9 | CSV upload for loads | ⬜ |
| 10 | Dashboard counts and recent loads | ⬜ |
| 11 | Final testing and Vercel deployment | ⬜ |

**Coming in later milestones:** Matching Engine, Broker Risk Check, Booking & Invoicing.