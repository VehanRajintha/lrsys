import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { ChatMessage, ConversationSummary, ChatAttachment, MessageType, MessageReaction } from './chatTypes';
import { SafeUser, UserRole } from './authTypes';

const DATA_DIR = path.join(process.cwd(), 'data');
const CHAT_FILE = path.join(DATA_DIR, 'chat_messages.json');
export const ATTACHMENTS_DIR = path.join(DATA_DIR, 'chat_attachments');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ATTACHMENTS_DIR)) {
    fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn(`[Chat DB Init]: ${err.message}`);
}

function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err: any) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  return defaultValue;
}

function writeJson<T>(filePath: string, data: T): void {
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err: any) {
    console.error(`Error writing ${filePath}:`, err.message);
  }
}

export const GROUP_CHANNEL_ID = 'group-long-room';
export const GROUP_CHANNEL_NAME = 'Long Room Operations';
export const GROUP_CHANNEL_HANDLE = 'all_officers';

export function getDmChannelId(userA: string, userB: string): string {
  const [first, second] = [userA, userB].sort();
  return `dm_${first}_${second}`;
}

// Initial realistic Long Room group broadcast messages
function createSeedGroupMessages(): ChatMessage[] {
  const t1 = new Date(Date.now() - 3600000 * 5).toISOString();
  const t2 = new Date(Date.now() - 3600000 * 4).toISOString();
  const t3 = new Date(Date.now() - 3600000 * 3).toISOString();
  const t4 = new Date(Date.now() - 3600000 * 2).toISOString();

  return [
    {
      id: 'msg-group-1',
      senderId: 'usr-ddc-01',
      senderName: 'Deputy Director of Customs',
      senderUsername: 'ddc_director',
      senderRole: 'DDC',
      receiverId: GROUP_CHANNEL_ID,
      receiverName: GROUP_CHANNEL_NAME,
      channelId: GROUP_CHANNEL_ID,
      content: '📌 Official Notice: Long Room Operations live frequency is now active for all officers. Use this pinned channel for urgent CusDec updates, verification requests, and daily duty sync.',
      createdAt: t1,
      isRead: true,
      tag: '[OFFICIAL-BULLETIN]'
    },
    {
      id: 'msg-group-2',
      senderId: 'usr-ic-01',
      senderName: 'Inspector of Customs (IC)',
      senderUsername: 'ic_officer',
      senderRole: 'IC',
      receiverId: GROUP_CHANNEL_ID,
      receiverName: GROUP_CHANNEL_NAME,
      channelId: GROUP_CHANNEL_ID,
      content: 'IC Station online. Counter stamp verification engine is running smoothly on the latest declaration batch.',
      createdAt: t2,
      isRead: true,
      tag: '[STATION-READY]'
    },
    {
      id: 'msg-group-3',
      senderId: 'usr-appraiser-01',
      senderName: 'Chief Customs Appraiser',
      senderUsername: 'appraiser',
      senderRole: 'APPRAISER',
      receiverId: GROUP_CHANNEL_ID,
      receiverName: GROUP_CHANNEL_NAME,
      channelId: GROUP_CHANNEL_ID,
      content: 'Valuation desk standing by. Please flag any declarations with tariff code discrepancies or audit holds.',
      createdAt: t3,
      isRead: true,
      tag: '[VALUATION]'
    },
    {
      id: 'msg-group-4',
      senderId: 'usr-lrs-01',
      senderName: 'Long Room Supervisor (LRS)',
      senderUsername: 'lrs_officer',
      senderRole: 'LRS',
      receiverId: GROUP_CHANNEL_ID,
      receiverName: GROUP_CHANNEL_NAME,
      channelId: GROUP_CHANNEL_ID,
      content: 'Manifest ledger cross-reconciliation complete. All items verified against CusDec-53 customs registry.',
      createdAt: t4,
      isRead: true,
      tag: '[LEDGER-SYNC]'
    }
  ];
}

