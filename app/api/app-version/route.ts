import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    latestVersion: '3.3.1',
    minRequiredVersion: '3.3.1',
    apkUrl: 'https://github.com/wepexrm-bot/exam-prep-dashboard/releases/latest',
    releaseNotes: 'Rebuilt APK now connects to the new server (targetzero-app.onrender.com). Study timer auto-saves at 11:57 PM so late-night sessions are never lost across midnight, overnight timers are saved to the previous day, and the current streak badge now appears correctly beside your name.',
  });
}
