import { BadgeDefinition, BadgeState, AppData } from './types';

export const STUDY_BADGES: BadgeDefinition[] = [
  { id: 'bronze_spark', category: 'study_hours', name: 'Bronze Spark', description: 'Studied 1-180 total hours', icon: '/badges/bronze_spark.svg', threshold: 1, permanent: false },
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

// ── Build a merged badge array for display ──

export function allBadges(data: AppData): BadgeState[] {
  const study = data.badge_study_hours || [];
  const streak = data.badge_streak || [];
  return [...study, ...streak];
}

// ── Detection helpers called from AppContext after mutations ──

export function detectNewStudyBadges(hours: number, existingStudyBadges: BadgeState[]): BadgeState[] {
  const existingIds = new Set(existingStudyBadges.map(b => b.badgeId));
  return STUDY_BADGES
    .filter(def => hours >= def.threshold && !existingIds.has(def.id))
    .map(def => ({ badgeId: def.id, earnedAt: new Date().toISOString() }));
}

export function detectStreakBadge(streak: number, currentStack: BadgeState[]): {
  badges: BadgeState[];
  changed: boolean;
} {
  const top = currentStack.length > 0 ? currentStack[currentStack.length - 1] : null;
  const topId = top?.badgeId || null;

  // Demotion on streak break (pop top, update previous badge date)
  if (streak === 0) {
    if (currentStack.length === 0) return { badges: currentStack, changed: false };
    if (top?.badgeId === 'cosmic_catalyst') return { badges: currentStack, changed: false };
    const newStack = currentStack.slice(0, -1);
    if (newStack.length > 0) {
      newStack[newStack.length - 1] = { ...newStack[newStack.length - 1], earnedAt: new Date().toISOString() };
    }
    return { badges: newStack, changed: true };
  }

  // Find highest threshold met
  let bestDef: BadgeDefinition | undefined;
  for (const def of STREAK_BADGES) {
    if (streak >= def.threshold) bestDef = def;
    else break;
  }

  const targetId = bestDef?.id || null;

  if (targetId === topId) return { badges: currentStack, changed: false };

  // Promotion: push only if target is a higher tier than current top
  if (targetId) {
    if (!topId) {
      // First badge earned
      return {
        badges: [...currentStack, { badgeId: targetId, earnedAt: new Date().toISOString() }],
        changed: true,
      };
    }
    const topIdx = STREAK_BADGES.findIndex(b => b.id === topId);
    const targetIdx = STREAK_BADGES.findIndex(b => b.id === targetId);
    if (targetIdx > topIdx) {
      // Higher tier: push
      return {
        badges: [...currentStack, { badgeId: targetId, earnedAt: new Date().toISOString() }],
        changed: true,
      };
    }
  }

  return { badges: currentStack, changed: false };
}
