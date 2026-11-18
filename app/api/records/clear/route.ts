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
  const CAN_MANAGE_ROLES = ['LRS', 'IC', 'APPRAISER', 'ASC', 'DC', 'DEV'];
  if (!CAN_MANAGE_ROLES.includes(role)) {
    return NextResponse.json(
      { error: 'Forbidden: Clearing ledger is restricted to authorized customs clearance.' },
      { status: 403 }
    );
  }

  await db.clearAllRecords();
  queue.resetStats();
  return NextResponse.json({ message: 'All records cleared', stats: db.getStats() });
}
