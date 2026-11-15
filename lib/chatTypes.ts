import { UserRole } from './authTypes';

export type MessageType = 'text' | 'image' | 'audio' | 'document';

export interface ChatAttachment {
  url: string;            // Stored URL on VPS, e.g. '/api/chat/attachments/file_171829.png'
  fileName: string;       // Original display name
  fileType: string;       // MIME type: 'image/png', 'audio/webm', 'application/pdf', etc.
  fileSize: number;       // Size in bytes
  duration?: number;      // Seconds for audio voice recordings
  thumbnailUrl?: string;  // Optional thumbnail
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderRole: UserRole;
  receiverId: string;     // Strictly 1-on-1 private messaging
  receiverName?: string;
  channelId: string;      // `dm_${min(senderId, receiverId)}_${max(senderId, receiverId)}`
  content: string;        // Text content, caption, or description
  createdAt: string;
  isRead: boolean;
  type?: MessageType;     // 'text' | 'image' | 'audio' | 'document'
  attachment?: ChatAttachment;
  tag?: string;
  isDeleted?: boolean;    // When true, message shows as "This message was deleted"
  deletedAt?: string;
  deletedBy?: string;
  mentions?: string[];    // Array of mentioned usernames, e.g. ['appraiser', 'ic_officer']
  reactions?: MessageReaction[]; // WhatsApp-style reactions (emoji, userId, userName)
}

export interface ConversationSummary {
  partnerId: string;
  partnerName: string;
  partnerUsername: string;
  partnerRole: UserRole | 'GROUP';
  partnerEmail: string;
  partnerAvatarUrl?: string | null;
  isActive: boolean;
  isOnline?: boolean;
  lastLoginAt?: string | null;
  lastMessage?: ChatMessage | null;
  unreadCount: number;
  isGroup?: boolean;
  isPinned?: boolean;
  memberCount?: number;
}

// Retained for backward-compatibility
export interface ChatContact {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  lastLoginAt?: string | null;
  unreadCount?: number;
}
