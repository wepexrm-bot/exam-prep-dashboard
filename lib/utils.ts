import { AppData, DailyScore, Subject } from './types';

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

