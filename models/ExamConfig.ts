import mongoose, { Schema, Document } from 'mongoose';

export interface IExamConfig extends Document {
  examId: string;        // "GATE", "NET", "GOVT" — unique identifier, stored on users/AppData
  label: string;         // "GATE CS"
  emoji: string;
  color: string;
  colorLight: string;
  tagline: string;
  subjects: string[];
  weights: Record<string, number>;
  goalTags: string[];
  examDate?: string;     // YYYY-MM-DD, optional, used for dashboard countdown
  active: boolean;       // allows hiding an exam from signup without deleting it
  order: number;         // display order in signup picker
}

const ExamConfigSchema = new Schema<IExamConfig>(
  {
    examId: { type: String, required: true, unique: true, uppercase: true },
    label: { type: String, required: true },
    emoji: { type: String, default: '📘' },
    color: { type: String, default: '#22D3EE' },
    colorLight: { type: String, default: '#DBEAFE' },
    tagline: { type: String, default: '' },
    subjects: { type: [String], default: [] },
    weights: { type: Schema.Types.Mixed, default: {} },
    goalTags: { type: [String], default: ['Study', 'Revision', 'Test', 'Other'] },
    examDate: { type: String },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 99 },
  },
  { timestamps: true }
);

export const ExamConfig =
  mongoose.models.ExamConfig || mongoose.model<IExamConfig>('ExamConfig', ExamConfigSchema);
