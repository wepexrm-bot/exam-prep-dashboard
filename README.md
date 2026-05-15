# GATE Prep Dashboard

A full-stack Next.js 14 + MongoDB dashboard for GATE CS 2026 preparation.

## Stack
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes (replaces Express)
- **Database**: MongoDB via Mongoose
- **Auth**: JWT stored in HttpOnly cookies + bcrypt password hashing
- **Hosting**: Render (free tier)

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
```

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000 — sign in with `admin` / `gate2026` (or whatever you set in `.env.local`).

---

## MongoDB Atlas Setup (Free)

1. Go to https://cloud.mongodb.com → Create free M0 cluster
2. Database Access → Add user with readWrite permission
3. Network Access → Allow from anywhere (`0.0.0.0/0`) for Render
4. Connect → Drivers → copy the connection string
5. Paste into `MONGODB_URI` in `.env.local`

---

## Deploying to Render

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
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

### 3. Add Environment Variables on Render

Under your service → Environment → Add:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your Atlas URI |
| `JWT_SECRET` | Your 64-byte hex secret |
| `ADMIN_USER` | `admin` |
| `ADMIN_PASS` | Your chosen password |
| `NODE_ENV` | `production` |

### 4. Deploy

Render auto-deploys on every push to `main`. First deploy takes ~3 minutes.

---

## Migrating data from Railway

1. On Railway, export your data: go to the app → **Data & Backup** → **Download backup**
2. Deploy this app to Render
3. Sign in, go to **Data & Backup** → **Restore from backup** → upload the JSON file
4. All your data (scores, subjects, PYQ sessions, revisions, mock tests) is restored ✓

---

## Project Structure

```
gate-prep/
├── app/
│   ├── api/              # API routes (auth, data, scores, sessions, stats, export)
│   ├── dashboard/        # Dashboard page + shell
│   ├── goals/            # Daily Goals
│   ├── subjects/         # Subject + Chapter tracking
│   ├── pyq/              # PYQ Tracker
│   ├── revision/         # Spaced Repetition
│   ├── studytimer/       # Study Timer
│   ├── scores/           # Score Log
│   ├── mocks/            # Mock Tests
│   ├── predict/          # Exam Prediction
│   ├── storage/          # Data & Backup
│   ├── settings/         # Settings
│   └── login/            # Login
├── components/
│   ├── layout/           # Sidebar, MobileNav
│   ├── modals/           # ScoreModal, MockModal
│   └── ui/               # Card, Modal, MetricCard, Toast, etc.
├── context/
│   └── AppContext.tsx    # Global state (replaces appData + syncToServer)
├── lib/
│   ├── db.ts             # MongoDB connection
│   ├── auth.ts           # JWT utilities
│   ├── utils.ts          # Prediction engine, streak, formatters
│   ├── constants.ts      # GATE weights, subjects, colors
│   └── types.ts          # TypeScript types
└── models/
    ├── User.ts           # User model (bcrypt)
    └── AppData.ts        # All dashboard data per user
```

---

## First Login

On first login, the server automatically:
1. Creates a `User` document with your hashed password
2. Seeds a default `AppData` document with all 12 GATE CS subjects

No manual DB seeding needed.
