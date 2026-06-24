# GATE Prep Dashboard

A full-stack multi-user exam preparation dashboard for GATE CS (and other exams), built with Next.js 15 + MongoDB.

## Stack

- **Frontend**: Next.js 15 (App Router), React, CSS-in-JS (inline styles), Recharts
- **Backend**: Next.js API Routes
- **Database**: MongoDB via Mongoose (multi-user, multi-document)
- **Auth**: JWT stored in HttpOnly cookies + bcrypt password hashing
- **Mobile**: Capacitor (Android/iOS wrapper), local notifications via NotificationManager
- **Hosting**: Render (free tier)

---

## Features

- **Multi-user support** — each user has their own data, isolated via `userId`
- **Multi-exam config** — GATE, ESE, PSU, etc. with subject weights and taglines
- **Subject & Chapter tracking** — progress bars, status badges, per-chapter done/undo
- **Study Timer** — start/stop, live elapsed, today's sessions, 14-day bar chart, weekly target
- **Timer persistence** — saves every tick, recovers on page reload via `beforeunload`
- **PYQ Tracker** — mark previous year questions as done per chapter
- **Revision Log** — spaced repetition with chapters due for revision
- **Score Log** — per-subject scores with smart scoring (weighted by chapter progress)
- **Mock Tests** — full-length mock test tracker with score breakdown
- **Exam Prediction** — prediction engine based on completed PYQs, scores, revision, and mock tests
- **Goal Calendar** — daily goals with calendar view
- **Activity Heatmap** — GitHub-style contribution graph for study sessions
- **Streak Tracking** — consecutive-day streak with flame badge
- **Data & Backup** — export/restore full data as JSON
- **Dashboard** — weekly overview, heatmap, activity feed, stats at a glance
- **Responsive** — desktop sidebar, mobile bottom nav + drawer
- **Glassmorphism UI** — backdrop blur on sidebar, nav bars, modals, toasts
- **Offline resilience** — localStorage data cache, loads instantly on revisit
- **Notifications** — Capacitor local notifications for study reminders (Android/iOS)

---

## Local Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd gate-prep-dashboard
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/gate-prep?retryWrites=true&w=majority
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
ADMIN_USER=admin
ADMIN_PASS=gate2026
NEXTAUTH_URL=http://localhost:3000
```

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000 — sign in with `admin` / `gate2026` (or whatever you set in `.env.local`).

---

## MongoDB Atlas Setup (Free)

1. Go to https://cloud.mongodb.com → Create free M0 cluster
2. Database Access → Add user with `readWrite` permission
3. Network Access → Allow from anywhere (`0.0.0.0/0`) for Render
4. Connect → Drivers → copy the connection string
5. Paste into `MONGODB_URI` in `.env.local`

---

## Project Structure

```
gate-prep/
├── app/
│   ├── api/
│   │   ├── auth/            # Login, logout, session (JWT + bcrypt)
│   │   ├── data/            # GET/POST full AppData document
│   │   ├── sessions/        # Create & list study sessions
│   │   ├── scores/          # Create & list score entries
│   │   ├── stats/           # Aggregated stats (counts)
│   │   ├── export/          # Export full data as JSON
│   │   ├── restore/         # Restore from JSON backup
│   │   ├── goals/           # Daily goals CRUD
│   │   ├── subjects/        # Subject/chapter operations
│   │   ├── pyq/             # PYQ operations
│   │   ├── mocks/           # Mock test score operations
│   │   ├── revisions/       # Revision log operations
│   │   └── predict/         # Prediction data endpoint
│   ├── dashboard/           # Dashboard page + shell layout
│   ├── (auth)/login/        # Login page
│   ├── goals/               # Goal calendar
│   ├── subjects/            # Subject + chapter progress
│   ├── pyq/                 # PYQ tracker
│   ├── revision/            # Spaced repetition revision log
│   ├── studytimer/          # Study timer with charts
│   ├── scores/              # Score log
│   ├── mocks/               # Mock test tracker
│   ├── predict/             # Exam prediction
│   ├── storage/             # Data & Backup (export/restore)
│   └── settings/            # User settings
├── components/
│   ├── layout/              # Sidebar, MobileTopBar, MobileBottomNav, MobileDrawer
│   ├── modals/              # ScoreModal, MockModal, ShareModal
│   └── ui/                  # Card, MetricCard, Modal, Toast, Panel, Empty, etc.
├── context/
│   └── AppContext.tsx        # Global state — all data, cache, API calls, toasts
├── lib/
│   ├── db.ts                # MongoDB connection (singleton)
│   ├── auth.ts              # JWT sign/verify utilities
│   ├── utils.ts             # dateKey, computeStreak, prediction engine, color helpers
│   ├── constants.ts         # Exam configs, subject lists, colors, dailyTarget
│   └── types.ts             # TypeScript interfaces (StudySession, Subject, etc.)
├── models/
│   ├── User.ts              # Mongoose User model (bcrypt hashing)
│   └── AppData.ts           # Mongoose AppData model (all user data)
└── public/                  # Static assets, PWA icons, sounds
```

---

## Architecture

### Data Flow

1. **AppContext** (`context/AppContext.tsx`) is the single source of truth
2. On mount, `loadData()` fetches the full `AppData` document via `GET /api/data`
3. A cached copy is stored in `localStorage` — on next visit, cached data renders instantly while fetching fresh data in the background
4. Every mutation (add session, toggle chapter, save score, etc.) calls its own API endpoint (`POST /api/sessions`, `POST /api/data`, etc.) — no debounced bulk sync
5. After a successful API call, the local state is updated optimistically for instant UI feedback

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth` | POST | Login (returns JWT in HttpOnly cookie) |
| `/api/auth` | GET | Returns current user session |
| `/api/auth` | DELETE | Clears auth cookie (logout) |
| `/api/data` | GET | Returns full AppData document |
| `/api/data` | POST | Saves entire AppData document |
| `/api/sessions` | POST | Creates a new study session |
| `/api/sessions` | GET | Lists all study sessions |
| `/api/scores` | POST | Creates a score entry |
| `/api/scores` | GET | Lists scores with date range filter |
| `/api/stats` | GET | Aggregated counts (sessions, scores, subjects) |
| `/api/export` | GET | Downloads data as JSON |
| `/api/restore` | POST | Uploads JSON to restore data |

### Multi-User Isolation

- Each `AppData` document is keyed by `userId`
- All API routes authenticate via `requireAuth()` and query by `userId`
- Admin credentials are defined in env vars and used only for initial user seeding

---

## Deployment (Render)

### 1. Push to GitHub

```bash
git remote add origin https://github.com/<you>/gate-prep-dashboard
git push -u origin main
```

### 2. Create Web Service on Render

1. https://render.com → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 20

### 3. Environment Variables on Render

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your Atlas URI |
| `JWT_SECRET` | Your 64-byte hex secret |
| `ADMIN_USER` | `admin` |
| `ADMIN_PASS` | Your chosen password |
| `NODE_ENV` | `production` |
| `NEXTAUTH_URL` | `https://your-app.onrender.com` |

### 4. Deploy

Render auto-deploys on every push to `main`.

---

## First Login

On first login, the server automatically:
1. Creates a `User` document with your hashed password
2. Seeds a default `AppData` document with all 12 GATE CS subjects

No manual DB seeding needed.

---

## Migrating Data from Railway

1. On Railway, go to **Data & Backup** → **Download backup**
2. Deploy this app to Render
3. Sign in, go to **Data & Backup** → **Restore from backup** → upload the JSON file
