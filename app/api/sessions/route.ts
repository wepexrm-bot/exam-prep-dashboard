import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const session = await req.json();

    await AppData.updateOne(
      { userId: auth.userId },
      { $push: { studySessions: session }, $set: { lastUpdated: new Date() } }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Sessions POST error:', err);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}

// GET all sessions
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const doc = await AppData.findOne({ userId: auth.userId }, 'studySessions').lean() as { studySessions?: unknown[] } | null;
    return NextResponse.json(doc?.studySessions || []);
  } catch (err) {
    console.error('Sessions GET error:', err);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}
