import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    latestVersion: '3.2.1',
    minRequiredVersion: '3.2.1',
    apkUrl: 'https://github.com/wepexrm-bot/exam-prep-dashboard/releases/latest',
    releaseNotes: 'Security bug fixed',
  });
}
