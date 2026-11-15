import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { getServerSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Session required.' }, { status: 401 });
  }
  const role = session.role;
  if (role !== 'LRS' && role !== 'IC' && role !== 'DEV') {
    return NextResponse.json(
      { error: 'Forbidden: Deduplication is restricted to LRS & IC clearance.' },
      { status: 403 }
    );
  }

  const mergedCount = await db.deduplicateExistingRecords();
  return NextResponse.json({
    message: `Deduplication complete. Cleaned up and removed ${mergedCount} duplicate record(s).`,
    mergedCount,
    stats: db.getStats()
  });
}
