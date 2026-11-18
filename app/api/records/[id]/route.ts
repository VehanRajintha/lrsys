import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { getServerSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const record = db.getRecordById(id);
  if (!record) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  }
  return NextResponse.json(record);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Session required.' }, { status: 401 });
  }
  const role = session.role;
  const CAN_MANAGE_ROLES = ['LRS', 'IC', 'APPRAISER', 'ASC', 'DC', 'DEV'];
  if (!CAN_MANAGE_ROLES.includes(role)) {
    return NextResponse.json(
      { error: 'Forbidden: Declaration editing is restricted to authorized customs clearance.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const updates = await request.json();
  const updated = await db.updateRecord(id, updates);
  if (!updated) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  }
  return NextResponse.json({ message: 'Record updated successfully', record: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Session required.' }, { status: 401 });
  }
  const role = session.role;
  const CAN_MANAGE_ROLES = ['LRS', 'IC', 'APPRAISER', 'ASC', 'DC', 'DEV'];
  if (!CAN_MANAGE_ROLES.includes(role)) {
    return NextResponse.json(
      { error: 'Forbidden: Deleting declarations is restricted to authorized customs clearance.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const deleted = await db.deleteRecord(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  }
  return NextResponse.json({ message: 'Record deleted', stats: db.getStats() });
}
