'use client';
import { useApp } from '@/context/AppContext';
import { STUDY_BADGES, STREAK_BADGES, badgeById, totalStudyHours, nextStreakBadge } from '@/lib/badges';
import { computeStreak } from '@/lib/utils';
import { Award, Clock, Flame, Star } from 'lucide-react';
import { GlowingBadge } from '@/components/badges/GlowingBadge';

export default function BadgesPage() {
  const { data } = useApp();
  const hours = Math.round(totalStudyHours(data) * 10) / 10;
  const streak = computeStreak(data);
  const earnedIds = new Set((data.badges || []).map(b => b.badgeId));

  function BadgeCard({ id, earned }: { id: string; earned: boolean }) {
    const def = badgeById(id);
    if (!def) return null;
    const badgeState = (data.badges || []).find(b => b.badgeId === id);
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        background: earned ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.03)',
        borderRadius: 14, border: earned ? '1px solid rgba(34,211,238,0.25)' : '1px solid rgba(255,255,255,0.06)',
        opacity: earned ? 1 : 0.55,
        transition: 'opacity 0.2s',
      }}>
        <GlowingBadge badgeId={def.id} src={def.icon} alt={def.name}
          size={48} earned={earned} rounded={11} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: earned ? '#fff' : '#94A3B8', display: 'flex', alignItems: 'center', gap: 8 }}>
            {def.name}
            {def.permanent && <Star size={12} style={{ color: '#FBBF24' }} />}
          </div>
          <div style={{ fontSize: 11, color: earned ? '#CBD5E1' : '#6B7280', marginTop: 2 }}>{def.description}</div>
          {earned && badgeState && (
            <div style={{ fontSize: 10, color: '#22D3EE', marginTop: 4 }}>
              {def.category === 'daily_streak' && badgeState.demotedAt
                ? `Demoted on ${new Date(badgeState.demotedAt).toLocaleDateString('en-IN')}`
                : `Earned ${new Date(badgeState.earnedAt).toLocaleDateString('en-IN')}`}
            </div>
          )}
        </div>
        {def.permanent && earned && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}>Permanent</span>
        )}
      </div>
    );
  }

  const currentStreakBadgeId = (data.badges || []).find(b => STREAK_BADGES.some(sb => sb.id === b.badgeId))?.badgeId;
  const nextBadge = nextStreakBadge(currentStreakBadgeId);
  const currentStudyBadgeId = [...STUDY_BADGES].reverse().find(b => earnedIds.has(b.id))?.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 12, maxWidth: 600 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Award size={22} style={{ color: '#22D3EE' }} /> Badges
        </h1>
        <p style={{ fontSize: 12, color: '#CBD5E1', marginTop: 4 }}>Earn badges as you progress through your preparation journey.</p>
      </div>

      {/* Rules */}
      <div className="panel" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Reward System Rules</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#E2E8F0', lineHeight: 1.6 }}>
          <div><strong style={{ color: '#22D3EE' }}>Study Time Badges</strong> — Based on total study hours accumulated. Once earned, badges are retained permanently (no demotion). Quantum Catalyst is a permanent badge.</div>
          <div><strong style={{ color: '#FB923C' }}>Daily Streak Badges</strong> — Based on consecutive days with activity (study, PYQ, or scores). If your streak breaks, you get demoted one tier and your internal progress starts from the demoted tier's threshold. Cosmic Catalyst, once earned, is permanent.</div>
          <div style={{ background: 'rgba(34,211,238,0.08)', borderRadius: 10, padding: '10px 12px', marginTop: 4, border: '1px solid rgba(34,211,238,0.15)' }}>
            <strong style={{ color: '#22D3EE' }}>Tip:</strong> <span style={{ color: '#E2E8F0' }}>Log study sessions, PYQ attempts, or daily scores each day to maintain your streak and earn higher badges!</span>
          </div>
        </div>
      </div>

      {/* Current status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="stat-card">
          <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={12} /> Study Hours
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', marginTop: 4 }}>{hours.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}> hrs</span></div>
          {currentStudyBadgeId && <div style={{ fontSize: 10, color: '#22D3EE', marginTop: 2 }}>{badgeById(currentStudyBadgeId)?.name}</div>}
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Flame size={12} /> Current Streak
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', marginTop: 4 }}>{streak}<span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}> days</span></div>
          {currentStreakBadgeId && <div style={{ fontSize: 10, color: '#FB923C', marginTop: 2 }}>{badgeById(currentStreakBadgeId)?.name}</div>}
        </div>
      </div>

      {/* Study Time Badges */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} style={{ color: '#22D3EE' }} /> Study Time
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STUDY_BADGES.map(b => (
            <BadgeCard key={b.id} id={b.id} earned={earnedIds.has(b.id)} />
          ))}
        </div>
      </div>

      {/* Daily Streak Badges */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={16} style={{ color: '#FB923C' }} /> Daily Streak
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STREAK_BADGES.map(b => (
            <BadgeCard key={b.id} id={b.id} earned={earnedIds.has(b.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
