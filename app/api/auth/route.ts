import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, ExamType } from '@/models/User';
import { AppData } from '@/models/AppData';
import { signToken } from '@/lib/auth';
import { EXAM_CONFIG } from '@/lib/constants';

export async function POST(req: NextRequest) {
  if (!process.env.MONGODB_URI)
    return NextResponse.json({ error: 'Server misconfiguration: MONGODB_URI missing' }, { status: 500 });
  if (!process.env.JWT_SECRET)
    return NextResponse.json({ error: 'Server misconfiguration: JWT_SECRET missing' }, { status: 500 });

  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    return NextResponse.json({ error: 'Database connection failed. Check MONGODB_URI.' }, { status: 500 });
  }

  try {
    const { username, password, examType, isRegister } = await req.json();

    if (!username || !password)
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });

    const exam: ExamType = examType === 'NET' ? 'NET' : 'GATE';

    // ── REGISTER ───────────────────────────────────────────
    if (isRegister) {
      const existing = await User.findOne({ username: username.toLowerCase() });
      if (existing)
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });

      const user = new User({ username: username.toLowerCase(), password, examType: exam });
      await user.save();

      // Seed AppData with subjects for their exam
      const subjects = EXAM_CONFIG[exam].subjects.map(name => ({
        name, pct: 0, completed: false, chapters: [],
      }));
      await AppData.create({ username: user.username, subjects });

      const token = signToken({ user: user.username, examType: exam });
      const response = NextResponse.json({ ok: true, user: user.username, examType: exam });
      response.cookies.set('gate_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      return response;
    }

    // ── LOGIN ──────────────────────────────────────────────
    let user = await User.findOne({ username: username.toLowerCase() });

    // First-run admin seeding from env
    if (!user) {
      const adminUser = (process.env.ADMIN_USER || 'admin').toLowerCase();
      const adminPass = process.env.ADMIN_PASS || 'gate2026';
      if (username.toLowerCase() === adminUser && password === adminPass) {
        user = new User({ username: adminUser, password: adminPass, examType: 'GATE' });
        await user.save();
        try {
          await AppData.create({
            username: adminUser,
            subjects: EXAM_CONFIG['GATE'].subjects.map(name => ({ name, pct: 0, completed: false, chapters: [] })),
          });
        } catch { /* already exists */ }
      } else {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    } else {
      const valid = await user.comparePassword(password);
      if (!valid)
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({ user: user.username, examType: user.examType });
    const response = NextResponse.json({ ok: true, user: user.username, examType: user.examType });
    response.cookies.set('gate_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('gate_token');
  return response;
}
