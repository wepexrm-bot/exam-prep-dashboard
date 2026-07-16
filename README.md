# Exam Preparation Dashboard

A full-stack multi-user exam preparation dashboard for GATE, NET, GOVT exams, built with Next.js 14 + MongoDB. Features SM-2 spaced repetition, cross-sectional Insights, PYQ tracking, study timer, score log, goal calendar with carryover, badge system, dark-only glassmorphism UI, and an in-app forced-update mechanism for the Capacitor Android wrapper.

## Stack

- **Frontend**: Next.js 14 (App Router), React, CSS-in-JS (inline styles), Recharts
- **Backend**: Next.js API Routes
- **Database**: MongoDB via native driver (multi-user, single-document per user)
- **Auth**: JWT stored in HttpOnly cookies + bcrypt password hashing + verification codes + rate limiting
- **Mobile**: Capacitor (Android wrapper), local notifications, in-app version gate
- **Hosting**: Render (free tier, auto-deploys on push to `main`)

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
- **Goal Calendar** — monthly calendar with per-goal dots, bottom sheet, ranged goals, extend deadline, past-date restrictions. Goals use pure carryover computation — `date` is immutable, carryover is display-only via `goalAppearsOn()`
- **Dashboard** — streak counter, PYQ progress ring, goal completion ring (includes carried-over goals), weekly bar chart, monthly heatmap, filterable activity feed (recently revised + overdue)
- **Insights** — cross-sectional analysis (Study×Score correlation, PYQ completion trend, Revision effectiveness with chapter matching, Consistency score, Study pattern heatmap, Recommendations engine)

### Goal System
- **Immutable `date`** — goal creation date is never rewritten. Carryover is a pure display function, not a mutation
- **`goalAppearsOn(g, day, today)`** — single source of truth for whether a goal shows on a given day. Handles single-day, ranged, overdue, and completed goals consistently
- **`isGoalDoneOnDate(g, day)`** — marks a goal as checked only on the exact day it was completed. Earlier carryover days remain unchecked, preserving the slip history
- **`completedDate`** — stamped on toggle (cleared on un-done), ensures completion day is preserved across carries
- **Extend deadline** — overdue multi-day goals show an "Extend" button with a date picker

### Badge System
- **Two independent collections**: `badge_study_hours` (append-only — never demoted, never overwritten) and `badge_streak` (LIFO stack — all tiers preserved, top popped on demotion)
- **Detection** — `detectNewStudyBadges()` scans accumulated hours against thresholds; `detectStreakBadge()` runs after every streak computation
- **Migration** — on first load, old flat `badges` array is migrated once into the two structured collections
- **Toast dedup** — each earned `badgeId` is tracked in `localStorage.notified_badge_ids`, shown only once per badge across sessions
- **Display** — `allBadges(data)` merges both collections for the badge page and sidebar

### UX
- **Dark-only mode** — light mode entirely removed. All theme-toggle UI eliminated
- **Responsive layout** — desktop sidebar, mobile bottom nav + slide drawer with copyright footer
- **Glassmorphism UI** — backdrop blur on sidebar, nav bars, modals, toasts
- **Activity Heatmap** — GitHub-style contribution graph on dashboard
- **Badge system** — earnable badges for study hours (5 tiers, no demotion) and daily streak (5 tiers, demotion on break, permanent at max). Dedicated badges page, GlowingBadge component with per-badge conic ring colors
- **Notifications** — Capacitor local notifications with per-tab dedup (`notif_fired`), multi-day custom alerts, resume detection, `onclick` page navigation, full cancel on re-schedule
- **Data & Backup** — export/restore full JSON, force-sync, stats summary

### In-App Version Gate
- **Forced updates** — `UpdateGate` component calls `App.getInfo()` on native platforms, compares against `/api/app-version` endpoint. Blocks UI with full-screen overlay if below `minRequiredVersion`, shows dismissible banner if behind `latestVersion`
- **Semver comparator** — `lib/version.ts` provides `isVersionLower(a, b)` with no external dependencies
- **Decoupled from git** — version numbers are maintained in the API endpoint, not in tags or releases

