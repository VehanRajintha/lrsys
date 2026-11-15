import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { SessionPayload, SafeUser } from './authTypes';
import { verifySessionToken } from './cryptoUtils';
import { findUserById, toSafeUser } from './userDb';

export const SESSION_COOKIE_NAME = 'lrsys_session';

/**
 * Get the verified session payload from Next.js server components or route handlers
 */
export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch (err) {
    return null;
  }
}

/**
 * Get current authenticated user details from server context
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const session = await getServerSession();
  if (!session) return null;
  const user = await findUserById(session.id);
  if (!user || !user.isActive) return null;
  return toSafeUser(user);
}

/**
 * Extract and verify session token from an incoming NextRequest
 */
export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return verifySessionToken(cookie);
}

