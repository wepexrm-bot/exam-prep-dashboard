'use client';
import { useRouter, usePathname } from 'next/navigation';
import { computeStreak } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { EXAM_CONFIG } from '@/lib/constants';
import { ExamType } from '@/models/User';

const BOTTOM_NAV = [
  { page: 'dashboard', icon: '📊', label: 'Home' },
  { page: 'goals', icon: '✅', label: 'Goals' },
  { page: 'studytimer', icon: '⏱️', label: 'Timer' },
  { page: 'scores', icon: '📈', label: 'Scores' },
];

const ALL_NAV = [
  { section: 'Overview', items: [
    { page: 'dashboard', icon: '📊', label: 'Dashboard' },
    { page: 'goals', icon: '✅', label: 'Daily Goals' },
  ]},
  { section: 'Tracking', items: [
    { page: 'subjects', icon: '📚', label: 'Subject Progress' },
    { page: 'pyq', icon: '📂', label: 'PYQ Tracker' },
    { page: 'revision', icon: '🔄', label: 'Revision Log' },
    { page: 'studytimer', icon: '⏱️', label: 'Study Timer' },
  ]},
  { section: 'Performance', items: [
    { page: 'scores', icon: '📈', label: 'Score Log' },
    { page: 'mocks', icon: '📝', label: 'Mock Tests' },
    { page: 'predict', icon: '🔮', label: 'Prediction' },
    { page: 'storage', icon: '💾', label: 'Data & Backup' },
    { page: 'settings', icon: '⚙️', label: 'Settings' },
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
    <div className="md:hidden fixed top-0 left-0 right-0 h-[52px] border-b flex items-center justify-between px-4 z-50 shadow-sm"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 font-bold text-[15px]" style={{ color: 'var(--text)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
          style={{ background: cfg.color, color: '#fff' }}>{cfg.emoji}</div>
        {cfg.label}
      </div>
      <button onClick={onOpenDrawer} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 22 }}>☰</button>
    </div>
  );
}

export function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { examType } = useApp();
  const cfg = EXAM_CONFIG[examType];
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[62px] border-t flex items-center justify-around z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      {BOTTOM_NAV.map(({ page, icon, label }) => {
        const active = pathname === `/${page}`;
        return (
          <button key={page} onClick={() => router.push(`/${page}`)}
            className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-btn flex-1 border-0"
            style={{ background: 'none', color: active ? cfg.color : 'var(--muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            <span className={`text-xl leading-none ${active ? '-translate-y-0.5' : ''}`}>{icon}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
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
  const streak = computeStreak(data.dailyScores);
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
        <div className="fixed inset-0 z-[98] backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={onCloseDrawer} />
      )}
      <div className="fixed top-0 bottom-0 z-[99] w-[270px] flex flex-col px-4 py-5 overflow-y-auto transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[4px_0_24px_rgba(0,0,0,0.15)]"
        style={{ background: 'var(--surface)', left: drawerOpen ? 0 : -280 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-bold text-[15px]">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: cfg.color, color: '#fff' }}>{cfg.emoji}</div>
            {cfg.label}
          </div>
          <button onClick={onCloseDrawer} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        {username && (
          <div className="text-xs font-semibold px-3 py-1.5 rounded-btn mb-1" style={{ background: cfg.colorLight, color: cfg.color }}>👤 {username}</div>
        )}
        <div className="text-xs font-semibold px-3 py-1.5 rounded-btn mb-3 text-center" style={{ background: '#FEF3C7', color: '#D97706' }}>
          🔥 {streak}-day streak
        </div>

        {ALL_NAV.map(group => (
          <div key={group.section}>
            <div className="text-[10px] font-semibold uppercase tracking-widest mt-3 mb-1 ml-1" style={{ color: 'var(--muted)' }}>{group.section}</div>
            {group.items.map(({ page, icon, label }) => {
              const active = pathname === `/${page}`;
              return (
                <div key={page} className={`nav-item mb-0.5 ${active ? 'active' : ''}`}
                  style={active ? { background: cfg.color, color: '#fff' } : {}}
                  onClick={() => nav(page)}>
                  <span className="text-base w-5 text-center">{icon}</span> {label}
                </div>
              );
            })}
          </div>
        ))}

        <div className="mt-auto pt-4 border-t flex flex-col gap-1.5" style={{ borderColor: 'var(--border)' }}>
          <button className="btn btn-sm w-full justify-center" style={{ color: cfg.color }}
            onClick={() => { onCloseDrawer(); onSync?.(); }}>🔄 Sync data</button>
          <button className="btn btn-sm w-full justify-center"
            onClick={() => { document.documentElement.classList.toggle('dark'); onCloseDrawer(); }}>🌙 Toggle dark</button>
          <button className="btn btn-sm w-full justify-center" style={{ color: '#DC2626' }}
            onClick={handleLogout}>⏏ Sign out</button>
        </div>
      </div>
    </>
  );
}