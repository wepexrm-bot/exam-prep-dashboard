import mongoose, { Schema, Document } from 'mongoose';

const ChapterSchema = new Schema(
  { name: String, done: { type: Boolean, default: false } },
  { _id: false }
);

const SubjectSchema = new Schema(
  {
    name: { type: String, required: true },
    pct: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    chapters: { type: [ChapterSchema], default: [] },
  },
  { _id: false }
);

const GoalSchema = new Schema(
  { id: Number, text: String, tag: String, done: { type: Boolean, default: false }, date: String, endDate: String, completedDate: String },
  { _id: false }
);

const DailyScoreSchema = new Schema(
  { date: String, score: Number, accuracy: Number, hours: Number },
  { _id: false }
);

const PYQSessionSchema = new Schema(
  { attempted: Number, correct: Number, accuracy: Number, date: String },
  { _id: false }
);

const PYQChapterSchema = new Schema(
  {
    key: String,
    total: Number,
    sessions: { type: [PYQSessionSchema], default: [] },
  },
  { _id: false }
);

const RevisionSchema = new Schema(
  { topic: String, subject: String, chapter: String, intervalDays: Number, notes: String, lastRevised: String, easinessFactor: { type: Number, default: 2.5 }, repetitions: { type: Number, default: 0 }, lastConfidence: String },
  { _id: false }
);

const StudySessionSchema = new Schema(
  { start: String, end: String, durationSec: Number },
  { _id: false }
);

const BadgeStateSchema = new Schema(
  {
    badgeId: String,
    earnedAt: String,
    demotedAt: String,
  },
  { _id: false }
);

const CustomAlertSchema = new Schema(
  {
    id: Number, title: String, body: String,
    enabled: { type: Boolean, default: true },
    hour: { type: Number, default: 12 }, minute: { type: Number, default: 0 },
    daysOfWeek: { type: [Number], default: [] },
  },
  { _id: false }
);

const NotificationPrefsSchema = new Schema(
  {
    revisionReminder: {
      enabled: { type: Boolean, default: true },
      hour: { type: Number, default: 9 }, minute: { type: Number, default: 0 },
    },
    goalsCheckIn: {
      enabled: { type: Boolean, default: false },
      hour: { type: Number, default: 17 }, minute: { type: Number, default: 0 },
    },
    streakReminder: {
      enabled: { type: Boolean, default: true },
      hour: { type: Number, default: 15 }, minute: { type: Number, default: 0 },
    },
    weeklyTarget: {
      enabled: { type: Boolean, default: false },
      hour: { type: Number, default: 18 }, minute: { type: Number, default: 0 },
      weekday: { type: Number, default: 0 },
    },
    breakReminder: {
      enabled: { type: Boolean, default: false },
      intervalMin: { type: Number, default: 120 },
    },
    customAlerts: { type: [CustomAlertSchema], default: [] },
  },
  { _id: false }
);

export interface IAppData extends Document {
  userId?: string;
  username?: string;
  goals: typeof GoalSchema[];
  subjects: typeof SubjectSchema[];
  dailyScores: typeof DailyScoreSchema[];
  pyqData: typeof PYQChapterSchema[];
  revisions: typeof RevisionSchema[];
  studySessions: typeof StudySessionSchema[];
  weeklyTarget: number;
  notificationPrefs?: typeof NotificationPrefsSchema;
  badge_study_hours?: typeof BadgeStateSchema[];
  badge_streak?: typeof BadgeStateSchema[];
  badges?: typeof BadgeStateSchema[]; // legacy, read-only migration fallback
  lastUpdated: Date;
}

const AppDataSchema = new Schema<IAppData>(
  {
    userId: { type: String, sparse: true, index: true },
    username: { type: String, sparse: true },
    goals: { type: [GoalSchema], default: [] },
    subjects: { type: [SubjectSchema], default: [] },
    dailyScores: { type: [DailyScoreSchema], default: [] },
    pyqData: { type: [PYQChapterSchema], default: [] },
    revisions: { type: [RevisionSchema], default: [] },
    studySessions: { type: [StudySessionSchema], default: [] },
    weeklyTarget: { type: Number, default: 12 },
    notificationPrefs: { type: NotificationPrefsSchema, default: () => ({}) },
    badge_study_hours: { type: [BadgeStateSchema], default: [] },
    badge_streak: { type: [BadgeStateSchema], default: [] },
    badges: { type: [BadgeStateSchema], default: undefined }, // legacy — no default array so we can tell "never had this field" apart from "empty"
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AppData =
  mongoose.models.AppData || mongoose.model<IAppData>('AppData', AppDataSchema);