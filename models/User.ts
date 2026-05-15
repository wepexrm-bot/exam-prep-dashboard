import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type ExamType = 'GATE' | 'NET';

export interface IUser extends Document {
  username: string;
  password: string;
  examType: ExamType;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    examType: { type: String, enum: ['GATE', 'NET'], default: 'GATE' },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
