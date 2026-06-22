// ── GATE CS ────────────────────────────────────────────────

export const GATE_WEIGHTS: Record<string, number> = {
  'Engineering Maths': 13,
  'Discrete Maths': 7,
  'Digital Logic': 7,
  'Computer Architecture (CAO)': 7,
  'Data Structures': 6.5,
  'Algorithms': 6.5,
  'Theory of Computation': 6,
  'Compiler Design': 6,
  'Operating Systems': 9,
  'DBMS': 9,
  'Computer Networks': 9,
  'Aptitude & Reasoning': 15,
};

export const DEFAULT_GATE_SUBJECTS = [
  'Data Structures',
  'Algorithms',
  'Operating Systems',
  'Computer Networks',
  'DBMS',
  'Discrete Maths',
  'Engineering Maths',
  'Digital Logic',
  'Computer Architecture (CAO)',
  'Compiler Design',
  'Theory of Computation',
  'Aptitude & Reasoning',
];

// ── NET English ────────────────────────────────────────────

export const NET_WEIGHTS: Record<string, number> = {
  'Teaching Aptitude': 10,
  'Research Aptitude': 10,
  'Comprehension': 10,
  'Communication': 10,
  'Mathematical Reasoning': 10,
  'Logical Reasoning': 10,
  'Data Interpretation': 10,
  'Information & Communication Technology': 10,
  'People & Environment': 10,
  'Higher Education System': 10,
};

export const DEFAULT_NET_SUBJECTS = [
  // Paper 1 (General)
  'Teaching Aptitude',
  'Research Aptitude',
  'Comprehension',
  'Communication',
  'Mathematical Reasoning',
  'Logical Reasoning',
  'Data Interpretation',
  'Information & Communication Technology',
  'People & Environment',
  'Higher Education System',
  // Paper 2 (English Literature)
  'British Poetry',
  'British Prose & Fiction',
  'British Drama',
  'American Literature',
  'Indian Writing in English',
  'Literary Criticism & Theory',
  'Language & Linguistics',
  'Cultural Studies & New Literatures',
];

// ── Shared ─────────────────────────────────────────────────

export const SUB_COLORS = [
  '#2563EB', '#7C3AED', '#0D9488', '#D97706', '#16A34A',
  '#DC2626', '#DB2777', '#0284C7', '#B45309', '#059669',
  '#7C3AED', '#475569', '#0891B2', '#65A30D', '#EA580C',
  '#9333EA', '#0F766E', '#B91C1C',
];

export const GOAL_TAGS = ['Study', 'Revision', 'Test', 'PYQ', 'Reading', 'Writing', 'Other'] as const;
export type GoalTag = typeof GOAL_TAGS[number];

export const GATE_GOAL_TAGS = ['CS', 'Math', 'CN', 'Test', 'Revision', 'PYQ', 'Other'] as const;
export const NET_GOAL_TAGS = ['Paper1', 'Paper2', 'Revision', 'Test', 'Reading', 'Writing', 'Other'] as const;

export const REVISION_INTERVALS = [3, 7, 14, 30];

export const EXAM_CONFIG = {
  GATE: {
    label: 'GATE CS',
    emoji: '🖥️',
    color: '#2563EB',
    colorLight: '#DBEAFE',
    tagline: 'CS 2026',
    subjects: DEFAULT_GATE_SUBJECTS,
    goalTags: GATE_GOAL_TAGS,
  },
  NET: {
    label: 'UGC NET',
    emoji: '📖',
    color: '#7C3AED',
    colorLight: '#EDE9FE',
    tagline: 'English 2026',
    subjects: DEFAULT_NET_SUBJECTS,
    goalTags: NET_GOAL_TAGS,
  },
} as const;
