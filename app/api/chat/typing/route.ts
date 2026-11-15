import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { broadcastTyping } from '@/lib/chatDb';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { partnerId, isTyping } = body;

    if (!partnerId) {
      return NextResponse.json({ error: 'partnerId is required' }, { status: 400 });
    }

    broadcastTyping(session.id, session.fullName, partnerId, Boolean(isTyping));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
