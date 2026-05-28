'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MetricCard, PageHeader, Card, CardHeader, Empty, ProgressBar } from '@/components/ui';
import { computeStreak, getDateLabel, getPct, getPrediction, today } from '@/lib/utils';
import { ScoreModal } from '@/components/modals/ScoreModal';
import { MockModal } from '@/components/modals/ScoreModal';
import { SUB_COLORS, EXAM_CONFIG } from '@/lib/constants';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid
} from 'recharts';

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 18, radius = 6 }: { w?: string | number; h?: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'var(--surface2)',
      animation: 'pulse 1.6s ease-in-out infinite',
    }} />
  );
}

// ── Exam countdown ────────────────────────────────────────────
function ExamCountdown({ examType }: { examType: 'GATE' | 'NET' }) {
  const examDate = examType === 'GATE' ? new Date('2027-02-01') : new Date('2026-06-15');
  const days = Math.max(0, Math.ceil((examDate.getTime() - Date.now()) / 86400000));
  const weeks = Math.floor(days / 7);
  const cfg = EXAM_CONFIG[examType];
  const urgency = days < 30 ? '#DC2626' : days < 90 ? '#D97706' : cfg.color;
  const urgencyBg = days < 30 ? '#FEE2E2' : days < 90 ? '#FEF3C7' : cfg.colorLight;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10, background: urgencyBg,
      borderRadius: 'var(--radius-sm)', padding: '10px 16px',
      marginBottom: 14, border: `1px solid ${urgency}33`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{cfg.emoji}</span>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: urgency }}>
            {cfg.label} {examType === 'GATE' ? '2027' : '2026'}
          </span>
          <span style={{ fontSize: '11px', color: urgency, marginLeft: 8, opacity: 0.75 }}>
            {examDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        {[{ val: days, lbl: 'DAYS' }, { val: weeks, lbl: 'WEEKS' }].map(({ val, lbl }) => (
          <div key={lbl} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: urgency, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: '10px', color: urgency, opacity: 0.7, fontWeight: 600 }}>{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quick actions ─────────────────────────────────────────────
function QuickActions({ onScore, onMock }: { onScore: () => void; onMock: () => void }) {
  const actions = [
    { label: '📝 Log Score', onClick: onScore, primary: true },
    { label: '📊 Mock Test', onClick: onMock, primary: false },
    { label: '🎯 Add Goal', href: '/goals' },
    { label: '⏱ Study Timer', href: '/studytimer' },
    { label: '📂 Log PYQ', href: '/pyq' },
    { label: '🔁 Revision', href: '/revision' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {actions.map(a => 'href' in a ? (
        <a key={a.label} href={a.href} className="btn btn-sm">{a.label}</a>
      ) : (
        <button key={a.label} onClick={a.onClick}
          className={a.primary ? 'btn btn-primary btn-sm' : 'btn btn-sm'}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ── Weekly target bar ─────────────────────────────────────────
function WeeklyTargetBar({ studied, target }: { studied: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((studied / target) * 100)) : 0;
  const color = pct >= 100 ? '#16A34A' : pct >= 60 ? '#2563EB' : '#D97706';
  const h = Math.floor(studied / 3600);
  const m = Math.floor((studied % 3600) / 60);
  const targetH = Math.round(target / 3600);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{h}h {m}m studied</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>target: {targetH}h/week</span>
      </div>
      <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
      </div>
      <div style={{ fontSize: '11px', color, fontWeight: 600, marginTop: 4 }}>
        {pct >= 100 ? '🎉 Weekly target reached!' : `${pct}% of weekly target`}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, loading, examType } = useApp();
  const [showScore, setShowScore] = useState(false);
  const [showMock, setShowMock] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const goals = data.goals || [];
  const done = goals.filter(g => g.done).length;
  const todayKey = today();
  const todayScore = (data.dailyScores || []).find(s => s.date === todayKey);

  // ✅ Streak fix: uses today() helper — same format as stored dates
  const streak = computeStreak(data.dailyScores || []);

  const pred = getPrediction(data, examType);
  const pyqData = data.pyqData || [];
  const pyqDone = pyqData.filter(d => {
    if (!d.sessions?.length) return false;
    return d.sessions.reduce((a, s) => a + s.attempted, 0) >= d.total;
  }).length;

  const revDue = (data.revisions || []).filter(r => {
    const next = new Date(r.lastRevised);
    next.setDate(next.getDate() + r.intervalDays);
    return next <= new Date();
  }).length;

  // Study hours this week (Mon–Sun)
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weekSessions = (data.studySessions || []).filter(s => new Date(s.start) >= monday);
  const weekStudiedSecs = weekSessions.reduce((a, s) => a + (s.durationSec || 0), 0);
  const todaySessions = (data.studySessions || []).filter(s => s.start?.startsWith(todayKey));
  const todayStudiedSecs = todaySessions.reduce((a, s) => a + (s.durationSec || 0), 0);
  const todayH = Math.floor(todayStudiedSecs / 3600);
  const todayM = Math.floor((todayStudiedSecs % 3600) / 60);
  const weeklyTargetSecs = (data.weeklyTarget || 12) * 3600;

  // Charts
  const weekData = (data.dailyScores || []).slice(-7).map(s => ({
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(s.date + 'T00:00:00').getDay()],
    score: s.score,
  }));
  const trendData = (data.dailyScores || []).slice(-30).map(s => ({
    date: s.date.slice(5), score: s.score, acc: s.accuracy,
  }));
  const subjects = (data.subjects || []).slice(0, 6);

  // Loading skeleton
  if (!mounted || loading) {
    return (
      <>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton w={160} h={28} /><Skeleton w={220} h={14} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton w={100} h={34} radius={8} /><Skeleton w={110} h={34} radius={8} />
          </div>
        </div>
        <Skeleton w="100%" h={52} radius={8} />
        <div style={{ height: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10, marginBottom: 20 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="metric" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton w="60%" h={11} /><Skeleton w="40%" h={28} /><Skeleton w="80%" h={11} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 200 }}><Skeleton w="40%" h={13} /></div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 220 }}><Skeleton w="40%" h={13} /></div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Header */}
      <PageHeader title="Dashboard" sub={getDateLabel()}>
        <button className="btn" onClick={() => setShowMock(true)}>+ Mock test</button>
        <button className="btn btn-primary" onClick={() => setShowScore(true)}>Log today ↗</button>
      </PageHeader>

      {/* Exam countdown */}
      <ExamCountdown examType={examType as 'GATE' | 'NET'} />

      {/* Quick actions */}
      <QuickActions onScore={() => setShowScore(true)} onMock={() => setShowMock(true)} />

      {/* 7 Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-6">
        <MetricCard
          label="Today's score"
          value={<>{todayScore?.score ?? '—'}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>%</sup></>}
          sub={todayScore ? (todayScore.score >= 60 ? '▲ Good progress' : '▼ Needs effort') : 'Not logged yet'}
          subColor={todayScore ? (todayScore.score >= 60 ? 'up' : 'down') : 'muted'}
        />
        <MetricCard
          label="Goals done"
          value={<>{done}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>/{goals.length}</sup></>}
          sub={goals.length - done > 0 ? `${goals.length - done} remaining` : '✅ All done!'}
          subColor={goals.length - done === 0 ? 'up' : 'muted'}
        />
        <MetricCard
          label="PYQs solved"
          value={<>{pyqDone}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}> sets</sup></>}
          sub={`${pyqData.length} chapters tracked`}
        />
        <MetricCard
          label="Revision due"
          value={<span style={{ color: revDue > 0 ? 'var(--danger)' : 'var(--success)' }}>{revDue}</span>}
          sub={revDue > 0 ? 'Topics need review' : 'All caught up!'}
          subColor={revDue > 0 ? 'down' : 'up'}
        />
        <MetricCard
          label="Study streak"
          value={<>{streak}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}> days</sup></>}
          sub={streak > 0 ? '🔥 Keep going!' : 'Log today to start'}
          subColor={streak > 0 ? 'up' : 'muted'}
        />
        <MetricCard
          label="Today's study"
          value={<>{todayH}h {todayM}m</>}
          sub={todayStudiedSecs > 0 ? '⏱ Active today' : 'Start the timer'}
          subColor={todayStudiedSecs > 0 ? 'up' : 'muted'}
        />
        <MetricCard
          label="Predicted score"
          value={pred.noData ? '—' : <>{pred.score}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>/100</sup></>}
          sub={pred.noData ? 'Log 5+ scores' : `▲ ${pred.percentile}th percentile`}
          subColor={pred.noData ? 'muted' : 'up'}
        />
      </div>

      {/* Weekly target + Goals + Subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">

        {/* Weekly study target */}
        <Card>
          <CardHeader title="Weekly study target">
            <a href="/studytimer" className="btn btn-sm">Timer →</a>
          </CardHeader>
          <WeeklyTargetBar studied={weekStudiedSecs} target={weeklyTargetSecs} />
          <div style={{ marginTop: 14 }}>
            <div style={{
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 8
            }}>Recent sessions</div>
            {weekSessions.length === 0
              ? <Empty>No study sessions this week</Empty>
              : weekSessions.slice(-4).reverse().map((s, i) => {
                const d = Math.floor(s.durationSec / 3600);
                const m = Math.floor((s.durationSec % 3600) / 60);
                const dateStr = new Date(s.start).toLocaleDateString('en-IN', {
                  weekday: 'short', day: 'numeric', month: 'short'
                });
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '12px', padding: '5px 0',
                    borderBottom: i < 3 ? '1px solid var(--border)' : 'none'
                  }}>
                    <span style={{ color: 'var(--muted)' }}>{dateStr}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{d}h {m}m</span>
                  </div>
                );
              })
            }
          </div>
        </Card>

        {/* Goals preview */}
        <Card>
          <CardHeader title="Today's goals">
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{done}/{goals.length} done</span>
          </CardHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
            {goals.length === 0 && <Empty>No goals yet. Add some!</Empty>}
            {goals.slice(0, 8).map(g => (
              <div key={g.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--surface)',
                opacity: g.done ? 0.55 : 1,
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#fff',
                  background: g.done ? 'var(--green)' : 'transparent',
                  border: g.done ? 'none' : '1.5px solid var(--border)',
                }}>{g.done ? '✓' : ''}</div>
                <span style={{
                  fontSize: '12px', flex: 1,
                  color: g.done ? 'var(--muted)' : 'var(--text)',
                  textDecoration: g.done ? 'line-through' : 'none',
                }}>{g.text}</span>
                <span className={`tag tag-${g.tag}`}>{g.tag}</span>
              </div>
            ))}
            {goals.length > 8 && (
              <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>
                +{goals.length - 8} more
              </div>
            )}
          </div>
          <a href="/goals" className="btn btn-sm mt-2.5 w-full justify-center">View all goals →</a>
        </Card>

        {/* Subject progress */}
        <Card>
          <CardHeader title="Subject progress">
            <a href="/subjects" className="btn btn-sm">Edit →</a>
          </CardHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {subjects.length === 0 && <Empty>No subjects yet.</Empty>}
            {subjects.map((s, i) => {
              const pct = getPct(s);
              return (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 500, width: 120, flexShrink: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: 'var(--text)',
                  }}>{s.name}</span>
                  <ProgressBar pct={pct} color={SUB_COLORS[i % SUB_COLORS.length]} />
                  <span style={{
                    fontSize: '11px', fontWeight: 700, width: 32, textAlign: 'right',
                    color: SUB_COLORS[i % SUB_COLORS.length],
                  }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <Card>
          <CardHeader title="This week's scores" />
          {weekData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weekData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="score" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty>No scores yet this week.</Empty>}
        </Card>

        <Card>
          <CardHeader title="30-day trend">
            <div style={{ display: 'flex', gap: 12, fontSize: '10px', color: 'var(--muted)' }}>
              <span style={{ color: '#2563EB' }}>— Score</span>
              <span style={{ color: '#7C3AED' }}>- - Accuracy</span>
            </div>
          </CardHeader>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="acc" stroke="#7C3AED" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty>Log scores to see your trend.</Empty>}
        </Card>
      </div>

      {/* Revision overdue warning */}
      {revDue > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#FEE2E2', border: '1px solid #FECACA',
          borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 12,
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#DC2626' }}>
            ⚠️ {revDue} revision{revDue > 1 ? 's' : ''} overdue
          </span>
          <a href="/revision" className="btn btn-sm" style={{ borderColor: '#DC2626', color: '#DC2626' }}>
            Review now →
          </a>
        </div>
      )}

      <ScoreModal open={showScore} onClose={() => setShowScore(false)} />
      <MockModal open={showMock} onClose={() => setShowMock(false)} />
    </>
  );
}