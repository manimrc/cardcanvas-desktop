import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

// GET /api/auth/me — Check current session
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      displayName: session.displayName,
    },
  });
}
