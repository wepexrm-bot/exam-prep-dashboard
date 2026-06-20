'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Empty } from '@/components/ui';
import { computeStreak, getDateLabel, getPrediction, today } from '@/lib/utils';
import { ScoreModal } from '@/components/modals/ScoreModal';
import { MockModal } from '@/components/modals/ScoreModal';
import { EXAM_CONFIG } from '@/lib/constants';

const Icon = {
  all: <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/></svg>,
  study: <svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="2"/><path d="M9 2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  pyq: <svg viewBox="0 0 24 24" fill="none"><path d="M4 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M14 3v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>,
  mock: <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="3" height="9" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="10.5" y="6" width="3" height="14" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="17" y="3" width="3" height="17" rx="1" stroke="currentColor" strokeWidth="2"/></svg>,
  revision: <svg viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 0 1 15-6.7L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  bars: <svg viewBox="0 0 24 24" fill="none"><path d="M4 19V10M10 19V5M16 19v-7M22 19H2" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="#22D3EE" strokeWidth="2"/><path d="M3 9h18M8 3v4M16 3v4" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke="#22D3EE" strokeWidth="2"/><path d="M12 9v4l3 2" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/></svg>,
  flame: <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.5-2-1-2.5.5 2 0 3-1 3.5a4 4 0 0 1-4-4c0-3 2.5-4.5 3-9Z" fill="#0F172A"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M12 5v14M5 12h14" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round"/></svg>,
};

function MiniRing({ pct, color }: { pct: number; color: string }) {
  const c = 75.4;
  const offset = c - (Math.min(100, pct) / 100) * c;
  return (
    <svg width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="12" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle cx="15" cy="15" r="12" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 15 15)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
}

