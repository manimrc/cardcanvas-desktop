import { NextResponse } from 'next/server';

// POST /api/auth/logout — Clear session cookie
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('cc_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
