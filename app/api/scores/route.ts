import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { csrfGuard } from '@/lib/csrf';

export async function POST(req: NextRequest) {
  try {
    const guard = csrfGuard(req);
    if (guard) return guard;

    const auth = await requireAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`scores:${auth.userId}`, 60, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    await connectDB();
    const entry = await req.json();

    const title = entry.title || '';
    const existingDoc = await AppData.findOne({ userId: auth.userId }, 'dailyScores').lean() as { dailyScores?: any[] } | null;
    const scores: any[] = existingDoc?.dailyScores || [];
    const idx = scores.findIndex((s: any) => s.date === entry.date && (s.title || '') === title);

    let newScores: any[];
    if (idx >= 0) {
      newScores = [...scores.slice(0, idx), entry, ...scores.slice(idx + 1)];
    } else {
      newScores = [...scores, entry];
    }

    await AppData.updateOne(
      { userId: auth.userId },
      { $set: { dailyScores: newScores, lastUpdated: new Date() } }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Scores POST error:', err);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const guard = csrfGuard(req);
    if (guard) return guard;

    const auth = await requireAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`scores:${auth.userId}`, 60, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

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
