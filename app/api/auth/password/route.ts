import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { currentPassword, newPassword } = await req.json();

  const user = await User.findOne({ username: auth.name });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const valid = await user.comparePassword(currentPassword);
  if (!valid) return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 });

  if (newPassword.length < 6)
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

  user.password = newPassword;
  await user.save();
  return NextResponse.json({ ok: true });
}
