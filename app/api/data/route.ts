import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';
import { EXAM_CONFIG } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  // Look up by userId first (new accounts), fall back to username (migrated admin account)
  let doc = await AppData.findOne({ userId: auth.nameId }).lean();
  if (!doc) {
    // Fallback for old admin data during migration period
    doc = await AppData.findOne({ username: auth.name }).lean();
    if (doc) {
      // Auto-migrate: attach userId to this document so future lookups use userId
      await AppData.findOneAndUpdate({ username: auth.name }, { $set: { userId: auth.nameId } });
    }
  }

  if (!doc) {
    // Brand new user — create fresh AppData with default subjects for their exam type
    const defaultSubjects = (EXAM_CONFIG[auth.examType]?.subjects || []).map((name: string) => ({
      name, pct: 0, completed: false, chapters: [],
    }));
    doc = await AppData.create({
      userId: auth.nameId,
      subjects: defaultSubjects,
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

  // Always save by userId for new/migrated accounts
  const doc = await AppData.findOneAndUpdate(
    { userId: auth.nameId },
    { $set: { ...body, userId: auth.nameId } },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json(doc);
}