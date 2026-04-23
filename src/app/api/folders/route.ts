import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/folders - Get all folders with nested structure
export async function GET() {
  try {
    const db = getDb();
    const folders = db.prepare('SELECT * FROM folders ORDER BY name').all();
    const boards = db.prepare('SELECT * FROM boards ORDER BY name').all();
    return NextResponse.json({ folders, boards });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

// POST /api/folders - Create a new folder
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare('INSERT INTO folders (id, parentId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)').run(
      id, body.parentId || null, body.name || 'New Folder', now, now
    );

    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}

// PUT /api/folders - Rename a folder
export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const now = new Date().toISOString();

    db.prepare('UPDATE folders SET name = ?, updatedAt = ? WHERE id = ?').run(body.name, now, body.id);
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(body.id);
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

// DELETE /api/folders
export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    db.prepare('DELETE FROM folders WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
