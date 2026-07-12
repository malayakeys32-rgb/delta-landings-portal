# Delta Landings Resident Portal

A shelter management web app for Delta Landings: laundry sign-ups across five
buildings, resident grievances, maintenance tickets, staff/admin task lists,
and a community announcements feed. Built for ~150 residents across
Buildings A-E (30-45 residents each).

## What's included

- **Accounts & roles** - residents, staff, and admins each sign up / log in
  separately. Resident accounts pick their building (A-E). Staff and admin
  signups require an invite code so residents can't self-elevate.
- **Laundry sign-up** - each building has its own laundry room (3 machines
  by default) running 24 hours. Residents reserve an hourly slot on a
  machine in their own building; staff/admin can view and manage every
  building. A resident can hold at most 2 upcoming reservations at once so
  one person can't block out a whole day.
- **Grievances** - residents submit a grievance, an admin acknowledges it
  and assigns a staff member, and the ticket moves through a five-stage
  timeline (submitted -> acknowledged -> under review -> action taken ->
  resolved). Each grievance has its own document upload area and two-way
  message thread.
- **Maintenance tickets** - residents report an issue with a location,
  description, and priority; staff/admin acknowledge, assign, and update
  status, with a message thread per ticket.
- **Tasks / to-do lists** - every user has a personal to-do board (To do /
  In progress / Done). Staff and admins can also assign tasks to each
  other or to specific staff.
- **Community feed** - staff/admin post announcements and events; everyone
  sees them on their dashboard and the feed page.
- **Notifications** - in-app notifications fire on grievance/maintenance
  assignment, stage changes, new messages, and laundry reservations.

## Tech stack

- **Server:** Node.js + Express, SQLite (via `better-sqlite3`, a single
  file database - no external database to provision), JWT auth,
  `multer` for grievance document uploads.
- **Client:** React 18 + React Router, built with Vite. Plain CSS design
  system (no UI framework dependency).
- In production the server serves the built client, so the whole app runs
  as a single Render web service.

## Project structure

```
delta-landings/
  render.yaml              # Render deployment blueprint
  server/
    index.js               # Express app entry point
    db.js                  # SQLite schema + building seed
    seed.js                # Creates demo admin/staff/resident accounts
    middleware/auth.js      # JWT auth + role checks
    routes/                # auth, laundry, grievances, maintenance, tasks, feed, notifications
    uploads/                # grievance document uploads (created at runtime)
    data/                   # SQLite database file (created at runtime)
  client/
    src/
      pages/                # one file per screen
      AuthContext.jsx        # login/session state
      api.js                 # fetch wrapper
      styles.css              # design system
```

## Running it locally

Requires Node.js 18+.

```bash
# 1. Install and start the API
cd server
cp .env.example .env        # edit JWT_SECRET / invite codes if you like
npm install
npm run seed                 # creates demo accounts (see below)
npm start                    # runs on http://localhost:4000

# 2. In a second terminal, install and start the client
cd client
npm install
npm run dev                  # runs on http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000` automatically
(see `client/vite.config.js`).

### Demo logins (created by `npm run seed`)

| Role     | Email                          | Password       |
|----------|---------------------------------|----------------|
| Admin    | admin@deltalandings.org         | ChangeMe123!   |
| Staff    | staff@deltalandings.org         | ChangeMe123!   |
| Resident | resident.a@deltalandings.org    | ChangeMe123! (Building A) |
| Resident | resident.b@deltalandings.org    | ChangeMe123! (Building B) |

**Change these passwords (or delete the seeded accounts) before real use.**

New residents can also sign themselves up from the login screen, choosing
their building. New staff/admin accounts require the invite code set in
`STAFF_INVITE_CODE` / `ADMIN_INVITE_CODE` (defaults are in `.env.example`
- change them for a real deployment).

## Deploying to Render

This repo includes `render.yaml` for a one-click Render Blueprint deploy:

1. Push this project to a GitHub/GitLab repo.
2. In Render, choose **New > Blueprint** and point it at the repo.
3. Render will read `render.yaml` and create one web service that:
   - installs both `server` and `client` dependencies and builds the
     client (`npm run build` -> `client/dist`)
   - runs the seed script and starts the Express server, which also
     serves the built client
4. Render will prompt you to set `STAFF_INVITE_CODE` and
   `ADMIN_INVITE_CODE` (marked `sync: false` in the blueprint so you
   choose your own values instead of using the repo defaults).
5. A 1GB persistent disk is mounted at `/var/data` so the SQLite database
   and uploaded grievance documents survive deploys and restarts.

If you'd rather set it up manually instead of using the blueprint:

- **Build command:** `cd server && npm install && cd ../client && npm install && npm run build`
- **Start command:** `cd server && npm run seed && npm start`
- **Environment variables:** `JWT_SECRET`, `STAFF_INVITE_CODE`, `ADMIN_INVITE_CODE`,
  and optionally `DATA_DIR` / `UPLOAD_DIR` if you attach a persistent disk.
- **Health check path:** `/api/health`

## Notes & things to customize before going live

- Building capacities (30/45/38/33/42, totalling 150 across A-E) are seeded
  in `server/db.js` - adjust the `buildingSeed` array to match your actual
  roster.
- Laundry machines default to 3 per building; change `machine_count` in the
  same seed array if a building has a different number of washers/dryers.
- Rotate `STAFF_INVITE_CODE` / `ADMIN_INVITE_CODE` periodically so old
  codes can't be reused.
- The free Render plan spins down when idle, which will show as a slow
  first load - upgrade the plan for an always-on instance if that matters
  for 24-hour laundry sign-ups.
