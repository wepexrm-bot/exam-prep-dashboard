'use client';
import { Repeat, Flame, Calendar, PartyPopper, Flag } from 'lucide-react';
import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';

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

type NotificationItem = LocalNotificationSchema;

const NOTIF_IDS = {
  REVISION: 1001,
  STREAK: 1002,
  WEEKLY: 1003,
  GOAL_DEADLINE: 1004,
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

export function NotificationManager() {
  const { data } = useApp();

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (typeof window === 'undefined') return;

      let tries = 0;
      while (!window.Capacitor?.isNativePlatform?.() && tries < 20) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
      }

      const cap = window.Capacitor;
      console.log('[NotificationManager] Capacitor:', !!cap, 'isNativePlatform:', typeof cap?.isNativePlatform, 'cancelled:', cancelled);
      if (cap) console.log('[NotificationManager] Plugins keys:', Object.keys(cap.Plugins || {}));
      const isNative = cap?.isNativePlatform ? cap.isNativePlatform() : !!cap;
      if (!isNative || cancelled) {
        console.log('[NotificationManager] Not running — not a native platform');
        return;
      }

      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }

        await LocalNotifications.cancel({
          notifications: Object.values(NOTIF_IDS).map(id => ({ id })),
        });

        const notifications: NotificationItem[] = [];
        const today = todayLocal();

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
            schedule: { on: { hour: 9, minute: 0 }, repeats: true },
          });
        }

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
            schedule: { on: { hour: 15, minute: 0 }, repeats: true },
          });
        }

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
          schedule: { on: { weekday: 1, hour: 18, minute: 0 }, repeats: true },
        });

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
            schedule: { at: fireAt },
          });
        }

        if (notifications.length > 0) {
          await LocalNotifications.schedule({ notifications });
          console.log(`[NotificationManager] Scheduled ${notifications.length} notification(s):`, notifications.map(n => n.title));
        } else {
          console.log('[NotificationManager] No notifications to schedule');
        }
      } catch (err) {
        console.error('NotificationManager error:', err);
      }
    }

    setup();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.revisions, data.dailyScores, data.studySessions, data.pyqData, data.weeklyTarget, data.goals]);

  return null;
}