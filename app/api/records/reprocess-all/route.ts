import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as db from '@/lib/db';
import queue from '@/lib/queue';
import { getServerSession } from '@/lib/auth';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Session required.' }, { status: 401 });
  }
  const role = session.role;
  if (role !== 'LRS' && role !== 'IC' && role !== 'DEV') {
    return NextResponse.json(
      { error: 'Forbidden: Reprocessing declarations is restricted to LRS & IC clearance.' },
      { status: 403 }
    );
  }

  const existingRecords = db.getRecords();
  await db.clearAllRecords();
  queue.resetStats();

  const toProcess: Array<{ filePath: string; originalName: string }> = [];
  const seenNames = new Set<string>();

  // Check cloud/existing records first
  for (const r of existingRecords) {
    const isCloud = (r.imageUrl && r.imageUrl.startsWith('http')) || (r.imagePath && r.imagePath.startsWith('http'));
    if (isCloud && !seenNames.has(r.filename)) {
      seenNames.add(r.filename);
      toProcess.push({
        filePath: r.imageUrl || r.imagePath,
        originalName: r.originalName || r.filename
      });
    }
  }

  // Also check local uploads directory
  if (fs.existsSync(UPLOADS_DIR)) {
    const files = fs.readdirSync(UPLOADS_DIR);
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const seenSizes = new Set<string>();

    files.forEach(f => {
      const fullPath = path.join(UPLOADS_DIR, f);
      const ext = path.extname(f).toLowerCase();
      if (validExts.includes(ext) && fs.existsSync(fullPath) && !seenNames.has(f)) {
        const stat = fs.statSync(fullPath);
        const key = `${stat.size}_${f.slice(f.indexOf('WhatsApp') > -1 ? f.indexOf('WhatsApp') : 0)}`;
        if (!seenSizes.has(key)) {
          seenSizes.add(key);
          seenNames.add(f);
          toProcess.push({
            filePath: fullPath,
            originalName: f
          });
        }
      }
    });
  }

  if (toProcess.length === 0) {
    return NextResponse.json({ error: 'No documents or images found to reprocess.' }, { status: 400 });
  }

  queue.enqueue(toProcess);

  return NextResponse.json({
    message: `Enqueued ${toProcess.length} images for AI re-processing.`,
    count: toProcess.length,
    status: queue.getStatus()
  });
}
