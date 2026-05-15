'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppData, DailyScore, Goal, MockTest, PYQChapter, Revision, StudySession, Subject } from '@/lib/types';
import { EXAM_CONFIG } from '@/lib/constants';
import { ExamType } from '@/models/User';

interface AppContextType {
  data: AppData;
  loading: boolean;
  examType: ExamType;
  loadData: () => Promise<void>;
  syncToServer: (patch?: Partial<AppData>) => Promise<void>;
  toggleGoal: (id: number) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  clearDoneGoals: () => Promise<void>;
  clearAllGoals: () => Promise<void>;
  addScore: (score: DailyScore) => Promise<void>;
  deleteScore: (date: string) => Promise<void>;
  addMock: (mock: MockTest) => Promise<void>;
  deleteMock: (idx: number) => Promise<void>;
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

type PYQSession = { attempted: number; correct: number; accuracy: number; date: string };

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

async function apiCall(method: string, url: string, body?: unknown) {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

function today() { return new Date().toISOString().split('T')[0]; }

export function AppProvider({ children, examType: examTypeProp }: { children: React.ReactNode; examType: ExamType }) {
  const examType: ExamType = (examTypeProp && (examTypeProp === "GATE" || examTypeProp === "NET")) ? examTypeProp : "GATE";
  const defaultSubjects = EXAM_CONFIG[examType].subjects.map(name => ({
    name, pct: 0, completed: false, chapters: [],
  }));

  const defaultData: AppData = {
    goals: [],
    subjects: defaultSubjects,
    dailyScores: [],
    mockTests: [],
    pyqData: [],
    revisions: [],
    studySessions: [],
    weeklyTarget: 12,
  };

  const [data, setData] = useState<AppData>(defaultData);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiCall('GET', '/api/data');
      setData({
        goals: d.goals || [],
        subjects: d.subjects?.length ? d.subjects : defaultSubjects,
        dailyScores: d.dailyScores || [],
        mockTests: d.mockTests || [],
        pyqData: d.pyqData || [],
        revisions: d.revisions || [],
        studySessions: d.studySessions || [],
        weeklyTarget: d.weeklyTarget || 12,
        lastUpdated: d.lastUpdated,
      });
    } catch { /* keep default */ }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const syncToServer = useCallback(async (patch?: Partial<AppData>) => {
    try { await apiCall('POST', '/api/data', patch || data); }
    catch { /* silent */ }
  }, [data]);

  // ── Helpers ──────────────────────────────────────────────

  function update(fn: (prev: AppData) => AppData) {
    setData(prev => {
      const next = fn(prev);
      apiCall('POST', '/api/data', next).catch(() => {});
      return next;
    });
  }

  const toggleGoal = useCallback(async (id: number) => {
    update(prev => ({ ...prev, goals: prev.goals.map(g => g.id === id ? { ...g, done: !g.done } : g) }));
  }, []);

  const addGoal = useCallback(async (goal: Omit<Goal, 'id'>) => {
    update(prev => {
      const newId = Math.max(0, ...prev.goals.map(g => g.id)) + 1;
      return { ...prev, goals: [...prev.goals, { ...goal, id: newId }] };
    });
  }, []);

  const deleteGoal = useCallback(async (id: number) => {
    update(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
  }, []);

  const clearDoneGoals = useCallback(async () => {
    update(prev => ({ ...prev, goals: prev.goals.filter(g => !g.done) }));
  }, []);

  const clearAllGoals = useCallback(async () => {
    update(prev => ({ ...prev, goals: [] }));
  }, []);

  const addScore = useCallback(async (score: DailyScore) => {
    setData(prev => {
      const idx = prev.dailyScores.findIndex(s => s.date === score.date);
      const scores = idx >= 0
        ? prev.dailyScores.map((s, i) => i === idx ? score : s)
        : [...prev.dailyScores, score];
      const next = { ...prev, dailyScores: scores };
      apiCall('POST', '/api/scores', score).catch(() => {});
      return next;
    });
  }, []);

  const deleteScore = useCallback(async (date: string) => {
    setData(prev => {
      const next = { ...prev, dailyScores: prev.dailyScores.filter(s => s.date !== date) };
      apiCall('DELETE', `/api/scores?date=${date}`).catch(() => {});
      return next;
    });
  }, []);

  const addMock = useCallback(async (mock: MockTest) => {
    update(prev => ({ ...prev, mockTests: [...prev.mockTests, mock] }));
  }, []);

  const deleteMock = useCallback(async (idx: number) => {
    update(prev => ({ ...prev, mockTests: prev.mockTests.filter((_, i) => i !== idx) }));
  }, []);

  const addPYQSession = useCallback(async (key: string, total: number, session: PYQSession) => {
    update(prev => {
      const existing = prev.pyqData.find(p => p.key === key);
      const pyqData: PYQChapter[] = existing
        ? prev.pyqData.map(p => p.key === key ? { ...p, total, sessions: [...p.sessions, session] } : p)
        : [...prev.pyqData, { key, total, sessions: [session] }];
      return { ...prev, pyqData };
    });
  }, []);

  const deletePYQSession = useCallback(async (key: string, idx: number) => {
    update(prev => ({
      ...prev,
      pyqData: prev.pyqData.map(p => p.key === key
        ? { ...p, sessions: p.sessions.filter((_, i) => i !== idx) } : p),
    }));
  }, []);

  const addRevision = useCallback(async (rev: Omit<Revision, 'lastRevised'>) => {
    update(prev => ({ ...prev, revisions: [...prev.revisions, { ...rev, lastRevised: today() }] }));
  }, []);

  const markRevised = useCallback(async (idx: number) => {
    update(prev => ({
      ...prev,
      revisions: prev.revisions.map((r, i) => i === idx ? { ...r, lastRevised: today() } : r),
    }));
  }, []);

  const deleteRevision = useCallback(async (idx: number) => {
    update(prev => ({ ...prev, revisions: prev.revisions.filter((_, i) => i !== idx) }));
  }, []);

  const addSubject = useCallback(async (name: string) => {
    update(prev => ({ ...prev, subjects: [...prev.subjects, { name, pct: 0, completed: false, chapters: [] }] }));
  }, []);

  const deleteSubject = useCallback(async (idx: number) => {
    update(prev => {
      const subj = prev.subjects[idx];
      return {
        ...prev,
        subjects: prev.subjects.filter((_, i) => i !== idx),
        pyqData: prev.pyqData.filter(p => !p.key.startsWith(subj.name + '::')),
      };
    });
  }, []);

  const addChapter = useCallback(async (si: number, name: string) => {
    update(prev => ({
      ...prev,
      subjects: prev.subjects.map((s, i) =>
        i === si ? { ...s, chapters: [...s.chapters, { name, done: false }] } : s),
    }));
  }, []);

  const toggleChapter = useCallback(async (si: number, ci: number) => {
    update(prev => ({
      ...prev,
      subjects: prev.subjects.map((s, i) => {
        if (i !== si) return s;
        const chapters = s.chapters.map((c, j) => j === ci ? { ...c, done: !c.done } : c);
        return { ...s, chapters, pct: Math.round(chapters.filter(c => c.done).length / chapters.length * 100) };
      }),
    }));
  }, []);

  const deleteChapter = useCallback(async (si: number, ci: number) => {
    update(prev => {
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
    update(prev => {
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
      apiCall('POST', '/api/sessions', session).catch(() => {});
      return next;
    });
  }, []);

  const setWeeklyTarget = useCallback(async (n: number) => {
    update(prev => ({ ...prev, weeklyTarget: n }));
  }, []);

  return (
    <AppContext.Provider value={{
      data, loading, examType, loadData, syncToServer,
      toggleGoal, addGoal, deleteGoal, clearDoneGoals, clearAllGoals,
      addScore, deleteScore, addMock, deleteMock,
      addPYQSession, deletePYQSession,
      addRevision, markRevised, deleteRevision,
      addSubject, deleteSubject, addChapter, toggleChapter, deleteChapter, renameChapter,
      addStudySession, setWeeklyTarget,
    }}>
      {children}
    </AppContext.Provider>
  );
}
