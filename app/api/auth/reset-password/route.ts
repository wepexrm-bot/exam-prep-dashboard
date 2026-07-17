import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { csrfGuard } from '@/lib/csrf';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function POST(req: NextRequest) {
  try {
    const guard = csrfGuard(req);
    if (guard) return guard;

    const { email, code, newPassword } = await req.json();
    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, code, and new password are required' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`reset-password:${ip}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return NextResponse.json({ error: 'Password must be at least 8 characters with uppercase, lowercase, and a number' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = await getUsersCollection();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: 'Reset failed' }, { status: 400 });
    }

    if (!user.verificationCode || (user.verificationExpires && new Date() > user.verificationExpires)) {
      return NextResponse.json({ error: 'Reset code expired. Request a new one.' }, { status: 400 });
    }

    if (code !== user.verificationCode) {
      const attempts = (user.verifyAttempts || 0) + 1;
      await users.updateOne({ email: normalizedEmail }, { $set: { verifyAttempts: attempts } });
      if (attempts >= 5) {
        await users.updateOne({ email: normalizedEmail }, { $unset: { verificationCode: '', verificationExpires: '' } });
        return NextResponse.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid reset code' }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    const tv = (user.tokenVersion ?? 0) + 1;

    await users.updateOne(
      { email: normalizedEmail },
      {
        $set: { passwordHash: newHash, tokenVersion: tv },
        $unset: { verificationCode: '', verificationExpires: '', verifyAttempts: '' },
      }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}