import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    latestVersion: '3.2.2',
    minRequiredVersion: '3.2.2',
    apkUrl: 'https://github.com/wepexrm-bot/exam-prep-dashboard/releases/latest',
    releaseNotes: 'Forgot password, security improvements, email verification, bug fixes.',
  });
}
