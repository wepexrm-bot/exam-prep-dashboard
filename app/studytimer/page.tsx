'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Play, Pause, Square, Clock, BarChart3, Trophy, PartyPopper } from 'lucide-react';
import { Empty, showToast } from '@/components/ui';
import { formatSeconds, dateKey } from '@/lib/utils';
import { StudySession } from '@/lib/types';

function today() { return dateKey(new Date()); }

const I = {
  play: <Play size={16} fill="currentColor" />,
  pause: <Pause size={16} />,
  stop: <Square size={14} />,
  clock: <Clock size={14} />,
  bars: <BarChart3 size={14} />,
  trophy: <Trophy size={14} />,
};

export default function StudyTimerPage() {
  const { data, addStudySession } = useApp();
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const startRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function saveOnUnload() {
      try {
        const raw = localStorage.getItem('gate_timer_v2');
        if (!raw) return;
        const ts = JSON.parse(raw);
        if (running && !paused && startRef.current) {
          const cur = pausedAt + Math.floor((Date.now() - startRef.current.getTime()) / 1000);
          localStorage.setItem('gate_timer_v2', JSON.stringify({ ...ts, elapsed: cur }));
        }
      } catch { /* ignore */ }
    }
    window.addEventListener('beforeunload', saveOnUnload);
    return () => window.removeEventListener('beforeunload', saveOnUnload);
  }, [running, paused, pausedAt]);

  const todayKey = today();
  const todaySessions: StudySession[] = (data.studySessions || []).filter(
    s => s.start ? dateKey(new Date(s.start)) === todayKey : false
  );
  const totalTodaySec = todaySessions.reduce((a, s) => a + s.durationSec, 0);
  const hoursToday = Math.round(totalTodaySec / 3600 * 10) / 10;
  const dailyTarget = 6;

  useEffect(() => {
    const raw = localStorage.getItem('gate_timer_v2');
    if (!raw) return;
    try {
      const ts = JSON.parse(raw);
      if (!ts.startedAt) return;
      startRef.current = new Date(ts.startedAt);
      if (ts.paused) {
        setRunning(true); setPaused(true);
        setPausedAt(ts.pausedAt); setElapsed(ts.pausedAt);
      } else {
        const recovered = typeof ts.elapsed === 'number'
          ? ts.elapsed
          : ts.pausedAt + Math.floor((Date.now() - new Date(ts.startedAt).getTime()) / 1000);
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
        const next = base + Math.floor((Date.now() - startTime) / 1000);
        setElapsed(next);
        localStorage.setItem('gate_timer_v2', JSON.stringify({
          startedAt: startRef.current!.toISOString(),
          pausedAt: base, paused: false, running: true, elapsed: next,
        }));
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
      showToast(`Session saved: ${formatSeconds(finalElapsed)}`);
    }
    localStorage.removeItem('gate_timer_v2');
    setRunning(false); setPaused(false); setElapsed(0); setPausedAt(0);
    startRef.current = null;
  }

  const sessions = data.studySessions || [];
  const last14: { date: string; hours: number; sessions: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dKey = dateKey(d);
    const daySessions = sessions.filter(s => s.start ? dateKey(new Date(s.start)) === dKey : false);
    const hrs = daySessions.reduce((a, s) => a + s.durationSec, 0) / 3600;
    last14.push({ date: dKey, hours: Math.round(hrs * 10) / 10, sessions: daySessions.length });
  }
  const maxH = Math.max(dailyTarget, ...last14.map(d => d.hours));

  const dayTotals: Record<string, number> = {};
  sessions.forEach(s => {
    const day = s.start ? dateKey(new Date(s.start)) : '';
    if (day) dayTotals[day] = (dayTotals[day] || 0) + s.durationSec / 3600;
  });
  const allDays = Object.values(dayTotals);
  const totalDays = allDays.length;
  const totalHours = Math.round(allDays.reduce((a, v) => a + v, 0) * 10) / 10;
  const dailyAvg = totalDays ? Math.round(totalHours / totalDays * 10) / 10 : 0;
  const bestDay = allDays.length ? Math.round(Math.max(...allDays) * 10) / 10 : 0;
  const targetDays = allDays.filter(h => h >= dailyTarget).length;

  const statusText = !running ? 'Ready to start a new session'
    : paused ? 'Session paused' : 'Recording session';
  const statusColor = !running ? 'var(--muted)' : paused ? '#FB923C' : '#4ADE80';
  const fmt = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 12 }}>
      <style>{`@keyframes timerPulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Study Timer</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }} suppressHydrationWarning>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="panel" style={{ textAlign: 'center', padding: '28px 16px' }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 'clamp(40px, 12vw, 72px)',
          fontWeight: 700, lineHeight: 1,
          margin: '8px 0 16px', letterSpacing: 3,
          color: running && !paused ? '#4ADE80' : paused ? '#FB923C' : '#fff',
          textShadow: running && !paused ? '0 0 30px rgba(74,222,128,0.4)' : paused ? '0 0 30px rgba(251,146,60,0.3)' : 'none',
          wordBreak: 'break-all',
        }}>
          {formatSeconds(elapsed)}
        </div>
        <div style={{
          fontSize: 13, marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          color: statusColor,
        }}>
          {running && !paused && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 8px #4ADE80', animation: 'timerPulse 1.2s infinite' }} />
          )}
          {statusText}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {(!running || paused) && (
            <button onClick={handleStart} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #4ADE80, #16A34A)', color: '#0F172A', border: 'none',
              padding: '13px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', boxShadow: '0 0 24px rgba(74,222,128,0.35)',
            }}>{I.play} {paused ? 'Resume' : 'Start'}</button>
          )}
          {running && !paused && (
            <button onClick={handlePause} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #FB923C, #EA580C)', color: '#0F172A', border: 'none',
              padding: '13px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', boxShadow: '0 0 24px rgba(251,146,60,0.35)',
            }}>{I.pause} Pause</button>
          )}
          {running && (
            <button onClick={handleStop} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.06)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)',
              padding: '13px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}>{I.stop} End session</button>
          )}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 14,
        background: hoursToday >= dailyTarget ? 'rgba(74,222,128,0.1)' : hoursToday >= 3 ? 'rgba(251,146,60,0.1)' : 'rgba(248,113,113,0.08)',
        border: `1px solid ${hoursToday >= dailyTarget ? 'rgba(74,222,128,0.3)' : hoursToday >= 3 ? 'rgba(251,146,60,0.3)' : 'rgba(248,113,113,0.2)'}`,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 700,
          color: hoursToday >= dailyTarget ? '#4ADE80' : hoursToday >= 3 ? '#FB923C' : '#F87171',
        }}>{hoursToday}h today</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>— target {dailyTarget}h {hoursToday >= dailyTarget ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>· met! <PartyPopper size={12} color="#4ADE80" /></span> : '· keep going!'}</span>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(34,211,238,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22D3EE' }}>{I.clock}</span>
            Today's Sessions
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''}</span>
        </div>

        {todaySessions.length === 0 && <Empty>No sessions today. Start the timer!</Empty>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 190, overflowY: 'auto' }}>
          {todaySessions.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: 'rgba(34,211,238,0.15)', color: '#22D3EE',
                fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{i + 1}</div>
              <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)', minWidth: 0 }}>
                {fmt(new Date(s.start))} → {s.end ? fmt(new Date(s.end)) : '—'}
              </span>
              <span style={{ fontWeight: 700, color: '#22D3EE', fontSize: 12 }}>{formatSeconds(s.durationSec)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(34,211,238,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22D3EE' }}>{I.bars}</span>
            Study Hours: Last 14 Days
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>target: {dailyTarget}h/day</span>
        </div>

        <div style={{ position: 'relative', marginTop: 18 }}>
          <div style={{
            position: 'absolute', left: 0, right: 0,
            bottom: `${Math.min(95, (dailyTarget / maxH) * 100)}%`,
            borderTop: '1.5px dashed rgba(74,222,128,0.4)', zIndex: 1,
          }}>
            <span style={{
              position: 'absolute', right: 0, top: -16, fontSize: 8, color: '#4ADE80', fontWeight: 700,
              background: '#1C1F25', padding: '0 4px',
            }}>{dailyTarget}h</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, gap: 4, position: 'relative' }}>
            {last14.map((d, i) => {
              const heightPct = Math.max(3, (d.hours / maxH) * 100);
              const isToday = d.date === todayKey;
              const barColor = d.hours >= dailyTarget ? '#4ADE80' : d.hours >= 3 ? '#FB923C' : d.hours > 0 ? '#22D3EE' : 'rgba(255,255,255,0.08)';
              const dateLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end', position: 'relative' }}
                  onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}>
                  {hoverIdx === i && d.hours > 0 && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                      background: '#0F172A', border: `1px solid ${barColor}55`, borderRadius: 10,
                      padding: '7px 10px', whiteSpace: 'nowrap', marginBottom: 8, zIndex: 5,
                      boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>
                        {new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>{d.hours}h · {d.sessions} session{d.sessions !== 1 ? 's' : ''}</div>
                    </div>
                  )}
                  <div style={{
                    width: '100%', maxWidth: 22, borderRadius: '6px 6px 3px 3px',
                    height: `${heightPct}%`,
                    background: d.hours > 0 ? `linear-gradient(180deg, ${barColor}, ${barColor}99)` : 'rgba(255,255,255,0.06)',
                    boxShadow: isToday && d.hours > 0 ? `0 0 14px ${barColor}88` : 'none',
                    border: isToday ? `1px solid ${barColor}` : 'none',
                    transition: 'height 0.4s',
                  }} />
                  <span style={{ fontSize: 8, color: isToday ? '#22D3EE' : 'var(--muted)', fontWeight: isToday ? 700 : 400 }}>{dateLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 10, justifyContent: 'center', flexWrap: 'wrap', color: 'var(--muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 3, background: '#4ADE80', display: 'inline-block' }} />Target met</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 3, background: '#FB923C', display: 'inline-block' }} />3-6h</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 3, background: '#22D3EE', display: 'inline-block' }} />Below 3h</span>
        </div>
      </div>

      <div className="panel">
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(34,211,238,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22D3EE' }}>{I.trophy}</span>
          All-Time Study Stats
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: 10 }}>
          {[
            { label: 'Total days', val: totalDays, color: '#fff' },
            { label: 'Total hours', val: `${totalHours}h`, color: '#fff' },
            { label: 'Daily avg', val: `${dailyAvg}h`, color: '#fff' },
            { label: 'Best day', val: `${bestDay}h`, color: '#4ADE80' },
            { label: `≥${dailyTarget}h days`, val: targetDays, color: '#22D3EE' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              padding: '12px 8px', borderRadius: 12, textAlign: 'center',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 19, fontWeight: 800, color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}