'use client';
import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';

// Capacitor is only available when running inside the native app (Android/iOS).
// In a regular browser, window.Capacitor is undefined and this becomes a no-op.

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      Plugins?: Record<string, any>;
    };
  }
}

const NOTIF_IDS = {
  REVISION: 1001,
  STREAK: 1002,
  WEEKLY: 1003,
};

async function getLocalNotifications() {
  if (typeof window === 'undefined' || !window.Capacitor?.isNativePlatform?.()) return null;
  try {
    const mod = await import('@capacitor/local-notifications');
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

export function NotificationManager() {
  const { data } = useApp();

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const LocalNotifications = await getLocalNotifications();
      if (!LocalNotifications || cancelled) return;

      // Request permission once
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      // Cancel previously scheduled ones before re-scheduling
      await LocalNotifications.cancel({
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

      // ── 2. Streak reminder — every day at 8:00 PM if no activity logged today
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
        schedule: { on: { weekday: 1, hour: 18, minute: 0 }, repeats: true }, // weekday: 1 = Sunday
      });

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
    }

    setup();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.revisions, data.dailyScores, data.studySessions, data.pyqData, data.weeklyTarget]);

  return null; // renders nothing — purely sets up notifications
}
