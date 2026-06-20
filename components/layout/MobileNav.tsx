'use client';
import { useRouter, usePathname } from 'next/navigation';
import { computeStreak } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { EXAM_CONFIG } from '@/lib/constants';
import { ExamType } from '@/models/User';

const I = {
  dashboard: <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>,
  goals: <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>,
  subjects: <svg viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  pyq: <svg viewBox="0 0 24 24" fill="none"><path d="M4 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  revision: <svg viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 0 1 15-6.7L21 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 3v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 21v-5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  timer: <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M12 9v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 2h6M12 2v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  scores: <svg viewBox="0 0 24 24" fill="none"><path d="M3 17l5-5 4 4 8-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 7h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  mocks: <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="3.5" height="9" rx="1" stroke="currentColor" strokeWidth="1.8"/><rect x="10.25" y="6" width="3.5" height="14" rx="1" stroke="currentColor" strokeWidth="1.8"/><rect x="16.5" y="3" width="3.5" height="17" rx="1" stroke="currentColor" strokeWidth="1.8"/></svg>,
  predict: <svg viewBox="0 0 24 24" fill="none"><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9.5 19h5M10.5 21.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  storage: <svg viewBox="0 0 24 24" fill="none"><path d="M4 7a8 3 0 0 0 16 0M4 7a8 3 0 0 1 16 0M4 7v10a8 3 0 0 0 16 0V7" stroke="currentColor" strokeWidth="1.8"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15 1.65 1.65 0 0 0 3.17 14H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.13.41.36.78.67 1.08.31.31.68.54 1.09.67H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  flame: <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.5-2-1-2.5.5 2 0 3-1 3.5a4 4 0 0 1-4-4c0-3 2.5-4.5 3-9Z" fill="#0F172A"/></svg>,
  sync: <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M3 12a9 9 0 0 1 15-6.7L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  menu: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
};

const BOTTOM_NAV = [
  { page: 'dashboard', icon: I.dashboard, label: 'Home' },
  { page: 'goals', icon: I.goals, label: 'Goals' },
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
    { page: 'mocks', icon: I.mocks, label: 'Mock Tests' },
    { page: 'predict', icon: I.predict, label: 'Prediction' },
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
  const examType: ExamType = (examTypeProp === "GATE" || examTypeProp === "NET") ? examTypeProp : "GATE";
  const cfg = EXAM_CONFIG[examType];
  return (
    <div className="md:hidden flex" style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 50,
      alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
      background: 'rgba(20,22,26,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, fontSize: 15, color: '#fff' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at 30% 30%, #22D3EE, #1E3A8A)',
          boxShadow: '0 0 12px rgba(34,211,238,0.4)', fontSize: 14,
        }}>{cfg.emoji}</div>
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
      background: 'rgba(20,22,26,0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
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
  const examType: ExamType = (examTypeProp === "GATE" || examTypeProp === "NET") ? examTypeProp : "GATE";
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useApp();
  const streak = computeStreak(data);
  const cfg = EXAM_CONFIG[examType];

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
        background: 'rgba(20,22,26,0.85)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, fontSize: 15, color: '#fff' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(circle at 30% 30%, #22D3EE, #1E3A8A)',
              boxShadow: '0 0 12px rgba(34,211,238,0.4)', fontSize: 14,
            }}>{cfg.emoji}</div>
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