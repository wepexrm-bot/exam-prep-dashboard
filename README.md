# GATE Prep Dashboard

A full-stack multi-user exam preparation dashboard for GATE, NET, GOVT exams, built with Next.js 15 + MongoDB. Features SM-2 spaced repetition, cross-sectional Insights, PYQ tracking, study timer, score log, goal calendar, and more.

## Stack

- **Frontend**: Next.js 15 (App Router), React, CSS-in-JS (inline styles), Recharts
- **Backend**: Next.js API Routes
- **Database**: MongoDB via native driver (multi-user, single-document per user)
- **Auth**: JWT stored in HttpOnly cookies + bcrypt password hashing + verification codes + rate limiting
- **Mobile**: Capacitor (Android/iOS wrapper), local notifications via NotificationManager
- **Hosting**: Render (free tier)

---

## Features

### Core
- **Multi-user support** — each user has own data isolated via `userId`, unique email index, password reset with rate limiting
- **Multi-exam config** — GATE, NET, GOVT with per-exam subjects, goal tags, and emoji
- **Subject & Chapter tracking** — progress bars, status badges, per-chapter done/undo, rename, duplicate detection
- **SM-2 Spaced Repetition** — Revision log with confidence-based scheduling (Easy/Medium/Hard), auto-calculated intervals, easiness factor tracking
- **PYQ Tracker** — grouped by subject, progress auto-accumulates, optional notes for unattempted question numbers, sessions start collapsed
- **Study Timer** — start/pause/stop, live elapsed, today's sessions list, 14-day bar chart, localStorage recovery on page reload
- **Score Log** — full-mock or subject-wise, title uniqueness per day, smart average (filters zero-total), rank/percentile tracking, trend chart with subject filter
- **Goal Calendar** — monthly calendar with per-goal dots (amber = active, green = done, red = deadline), bottom sheet with add/check/delete, past-date restrictions, ranged goals
- **Dashboard** — streak counter, PYQ progress ring, goal completion ring, weekly bar chart, monthly heatmap, filterable activity feed (recently revised + overdue)
- **Insights** — cross-sectional analysis (Study×Score correlation, PYQ completion trend, Revision effectiveness with chapter matching, Consistency score, Study pattern heatmap, Recommendations engine)

### UX
- **Responsive layout** — desktop sidebar, mobile bottom nav + slide drawer
- **Glassmorphism UI** — backdrop blur on sidebar, nav bars, modals, toasts
- **Activity Heatmap** — GitHub-style contribution graph on dashboard
- **Per-subject revision count** — shown inline on every revision entry
- **Per-goal calendar dots** — one dot per goal, individual completion status
- **Badge System** — earnable badges for study hours (5 tiers, no demotion) and daily streak (5 tiers, demotion on break, permanent at max tier). Toast notification on earn. Dedicated badges page with rules, dedicated BadgeRow component in sidebar/dashboard
- **Notifications** — Capacitor local notifications for revision reminders, goals check-in, streak reminders, weekly target, breaks + custom alerts
- **Data & Backup** — export/restore full JSON, force-sync, stats summary

### Backup & Restore
- **Full JSON export** — one-click download of complete user data from `/api/export`
- **JSON import restore** — upload a backup file via the storage page; `syncToServer()` posts it to `/api/data`, fully overwriting current data
- **Force sync** — re-fetches data from server and refreshes local cache
- **Storage stats** — shows live counts (scores, sessions, PYQ entries, revisions) and data size
- Works across devices — export on one device, import on another

