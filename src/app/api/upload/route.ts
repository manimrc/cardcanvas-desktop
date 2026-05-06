import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';
import { v4 as uuidv4 } from 'uuid';

// POST /api/upload - Upload a file (image or PDF)
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb(userId);
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const cardId = (formData.get('cardId') as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const id = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());

    db.prepare('INSERT INTO uploads (id, cardId, filename, mimetype, data, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, cardId, file.name, file.type || 'application/octet-stream', buffer, new Date().toISOString()
    );

    return NextResponse.json({ id, filename: file.name, mimetype: file.type || 'application/octet-stream' }, { status: 201 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

// GET /api/upload?id=xxx - Get an uploaded file
export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb(userId);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const upload = db.prepare('SELECT * FROM uploads WHERE id = ?').get(id) as { data: Buffer; mimetype: string; filename: string } | undefined;

    if (!upload) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return new NextResponse(new Uint8Array(upload.data), {
      headers: {
        'Content-Type': upload.mimetype,
        'Content-Disposition': `inline; filename="${upload.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error fetching upload:', error);
    return NextResponse.json({ error: 'Failed to fetch upload' }, { status: 500 });
  }
}