// Initial realistic 1-on-1 private messages between registered officers
function createSeedPrivateMessages(): ChatMessage[] {
  const t1 = new Date(Date.now() - 3600000 * 3).toISOString();
  const t2 = new Date(Date.now() - 3600000 * 2).toISOString();
  const t3 = new Date(Date.now() - 3600000).toISOString();
  const t4 = new Date(Date.now() - 1800000).toISOString();
  const t5 = new Date(Date.now() - 900000).toISOString();
  const t6 = new Date(Date.now() - 300000).toISOString();

  return [
    // 1-on-1: DEV <-> IC Officer
    {
      id: 'msg-seed-1',
      senderId: 'usr-dev-root',
      senderName: 'System Developer & Super Admin',
      senderUsername: 'dev',
      senderRole: 'DEV',
      receiverId: 'usr-ic-01',
      receiverName: 'Inspector of Customs (IC)',
      channelId: getDmChannelId('usr-dev-root', 'usr-ic-01'),
      content: 'Hello Officer, the counter stamp validation engine has been updated with real-time audit telemetry.',
      createdAt: t1,
      isRead: true,
      tag: '[SYSTEM-SYNC]'
    },
    {
      id: 'msg-seed-2',
      senderId: 'usr-ic-01',
      senderName: 'Inspector of Customs (IC)',
      senderUsername: 'ic_officer',
      senderRole: 'IC',
      receiverId: 'usr-dev-root',
      receiverName: 'System Developer & Super Admin',
      channelId: getDmChannelId('usr-dev-root', 'usr-ic-01'),
      content: 'Received Dev. Testing declarations with leading zeros in Counter stamps now. Working smoothly!',
      createdAt: t2,
      isRead: true,
      tag: '[VERIFIED]'
    },

    // 1-on-1: DEV <-> Customs Appraiser
    {
      id: 'msg-seed-3',
      senderId: 'usr-appraiser-01',
      senderName: 'Customs Appraiser (Valuation)',
      senderUsername: 'appraiser',
      senderRole: 'APPRAISER',
      receiverId: 'usr-dev-root',
      receiverName: 'System Developer & Super Admin',
      channelId: getDmChannelId('usr-dev-root', 'usr-appraiser-01'),
      content: 'Dev, please check HS Code 8703 duty calculation tariff updates for automobile declarations.',
      createdAt: t3,
      isRead: true,
      tag: '[TARIFF-CHECK]'
    },
    {
      id: 'msg-seed-4',
      senderId: 'usr-dev-root',
      senderName: 'System Developer & Super Admin',
      senderUsername: 'dev',
      senderRole: 'DEV',
      receiverId: 'usr-appraiser-01',
      receiverName: 'Customs Appraiser (Valuation)',
      channelId: getDmChannelId('usr-dev-root', 'usr-appraiser-01'),
      content: 'Tariff calculation verified against Customs Tariff Book Section 87. All tax lines matching perfectly.',
      createdAt: t4,
      isRead: false,
      tag: '[RESOLVED]'
    },

    // 1-on-1: DEV <-> Deputy Director of Customs
    {
      id: 'msg-seed-5',
      senderId: 'usr-ddc-01',
      senderName: 'Deputy Director of Customs',
      senderUsername: 'ddc_director',
      senderRole: 'DDC',
      receiverId: 'usr-dev-root',
      receiverName: 'System Developer & Super Admin',
      channelId: getDmChannelId('usr-dev-root', 'usr-ddc-01'),
      content: 'Dev, ensure all private officer transcripts are stored strictly on our local VPS disk.',
      createdAt: t5,
      isRead: true,
      tag: '[SECURITY]'
    },
    {
      id: 'msg-seed-6',
      senderId: 'usr-dev-root',
      senderName: 'System Developer & Super Admin',
      senderUsername: 'dev',
      senderRole: 'DEV',
      receiverId: 'usr-ddc-01',
      receiverName: 'Deputy Director of Customs',
      channelId: getDmChannelId('usr-dev-root', 'usr-ddc-01'),
      content: 'Understood, Director. All communications are saved to encrypted VPS storage at data/chat_messages.json.',
      createdAt: t6,
      isRead: false,
      tag: '[CONFIRMED]'
    }
  ];
}

