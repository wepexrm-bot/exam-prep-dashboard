import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection, connectDB } from '@/lib/db';
import { hashPassword, signToken, TOKEN_NAME } from '@/lib/auth';
import { ExamConfig } from '@/models/ExamConfig';
import { checkRateLimit } from '@/lib/rateLimit';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, examType, examYear } = await req.json();

    if (!name || !email || !password || !examType || !examYear) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`signup:${ip}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many signup attempts from this IP. Try again later.' }, { status: 429 });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json({ error: 'Password must be at least 8 characters with uppercase, lowercase, and a number' }, { status: 400 });
    }

    await connectDB();
    const validExam = await ExamConfig.findOne({ examId: examType, active: true }).lean();
    if (!validExam) {
      return NextResponse.json({ error: 'Invalid exam type' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = await getUsersCollection();

    const existing = await users.findOne({ email: normalizedEmail });
    if (existing && existing.verified) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    let userId: string;
    if (existing && !existing.verified) {
      await users.updateOne(
        { email: normalizedEmail },
        { $set: { name, passwordHash, examType, examYear: Number(examYear), verified: true } }
      );
      userId = existing._id!.toString();
    } else {
      const result = await users.insertOne({
        email: normalizedEmail,
        name,
        passwordHash,
        examType,
        examYear: Number(examYear),
        verified: true,
        createdAt: new Date(),
      });
      userId = result.insertedId.toString();
    }

    const token = signToken({ userId, email: normalizedEmail, name, examType });

    const res = NextResponse.json({ success: true, name, examType });
    res.cookies.set(TOKEN_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
