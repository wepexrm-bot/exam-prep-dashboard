import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) {
  throw new Error('JWT_SECRET is not set in environment variables');
}
const JWT_SECRET: string = rawSecret;
export const TOKEN_NAME = 'gate_token';

export interface AuthPayload {
  userId: string;
  email: string;
  name: string;
  examType: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as unknown as AuthPayload;
  } catch {
    return null;
  }
}

// ── requireAuth — used by all existing API routes ─────────────────────────────
// Reads the JWT from the cookie and returns the payload, or null if invalid.
// Compatible with both old and new JWT shape.

export function requireAuth(req: NextRequest): AuthPayload | null {
  // Try cookie from request headers first
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${TOKEN_NAME}=([^;]+)`));
  const token = match?.[1];
  if (!token) return null;
  return verifyToken(token);
}

// Server component version — reads from next/headers (for layouts/pages)
export function getServerAuth(): AuthPayload | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}