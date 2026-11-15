import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import {
  subscribeToMessages,
  subscribeToReadEvents,
  subscribeToPresence,
  subscribeToMessageDeletions,
  subscribeToTyping,
  subscribeToMessageReactions,
  userConnected,
  userDisconnected
} from '@/lib/chatDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  // Register user as active online presence
  const currentOnlineUserIds = userConnected(session.id);

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event with current online user list
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            status: 'connected',
            user: session.username,
            userId: session.id,
            onlineUserIds: currentOnlineUserIds
          })}\n\n`
        )
      );

      // 1. Subscribe to realtime presence updates (green dots)
      const unsubscribePresence = subscribeToPresence((presence) => {
        try {
          controller.enqueue(
            encoder.encode(`event: presence_update\ndata: ${JSON.stringify(presence)}\n\n`)
          );
        } catch (err) {
          // Stream controller closed
        }
      });

      // 2. Subscribe to messages (1-on-1 private and Pinned Long Room Group Chat)
      const unsubscribeMessages = subscribeToMessages((msg) => {
        try {
          const isGroupMsg = msg.receiverId === 'group-long-room' || msg.channelId === 'group-long-room';
          if (isGroupMsg || msg.receiverId === session.id || msg.senderId === session.id) {
            controller.enqueue(
              encoder.encode(`event: new_message\ndata: ${JSON.stringify(msg)}\n\n`)
            );
          }
        } catch (err) {
          // Stream controller closed
        }
      });

      // 3. Subscribe to read receipt events (WhatsApp-style double-tick sync)
      const unsubscribeReads = subscribeToReadEvents((receipt) => {
        try {
          // If current user is either the partner whose messages got read, or the reader
          if (receipt.partnerId === session.id || receipt.readerId === session.id) {
            controller.enqueue(
              encoder.encode(`event: read_receipt\ndata: ${JSON.stringify(receipt)}\n\n`)
            );
          }
        } catch (err) {
          // Stream controller closed
        }
      });

      // 4. Subscribe to message deletion events (WhatsApp "This message was deleted")
      const unsubscribeDeletions = subscribeToMessageDeletions((payload) => {
        try {
          controller.enqueue(
            encoder.encode(`event: message_deleted\ndata: ${JSON.stringify(payload)}\n\n`)
          );
        } catch (err) {
          // Stream controller closed
        }
      });

      // 5. Subscribe to typing status events (WhatsApp live "typing...")
      const unsubscribeTyping = subscribeToTyping((payload) => {
        try {
          if (payload.partnerId === 'group-long-room') {
            if (payload.senderId !== session.id) {
              controller.enqueue(
                encoder.encode(`event: typing\ndata: ${JSON.stringify(payload)}\n\n`)
              );
            }
          } else if (payload.partnerId === session.id) {
            controller.enqueue(
              encoder.encode(`event: typing\ndata: ${JSON.stringify(payload)}\n\n`)
            );
          }
        } catch (err) {
          // Stream controller closed
        }
      });

      // 6. Subscribe to message reactions (WhatsApp emoji reactions)
      const unsubscribeReactions = subscribeToMessageReactions((payload) => {
        try {
          controller.enqueue(
            encoder.encode(`event: message_reaction\ndata: ${JSON.stringify(payload)}\n\n`)
          );
        } catch (err) {
          // Stream controller closed
        }
      });

      // Heartbeat ping every 20 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 20000);

      req.signal.addEventListener('abort', () => {
        userDisconnected(session.id);
        unsubscribePresence();
        unsubscribeMessages();
        unsubscribeReads();
        unsubscribeDeletions();
        unsubscribeTyping();
        unsubscribeReactions();
        clearInterval(pingInterval);
        try {
          controller.close();
        } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}
