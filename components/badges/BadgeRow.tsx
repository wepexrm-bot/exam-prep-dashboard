'use client';
import { useRouter } from 'next/navigation';
import { BadgeState } from '@/lib/types';
import { STUDY_BADGES, STREAK_BADGES } from '@/lib/badges';
import { GlowingBadge } from './GlowingBadge';

export function BadgeRow({ badges, size = 22, max = 3 }: { badges: BadgeState[]; size?: number; max?: number }) {
  const router = useRouter();
  const earnedIds = new Set(badges.map(b => b.badgeId));

  const studyEarned = STUDY_BADGES.filter(b => earnedIds.has(b.id));
  const highestStudy = studyEarned.length > 0 ? studyEarned[studyEarned.length - 1] : undefined;

  const streakBadge = badges.find(b => STREAK_BADGES.some(sb => sb.id === b.badgeId));
  const streakDef = streakBadge ? STREAK_BADGES.find(sb => sb.id === streakBadge.badgeId) : undefined;

  const display = [highestStudy, streakDef].filter(Boolean).slice(0, max);
  if (display.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
      onClick={() => router.push('/badges')}
      title="View badges">
      {display.map((def, i) => (
        <GlowingBadge key={i} badgeId={def!.id} src={def!.icon} alt={def!.name}
          size={size} earned={earnedIds.has(def!.id)} rounded={5} />
      ))}
    </div>
  );
}
