import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [/^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/, /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/]
  : [/^http:\/\/localhost:\d+$/];

export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // If neither header is present, allow (browser always sends Origin for cross-origin POST)
  if (!origin && !referer) return true;

  const source = origin || referer || '';
  return ALLOWED_ORIGINS.some(pattern => pattern.test(source));
}

export function csrfGuard(req: NextRequest): NextResponse | null {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
