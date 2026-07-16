import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection, connectDB } from '@/lib/db';
import { hashPassword, signToken, TOKEN_NAME, generateVerificationCode } from '@/lib/auth';
import { ExamConfig } from '@/models/ExamConfig';
import { checkRateLimit } from '@/lib/rateLimit';
import { sendVerificationEmail } from '@/lib/email';
import { csrfGuard } from '@/lib/csrf';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function POST(req: NextRequest) {
  try {
    const guard = csrfGuard(req);
    if (guard) return guard;

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
      return NextResponse.json({ error: 'Registration failed' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const code = generateVerificationCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    let userId: string;
    if (existing && !existing.verified) {
      await users.updateOne(
        { email: normalizedEmail },
        { $set: { name, passwordHash, examType, examYear: Number(examYear), verified: false, verificationCode: code, verificationExpires: expires } }
      );
      userId = existing._id!.toString();
    } else {
      const result = await users.insertOne({
        email: normalizedEmail,
        name,
        passwordHash,
        examType,
        examYear: Number(examYear),
        verified: false,
        verificationCode: code,
        verificationExpires: expires,
        createdAt: new Date(),
      });
      userId = result.insertedId.toString();
    }

    const emailResult = await sendVerificationEmail(normalizedEmail, name, code);

    return NextResponse.json({ success: true, needsVerification: true, email: normalizedEmail, emailSent: emailResult.success });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
