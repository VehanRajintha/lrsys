import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
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
      { error: 'Forbidden: Bulk delete is restricted to authorized customs clearance.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const ids = body.ids;
  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json({ error: 'Array of ids is required' }, { status: 400 });
  }
  const count = await db.deleteRecords(ids);
  return NextResponse.json({ message: `Deleted ${count} records`, count, stats: db.getStats() });
}
