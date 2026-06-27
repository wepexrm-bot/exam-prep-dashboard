'use client';
import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { TrendingUp, AlertTriangle, Zap, Clock, Target, Brain, BarChart3, Award } from 'lucide-react';
import { PageHeader, Card, CardHeader, MetricCard, Meter } from '@/components/ui';
import { getPct } from '@/lib/utils';
import { useExamConfig } from '@/lib/useExamConfig';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, ScatterChart, Scatter, Cell } from 'recharts';

const C = {
  cyan: '#22D3EE', green: '#4ADE80', orange: '#FB923C', red: '#F87171',
  purple: '#A78BFA', pink: '#F472B6', muted: '#7C8089',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.12)',
  surface: 'rgba(255,255,255,0.03)',
};

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#1C1F25', border: `1px solid ${C.borderStrong}`, borderRadius: 10,
      padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>{children}</div>
  );
}

function parseLocalDate(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function formatDate(s: string) { return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }

export default function InsightsPage() {
  const { data, examType } = useApp();
  const { config: cfg } = useExamConfig(examType);

  const subjects = data.subjects || [];
  const scores = data.dailyScores || [];
  const sessions = data.studySessions || [];
  const pyqData = data.pyqData || [];
  const revisions = data.revisions || [];
  const goals = data.goals || [];

  // ── 1. Study → Score correlation ──────────────────────────────────────
  const studyScoreCorr = useMemo(() => {
    return scores.map(s => {
      const d = parseLocalDate(s.date);
      const priorWeek = new Date(d); priorWeek.setDate(priorWeek.getDate() - 7);
      const priorHours = sessions
        .filter(se => {
          const t = new Date(se.start);
          return t >= priorWeek && t <= d;
        })
        .reduce((a, se) => a + (se.durationSec || 0), 0) / 3600;
      return { date: formatDate(s.date), score: s.score, priorHours: Math.round(priorHours * 10) / 10 };
    }).filter(s => s.priorHours > 0);
  }, [scores, sessions]);

  const corrAvg = useMemo(() => {
    if (studyScoreCorr.length < 2) return null;
    const avgHours = studyScoreCorr.reduce((a, s) => a + s.priorHours, 0) / studyScoreCorr.length;
    const avgScore = studyScoreCorr.reduce((a, s) => a + s.score, 0) / studyScoreCorr.length;
    let num = 0, denH = 0, denS = 0;
    studyScoreCorr.forEach(s => {
      num += (s.priorHours - avgHours) * (s.score - avgScore);
      denH += (s.priorHours - avgHours) ** 2;
      denS += (s.score - avgScore) ** 2;
    });
    const r = denH && denS ? num / Math.sqrt(denH * denS) : 0;
    return { r: Math.round(r * 100) / 100, count: studyScoreCorr.length };
  }, [studyScoreCorr]);

  // ── 2. PYQ accuracy trend per chapter ────────────────────────────────
  const pyqTrend = useMemo(() => {
    return pyqData.map(ch => {
      const sorted = [...ch.sessions].sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (sorted.length < 2 || !first || !last) return null;
      const firstAcc = first.attempted > 0 ? Math.round((first.correct / first.attempted) * 100) : 0;
      const lastAcc = last.attempted > 0 ? Math.round((last.correct / last.attempted) * 100) : 0;
      const trend = lastAcc - firstAcc;
      return {
        chapter: ch.key.split('::').pop() || ch.key,
        sessions: sorted.length,
        firstAcc, lastAcc, trend,
        declining: trend < -10,
      };
    }).filter(Boolean) as { chapter: string; sessions: number; firstAcc: number; lastAcc: number; trend: number; declining: boolean }[];
  }, [pyqData]);

  const decliningChapters = pyqTrend.filter(c => c.declining);

  // ── 3. Revision effectiveness ─────────────────────────────────────────
  const revisionEffectiveness = useMemo(() => {
    return revisions.map(r => {
      const chKey = `${r.subject}::${r.topic}`;
      const ch = pyqData.find(p => p.key === chKey);
      if (!ch || !ch.sessions.length) return null;
      const next = parseLocalDate(r.lastRevised);
      next.setDate(next.getDate() + r.intervalDays);
      const isFresh = next > new Date();
      const acc = ch.sessions.reduce((a, s) => a + (s.attempted > 0 ? (s.correct / s.attempted) * 100 : 0), 0) / ch.sessions.length;
      return { topic: r.topic, acc: Math.round(acc), isFresh, intervalDays: r.intervalDays };
    }).filter(Boolean) as { topic: string; acc: number; isFresh: boolean; intervalDays: number }[];
  }, [revisions, pyqData]);

  const freshAvg = useMemo(() => {
    const f = revisionEffectiveness.filter(r => r.isFresh);
    return f.length ? Math.round(f.reduce((a, r) => a + r.acc, 0) / f.length) : null;
  }, [revisionEffectiveness]);
  const staleAvg = useMemo(() => {
    const s = revisionEffectiveness.filter(r => !r.isFresh);
    return s.length ? Math.round(s.reduce((a, r) => a + r.acc, 0) / s.length) : null;
  }, [revisionEffectiveness]);

  // ── 4. Consistency & momentum ────────────────────────────────────────
  const consistency = useMemo(() => {
    if (scores.length < 3) return null;
    const vals = scores.map(s => s.score);
    const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
    const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length;
    const stdDev = Math.sqrt(variance);
    const recent = vals.slice(-3);
    const momentum = recent.length === 3 ? (recent[2] - recent[0]) / 2 : 0;
    return {
      stdDev: Math.round(stdDev * 10) / 10,
      cv: mean ? Math.round((stdDev / mean) * 100) : 0,
      momentum: Math.round(momentum * 10) / 10,
      improving: momentum > 2,
      declining: momentum < -2,
      stable: Math.abs(momentum) <= 2,
    };
  }, [scores]);

  // ── 5. Subject health matrix ─────────────────────────────────────────
  const subjectHealth = useMemo(() => {
    return subjects.map(s => {
      const chapters = s.chapters || [];
      const pct = getPct(s);
      const chKeys = pyqData.filter(p => p.key.startsWith(s.name + '::'));
      const pyqSessions = chKeys.reduce((a, c) => a + c.sessions.length, 0);
      const totalAtt = chKeys.reduce((a, c) => a + c.sessions.reduce((sa, se) => sa + se.attempted, 0), 0);
      const totalCor = chKeys.reduce((a, c) => a + c.sessions.reduce((sa, se) => sa + se.correct, 0), 0);
      const pyqAcc = totalAtt > 0 ? Math.round((totalCor / totalAtt) * 100) : null;
      const revCount = revisions.filter(r => r.subject === s.name).length;
      return {
        name: s.name, pct, pyqAcc, pyqSessions, revCount,
        health: pct >= 70 && (pyqAcc == null || pyqAcc >= 60) ? 'good' : pct >= 40 ? 'ok' : 'weak',
      };
    });
  }, [subjects, pyqData, revisions]);

  // ── 6. Study pattern (hour × day heatmap) ────────────────────────────
  const studyPattern = useMemo(() => {
    const hourBuckets: number[] = new Array(24).fill(0);
    const dayBuckets: number[] = new Array(7).fill(0);
    sessions.forEach(s => {
      if (!s.start) return;
      const d = new Date(s.start);
      hourBuckets[d.getHours()] += (s.durationSec || 0) / 60;
      dayBuckets[d.getDay()] += (s.durationSec || 0) / 60;
    });
    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
    const peakDay = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayBuckets.indexOf(Math.max(...dayBuckets))];
    const totalMin = hourBuckets.reduce((a, v) => a + v, 0);
    const hourData = hourBuckets.map((m, h) => ({ hour: `${h}:00`, min: Math.round(m) }));
    const dayData = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => ({ day: d, min: Math.round(dayBuckets[i]) }));
    return { peakHour, peakDay, totalMin, hourData, dayData };
  }, [sessions]);

  // ── Cumulative recommendation engine ─────────────────────────────────
  const recommendations = useMemo(() => {
    const recs: { icon: React.ReactNode; text: string; color: string; bg: string }[] = [];

    if (decliningChapters.length > 0) {
      recs.push({
        icon: <TrendingUp size={14} />, color: C.red,
        bg: 'rgba(248,113,113,0.08)',
        text: `Your accuracy is dropping in ${decliningChapters.length} chapter${decliningChapters.length > 1 ? 's' : ''} (${decliningChapters.map(c => c.chapter).join(', ')}). Revisit fundamentals.`,
      });
    }

    if (staleAvg != null && freshAvg != null && staleAvg < freshAvg - 10) {
      recs.push({
        icon: <Brain size={14} />, color: C.orange,
        bg: 'rgba(251,146,60,0.08)',
        text: `Revised topics average ${freshAvg}% accuracy vs ${staleAvg}% for stale — consistent revision boosts scores by ${freshAvg - staleAvg}% on average.`,
      });
    }

    if (consistency && consistency.declining) {
      recs.push({
        icon: <AlertTriangle size={14} />, color: C.red,
        bg: 'rgba(248,113,113,0.08)',
        text: `Your scores are declining (momentum: ${consistency.momentum}). Last 3 tests averaged a drop. Consider taking a lighter week to consolidate.`,
      });
    }

    if (consistency && consistency.stable && consistency.cv > 30) {
      recs.push({
        icon: <BarChart3 size={14} />, color: C.orange,
        bg: 'rgba(251,146,60,0.08)',
        text: `Score volatility is high (CV ${consistency.cv}%). Focus on consistent output — aim for ±10% variation.`,
      });
    }

    if (corrAvg && corrAvg.r > 0.3) {
      recs.push({
        icon: <Zap size={14} />, color: C.green,
        bg: 'rgba(74,222,128,0.08)',
        text: `Study hours correlate with scores (r = ${corrAvg.r}). Each additional hour of prep before a test tends to improve your result.`,
      });
    }

    if (corrAvg && corrAvg.r < -0.2) {
      recs.push({
        icon: <Clock size={14} />, color: C.orange,
        bg: 'rgba(251,146,60,0.08)',
        text: `More study hours aren't translating to better scores. Focus on active practice (PYQs, tests) rather than passive review.`,
      });
    }

    const weakHealth = subjectHealth.filter(s => s.health === 'weak');
    if (weakHealth.length > 0) {
      recs.push({
        icon: <Target size={14} />, color: C.red,
        bg: 'rgba(248,113,113,0.08)',
        text: `Critical: ${weakHealth.map(s => s.name).join(', ')} need immediate attention — low syllabus completion and/or poor PYQ accuracy.`,
      });
    }

    if (studyPattern.totalMin > 0) {
      recs.push({
        icon: <Clock size={14} />, color: C.cyan,
        bg: 'rgba(34,211,238,0.08)',
        text: `You study most effectively on ${studyPattern.peakDay}s around ${studyPattern.peakHour}:00 — schedule your toughest topics then.`,
      });
    }

    if (recs.length === 0) {
      recs.push({
        icon: <Award size={14} />, color: C.green,
        bg: 'rgba(74,222,128,0.08)',
        text: 'No red flags detected. Keep up the balanced approach across syllabus, practice, and revision.',
      });
    }

    return recs;
  }, [decliningChapters, staleAvg, freshAvg, consistency, corrAvg, subjectHealth, studyPattern]);

  const chartTooltip = (props: any) => {
    if (!props.active || !props.payload?.length) return null;
    return (
      <TooltipBox>
        <div style={{ color: '#E5E7EB', fontWeight: 600, marginBottom: 2 }}>{props.label}</div>
        {props.payload.map((p: any, i: number) => (
          <div key={i} style={{ color: p.color, fontSize: 11 }}>{p.name}: {p.value}{p.unit || ''}</div>
        ))}
      </TooltipBox>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <PageHeader title="Insights" sub={`Cross-sectional analysis for ${cfg.label}`} />
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
          background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)', color: '#FB923C',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>Beta</span>
      </div>

      {/* ── Quick health summary ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <MetricCard label="Score consistency" value={consistency ? `${consistency.cv}%` : '—'} sub={consistency ? `CV (${consistency.stdDev} σ)` : 'Need 3+ scores'} />
        <MetricCard label="Study→Score corr" value={corrAvg ? `r = ${corrAvg.r}` : '—'} sub={corrAvg ? `From ${corrAvg.count} tests` : 'Need more data'} />
        <MetricCard label="Declining chapters" value={decliningChapters.length} sub={decliningChapters.length ? 'PYQ accuracy dropping' : 'All stable or improving'} />
        <MetricCard label="Revision delta" value={freshAvg != null && staleAvg != null ? `${freshAvg - staleAvg > 0 ? '+' : ''}${freshAvg - staleAvg}%` : '—'} sub={freshAvg != null ? 'Fresh vs stale accuracy' : 'Need revision + PYQ data'} />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">

        {/* Study hours vs Score scatter */}
        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={14} style={{ color: C.cyan }} /> Study hours vs Score</span>} />
          {studyScoreCorr.length < 2 ? (
            <div className="text-center py-6 text-[13px]" style={{ color: C.muted }}>
              Log tests with study sessions in the prior 7 days to see the correlation.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="priorHours" name="Study hours" unit="h" tick={{ fontSize: 9, fill: C.muted }} axisLine={false} tickLine={false} />
                <YAxis dataKey="score" name="Score" unit="%" tick={{ fontSize: 9, fill: C.muted }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={chartTooltip} cursor={{ fill: C.surface }} />
                <Scatter data={studyScoreCorr} fill={C.cyan}>
                  {studyScoreCorr.map((_, i) => (
                    <Cell key={i} fill={C.cyan} fillOpacity={0.6} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* PYQ accuracy trend (first vs last session) */}
        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14} style={{ color: C.purple }} /> PYQ accuracy trend</span>} />
          {pyqTrend.length === 0 ? (
            <div className="text-center py-6 text-[13px]" style={{ color: C.muted }}>
              Complete at least 2 PYQ sessions per chapter to see trends.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pyqTrend.slice(0, 6).map(c => (
                <div key={c.chapter} style={{ padding: '8px 10px', borderRadius: 8, background: C.surface }}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span style={{ color: 'var(--text)' }}>{c.chapter}</span>
                    <span style={{ color: c.declining ? C.red : C.green, fontWeight: 600 }}>
                      {c.firstAcc}% → {c.lastAcc}% ({c.trend > 0 ? '+' : ''}{c.trend})
                    </span>
                  </div>
                  <Meter pct={Math.min(100, Math.max(0, c.lastAcc))} color={c.declining ? C.red : C.green} />
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{c.sessions} sessions</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Study pattern + Subject health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} style={{ color: C.cyan }} /> Study pattern</span>} />
          {studyPattern.totalMin === 0 ? (
            <div className="text-center py-6 text-[13px]" style={{ color: C.muted }}>
              Start the study timer to see your pattern analysis.
            </div>
          ) : (
            <>
              <div className="flex gap-4 text-[12px] mb-3" style={{ color: C.muted }}>
                <span>Peak day: <strong style={{ color: 'var(--text)' }}>{studyPattern.peakDay}</strong></span>
                <span>Peak hour: <strong style={{ color: 'var(--text)' }}>{studyPattern.peakHour}:00</strong></span>
                <span>Total: <strong style={{ color: 'var(--text)' }}>{Math.round(studyPattern.totalMin / 60)}h</strong></span>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-3">
                {studyPattern.dayData.map(d => {
                  const maxMin = Math.max(...studyPattern.dayData.map(x => x.min), 1);
                  const pct = d.min / maxMin;
                  return (
                    <div key={d.day} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>{d.day}</div>
                      <div style={{
                        height: 50, borderRadius: 4, background: C.surface, position: 'relative', overflow: 'hidden',
                      }}>
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          height: `${Math.max(5, pct * 100)}%`, borderRadius: 4,
                          background: `rgba(34,211,238,${0.2 + pct * 0.6})`,
                          transition: 'height 0.3s',
                        }} />
                      </div>
                      <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{d.min}m</div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-6 gap-1">
                {studyPattern.hourData.filter((_, i) => i % 4 === 0).map(d => {
                  const maxMin = Math.max(...studyPattern.hourData.map(x => x.min), 1);
                  const pct = d.min / maxMin;
                  return (
                    <div key={d.hour} style={{ textAlign: 'center' }}>
                      <div style={{
                        height: 30, borderRadius: 3, background: C.surface, position: 'relative', overflow: 'hidden',
                      }}>
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          height: `${Math.max(5, pct * 100)}%`, borderRadius: 3,
                          background: `rgba(34,211,238,${0.2 + pct * 0.6})`,
                        }} />
                      </div>
                      <div style={{ fontSize: 8, color: C.muted, marginTop: 1 }}>{d.hour}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} style={{ color: C.orange }} /> Subject health matrix</span>} />
          {subjectHealth.length === 0 ? (
            <div className="text-[13px] py-4" style={{ color: C.muted }}>No subjects added.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {subjectHealth.map(s => (
                <div key={s.name} style={{
                  padding: '10px 12px', borderRadius: 10,
                  background: s.health === 'good' ? 'rgba(74,222,128,0.06)' : s.health === 'ok' ? C.surface : 'rgba(248,113,113,0.06)',
                }}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: s.health === 'good' ? C.green : s.health === 'ok' ? C.orange : C.red, fontWeight: 700 }}>
                      {s.pct}% syllabus
                    </span>
                  </div>
                  <Meter pct={s.pct} color={s.health === 'good' ? C.green : s.health === 'ok' ? C.orange : C.red} />
                  <div className="flex gap-3 text-[11px] mt-1.5" style={{ color: C.muted }}>
                    {s.pyqAcc != null && <span>PYQ accuracy: <strong style={{ color: s.pyqAcc >= 60 ? C.green : C.orange }}>{s.pyqAcc}%</strong></span>}
                    <span>PYQ sessions: <strong style={{ color: 'var(--text)' }}>{s.pyqSessions}</strong></span>
                    <span>Revisions: <strong style={{ color: 'var(--text)' }}>{s.revCount}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Revision effectiveness ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Brain size={14} style={{ color: C.purple }} /> Revision effectiveness</span>} />
          {revisionEffectiveness.length === 0 ? (
            <div className="text-center py-6 text-[13px]" style={{ color: C.muted }}>
              Log revisions with PYQ sessions on the same topic to measure effectiveness.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {freshAvg != null && staleAvg != null && (
                <div className="flex gap-4 text-[12px] mb-2" style={{ color: C.muted }}>
                  <span>Fresh topics: <strong style={{ color: C.green }}>{freshAvg}%</strong></span>
                  <span>Stale topics: <strong style={{ color: C.red }}>{staleAvg}%</strong></span>
                  <span>Delta: <strong style={{ color: freshAvg > staleAvg ? C.green : C.red }}>{freshAvg - staleAvg > 0 ? '+' : ''}{freshAvg - staleAvg}%</strong></span>
                </div>
              )}
              {revisionEffectiveness.slice(0, 5).map(r => (
                <div key={r.topic} style={{ padding: '8px 10px', borderRadius: 8, background: C.surface }}>
                  <div className="flex justify-between text-[12px]">
                    <span style={{ color: 'var(--text)' }}>{r.topic}</span>
                    <span style={{ color: r.isFresh ? C.green : C.muted, fontWeight: 600 }}>{r.acc}%</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                    {r.isFresh ? `Revised ${r.intervalDays}d cycle` : 'Overdue for revision'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} style={{ color: C.pink }} /> Recommendations</span>} />
          <div className="flex flex-col gap-2 text-[13px]">
            {recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: r.bg }}>
                <span style={{ color: r.color, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
                <span style={{ color: 'var(--text)' }}>{r.text}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
