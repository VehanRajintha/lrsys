import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getAllUsers } from '@/lib/userDb';
import { getConversationsSummary, getTotalUnreadCount } from '@/lib/chatDb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allUsers = await getAllUsers();
    // Return individual officer conversation summaries
    const conversations = getConversationsSummary(session.id, allUsers);
    const unreadTotal = getTotalUnreadCount(session.id);

    return NextResponse.json(
      {
        success: true,
        conversations,
        contacts: conversations, // backward compatibility
        unreadTotal
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
