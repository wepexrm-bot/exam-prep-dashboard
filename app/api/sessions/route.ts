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
    if (!checkRateLimit(`sessions:${auth.userId}`, 60, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    await connectDB();
    const session = await req.json();

    await AppData.findOneAndUpdate(
      { userId: auth.userId },
      { $push: { studySessions: session }, $set: { lastUpdated: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Sessions POST error:', err);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const doc = await AppData.findOne({ userId: auth.userId }, 'studySessions').lean() as { studySessions?: unknown[] } | null;
    return NextResponse.json(doc?.studySessions || []);
  } catch (err) {
    console.error('Sessions GET error:', err);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}
