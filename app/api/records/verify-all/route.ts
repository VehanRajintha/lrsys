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
      { error: 'Forbidden: Verifying declarations is restricted to LRS & IC clearance.' },
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
