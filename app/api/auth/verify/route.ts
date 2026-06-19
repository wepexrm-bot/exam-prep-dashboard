import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';
import { signToken, TOKEN_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = await getUsersCollection();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: 'No account found for this email' }, { status: 404 });
    }
    if (user.verified) {
      return NextResponse.json({ error: 'This account is already verified. Please log in.' }, { status: 400 });
    }
    if (!user.verificationCode || !user.verificationExpires) {
      return NextResponse.json({ error: 'No verification code found. Please sign up again.' }, { status: 400 });
    }
    if (new Date() > new Date(user.verificationExpires)) {
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
    }
    if (user.verificationCode !== code.trim()) {
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 });
    }

    await users.updateOne(
      { email: normalizedEmail },
      { $set: { verified: true }, $unset: { verificationCode: '', verificationExpires: '' } }
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
