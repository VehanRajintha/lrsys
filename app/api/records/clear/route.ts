import { NextRequest, NextResponse } from 'next/server';
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
      { error: 'Forbidden: Clearing ledger is restricted to LRS & IC clearance.' },
      { status: 403 }
    );
  }

  await db.clearAllRecords();
  queue.resetStats();
  return NextResponse.json({ message: 'All records cleared', stats: db.getStats() });
}