function Skeleton({ w = '100%', h = 18, radius = 8 }: { w?: string | number; h?: number; radius?: number }) {
  return <div style={{ width: w, height: h, borderRadius: radius, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.6s ease-in-out infinite' }} />;
}

export default function DashboardPage() {
  const { data, loading, examType, username } = useApp() as any;
  const [showScore, setShowScore] = useState(false);
  const [showMock, setShowMock] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'study' | 'pyq' | 'mock' | 'revision'>('all');
  useEffect(() => { setMounted(true); }, []);

  const todayKey = today();
  const goals = (data.goals || []).filter((g: any) => {
    const start = g.date || todayKey;
    const end = g.endDate || g.date || todayKey;
    return todayKey >= start && todayKey <= end;
  });
  const done = goals.filter((g: any) => g.done).length;
  const streak = computeStreak(data);
  const pyqData = data.pyqData || [];
  const pyqTotalAttempted = pyqData.reduce((a: number, d: any) => a + (d.sessions || []).reduce((b: number, s: any) => b + s.attempted, 0), 0);
  const pyqTotalQs = pyqData.reduce((a: number, d: any) => a + (d.total || 0), 0);
  const pyqPct = pyqTotalQs > 0 ? Math.min(100, Math.round((pyqTotalAttempted / pyqTotalQs) * 100)) : 0;

  const revDue = (data.revisions || []).filter((r: any) => {
    const next = new Date(r.lastRevised);
    next.setDate(next.getDate() + r.intervalDays);
    return next <= new Date();
  });

  const goalsPct = goals.length > 0 ? Math.round((done / goals.length) * 100) : 0;

  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  const weekDays: { label: string; hours: number; date: string; sessions: any[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const dKey = d.toISOString().split('T')[0];
    const daySessions = (data.studySessions || []).filter((s: any) => s.start?.startsWith(dKey));
    const hrs = daySessions.reduce((a: number, s: any) => a + (s.durationSec || 0), 0) / 3600;
    weekDays.push({
      label: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][i],
      hours: Math.round(hrs * 10) / 10,
      date: d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
      sessions: daySessions,
    });
  }
  const maxHours = Math.max(1, ...weekDays.map(d => d.hours));
  const weekTotal = weekDays.reduce((a, d) => a + d.hours, 0);
  const lastWeekTotal = (() => {
    const lastSunday = new Date(sunday); lastSunday.setDate(sunday.getDate() - 7);
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(lastSunday); d.setDate(lastSunday.getDate() + i);
      const dKey = d.toISOString().split('T')[0];
      total += (data.studySessions || []).filter((s: any) => s.start?.startsWith(dKey))
        .reduce((a: number, s: any) => a + (s.durationSec || 0), 0) / 3600;
    }
    return total;
  })();
  const weekDelta = lastWeekTotal > 0 ? Math.round(((weekTotal - lastWeekTotal) / lastWeekTotal) * 100) : 0;
  const todayIdx = now.getDay();
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const heatDays: { date: string; level: number; label: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dKey = d.toISOString().split('T')[0];
    const hrs = (data.studySessions || []).filter((s: any) => s.start?.startsWith(dKey))
      .reduce((a: number, s: any) => a + (s.durationSec || 0), 0) / 3600;
    const hasScore = (data.dailyScores || []).some((s: any) => s.date === dKey);
    const hasPyq = pyqData.some((p: any) => (p.sessions || []).some((s: any) => s.date === dKey));
    const level = hrs >= 4 ? 4 : hrs >= 2 ? 3 : hrs > 0 ? 2 : (hasScore || hasPyq) ? 1 : 0;
    heatDays.push({
      date: dKey,
      level,
      label: `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${hrs > 0 ? `${Math.round(hrs * 10) / 10}h studied` : (hasScore || hasPyq) ? 'Light activity' : 'No activity'}`,
    });
  }
  const [hoverHeat, setHoverHeat] = useState<number | null>(null);

  type Activity = { type: 'pyq' | 'study' | 'revision' | 'score'; title: string; sub: string; badge: string; badgeColor: string; badgeBg: string; ts: number };
  const activities: Activity[] = [];

  pyqData.forEach((p: any) => {
    (p.sessions || []).slice(-2).forEach((s: any) => {
      activities.push({
        type: 'pyq',
        title: p.key.split('::')[1] || p.key,
        sub: `${s.attempted} questions · ${s.accuracy}% accuracy`,
        badge: 'Done', badgeColor: '#4ADE80', badgeBg: 'rgba(74,222,128,0.15)',
        ts: new Date(s.date).getTime(),
      });
    });
  });
  (data.studySessions || []).slice(-3).forEach((s: any) => {
    const h = Math.floor(s.durationSec / 3600); const m = Math.floor((s.durationSec % 3600) / 60);
    activities.push({
      type: 'study',
      title: 'Study Session',
      sub: `${h}h ${m}m · ${new Date(s.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      badge: `+${h}h ${m}m`, badgeColor: '#22D3EE', badgeBg: 'rgba(34,211,238,0.15)',
      ts: new Date(s.start).getTime(),
    });
  });
  revDue.slice(0, 3).forEach((r: any) => {
    activities.push({
      type: 'revision',
      title: 'Revision Due',
      sub: `${r.subject} · ${r.topic}`,
      badge: 'Overdue', badgeColor: '#F87171', badgeBg: 'rgba(248,113,113,0.15)',
      ts: Date.now(),
    });
  });
  activities.sort((a, b) => b.ts - a.ts);
  const filteredActivities = filter === 'all' ? activities.slice(0, 6)
    : activities.filter(a => a.type === filter || (filter === 'mock' && a.type === 'study')).slice(0, 6);

  const cfg = EXAM_CONFIG[examType as 'GATE' | 'NET'];
  const displayName = username || 'there';

  if (!mounted || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton w={180} h={32} /><Skeleton w={42} h={42} radius={99} />
        </div>
        <Skeleton w="100%" h={90} radius={16} />
        <Skeleton w="100%" h={240} radius={18} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 12 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Welcome back,</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {displayName} 
            <span style={{
              background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)',
              color: '#22D3EE', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
            }}>{cfg.emoji} {cfg.label} · {getDateLabel()}</span>
          </div>
        </div>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          background: 'radial-gradient(circle at 30% 30%, #22D3EE, #1E3A8A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, color: '#fff', fontSize: 16,
          boxShadow: '0 0 16px rgba(34,211,238,0.4)',
        }}>{displayName.charAt(0).toUpperCase()}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div className="stat-card">
          <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>PYQs Solved</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#fff' }}>{pyqTotalAttempted}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}>/{pyqTotalQs}</span></div>
            <MiniRing pct={pyqPct} color="#22D3EE" />
          </div>
          <div style={{ fontSize: 9, color: 'var(--muted)' }}>{pyqData.length} chapters tracked</div>
        </div>

        <div className="stat-card hero">
          <div style={{ fontSize: 9, color: 'rgba(15,23,42,0.65)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Streak</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#0F172A' }}>{streak} days</div>
            {Icon.flame}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(15,23,42,0.7)' }}>{streak > 0 ? 'Days running' : 'Be active to start'}</div>
        </div>

        <div className="stat-card">
          <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Goals Done</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#fff' }}>{done}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}>/{goals.length}</span></div>
            <MiniRing pct={goalsPct} color="#4ADE80" />
          </div>
          <div style={{ fontSize: 9, color: 'var(--muted)' }}>{goalsPct}% today</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>
        {[
          { key: 'all', label: 'All', icon: Icon.all },
          { key: 'study', label: 'Study', icon: Icon.study },
          { key: 'pyq', label: 'PYQ', icon: Icon.pyq },
          { key: 'mock', label: 'Mock', icon: Icon.mock },
          { key: 'revision', label: 'Revision', icon: Icon.revision },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className={`pill ${filter === f.key ? 'active' : ''}`}
            style={{ border: 'none' }}>
            <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(34,211,238,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{Icon.bars}</span>
            </span>
            Study Hours: Weekly Overview
          </span>
          <span style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)', color: '#22D3EE', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99 }}>Weekly</span>
        </div>
        <div style={{ fontSize: 11, color: weekDelta >= 0 ? '#4ADE80' : '#F87171', margin: '8px 0 6px' }}>
          {weekDelta >= 0 ? '↗' : '↘'} {Math.abs(weekDelta)}% vs last week{weekDelta >= 0 ? '! Keep it up!' : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 110, gap: 8, marginTop: 10, position: 'relative' }}>
          {weekDays.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end', position: 'relative' }}
              onMouseEnter={() => setHoverDay(i)} onMouseLeave={() => setHoverDay(null)}>
              {hoverDay === i && d.hours > 0 && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  background: '#0F172A', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 10,
                  padding: '8px 10px', whiteSpace: 'nowrap', marginBottom: 8, zIndex: 5,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{d.date}</div>
                  <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>{d.hours}h · {d.sessions.length} session{d.sessions.length !== 1 ? 's' : ''}</div>
                </div>
              )}
              <div style={{
                width: '100%', borderRadius: 7,
                height: `${Math.max(4, (d.hours / maxHours) * 100)}%`,
                background: i === todayIdx ? 'linear-gradient(180deg, #22D3EE, #3B82F6)' : 'rgba(34,211,238,0.18)',
                boxShadow: i === todayIdx ? '0 0 12px rgba(34,211,238,0.5)' : 'none',
                transition: 'height 0.4s',
              }} />
              <span style={{ fontSize: 9, color: 'var(--muted)' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(34,211,238,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{Icon.calendar}</span>
            </span>
            Activity Heatmap
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 9, color: 'var(--muted)', margin: '8px 0', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(34,211,238,0.15)', display: 'inline-block' }} />low</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22D3EE', display: 'inline-block' }} />high</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {heatDays.map((d, i) => {
            const opacity = d.level === 0 ? 0.04 : d.level === 1 ? 0.15 : d.level === 2 ? 0.35 : d.level === 3 ? 0.6 : 1;
            return (
              <div key={i} style={{ position: 'relative' }}
                onMouseEnter={() => setHoverHeat(i)} onMouseLeave={() => setHoverHeat(null)}>
                {hoverHeat === i && (
                  <div style={{
                    position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                    background: '#0F172A', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 8,
                    padding: '6px 9px', fontSize: 9, color: '#fff', whiteSpace: 'nowrap', zIndex: 5,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                  }}>{d.label}</div>
                )}
                <div style={{
                  aspectRatio: '1', borderRadius: 5,
                  background: d.level === 4 ? '#22D3EE' : `rgba(34,211,238,${opacity})`,
                  boxShadow: d.level === 4 ? '0 0 10px rgba(34,211,238,0.5)' : 'none',
                }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(34,211,238,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{Icon.clock}</span>
            </span>
            Recent Activity
          </span>
          <button onClick={() => setShowScore(true)} style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'linear-gradient(135deg,#22D3EE,#3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', boxShadow: '0 0 10px rgba(34,211,238,0.4)',
          }}>{Icon.plus}</button>
        </div>

        {filteredActivities.length === 0 && <Empty>No activity yet. Start studying!</Empty>}

        {filteredActivities.map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
            borderBottom: i < filteredActivities.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: a.type === 'pyq' ? 'rgba(167,139,250,0.15)' : a.type === 'study' ? 'rgba(34,211,238,0.15)' : 'rgba(248,113,113,0.15)',
            }}>
              <span style={{ width: 16, height: 16, display: 'inline-flex', color: a.type === 'pyq' ? '#A78BFA' : a.type === 'study' ? '#22D3EE' : '#F87171' }}>
                {a.type === 'pyq' ? Icon.pyq : a.type === 'study' ? Icon.clock : Icon.revision}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{a.sub}</div>
            </div>
            <span style={{
              flexShrink: 0, fontSize: 9, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
              background: a.badgeBg, color: a.badgeColor,
            }}>{a.badge}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowMock(true)}>+ Mock test</button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowScore(true)}>Log today</button>
      </div>

      <ScoreModal open={showScore} onClose={() => setShowScore(false)} />
      <MockModal open={showMock} onClose={() => setShowMock(false)} />
    </div>
  );
}