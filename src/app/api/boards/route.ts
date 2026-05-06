import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';
import { v4 as uuidv4 } from 'uuid';

// GET /api/boards?folderId=xxx or GET /api/boards?id=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb(userId);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const folderId = searchParams.get('folderId');

    if (id) {
      const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
      if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 });
      return NextResponse.json(board);
    }

    if (folderId) {
      const boards = db.prepare('SELECT * FROM boards WHERE folderId = ? ORDER BY name').all(folderId);
      return NextResponse.json(boards);
    }

    const boards = db.prepare('SELECT * FROM boards ORDER BY updatedAt DESC').all();
    return NextResponse.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
  }
}

// POST /api/boards - Create a new board
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb(userId);
    const body = await req.json();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare('INSERT INTO boards (id, folderId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)').run(
      id, body.folderId, body.name || 'Untitled Board', now, now
    );

    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error('Error creating board:', error);
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}

// PUT /api/boards - Update board
export async function PUT(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb(userId);
    const body = await req.json();
    const now = new Date().toISOString();

    db.prepare('UPDATE boards SET name = ?, updatedAt = ? WHERE id = ?').run(body.name, now, body.id);
    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(body.id);
    return NextResponse.json(board);
  } catch (error) {
    console.error('Error updating board:', error);
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

// DELETE /api/boards
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb(userId);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    db.prepare('DELETE FROM boards WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting board:', error);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}
