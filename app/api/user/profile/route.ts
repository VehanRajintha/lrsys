import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { findUserById, updateUser, getAllUsers } from '@/lib/userDb';
import { createSessionToken } from '@/lib/cryptoUtils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await findUserById(session.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { passwordHash, salt, ...safeUser } = user;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { username, fullName, email, phone, department } = body;

    const currentUser = await findUserById(session.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updates: {
      username?: string;
      fullName?: string;
      email?: string;
      phone?: string;
      department?: string;
    } = {};

    if (username !== undefined) {
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      if (!cleanUsername || cleanUsername.length < 3) {
        return NextResponse.json({ error: 'Username must be at least 3 characters long.' }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores.' }, { status: 400 });
      }

      // Check if another user already has this username
      const allUsers = await getAllUsers();
      const duplicateUser = allUsers.find(
        (u) => u.username.toLowerCase() === cleanUsername && u.id !== session.id
      );
      if (duplicateUser) {
        return NextResponse.json({ error: 'That username is already claimed by another officer.' }, { status: 400 });
      }

      updates.username = cleanUsername;
    }

    if (fullName !== undefined) {
      const cleanName = fullName.trim();
      if (!cleanName) {
        return NextResponse.json({ error: 'Full name cannot be empty.' }, { status: 400 });
      }
      updates.fullName = cleanName;
    }

    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      // Basic email syntax check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ error: 'Please provide a valid email/Gmail address.' }, { status: 400 });
      }

      // Check if another user already has this email
      const allUsers = await getAllUsers();
      const duplicate = allUsers.find(
        (u) => u.email.toLowerCase() === cleanEmail && u.id !== session.id
      );
      if (duplicate) {
        return NextResponse.json({ error: 'That email is already registered to another officer.' }, { status: 400 });
      }

      updates.email = cleanEmail;
    }

    if (phone !== undefined) {
      updates.phone = phone.trim();
    }

    if (department !== undefined) {
      updates.department = department.trim();
    }

    const updated = await updateUser(session.id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
    }

    // Refresh session cookie with new username/details
    try {
      const cookieStore = await cookies();
      const token = createSessionToken({
        id: updated.id,
        email: updated.email,
        username: updated.username,
        fullName: updated.fullName,
        role: updated.role,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      });
      cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      });
    } catch (cookieErr) {
      console.warn('[Session Cookie Refresh Notice]:', cookieErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

