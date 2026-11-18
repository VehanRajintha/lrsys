import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getAllUsers, createUser } from '@/lib/userDb';
import { UserRole } from '@/lib/authTypes';

const ALLOWED_ROLES: UserRole[] = ['DEV', 'IC', 'APPRAISER', 'DDC', 'LRS', 'ASC', 'DC'];

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'DEV') {
      return NextResponse.json({ error: 'Access denied. Developer privileges required.' }, { status: 403 });
    }

    const users = await getAllUsers();
    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'DEV') {
      return NextResponse.json({ error: 'Access denied. Developer privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const { email, username, fullName, role, password } = body;

    if (!email || !username || !fullName || !role || !password) {
      return NextResponse.json(
        { error: 'All fields (email, username, full name, role, password) are required.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        { error: `Invalid role '${role}'. Must be one of: ${ALLOWED_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const newUser = await createUser({
      email,
      username,
      fullName,
      role: role as UserRole,
      password
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `User '${newUser.username}' created successfully with role ${newUser.role}.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create user.' }, { status: 400 });
  }
}

