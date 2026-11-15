import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import {
  getPrivateMessages,
  savePrivateMessage,
  markConversationAsRead,
  GROUP_CHANNEL_ID,
  getGroupMessages,
  saveGroupMessage,
  markGroupAsRead,
  deleteMessage
} from '@/lib/chatDb';
import { findUserById } from '@/lib/userDb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get('partnerId') || searchParams.get('receiverId');

    if (!partnerId) {
      return NextResponse.json(
        { error: 'partnerId is required for chat' },
        { status: 400 }
      );
    }

    // 1. PINNED GROUP CHAT: Long Room Operations (All Officers)
    if (partnerId === GROUP_CHANNEL_ID) {
      const messages = getGroupMessages(250);
      markGroupAsRead(session.id);
      return NextResponse.json(
        {
          success: true,
          partnerId: GROUP_CHANNEL_ID,
          isGroup: true,
          messages
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
          }
        }
      );
    }

    // 2. 1-on-1 private messages between session user and partner
    const messages = getPrivateMessages(session.id, partnerId);

    // Automatically mark unread messages from partner as read
    markConversationAsRead(session.id, partnerId);

    return NextResponse.json(
      {
        success: true,
        partnerId,
        messages
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { content, receiverId, tag, type, attachment } = body;

    if ((!content || !content.trim()) && !attachment) {
      return NextResponse.json({ error: 'Message content or attachment is required' }, { status: 400 });
    }

    if (!receiverId || (receiverId !== GROUP_CHANNEL_ID && receiverId === session.id)) {
      return NextResponse.json(
        { error: 'A valid individual officer receiverId or group ID is required' },
        { status: 400 }
      );
    }

    let displayContent = (content || '').trim();
    if (!displayContent && attachment) {
      if (attachment.fileType?.startsWith('audio/')) {
        displayContent = `🎙️ Voice Note (${Math.round(attachment.duration || 0)}s)`;
      } else if (attachment.fileType?.startsWith('image/')) {
        displayContent = `📷 ${attachment.fileName || 'Image'}`;
      } else {
        displayContent = `📄 ${attachment.fileName || 'Document'}`;
      }
    }

    // 1. PINNED GROUP CHAT: Long Room Operations (Broadcast to All Officers)
    if (receiverId === GROUP_CHANNEL_ID) {
      const message = saveGroupMessage({
        senderId: session.id,
        senderName: session.fullName,
        senderUsername: session.username,
        senderRole: session.role,
        content: displayContent,
        type,
        attachment,
        tag
      });

      return NextResponse.json({ success: true, message });
    }

    // 2. 1-on-1 Private Message
    const recipient = await findUserById(receiverId);

    const message = savePrivateMessage({
      senderId: session.id,
      senderName: session.fullName,
      senderUsername: session.username,
      senderRole: session.role,
      receiverId,
      receiverName: recipient ? recipient.fullName : undefined,
      content: displayContent,
      type,
      attachment,
      tag
    });

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { partnerId } = body;

    if (!partnerId) {
      return NextResponse.json({ error: 'partnerId is required' }, { status: 400 });
    }

    if (partnerId === GROUP_CHANNEL_ID) {
      markGroupAsRead(session.id);
      return NextResponse.json({ success: true });
    }

    markConversationAsRead(session.id, partnerId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    const isAdmin = session.role === 'DEV';
    const result = deleteMessage(messageId, session.id, isAdmin);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true, messageId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
