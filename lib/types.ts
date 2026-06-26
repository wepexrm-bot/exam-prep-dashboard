export interface Chapter {
  name: string;
  done: boolean;
}

export interface Subject {
  name: string;
  pct: number;
  completed: boolean;
  chapters: Chapter[];
}

export interface Goal {
  id: number;
  text: string;
  tag: string;
  done: boolean;
  date: string;        // YYYY-MM-DD — the day this goal starts/is set for
  endDate?: string;    // YYYY-MM-DD — optional deadline for multi-day goals
}

export interface DailyScore {
  date: string; // YYYY-MM-DD
  score: number;
  accuracy: number;
  hours: number;
  title?: string;
  totalMarks?: number;
  rank?: number;
  percentile?: number;
  subject?: string;
}

export interface PYQSession {
  attempted: number;
  correct: number;
  accuracy: number;
  date: string;
}

export interface PYQChapter {
  key: string; // "SubjectName::ChapterName"
  total: number;
  sessions: PYQSession[];
}

export interface Revision {
  topic: string;
  subject: string;
  intervalDays: number;
  notes: string;
  lastRevised: string;
}

export interface StudySession {
  start: string;
  end: string;
  durationSec: number;
}

export interface NotificationPref {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface CustomAlert {
  id: number;
  title: string;
  body: string;
  enabled: boolean;
  hour: number;
  minute: number;
  daysOfWeek: number[]; // 0=Sun … 6=Sat — empty = daily
}

export interface NotificationPrefs {
  revisionReminder: NotificationPref;
  goalsCheckIn: NotificationPref;
  streakReminder: NotificationPref;
  weeklyTarget: NotificationPref & { weekday: number };
  breakReminder: { enabled: boolean; intervalMin: number };
  customAlerts: CustomAlert[];
}

export interface AppData {
  goals: Goal[];
  subjects: Subject[];
  dailyScores: DailyScore[];
  pyqData: PYQChapter[];
  revisions: Revision[];
  studySessions: StudySession[];
  weeklyTarget: number;
  notificationPrefs?: NotificationPrefs;
  lastUpdated?: string;
}

export interface Prediction {
  score: number | null;
  percentile: number | null;
  qualify: number | null;
  noData: boolean;
  subjectFactor?: number;
  advice: string[];
}