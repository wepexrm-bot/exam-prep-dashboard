'use client';
import { Grid3X3, Clock, FileText, BarChart3, RefreshCw, Calendar, Flame, Plus, Timer, Layers, Target, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Empty } from '@/components/ui';
import { computeStreak, getDateLabel, getPrediction, today, dateKey } from '@/lib/utils';
import { ScoreModal } from '@/components/modals/ScoreModal';
import { EXAM_CONFIG } from '@/lib/constants';

const Icon = {
  all: <Grid3X3 size={14} />,
  study: <Timer size={14} />,
  pyq: <FileText size={14} />,
  revision: <RefreshCw size={14} />,
  bars: <BarChart3 size={14} style={{ color: '#22D3EE' }} />,
  calendar: <Calendar size={14} style={{ color: '#22D3EE' }} />,
  clock: <Clock size={14} style={{ color: '#22D3EE' }} />,
  flame: <Flame size={20} style={{ fill: '#0F172A', color: '#FB923C' }} />,
  plus: <Plus size={14} style={{ color: '#0F172A' }} />,
  target: <Target size={14} />,
  checkCircle: <CheckCircle size={14} />,
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

  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'study' | 'pyq' | 'revision' | 'goals'>('all');
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
    const dKey = dateKey(d);
    const daySessions = (data.studySessions || []).filter((s: any) => s.start ? dateKey(new Date(s.start)) === dKey : false);
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
      const dKey = dateKey(d);
      total += (data.studySessions || []).filter((s: any) => s.start ? dateKey(new Date(s.start)) === dKey : false)
        .reduce((a: number, s: any) => a + (s.durationSec || 0), 0) / 3600;
    }
    return total;
  })();
  const weekDelta = lastWeekTotal > 0 ? Math.round(((weekTotal - lastWeekTotal) / lastWeekTotal) * 100) : 0;
  const todayIdx = now.getDay();
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const heatDays: { date: string; dayNum: number; hours: number; level: 'none' | 'low' | 'medium' | 'high'; label: string }[] = [];
  const nowMonth = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dKey = dateKey(d);
    const hrs = (data.studySessions || []).filter((s: any) => s.start ? dateKey(new Date(s.start)) === dKey : false)
      .reduce((a: number, s: any) => a + (s.durationSec || 0), 0) / 3600;
    const hasScore = (data.dailyScores || []).some((s: any) => s.date === dKey);
    const hasPyq = pyqData.some((p: any) => (p.sessions || []).some((s: any) => s.date === dKey));
    let level: 'none' | 'low' | 'medium' | 'high' = 'none';
    if (hrs > 0 && hrs <= 2.5) level = 'low';
    else if (hrs > 2.5 && hrs <= 4.5) level = 'medium';
    else if (hrs > 4.5) level = 'high';
    else if (hasScore || hasPyq) level = 'low';
    heatDays.push({
      date: dKey, dayNum: d.getDate(), hours: hrs, level,
      label: `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${hrs > 0 ? `${Math.round(hrs * 10) / 10}h studied` : (hasScore || hasPyq) ? 'Light activity' : 'No activity'}`,
    });
  }
  const [hoverHeat, setHoverHeat] = useState<number | null>(null);

  type Activity = { type: 'pyq' | 'study' | 'revision' | 'score' | 'goals'; title: string; sub: string; badge: string; badgeColor: string; badgeBg: string; ts: number };
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
  (data.goals || []).slice(-5).forEach((g: any) => {
    activities.push({
      type: 'goals',
      title: g.text,
      sub: g.done ? `Completed · ${g.tag}` : `${g.tag} · ${g.endDate ? `Due ${new Date(g.endDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'In progress'}`,
      badge: g.done ? 'Done' : 'Pending',
      badgeColor: g.done ? '#4ADE80' : '#FB923C',
      badgeBg: g.done ? 'rgba(74,222,128,0.15)' : 'rgba(251,146,60,0.15)',
      ts: g.endDate ? new Date(g.endDate + 'T00:00:00').getTime() : Date.now(),
    });
  });
  activities.sort((a, b) => b.ts - a.ts);
  const filteredActivities = filter === 'all' ? activities.slice(0, 6)
    : activities.filter(a => a.type === filter).slice(0, 6);

  const cfg = EXAM_CONFIG[examType as keyof typeof EXAM_CONFIG] || EXAM_CONFIG.GATE;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 12, width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Welcome back,</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
            {displayName} 
            <span style={{
              background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)',
              color: '#22D3EE', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
              maxWidth: '100%', overflowWrap: 'break-word',
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, minWidth: 0 }}>
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
          { key: 'goals', label: 'Goals', icon: Icon.target },
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
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 110, gap: 8, marginTop: 10, position: 'relative', minWidth: 0, width: '100%' }}>
          {weekDays.map((d, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end', position: 'relative' }}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(34,211,238,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={14} color="#22D3EE" />
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Activity Heatmap</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{nowMonth}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
          {heatDays.map((d, i) => {
            const bg = d.level === 'none' ? '#141b27' :
              d.level === 'low' ? 'rgba(34,211,238,0.15)' :
              d.level === 'medium' ? 'rgba(34,211,238,0.4)' : '#22D3EE';
            const bd = d.level === 'none' ? '1px solid #1e273a' :
              d.level === 'low' ? '1px solid rgba(34,211,238,0.12)' :
              d.level === 'medium' ? '1px solid rgba(34,211,238,0.2)' : '1px solid rgba(34,211,238,0.4)';
            const txtCol = d.level === 'high' ? '#0F172A' : d.level === 'none' ? '#6B7280' : '#22D3EE';
            const sh = d.level === 'high' ? '0 0 10px rgba(34,211,238,0.35)' : 'none';
            return (
              <div key={i} style={{ position: 'relative', aspectRatio: '1' }}
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
                  width: '100%', height: '100%', borderRadius: 8,
                  background: bg, border: bd, boxShadow: sh,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  color: txtCol, cursor: 'pointer',
                }}>
                  {d.dayNum}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, fontSize: 10, color: 'var(--muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
          <span style={{ fontWeight: 700 }}>Legend:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#141b27', border: '1px solid #1e273a', display: 'inline-block' }} /> 0h
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.12)', display: 'inline-block' }} /> 1-2.5h
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(34,211,238,0.4)', border: '1px solid rgba(34,211,238,0.2)', display: 'inline-block' }} /> 2.5-4.5h
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#22D3EE', border: '1px solid rgba(34,211,238,0.4)', display: 'inline-block' }} /> 4.5h+
          </span>
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
              background: a.type === 'pyq' ? 'rgba(167,139,250,0.15)' : a.type === 'study' ? 'rgba(34,211,238,0.15)' : a.type === 'goals' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
            }}>
              <span style={{ width: 16, height: 16, display: 'inline-flex', color: a.type === 'pyq' ? '#A78BFA' : a.type === 'study' ? '#22D3EE' : a.type === 'goals' ? '#4ADE80' : '#F87171' }}>
                {a.type === 'pyq' ? Icon.pyq : a.type === 'study' ? Icon.clock : a.type === 'goals' ? Icon.target : Icon.revision}
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
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowScore(true)}>Log today</button>
      </div>

      <ScoreModal open={showScore} onClose={() => setShowScore(false)} />

    </div>
  );
}