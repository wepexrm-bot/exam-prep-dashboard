import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';

// POST /api/scores  — upsert today's score
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const entry = await req.json(); // { date, score, accuracy, hours }

  let doc = await AppData.findOne({ userId: auth.userId });
  if (!doc) doc = await AppData.findOne({ username: auth.name });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const idx = doc.dailyScores.findIndex((s: { date: string }) => s.date === entry.date);
  if (idx >= 0) {
    doc.dailyScores[idx] = entry;
  } else {
    doc.dailyScores.push(entry);
  }
  doc.lastUpdated = new Date();
  await doc.save();
  return NextResponse.json({ ok: true });
}

// DELETE /api/scores?date=YYYY-MM-DD
export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const date = req.nextUrl.searchParams.get('date');

  await AppData.updateOne(
    { userId: auth.userId },
    { $pull: { dailyScores: { date } }, $set: { lastUpdated: new Date() } }
  );
  return NextResponse.json({ ok: true });
}
