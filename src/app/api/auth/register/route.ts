import { NextRequest, NextResponse } from 'next/server';
import { getMasterDb, type UserRow } from '@/lib/auth-db';
import { createSessionToken } from '@/lib/session';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// POST /api/auth/register — Create a new user account
export async function POST(req: NextRequest) {
  try {
    const { username, password, displayName } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }
    if (username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    const db = getMasterDb();

    // Check if username already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const name = displayName || username;

    // Generate a 12-character recovery code
    const rawRecoveryCode = Math.random().toString(36).substring(2, 14).toUpperCase();
    // Format as XXXX-XXXX-XXXX for readability
    const recoveryCode = `${rawRecoveryCode.substring(0, 4)}-${rawRecoveryCode.substring(4, 8)}-${rawRecoveryCode.substring(8, 12)}`;
    const recoveryHash = await bcrypt.hash(rawRecoveryCode, 10);

    db.prepare('INSERT INTO users (id, username, displayName, passwordHash, recoveryHash) VALUES (?, ?, ?, ?, ?)').run(
      id, username.toLowerCase(), name, passwordHash, recoveryHash
    );

    // Auto-login after registration
    const token = createSessionToken(id, username.toLowerCase(), name);

    const response = NextResponse.json({
      user: { id, username: username.toLowerCase(), displayName: name },
      recoveryCode, // Send to client to display once
    }, { status: 201 });

    response.cookies.set('cc_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
