import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    latestVersion: '3.1.2',
    minRequiredVersion: '3.0.0',
    apkUrl: 'https://github.com/wepexrm-bot/exam-prep-dashboard/releases/latest',
    releaseNotes: 'Fixed goal carryover bugs, added deadline extension.',
  });
}
