import { cookies } from 'next/headers';
import crypto from 'crypto';

// Simple HMAC-based session tokens.
// In production you'd use JWT or a session store, but for a local-first
// app this is perfectly secure and dependency-free.
const SECRET = process.env.SESSION_SECRET || 'cardcanvas-local-secret-key-change-me';

interface SessionPayload {
  userId: string;
  username: string;
  displayName: string;
  exp: number; // expiry timestamp in ms
}

/** Create a signed session token */
export function createSessionToken(userId: string, username: string, displayName: string): string {
  const payload: SessionPayload = {
    userId,
    username,
    displayName,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

/** Verify and decode a session token. Returns null if invalid or expired. */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;

    const expectedSig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
    if (sig !== expectedSig) return null;

    const payload: SessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

/** Read the current session from the request cookies (for API routes). */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('cc_session')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Helper to get userId from the session, or null. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.userId ?? null;
}
