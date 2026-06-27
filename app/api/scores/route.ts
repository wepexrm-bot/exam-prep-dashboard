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

  // Atomic upsert: try to update existing entry matched by date+title
  const title = entry.title || '';
  const result = await AppData.updateOne(
    { userId: auth.userId, 'dailyScores.date': entry.date, 'dailyScores.title': title },
    { $set: { 'dailyScores.$': entry, lastUpdated: new Date() } }
  );
  if (result.modifiedCount === 0 && result.matchedCount === 0) {
    // No matching entry — push a new one
    await AppData.updateOne(
      { userId: auth.userId },
      { $push: { dailyScores: entry }, $set: { lastUpdated: new Date() } }
    );
  }
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
