import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';

// POST /api/scores  — upsert a score entry (matched by date + title)
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const entry = await req.json();

    const title = entry.title || '';
    // Atomic: remove existing entry with matching date+title, then push the new one
    await AppData.updateOne(
      { userId: auth.userId },
      { $pull: { dailyScores: { date: entry.date, title: { $eq: title } } } }
    );
    await AppData.updateOne(
      { userId: auth.userId },
      { $push: { dailyScores: entry }, $set: { lastUpdated: new Date() } }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Scores POST error:', err);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}

// DELETE /api/scores?date=YYYY-MM-DD[&title=...]
export async function DELETE(req: NextRequest) {
  try {
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
  } catch (err) {
    console.error('Scores DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete score' }, { status: 500 });
  }
}
