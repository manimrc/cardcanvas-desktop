import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/cards?boardId=xxx
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get('boardId');
    const id = searchParams.get('id');

    if (id) {
      const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
      if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
      return NextResponse.json(card);
    }

    if (!boardId) {
      const all = searchParams.get('all');
      if (all === '1' || all === 'true') {
        const rows = db.prepare('SELECT * FROM cards ORDER BY boardId ASC, zIndex ASC').all() as Record<string, unknown>[];
        return NextResponse.json(rows.map(c => ({ ...c, tags: JSON.parse(String(c.tags || '[]')) })));
      }
      return NextResponse.json({ error: 'Missing boardId' }, { status: 400 });
    }

    const cards = db.prepare('SELECT * FROM cards WHERE boardId = ? ORDER BY zIndex ASC').all(boardId) as any[];
    return NextResponse.json(cards.map(c => ({ ...c, tags: JSON.parse(c.tags || '[]') })));
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

// POST /api/cards - Create a new card
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const id = uuidv4();
    const now = new Date().toISOString();

    // Get the max zIndex in this board
    const maxZ = db.prepare('SELECT MAX(zIndex) as maxZ FROM cards WHERE boardId = ?').get(body.boardId) as { maxZ: number | null };
    const zIndex = (maxZ?.maxZ || 0) + 1;

    db.prepare(`
      INSERT INTO cards (id, boardId, type, title, content, url, color, x, y, width, height, zIndex, tags, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.boardId,
      body.type || 'richtext',
      body.title || '',
      body.content || '',
      body.url || null,
      body.color || '#FFF9C4',
      body.x ?? 200,
      body.y ?? 200,
      body.width ?? 280,
      body.height ?? 200,
      zIndex,
      body.tags ? JSON.stringify(body.tags) : '[]',
      now,
      now
    );

    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as any;
    if (card) card.tags = JSON.parse(card.tags || '[]');
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}

// PUT /api/cards - Update card
export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(body.id) as Record<string, unknown>;
    if (!existing) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

    db.prepare(`
      UPDATE cards SET
        type = COALESCE(?, type),
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        url = COALESCE(?, url),
        color = COALESCE(?, color),
        x = COALESCE(?, x),
        y = COALESCE(?, y),
        width = COALESCE(?, width),
        height = COALESCE(?, height),
        zIndex = COALESCE(?, zIndex),
        tags = COALESCE(?, tags),
        updatedAt = ?
      WHERE id = ?
    `).run(
      body.type ?? null,
      body.title ?? null,
      body.content ?? null,
      body.url ?? null,
      body.color ?? null,
      body.x ?? null,
      body.y ?? null,
      body.width ?? null,
      body.height ?? null,
      body.zIndex ?? null,
      body.tags ? JSON.stringify(body.tags) : null,
      now,
      body.id
    );

    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(body.id) as any;
    if (card) card.tags = JSON.parse(card.tags || '[]');
    return NextResponse.json(card);
  } catch (error) {
    console.error('Error updating card:', error);
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}

// DELETE /api/cards
export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    db.prepare('DELETE FROM cards WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
