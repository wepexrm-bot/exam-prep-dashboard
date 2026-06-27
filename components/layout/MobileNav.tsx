'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Target, BookOpen, FolderOpen, RefreshCw, Timer, TrendingUp, Wand2, Database, Settings, Flame, Sun, LogOut, Menu, X, GraduationCap, BarChart3 } from 'lucide-react';
import { computeStreak } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { EXAM_CONFIG } from '@/lib/constants';
import { ExamType } from '@/models/User';

const I = {
  dashboard: <LayoutDashboard size={16} />,
  goals: <Target size={16} />,
  subjects: <BookOpen size={16} />,
  pyq: <FolderOpen size={16} />,
  revision: <RefreshCw size={16} />,
  timer: <Timer size={16} />,
  scores: <TrendingUp size={16} />,
  predict: <Wand2 size={16} />,
  storage: <Database size={16} />,
  settings: <Settings size={16} />,
  insights: <BarChart3 size={16} />,
  flame: <Flame size={16} style={{ fill: '#0F172A', color: '#FB923C' }} />,
  sync: <RefreshCw size={14} />,
  moon: <Sun size={14} />,
  logout: <LogOut size={14} />,
  menu: <Menu size={22} />,
  close: <X size={18} />,
};

const BOTTOM_NAV = [
  { page: 'dashboard', icon: I.dashboard, label: 'Home' },
  { page: 'goals', icon: I.goals, label: 'Goals' },
  { page: 'insights', icon: I.insights, label: 'Insights' },
  { page: 'studytimer', icon: I.timer, label: 'Timer' },
  { page: 'scores', icon: I.scores, label: 'Scores' },
];

const ALL_NAV = [
  { section: 'Overview', items: [
    { page: 'dashboard', icon: I.dashboard, label: 'Dashboard' },
    { page: 'goals', icon: I.goals, label: 'Goal Calendar' },
  ]},
  { section: 'Tracking', items: [
    { page: 'subjects', icon: I.subjects, label: 'Subject Progress' },
    { page: 'pyq', icon: I.pyq, label: 'PYQ Tracker' },
    { page: 'revision', icon: I.revision, label: 'Revision Log' },
    { page: 'studytimer', icon: I.timer, label: 'Study Timer' },
  ]},
  { section: 'Performance', items: [
    { page: 'scores', icon: I.scores, label: 'Score Log' },
    { page: 'predict', icon: I.predict, label: 'Prediction' },
    { page: 'insights', icon: I.insights, label: 'Insights' },
    { page: 'storage', icon: I.storage, label: 'Data & Backup' },
    { page: 'settings', icon: I.settings, label: 'Settings' },
  ]},
];

interface MobileNavProps {
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  onSync?: () => void;
  username?: string;
  examType: ExamType;
}

export function MobileTopBar({ onOpenDrawer, examType: examTypeProp }: { onOpenDrawer: () => void; examType: ExamType }) {
  const cfg = EXAM_CONFIG[examTypeProp as keyof typeof EXAM_CONFIG] || EXAM_CONFIG.GATE;
  return (
    <div className="md:hidden flex" style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 50,
      alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
      background: 'rgba(20,22,26,0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, fontSize: 15, color: '#fff' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at 30% 30%, #22D3EE, #1E3A8A)',
          boxShadow: '0 0 12px rgba(34,211,238,0.4)', fontSize: 14,
            }}><GraduationCap size={18} style={{ color: '#0F172A' }} /></div>
        {cfg.label}
      </div>
      <button onClick={onOpenDrawer} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>{I.menu}</button>
    </div>
  );
}

export function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <nav className="md:hidden flex" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 64, zIndex: 50,
      alignItems: 'center', justifyContent: 'space-around',
      background: 'rgba(20,22,26,0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      {BOTTOM_NAV.map(({ page, icon, label }) => {
        const active = pathname === `/${page}`;
        return (
          <button key={page} onClick={() => router.push(`/${page}`)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 10px', borderRadius: 12, flex: 1, border: 'none', background: 'none', cursor: 'pointer',
            color: active ? '#22D3EE' : '#6B7280',
          }}>
            <span style={{
              width: 21, height: 21, display: 'inline-flex',
              filter: active ? 'drop-shadow(0 0 6px rgba(34,211,238,0.6))' : 'none',
              transform: active ? 'translateY(-1px)' : 'none', transition: 'all 0.15s',
            }}>{icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function MobileDrawer({ drawerOpen, onCloseDrawer, onSync, username, examType: examTypeProp }: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
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

  function nav(page: string) { onCloseDrawer(); router.push(`/${page}`); }

  return (
    <>
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={onCloseDrawer} />
      )}
      <div style={{
        position: 'fixed', top: 0, bottom: 0, zIndex: 99, width: 270,
        display: 'flex', flexDirection: 'column', padding: '20px 16px', overflowY: 'auto',
        transition: 'all 280ms cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '4px 0 32px rgba(0,0,0,0.4)',
        left: drawerOpen ? 0 : -280,
        background: 'rgba(20,22,26,0.5)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, fontSize: 15, color: '#fff' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(circle at 30% 30%, #22D3EE, #1E3A8A)',
              boxShadow: '0 0 12px rgba(34,211,238,0.4)', fontSize: 14,
        }}><GraduationCap size={18} style={{ color: '#0F172A' }} /></div>
            {cfg.label}
          </div>
          <button onClick={onCloseDrawer} style={{ background: 'none', border: 'none', color: '#7C8089', cursor: 'pointer' }}>{I.close}</button>
        </div>

        {username && (
          <div style={{
            fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 10, marginBottom: 6,
            background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)', color: '#22D3EE',
          }}>{username}</div>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 12, fontWeight: 700, padding: '8px 12px', borderRadius: 10, marginBottom: 14,
          background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(59,130,246,0.1))',
          border: '1px solid rgba(34,211,238,0.25)', color: '#22D3EE', textAlign: 'center',
        }}>{I.flame} {streak}-day streak</div>

        {ALL_NAV.map(group => (
          <div key={group.section}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#5B5F68', margin: '14px 0 6px 4px',
            }}>{group.section}</div>
            {group.items.map(({ page, icon, label }) => {
              const active = pathname === `/${page}`;
              return (
                <div key={page} onClick={() => nav(page)} style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '9px 11px', borderRadius: 10, marginBottom: 3,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  color: active ? '#22D3EE' : '#9CA3AF',
                  background: active ? 'rgba(34,211,238,0.1)' : 'transparent',
                  boxShadow: active ? 'inset 0 0 0 1px rgba(34,211,238,0.25)' : 'none',
                }}>
                  <span style={{ width: 17, height: 17, display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
                  {label}
                </div>
              );
            })}
          </div>
        ))}

        <div style={{
          marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', gap: 7,
        }}>
          <button onClick={() => { onCloseDrawer(); onSync?.(); }} style={navBtnStyle}>{I.sync} Sync data</button>
          <button onClick={() => { document.documentElement.classList.toggle('dark'); onCloseDrawer(); }} style={navBtnStyle}>{I.moon} Toggle dark</button>
          <button onClick={handleLogout} style={{ ...navBtnStyle, color: '#F87171' }}>{I.logout} Sign out</button>
        </div>
      </div>
    </>
  );
}

const navBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: '#9CA3AF', cursor: 'pointer',
};