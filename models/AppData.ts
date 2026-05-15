import mongoose, { Schema, Document } from 'mongoose';

// ── Sub-schemas ────────────────────────────────────────────

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
  {
    id: Number,
    text: String,
    tag: String,
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const DailyScoreSchema = new Schema(
  {
    date: String, // YYYY-MM-DD
    score: Number,
    accuracy: Number,
    hours: Number,
  },
  { _id: false }
);

const MockTestSchema = new Schema(
  {
    date: String,
    score: Number,
    total: Number,
    subject: String,
  },
  { _id: false }
);

const PYQSessionSchema = new Schema(
  {
    attempted: Number,
    correct: Number,
    accuracy: Number,
    date: String,
  },
  { _id: false }
);

const PYQChapterSchema = new Schema(
  {
    key: String, // "SubjectName::ChapterName"
    total: Number,
    sessions: { type: [PYQSessionSchema], default: [] },
  },
  { _id: false }
);

const RevisionSchema = new Schema(
  {
    topic: String,
    subject: String,
    intervalDays: Number,
    notes: String,
    lastRevised: String, // YYYY-MM-DD
  },
  { _id: false }
);

const StudySessionSchema = new Schema(
  {
    start: String,
    end: String,
    durationSec: Number,
  },
  { _id: false }
);

// ── Main AppData Schema ────────────────────────────────────

export interface IAppData extends Document {
  username: string;
  goals: typeof GoalSchema[];
  subjects: typeof SubjectSchema[];
  dailyScores: typeof DailyScoreSchema[];
  mockTests: typeof MockTestSchema[];
  pyqData: typeof PYQChapterSchema[];
  revisions: typeof RevisionSchema[];
  studySessions: typeof StudySessionSchema[];
  weeklyTarget: number;
  lastUpdated: Date;
}

const AppDataSchema = new Schema<IAppData>(
  {
    username: { type: String, required: true, unique: true },
    goals: { type: [GoalSchema], default: [] },
    subjects: { type: [SubjectSchema], default: [] },
    dailyScores: { type: [DailyScoreSchema], default: [] },
    mockTests: { type: [MockTestSchema], default: [] },
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
