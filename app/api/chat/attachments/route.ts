import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getServerSession } from '@/lib/auth';
import { ATTACHMENTS_DIR } from '@/lib/chatDb';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const durationRaw = formData.get('duration');
    const duration = durationRaw ? parseFloat(durationRaw.toString()) : undefined;

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No valid file provided' }, { status: 400 });
    }

    // Limit attachment size to 50 MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds maximum limit of 50 MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine extension safely
    let ext = path.extname(file.name || '');
    if (!ext) {
      if (file.type.includes('webm')) ext = '.webm';
      else if (file.type.includes('ogg')) ext = '.ogg';
      else if (file.type.includes('mp4') || file.type.includes('m4a')) ext = '.m4a';
      else if (file.type.includes('png')) ext = '.png';
      else if (file.type.includes('jpeg') || file.type.includes('jpg')) ext = '.jpg';
      else if (file.type.includes('pdf')) ext = '.pdf';
      else ext = '.bin';
    }

    const cleanBase = path.basename(file.name || 'attachment', ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const storedFilename = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${cleanBase}${ext}`;
    const destinationPath = path.join(ATTACHMENTS_DIR, storedFilename);

    // Ensure directory exists
    if (!fs.existsSync(ATTACHMENTS_DIR)) {
      fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
    }

    fs.writeFileSync(destinationPath, buffer);

    const attachmentUrl = `/api/chat/attachments/${storedFilename}`;

    return NextResponse.json({
      success: true,
      attachment: {
        url: attachmentUrl,
        fileName: file.name || storedFilename,
        fileType: file.type || 'application/octet-stream',
        fileSize: buffer.length,
        duration: duration && !isNaN(duration) ? duration : undefined
      }
    });
  } catch (err: any) {
    console.error('[Chat Attachment Upload Error]:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}

