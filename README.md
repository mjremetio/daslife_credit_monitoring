# DasLife Credit Monitoring

A Next.js (App Router + Tailwind v4) dashboard that monitors credit dispute clients, backed by Google Sheets via Apps Script. It ships with import/export, filters, sorting, pagination, and a live sheet connectivity check.

## Features
- Responsive data table with global search, column sorting, pagination, and quick filters (disputer, round, issues, due window).
- CSV/XLS import (client-side) and export (CSV, XLS) with the same column names used in the sheet.
- Google Sheets integration through a secured Apps Script web app, proxied via Next.js API routes to keep secrets server-side.
- Connection badge to verify sheet availability and last sync time.
- Sample data loaded from `src/data/clients.sample.json` (derived from the provided Excel) for offline/local use.

## Column schema
The sheet (and exports) expect these headers:
1. `Disputer`
2. `Client Name`
3. `Current Round`
4. `Date Processed\n(Current Round)`
5. `Next Round \nDue Date \n(+30 days)`
6. `Notes/Remarks`
7. `ISSUES?`

## Quick start (local)
```bash
npm install
cp .env.local.example .env.local   # fill with your Apps Script URL + API key
npm run dev
```
Open http://localhost:3000 to use the dashboard.

## Environment variables
Defined in `.env.local.example`:
- `GOOGLE_APP_SCRIPT_URL` – the deployed Apps Script Web App URL (`https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`).
- `GOOGLE_APP_SCRIPT_API_KEY` – shared secret the script validates (kept server-side only).

## Google Apps Script backend
1) Open `apps-script/Code.gs` and create a new Apps Script project.
2) Set Script Properties: `SHEET_ID` (target spreadsheet ID) and `API_KEY` (same as above).
3) Deploy as **Web App** → Execute as **Me** → Access **Anyone with the link**.
4) Use the deployment URL as `GOOGLE_APP_SCRIPT_URL`.

The script supports:
- `GET ?action=ping&key=API_KEY` → health check.
- `GET ?action=list&key=API_KEY` → returns sheet rows as JSON.
- `POST ?action=bulkUpdate&key=API_KEY` with body `{ records: [...] }` → replaces sheet content with the provided rows.

## API routes (Next.js)
- `GET /api/clients` → fetch from Apps Script; falls back to sample data if env is missing or unreachable.
- `POST /api/clients` → proxy bulk updates to Apps Script.
- `GET /api/status` → connectivity probe used by the connection badge.

## Import/export tips
- Import accepts `.csv` and `.xlsx`/`.xls` files. Parsed rows are normalized to the schema above.
- Export buttons generate matching CSV or XLS with column headers aligned to the sheet.

## Deployment (Vercel)
1. Ensure `.env.local` has your Apps Script secrets.
2. Build locally to verify: `npm run build`.
3. If Vercel CLI is available: `npx vercel login` (if not already) → `npx vercel --prod`. Create a new project when prompted, and add the two env vars in Vercel.
4. The app is ready for Vercel out of the box (no custom `vercel.json` needed).

## Pushing to GitHub
A git repo is already initialized. Create a remote and push:
```bash
git remote add origin <your-repo-url>
git add .
git commit -m "feat: credit monitoring dashboard"
git push -u origin main
```

## Project structure
- `src/app/page.tsx` – loads sample data and renders the dashboard.
- `src/components/` – UI: dashboard, table, metric cards, connection badge.
- `src/app/api/` – server routes proxying Google Sheets and status checks.
- `src/lib/` – data normalization, import/export utilities, API client.
- `apps-script/Code.gs` – Apps Script backend to paste into Google Apps Script.
- `src/data/clients.sample.json` – sample records derived from the provided Excel.

## Notes
- If `GOOGLE_APP_SCRIPT_URL`/`API_KEY` are not set or unreachable, the UI will operate on the bundled sample data but will not persist changes.
- Connection status is displayed in the top badge; sync to sheet uses the green “Sync to Sheet” button.