### Backup & Restore
- **Full JSON export** — one-click download of complete user data from `/api/export`
- **JSON import restore** — upload a backup file via the storage page; `syncToServer()` posts it to `/api/data`, fully overwriting current data
- **Force sync** — re-fetches data from server and refreshes local cache
- **Storage stats** — shows live counts (scores, sessions, PYQ entries, revisions) and data size
- Works across devices — export on one device, import on another

### Resilience & Performance
- **localStorage persistence** — every mutation writes to cache; data survives reloads even during server outages
- **Optimistic state with revert** — UI updates instantly, syncs async to server; on failure reverts state and shows error toast
- **Atomic score upsert** — replaces full `dailyScores` array in a single `$set` to prevent TOCTOU race in score writes
- **Rate limited auth** — password change limited to 5 requests per 15 min per user; verification code max 5 failed attempts
- **No `transition: all`** — all transitions scoped to specific properties to reduce GPU composite pressure
- **No staggered entry animations** — all items animate simultaneously, eliminating sequential layout thrash
- **TypeScript strict** — full type safety across all components and API routes
- **Badge persistence** — `loadData` falls back to local state when server returns empty badge collections; Mongoose schema explicitly includes `BadgeStateSchema`

## Project Structure

```
gate-prep/
├── app/
│   ├── api/
│   │   ├── app-version/          # In-app forced-update endpoint
│   │   ├── auth/                 # Login, logout, signup, verify, password, resend-code
│   │   ├── data/                 # GET/POST full AppData (upsert)
│   │   ├── sessions/             # Create study sessions
│   │   ├── scores/               # Create/delete score entries (atomic upsert)
│   │   ├── stats/                # Aggregated stats (counts, size)
│   │   ├── export/               # Export full data as JSON
│   │   └── exam-configs/         # Multi-exam configuration
│   ├── dashboard/                # Home page with stats, heatmap, activity feed
│   ├── login/                    # Login page
│   ├── signup/                   # Registration with exam selection
│   ├── verify/                   # Email verification code
│   ├── goals/                    # Goal calendar with carryover, extend deadline
│   ├── subjects/                 # Subject + chapter progress
│   ├── pyq/                      # PYQ tracker (collapsible subjects)
│   ├── revision/                 # SM-2 spaced repetition log
│   ├── studytimer/               # Study timer with chart
│   ├── scores/                   # Score log with trend chart
│   ├── insights/                 # Cross-sectional analytics
│   ├── badges/                   # Badge rules & collection display
│   ├── storage/                  # Data & Backup (export/restore)
│   └── settings/                 # Account, notifications, danger zone
├── components/
│   ├── badges/                   # BadgeRow, BadgeNotification, GlowingBadge
│   ├── layout/                   # Sidebar, MobileNav, MobileDrawer
│   ├── ui/                       # Card, MetricCard, Modal, Toast, Empty, etc.
│   └── UpdateGate.tsx            # In-app version gate (native only)
├── context/
│   └── AppContext.tsx             # Global state — data, cache, all mutations, badge detection
├── lib/
│   ├── db.ts                     # MongoDB connection + index creation
│   ├── auth.ts                   # JWT sign/verify utilities
│   ├── badges.ts                 # Badge definitions, detection (study hours + streak)
│   ├── version.ts                # Semver comparator (isVersionLower)
│   ├── utils.ts                  # dateKey, sm2Next, computeStreak, goalAppearsOn, isGoalDoneOnDate
│   ├── rateLimit.ts              # In-memory rate limiter
│   ├── types.ts                  # TypeScript interfaces (Goal.completedDate, badge_study_hours, etc.)
│   └── constants.ts              # Exam configs, subject lists, colors
├── models/
│   └── AppData.ts                # Mongoose AppData schema (with BadgeStateSchema)
└── public/                       # Static assets
```

---

## Architecture

### Data Flow

