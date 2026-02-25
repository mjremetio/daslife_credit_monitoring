# DasLife Credit Monitoring

A Next.js (App Router + Tailwind v4) dashboard for unified credit status monitoring. Data is stored locally in SQLite (no external DB or Google Sheet required). Includes queues for processing, issue tracker, document tracker, credit monitoring issues, and a master client list.

## Features
- Unified client profile fields: name, onboard date, disputer, status, round, date processed, auto due date (+30 days), notes, flags.
- Issue tracker fields: type, message sent/date, resolved toggle.
- Credit monitoring issues: platform, issue, message sent/date, resolved toggle.
- Docs tracker: doc type, status (pending/sent/received/complete) with categories (completing/updating).
- Views: Dashboard counters + due strip, Ready to Process queue (mark processed auto-advances round/due), Dues with Issues (resolve/quick-add), Document trackers, Credit monitoring issues, Master list (search/filter/sort/paginate).
- Import CSV/XLS into the new model; Export CSV/XLS of the full client list.
- Fully local persistence via `data/db.sqlite` with automatic seeding from `src/data/clients.sample.json`.

## Quick start (local)
```bash
npm install
npm run dev
```
Open http://localhost:3000 to use the dashboard. First run seeds sample data into `data/db.sqlite`.

## Data storage (SQLite)
- Database file: `data/db.sqlite` (auto-created).
- Schema tables: `clients`, `issues`, `cm_issues`, `docs`.
- Seed: `src/lib/seed.ts` loads `src/data/clients.sample.json` if DB is empty.

## APIs
- `GET /api/clients` → full dataset (clients with nested issues/docs/cm).
- `POST /api/clients` → replace all data `{ clients, issues, docs, cmIssues }`.
- `POST /api/actions` with `{ action: "markProcessed"|"toggleIssue"|"addIssue"|"addDoc"|"addCmIssue", ... }`.
- `GET /api/status` → health check (sqlite).

## Import/Export
- Import accepts `.csv` or `.xlsx` with headers like Client Name, Disputer, Current Round, Date Processed, Next Round Due Date; missing fields default sensibly.
- Export buttons output CSV/XLS summaries for the master list.

## Deployment (Vercel)
No env vars required for SQLite. Deploy with:
```bash
npx vercel --prod
```
The DB is stored in the project filesystem; for persistent prod data, mount external storage or swap to a managed DB in a future iteration.

## Project structure
- `src/app/page.tsx` – server-loads data and renders the dashboard.
- `src/components/` – UI sections (dashboard, tables, cards).
- `src/app/api/` – API routes for data + actions.
- `src/lib/` – DB helper (`db.ts`), seeding, import/export utilities.
- `src/types/models.ts` – shared types.
- `src/data/clients.sample.json` – seed data converted from the provided Excel.

## Notes
- "Mark Processed" increments the round, sets `dateProcessed` to today, and advances `nextDueDate` by 30 days.
- Status badges: overdue (red), due soon (within 3 days, yellow), on track (green), has open issue (orange).
- Master list supports global search + filters by disputer/status; table is sortable/paginates.
