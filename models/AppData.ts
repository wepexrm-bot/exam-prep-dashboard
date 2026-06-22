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
  { id: Number, text: String, tag: String, done: { type: Boolean, default: false }, date: String, endDate: String },
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
  { topic: String, subject: String, intervalDays: Number, notes: String, lastRevised: String },
  { _id: false }
);

const StudySessionSchema = new Schema(
  { start: String, end: String, durationSec: Number },
  { _id: false }
);

export interface IAppData extends Document {
  userId?: string;       // new — ObjectId string of the user
  username?: string;     // kept for backward compatibility during migration
  goals: typeof GoalSchema[];
  subjects: typeof SubjectSchema[];
  dailyScores: typeof DailyScoreSchema[];
  pyqData: typeof PYQChapterSchema[];
  revisions: typeof RevisionSchema[];
  studySessions: typeof StudySessionSchema[];
  weeklyTarget: number;
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
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AppData =
  mongoose.models.AppData || mongoose.model<IAppData>('AppData', AppDataSchema);