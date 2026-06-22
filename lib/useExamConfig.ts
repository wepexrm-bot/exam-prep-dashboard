'use client';
import { useState, useEffect } from 'react';

export interface ExamConfigData {
  examId: string;
  label: string;
  emoji: string;
  color: string;
  colorLight: string;
  tagline: string;
  subjects: string[];
  weights: Record<string, number>;
  goalTags: string[];
  examDate?: string;
}

// Static fallback in case the API/DB is unreachable — keeps the app from breaking
const FALLBACK_CONFIGS: Record<string, ExamConfigData> = {
  GATE: {
    examId: 'GATE', label: 'GATE CS', emoji: '🖥️', color: '#2563EB', colorLight: '#DBEAFE',
    tagline: 'CS 2027', subjects: [], weights: {},
    goalTags: ['CS', 'Math', 'CN', 'Test', 'Revision', 'PYQ', 'Other'],
  },
  NET: {
    examId: 'NET', label: 'UGC NET', emoji: '📖', color: '#7C3AED', colorLight: '#EDE9FE',
    tagline: 'English 2026', subjects: [], weights: {},
    goalTags: ['Paper1', 'Paper2', 'Revision', 'Test', 'Reading', 'Writing', 'Other'],
  },
};

let cachedConfigs: ExamConfigData[] | null = null;
let fetchPromise: Promise<ExamConfigData[]> | null = null;

async function fetchAllConfigs(): Promise<ExamConfigData[]> {
  if (cachedConfigs) return cachedConfigs;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/exam-configs')
    .then(r => r.json())
    .then(d => {
      const configs = d.configs || [];
      cachedConfigs = configs;
      return configs;
    })
    .catch(() => {
      const configs = Object.values(FALLBACK_CONFIGS);
      cachedConfigs = configs;
      return configs;
    });

  return fetchPromise;
}

/** Returns all available exam configs (for signup picker, settings, etc). */
export function useAllExamConfigs() {
  const [configs, setConfigs] = useState<ExamConfigData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllConfigs().then(c => { setConfigs(c); setLoading(false); });
  }, []);

  return { configs, loading };
}

/** Returns the config for a single examId (for dashboard, sidebar, etc). */
export function useExamConfig(examId: string) {
  const [config, setConfig] = useState<ExamConfigData>(FALLBACK_CONFIGS[examId] || FALLBACK_CONFIGS.GATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllConfigs().then(configs => {
      const found = configs.find(c => c.examId === examId);
      if (found) setConfig(found);
      setLoading(false);
    });
  }, [examId]);

  return { config, loading };
}


