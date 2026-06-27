import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';
import { ExamConfig } from '@/models/ExamConfig';

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    // Atomic upsert — prevents duplicate AppData documents on concurrent requests
    const examCfg = await ExamConfig.findOne({ examId: auth.examType, active: true }).lean() as { subjects?: string[] } | null;
    const defaultSubjects = (examCfg?.subjects || []).map((name: string) => ({
      name, pct: 0, completed: false, chapters: [],
    }));

    // Try userId first, then fall back to username for migrated accounts
    let doc: any = await AppData.findOneAndUpdate(
      { userId: auth.userId },
      { $setOnInsert: { userId: auth.userId, username: auth.userId, subjects: defaultSubjects } },
      { upsert: true, returnDocument: 'after' }
    ).lean();

    // If the document was created by upsert, `subjects` is set. If it already
    // existed but lacked `userId` (migrated admin legacy), patch it.
    if (doc && !doc.userId) {
      doc = await AppData.findOneAndUpdate(
        { username: auth.name },
        { $set: { userId: auth.userId } },
        { returnDocument: 'after' }
      ).lean();
    }

    return NextResponse.json(doc || {});
  } catch (err) {
    console.error('Data GET error:', err);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const body = await req.json();

    // Whitelist allowed fields — prevents mass-assignment of arbitrary schema fields
    const ALLOWED_FIELDS = ['goals', 'subjects', 'dailyScores', 'pyqData', 'revisions', 'studySessions', 'weeklyTarget', 'notificationPrefs'] as const;
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
  } catch (err) {
    console.error('Data POST error:', err);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}