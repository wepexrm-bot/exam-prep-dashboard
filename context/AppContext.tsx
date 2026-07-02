'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AppData, Confidence, DailyScore, Goal, PYQChapter, PYQSession, Revision, StudySession, Subject, NotificationPrefs, BadgeState } from '@/lib/types';
import { useExamConfig } from '@/lib/useExamConfig';
import { sm2Next, computeStreak } from '@/lib/utils';
import { totalStudyHours, detectNewStudyBadges, detectStreakBadge, STUDY_BADGES, STREAK_BADGES } from '@/lib/badges';

interface AppContextType {
  data: AppData;
  loading: boolean;
  examType: string;
  username: string;
  newBadges: BadgeState[];
  clearNewBadges: () => void;
  loadData: () => Promise<void>;
  syncToServer: (patch?: Partial<AppData>) => Promise<void>;
  toggleGoal: (id: number) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: number, patch: Partial<Omit<Goal, 'id'>>) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  clearDoneGoals: () => Promise<void>;
  clearAllGoals: () => Promise<void>;
  addScore: (score: DailyScore) => Promise<void>;
  deleteScore: (date: string, title?: string) => Promise<void>;
  addPYQSession: (key: string, total: number, session: PYQSession) => Promise<void>;
  deletePYQSession: (key: string, idx: number) => Promise<void>;
  addRevision: (rev: Omit<Revision, 'lastRevised' | 'easinessFactor' | 'repetitions' | 'lastConfidence'>) => Promise<void>;
  markRevised: (idx: number, confidence: Confidence) => Promise<void>;
  deleteRevision: (idx: number) => Promise<void>;
  addSubject: (name: string) => Promise<void>;
  deleteSubject: (idx: number) => Promise<void>;
  addChapter: (si: number, name: string) => Promise<void>;
  toggleChapter: (si: number, ci: number) => Promise<void>;
  deleteChapter: (si: number, ci: number) => Promise<void>;
  renameChapter: (si: number, ci: number, newName: string) => Promise<void>;
  addStudySession: (session: StudySession) => Promise<void>;
  setWeeklyTarget: (n: number) => Promise<void>;
  updateNotificationPrefs: (prefs: NotificationPrefs) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayLocal(): string {
  return dateKey(new Date());
}

function showErrorToast(msg: string) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('__toast__');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';
  el.style.background = '#F87171';
  el.style.color = '#fff';
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
  }, 3500);
}

async function apiCall(method: string, url: string, body?: unknown) {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || `API error ${r.status}`);
  }
  return r.json();
}