// Zero-delay EventEmitter for real-time SSE push (persisted on globalThis to guarantee single instance across Next.js bundles)
class ChatBus extends EventEmitter {}

interface ChatGlobalState {
  chatBus?: ChatBus;
  activeUserConnections?: Map<string, number>;
  messagesCache?: ChatMessage[];
  groupLastReadMap?: Map<string, string>;
}

const chatGlobal = globalThis as unknown as ChatGlobalState;

if (!chatGlobal.chatBus) {
  chatGlobal.chatBus = new ChatBus();
  chatGlobal.chatBus.setMaxListeners(500);
}
export const chatBus = chatGlobal.chatBus;

if (!chatGlobal.activeUserConnections) {
  chatGlobal.activeUserConnections = new Map<string, number>();
}
export const activeUserConnections = chatGlobal.activeUserConnections;

if (!chatGlobal.groupLastReadMap) {
  chatGlobal.groupLastReadMap = new Map<string, string>();
}

function getMessagesCache(): ChatMessage[] {
  if (!chatGlobal.messagesCache) {
    let list: ChatMessage[] = readJson<ChatMessage[]>(CHAT_FILE, []);
    list = list.filter((m) => m.receiverId && m.channelId !== 'customs-general');
    if (list.length === 0) {
      list = [...createSeedGroupMessages(), ...createSeedPrivateMessages()];
      writeJson(CHAT_FILE, list);
    } else {
      const hasGroup = list.some((m) => m.channelId === GROUP_CHANNEL_ID || m.receiverId === GROUP_CHANNEL_ID);
      if (!hasGroup) {
        list = [...createSeedGroupMessages(), ...list];
        writeJson(CHAT_FILE, list);
      }
    }
    chatGlobal.messagesCache = list;
  }
  return chatGlobal.messagesCache;
}

// Initial hydration
getMessagesCache();

// Active connection count per user across browser tabs
export function userConnected(userId: string): string[] {
  const count = activeUserConnections.get(userId) || 0;
  activeUserConnections.set(userId, count + 1);
  const online = getOnlineUserIds();
  chatBus.emit('presence_update', { onlineUserIds: online });
  return online;
}

export function userDisconnected(userId: string): string[] {
  const count = activeUserConnections.get(userId) || 0;
  if (count <= 1) {
    activeUserConnections.delete(userId);
  } else {
    activeUserConnections.set(userId, count - 1);
  }
  const online = getOnlineUserIds();
  chatBus.emit('presence_update', { onlineUserIds: online });
  return online;
}

export function forceUserOffline(userId: string): string[] {
  activeUserConnections.delete(userId);
  const online = getOnlineUserIds();
  chatBus.emit('presence_update', { onlineUserIds: online });
  return online;
}

export function getOnlineUserIds(): string[] {
  return Array.from(activeUserConnections.keys());
}

export function isUserOnline(userId: string): boolean {
  return activeUserConnections.has(userId);
}

export function subscribeToPresence(callback: (payload: { onlineUserIds: string[] }) => void): () => void {
  chatBus.on('presence_update', callback);
  return () => {
    chatBus.off('presence_update', callback);
  };
}

