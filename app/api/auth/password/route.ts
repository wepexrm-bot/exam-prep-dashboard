import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';
import { requireAuth, hashPassword, comparePassword, TOKEN_NAME } from '@/lib/auth';
import { toObjectId } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimit';
import { csrfGuard } from '@/lib/csrf';

export async function POST(req: NextRequest) {
  try {
    const guard = csrfGuard(req);
    if (guard) return guard;

    const auth = await requireAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`password:${auth.userId}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
    }

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
    const tv = (user.tokenVersion ?? 0) + 1;
    await users.updateOne(
      { _id: toObjectId(auth.userId) },
      { $set: { passwordHash: newHash, tokenVersion: tv } }
    );

    const res = NextResponse.json({ ok: true });
    res.cookies.set(TOKEN_NAME, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' });
    return res;
  } catch (err) {
    console.error('Password change error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