1. **AppContext** (`context/AppContext.tsx`) is the single source of truth
2. On mount, `loadData()` loads cached data from `localStorage` instantly, then fetches fresh data from `GET /api/data`; falls back to local badge state if server returns empty badge collections
3. Every mutation updates state optimistically → fires `POST /api/data` → on failure shows error toast and reverts
4. Every mutation also writes to `localStorage` — data survives page reload even if the server request fails
5. `POST /api/data` uses `findOneAndUpdate` with `upsert` to prevent duplicate documents
6. Badge detection runs post-mutation: `detectNewStudyBadges()` and `detectStreakBadge()` examine the new state and enqueue toasts for newly-earned badges

### Goal Carryover (Pure Computation)

- `date` is immutable — never rewritten after creation
- `goalAppearsOn(g, day, today)` is the single source of truth for display. Rules:
  - If day < start, goal is hidden
  - If done: visible from start through `completedDate` (preserves carryover history)
  - If day <= end: visible within planned window
  - Otherwise: carries forward daily until done, capped at today
- `isGoalDoneOnDate(g, day)` returns true only on the exact completion day — earlier carryover days render unchecked
- `goalsVisibleOn(goals, day, today)` filters by `goalAppearsOn` for convenience

### Badge Architecture

- **Two independent collections** replace the old flat array:
  - `badge_study_hours[]` — append-only records for study hour thresholds. Never demoted or overwritten
  - `badge_streak[]` — LIFO stack. Each earn adds to the top; a break demotes by removing the top badge (lower tiers preserved). Permanent at max tier
- **Migration**: on first load after deployment, old `badges` field is migrated once into the two collections
- **Toast dedup**: `localStorage.notified_badge_ids` tracks which `badgeId`s have been shown, preventing re-toast across sessions
- **GlowingBadge**: solid-segment conic gradient ring per badge, with per-badge `GLOW_RINGS` color map

### In-App Version Gate

- `UpdateGate` component wraps authenticated pages inside `DashboardShell`
- On native (Capacitor) platforms only: fetches installed version via `App.getInfo()`, compares against `/api/app-version` response using `isVersionLower()`
- If installed version < `minRequiredVersion`: full-screen block overlay with download link
- If installed version < `latestVersion`: dismissible banner with update prompt
- Fails open (no block) if the network call or plugin call fails
- No-op on web (`Capacitor.isNativePlatform()` returns false)

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/app-version` | GET | Returns `latestVersion`, `minRequiredVersion`, `apkUrl`, `releaseNotes` |
| `/api/auth` | POST | Login (returns JWT in HttpOnly cookie) |
| `/api/auth` | DELETE | Clears auth cookie (logout) |
| `/api/auth/signup` | POST | Register with email + password + exam |
| `/api/auth/verify` | POST | Verify email with code (max 5 attempts) |
| `/api/auth/password` | POST | Change password (rate limited) |
| `/api/auth/resend-code` | POST | Resend verification code |
| `/api/data` | GET | Returns full AppData document (upsert) |
| `/api/data` | POST | Saves whitelisted AppData fields (goals, subjects, dailyScores, pyqData, revisions, studySessions, weeklyTarget, notificationPrefs, badge_study_hours, badge_streak) |
| `/api/sessions` | POST | Creates a new study session |
| `/api/scores` | POST | Creates/updates a score entry (single atomic update) |
| `/api/stats` | GET | Aggregated counts + file size |
| `/api/export` | GET | Downloads full data as JSON |
| `/api/exam-configs` | GET | Returns all exam configurations |

### Multi-User Isolation

- Each `AppData` document is keyed by `userId`
- All API routes authenticate via `requireAuth()` and query by `userId`
- Email uniqueness enforced via MongoDB unique index
- Verification codes stored in user document with expiry and attempt counter
- Transactional email sending via Brevo API

The mobile APK loads from the live Render URL via WebView — no local build pipeline needed for feature updates. Only rebuild the APK when native Capacitor plugins change.
