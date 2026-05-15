import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';
import { DEFAULT_SUBJECTS } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  let doc = await AppData.findOne({ username: auth.user }).lean();

  if (!doc) {
    doc = await AppData.create({
      username: auth.user,
      subjects: DEFAULT_SUBJECTS.map((name) => ({ name, pct: 0, completed: false, chapters: [] })),
    });
  }

  return NextResponse.json(doc);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  body.lastUpdated = new Date();

  const doc = await AppData.findOneAndUpdate(
    { username: auth.user },
    { $set: body },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json(doc);
}
