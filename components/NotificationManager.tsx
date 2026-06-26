'use client';
import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { NotificationPrefs } from '@/lib/types';

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      Plugins?: {
        LocalNotifications?: {
          checkPermissions: () => Promise<{ display: string }>;
          requestPermissions: () => Promise<{ display: string }>;
          cancel: (opts: { notifications: { id: number }[] }) => Promise<void>;
          schedule: (opts: { notifications: Record<string, unknown>[] }) => Promise<void>;
          getPending: () => Promise<{ notifications: Record<string, unknown>[] }>;
        };
      };
    };
  }
}

const NOTIF_IDS = {
  REVISION: 1001,
  STREAK: 1002,
  WEEKLY: 1003,
  GOAL_DEADLINE: 1004,
  GOALS_CHECK: 1005,
  BREAK: 1006,
  CUSTOM_START: 2000,
};

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayLocal(): string {
  return dateKey(new Date());
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

type Notif = Record<string, unknown>;

export function NotificationManager() {
  const { data } = useApp();
  const prefs: NotificationPrefs = data.notificationPrefs || {
    revisionReminder: { enabled: true, hour: 9, minute: 0 },
    goalsCheckIn: { enabled: false, hour: 17, minute: 0 },
    streakReminder: { enabled: true, hour: 15, minute: 0 },
    weeklyTarget: { enabled: false, hour: 18, minute: 0, weekday: 0 },
    breakReminder: { enabled: false, intervalMin: 120 },
    customAlerts: [],
  };
  const cachedRef = useRef('');

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (typeof window === 'undefined') return;

      let tries = 0;
      while (!window.Capacitor && tries < 20) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
      }
      if (!window.Capacitor || cancelled) return;

      try {
        const LocalNotifications = window.Capacitor.Plugins?.LocalNotifications;
        if (!LocalNotifications) return;

        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }

        // Cancel all previously scheduled
        await LocalNotifications.cancel({
          notifications: Object.values(NOTIF_IDS).map(id => ({ id })),
        });

        const notifications: Notif[] = [];
        const today = todayLocal();

        // ── 1. Revision reminder ──────────────────────────────
        if (prefs.revisionReminder.enabled) {
          const revDue = (data.revisions || []).filter(r => {
            const next = new Date(r.lastRevised);
            next.setDate(next.getDate() + r.intervalDays);
            return next <= new Date();
          }).length;

          if (revDue > 0) {
            notifications.push({
              id: NOTIF_IDS.REVISION,
              title: 'Revision due',
              body: `${revDue} topic${revDue > 1 ? 's' : ''} need review today.`,
              schedule: {
                on: { hour: clamp(prefs.revisionReminder.hour, 0, 23), minute: clamp(prefs.revisionReminder.minute, 0, 59) },
                repeats: true,
              },
            });
          }
        }

        // ── 2. Goals check-in ─────────────────────────────────
        if (prefs.goalsCheckIn.enabled) {
          const todayGoals = (data.goals || []).filter(g => {
            const start = g.date;
            const end = g.endDate || g.date;
            return today >= start && today <= end;
          });
          const doneCount = todayGoals.filter(g => g.done).length;
          const totalCount = todayGoals.length;

          if (totalCount > 0) {
            let body: string;
            if (doneCount === totalCount) {
              body = `All ${totalCount} goal${totalCount > 1 ? 's' : ''} completed! 🎉`;
            } else if (doneCount === 0) {
              body = `You haven't checked off any of your ${totalCount} goal${totalCount > 1 ? 's' : ''} today.`;
            } else {
              body = `${doneCount} of ${totalCount} goal${totalCount > 1 ? 's' : ''} done — keep going!`;
            }
            notifications.push({
              id: NOTIF_IDS.GOALS_CHECK,
              title: 'Daily goals check-in',
              body,
              schedule: {
                on: { hour: clamp(prefs.goalsCheckIn.hour, 0, 23), minute: clamp(prefs.goalsCheckIn.minute, 0, 59) },
                repeats: true,
              },
            });
          }
        }

        // ── 3. Streak reminder ────────────────────────────────
        if (prefs.streakReminder.enabled) {
          const hasScoreToday = (data.dailyScores || []).some(s => s.date === today);
          const hasStudyToday = (data.studySessions || []).some(s => s.start ? dateKey(new Date(s.start)) === today : false);
          const hasPYQToday = (data.pyqData || []).some(p =>
            (p.sessions || []).some(s => s.date === today)
          );
          const hasGoalDoneToday = (data.goals || []).some(g => {
            const start = g.date; const end = g.endDate || g.date;
            return g.done && today >= start && today <= end;
          });
          const activeToday = hasScoreToday || hasStudyToday || hasPYQToday || hasGoalDoneToday;

          if (!activeToday) {
            notifications.push({
              id: NOTIF_IDS.STREAK,
              title: 'Keep your streak alive!',
              body: "You haven't logged any activity today.",
              schedule: {
                on: { hour: clamp(prefs.streakReminder.hour, 0, 23), minute: clamp(prefs.streakReminder.minute, 0, 59) },
                repeats: true,
              },
            });
          }
        }

        // ── 4. Weekly target check-in ─────────────────────────
        if (prefs.weeklyTarget.enabled) {
          const now = new Date();
          const monday = new Date(now);
          monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
          monday.setHours(0, 0, 0, 0);
          const weekSecs = (data.studySessions || [])
            .filter(s => new Date(s.start) >= monday)
            .reduce((a, s) => a + (s.durationSec || 0), 0);
          const targetSecs = (data.weeklyTarget || 12) * 3600;
          const weekPct = targetSecs > 0 ? Math.round((weekSecs / targetSecs) * 100) : 0;

          notifications.push({
            id: NOTIF_IDS.WEEKLY,
            title: 'Weekly target check-in',
            body: weekPct >= 100
              ? `You hit ${weekPct}% of your weekly target!`
              : `You're at ${weekPct}% of your weekly study target.`,
            schedule: {
              on: {
                weekday: clamp(prefs.weeklyTarget.weekday, 0, 6),
                hour: clamp(prefs.weeklyTarget.hour, 0, 23),
                minute: clamp(prefs.weeklyTarget.minute, 0, 59),
              },
              repeats: true,
            },
          });
        }

        // ── 5. Goal deadline reminder (not user-configurable) ─
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowKey = dateKey(tomorrow);
        const upcomingDeadlines = (data.goals || []).filter(g =>
          g.endDate && g.endDate === tomorrowKey && !g.done
        );
        if (upcomingDeadlines.length > 0) {
          const firstGoal = upcomingDeadlines[0];
          const extra = upcomingDeadlines.length > 1 ? ` (+${upcomingDeadlines.length - 1} more)` : '';
          const fireAt = new Date(tomorrow);
          fireAt.setHours(8, 0, 0, 0);
          notifications.push({
            id: NOTIF_IDS.GOAL_DEADLINE,
            title: 'Goal due today',
            body: `"${firstGoal.text}"${extra} is due today.`,
            schedule: { at: fireAt.getTime() },
          });
        }

        // ── 6. Break reminder ─────────────────────────────────
        if (prefs.breakReminder.enabled) {
          const todaySessions = (data.studySessions || []).filter(s =>
            s.start ? dateKey(new Date(s.start)) === today : false
          );
          if (todaySessions.length > 0) {
            const totalMin = todaySessions.reduce((a, s) => a + (s.durationSec || 0), 0) / 60;
            const intervalMs = clamp(prefs.breakReminder.intervalMin, 15, 480) * 60 * 1000;

            // Fire once at the interval mark after the earliest session today
            const sorted = [...todaySessions].sort((a, b) =>
              new Date(a.start).getTime() - new Date(b.start).getTime()
            );
            const firstStart = new Date(sorted[0].start).getTime();
            const fireAt = new Date(firstStart + intervalMs);

            if (fireAt > new Date() && totalMin >= prefs.breakReminder.intervalMin) {
              notifications.push({
                id: NOTIF_IDS.BREAK,
                title: 'Time for a break?',
                body: `You've been studying for ${Math.round(totalMin)} min. Step away for a few minutes!`,
                schedule: { at: fireAt.getTime() },
              });
            }
          }
        }

        // ── 7. Custom alerts ─────────────────────────────────
        if (prefs.customAlerts?.length > 0) {
          prefs.customAlerts.forEach((alert, idx) => {
            if (!alert.enabled) return;
            const id = NOTIF_IDS.CUSTOM_START + idx;
            const on: Record<string, unknown> = {
              hour: clamp(alert.hour, 0, 23),
              minute: clamp(alert.minute, 0, 59),
            };
            if (alert.daysOfWeek.length > 0) {
              on.weekday = alert.daysOfWeek[0];
            }
            notifications.push({
              id,
              title: alert.title || 'Reminder',
              body: alert.body || '',
              schedule: { on, repeats: true },
            });
          });
        }

        if (notifications.length > 0) {
          await LocalNotifications.schedule({ notifications });
        }
      } catch (err) {
        console.error('NotificationManager error:', err);
      }
    }

    const serialized = JSON.stringify(prefs);
    if (serialized !== cachedRef.current) {
      cachedRef.current = serialized;
      setup();
    }

    return () => { cancelled = true; };
  }, [data.revisions, data.dailyScores, data.studySessions, data.pyqData, data.weeklyTarget, data.goals, prefs]);

  return null;
}
