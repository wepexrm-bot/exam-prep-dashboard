'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MetricCard, PageHeader, Card, CardHeader, Empty, showToast } from '@/components/ui';
import { computeStreak, getDateLabel, getPct, getPrediction } from '@/lib/utils';
import { ScoreModal } from '@/components/modals/ScoreModal';
import { MockModal } from '@/components/modals/ScoreModal';
import { ProgressBar } from '@/components/ui';
import { SUB_COLORS } from '@/lib/constants';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid
} from 'recharts';

export default function DashboardPage() {
  const { data } = useApp();
  const [showScore, setShowScore] = useState(false);
  const [showMock, setShowMock] = useState(false);

  const goals = data.goals || [];
  const done = goals.filter(g => g.done).length;
  const todayScore = data.dailyScores.find(s => s.date === new Date().toISOString().split('T')[0]);
  const streak = computeStreak(data.dailyScores);
  const pred = getPrediction(data);
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

  // Chart data
  const sc7 = (data.dailyScores || []).slice(-7);
  const weekData = sc7.map(s => ({
    day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(s.date + 'T00:00:00').getDay()],
    score: s.score,
  }));
  const sc30 = (data.dailyScores || []).slice(-30);
  const trendData = sc30.map(s => ({ date: s.date.slice(5), score: s.score, acc: s.accuracy }));

  const subjects = (data.subjects || []).slice(0, 6);

  return (
    <>
      <PageHeader title="Dashboard" sub={getDateLabel()}>
        <button className="btn" onClick={() => setShowMock(true)}>+ Mock test</button>
        <button className="btn btn-primary" onClick={() => setShowScore(true)}>Log today ↗</button>
      </PageHeader>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-6">
        <MetricCard
          label="Today's score"
          value={<>{todayScore?.score ?? '—'}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>%</sup></>}
          sub={todayScore ? (todayScore.score >= 60 ? '▲ Good progress' : '▼ Needs effort') : 'Not logged yet'}
          subColor={todayScore ? (todayScore.score >= 60 ? 'up' : 'down') : 'muted'}
        />
        <MetricCard label="Goals done" value={<>{done}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>/{goals.length}</sup></>} sub={`${goals.length - done} remaining`} />
        <MetricCard label="PYQs solved" value={<>{pyqDone}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}> sets</sup></>} sub={`${pyqData.length} chapters tracked`} />
        <MetricCard label="Revision due" value={<span style={{ color: revDue > 0 ? 'var(--danger)' : 'var(--success)' }}>{revDue}</span>} sub={revDue > 0 ? 'Topics need review' : 'All caught up!'} subColor={revDue > 0 ? 'down' : 'up'} />
        <MetricCard label="Study streak" value={<>{streak}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}> days</sup></>} sub="🔥 Keep going!" subColor="up" />
        <MetricCard
          label="Predicted score"
          value={pred.noData ? '—' : <>{pred.score}<sup className="text-sm font-normal" style={{ color: 'var(--muted)' }}>/100</sup></>}
          sub={pred.noData ? 'Log scores first' : `▲ ${pred.percentile}th percentile`}
        />
      </div>

      {/* Charts + goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* Today's goals preview */}
        <Card>
          <CardHeader title={`Today's goals`}>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{done}/{goals.length} done</span>
          </CardHeader>
          <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto">
            {goals.length === 0 && <Empty>No goals yet. Add some!</Empty>}
            {goals.slice(0, 8).map(g => (
              <div key={g.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-btn border transition-colors ${g.done ? 'opacity-60' : ''}`} style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className={`w-4.5 h-4.5 rounded flex items-center justify-center text-[10px] text-white flex-shrink-0 ${g.done ? 'bg-success-mid' : 'border'}`} style={!g.done ? { borderColor: 'var(--border)' } : {}}>
                  {g.done ? '✓' : ''}
                </div>
                <span className={`text-[13px] flex-1 ${g.done ? 'line-through' : ''}`} style={g.done ? { color: 'var(--muted)' } : { color: 'var(--text)' }}>{g.text}</span>
                <span className={`tag tag-${g.tag}`}>{g.tag}</span>
              </div>
            ))}
          </div>
          <a href="/goals" className="btn btn-sm mt-2.5 w-full justify-center">View all goals →</a>
        </Card>

        {/* Subject progress */}
        <Card>
          <CardHeader title="Subject progress">
            <a href="/subjects" className="btn btn-sm">Edit →</a>
          </CardHeader>
          <div className="flex flex-col gap-2">
            {subjects.map((s, i) => {
              const pct = getPct(s);
              return (
                <div key={s.name} className="flex items-center gap-2.5">
                  <span className="text-[12px] font-medium w-[130px] flex-shrink-0 truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
                  <ProgressBar pct={pct} color={SUB_COLORS[i % SUB_COLORS.length]} />
                  <span className="text-[12px] font-semibold w-9 text-right" style={{ color: SUB_COLORS[i % SUB_COLORS.length] }}>{pct}%</span>
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
          <CardHeader title="30-day trend" />
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

      <ScoreModal open={showScore} onClose={() => setShowScore(false)} />
      <MockModal open={showMock} onClose={() => setShowMock(false)} />
    </>
  );
}
