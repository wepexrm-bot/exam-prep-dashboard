import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AppData } from '@/models/AppData';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  let doc = await AppData.findOne({ userId: auth.userId }).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const json = JSON.stringify(doc, null, 2);
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="gate-backup-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}
