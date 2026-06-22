import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';
import { ExamConfig } from '@/models/ExamConfig';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  // Look up by userId first (new accounts), fall back to username (migrated admin account)
  let doc = await AppData.findOne({ userId: auth.userId }).lean();
  if (!doc) {
    // Fallback for old admin data during migration period
    doc = await AppData.findOne({ username: auth.name }).lean();
    if (doc) {
      // Auto-migrate: attach userId to this document so future lookups use userId
      await AppData.findOneAndUpdate({ username: auth.name }, { $set: { userId: auth.userId } });
    }
  }

  if (!doc) {
    // Brand new user — create fresh AppData with default subjects pulled
    // live from the ExamConfig collection (works for GATE, NET, GOVT, and
    // any future exam added via the seed script — no code change needed).
    const examCfg = await ExamConfig.findOne({ examId: auth.examType, active: true }).lean() as { subjects?: string[] } | null;
    const defaultSubjects = (examCfg?.subjects || []).map((name: string) => ({
      name, pct: 0, completed: false, chapters: [],
    }));
    doc = await AppData.create({
      userId: auth.userId,
      username: auth.userId,
      subjects: defaultSubjects,
    });
  }

  return NextResponse.json(doc);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();

  // Whitelist allowed fields — prevents mass-assignment of arbitrary schema fields
  const ALLOWED_FIELDS = ['goals', 'subjects', 'dailyScores', 'pyqData', 'revisions', 'studySessions', 'weeklyTarget'] as const;
  const update: Record<string, unknown> = { lastUpdated: new Date() };
  for (const key of ALLOWED_FIELDS) {
    if (key in body) update[key] = body[key];
  }

  const doc = await AppData.findOneAndUpdate(
    { userId: auth.userId },
    { $set: { ...update, userId: auth.userId, username: auth.userId } },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json(doc);
}