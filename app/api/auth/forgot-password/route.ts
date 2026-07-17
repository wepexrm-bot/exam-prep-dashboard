import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';
import { generateVerificationCode } from '@/lib/auth';
import { sendResetEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rateLimit';
import { csrfGuard } from '@/lib/csrf';

export async function POST(req: NextRequest) {
  try {
    const guard = csrfGuard(req);
    if (guard) return guard;

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`forgot-password:${ip}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = await getUsersCollection();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user || !user.verified) {
      return NextResponse.json({ success: true });
    }

    const code = generateVerificationCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await users.updateOne(
      { email: normalizedEmail },
      { $set: { verificationCode: code, verificationExpires: expires, verifyAttempts: 0 } }
    );

    const emailResult = await sendResetEmail(normalizedEmail, user.name, code);
    if (!emailResult.success) {
      return NextResponse.json({ error: 'Failed to send email. Please try again later.' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}