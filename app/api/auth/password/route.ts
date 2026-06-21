import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';
import { requireAuth, hashPassword, comparePassword } from '@/lib/auth';
import { toObjectId } from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 });
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword))
    return NextResponse.json({ error: 'Password must be at least 8 characters with uppercase, lowercase, and a number' }, { status: 400 });

  const users = await getUsersCollection();
  const user = await users.findOne({ _id: toObjectId(auth.userId) });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 });

  const newHash = await hashPassword(newPassword);
  await users.updateOne({ _id: toObjectId(auth.userId) }, { $set: { passwordHash: newHash } });

  return NextResponse.json({ ok: true });
}
