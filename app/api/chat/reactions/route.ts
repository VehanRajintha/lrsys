import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { toggleMessageReaction } from '@/lib/chatDb';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messageId, emoji } = body;

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'messageId and emoji are required' }, { status: 400 });
    }

    const result = toggleMessageReaction(
      messageId,
      session.id,
      session.fullName || session.username,
      emoji
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, reactions: result.reactions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
