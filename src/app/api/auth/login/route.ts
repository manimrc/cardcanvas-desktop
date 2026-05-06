import { NextRequest, NextResponse } from 'next/server';
import { getMasterDb, type UserRow } from '@/lib/auth-db';
import { createSessionToken } from '@/lib/session';
import bcrypt from 'bcryptjs';

// POST /api/auth/login — Authenticate and set session cookie
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const db = getMasterDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase()) as UserRow | undefined;

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = createSessionToken(user.id, user.username, user.displayName);

    const response = NextResponse.json({
      user: { id: user.id, username: user.username, displayName: user.displayName },
    });

    response.cookies.set('cc_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
