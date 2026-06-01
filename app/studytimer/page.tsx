'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader, Card, CardHeader, Empty, showToast } from '@/components/ui';
import { formatSeconds } from '@/lib/utils';
import { StudySession } from '@/lib/types';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  ReferenceLine, Cell,
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
  const dailyTarget = 6;

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
      pausedAt, paused, running, ...extra,
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

  // Chart data
  const sessions = data.studySessions || [];
  const last30: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last30[d.toISOString().split('T')[0]] = 0;
  }
  sessions.forEach(s => {
    const day = s.start?.split('T')[0];
    if (day && last30[day] !== undefined) last30[day] += s.durationSec / 3600;
  });
  const chartData = Object.entries(last30).map(([date, hours]) => ({
    date: date.slice(5),
    hours: Math.round(hours * 10) / 10,
  }));

  // All-time stats
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

  const statusText = !running ? 'Session stopped — start a new one anytime'
    : paused ? '⏸ Session paused' : '● Recording session';
  const statusColor = !running ? 'var(--muted)' : paused ? '#D97706' : '#16A34A';
  const fmt = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <>
      <PageHeader title="Study Timer" sub={new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })} />

      {/* Timer card */}
      <Card className="text-center mb-4">
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 'clamp(40px, 12vw, 80px)',
          fontWeight: 700, lineHeight: 1,
          margin: '16px 0', letterSpacing: 4,
          color: running && !paused ? '#16A34A' : paused ? '#D97706' : 'var(--text)',
          wordBreak: 'break-all'
        }}>
          {formatSeconds(elapsed)}
        </div>
        <div style={{
          fontSize: 13, marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          color: statusColor
        }}>
          {running && !paused && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'inline-block', animation: 'pulse 1s infinite' }} />
          )}
          {statusText}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {(!running || paused) && (
            <button onClick={handleStart} style={{
              background: '#16A34A', color: '#fff', border: 'none',
              padding: '12px 28px', borderRadius: 8, fontWeight: 700,
              fontSize: 15, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
            }}>▶ {paused ? 'Resume' : 'Start'}</button>
          )}
          {running && !paused && (
            <button onClick={handlePause} style={{
              background: '#D97706', color: '#fff', border: 'none',
              padding: '12px 28px', borderRadius: 8, fontWeight: 700,
              fontSize: 15, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
            }}>⏸ Pause</button>
          )}
          {running && (
            <button onClick={handleStop} style={{
              background: '#DB2777', color: '#fff', border: 'none',
              padding: '12px 28px', borderRadius: 8, fontWeight: 700,
              fontSize: 15, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
            }}>■ End session</button>
          )}
        </div>
      </Card>

      {/* Today's sessions + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
              Today's sessions ({todaySessions.length})
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{todayKey}</span>
          </div>

          {todaySessions.length === 0 && <Empty>No sessions today. Start the timer!</Empty>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {todaySessions.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: 'var(--surface2)', flexWrap: 'wrap'
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: '#2563EB', color: '#fff',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>{i + 1}</div>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)', minWidth: 0 }}>
                  {fmt(new Date(s.start))} → {s.end ? fmt(new Date(s.end)) : '—'}
                </span>
                <span style={{ fontWeight: 700, color: '#2563EB', fontSize: 13 }}>
                  {formatSeconds(s.durationSec)}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: hoursToday >= dailyTarget ? '#DCFCE7' : hoursToday >= 3 ? '#FEF3C7' : '#FEE2E2',
            color: hoursToday >= dailyTarget ? '#16A34A' : hoursToday >= 3 ? '#D97706' : '#DC2626',
          }}>
            {hoursToday >= dailyTarget ? '✅' : hoursToday >= 3 ? '⚠' : '✕'}
            {' '}{hoursToday}h today — target is {dailyTarget}h
            {hoursToday >= dailyTarget ? ' · target met!' : ' · keep going!'}
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
              Daily study hours
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v}h`, 'Hours']} />
              <ReferenceLine y={dailyTarget} stroke="#16A34A" strokeDasharray="4 3" />
              <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.hours >= dailyTarget ? '#16A34A' : entry.hours >= 3 ? '#D97706' : '#DC2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, justifyContent: 'center', flexWrap: 'wrap', color: 'var(--muted)' }}>
            <span>🟢 ≥6h</span>
            <span>🟡 3–6h</span>
            <span>🔴 &lt;3h</span>
          </div>
        </Card>
      </div>

      {/* All-time stats — responsive grid */}
      <Card>
        <CardHeader title="All-time study stats" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
          {[
            { label: 'Total days', val: totalDays, color: 'var(--text)' },
            { label: 'Total hours', val: `${totalHours}h`, color: 'var(--text)' },
            { label: 'Daily avg', val: `${dailyAvg}h`, color: 'var(--text)' },
            { label: 'Best day', val: `${bestDay}h`, color: '#16A34A' },
            { label: `≥${dailyTarget}h days`, val: targetDays, color: '#2563EB' },
            { label: 'Below target', val: belowTarget, color: '#DC2626' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              padding: '12px 8px', borderRadius: 8,
              background: 'var(--surface2)', textAlign: 'center'
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}