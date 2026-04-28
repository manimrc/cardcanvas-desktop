import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/whiteboard — Get whiteboard content
export async function GET() {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM whiteboard WHERE id = ?').get('default') as {
      id: string;
      content: string;
      updatedAt: string;
    } | undefined;

    if (!row) {
      return NextResponse.json({ id: 'default', content: '', updatedAt: new Date().toISOString() });
    }
    return NextResponse.json(row);
  } catch (error) {
    console.error('Error fetching whiteboard:', error);
    return NextResponse.json({ error: 'Failed to fetch whiteboard' }, { status: 500 });
  }
}

// PUT /api/whiteboard — Save whiteboard content
export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const now = new Date().toISOString();

    db.prepare('UPDATE whiteboard SET content = ?, updatedAt = ? WHERE id = ?').run(
      body.content || '',
      now,
      'default'
    );

    return NextResponse.json({ id: 'default', content: body.content, updatedAt: now });
  } catch (error) {
    console.error('Error saving whiteboard:', error);
    return NextResponse.json({ error: 'Failed to save whiteboard' }, { status: 500 });
  }
}