export function savePrivateMessage(data: {
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderRole: UserRole;
  receiverId: string;
  receiverName?: string;
  content: string;
  type?: MessageType;
  attachment?: ChatAttachment;
  tag?: string;
}): ChatMessage {
  if (!data.receiverId) {
    throw new Error('Private individual chat requires a valid receiverId');
  }

  const channelId = getDmChannelId(data.senderId, data.receiverId);

  // Auto-detect message type if not explicitly passed
  let msgType: MessageType = data.type || 'text';
  if (data.attachment) {
    if (data.attachment.fileType.startsWith('image/')) {
      msgType = 'image';
    } else if (data.attachment.fileType.startsWith('audio/')) {
      msgType = 'audio';
    } else {
      msgType = 'document';
    }
  }

  // Auto-extract @mentions if present in content
  const rawContent = (data.content || '').trim();
  const rawMentions = Array.from(new Set(rawContent.match(/@([a-zA-Z0-9_]+)/g) || [])).map((m) => m.slice(1).toLowerCase());

  const newMsg: ChatMessage = {
    id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    senderId: data.senderId,
    senderName: data.senderName,
    senderUsername: data.senderUsername,
    senderRole: data.senderRole,
    receiverId: data.receiverId,
    receiverName: data.receiverName,
    channelId,
    content: rawContent,
    createdAt: new Date().toISOString(),
    isRead: false,
    type: msgType,
    attachment: data.attachment,
    tag: data.tag,
    mentions: rawMentions.length > 0 ? rawMentions : undefined
  };

  const cache = getMessagesCache();
  cache.push(newMsg);

  // Persist directly to local VPS storage
  writeJson(CHAT_FILE, cache);

  // Broadcast instantly to active streams
  chatBus.emit('new_message', newMsg);

  return newMsg;
}

export function getGroupMessages(limit = 200): ChatMessage[] {
  return getMessagesCache()
    .filter((m) => m.channelId === GROUP_CHANNEL_ID || m.receiverId === GROUP_CHANNEL_ID)
    .slice(-limit);
}

export function saveGroupMessage(data: {
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderRole: UserRole;
  content: string;
  type?: MessageType;
  attachment?: ChatAttachment;
  tag?: string;
}): ChatMessage {
  let msgType: MessageType = data.type || 'text';
  if (data.attachment) {
    if (data.attachment.fileType.startsWith('image/')) {
      msgType = 'image';
    } else if (data.attachment.fileType.startsWith('audio/')) {
      msgType = 'audio';
    } else {
      msgType = 'document';
    }
  }

  const rawContent = (data.content || '').trim();
  const rawMentions = Array.from(new Set(rawContent.match(/@([a-zA-Z0-9_]+)/g) || [])).map((m) => m.slice(1).toLowerCase());

  const newMsg: ChatMessage = {
    id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    senderId: data.senderId,
    senderName: data.senderName,
    senderUsername: data.senderUsername,
    senderRole: data.senderRole,
    receiverId: GROUP_CHANNEL_ID,
    receiverName: GROUP_CHANNEL_NAME,
    channelId: GROUP_CHANNEL_ID,
    content: rawContent,
    createdAt: new Date().toISOString(),
    isRead: false,
    type: msgType,
    attachment: data.attachment,
    tag: data.tag,
    mentions: rawMentions.length > 0 ? rawMentions : undefined
  };

  const cache = getMessagesCache();
  cache.push(newMsg);

  writeJson(CHAT_FILE, cache);

  // Broadcast to all active streams
  chatBus.emit('new_message', newMsg);

  return newMsg;
}

/**
 * Delete a message (WhatsApp / Messenger style tombstone: "This message was deleted")
 */
export function deleteMessage(
  messageId: string,
  userId: string,
  isAdmin = false
): { success: boolean; message?: ChatMessage; error?: string } {
  const cache = getMessagesCache();
  const msg = cache.find((m) => m.id === messageId);
  if (!msg) {
    return { success: false, error: 'Message not found' };
  }
  // Only the original sender or a DEV admin can delete a message
  if (msg.senderId !== userId && !isAdmin) {
    return { success: false, error: 'You can only delete your own messages' };
  }

  msg.isDeleted = true;
  msg.deletedAt = new Date().toISOString();
  msg.deletedBy = userId;

  writeJson(CHAT_FILE, cache);

  // Broadcast deletion to all active streams
  chatBus.emit('message_deleted', {
    messageId: msg.id,
    channelId: msg.channelId,
    deletedBy: userId,
    deletedAt: msg.deletedAt
  });

  return { success: true, message: msg };
}

export function subscribeToMessageDeletions(
  callback: (payload: { messageId: string; channelId: string; deletedBy: string; deletedAt: string }) => void
): () => void {
  chatBus.on('message_deleted', callback);
  return () => {
    chatBus.off('message_deleted', callback);
  };
}

/**
 * Live typing indicators (WhatsApp style "typing...")
 */