### Resilience & Performance
- **localStorage persistence** — every mutation writes to cache; data survives reloads even during server outages
- **Optimistic state** — UI updates instantly, syncs async to server; error toast on failure
- **Atomic score upsert** — `$pull`+`$push` prevents TOCTOU race in score writes
- **Rate limited auth** — password change limited to 5 requests per 15 min per user; verification code max 5 failed attempts
- **No `transition: all`** — all transitions scoped to specific properties to reduce GPU composite pressure
- **No staggered entry animations** — all items animate simultaneously, eliminating sequential layout thrash
- **TypeScript strict** — full type safety across all components and API routes

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
```

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000 — sign up with email/password.

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
│   │   ├── auth/               # Login, logout, signup, verify, password, resend-code
│   │   ├── data/               # GET/POST full AppData (upsert)
│   │   ├── sessions/           # Create study sessions
│   │   ├── scores/             # Create/delete score entries (atomic upsert)
│   │   ├── stats/              # Aggregated stats (counts, size)
│   │   ├── export/             # Export full data as JSON
│   │   └── exam-configs/       # Multi-exam configuration
│   ├── dashboard/              # Home page with stats, heatmap, activity feed
│   ├── login/                  # Login page
│   ├── signup/                 # Registration with exam selection
│   ├── verify/                 # Email verification code
│   ├── goals/                  # Goal calendar with bottom sheet
│   ├── subjects/               # Subject + chapter progress
│   ├── pyq/                    # PYQ tracker (collapsible subjects)
│   ├── revision/               # SM-2 spaced repetition log
│   ├── studytimer/             # Study timer with chart
│   ├── scores/                 # Score log with trend chart
│   ├── insights/               # Cross-sectional analytics
│   ├── badges/                 # Badge rules & collection display
│   ├── storage/                # Data & Backup (export/restore)
│   └── settings/               # Account, notifications, danger zone
├── components/
│   ├── badges/                 # BadgeRow, BadgeNotification
│   ├── layout/                 # Sidebar, MobileNav, MobileDrawer
│   ├── modals/                 # ScoreModal
│   └── ui/                     # Card, MetricCard, Modal, Toast, Empty, etc.
├── context/
│   └── AppContext.tsx           # Global state — data, cache, all mutations
├── lib/
│   ├── db.ts                   # MongoDB connection + index creation
│   ├── auth.ts                 # JWT sign/verify utilities
│   ├── badges.ts               # Badge definitions, detection, demotion logic
│   ├── utils.ts                # dateKey, sm2Next, computeStreak, formatSeconds
│   ├── rateLimit.ts            # In-memory rate limiter
│   ├── types.ts                # TypeScript interfaces
│   └── constants.ts            # Exam configs, subject lists, colors
├── models/
│   ├── User.ts                 # (removed — uses native driver)
│   └── AppData.ts              # Mongoose AppData schema (with SM-2 fields)
└── public/                     # Static assets
```

---

## Architecture

### Data Flow

1. **AppContext** (`context/AppContext.tsx`) is the single source of truth
2. On mount, `loadData()` loads cached data from `localStorage` instantly, then fetches fresh data from `GET /api/data`
3. Every mutation updates state optimistically → fires `POST /api/data` → on failure shows error toast
4. Every mutation also writes to `localStorage` — data survives page reload even if the server request fails
5. `POST /api/data` uses `findOneAndUpdate` with `upsert` to prevent duplicate documents

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth` | POST | Login (returns JWT in HttpOnly cookie) |
| `/api/auth` | GET | Returns current user session |
| `/api/auth` | DELETE | Clears auth cookie (logout) |
| `/api/auth/signup` | POST | Register with email + password + exam |
| `/api/auth/verify` | POST | Verify email with code (max 5 attempts) |
| `/api/auth/password` | POST | Change password (rate limited) |
| `/api/auth/resend-code` | POST | Resend verification code |
| `/api/data` | GET | Returns full AppData document (upsert) |
| `/api/data` | POST | Saves AppData fields |
| `/api/sessions` | POST | Creates a new study session |
| `/api/scores` | POST | Creates/updates a score entry (atomic) |
| `/api/stats` | GET | Aggregated counts + file size |
| `/api/export` | GET | Downloads full data as JSON |
| `/api/exam-configs` | GET | Returns all exam configurations |

### Multi-User Isolation

- Each `AppData` document is keyed by `userId`
- All API routes authenticate via `requireAuth()` and query by `userId`
- Email uniqueness enforced via MongoDB unique index
- Verification codes stored in user document with expiry and attempt counter
- SMTP email sending via Nodemailer (Mailtrap in dev, Mailgun/SendGrid in prod)

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
| `SMTP_HOST` | SMTP server |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `FROM_EMAIL` | Sender email address |
| `NODE_ENV` | `production` |
| `NEXTAUTH_URL` | `https://your-app.onrender.com` |

### 4. Deploy

Render auto-deploys on every push to `main`.
