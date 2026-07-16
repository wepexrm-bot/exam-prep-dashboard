import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';
import { comparePassword, signToken, TOKEN_NAME } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { csrfGuard } from '@/lib/csrf';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60,
  path: '/',
};

// LOGIN
export async function POST(req: NextRequest) {
  try {
    const guard = csrfGuard(req);
    if (guard) return guard;

    const { email, password } = await req.json();

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many login attempts. Try again in 15 minutes.' }, { status: 429 });
    }
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = await getUsersCollection();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.verified) {
      return NextResponse.json({ error: 'Please verify your email before logging in', needsVerification: true, email: normalizedEmail }, { status: 403 });
    }

    const token = signToken({
      userId: user._id!.toString(),
      email: user.email,
      name: user.name,
      examType: user.examType,
      tokenVersion: user.tokenVersion ?? 0,
    });

    const res = NextResponse.json({ success: true, name: user.name, examType: user.examType });
    res.cookies.set(TOKEN_NAME, token, COOKIE_OPTS);
    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

// LOGOUT
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(TOKEN_NAME, '', { ...COOKIE_OPTS, maxAge: 0 });
  return res;
}
