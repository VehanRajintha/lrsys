import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import * as db from '@/lib/db';
import queue from '@/lib/queue';
import { getServerSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Session required.' }, { status: 401 });
  }
  const role = session.role;
  if (role !== 'LRS' && role !== 'IC' && role !== 'DEV') {
    return NextResponse.json(
      { error: 'Forbidden: Reprocessing unverified declarations is restricted to LRS & IC clearance.' },
      { status: 403 }
    );
  }

  const records = db.getRecords();
  const unknownRecords = records.filter(r =>
    r.consigneeName.includes('UNKNOWN') ||
    r.greenStampNumber === '000000' ||
    r.customsRefNumber === 'UNKNOWN' ||
    r.status === 'NEEDS_REVIEW'
  );

  if (unknownRecords.length === 0) {
    return NextResponse.json({ message: 'No unknown or unverified records to reprocess.', count: 0 });
  }

  // Collect existing image paths that are valid
  const toProcess: Array<{ filePath: string; originalName: string; fileHash: string | null }> = [];
  const idsToRemove: string[] = [];

  for (const r of unknownRecords) {
    const isCloud = (r.imageUrl && r.imageUrl.startsWith('http')) || (r.imagePath && r.imagePath.startsWith('http'));
    const isLocal = r.imagePath && fs.existsSync(r.imagePath);

    if (isCloud || isLocal) {
      toProcess.push({
        filePath: isCloud ? (r.imageUrl || r.imagePath) : r.imagePath,
        originalName: r.originalName || r.filename,
        fileHash: r.fileHash || null
      });
      idsToRemove.push(r.id);
    }
  }

  if (toProcess.length === 0) {
    return NextResponse.json({ error: 'No valid image files found for unknown records.' }, { status: 400 });
  }

  // Remove the old unknown records so fresh extractions take their place
  await db.deleteRecords(idsToRemove);

  queue.enqueue(toProcess);

  return NextResponse.json({
    message: `Enqueued ${toProcess.length} unverified declaration(s) for high-accuracy AI re-extraction.`,
    count: toProcess.length,
    status: queue.getStatus(),
    stats: db.getStats()
  });
}
