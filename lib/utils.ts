import { AppData, DailyScore, PYQChapter, Prediction, Subject } from './types';

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

export function getPrediction(data: AppData, weights: Record<string, number> = {}): Prediction {
  const sc = (data.dailyScores || []).slice(-14);
  if (!sc.length) return { score: null, percentile: null, qualify: null, noData: true, advice: [] };

  const baseAvg = sc.reduce((a, s) => a + s.score, 0) / sc.length;
  const subjects = data.subjects || [];

  let weightedSum = 0, totalWeight = 0;
  subjects.forEach(s => {
    const w = weights[s.name] || 5;
    weightedSum += (getPct(s) / 100) * w;
    totalWeight += w;
  });
  const subjectFactor = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

  const pyqData = data.pyqData || [];
  const pyqAccList = pyqData
    .map((d: PYQChapter) => {
      if (!d.sessions?.length) return null;
      const att = d.sessions.reduce((a, s) => a + s.attempted, 0);
      const cor = d.sessions.reduce((a, s) => a + s.correct, 0);
      return att > 0 ? (cor / att) * 100 : null;
    })
    .filter(Boolean) as number[];
  const pyqBoost = pyqAccList.length
    ? (pyqAccList.reduce((a, v) => a + v, 0) / pyqAccList.length - 50) / 200
    : 0;

  const proj = Math.min(100, baseAvg * (0.7 + subjectFactor * 0.4) + pyqBoost * 10);

  const advice = subjects
    .filter(s => getPct(s) < 50)
    .sort((a, b) => (weights[b.name] || 5) - (weights[a.name] || 5))
    .slice(0, 3)
    .map(s => `${s.name} (${weights[s.name] || 5}% weight, only ${getPct(s)}% done)`);

  return {
    score: Math.round(proj * 10) / 10,
    percentile: Math.round(Math.min(99, 50 + proj * 0.42) * 10) / 10,
    qualify: Math.round(Math.min(99, 40 + proj * 0.55)),
    noData: false,
    subjectFactor: Math.round(subjectFactor * 100),
    advice,
  };
}