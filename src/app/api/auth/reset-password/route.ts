import { NextRequest, NextResponse } from 'next/server';
import { getMasterDb, type UserRow } from '@/lib/auth-db';
import bcrypt from 'bcryptjs';

// POST /api/auth/reset-password
export async function POST(req: NextRequest) {
  try {
    const { username, recoveryCode, newPassword } = await req.json();

    if (!username || !recoveryCode || !newPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    const db = getMasterDb();
    const user = db.prepare('SELECT id, recoveryHash FROM users WHERE username = ?').get(username.toLowerCase()) as UserRow | undefined;

    if (!user || !user.recoveryHash) {
      return NextResponse.json({ error: 'Invalid username or recovery code' }, { status: 401 });
    }

    // Verify recovery code
    const isCodeValid = await bcrypt.compare(recoveryCode.replace(/-/g, ''), user.recoveryHash);
    if (!isCodeValid) {
      return NextResponse.json({ error: 'Invalid username or recovery code' }, { status: 401 });
    }

    // Reset password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(newPasswordHash, user.id);

    return NextResponse.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Password reset failed' }, { status: 500 });
  }
}
