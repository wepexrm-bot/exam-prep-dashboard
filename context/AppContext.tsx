'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AppData, DailyScore, Goal, PYQChapter, PYQSession, Revision, StudySession, Subject } from '@/lib/types';
import { useExamConfig } from '@/lib/useExamConfig';

interface AppContextType {
  data: AppData;
  loading: boolean;
  examType: string;
  username: string;
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
  addRevision: (rev: Omit<Revision, 'lastRevised'>) => Promise<void>;
  markRevised: (idx: number) => Promise<void>;
  deleteRevision: (idx: number) => Promise<void>;
  addSubject: (name: string) => Promise<void>;
  deleteSubject: (idx: number) => Promise<void>;
  addChapter: (si: number, name: string) => Promise<void>;
  toggleChapter: (si: number, ci: number) => Promise<void>;
  deleteChapter: (si: number, ci: number) => Promise<void>;
  renameChapter: (si: number, ci: number, newName: string) => Promise<void>;
  addStudySession: (session: StudySession) => Promise<void>;
  setWeeklyTarget: (n: number) => Promise<void>;
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
  };

  const [data, setData] = useState<AppData>(defaultData);
  const [loading, setLoading] = useState(true);
  const dataRef = useRef(data);
  dataRef.current = data;

  // ── Debounced sync to server ──────────────────────────────────
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncVersionRef = useRef(0);

  useEffect(() => {
    if (loading) return;
    syncVersionRef.current++;
    const version = syncVersionRef.current;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      if (version !== syncVersionRef.current) return;
      try {
        await apiCall('POST', '/api/data', dataRef.current);
      } catch {
        showErrorToast('Failed to save data to server');
      }
    }, 600);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [data, loading]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiCall('GET', '/api/data');
      const rawGoals: Goal[] = (d.goals || []).map((g: Goal) => ({ ...g, date: g.date || todayLocal() }));
      const todayK = todayLocal();
      const existingTexts = new Set(rawGoals.filter(g => g.date === todayK).map(g => g.text));
      const maxId = Math.max(0, ...rawGoals.map(g => g.id));
      const carryoverGoals: Goal[] = [];
      let nextId = maxId + 1;
      rawGoals.forEach(g => {
        if (g.done || g.date >= todayK || g.endDate || existingTexts.has(g.text)) return;
        existingTexts.add(g.text);
        carryoverGoals.push({ ...g, id: nextId++, date: todayK, done: false });
      });
      const goals = [...rawGoals, ...carryoverGoals];
      setData({
        goals,
        subjects: d.subjects?.length ? d.subjects : defaultSubjects,
        dailyScores: d.dailyScores || [],
        pyqData: d.pyqData || [],
        revisions: d.revisions || [],
        studySessions: d.studySessions || [],
        weeklyTarget: d.weeklyTarget || 12,
        lastUpdated: d.lastUpdated,
      });
    } catch (e) {
      showErrorToast('Failed to load data from server');
    } finally { setLoading(false); }
  }, [defaultSubjects]);

  useEffect(() => { loadData(); }, [loadData]);

  const syncToServer = useCallback(async (patch?: Partial<AppData>) => {
    try { await apiCall('POST', '/api/data', patch || dataRef.current); }
    catch { showErrorToast('Failed to sync data'); }
  }, []);

  function mutate(fn: (prev: AppData) => AppData) {
    setData(fn);
  }

  const toggleGoal = useCallback(async (id: number) => {
    mutate(prev => ({ ...prev, goals: prev.goals.map(g => g.id === id ? { ...g, done: !g.done } : g) }));
  }, []);

  const addGoal = useCallback(async (goal: Omit<Goal, 'id'>) => {
    mutate(prev => {
      const newId = Math.max(0, ...prev.goals.map(g => g.id)) + 1;
      return { ...prev, goals: [...prev.goals, { ...goal, id: newId }] };
    });
  }, []);

  const updateGoal = useCallback(async (id: number, patch: Partial<Omit<Goal, 'id'>>) => {
    mutate(prev => ({ ...prev, goals: prev.goals.map(g => g.id === id ? { ...g, ...patch } : g) }));
  }, []);

  const deleteGoal = useCallback(async (id: number) => {
    mutate(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
  }, []);

  const clearDoneGoals = useCallback(async () => {
    mutate(prev => ({ ...prev, goals: prev.goals.filter(g => !g.done) }));
  }, []);

  const clearAllGoals = useCallback(async () => {
    mutate(prev => ({ ...prev, goals: [] }));
  }, []);

  const addScore = useCallback(async (score: DailyScore) => {
    setData(prev => {
      const matchKey = (s: DailyScore) => s.date === score.date && (s.title || '') === (score.title || '');
      const idx = prev.dailyScores.findIndex(matchKey);
      const scores = idx >= 0
        ? prev.dailyScores.map((s, i) => i === idx ? score : s)
        : [...prev.dailyScores, score];
      const next = { ...prev, dailyScores: scores };
      apiCall('POST', '/api/scores', score).catch(() => showErrorToast('Failed to save score'));
      return next;
    });
  }, []);

  const deleteScore = useCallback(async (date: string, title?: string) => {
    setData(prev => {
      const next = { ...prev, dailyScores: prev.dailyScores.filter(s => s.date !== date || (title != null && (s.title || '') !== title)) };
      apiCall('DELETE', `/api/scores?date=${date}${title ? `&title=${encodeURIComponent(title)}` : ''}`).catch(() => showErrorToast('Failed to delete score'));
      return next;
    });
  }, []);

  const addPYQSession = useCallback(async (key: string, total: number, session: PYQSession) => {
    mutate(prev => {
      const existing = prev.pyqData.find(p => p.key === key);
      const pyqData: PYQChapter[] = existing
        ? prev.pyqData.map(p => p.key === key ? { ...p, total, sessions: [...p.sessions, session] } : p)
        : [...prev.pyqData, { key, total, sessions: [session] }];
      return { ...prev, pyqData };
    });
  }, []);

  const deletePYQSession = useCallback(async (key: string, idx: number) => {
    mutate(prev => ({
      ...prev,
      pyqData: prev.pyqData.map(p => p.key === key
        ? { ...p, sessions: p.sessions.filter((_, i) => i !== idx) } : p),
    }));
  }, []);

  const addRevision = useCallback(async (rev: Omit<Revision, 'lastRevised'>) => {
    mutate(prev => ({ ...prev, revisions: [...prev.revisions, { ...rev, lastRevised: todayLocal() }] }));
  }, []);

  const markRevised = useCallback(async (idx: number) => {
    mutate(prev => ({
      ...prev,
      revisions: prev.revisions.map((r, i) => i === idx ? { ...r, lastRevised: todayLocal() } : r),
    }));
  }, []);

  const deleteRevision = useCallback(async (idx: number) => {
    mutate(prev => ({ ...prev, revisions: prev.revisions.filter((_, i) => i !== idx) }));
  }, []);

  const addSubject = useCallback(async (name: string) => {
    mutate(prev => ({ ...prev, subjects: [...prev.subjects, { name, pct: 0, completed: false, chapters: [] }] }));
  }, []);

  const deleteSubject = useCallback(async (idx: number) => {
    mutate(prev => {
      const subj = prev.subjects[idx];
      return {
        ...prev,
        subjects: prev.subjects.filter((_, i) => i !== idx),
        pyqData: prev.pyqData.filter(p => !p.key.startsWith(subj.name + '::')),
      };
    });
  }, []);

  const addChapter = useCallback(async (si: number, name: string) => {
    mutate(prev => ({
      ...prev,
      subjects: prev.subjects.map((s, i) =>
        i === si ? { ...s, chapters: [...s.chapters, { name, done: false }] } : s),
    }));
  }, []);

  const toggleChapter = useCallback(async (si: number, ci: number) => {
    mutate(prev => ({
      ...prev,
      subjects: prev.subjects.map((s, i) => {
        if (i !== si) return s;
        const chapters = s.chapters.map((c, j) => j === ci ? { ...c, done: !c.done } : c);
        return { ...s, chapters, pct: Math.round(chapters.filter(c => c.done).length / chapters.length * 100) };
      }),
    }));
  }, []);

  const deleteChapter = useCallback(async (si: number, ci: number) => {
    mutate(prev => {
      const subj = prev.subjects[si];
      const key = `${subj.name}::${subj.chapters[ci].name}`;
      return {
        ...prev,
        subjects: prev.subjects.map((s, i) => {
          if (i !== si) return s;
          const chapters = s.chapters.filter((_, j) => j !== ci);
          return { ...s, chapters, pct: chapters.length ? Math.round(chapters.filter(c => c.done).length / chapters.length * 100) : 0 };
        }),
        pyqData: prev.pyqData.filter(p => p.key !== key),
      };
    });
  }, []);

  const renameChapter = useCallback(async (si: number, ci: number, newName: string) => {
    mutate(prev => {
      const subj = prev.subjects[si];
      const oldKey = `${subj.name}::${subj.chapters[ci].name}`;
      const newKey = `${subj.name}::${newName}`;
      return {
        ...prev,
        subjects: prev.subjects.map((s, i) =>
          i === si ? { ...s, chapters: s.chapters.map((c, j) => j === ci ? { ...c, name: newName } : c) } : s),
        pyqData: prev.pyqData.map(p => p.key === oldKey ? { ...p, key: newKey } : p),
      };
    });
  }, []);

  const addStudySession = useCallback(async (session: StudySession) => {
    setData(prev => {
      const next = { ...prev, studySessions: [...prev.studySessions, session] };
      apiCall('POST', '/api/sessions', session).catch(() => showErrorToast('Failed to save study session'));
      return next;
    });
  }, []);

  const setWeeklyTarget = useCallback(async (n: number) => {
    mutate(prev => ({ ...prev, weeklyTarget: n }));
  }, []);

  return (
    <AppContext.Provider value={{
      data, loading, examType, username, loadData, syncToServer,
      toggleGoal, addGoal, updateGoal, deleteGoal, clearDoneGoals, clearAllGoals,
      addScore, deleteScore,
      addPYQSession, deletePYQSession,
      addRevision, markRevised, deleteRevision,
      addSubject, deleteSubject, addChapter, toggleChapter, deleteChapter, renameChapter,
      addStudySession, setWeeklyTarget,
    }}>
      {children}
    </AppContext.Provider>
  );
}