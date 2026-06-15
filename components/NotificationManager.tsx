'use client';
import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      Plugins?: {
        LocalNotifications?: {
          checkPermissions: () => Promise<{ display: string }>;
          requestPermissions: () => Promise<{ display: string }>;
          cancel: (opts: { notifications: { id: number }[] }) => Promise<void>;
          schedule: (opts: { notifications: any[] }) => Promise<void>;
          getPending: () => Promise<{ notifications: any[] }>;
        };
      };
    };
  }
}

const NOTIF_IDS = {
  REVISION: 1001,
  STREAK: 1002,
  WEEKLY: 1003,
};

export function NotificationManager() {
  const { data } = useApp();

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (typeof window === 'undefined') return;

      // Poll briefly for window.Capacitor since bridge injection can lag DOM ready
      let tries = 0;
      while (!window.Capacitor?.isNativePlatform?.() && tries < 20) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
      }

      const LN = window.Capacitor?.Plugins?.LocalNotifications;
      if (!window.Capacitor?.isNativePlatform?.() || !LN || cancelled) return;

      try {
        const perm = await LN.checkPermissions();
        if (perm.display !== 'granted') {
          await LN.requestPermissions();
        }

        await LN.cancel({
          notifications: Object.values(NOTIF_IDS).map(id => ({ id })),
        });

        const notifications: any[] = [];

        // ── 1. Revision reminder — every day at 9:00 AM if revisions are due
        const revDue = (data.revisions || []).filter(r => {
          const next = new Date(r.lastRevised);
          next.setDate(next.getDate() + r.intervalDays);
          return next <= new Date();
        }).length;

        if (revDue > 0) {
          notifications.push({
            id: NOTIF_IDS.REVISION,
            title: '🔁 Revision due',
            body: `${revDue} topic${revDue > 1 ? 's' : ''} need review today. Don't lose your edge!`,
            schedule: { on: { hour: 9, minute: 0 }, repeats: true },
          });
        }

        // ── 2. Streak reminder — every day at 3:00 PM if no activity logged today
        const todayKey = new Date().toISOString().split('T')[0];
        const hasScoreToday = (data.dailyScores || []).some(s => s.date === todayKey);
        const hasStudyToday = (data.studySessions || []).some(s => s.start?.startsWith(todayKey));
        const hasPYQToday = (data.pyqData || []).some(p =>
          (p.sessions || []).some(s => s.date === todayKey)
        );
        const activeToday = hasScoreToday || hasStudyToday || hasPYQToday;

        if (!activeToday) {
          notifications.push({
            id: NOTIF_IDS.STREAK,
            title: '🔥 Keep your streak alive!',
            body: "You haven't logged any activity today. Even 30 minutes counts!",
            schedule: { on: { hour: 15, minute: 0 }, repeats: true },
          });
        }

        // ── 3. Weekly target reminder — every Sunday at 6:00 PM
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
          title: '📅 Weekly target check-in',
          body: weekPct >= 100
            ? `🎉 You hit ${weekPct}% of your weekly target! Keep it up.`
            : `You're at ${weekPct}% of your weekly study target. Push for the finish!`,
          schedule: { on: { weekday: 1, hour: 18, minute: 0 }, repeats: true },
        });

        if (notifications.length > 0) {
          await LN.schedule({ notifications });
        }
      } catch (err) {
        console.error('NotificationManager error:', err);
      }
    }

    setup();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.revisions, data.dailyScores, data.studySessions, data.pyqData, data.weeklyTarget]);

  return null;
}