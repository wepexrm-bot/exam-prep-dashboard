import { AppData, DailyScore, PYQChapter, Prediction, Subject } from './types';
import { GATE_WEIGHTS, NET_WEIGHTS } from './constants';
import { ExamType } from '@/models/User';

export function today(): string {
  return new Date().toISOString().split('T')[0];
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

export function computeStreak(dailyScores: DailyScore[]): number {
  if (!dailyScores.length) return 0;
  const sorted = [...dailyScores].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let cur = new Date();
  cur.setHours(0, 0, 0, 0);
  const todayKey = cur.toISOString().split('T')[0];
  const hasToday = sorted.some((s) => s.date === todayKey);
  if (!hasToday) cur.setDate(cur.getDate() - 1);
  for (const s of sorted) {
    const d = new Date(s.date + 'T00:00:00');
    const diff = Math.round((cur.getTime() - d.getTime()) / 86400000);
    if (diff <= 1) { streak++; cur = d; }
    else break;
  }
  return streak;
}

export function getPrediction(data: AppData, examType: ExamType = 'GATE'): Prediction {
  const weights = examType === 'GATE' ? GATE_WEIGHTS : NET_WEIGHTS;
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

  const mocks = data.mockTests || [];
  let mockBoost = 0;
  if (mocks.length) {
    const avgMock = mocks.reduce((a, m) => a + (m.score / m.total) * 100, 0) / mocks.length;
    mockBoost = ((avgMock - baseAvg) / 100) * 0.3;
  }

  const proj = Math.min(100, baseAvg * (0.7 + subjectFactor * 0.4) + pyqBoost * 10 + mockBoost * 10);

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
