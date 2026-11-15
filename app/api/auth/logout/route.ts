import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, getServerSession } from '@/lib/auth';
import { forceUserOffline } from '@/lib/chatDb';

export async function POST() {
  try {
    const session = await getServerSession();
    if (session) {
      forceUserOffline(session.id);
    }
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Logout failed' }, { status: 500 });
  }
}

