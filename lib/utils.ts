import { AppData, Confidence, DailyScore, Goal, Subject } from './types';

// ── Local-date-safe key builder ──────────────────────────────
// Never use toISOString().split('T')[0] for "today" — it converts to UTC
// first, which shifts the date by a day depending on timezone/time of day.
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return dateKey(new Date());
}

export function getDateLabel(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const day = now.getDate();
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const year = now.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

export function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

export function getPct(s: Subject): number {
  if (!s.chapters || !s.chapters.length) return s.pct || 0;
  return Math.round((s.chapters.filter((c) => c.done).length / s.chapters.length) * 100);
}

export function computeStreak(data: AppData): number {
  const activeDates = new Set<string>();

  (data.dailyScores || []).forEach(s => activeDates.add(s.date));

  // Study timer sessions — parse the ISO start time as a local Date, then key it locally
  (data.studySessions || []).forEach(s => {
    if (s.start) activeDates.add(dateKey(new Date(s.start)));
  });

  (data.pyqData || []).forEach(chap => {
    (chap.sessions || []).forEach(s => {
      if (s.date) activeDates.add(s.date);
    });
  });

  (data.revisions || []).forEach(r => {
    if (r.lastRevised) activeDates.add(r.lastRevised);
  });

  if (!activeDates.size) return 0;

  let streak = 0;
  let cur = new Date();
  cur.setHours(0, 0, 0, 0);
  const todayK = dateKey(cur);

  if (!activeDates.has(todayK)) cur.setDate(cur.getDate() - 1);

  while (true) {
    const key = dateKey(cur);
    if (!activeDates.has(key)) break;
    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  return streak;
}

// ── SM-2 spaced repetition algorithm ──────────────────────────
export function sm2Next(
  confidence: Confidence,
  currentInterval: number,
  easinessFactor: number,
  repetitions: number,
): { intervalDays: number; easinessFactor: number; repetitions: number } {
  let ef = easinessFactor;
  let rep = repetitions;
  let interval = currentInterval;

  const q = confidence === 'easy' ? 3 : confidence === 'medium' ? 2 : 1;

  // Update easiness factor
  ef = ef + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02));
  ef = Math.max(1.3, ef);

  if (q < 2) {
    // Hard or Medium — reset
    rep = 0;
    interval = 1;
  } else {
    // Easy — advance
    rep += 1;
    if (rep === 1) {
      interval = 1;
    } else if (rep === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * ef);
    }
  }

  return { intervalDays: interval, easinessFactor: Math.round(ef * 100) / 100, repetitions: rep };
}

// ── Goal carryover / visibility ────────────────────────────────
// This is the ONLY place carryover logic should live. Nothing else — not loadData,
// not the dashboard, not the calendar — should re-derive this independently.
//
// Rules:
// - `date` is immutable: the day the goal was created/assigned. Never mutated after creation.
// - `endDate` (if present) is the planned deadline for ranged/multi-day goals.
// - `completedDate` is stamped once, at the moment the goal is marked done.
//
// Behavior:
// - Done goals appear exactly once, on completedDate (or endDate/date if that's ever missing
//   for legacy data) — never again, on any other day, past or future.
// - Incomplete goals appear on every day of their planned window (date -> endDate||date),
//   AND continue to carry forward on every day after that window until they're completed
//   or today, whichever is sooner. They never appear before `date`, and never after `today`.
export function goalAppearsOn(g: Goal, day: string, today: string): boolean {
  const start = g.date;
  const end = g.endDate || g.date;

  if (g.done) {
    return day === (g.completedDate || end);
  }

  if (day < start) return false;
  if (day <= end) return true;      // inside its planned window (covers single-day + ranged)
  return day <= today;              // overdue — carries forward daily until done, capped at today
}

/** Convenience: filter a full goals array down to what should show on `day`. */
export function goalsVisibleOn(goals: Goal[], day: string, today: string): Goal[] {
  return goals.filter(g => goalAppearsOn(g, day, today));
}