import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const doc = await AppData.findOne({ username: auth.name }).lean() as Record<string, unknown> | null;
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const json = JSON.stringify(doc);
  return NextResponse.json({
    scores: (doc.dailyScores as unknown[])?.length ?? 0,
    sessions: (doc.studySessions as unknown[])?.length ?? 0,
    mockTests: (doc.mockTests as unknown[])?.length ?? 0,
    pyqEntries: (doc.pyqData as unknown[])?.length ?? 0,
    revisions: (doc.revisions as unknown[])?.length ?? 0,
    fileSizeKB: Math.round(Buffer.byteLength(json, 'utf8') / 1024),
  });
}
