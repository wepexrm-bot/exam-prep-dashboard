'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, CardHeader, Empty, showToast } from '@/components/ui';
import { formatSeconds } from '@/lib/utils';
import { StudySession } from '@/lib/types';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  ReferenceLine, Cell, Legend,
} from 'recharts';

function today() { return new Date().toISOString().split('T')[0]; }

export default function StudyTimerPage() {
  const { data, addStudySession } = useApp();
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState(0);
  const startRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const todayKey = today();
  const todaySessions: StudySession[] = (data.studySessions || []).filter(
    s => s.start?.split('T')[0] === todayKey
  );
  const totalTodaySec = todaySessions.reduce((a, s) => a + s.durationSec, 0);
  const hoursToday = Math.round(totalTodaySec / 3600 * 10) / 10;
  const weeklyTarget = data.weeklyTarget || 12;
  const dailyTarget = 6; // hours

  // Restore on mount
  useEffect(() => {
    const raw = localStorage.getItem('gate_timer_v2');
    if (!raw) return;
    try {
      const ts = JSON.parse(raw);
      if (!ts.startedAt || ts.startedAt.split('T')[0] !== todayKey) return;
      startRef.current = new Date(ts.startedAt);
      if (ts.paused) {
        setRunning(true); setPaused(true);
        setPausedAt(ts.pausedAt); setElapsed(ts.pausedAt);
      } else {
        const recovered = ts.pausedAt + Math.floor((Date.now() - new Date(ts.startedAt).getTime()) / 1000);
        setPausedAt(ts.pausedAt); setElapsed(recovered);
        setRunning(true); setPaused(false);
      }
    } catch { localStorage.removeItem('gate_timer_v2'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (running && !paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const base = pausedAt;
      const startTime = startRef.current!.getTime();
      intervalRef.current = setInterval(() => {
        setElapsed(base + Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, paused, pausedAt]);

  function saveState(extra: object) {
    localStorage.setItem('gate_timer_v2', JSON.stringify({
      startedAt: startRef.current?.toISOString(),
      pausedAt,
      paused,
      running,
      ...extra,
    }));
  }

  function handleStart() {
    if (running && !paused) return;
    if (paused) {
      startRef.current = new Date();
      setPaused(false);
      saveState({ paused: false, startedAt: new Date().toISOString(), pausedAt });
      return;
    }
    startRef.current = new Date();
    setRunning(true); setPaused(false); setPausedAt(0); setElapsed(0);
    saveState({ running: true, paused: false, startedAt: startRef.current.toISOString(), pausedAt: 0 });
  }

  function handlePause() {
    if (!running || paused) return;
    const now = pausedAt + Math.floor((Date.now() - startRef.current!.getTime()) / 1000);
    setPausedAt(now); setElapsed(now); setPaused(true);
    saveState({ paused: true, pausedAt: now });
  }

  async function handleStop() {
    if (!running) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    const finalElapsed = paused
      ? pausedAt
      : pausedAt + Math.floor((Date.now() - startRef.current!.getTime()) / 1000);
    if (finalElapsed > 60) {
      const session: StudySession = {
        start: startRef.current!.toISOString(),
        end: new Date().toISOString(),
        durationSec: finalElapsed,
      };
      await addStudySession(session);
      showToast(`Session saved: ${formatSeconds(finalElapsed)} ✓`);
    }
    localStorage.removeItem('gate_timer_v2');
    setRunning(false); setPaused(false); setElapsed(0); setPausedAt(0);
    startRef.current = null;
  }

  // ── Chart data — last 30 days ─────────────────────────────
  const sessions = data.studySessions || [];
  const last30: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last30[d.toISOString().split('T')[0]] = 0;
  }
  sessions.forEach(s => {
    const day = s.start?.split('T')[0];
    if (day && last30[day] !== undefined) {
      last30[day] += s.durationSec / 3600;
    }
  });
  const chartData = Object.entries(last30).map(([date, hours]) => ({
    date: date.slice(5), // MM-DD
    hours: Math.round(hours * 10) / 10,
  }));

  // ── All-time stats ────────────────────────────────────────
  const dayTotals: Record<string, number> = {};
  sessions.forEach(s => {
    const day = s.start?.split('T')[0];
    if (day) dayTotals[day] = (dayTotals[day] || 0) + s.durationSec / 3600;
  });
  const allDays = Object.values(dayTotals);
  const totalDays = allDays.length;
  const totalHours = Math.round(allDays.reduce((a, v) => a + v, 0) * 10) / 10;
  const dailyAvg = totalDays ? Math.round(totalHours / totalDays * 10) / 10 : 0;
  const bestDay = allDays.length ? Math.round(Math.max(...allDays) * 10) / 10 : 0;
  const targetDays = allDays.filter(h => h >= dailyTarget).length;
  const belowTarget = allDays.filter(h => h < dailyTarget).length;

  // ── Status label ──────────────────────────────────────────
  const statusText = !running
    ? 'Session stopped — start a new one anytime'
    : paused
    ? '⏸ Session paused'
    : '● Recording session';
  const statusColor = !running ? 'var(--muted)' : paused ? '#D97706' : '#16A34A';

  const fmt = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <>
      <PageHeader title="Study Timer" sub={new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />

      {/* Timer card */}
      <Card className="text-center mb-4">
        <div className="font-mono text-[64px] md:text-[80px] font-bold leading-none my-4 tracking-[4px]"
          style={{ color: running && !paused ? '#16A34A' : paused ? '#D97706' : 'var(--text)' }}>
          {formatSeconds(elapsed)}
        </div>
        <div className="text-[13px] mb-6 flex items-center justify-center gap-1.5" style={{ color: statusColor }}>
          {running && !paused && <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />}
          {statusText}
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          {(!running || paused) && (
            <button onClick={handleStart}
              className="flex items-center gap-2 px-8 py-3 rounded-btn font-bold text-[15px] text-white transition-opacity hover:opacity-90"
              style={{ background: '#16A34A', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              ▶ {paused ? 'Resume' : 'Start'}
            </button>
          )}
          {running && !paused && (
            <button onClick={handlePause}
              className="flex items-center gap-2 px-8 py-3 rounded-btn font-bold text-[15px] text-white transition-opacity hover:opacity-90"
              style={{ background: '#D97706', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              ⏸ Pause
            </button>
          )}
          {running && (
            <button onClick={handleStop}
              className="flex items-center gap-2 px-8 py-3 rounded-btn font-bold text-[15px] text-white transition-opacity hover:opacity-90"
              style={{ background: '#DB2777', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              ■ End session
            </button>
          )}
        </div>
      </Card>

      {/* Today's sessions + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Today's sessions */}
        <Card>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Today's sessions ({todaySessions.length})
            </span>
            <span className="text-[12px]" style={{ color: 'var(--muted)' }}>{todayKey}</span>
          </div>

          {todaySessions.length === 0 && <Empty>No sessions today. Start the timer!</Empty>}

          <div className="flex flex-col gap-2 mb-3">
            {todaySessions.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-btn text-[13px]"
                style={{ background: 'var(--surface2)' }}>
                <div className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                <span className="flex-1 font-mono text-xs" style={{ color: 'var(--muted)' }}>
                  {fmt(new Date(s.start))} → {s.end ? fmt(new Date(s.end)) : '—'}
                </span>
                <span className="font-bold" style={{ color: '#2563EB' }}>{formatSeconds(s.durationSec)}</span>
                <button style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            ))}
          </div>

          {/* Today's progress bar */}
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-btn text-[13px] font-semibold ${
            hoursToday >= dailyTarget ? 'bg-success-light text-success' :
            hoursToday >= 3 ? 'bg-amber-light text-amber' : 'bg-danger-light text-danger'
          }`}>
            {hoursToday >= dailyTarget ? '✅' : hoursToday >= 3 ? '⚠' : '✕'}
            {' '}{hoursToday}h today — minimum is {dailyTarget}h
            {hoursToday >= dailyTarget ? ', target met!' : ', keep going!'}
          </div>
        </Card>

        {/* Daily study hours chart */}
        <Card>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Daily study hours</span>
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>Last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v}h`, 'Hours']} />
              <ReferenceLine y={dailyTarget} stroke="#16A34A" strokeDasharray="4 3" label={{ value: `${dailyTarget}h min`, position: 'right', fontSize: 10, fill: '#16A34A' }} />
              <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i}
                    fill={entry.hours >= dailyTarget ? '#16A34A' : entry.hours >= 3 ? '#D97706' : '#DC2626'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex gap-4 mt-1 text-[11px] justify-center flex-wrap" style={{ color: 'var(--muted)' }}>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-success" /> ≥6h (target met)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-amber" /> 3–6h</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-danger" /> &lt;3h</span>
          </div>
        </Card>
      </div>

      {/* All-time stats */}
      <Card>
        <CardHeader title="All-time study stats" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            ['Total days', totalDays, 'var(--text)'],
            ['Total hours', totalHours + 'h', 'var(--text)'],
            ['Daily avg', dailyAvg + 'h', 'var(--text)'],
            ['Best day', bestDay + 'h', '#16A34A'],
            [`Target days (≥${dailyTarget}h)`, targetDays, '#2563EB'],
            ['Below target', belowTarget, '#DC2626'],
          ].map(([label, val, color]) => (
            <div key={String(label)} className="px-4 py-3 rounded-btn text-center" style={{ background: 'var(--surface2)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>{label}</div>
              <div className="text-2xl font-bold" style={{ color: String(color) }}>{val}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}