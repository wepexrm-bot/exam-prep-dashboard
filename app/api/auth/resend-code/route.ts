import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';
import { generateVerificationCode } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`resend:${ip}`, 5, 30 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many resend requests. Try again later.' }, { status: 429 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = await getUsersCollection();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) return NextResponse.json({ error: 'No account found for this email' }, { status: 404 });
    if (user.verified) return NextResponse.json({ error: 'Account already verified' }, { status: 400 });

    const code = generateVerificationCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await users.updateOne(
      { email: normalizedEmail },
      { $set: { verificationCode: code, verificationExpires: expires } }
    );

    const emailResult = await sendVerificationEmail(normalizedEmail, user.name, code);
    if (!emailResult.success) {
      return NextResponse.json({ error: 'Failed to resend email. Please try again in a moment.' }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Resend code error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}