export function broadcastTyping(
  senderId: string,
  senderName: string,
  partnerId: string,
  isTyping: boolean
): void {
  chatBus.emit('typing_status', {
    senderId,
    senderName,
    partnerId,
    isTyping
  });
}

export function subscribeToTyping(
  callback: (payload: { senderId: string; senderName: string; partnerId: string; isTyping: boolean }) => void
): () => void {
  chatBus.on('typing_status', callback);
  return () => {
    chatBus.off('typing_status', callback);
  };
}

/**
 * Toggle a reaction on a message (WhatsApp style: 1 reaction per user per message)
 * If user clicked the same emoji they previously reacted with -> remove reaction
 * If user clicked a different emoji -> update reaction to the new emoji
 */
export function toggleMessageReaction(
  messageId: string,
  userId: string,
  userName: string,
  emoji: string
): { success: boolean; reactions?: MessageReaction[]; error?: string } {
  const cache = getMessagesCache();
  const msg = cache.find((m) => m.id === messageId);
  if (!msg) {
    return { success: false, error: 'Message not found' };
  }
  if (msg.isDeleted) {
    return { success: false, error: 'Cannot react to a deleted message' };
  }

  if (!msg.reactions) {
    msg.reactions = [];
  }

  const existingIdx = msg.reactions.findIndex((r) => r.userId === userId);
  if (existingIdx !== -1) {
    const existing = msg.reactions[existingIdx];
    if (existing.emoji === emoji) {
      // Toggle off
      msg.reactions.splice(existingIdx, 1);
    } else {
      // Change reaction to the new emoji
      msg.reactions[existingIdx] = { emoji, userId, userName };
    }
  } else {
    // Add reaction
    msg.reactions.push({ emoji, userId, userName });
  }

  writeJson(CHAT_FILE, cache);

  // Broadcast to all active streams
  chatBus.emit('message_reaction', {
    messageId: msg.id,
    channelId: msg.channelId,
    reactions: msg.reactions
  });

  return { success: true, reactions: msg.reactions };
}

export function subscribeToMessageReactions(
  callback: (payload: { messageId: string; channelId: string; reactions: MessageReaction[] }) => void
): () => void {
  chatBus.on('message_reaction', callback);
  return () => {
    chatBus.off('message_reaction', callback);
  };
}

export function markGroupAsRead(userId: string): void {
  if (!chatGlobal.groupLastReadMap) {
    chatGlobal.groupLastReadMap = new Map<string, string>();
  }
  chatGlobal.groupLastReadMap.set(userId, new Date().toISOString());
}

export function getPrivateMessages(userA: string, userB: string, limit = 200): ChatMessage[] {
  const channelId = getDmChannelId(userA, userB);
  return getMessagesCache()
    .filter((m) => m.channelId === channelId)
    .slice(-limit);
}

export function markConversationAsRead(currentUserId: string, partnerId: string): void {
  const channelId = getDmChannelId(currentUserId, partnerId);
  const cache = getMessagesCache();
  let changed = false;

  for (const m of cache) {
    if (m.channelId === channelId && m.senderId === partnerId && m.receiverId === currentUserId && !m.isRead) {
      m.isRead = true;
      changed = true;
    }
  }

  if (changed) {
    writeJson(CHAT_FILE, cache);
    chatBus.emit('messages_read', {
      readerId: currentUserId,
      partnerId,
      channelId,
      readAt: new Date().toISOString()
    });
  }
}

