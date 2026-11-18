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
  const CAN_MANAGE_ROLES = ['LRS', 'IC', 'APPRAISER', 'ASC', 'DC', 'DEV'];
  if (!CAN_MANAGE_ROLES.includes(role)) {
    return NextResponse.json(
      { error: 'Forbidden: Verifying declarations is restricted to authorized customs clearance.' },
      { status: 403 }
    );
  }

  const records = await db.getFreshRecords();
  for (const r of records) {
    if (r.status === 'NEEDS_REVIEW') {
      await db.updateRecord(r.id, { status: 'VERIFIED', manualCorrection: true });
    }
  }
  return NextResponse.json({ message: 'All pending records marked as verified', stats: db.getStats() });
}
