'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { computeStreak } from '@/lib/utils';
import { EXAM_CONFIG } from '@/lib/constants';
import { ExamType } from '@/models/User';

const NAV = [
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

export function Sidebar({ onSync, username, examType: examTypeProp }: { onSync?: () => void; username?: string; examType: ExamType }) {
  const examType: ExamType = (examTypeProp === "GATE" || examTypeProp === "NET") ? examTypeProp : "GATE";
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useApp();
  const streak = computeStreak(data.dailyScores);
  const cfg = EXAM_CONFIG[examType];

  async function handleLogout() {
    if (!confirm('Sign out?')) return;
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-[230px] border-r flex flex-col fixed top-0 bottom-0 left-0 overflow-y-auto z-10 px-4 py-6"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-0.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: cfg.color, color: '#fff' }}>{cfg.emoji}</div>
        <span className="font-bold text-[15px]" style={{ color: 'var(--text)' }}>{cfg.label}</span>
      </div>
      <p className="text-[11px] mb-1 pl-10" style={{ color: 'var(--muted)' }}>{cfg.tagline}</p>
      {username && (
        <div className="ml-10 mb-4">
          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: cfg.colorLight, color: cfg.color }}>
            👤 {username}
          </span>
        </div>
      )}

      {/* Nav */}
      {NAV.map(group => (
        <div key={group.section}>
          <div className="text-[10px] font-semibold uppercase tracking-widest mb-1 mt-4 ml-1"
            style={{ color: 'var(--muted)' }}>{group.section}</div>
          {group.items.map(({ page, icon, label }) => {
            const active = pathname === `/${page}` || pathname.startsWith(`/${page}/`);
            return (
              <div key={page}
                className={`nav-item mb-0.5 ${active ? 'active' : ''}`}
                style={active ? { background: cfg.color, color: '#fff' } : {}}
                onClick={() => router.push(`/${page}`)}>
                <span className="w-4 text-center text-[14px]">{icon}</span>
                {label}
              </div>
            );
          })}
        </div>
      ))}

      {/* Footer */}
      <div className="mt-auto pt-4 border-t flex flex-col gap-1.5" style={{ borderColor: 'var(--border)' }}>
        <div className="text-center py-1.5 px-3 rounded-btn text-xs font-semibold"
          style={{ background: '#FEF3C7', color: '#D97706' }}>
          🔥 {streak}-day streak
        </div>
        <button className="btn btn-sm w-full justify-center" style={{ color: cfg.color }} onClick={onSync}>🔄 Sync data</button>
        <button className="btn btn-sm w-full justify-center" onClick={() => document.documentElement.classList.toggle('dark')}>🌙 Toggle dark</button>
        <button className="btn btn-sm w-full justify-center" style={{ color: '#DC2626' }} onClick={handleLogout}>⏏ Sign out</button>
      </div>
    </aside>
  );
}