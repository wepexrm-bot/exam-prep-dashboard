import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';

// POST /api/scores  — upsert a score entry (matched by date + title)
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const entry = await req.json();

  let doc = await AppData.findOne({ userId: auth.userId });
  if (!doc) doc = await AppData.findOne({ username: auth.name });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const matchKey = (s: { date: string; title?: string }) => s.date === entry.date && (s.title || '') === (entry.title || '');
  const idx = doc.dailyScores.findIndex(matchKey);
  if (idx >= 0) {
    doc.dailyScores[idx] = entry;
  } else {
    doc.dailyScores.push(entry);
  }
  doc.lastUpdated = new Date();
  await doc.save();
  return NextResponse.json({ ok: true });
}

// DELETE /api/scores?date=YYYY-MM-DD[&title=...]
export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const date = req.nextUrl.searchParams.get('date');
  const title = req.nextUrl.searchParams.get('title');

  const match: Record<string, unknown> = { date };
  if (title) match.title = title;

  await AppData.updateOne(
    { userId: auth.userId },
    { $pull: { dailyScores: match }, $set: { lastUpdated: new Date() } }
  );
  return NextResponse.json({ ok: true });
}
