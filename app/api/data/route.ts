import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';
import { ExamConfig } from '@/models/ExamConfig';
import { checkRateLimit } from '@/lib/rateLimit';
import { csrfGuard } from '@/lib/csrf';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const examCfg = await ExamConfig.findOne({ examId: auth.examType, active: true }).lean() as { subjects?: string[] } | null;
    const defaultSubjects = (examCfg?.subjects || []).map((name: string) => ({
      name, pct: 0, completed: false, chapters: [],
    }));

    let doc: any = await AppData.findOneAndUpdate(
      { userId: auth.userId },
      { $setOnInsert: { userId: auth.userId, username: auth.userId, subjects: defaultSubjects } },
      { upsert: true, returnDocument: 'after' }
    ).lean();

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
    const guard = csrfGuard(req);
    if (guard) return guard;

    const auth = await requireAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`data:${auth.userId}`, 60, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    await connectDB();
    const body = await req.json();

    const MAX_BODY_BYTES = 10 * 1024 * 1024;
    const raw = JSON.stringify(body);
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const ALLOWED_FIELDS = ['goals', 'subjects', 'dailyScores', 'pyqData', 'revisions', 'studySessions', 'weeklyTarget', 'notificationPrefs', 'badge_study_hours', 'badge_streak'] as const;
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