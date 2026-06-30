'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { LayoutDashboard, Target, BookOpen, FolderOpen, RefreshCw, Timer, TrendingUp, Database, Settings, Flame, Sun, LogOut, GraduationCap, BarChart3, Award } from 'lucide-react';
import { computeStreak } from '@/lib/utils';
import { EXAM_CONFIG } from '@/lib/constants';
import { ExamType } from '@/models/User';
import { BadgeRow } from '@/components/badges/BadgeRow';

const I = {
  dashboard: <LayoutDashboard size={16} />,
  goals: <Target size={16} />,
  subjects: <BookOpen size={16} />,
  pyq: <FolderOpen size={16} />,
  revision: <RefreshCw size={16} />,
  timer: <Timer size={16} />,
  scores: <TrendingUp size={16} />,
  storage: <Database size={16} />,
  settings: <Settings size={16} />,
  insights: <BarChart3 size={16} />,
  flame: <Flame size={16} style={{ fill: '#0F172A', color: '#FB923C' }} />,
  sync: <RefreshCw size={14} />,
  moon: <Sun size={14} />,
  logout: <LogOut size={14} />,
};

const NAV = [
  { section: 'Overview', items: [
    { page: 'dashboard', icon: I.dashboard, label: 'Dashboard' },
    { page: 'goals', icon: I.goals, label: 'Goal Calendar' },
  ]},
  { section: 'Tracking', items: [
    { page: 'subjects', icon: I.subjects, label: 'Subject Progress' },
    { page: 'pyq', icon: I.pyq, label: 'PYQ Tracker' },
    { page: 'revision', icon: I.revision, label: 'Revision Log' },
    { page: 'studytimer', icon: I.timer, label: 'Study Timer' },
    { page: 'badges', icon: <Award size={16} />, label: 'Badges' },
  ]},
  { section: 'Performance', items: [
    { page: 'scores', icon: I.scores, label: 'Score Log' },
    { page: 'insights', icon: I.insights, label: 'Insights' },
    { page: 'storage', icon: I.storage, label: 'Data & Backup' },
    { page: 'settings', icon: I.settings, label: 'Settings' },
  ]},
];

export function Sidebar({ onSync, username, examType: examTypeProp }: { onSync?: () => void; username?: string; examType: ExamType }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useApp();
  const [streak, setStreak] = useState(0);
  useEffect(() => { setStreak(computeStreak(data)); }, [data]);
  const cfg = EXAM_CONFIG[examTypeProp as keyof typeof EXAM_CONFIG] || EXAM_CONFIG.GATE;

  async function handleLogout() {
    if (!confirm('Sign out?')) return;
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside style={{
      width: 230, position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 10,
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
      padding: '24px 16px',
      background: 'rgba(28,31,37,0.5)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at 30% 30%, #22D3EE, #1E3A8A)',
          boxShadow: '0 0 14px rgba(34,211,238,0.4)', fontSize: 16,
        }}><GraduationCap size={18} style={{ color: '#0F172A' }} /></div>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{cfg.label}</span>
      </div>
      <p style={{ fontSize: 11, color: '#7C8089', margin: '4px 0 4px 44px' }}>{cfg.tagline}</p>
      {username && (
        <div style={{ marginLeft: 44, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 99, fontWeight: 600,
            background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)', color: '#22D3EE',
          }}>{username}</span>
          <BadgeRow badges={data.badges || []} size={20} />
        </div>
      )}

      {/* Nav */}
      {NAV.map(group => (
        <div key={group.section}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#5B5F68', margin: '18px 0 6px 4px',
          }}>{group.section}</div>
          {group.items.map(({ page, icon, label }) => {
            const active = pathname === `/${page}` || pathname.startsWith(`/${page}/`);
            return (
              <div key={page}
                onClick={() => router.push(`/${page}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '9px 11px', borderRadius: 10, marginBottom: 3,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  color: active ? '#22D3EE' : '#9CA3AF',
                  background: active ? 'rgba(34,211,238,0.1)' : 'transparent',
                  boxShadow: active ? 'inset 0 0 0 1px rgba(34,211,238,0.25)' : 'none',
                  transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ width: 17, height: 17, display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
                {label}
              </div>
            );
          })}
        </div>
      ))}

      {/* Footer */}
      <div style={{
        marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', gap: 7,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '9px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
          background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(59,130,246,0.1))',
          border: '1px solid rgba(34,211,238,0.25)', color: '#22D3EE',
        }}>
          {streak}-day streak
        </div>
        <button onClick={onSync} style={navBtnStyle}>{I.sync} Sync data</button>
        <button onClick={() => document.documentElement.classList.toggle('dark')} style={navBtnStyle}>{I.moon} Toggle dark</button>
        <button onClick={handleLogout} style={{ ...navBtnStyle, color: '#F87171' }}>{I.logout} Sign out</button>
      </div>
    </aside>
  );
}

const navBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: '#9CA3AF', cursor: 'pointer',
};