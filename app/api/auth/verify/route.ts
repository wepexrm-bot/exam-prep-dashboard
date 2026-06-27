import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';
import { signToken, TOKEN_NAME } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`verify:${ip}`, 15, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many verification attempts. Try again in 15 minutes.' }, { status: 429 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = await getUsersCollection();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }
    if (user.verified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
    }

    if (code !== user.verificationCode) {
      const attempts = (user.verifyAttempts || 0) + 1;
      await users.updateOne({ email: normalizedEmail }, { $set: { verifyAttempts: attempts } });
      if (attempts >= 5) {
        await users.updateOne({ email: normalizedEmail }, { $unset: { verificationCode: '', verificationExpires: '' } });
        return NextResponse.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    if (user.verificationExpires && new Date() > user.verificationExpires) {
      return NextResponse.json({ error: 'Verification code expired. Request a new one.' }, { status: 400 });
    }

    await users.updateOne(
      { email: normalizedEmail },
      { $set: { verified: true }, $unset: { verificationCode: '', verificationExpires: '', verifyAttempts: '' } }
    );

    const token = signToken({
      userId: user._id!.toString(),
      email: user.email,
      name: user.name,
      examType: user.examType,
    });

    const res = NextResponse.json({ success: true, name: user.name, examType: user.examType });
    res.cookies.set(TOKEN_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
