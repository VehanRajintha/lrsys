import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findUserByIdentifier, recordUserLogin, toSafeUser } from '@/lib/userDb';
import { verifyPassword, createSessionToken } from '@/lib/cryptoUtils';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Identifier (email or username) and password are required.' },
        { status: 400 }
      );
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials. Access restricted to authorized Customs personnel.' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account disabled. Please contact your System Developer or Administrator.' },
        { status: 403 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials. Access restricted to authorized Customs personnel.' },
        { status: 401 }
      );
    }

    // 7 days expiration
    const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const token = createSessionToken({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      exp
    });

    await recordUserLogin(user.id);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });

    return NextResponse.json({
      success: true,
      user: toSafeUser(user),
      message: `Authenticated successfully as ${user.role}`
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Authentication service error' },
      { status: 500 }
    );
  }
}

