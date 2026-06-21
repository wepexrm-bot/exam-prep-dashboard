import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ExamConfig } from '@/models/ExamConfig';

export async function GET() {
  try {
    await connectDB();
    const configs = await ExamConfig.find({ active: true }).sort({ order: 1 }).lean();
    return NextResponse.json({ configs });
  } catch (err) {
    console.error('Failed to fetch exam configs:', err);
    return NextResponse.json({ configs: [] }, { status: 500 });
  }
}