export function AppProvider({
  children,
  examType,
  username: usernameProp,
}: {
  children: React.ReactNode;
  examType: string;
  username?: string;
}) {
  const username = usernameProp || '';
  const { config: examCfg } = useExamConfig(examType);
  const defaultSubjects = useMemo(
    () => (examCfg.subjects || []).map(name => ({ name, pct: 0, completed: false, chapters: [] })),
    [examCfg]
  );

  const defaultData: AppData = {
    goals: [],
    subjects: defaultSubjects,
    dailyScores: [],
    pyqData: [],
    revisions: [],
    studySessions: [],
    weeklyTarget: 12,
    notificationPrefs: {
      revisionReminder: { enabled: true, hour: 9, minute: 0 },
      goalsCheckIn: { enabled: false, hour: 17, minute: 0 },
      streakReminder: { enabled: true, hour: 15, minute: 0 },
      weeklyTarget: { enabled: false, hour: 18, minute: 0, weekday: 0 },
      breakReminder: { enabled: false, intervalMin: 120 },
      customAlerts: [],
    },
    badge_study_hours: [],
    badge_streak: [],
  };

  const CACHE_KEY = 'gate_data_cache';
  const [data, setData] = useState<AppData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [newBadges, setNewBadges] = useState<BadgeState[]>([]);
  const dataRef = useRef(data);
  dataRef.current = data;
  const cacheLoadedRef = useRef(false);

  function detectBadges(prev: AppData): {
    badge_study_hours: BadgeState[];
    badge_streak: BadgeState[];
    fresh: BadgeState[];
  } {
    const hours = totalStudyHours(prev);
    const existingStudy = prev.badge_study_hours || [];
    const existingStreak = prev.badge_streak || [];

    const newStudy = detectNewStudyBadges(hours, existingStudy);
    const streakDays = computeStreak(prev);
    const { badges: newStack, changed: streakChanged } = detectStreakBadge(streakDays, existingStreak);

    const studyBadges = [...existingStudy, ...newStudy];
    const streakBadges = streakChanged ? newStack : existingStreak;

    const fresh: BadgeState[] = [...newStudy];

    const oldTop = existingStreak.length > 0 ? existingStreak[existingStreak.length - 1] : null;
    const newTop = streakBadges.length > 0 ? streakBadges[streakBadges.length - 1] : null;
    if (streakChanged && newTop && (!oldTop || newTop.badgeId !== oldTop.badgeId || newTop.earnedAt !== oldTop.earnedAt)) {
      fresh.push(newTop);
    }

    return { badge_study_hours: studyBadges, badge_streak: streakBadges, fresh };
  }

  const setDataAndPersist = useCallback((updater: AppData | ((prev: AppData) => AppData)) => {
    if (typeof updater === 'function') {
      setData(prev => {
        const next = updater(prev);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    } else {
      setData(updater);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(updater)); } catch { /* ignore */ }
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (typeof window !== 'undefined' && !cacheLoadedRef.current) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) setData(JSON.parse(cached));
      } catch { /* ignore */ }
      cacheLoadedRef.current = true;
    }
    try {
      const d = await apiCall('GET', '/api/data');
      const rawGoals: Goal[] = (d.goals || []).map((g: Goal) => ({ ...g, date: g.date || todayLocal() }));
      const todayK = todayLocal();
      const existingTexts = new Set(rawGoals.filter(g => g.date === todayK).map(g => g.text));
      const goals = rawGoals.map(g => {
        if (g.done || g.date >= todayK || g.endDate || existingTexts.has(g.text)) return g;
        existingTexts.add(g.text);
        return { ...g, date: todayK, done: false };
      });
      let studyBadges: BadgeState[] = d.badge_study_hours || [];
      let streakStack: BadgeState[] = d.badge_streak || [];
      if (!d.badge_study_hours && d.badges) {
        studyBadges = d.badges.filter((b: BadgeState) => STUDY_BADGES.some(sb => sb.id === b.badgeId));
        const streakBadges = d.badges.filter((b: BadgeState) => STREAK_BADGES.some(sb => sb.id === b.badgeId));
        streakStack = streakBadges.length > 0 ? [streakBadges[streakBadges.length - 1]] : [];
      }
      const base = {
        goals,
        subjects: d.subjects?.length ? d.subjects : defaultSubjects,
        dailyScores: d.dailyScores || [],
        pyqData: d.pyqData || [],
        revisions: (d.revisions || []).map((r: any) => ({ easinessFactor: 2.5, repetitions: 0, ...r })),
        studySessions: d.studySessions || [],
        weeklyTarget: d.weeklyTarget || 12,
        notificationPrefs: { ...defaultData.notificationPrefs, ...d.notificationPrefs, customAlerts: d.notificationPrefs?.customAlerts || [] },
        badge_study_hours: studyBadges,
        badge_streak: streakStack,
        lastUpdated: d.lastUpdated,
      };
      const { badge_study_hours, badge_streak, fresh: newB } = detectBadges(base);
      const fresh = { ...base, badge_study_hours, badge_streak };
      setData(fresh);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)); } catch { /* ignore */ }
      apiCall('POST', '/api/data', { badge_study_hours, badge_streak }).catch(() => {});
      if (newB.length > 0 && typeof window !== 'undefined' && sessionStorage.getItem('freshLogin')) {
        const notified: string[] = JSON.parse(localStorage.getItem('notified_badge_ids') || '[]');
        const unseen = newB.filter(b => !notified.includes(b.badgeId));
        if (unseen.length > 0) {
          const all = notified.concat(unseen.map(b => b.badgeId));
          const dedup = all.filter((id, i) => all.indexOf(id) === i);
          localStorage.setItem('notified_badge_ids', JSON.stringify(dedup));
          setNewBadges(prev => [...prev, ...unseen]);
        }
        sessionStorage.removeItem('freshLogin');
      }
    } catch (e) {
      showErrorToast('Failed to load data from server');
    } finally { setLoading(false); }
  }, [defaultSubjects]);

  useEffect(() => { loadData(); }, [loadData]);

  const syncToServer = useCallback(async (patch?: Partial<AppData>) => {
    try { await apiCall('POST', '/api/data', patch || dataRef.current); }
    catch { showErrorToast('Failed to sync data'); }
  }, []);

  const toggleGoal = useCallback(async (id: number) => {
    const cd = dataRef.current;
    const newGoals = cd.goals.map(g => g.id === id ? { ...g, done: !g.done } : g);
    setDataAndPersist(prev => ({ ...prev, goals: newGoals }));
    try { await apiCall('POST', '/api/data', { goals: newGoals }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const addGoal = useCallback(async (goal: Omit<Goal, 'id'>) => {
    const cd = dataRef.current;
    const newId = Math.max(0, ...cd.goals.map(g => g.id)) + 1;
    const newGoals = [...cd.goals, { ...goal, id: newId }];
    setDataAndPersist(prev => ({ ...prev, goals: newGoals }));
    try { await apiCall('POST', '/api/data', { goals: newGoals }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const updateGoal = useCallback(async (id: number, patch: Partial<Omit<Goal, 'id'>>) => {
    const cd = dataRef.current;
    const newGoals = cd.goals.map(g => g.id === id ? { ...g, ...patch } : g);
    setDataAndPersist(prev => ({ ...prev, goals: newGoals }));
    try { await apiCall('POST', '/api/data', { goals: newGoals }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const deleteGoal = useCallback(async (id: number) => {
    const cd = dataRef.current;
    const newGoals = cd.goals.filter(g => g.id !== id);
    setDataAndPersist(prev => ({ ...prev, goals: newGoals }));
    try { await apiCall('POST', '/api/data', { goals: newGoals }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const clearDoneGoals = useCallback(async () => {
    const cd = dataRef.current;
    const newGoals = cd.goals.filter(g => !g.done);
    setDataAndPersist(prev => ({ ...prev, goals: newGoals }));
    try { await apiCall('POST', '/api/data', { goals: newGoals }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const clearAllGoals = useCallback(async () => {
    setDataAndPersist(prev => ({ ...prev, goals: [] }));
    try { await apiCall('POST', '/api/data', { goals: [] }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const addScore = useCallback(async (score: DailyScore) => {
    const cd = dataRef.current;
    const matchKey = (s: DailyScore) => s.date === score.date && (s.title || '') === (score.title || '');
    const idx = cd.dailyScores.findIndex(matchKey);
    const scores = idx >= 0
      ? cd.dailyScores.map((s, i) => i === idx ? score : s)
      : [...cd.dailyScores, score];
    const withScores = { ...cd, dailyScores: scores };
    const { badge_study_hours, badge_streak, fresh } = detectBadges(withScores);
    const next = { ...withScores, badge_study_hours, badge_streak };
    setDataAndPersist(() => next);
    if (fresh.length > 0) setTimeout(() => setNewBadges(n => [...n, ...fresh]), 500);
    try { await apiCall('POST', '/api/scores', score); }
    catch { showErrorToast('Failed to save score'); }
    try { await apiCall('POST', '/api/data', { badge_study_hours, badge_streak }); }
    catch { showErrorToast('Failed to save badges'); }
  }, []);

  const deleteScore = useCallback(async (date: string, title?: string) => {
    const cd = dataRef.current;
    const next = { ...cd, dailyScores: cd.dailyScores.filter(s => s.date !== date || (title != null && (s.title || '') !== title)) };
    setDataAndPersist(() => next);
    try { await apiCall('DELETE', `/api/scores?date=${date}${title ? `&title=${encodeURIComponent(title)}` : ''}`); }
    catch { showErrorToast('Failed to delete score'); }
  }, []);

  const addPYQSession = useCallback(async (key: string, total: number, session: PYQSession) => {
    const cd = dataRef.current;
    const existing = cd.pyqData.find(p => p.key === key);
    const pyqData: PYQChapter[] = existing
      ? cd.pyqData.map(p => p.key === key ? { ...p, sessions: [...p.sessions, session] } : p)
      : [...cd.pyqData, { key, total, sessions: [session] }];
    const withPYQ = { ...cd, pyqData };
    const { badge_study_hours, badge_streak, fresh } = detectBadges(withPYQ);
    const next = { ...withPYQ, badge_study_hours, badge_streak };
    setDataAndPersist(() => next);
    if (fresh.length > 0) setTimeout(() => setNewBadges(n => [...n, ...fresh]), 500);
    try { await apiCall('POST', '/api/data', { pyqData, badge_study_hours, badge_streak }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const deletePYQSession = useCallback(async (key: string, idx: number) => {
    const cd = dataRef.current;
    const pyqData = cd.pyqData.map(p => p.key === key
      ? { ...p, sessions: p.sessions.filter((_, i) => i !== idx) } : p);
    setDataAndPersist(prev => ({ ...prev, pyqData }));
    try { await apiCall('POST', '/api/data', { pyqData }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const addRevision = useCallback(async (rev: Omit<Revision, 'lastRevised' | 'easinessFactor' | 'repetitions' | 'lastConfidence'>) => {
    const cd = dataRef.current;
    const newRev = { ...rev, lastRevised: todayLocal(), easinessFactor: 2.5, repetitions: 0, lastConfidence: undefined as Confidence | undefined };
    const revisions = [...cd.revisions, newRev];
    setDataAndPersist(prev => ({ ...prev, revisions }));
    try { await apiCall('POST', '/api/data', { revisions }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const markRevised = useCallback(async (idx: number, confidence: Confidence) => {
    const cd = dataRef.current;
    const revisions = cd.revisions.map((r, i) => {
      if (i !== idx) return r;
      const next = sm2Next(confidence, r.intervalDays, r.easinessFactor, r.repetitions);
      return {
        ...r,
        lastRevised: todayLocal(),
        intervalDays: next.intervalDays,
        easinessFactor: next.easinessFactor,
        repetitions: next.repetitions,
        lastConfidence: confidence,
      };
    });
    setDataAndPersist(prev => ({ ...prev, revisions }));
    try { await apiCall('POST', '/api/data', { revisions }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const deleteRevision = useCallback(async (idx: number) => {
    const cd = dataRef.current;
    const revisions = cd.revisions.filter((_, i) => i !== idx);
    setDataAndPersist(prev => ({ ...prev, revisions }));
    try { await apiCall('POST', '/api/data', { revisions }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const addSubject = useCallback(async (name: string) => {
    const cd = dataRef.current;
    const subjects = [...cd.subjects, { name, pct: 0, completed: false, chapters: [] }];
    setDataAndPersist(prev => ({ ...prev, subjects }));
    try { await apiCall('POST', '/api/data', { subjects }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const deleteSubject = useCallback(async (idx: number) => {
    const cd = dataRef.current;
    const subj = cd.subjects[idx];
    const subjects = cd.subjects.filter((_, i) => i !== idx);
    const pyqData = cd.pyqData.filter(p => !p.key.startsWith(subj.name + '::'));
    setDataAndPersist(prev => ({ ...prev, subjects, pyqData }));
    try { await apiCall('POST', '/api/data', { subjects, pyqData }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const addChapter = useCallback(async (si: number, name: string) => {
    const cd = dataRef.current;
    const subjects = cd.subjects.map((s, i) =>
      i === si ? { ...s, chapters: [...s.chapters, { name, done: false }] } : s);
    setDataAndPersist(prev => ({ ...prev, subjects }));
    try { await apiCall('POST', '/api/data', { subjects }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const toggleChapter = useCallback(async (si: number, ci: number) => {
    const cd = dataRef.current;
    const subjects = cd.subjects.map((s, i) => {
      if (i !== si) return s;
      const chapters = s.chapters.map((c, j) => j === ci ? { ...c, done: !c.done } : c);
      return { ...s, chapters, pct: Math.round(chapters.filter(c => c.done).length / chapters.length * 100) };
    });
    setDataAndPersist(prev => ({ ...prev, subjects }));
    try { await apiCall('POST', '/api/data', { subjects }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const deleteChapter = useCallback(async (si: number, ci: number) => {
    const cd = dataRef.current;
    const subj = cd.subjects[si];
    const key = `${subj.name}::${subj.chapters[ci].name}`;
    const subjects = cd.subjects.map((s, i) => {
      if (i !== si) return s;
      const chapters = s.chapters.filter((_, j) => j !== ci);
      return { ...s, chapters, pct: chapters.length ? Math.round(chapters.filter(c => c.done).length / chapters.length * 100) : 0 };
    });
    const pyqData = cd.pyqData.filter(p => p.key !== key);
    setDataAndPersist(prev => ({ ...prev, subjects, pyqData }));
    try { await apiCall('POST', '/api/data', { subjects, pyqData }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const renameChapter = useCallback(async (si: number, ci: number, newName: string) => {
    const cd = dataRef.current;
    const subj = cd.subjects[si];
    const oldKey = `${subj.name}::${subj.chapters[ci].name}`;
    const newKey = `${subj.name}::${newName}`;
    const subjects = cd.subjects.map((s, i) =>
      i === si ? { ...s, chapters: s.chapters.map((c, j) => j === ci ? { ...c, name: newName } : c) } : s);
    const pyqData = cd.pyqData.map(p => p.key === oldKey ? { ...p, key: newKey } : p);
    setDataAndPersist(prev => ({ ...prev, subjects, pyqData }));
    try { await apiCall('POST', '/api/data', { subjects, pyqData }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const addStudySession = useCallback(async (session: StudySession) => {
    const cd = dataRef.current;
    const next = { ...cd, studySessions: [...cd.studySessions, session] };
    const { badge_study_hours, badge_streak, fresh } = detectBadges(next);
    const withBadges = { ...next, badge_study_hours, badge_streak };
    setDataAndPersist(() => withBadges);
    if (fresh.length > 0) setTimeout(() => setNewBadges(n => [...n, ...fresh]), 500);
    try { await apiCall('POST', '/api/sessions', session); }
    catch { showErrorToast('Failed to save study session'); }
    try { await apiCall('POST', '/api/data', { badge_study_hours, badge_streak }); }
    catch { showErrorToast('Failed to save badges'); }
  }, []);

  const setWeeklyTarget = useCallback(async (n: number) => {
    setDataAndPersist(prev => ({ ...prev, weeklyTarget: n }));
    try { await apiCall('POST', '/api/data', { weeklyTarget: n }); }
    catch { showErrorToast('Failed to save'); }
  }, []);

  const updateNotificationPrefs = useCallback(async (prefs: NotificationPrefs) => {
    setDataAndPersist(prev => ({ ...prev, notificationPrefs: prefs }));
    try { await apiCall('POST', '/api/data', { notificationPrefs: prefs }); }
    catch { showErrorToast('Failed to save notification prefs'); }
  }, []);

  const clearNewBadges = useCallback(() => setNewBadges([]), []);

  return (
    <AppContext.Provider value={{
      data, loading, examType, username, newBadges, clearNewBadges, loadData, syncToServer,
      toggleGoal, addGoal, updateGoal, deleteGoal, clearDoneGoals, clearAllGoals,
      addScore, deleteScore,
      addPYQSession, deletePYQSession,
      addRevision, markRevised, deleteRevision,
      addSubject, deleteSubject, addChapter, toggleChapter, deleteChapter, renameChapter,
      addStudySession, setWeeklyTarget, updateNotificationPrefs,
    }}>
      {children}
    </AppContext.Provider>
  );
}
