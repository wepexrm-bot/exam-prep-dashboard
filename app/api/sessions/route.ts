import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const session = await req.json(); // { start, end, durationSec }

  await AppData.updateOne(
    { userId: auth.userId },
    { $push: { studySessions: session }, $set: { lastUpdated: new Date() } }
  );
  return NextResponse.json({ ok: true });
}

// GET all sessions
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  let doc = await AppData.findOne({ userId: auth.userId }, 'studySessions').lean() as { studySessions?: unknown[] } | null;
  if (!doc) doc = await AppData.findOne({ username: auth.name }, 'studySessions').lean() as { studySessions?: unknown[] } | null;
  return NextResponse.json(doc?.studySessions || []);
}