export function getConversationsSummary(
  currentUserId: string,
  allUsers: SafeUser[]
): ConversationSummary[] {
  const summaries: ConversationSummary[] = [];
  const cache = getMessagesCache();

  // 1. PINNED GROUP CHAT: Long Room Operations (All Officers)
  const groupMessages = cache.filter(
    (m) => m.channelId === GROUP_CHANNEL_ID || m.receiverId === GROUP_CHANNEL_ID
  );
  const lastGroupMessage = groupMessages.length > 0 ? groupMessages[groupMessages.length - 1] : null;
  const lastReadTime =
    (chatGlobal.groupLastReadMap && chatGlobal.groupLastReadMap.get(currentUserId)) ||
    '1970-01-01T00:00:00.000Z';
  const groupUnreadCount = groupMessages.filter(
    (m) => m.senderId !== currentUserId && new Date(m.createdAt) > new Date(lastReadTime)
  ).length;

  const groupSummary: ConversationSummary = {
    partnerId: GROUP_CHANNEL_ID,
    partnerName: GROUP_CHANNEL_NAME,
    partnerUsername: GROUP_CHANNEL_HANDLE,
    partnerRole: 'GROUP' as any,
    partnerEmail: 'operations@longroom.customs.gov.lk',
    partnerAvatarUrl: null,
    isActive: true,
    isOnline: true,
    lastLoginAt: new Date().toISOString(),
    lastMessage: lastGroupMessage,
    unreadCount: groupUnreadCount,
    isGroup: true,
    isPinned: true,
    memberCount: allUsers.length
  };

  // 2. Individual 1-on-1 private conversations
  for (const user of allUsers) {
    if (user.id === currentUserId) continue;

    const channelId = getDmChannelId(currentUserId, user.id);
    const convoMessages = cache.filter((m) => m.channelId === channelId);

    const lastMessage = convoMessages.length > 0 ? convoMessages[convoMessages.length - 1] : null;
    const unreadCount = convoMessages.filter(
      (m) => m.receiverId === currentUserId && m.senderId === user.id && !m.isRead
    ).length;

    const isOnline = isUserOnline(user.id);

    summaries.push({
      partnerId: user.id,
      partnerName: user.fullName,
      partnerUsername: user.username,
      partnerRole: user.role,
      partnerEmail: user.email,
      partnerAvatarUrl: user.avatarUrl,
      isActive: user.isActive,
      isOnline,
      lastLoginAt: user.lastLoginAt,
      lastMessage,
      unreadCount,
      isGroup: false,
      isPinned: false
    });
  }

  // Sort 1-on-1 conversations: most recent message conversation first, then by name
  summaries.sort((a, b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return a.partnerName.localeCompare(b.partnerName);
  });

  // Pinned Group Chat is ALWAYS first at index 0
  return [groupSummary, ...summaries];
}

export function getTotalUnreadCount(userId: string): number {
  const cache = getMessagesCache();
  const directUnread = cache.filter((m) => m.receiverId === userId && !m.isRead).length;

  const groupMessages = cache.filter(
    (m) => m.channelId === GROUP_CHANNEL_ID || m.receiverId === GROUP_CHANNEL_ID
  );
  const lastReadTime =
    (chatGlobal.groupLastReadMap && chatGlobal.groupLastReadMap.get(userId)) ||
    '1970-01-01T00:00:00.000Z';
  const groupUnread = groupMessages.filter(
    (m) => m.senderId !== userId && new Date(m.createdAt) > new Date(lastReadTime)
  ).length;

  return directUnread + groupUnread;
}

export function subscribeToMessages(callback: (msg: ChatMessage) => void): () => void {
  chatBus.on('new_message', callback);
  return () => {
    chatBus.off('new_message', callback);
  };
}

export function subscribeToReadEvents(callback: (payload: { readerId: string; partnerId: string; channelId: string; readAt: string }) => void): () => void {
  chatBus.on('messages_read', callback);
  return () => {
    chatBus.off('messages_read', callback);
  };
}

// Backward compatibility alias
export const getMessages = (channelId: string, limit = 100) => {
  return getMessagesCache().filter((m) => m.channelId === channelId).slice(-limit);
};
export const saveMessage = (data: any) => {
  return savePrivateMessage(data);
};
export const getChannelIdForUsers = getDmChannelId;
export const markMessagesAsRead = (channelId: string, readerUserId: string) => {
  const cache = getMessagesCache();
  let changed = false;
  for (const m of cache) {
    if (m.channelId === channelId && m.receiverId === readerUserId && !m.isRead) {
      m.isRead = true;
      changed = true;
    }
  }
  if (changed) {
    writeJson(CHAT_FILE, cache);
  }
};
