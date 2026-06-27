'use client';
import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { BarChart3, TrendingUp, AlertTriangle, Zap, Clock, Award, Target, Brain } from 'lucide-react';
import { PageHeader, Card, CardHeader, MetricCard, Meter } from '@/components/ui';
import { getPct } from '@/lib/utils';
import { useExamConfig } from '@/lib/useExamConfig';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';

const C = {
  cyan: '#22D3EE',
  green: '#4ADE80',
  orange: '#FB923C',
  red: '#F87171',
  purple: '#A78BFA',
  pink: '#F472B6',
  muted: '#7C8089',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.12)',
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

export default function InsightsPage() {
  const { data, examType } = useApp();
  const { config: cfg } = useExamConfig(examType);

  const subjects = data.subjects || [];
  const scores = data.dailyScores || [];
  const sessions = data.studySessions || [];
  const pyqData = data.pyqData || [];
  const revisions = data.revisions || [];

  // ── Derived metrics ──
  const weekSecs = useMemo(() => {
    const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
    return sessions.filter(s => new Date(s.start) >= monday).reduce((a, s) => a + (s.durationSec || 0), 0);
  }, [sessions]);
  const totalSecs = useMemo(() => sessions.reduce((a, s) => a + (s.durationSec || 0), 0), [sessions]);
  const totalHours = Math.round(totalSecs / 36) / 100;
  const weekHours = Math.round(weekSecs / 36) / 100;
  const avgAccuracy = useMemo(() => {
    const all = scores.filter(s => s.accuracy != null);
    return all.length ? Math.round(all.reduce((a, s) => a + s.accuracy!, 0) / all.length) : 0;
  }, [scores]);
  const avgSubPct = subjects.length ? Math.round(subjects.reduce((a, s) => a + getPct(s), 0) / subjects.length) : 0;

  // ── Weak areas ──
  const weakSubjects = useMemo(() => {
    return subjects.map(s => ({
      name: s.name, pctVal: getPct(s),
      pyqAccuracy: (() => {
        const chs = pyqData.filter(p => p.key.startsWith(s.name + '::'));
        const all = chs.flatMap(c => c.sessions.map(se => se.accuracy));
        return all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null;
      })(),
    })).filter(s => s.pctVal < 60 || (s.pyqAccuracy != null && s.pyqAccuracy < 50))
      .sort((a, b) => a.pctVal - b.pctVal);
  }, [subjects, pyqData]);

  // ── Readiness score ──
  const readinessScore = useMemo(() => {
    const syllabusFactor = avgSubPct / 100;
    const accuracyFactor = avgAccuracy / 100;
    function parseLocalDate(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
    const overdueRevs = revisions.filter(r => {
      const next = parseLocalDate(r.lastRevised); next.setDate(next.getDate() + r.intervalDays); return next <= new Date();
    }).length;
    const revFactor = revisions.length ? (revisions.length - overdueRevs) / revisions.length : 0.5;
    return Math.round((syllabusFactor * 0.35 + accuracyFactor * 0.4 + revFactor * 0.25) * 100);
  }, [avgSubPct, avgAccuracy, revisions]);

  // ── Weekly study hours (last 8 weeks) ──
  const weeklyChart = useMemo(() => {
    const weeks: { label: string; hours: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const end = new Date(); end.setDate(end.getDate() - (end.getDay() + 6) % 7 - w * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
      const secs = sessions.filter(s => {
        const t = new Date(s.start).getTime(); return t >= start.getTime() && t <= end.getTime();
      }).reduce((a, s) => a + (s.durationSec || 0), 0);
      weeks.push({
        label: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        hours: Math.round(secs / 36) / 100,
      });
    }
    return weeks;
  }, [sessions]);

  // ── Score progression ──
  const scoreChart = useMemo(() => {
    return scores.slice(-20).map(s => ({
      date: new Date(s.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      score: s.score,
      accuracy: s.accuracy,
    }));
  }, [scores]);

  // ── Accuracy trend ──
  const accuracyTrend = useMemo(() => {
    if (scoreChart.length < 4) return scoreChart.map(s => ({ date: s.date, accuracy: s.accuracy }));
    const chunk = Math.max(1, Math.floor(scoreChart.length / 4));
    const grouped: { date: string; accuracy: number }[] = [];
    for (let i = 0; i < scoreChart.length; i += chunk) {
      const slice = scoreChart.slice(i, i + chunk);
      const avg = Math.round(slice.reduce((a, s) => a + (s.accuracy || 0), 0) / slice.length);
      grouped.push({ date: slice[0].date, accuracy: avg });
    }
    return grouped;
  }, [scoreChart]);

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

  function readinessColor(s: number): string {
    return s >= 70 ? C.green : s >= 45 ? C.orange : C.red;
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <PageHeader title="Insights" sub={`Analytics overview for ${cfg.label}`} />
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
          background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)', color: '#FB923C',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>Beta</span>
      </div>

      {/* ── Exam Readiness Score ── */}
      <div style={{ marginBottom: 14 }}><Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '6px 0' }}>
          <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
            <svg width="90" height="90" viewBox="0 0 90 90">
              <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle cx="45" cy="45" r="38" fill="none" stroke={readinessColor(readinessScore)} strokeWidth="6"
                strokeLinecap="round" strokeDasharray={238.8}
                strokeDashoffset={238.8 - (readinessScore / 100) * 238.8}
                transform="rotate(-90 45 45)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: readinessColor(readinessScore), lineHeight: 1 }}>{readinessScore}</span>
              <span style={{ fontSize: 9, color: C.muted }}>/100</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Exam Readiness</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
              Composite of syllabus coverage, accuracy, and revision freshness
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Syllabus', pct: avgSubPct, color: C.cyan },
                { label: 'Accuracy', pct: avgAccuracy, color: C.green },
                { label: 'Revisions', pct: revisions.length ? Math.round((revisions.filter(r => {
                  const [yr, mr, dr] = r.lastRevised.split('-').map(Number); const next = new Date(yr, mr - 1, dr); next.setDate(next.getDate() + r.intervalDays); return next > new Date();
                }).length / revisions.length) * 100) : 50, color: C.purple },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: m.color }}>{m.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card></div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <MetricCard label="Syllabus done" value={<>{avgSubPct}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>%</sup></>} sub="Across all subjects" />
        <MetricCard label="Avg accuracy" value={<>{avgAccuracy}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>%</sup></>} sub={scores.length ? `From ${scores.length} scores` : 'No scores'} />
        <MetricCard label="Total study" value={<>{totalHours}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>h</sup></>} sub="All time" />
        <MetricCard label="This week" value={<>{weekHours}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>h</sup></>} sub={`Target ${data.weeklyTarget || 12}h`} />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">

        {/* Weekly study hours bar chart */}
        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} style={{ color: C.cyan }} /> Weekly study hours</span>} />
          {weeklyChart.every(d => d.hours === 0) ? (
            <div className="text-center py-6 text-[13px]" style={{ color: C.muted }}>
              No study sessions logged yet. Start the timer to see your weekly trend.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyChart} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: C.muted }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip content={chartTooltip} cursor={{ fill: C.surface }} />
                <Bar dataKey="hours" name="Hours" radius={[5, 5, 0, 0]} fill={`url(#hoursGrad)`} maxBarSize={28} />
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.cyan} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={C.cyan} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Score progression area chart */}
        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14} style={{ color: C.green }} /> Score progression</span>} />
          {scoreChart.length < 2 ? (
            <div className="text-center py-6 text-[13px]" style={{ color: C.muted }}>
              Log at least 2 test scores to see your progression trend.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={scoreChart} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.green} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.green} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.muted }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={chartTooltip} />
                <Area type="monotone" dataKey="score" name="Score" stroke={C.green} strokeWidth={2} fill="url(#scoreGrad)" dot={{ r: 3, fill: C.green, stroke: 'none' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Weak areas + Subject completion ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} style={{ color: C.orange }} /> Weak areas</span>} />
          {weakSubjects.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-[13px]" style={{ color: C.muted }}>
              <Award size={32} strokeWidth={1.5} style={{ color: C.green }} />
              No weak spots detected — you're on track!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {weakSubjects.map(s => (
                <div key={s.name} style={{ padding: '10px 12px', borderRadius: 10, background: C.surface }}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span style={{ color: 'var(--text)' }}>{s.name}</span>
                    <span style={{ color: s.pctVal < 40 ? C.red : C.orange, fontWeight: 700 }}>{s.pctVal}%</span>
                  </div>
                  <Meter pct={s.pctVal} color={s.pctVal < 40 ? C.red : C.orange} />
                  {s.pyqAccuracy != null && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                      PYQ accuracy: <span style={{ color: s.pyqAccuracy < 40 ? C.red : C.orange, fontWeight: 600 }}>{s.pyqAccuracy}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} style={{ color: C.cyan }} /> Subject completion</span>} />
          <div className="flex flex-col gap-2.5">
            {subjects.length === 0 ? (
              <div className="text-[13px] py-4" style={{ color: C.muted }}>No subjects added yet.</div>
            ) : (
              subjects.map(s => {
                const pct = getPct(s);
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span style={{ color: 'var(--text)' }}>{s.name}</span>
                      <span style={{ color: pct >= 80 ? C.green : pct >= 50 ? C.orange : C.red, fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <Meter pct={pct} color={pct >= 80 ? C.green : pct >= 50 ? C.orange : C.red} />
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* ── Study breakdown + Recommendations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Brain size={14} style={{ color: C.purple }} /> Study breakdown</span>} />
          <div className="flex flex-col gap-2.5 text-[13px]">
            <div className="flex justify-between"><span style={{ color: C.muted }}>Total sessions</span><strong style={{ color: 'var(--text)' }}>{sessions.length}</strong></div>
            <div className="flex justify-between"><span style={{ color: C.muted }}>Test scores logged</span><strong style={{ color: 'var(--text)' }}>{scores.length}</strong></div>
            <div className="flex justify-between"><span style={{ color: C.muted }}>PYQ chapters</span><strong style={{ color: 'var(--text)' }}>{pyqData.length}</strong></div>
            <div className="flex justify-between"><span style={{ color: C.muted }}>PYQ sessions</span><strong style={{ color: 'var(--text)' }}>{pyqData.reduce((a, p) => a + p.sessions.length, 0)}</strong></div>
            <div className="flex justify-between"><span style={{ color: C.muted }}>Revisions logged</span><strong style={{ color: 'var(--text)' }}>{revisions.length}</strong></div>
            <div className="flex justify-between"><span style={{ color: C.muted }}>Weekly target</span><strong style={{ color: 'var(--text)' }}>{data.weeklyTarget || 12}h</strong></div>
          </div>
        </Card>

        <Card>
          <CardHeader title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} style={{ color: C.pink }} /> Recommendations</span>} />
          <div className="flex flex-col gap-2 text-[13px]">
            {weekHours < (data.weeklyTarget || 12) && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: 'rgba(251,146,60,0.08)' }}>
                <span style={{ color: C.orange, flexShrink: 0, marginTop: 1 }}><Zap size={14} /></span>
                <span style={{ color: 'var(--text)' }}>You're behind your weekly study target. Try adding more study sessions.</span>
              </div>
            )}
            {weakSubjects.length > 0 && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)' }}>
                <span style={{ color: C.red, flexShrink: 0, marginTop: 1 }}><AlertTriangle size={14} /></span>
                <span style={{ color: 'var(--text)' }}>Focus on <strong>{weakSubjects[0].name}</strong> — your weakest subject ({weakSubjects[0].pctVal}% done).</span>
              </div>
            )}
            {avgAccuracy > 0 && avgAccuracy < 60 && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)' }}>
                <span style={{ color: C.red, flexShrink: 0, marginTop: 1 }}><TrendingUp size={14} /></span>
                <span style={{ color: 'var(--text)' }}>Your accuracy is {avgAccuracy}% — revise fundamentals and practice more PYQs.</span>
              </div>
            )}
            {avgSubPct >= 80 && weekHours >= (data.weeklyTarget || 12) && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: 'rgba(74,222,128,0.08)' }}>
                <span style={{ color: C.green, flexShrink: 0, marginTop: 1 }}><Award size={14} /></span>
                <span style={{ color: 'var(--text)' }}>Great pace! Keep up the consistency.</span>
              </div>
            )}
            {(weekHours === 0 && sessions.length === 0) && (
              <div className="text-center py-4" style={{ color: C.muted }}>
                Start logging study sessions and scores to see personalized recommendations.
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
