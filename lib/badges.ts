import { BadgeDefinition, BadgeState, AppData } from './types';

export const STUDY_BADGES: BadgeDefinition[] = [
  { id: 'bronze_spark', category: 'study_hours', name: 'Bronze Spark', description: 'Studied 0-180 total hours', icon: '/badges/bronze_spark.svg', threshold: 0, permanent: false },
  { id: 'silver_focus', category: 'study_hours', name: 'Silver Focus', description: 'Studied 181-300 total hours', icon: '/badges/silver_focus.svg', threshold: 181, permanent: false },
  { id: 'gold_mastery', category: 'study_hours', name: 'Gold Mastery', description: 'Studied 301-720 total hours', icon: '/badges/gold_mastery.svg', threshold: 301, permanent: false },
  { id: 'platinum_scholar', category: 'study_hours', name: 'Platinum Scholar', description: 'Studied 721-1500 total hours', icon: '/badges/platinum_scholar.svg', threshold: 721, permanent: false },
  { id: 'quantum_catalyst', category: 'study_hours', name: 'Quantum Catalyst', description: 'Studied 1500+ total hours', icon: '/badges/quantum_catalyst.svg', threshold: 1501, permanent: true },
];

export const STREAK_BADGES: BadgeDefinition[] = [
  { id: 'daily_spark', category: 'daily_streak', name: 'Daily Spark', description: '14-day daily streak', icon: '/badges/Daily_streak.svg', threshold: 14, permanent: false },
  { id: 'persistant_flame', category: 'daily_streak', name: 'Persistent Flame', description: '45-day daily streak', icon: '/badges/persistant_flame.svg', threshold: 45, permanent: false },
  { id: 'aspirants_path', category: 'daily_streak', name: "Aspirant's Path", description: '90-day daily streak', icon: '/badges/aspirants_path.svg', threshold: 90, permanent: false },
  { id: 'scholars_ascent', category: 'daily_streak', name: "Scholar's Ascent", description: '180-day daily streak', icon: '/badges/scholar\'s_ascent.svg', threshold: 180, permanent: false },
  { id: 'cosmic_catalyst', category: 'daily_streak', name: 'Cosmic Catalyst', description: '350-day daily streak', icon: '/badges/cosmic_catalyst.svg', threshold: 350, permanent: true },
];

export const ALL_BADGES: BadgeDefinition[] = [...STUDY_BADGES, ...STREAK_BADGES];

export function badgeById(id: string): BadgeDefinition | undefined {
  return ALL_BADGES.find(b => b.id === id);
}

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function totalStudyHours(data: AppData): number {
  return (data.studySessions || []).reduce((sum, s) => sum + (s.durationSec || 0), 0) / 3600;
}

function currentStreakBadge(streakDays: number): BadgeDefinition | undefined {
  let best: BadgeDefinition | undefined;
  for (const b of STREAK_BADGES) {
    if (streakDays >= b.threshold) best = b;
    else break;
  }
  return best;
}

function currentStudyBadge(hours: number): BadgeDefinition | undefined {
  let best: BadgeDefinition | undefined;
  for (const b of STUDY_BADGES) {
    if (hours >= b.threshold) best = b;
    else break;
  }
  return best;
}

function demoteStreakBadge(currentBadgeId: string | undefined): string | undefined {
  if (!currentBadgeId) return undefined;
  const idx = STREAK_BADGES.findIndex(b => b.id === currentBadgeId);
  if (idx <= 0) return undefined;
  return STREAK_BADGES[idx - 1].id;
}

function badgeProgress(currentBadgeId: string | undefined, actualStreak: number): number {
  if (!currentBadgeId) return actualStreak;
  const def = badgeById(currentBadgeId);
  if (!def) return actualStreak;
  return def.threshold + actualStreak;
}

export function nextStreakBadge(currentBadgeId: string | undefined): BadgeDefinition | undefined {
  if (!currentBadgeId) return STREAK_BADGES[0];
  const idx = STREAK_BADGES.findIndex(b => b.id === currentBadgeId);
  if (idx < 0 || idx >= STREAK_BADGES.length - 1) return undefined;
  return STREAK_BADGES[idx + 1];
}

// ── Detection helpers called from AppContext after mutations ──

export function eligibleStudyBadges(hours: number, existingBadges: BadgeState[]): BadgeState[] {
  const newBadges: BadgeState[] = [];
  const existingIds = new Set(existingBadges.map(b => b.badgeId));
  for (const def of STUDY_BADGES) {
    if (hours >= def.threshold && !existingIds.has(def.id)) {
      newBadges.push({ badgeId: def.id, earnedAt: new Date().toISOString() });
    }
  }
  return newBadges;
}

export function computeStreakBadgeState(
  currentBadges: BadgeState[],
  actualStreak: number,
): { streakBadges: BadgeState[]; demoted: boolean; promoted: boolean } {
  const existingStreakBadge = currentBadges.find(b => STREAK_BADGES.some(sb => sb.id === b.badgeId));
  const currentId = existingStreakBadge?.badgeId;
  const hasCosmic = currentBadges.some(b => b.badgeId === 'cosmic_catalyst');
  const today = todayLocal();
  let demoted = false;
  let promoted = false;

  // ── Demotion on streak break ──
  if (actualStreak === 0 && currentId && !hasCosmic) {
    if (existingStreakBadge?.demotedAt?.startsWith(today)) {
      return { streakBadges: [existingStreakBadge], demoted: false, promoted: false };
    }
    const demotedId = demoteStreakBadge(currentId);
    if (demotedId) {
      return {
        streakBadges: [{ badgeId: demotedId, earnedAt: new Date().toISOString(), demotedAt: new Date().toISOString() }],
        demoted: true,
        promoted: false,
      };
    }
    return { streakBadges: [], demoted: true, promoted: false };
  }

  // ── Promotion check (actualStreak > 0) ──
  if (actualStreak > 0) {
    const progress = badgeProgress(currentId, actualStreak);
    let bestDef: BadgeDefinition | undefined;
    for (const def of STREAK_BADGES) {
      if (progress >= def.threshold) bestDef = def;
      else break;
    }

    if (bestDef) {
      if (bestDef.id !== currentId) {
        return {
          streakBadges: [{ badgeId: bestDef.id, earnedAt: new Date().toISOString() }],
          demoted: false,
          promoted: true,
        };
      }
      return { streakBadges: [existingStreakBadge!], demoted: false, promoted: false };
    }
  }

  // No change
  if (existingStreakBadge) {
    return { streakBadges: [existingStreakBadge], demoted: false, promoted: false };
  }
  return { streakBadges: [], demoted: false, promoted: false };
}
