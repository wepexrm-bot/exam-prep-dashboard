import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    latestVersion: '3.3.0',
    minRequiredVersion: '3.3.0',
    apkUrl: 'https://github.com/wepexrm-bot/exam-prep-dashboard/releases/latest',
    releaseNotes: 'Study timer auto-saves at midnight, Google Fonts CSP fix, security improvements.',
  });
}
