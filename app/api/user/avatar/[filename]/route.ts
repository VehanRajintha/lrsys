import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const DATA_AVATARS_DIR = path.join(process.cwd(), 'data', 'avatars');
const PUBLIC_AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars');

const MIME_MAP: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename) {
      return new NextResponse('Filename required', { status: 400 });
    }

    const cleanFilename = filename.split('?')[0];
    const safeFilename = path.basename(cleanFilename);

    let filePath = path.join(DATA_AVATARS_DIR, safeFilename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(PUBLIC_AVATARS_DIR, safeFilename);
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Avatar not found', { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = MIME_MAP[ext] || 'image/webp';
    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': 'inline'
      }
    });
  } catch (err: any) {
    console.error('[Avatar Serve Error]:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
