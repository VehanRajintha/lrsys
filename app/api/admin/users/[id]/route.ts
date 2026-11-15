import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { updateUser, deleteUser } from '@/lib/userDb';
import { UserRole } from '@/lib/authTypes';

const ALLOWED_ROLES: UserRole[] = ['DEV', 'IC', 'APPRAISER', 'DDC', 'LRS'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'DEV') {
      return NextResponse.json({ error: 'Access denied. Developer privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { role, isActive, fullName, newPassword } = body;

    if (role && !ALLOWED_ROLES.includes(role as UserRole)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    if (newPassword && newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
    }

    const updated = await updateUser(id, {
      role: role as UserRole,
      isActive,
      fullName,
      newPassword
    });

    if (!updated) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: updated,
      message: `User '${updated.username}' updated successfully.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'DEV') {
      return NextResponse.json({ error: 'Access denied. Developer privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    await deleteUser(id);

    return NextResponse.json({
      success: true,
      message: 'User removed successfully.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

