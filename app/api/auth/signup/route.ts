import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection, connectDB } from '@/lib/db';
import { hashPassword, generateVerificationCode } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
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

    // Validate against the real ExamConfig collection — not a hardcoded
    // list — so newly seeded exams (e.g. GOVT) work without a code change.
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
    const code = generateVerificationCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    if (existing && !existing.verified) {
      // Re-signup attempt before verifying — update existing unverified record
      await users.updateOne(
        { email: normalizedEmail },
        {
          $set: {
            name, passwordHash, examType, examYear: Number(examYear),
            verificationCode: code, verificationExpires: expires,
          },
        }
      );
    } else {
      await users.insertOne({
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
    }

    const emailResult = await sendVerificationEmail(normalizedEmail, name, code);
    if (!emailResult.success) {
      const body: Record<string, unknown> = { error: 'Account created but failed to send verification email. Try resending.' };
      if (emailResult.code) body.devCode = emailResult.code;
      return NextResponse.json(body, { status: 207 });
    }

    return NextResponse.json({ success: true, email: normalizedEmail });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
