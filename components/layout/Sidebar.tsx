'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { computeStreak } from '@/lib/utils';
import { EXAM_CONFIG } from '@/lib/constants';
import { ExamType } from '@/models/User';

// ── Modern line icons ────────────────────────────────────────
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
  ]},
  { section: 'Performance', items: [
    { page: 'scores', icon: I.scores, label: 'Score Log' },
    { page: 'mocks', icon: I.mocks, label: 'Mock Tests' },
    { page: 'predict', icon: I.predict, label: 'Prediction' },
    { page: 'storage', icon: I.storage, label: 'Data & Backup' },
    { page: 'settings', icon: I.settings, label: 'Settings' },
  ]},
];

export function Sidebar({ onSync, username, examType: examTypeProp }: { onSync?: () => void; username?: string; examType: ExamType }) {
  const examType: ExamType = (examTypeProp === "GATE" || examTypeProp === "NET") ? examTypeProp : "GATE";
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useApp();
  const streak = computeStreak(data);
  const cfg = EXAM_CONFIG[examType];

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
      background: 'rgba(28,31,37,0.7)',
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
        }}>{cfg.emoji}</div>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{cfg.label}</span>
      </div>
      <p style={{ fontSize: 11, color: '#7C8089', margin: '4px 0 4px 44px' }}>{cfg.tagline}</p>
      {username && (
        <div style={{ marginLeft: 44, marginBottom: 18 }}>
          <span style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 99, fontWeight: 600,
            background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)', color: '#22D3EE',
          }}>{username}</span>
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
                  transition: 'all 0.15s',
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
          {I.flame} {streak}-day streak
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