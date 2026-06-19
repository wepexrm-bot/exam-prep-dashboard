import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';
import { hashPassword, generateVerificationCode } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, examType, examYear } = await req.json();

    if (!name || !email || !password || !examType || !examYear) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (!['GATE', 'NET'].includes(examType)) {
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
      return NextResponse.json({ error: 'Account created but failed to send verification email. Try resending.' }, { status: 207 });
    }

    return NextResponse.json({ success: true, email: normalizedEmail });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
