'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SafeUser, UserRole, ROLE_CONFIGS } from '@/lib/authTypes';
import { ChatMessage, ConversationSummary, ChatAttachment, MessageType } from '@/lib/chatTypes';
import { playIncomingMessageSound } from '@/lib/notificationSound';
import { WhatsAppNotificationToast, WhatsAppNotificationPayload } from '@/components/WhatsAppNotificationToast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from '@/components/ui/chat-bubble';
import { Avatar, AvatarImage, AvatarFallback, MessengerDefaultAvatar } from '@/components/ui/avatar';
import { AvatarStack, getOfficerAvatar } from '@/components/ui/avatar-group';
import { MessageLoading } from '@/components/ui/message-loading';
import { cn } from '@/lib/utils';
import {
  MessageCircle,
  X,
  Minus,
  Send,
  ArrowLeft,
  Search,
  CheckCheck,
  Lock,
  User,
  FileText,
  FileSpreadsheet,
  FileArchive,
  File,
  Download,
  Image as ImageIcon,
  Paperclip,
  Mic,
  Trash2,
  Play,
  Pause,
  Maximize2,
  Volume2,
  Phone,
  Users,
  Pin,
  Ban,
  AtSign,
  Smile
} from 'lucide-react';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

interface RealtimeChatWidgetProps {
  currentUser: SafeUser | null;
}

function renderFormattedMessage(content: string, currentUsername?: string) {
  if (!content) return null;
  const parts = content.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('@')) {
      const uname = part.slice(1).toLowerCase();
      const isMeMentioned = currentUsername && uname === currentUsername.toLowerCase();
      return (
        <span
          key={idx}
          className={cn(
            'inline-block px-1 py-0.2 rounded font-semibold text-[11px] transition-colors',
            isMeMentioned
              ? 'bg-amber-400/30 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400/60 font-bold'
              : 'bg-blue-500/15 text-blue-700 dark:text-sky-300 font-medium'
          )}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Role Avatar & Monogram Configuration (Messenger-style vibrant gradients)
// ---------------------------------------------------------------------------
const ROLE_AVATARS: Record<UserRole, { gradient: string; initials: string; ringColor: string }> = {
  DEV: {
    gradient: 'from-purple-600 via-indigo-600 to-pink-600',
    initials: 'DV',
    ringColor: 'ring-purple-500'
  },
  IC: {
    gradient: 'from-amber-500 via-orange-600 to-rose-600',
    initials: 'IC',
    ringColor: 'ring-amber-500'
  },
  APPRAISER: {
    gradient: 'from-sky-500 via-blue-600 to-cyan-500',
    initials: 'AP',
    ringColor: 'ring-sky-500'
  },
  DDC: {
    gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
    initials: 'DD',
    ringColor: 'ring-emerald-500'
  },
  LRS: {
    gradient: 'from-teal-500 via-emerald-600 to-blue-600',
    initials: 'LR',
    ringColor: 'ring-teal-500'
  },
  ASC: {
    gradient: 'from-blue-600 via-indigo-600 to-cyan-600',
    initials: 'AS',
    ringColor: 'ring-blue-500'
  },
  DC: {
    gradient: 'from-rose-600 via-red-600 to-pink-600',
    initials: 'DC',
    ringColor: 'ring-rose-500'
  }
};

// ---------------------------------------------------------------------------
// Helper: Format bytes to human readable string
// ---------------------------------------------------------------------------
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ---------------------------------------------------------------------------
// Helper: Format seconds to M:SS
// ---------------------------------------------------------------------------
function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ---------------------------------------------------------------------------
// Component: Audio Voice Note Player (Light & Dark Theme Optimized)
// ---------------------------------------------------------------------------
const WAVE_BARS = [35, 60, 85, 45, 95, 30, 70, 90, 50, 65, 80, 40, 75, 95, 60, 85, 45, 70, 90, 55, 75, 40];

function VoiceNotePlayer({
  url,
  duration,
  isMe
}: {
  url: string;
  duration?: number;
  isMe: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (index: number) => {
    if (!audioRef.current || totalDuration <= 0) return;
    const targetTime = (index / WAVE_BARS.length) * totalDuration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const progressRatio = totalDuration > 0 ? currentTime / totalDuration : 0;
  const activeBarIndex = Math.floor(progressRatio * WAVE_BARS.length);

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[210px] sm:min-w-[240px]">
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md',
          isMe
            ? 'bg-white text-blue-600 hover:bg-zinc-100'
            : 'bg-blue-600 dark:bg-sky-500 hover:bg-blue-500 text-white'
        )}
        title={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-[2.5px] h-7 cursor-pointer" title="Seek voice message">
          {WAVE_BARS.map((height, i) => {
            const isPlayed = i <= activeBarIndex;
            return (
              <span
                key={i}
                onClick={() => handleSeek(i)}
                style={{ height: `${height}%` }}
                className={cn(
                  'w-[3px] rounded-full transition-colors duration-150',
                  isMe
                    ? isPlayed
                      ? 'bg-white'
                      : 'bg-white/40 hover:bg-white/70'
                    : isPlayed
                      ? 'bg-blue-600 dark:bg-sky-400'
                      : 'bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-500'
                )}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono leading-none opacity-85">
          <span>{formatSeconds(isPlaying ? currentTime : totalDuration)}</span>
          <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-sans">
            <Volume2 className="w-2.5 h-2.5" /> Voice
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Realtime Chat Messenger Widget
// ---------------------------------------------------------------------------
export function RealtimeChatWidget({ currentUser }: RealtimeChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Navigation: Active Conversation
  const [activePartner, setActivePartner] = useState<ConversationSummary | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);

  // UI Modals
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showMicModal, setShowMicModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Audio Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Skeleton Loading States
  const [isConversationsLoading, setIsConversationsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const activePartnerRef = useRef<ConversationSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live Typing Indicators state
  const [typingUsers, setTypingUsers] = useState<Record<string, { isTyping: boolean; name: string; timestamp: number }>>({});
  const lastTypingSentRef = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Messenger-style @mentions state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  // WhatsApp-style message reactions state
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeReactionMsgId) return;
    const handleOutside = () => setActiveReactionMsgId(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, [activeReactionMsgId]);

  // Realtime WhatsApp incoming notification toast overlay state
  const [incomingNotification, setIncomingNotification] = useState<WhatsAppNotificationPayload | null>(null);

  const isOpenRef = useRef(isOpen);
  const isMinimizedRef = useRef(isMinimized);
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen && !isMinimized) {
      setIncomingNotification(null);
    }
  }, [isOpen, isMinimized]);
  useEffect(() => {
    isMinimizedRef.current = isMinimized;
    if (isOpen && !isMinimized) {
      setIncomingNotification(null);
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    activePartnerRef.current = activePartner;
  }, [activePartner]);

  // Clean up stale typing statuses every 2.5 seconds (only evaluates when someone is actively typing)
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingUsers((prev) => {
        if (Object.keys(prev).length === 0) return prev;
        const now = Date.now();
        let changed = false;
        const next: typeof prev = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.timestamp < 3500) {
            next[k] = v;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // 1. Fetch conversations list
  const fetchConversations = useCallback(async (showSkeleton = false) => {
    if (!currentUser) return;
    if (showSkeleton) setIsConversationsLoading(true);
    try {
      const res = await fetch(`/api/chat/users?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      if (res.ok && data.conversations) {
        setConversations(data.conversations);
        if (typeof data.unreadTotal === 'number') {
          setTotalUnread(data.unreadTotal);
        }
        // Accurately sync exact live online user IDs from server
        const activeIds = data.conversations
          .filter((c: ConversationSummary) => c.isOnline)
          .map((c: ConversationSummary) => c.partnerId);
        setOnlineUserIds(activeIds);
      }
    } catch (err) {
      console.error('[Conversations Fetch Error]:', err);
    } finally {
      setIsConversationsLoading(false);
    }
  }, [currentUser]);

  // 2. Fetch 1-on-1 messages for selected officer
  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!currentUser) return;
    setIsMessagesLoading(true);
    try {
      const res = await fetch(`/api/chat/messages?partnerId=${partnerId}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      if (res.ok && data.messages) {
        setMessages(data.messages);
        fetchConversations();
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    } catch (err) {
      console.error('[Fetch Messages Error]:', err);
    } finally {
      setIsMessagesLoading(false);
    }
  }, [currentUser, fetchConversations]);

  // 3. Setup Zero-Delay SSE Stream with Resilient Auto-Reconnection
  useEffect(() => {
    if (!currentUser) return;

    let isSubscribed = true;
    let sseInstance: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    fetchConversations();

    const connectSse = () => {
      if (!isSubscribed) return;
      if (sseInstance) {
        try {
          sseInstance.close();
        } catch {}
      }

      const sse = new EventSource('/api/chat/stream');
      sseInstance = sse;
      sseRef.current = sse;

      // A. Initial connection payload
      sse.addEventListener('connected', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data.onlineUserIds)) {
            setOnlineUserIds(data.onlineUserIds);
          }
        } catch (err) {
          console.error('[SSE Connected Parse Error]:', err);
        }
      });

      // B. Realtime Presence update (green dots appear/disappear instantly)
      sse.addEventListener('presence_update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data.onlineUserIds)) {
            setOnlineUserIds(data.onlineUserIds);
          }
        } catch (err) {
          console.error('[SSE Presence Parse Error]:', err);
        }
      });

      // C. Realtime Incoming Messages (Instant Zero-Delay Push)
      sse.addEventListener('new_message', (event: MessageEvent) => {
        try {
          const newMsg: ChatMessage = JSON.parse(event.data);
          const currentPartner = activePartnerRef.current;
          const isGroupMsg = newMsg.receiverId === 'group-long-room' || newMsg.channelId === 'group-long-room';

          // Trigger authentic WhatsApp chime and notification card overlay for messages from other users
          if (newMsg.senderId !== currentUser.id) {
            playIncomingMessageSound();

            const isChatWindowOpen = isOpenRef.current && !isMinimizedRef.current;

            // If already chat window is open, do NOT show the notification card, just play sound only!
            if (!isChatWindowOpen) {
              const partnerId = isGroupMsg ? 'group-long-room' : newMsg.senderId;
              const partnerName = isGroupMsg ? 'Long Room Operations' : newMsg.senderName;

              setIncomingNotification({
                id: `${newMsg.id}_${Date.now()}`,
                message: newMsg,
                partnerId,
                partnerName,
                partnerRole: isGroupMsg ? 'GROUP' : newMsg.senderRole,
                partnerUsername: newMsg.senderUsername,
                isGroup: isGroupMsg,
                receivedAt: Date.now(),
              });
            }
          }

          // 1. If currently chatting in this channel/partner, push to message viewport immediately
          if (
            currentPartner &&
            (
              (isGroupMsg && currentPartner.partnerId === 'group-long-room') ||
              ((newMsg.senderId === currentPartner.partnerId && newMsg.receiverId === currentUser.id) ||
                (newMsg.senderId === currentUser.id && newMsg.receiverId === currentPartner.partnerId))
            )
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Mark message as read on server immediately
            if (isGroupMsg) {
              fetch('/api/chat/messages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partnerId: 'group-long-room' })
              }).catch(() => {});
            } else if (newMsg.senderId === currentPartner.partnerId) {
              fetch('/api/chat/messages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partnerId: currentPartner.partnerId })
              }).catch(() => {});
            }

            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }

          // 2. Realtime optimistic update of conversation list (Pinned group chat stays on top)
          const otherId = isGroupMsg
            ? 'group-long-room'
            : newMsg.senderId === currentUser.id
              ? newMsg.receiverId
              : newMsg.senderId;
          const isCurrentlyActive = currentPartner?.partnerId === otherId;

          setConversations((prev) => {
            const exists = prev.some((c) => c.partnerId === otherId);
            if (!exists) {
              fetchConversations();
              return prev;
            }
            return prev
              .map((c) => {
                if (c.partnerId === otherId) {
                  return {
                    ...c,
                    lastMessage: newMsg,
                    unreadCount:
                      newMsg.senderId !== currentUser.id && !isCurrentlyActive
                        ? (c.unreadCount || 0) + 1
                        : c.unreadCount
                  };
                }
                return c;
              })
              .sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
                const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
                return timeB - timeA;
              });
          });

          if (newMsg.senderId !== currentUser.id && !isCurrentlyActive) {
            setTotalUnread((prev) => prev + 1);
          }

          // Sync server conversations state in background
          fetchConversations();
        } catch (err) {
          console.error('[SSE Message Parse Error]:', err);
        }
      });

      // D. Realtime Read Receipt (Instant WhatsApp Double Blue Tick ✓✓ without page reload)
      sse.addEventListener('read_receipt', (event: MessageEvent) => {
        try {
          const receipt = JSON.parse(event.data);
          const currentPartner = activePartnerRef.current;

          // 1. If looking at the conversation, turn sent grey checks into blue double ticks
          if (currentPartner && receipt.readerId === currentPartner.partnerId) {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.senderId === currentUser.id && !m.isRead) {
                  return { ...m, isRead: true };
                }
                return m;
              })
            );
          }

          // 2. Realtime update conversation list snippet checkmark
          setConversations((prev) =>
            prev.map((c) => {
              if (c.partnerId === receipt.readerId && c.lastMessage?.senderId === currentUser.id) {
                return {
                  ...c,
                  lastMessage: { ...c.lastMessage, isRead: true }
                };
              }
              if (c.partnerId === receipt.partnerId && receipt.readerId === currentUser.id) {
                return {
                  ...c,
                  unreadCount: 0
                };
              }
              return c;
            })
          );
        } catch (err) {
          console.error('[SSE Read Receipt Error]:', err);
        }
      });

      // E. Realtime Message Deletion (Instant WhatsApp "This message was deleted" tombstone)
      sse.addEventListener('message_deleted', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setMessages((prev) =>
            prev.map((m) => (m.id === data.messageId ? { ...m, isDeleted: true } : m))
          );
          setConversations((prev) =>
            prev.map((c) => {
              if (c.lastMessage && c.lastMessage.id === data.messageId) {
                return {
                  ...c,
                  lastMessage: {
                    ...c.lastMessage,
                    isDeleted: true,
                    content: 'This message was deleted'
                  }
                };
              }
              return c;
            })
          );
        } catch (err) {
          console.error('[SSE Message Deleted Error]:', err);
        }
      });

      // F. Realtime Typing Status (WhatsApp live "typing..." indicator)
      sse.addEventListener('typing', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const key = data.partnerId === 'group-long-room' ? 'group-long-room' : data.senderId;
          if (data.isTyping) {
            setTypingUsers((prev) => ({
              ...prev,
              [key]: { isTyping: true, name: data.senderName, timestamp: Date.now() }
            }));
          } else {
            setTypingUsers((prev) => {
              const next = { ...prev };
              delete next[key];
              return next;
            });
          }
        } catch (err) {
          console.error('[SSE Typing Error]:', err);
        }
      });

      // G. Realtime Message Reaction (WhatsApp emoji reactions)
      sse.addEventListener('message_reaction', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setMessages((prev) =>
            prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
          );
        } catch (err) {
          console.error('[SSE Reaction Error]:', err);
        }
      });

      // Auto-reconnect on stream drop or error
      sse.onerror = () => {
        if (!isSubscribed) return;
        try {
          sse.close();
        } catch {}
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectSse();
          }, 2500);
        }
      };
    };

    connectSse();

    const handleOnline = () => connectSse();
    window.addEventListener('online', handleOnline);

    return () => {
      isSubscribed = false;
      window.removeEventListener('online', handleOnline);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (sseInstance) {
        try {
          sseInstance.close();
        } catch {}
      }
    };
  }, [currentUser, fetchConversations]);

  // Handle file and image upload to VPS disk
  const uploadAttachmentRaw = async (
    file: Blob | File,
    customName?: string,
    duration?: number
  ): Promise<ChatAttachment | null> => {
    try {
      const fd = new FormData();
      const filename = customName || (file as File).name || `attachment_${Date.now()}`;
      fd.append('file', file, filename);
      if (duration) fd.append('duration', duration.toString());

      const res = await fetch('/api/chat/attachments', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (res.ok && data.attachment) {
        return data.attachment;
      } else {
        alert(data.error || 'Failed to upload attachment to VPS.');
        return null;
      }
    } catch (err: any) {
      console.error('[Attachment Upload Exception]:', err);
      alert('Upload failed: ' + err.message);
      return null;
    }
  };

  const uploadAttachment = async (
    file: Blob | File,
    customName?: string,
    duration?: number
  ): Promise<ChatAttachment | null> => {
    setIsUploading(true);
    try {
      return await uploadAttachmentRaw(file, customName, duration);
    } finally {
      setIsUploading(false);
    }
  };

  // Send 1-on-1 message (text, image, audio, or document)
  const sendMessagePayload = async ({
    content,
    attachment,
    type,
    tag
  }: {
    content?: string;
    attachment?: ChatAttachment;
    type?: MessageType;
    tag?: string;
  }) => {
    if (!activePartner || !currentUser) return;

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: activePartner.partnerId,
          content: content || '',
          attachment,
          type,
          tag
        })
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
        fetchConversations();
      }
    } catch (err) {
      console.error('[Send Message Error]:', err);
    }
  };

  // Live typing emission
  const emitTyping = useCallback((isTyping: boolean) => {
    const partner = activePartnerRef.current;
    if (!partner) return;
    const now = Date.now();
    if (isTyping && now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;

    fetch('/api/chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerId: partner.partnerId,
        isTyping
      })
    }).catch(() => {});
  }, []);

  const handleInputChange = (val: string) => {
    setInputText(val);

    // Typing heartbeat
    if (val.trim()) {
      emitTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitTyping(false);
      }, 3000);
    } else {
      emitTyping(false);
    }

    // Mention trigger: checks if last token is @...
    const match = val.match(/@([a-zA-Z0-9_]*)$/);
    if (match) {
      setMentionQuery(match[1].toLowerCase());
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const handleSelectMention = (cand: ConversationSummary) => {
    const newText = inputText.replace(/@([a-zA-Z0-9_]*)$/, `@${cand.partnerUsername} `);
    setInputText(newText);
    setShowMentions(false);
  };

  const mentionCandidates = conversations.filter((c) => {
    if (c.isGroup) return false;
    if (c.partnerId === currentUser?.id) return false;
    const q = mentionQuery.toLowerCase();
    return (
      c.partnerUsername.toLowerCase().includes(q) ||
      c.partnerName.toLowerCase().includes(q) ||
      c.partnerRole.toLowerCase().includes(q)
    );
  });

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Delete this message for everyone?')) return;
    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true } : m))
    );
    setConversations((prev) =>
      prev.map((c) =>
        c.lastMessage && c.lastMessage.id === messageId
          ? { ...c, lastMessage: { ...c.lastMessage, isDeleted: true, content: 'This message was deleted' } }
          : c
      )
    );

    try {
      const res = await fetch(`/api/chat/messages?messageId=${encodeURIComponent(messageId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Delete message error:', data.error);
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActiveReactionMsgId(null);
    if (!currentUser) return;

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const current = msg.reactions || [];
        const existingIdx = current.findIndex((r) => r.userId === currentUser.id);
        let next: typeof current;
        if (existingIdx !== -1) {
          if (current[existingIdx].emoji === emoji) {
            next = current.filter((r) => r.userId !== currentUser.id);
          } else {
            next = current.map((r) =>
              r.userId === currentUser.id
                ? { emoji, userId: currentUser.id, userName: currentUser.fullName || currentUser.username }
                : r
            );
          }
        } else {
          next = [
            ...current,
            { emoji, userId: currentUser.id, userName: currentUser.fullName || currentUser.username }
          ];
        }
        return { ...msg, reactions: next };
      })
    );

    try {
      await fetch('/api/chat/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji })
      });
    } catch (err) {
      console.error('[Toggle Reaction Error]:', err);
    }
  };

  // Text message submission
  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activePartner) return;
    const text = inputText.trim();
    setInputText('');
    setShowMentions(false);
    emitTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendMessagePayload({ content: text, type: 'text' });
  };

  // Multi-media / multi-document batch sending (like WhatsApp)
  const sendMultipleFiles = async (fileList: File[]) => {
    if (!fileList || fileList.length === 0 || !activePartner) return;

    setIsUploading(true);
    const total = fileList.length;
    const initialCaption = inputText.trim();
    if (initialCaption) {
      setInputText('');
    }

    try {
      for (let i = 0; i < total; i++) {
        const file = fileList[i];

        // 50 MB check
        if (file.size > 50 * 1024 * 1024) {
          alert(`File "${file.name}" exceeds the 50 MB maximum size limit.`);
          continue;
        }

        const isImg = file.type.startsWith('image/');
        const isAudio = file.type.startsWith('audio/');
        const type: MessageType = isImg ? 'image' : isAudio ? 'audio' : 'document';

        setUploadStatusText(
          total > 1
            ? `Sending ${i + 1} of ${total}: ${file.name}...`
            : `Uploading ${file.name}...`
        );

        const attachment = await uploadAttachmentRaw(file);
        if (attachment) {
          // If user had typed a message before picking files, attach it to the first file
          const caption = i === 0 && initialCaption ? initialCaption : undefined;
          const defaultContent = isImg
            ? `📷 ${file.name}`
            : isAudio
              ? `🎙️ Audio (${file.name})`
              : `📄 ${file.name}`;

          await sendMessagePayload({
            attachment,
            type,
            content: caption || defaultContent
          });
        }
      }
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
    }
  };

  // File Picker triggers (supports multiple selection like WhatsApp)
  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const files = e.target.files;
    if (!files || files.length === 0 || !activePartner) return;
    const fileList = Array.from(files);
    e.target.value = '';
    await sendMultipleFiles(fileList);
  };

  const handleAudioFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const files = e.target.files;
    if (!files || files.length === 0 || !activePartner) return;
    const fileList = Array.from(files);
    e.target.value = '';
    await sendMultipleFiles(fileList);
  };

  // Drag and drop handlers (strictly stop propagation to prevent parent page declaration ingestion)
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!activePartner) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await sendMultipleFiles(Array.from(files));
    }
  };

  // Clipboard paste support (Ctrl+V screenshots or images, supports multiple)
  const handlePaste = async (e: React.ClipboardEvent) => {
    e.stopPropagation();
    if (!activePartner) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    const filesToUpload: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) filesToUpload.push(file);
      }
    }
    if (filesToUpload.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      await sendMultipleFiles(filesToUpload);
    }
  };

  // ---------------------------------------------------------------------------
  // Voice Recording Functions (MediaRecorder API)
  // ---------------------------------------------------------------------------
  const startRecording = async () => {
    try {
      const isSecure = typeof window !== 'undefined' && (window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
      if (!isSecure || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setShowMicModal(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[Voice Record Init Error]:', err);
      setShowMicModal(true);
    }
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const stopAndSendRecording = async () => {
    if (!mediaRecorderRef.current || !activePartner) return;

    const duration = recordSeconds;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const voiceName = `voice_note_${Date.now()}.webm`;
        const attachment = await uploadAttachment(audioBlob, voiceName, duration);
        if (attachment) {
          await sendMessagePayload({
            attachment,
            type: 'audio',
            content: `🎙️ Voice Note (${duration}s)`
          });
        }
      } catch (err) {
        console.error('[Send Voice Note Error]:', err);
      } finally {
        audioChunksRef.current = [];
        setIsRecording(false);
        setRecordSeconds(0);
      }
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
  };

  // Navigation handlers
  const handleSelectPartner = (partner: ConversationSummary) => {
    setActivePartner(partner);
    setMessages([]);
    setIsMessagesLoading(true);
    fetchMessages(partner.partnerId);

    // Instantly zero out unread count in UI
    setConversations((prev) =>
      prev.map((c) => (c.partnerId === partner.partnerId ? { ...c, unreadCount: 0 } : c))
    );

    // Fire read receipt update immediately
    fetch('/api/chat/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId: partner.partnerId })
    }).catch(() => {});
  };

  // Open conversation from WhatsApp notification toast card
  const handleOpenFromNotification = (payload: WhatsAppNotificationPayload) => {
    setIsOpen(true);
    setIsMinimized(false);
    setIncomingNotification(null);

    const existing = conversations.find((c) => c.partnerId === payload.partnerId);
    if (existing) {
      handleSelectPartner(existing);
    } else {
      const syntheticPartner: ConversationSummary = {
        partnerId: payload.partnerId,
        partnerName: payload.partnerName,
        partnerUsername: payload.partnerUsername || '',
        partnerRole: payload.partnerRole || 'APPRAISER',
        partnerEmail: `${payload.partnerUsername || 'officer'}@customs.gov.lk`,
        isActive: true,
        isOnline: true,
        unreadCount: 0,
        isGroup: payload.isGroup,
        lastMessage: payload.message,
      };
      handleSelectPartner(syntheticPartner);
    }
  };

  const handleBackToInbox = () => {
    setActivePartner(null);
    setMessages([]);
    setIsMessagesLoading(false);
    cancelRecording();
    fetchConversations();
  };

  // Time formatter
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Document Icon selector
  const getDocumentIcon = (fileName: string, mime: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || mime.includes('pdf')) {
      return <FileText className="w-6 h-6 text-rose-500 shrink-0" />;
    }
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || mime.includes('spreadsheet') || mime.includes('csv')) {
      return <FileSpreadsheet className="w-6 h-6 text-emerald-500 shrink-0" />;
    }
    if (ext === 'zip' || ext === 'tar' || ext === 'gz') {
      return <FileArchive className="w-6 h-6 text-amber-500 shrink-0" />;
    }
    return <File className="w-6 h-6 text-sky-500 shrink-0" />;
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Hidden File Inputs - Multi-select like WhatsApp */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilePicked}
        className="hidden"
        multiple
        accept=".pdf,.csv,.xlsx,.xls,.docx,.doc,.txt,.zip,image/*"
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFilePicked}
        className="hidden"
        multiple
        accept="image/*"
      />
      <input
        type="file"
        ref={audioInputRef}
        onChange={handleAudioFilePicked}
        className="hidden"
        multiple
        accept="audio/*"
      />

      {/* ========================================================
           1. FLOATING MESSENGER LAUNCHER (Smooth Physics Transition)
           ======================================================== */}
      <div
        data-chat-widget="true"
        className={cn(
          'fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 transition-all duration-300 ease-out',
          isOpen
            ? 'opacity-0 scale-50 pointer-events-none translate-y-2 rotate-45'
            : 'opacity-100 scale-100 pointer-events-auto translate-y-0 rotate-0'
        )}
      >
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
            fetchConversations(conversations.length === 0);
          }}
          className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-[0_12px_35px_rgba(14,165,233,0.45)] border border-white/20 dark:border-sky-400/40 backdrop-blur-xl transition-transform duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
          title="Open Sri Lanka Customs Messenger"
        >
          <MessageCircle className="w-6 h-6 transition-transform group-hover:rotate-12" />

          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-black text-white shadow-lg shadow-rose-500/50 border-2 border-white dark:border-black animate-bounce">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}

          <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-black animate-pulse" />
        </button>
      </div>

      {/* ========================================================
           2. MESSENGER WINDOW (Light & Pure AMOLED Black Dark Theme)
           ======================================================== */}
      <div
        data-chat-widget="true"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={cn(
          'fixed inset-x-2 bottom-20 sm:inset-x-auto sm:bottom-6 sm:right-6 z-50 w-auto sm:w-[420px] max-w-[calc(100vw-16px)] rounded-3xl origin-bottom-right transition-all duration-300 ease-out select-none flex flex-col overflow-hidden',
          // Opening & Closing Smooth Animation
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-75 translate-y-8 pointer-events-none',
          // Minimize / Maximize height transition
          isMinimized ? 'h-16' : 'h-[620px] max-h-[calc(100dvh-6rem)] sm:max-h-[88vh]',
          // Dragging Highlight
          isDragging && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-black',
          // Translucent Glassmorphism Styling (Light & Dark Mode)
          'bg-white/30 dark:bg-black/35 backdrop-blur-2xl backdrop-saturate-180 text-zinc-900 dark:text-zinc-100 border border-slate-300/40 dark:border-white/10 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.28)]'
        )}
      >
        {/* DRAG-AND-DROP OVERLAY */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-blue-600/90 dark:bg-black/95 backdrop-blur-md flex flex-col items-center justify-center border-2 border-dashed border-white dark:border-sky-400 rounded-3xl pointer-events-none space-y-2">
            <Download className="w-12 h-12 text-white dark:text-sky-300 animate-bounce" />
            <p className="text-sm font-bold text-white">Drop Image or Document Here</p>
            <p className="text-xs text-blue-100 dark:text-sky-200">Will be saved directly to secure VPS storage</p>
          </div>
        )}

        {/* ========================================================
             A. TOP HEADER BAR (Translucent Frosted Glass)
             ======================================================== */}
        <div className="h-16 border-b border-slate-300/30 dark:border-white/10 bg-transparent px-4 flex items-center justify-between gap-2.5 shrink-0 transition-colors">
          {/* Left Header Content */}
          {activePartner ? (
            <div className="flex items-center gap-2.5 truncate">
              <button
                type="button"
                onClick={handleBackToInbox}
                className="w-8 h-8 rounded-full bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300/80 dark:border-zinc-800 flex items-center justify-center text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
                title="Back to Chats"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Recipient Avatar */}
              <div className="relative shrink-0">
                {activePartner.isGroup ? (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white ring-2 ring-white dark:ring-zinc-800 shadow-md">
                    <Users className="w-4 h-4" />
                  </div>
                ) : (
                  <Avatar className="w-9 h-9 ring-2 ring-white dark:ring-zinc-800 shadow-sm shrink-0">
                    {activePartner.partnerAvatarUrl && !activePartner.partnerAvatarUrl.includes('images.unsplash.com') ? (
                      <AvatarImage
                        src={activePartner.partnerAvatarUrl}
                        alt={activePartner.partnerName}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="p-0 border-0 bg-transparent">
                      <MessengerDefaultAvatar className="w-full h-full" />
                    </AvatarFallback>
                  </Avatar>
                )}
                {activePartner.isGroup ? (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1.5 ring-white dark:ring-black animate-pulse" title="Live Frequency" />
                ) : onlineUserIds.includes(activePartner.partnerId) ? (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1.5 ring-white dark:ring-black animate-pulse" title="Online" />
                ) : (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 ring-1.5 ring-white dark:ring-black" title="Offline" />
                )}
              </div>

              {/* Recipient Details */}
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-semibold text-xs text-zinc-900 dark:text-white truncate">
                    {activePartner.partnerName}
                  </span>
                  {activePartner.isGroup ? (
                    <Badge
                      variant="outline"
                      className="font-mono text-[9px] px-1.5 py-0 shrink-0 bg-blue-500/10 text-blue-700 dark:text-sky-300 border-blue-500/30 flex items-center gap-1"
                    >
                      <Users className="w-2.5 h-2.5 text-blue-600 dark:text-sky-400" />
                      GROUP
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className={`font-mono text-[9px] px-1 py-0 shrink-0 ${(ROLE_CONFIGS as Record<string, any>)[activePartner.partnerRole]?.badgeClass || 'bg-slate-500/10 text-slate-400'}`}
                    >
                      {activePartner.partnerRole}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                  {activePartner.isGroup ? (
                    typingUsers['group-long-room'] ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse">
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" />
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce delay-100" />
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce delay-200" />
                        </span>
                        <span>{typingUsers['group-long-room'].name.split(' ')[0]} is typing...</span>
                      </span>
                    ) : (
                      <>
                        <span>All Officers ({activePartner.memberCount || 6})</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Frequency
                        </span>
                      </>
                    )
                  ) : (
                    typingUsers[activePartner.partnerId] ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse">
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" />
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce delay-100" />
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce delay-200" />
                        </span>
                        <span>typing...</span>
                      </span>
                    ) : (
                      <>
                        <span>@{activePartner.partnerUsername}</span>
                        <span>•</span>
                        {onlineUserIds.includes(activePartner.partnerId) ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">
                            Offline
                          </span>
                        )}
                      </>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Inbox Title */
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 p-0.5 shadow-md flex items-center justify-center text-white shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Chats</h2>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{conversations.filter(c => onlineUserIds.includes(c.partnerId)).length} Officers Online</span>
                </div>
              </div>
            </div>
          )}

          {/* Header Right Window Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {activePartner && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-zinc-200/70 dark:hover:bg-zinc-900"
                  title="Direct Line: Ext 4102 (Long Room Documentation)"
                >
                  <Phone className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-white/30 dark:hover:bg-white/10"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-zinc-500 dark:text-zinc-400 hover:text-rose-500 rounded-full hover:bg-white/30 dark:hover:bg-white/10"
              title="Close Messenger"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* ========================================================
                 SCREEN 1: CONVERSATIONS INBOX (Translucent Glass)
                 ======================================================== */}
            {!activePartner && (
              <div className="flex-1 flex flex-col overflow-hidden bg-transparent animate-in fade-in-50 duration-200">
                {/* Search Bar Capsule */}
                <div className="p-3 pb-2 shrink-0 bg-transparent">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <Input
                      placeholder="Search Messenger..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 pl-9 pr-4 rounded-full bg-white/30 dark:bg-white/5 border-slate-300/40 dark:border-white/10 hover:border-blue-400 dark:hover:border-sky-500 focus:border-blue-500 dark:focus:border-sky-500 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all shadow-xs backdrop-blur-sm"
                    />
                  </div>
                </div>

                {/* ACTIVE OFFICERS AVATAR STACK (Image 1 style) */}
                <div className="px-3.5 py-2.5 border-b border-slate-200/50 dark:border-white/10 bg-transparent shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                      Active Officers ({conversations.filter(c => onlineUserIds.includes(c.partnerId)).length})
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>

                  {isConversationsLoading ? (
                    <div className="flex items-center -space-x-3 py-1">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Skeleton key={idx} className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-950" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-0.5">
                      <AvatarStack
                        items={conversations.map((c) => ({
                          id: c.partnerId,
                          name: c.partnerName,
                          role: c.partnerRole,
                          image: c.partnerAvatarUrl && !c.partnerAvatarUrl.includes('images.unsplash.com') ? c.partnerAvatarUrl : null,
                          isOnline: onlineUserIds.includes(c.partnerId),
                        }))}
                        max={4}
                        onSelect={(item) => {
                          const conv = conversations.find((c) => c.partnerId === item.id);
                          if (conv) handleSelectPartner(conv);
                        }}
                      />
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 italic select-none">
                        Tap to chat
                      </span>
                    </div>
                  )}
                </div>

                {/* CONVERSATIONS FLUID LIST */}
                <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 bg-transparent">
                  {isConversationsLoading ? (
                    <div className="p-1 space-y-1 select-none">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/20 dark:bg-white/5">
                          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                          <div className="flex flex-col flex-1 gap-2 min-w-0">
                            <div className="flex items-center justify-between">
                              <Skeleton className="h-3.5 w-28 rounded-md" />
                              <Skeleton className="h-2.5 w-10 rounded-md" />
                            </div>
                            <div className="flex items-center justify-between">
                              <Skeleton className="h-3 w-40 rounded-md" />
                              <Skeleton className="h-4 w-12 rounded-full" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {conversations
                        .filter((c) => {
                          const q = searchQuery.toLowerCase();
                          return (
                            c.partnerName.toLowerCase().includes(q) ||
                            c.partnerUsername.toLowerCase().includes(q) ||
                            c.partnerRole.toLowerCase().includes(q)
                          );
                        })
                        .map((c, idx) => {
                          const avatarCfg = ROLE_AVATARS[c.partnerRole as UserRole] || ROLE_AVATARS.IC;
                          const isMyMessage = c.lastMessage?.senderId === currentUser.id;
                          const hasUnread = c.unreadCount > 0;

                          return (
                            <React.Fragment key={c.partnerId}>
                              {/* Section Divider between Pinned Group and 1-on-1 Direct Messages */}
                              {idx === 1 && conversations.some((x) => x.isPinned) && (
                                <div className="flex items-center gap-2 px-3 pt-2 pb-1 select-none">
                                  <span className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                                    Direct Messages
                                  </span>
                                  <div className="h-[1px] flex-1 bg-slate-200/60 dark:bg-white/10" />
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleSelectPartner(c)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/50 active:bg-white/70 dark:hover:bg-white/10 dark:active:bg-white/15 transition-all text-left group cursor-pointer backdrop-blur-xs"
                              >
                                {/* Circular Avatar with Online/Offline Dot */}
                                <div className="relative shrink-0">
                                  {c.isGroup ? (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white ring-2 ring-white dark:ring-zinc-800 shadow-md group-hover:scale-105 transition-transform">
                                      <Users className="w-6 h-6" />
                                    </div>
                                  ) : (
                                    <Avatar className="w-12 h-12 ring-2 ring-white dark:ring-zinc-800 shadow-md group-hover:scale-105 transition-transform shrink-0">
                                      {c.partnerAvatarUrl && !c.partnerAvatarUrl.includes('images.unsplash.com') ? (
                                        <AvatarImage
                                          src={c.partnerAvatarUrl}
                                          alt={c.partnerName}
                                          className="object-cover"
                                        />
                                      ) : null}
                                      <AvatarFallback className="p-0 border-0 bg-transparent">
                                        <MessengerDefaultAvatar className="w-full h-full" />
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                  {c.isGroup ? (
                                    <span
                                      className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black shadow-xs animate-pulse"
                                      title="Live Channel"
                                    />
                                  ) : onlineUserIds.includes(c.partnerId) ? (
                                    <span
                                      className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black shadow-xs animate-pulse"
                                      title="Online Now"
                                    />
                                  ) : (
                                    <span
                                      className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-600 ring-2 ring-white dark:ring-black shadow-xs"
                                      title="Offline"
                                    />
                                  )}
                                </div>

                                {/* Contact Details & Message Snippet */}
                                <div className="flex flex-col flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1.5 mb-0.5">
                                    <span className={cn('text-[13px] truncate transition-colors', hasUnread ? 'font-bold text-black dark:text-white' : 'font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white')}>
                                      {c.partnerName}
                                    </span>
                                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium shrink-0">
                                      {formatTime(c.lastMessage?.createdAt)}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-xs truncate">
                                      {c.isGroup ? (
                                        typingUsers['group-long-room'] ? (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
                                            <span className="flex gap-0.5">
                                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" />
                                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce delay-100" />
                                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce delay-200" />
                                            </span>
                                            <span>{typingUsers['group-long-room'].name.split(' ')[0]} is typing...</span>
                                          </span>
                                        ) : c.lastMessage?.isDeleted ? (
                                          <span className="italic text-zinc-400 dark:text-zinc-500 flex items-center gap-1 text-xs">
                                            <Ban className="w-3 h-3 inline opacity-60" />
                                            <span>This message was deleted</span>
                                          </span>
                                        ) : (
                                          <>
                                            {isMyMessage && (
                                              <span className="shrink-0">
                                                {c.lastMessage?.isRead ? (
                                                  <CheckCheck className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 inline" />
                                                ) : (
                                                  <CheckCheck className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 inline" />
                                                )}
                                              </span>
                                            )}
                                            <span className={cn('truncate text-xs', hasUnread ? 'font-semibold text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400')}>
                                              {c.lastMessage && !isMyMessage && c.lastMessage.senderName ? (
                                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                                  {c.lastMessage.senderName.split(' ')[0]}:{' '}
                                                </span>
                                              ) : null}
                                              {c.lastMessage?.content || <span className="italic text-zinc-400 dark:text-zinc-500">Say hello...</span>}
                                            </span>
                                          </>
                                        )
                                      ) : (
                                        typingUsers[c.partnerId] ? (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
                                            <span className="flex gap-0.5">
                                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" />
                                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce delay-100" />
                                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce delay-200" />
                                            </span>
                                            <span>typing...</span>
                                          </span>
                                        ) : c.lastMessage?.isDeleted ? (
                                          <span className="italic text-zinc-400 dark:text-zinc-500 flex items-center gap-1 text-xs">
                                            <Ban className="w-3 h-3 inline opacity-60" />
                                            <span>This message was deleted</span>
                                          </span>
                                        ) : (
                                          <>
                                            {isMyMessage && (
                                              <span className="shrink-0">
                                                {c.lastMessage?.isRead ? (
                                                  <CheckCheck className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 inline" />
                                                ) : (
                                                  <CheckCheck className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 inline" />
                                                )}
                                              </span>
                                            )}
                                            <span className={cn('truncate text-xs', hasUnread ? 'font-semibold text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400')}>
                                              {c.lastMessage?.content || <span className="italic text-zinc-400 dark:text-zinc-500">Say hello...</span>}
                                            </span>
                                          </>
                                        )
                                      )}
                                    </div>

                                    {/* Right Side: WhatsApp-style clean Pin icon & unread badge */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {hasUnread && (
                                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-md shadow-blue-600/40">
                                          {c.unreadCount}
                                        </span>
                                      )}
                                      {c.isPinned && (
                                        <span title="Pinned Chat">
                                          <Pin className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 fill-zinc-400/20 dark:fill-zinc-500/20 rotate-45 shrink-0" />
                                        </span>
                                      )}
                                      {!hasUnread && !c.isPinned && !c.isGroup && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] font-mono px-1.5 py-0 border-transparent bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-300"
                                        >
                                          {c.partnerRole}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </React.Fragment>
                          );
                        })}

                      {conversations.length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-zinc-500 space-y-2">
                          <User className="w-8 h-8 text-zinc-400 dark:text-zinc-700" />
                          <p className="text-xs">No registered customs officers found.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                 SCREEN 2: 1-ON-1 ACTIVE PRIVATE CONVERSATION (Translucent Glass)
                 ======================================================== */}
            {activePartner && (
              <div className="flex-1 flex flex-col overflow-hidden bg-transparent animate-in fade-in-50 duration-200">
                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 select-text bg-transparent">
                  {isMessagesLoading ? (
                    <div className="space-y-4 select-none py-1">
                      {/* 1. Incoming Text Bubble Skeleton */}
                      <div className="flex items-end gap-2 max-w-[80%]">
                        <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-9 w-44 rounded-2xl rounded-bl-xs" />
                          <Skeleton className="h-2 w-10 rounded-md ml-1" />
                        </div>
                      </div>

                      {/* 2. Outgoing Text Bubble Skeleton */}
                      <div className="flex flex-col items-end gap-1 ml-auto max-w-[80%]">
                        <Skeleton className="h-9 w-36 rounded-2xl rounded-br-xs" />
                        <Skeleton className="h-2 w-10 rounded-md mr-1" />
                      </div>

                      {/* 3. Incoming Image Attachment Card Skeleton */}
                      <div className="flex items-end gap-2 max-w-[80%]">
                        <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                        <div className="space-y-1">
                          <Skeleton className="h-32 w-48 rounded-2xl rounded-bl-xs" />
                          <Skeleton className="h-2 w-12 rounded-md ml-1" />
                        </div>
                      </div>

                      {/* 4. Outgoing File Attachment Card Skeleton */}
                      <div className="flex flex-col items-end gap-1 ml-auto max-w-[85%]">
                        <div className="p-3 rounded-2xl rounded-br-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-52 flex items-center gap-3">
                          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <Skeleton className="h-3 w-28 rounded-md" />
                            <Skeleton className="h-2 w-14 rounded-md" />
                          </div>
                          <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                        </div>
                        <Skeleton className="h-2 w-10 rounded-md mr-1" />
                      </div>

                      {/* 5. Incoming Short Text Skeleton */}
                      <div className="flex items-end gap-2 max-w-[80%]">
                        <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-8 w-28 rounded-2xl rounded-bl-xs" />
                          <Skeleton className="h-2 w-8 rounded-md ml-1" />
                        </div>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-3">
                      <Avatar className="w-16 h-16 ring-2 ring-zinc-200 dark:ring-zinc-700 shadow-xl shrink-0">
                        {activePartner.partnerAvatarUrl && !activePartner.partnerAvatarUrl.includes('images.unsplash.com') ? (
                          <AvatarImage
                            src={activePartner.partnerAvatarUrl}
                            alt={activePartner.partnerName}
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="p-0 border-0 bg-transparent">
                          <MessengerDefaultAvatar className="w-full h-full" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          Private Line with {activePartner.partnerName}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
                          Send voice recordings, CusDec documents, declaration images, or direct messages.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setInputText('Hello Officer, reviewing CusDec documentation now.')}
                          className="px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                        >
                          "Hello Officer 👋"
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputText('Please verify counter stamp clearance.')}
                          className="px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                        >
                          "Verify counter stamp"
                        </button>
                      </div>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.senderId === currentUser.id;
                      const msgType = m.type || (m.attachment ? (m.attachment.fileType.startsWith('image/') ? 'image' : m.attachment.fileType.startsWith('audio/') ? 'audio' : 'document') : 'text');

                      return (
                        <ChatBubble
                          key={m.id}
                          variant={isMe ? 'sent' : 'received'}
                          className="group mb-3.5 items-end"
                        >
                          <ChatBubbleAvatar
                            src={
                              isMe
                                ? currentUser.avatarUrl
                                : activePartner?.isGroup
                                  ? undefined
                                  : activePartner?.partnerAvatarUrl
                            }
                            className="w-7 h-7 shrink-0 ring-1.5 ring-white dark:ring-zinc-800 shadow-xs mb-1"
                          />

                          <div className={cn('flex flex-col gap-1 max-w-[82%] relative', isMe ? 'items-end' : 'items-start')}>
                            {/* Group Chat: Sender Identification for other officers */}
                            {activePartner?.isGroup && !isMe && (
                              <div className="flex items-center gap-1.5 px-1 mb-0.5">
                                <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                                  {m.senderName}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "font-mono text-[8px] px-1 py-0 uppercase",
                                    ROLE_CONFIGS[m.senderRole]?.badgeClass || "bg-slate-500/10 text-slate-400"
                                  )}
                                >
                                  {m.senderRole}
                                </Badge>
                              </div>
                            )}

                            {/* Optional Tag Header */}
                            {m.tag && (
                              <div
                                className={cn(
                                  'text-[9px] font-mono font-bold tracking-wider px-1 text-blue-600 dark:text-sky-400',
                                  isMe ? 'text-right' : 'text-left'
                                )}
                              >
                                {m.tag}
                              </div>
                            )}

                            {/* Deleted Message Tombstone vs Active Message Content */}
                            {m.isDeleted ? (
                              <div
                                className={cn(
                                  'flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs italic select-none border border-dashed border-slate-300 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 text-slate-400 dark:text-slate-500 backdrop-blur-xs',
                                  isMe ? 'rounded-br-xs' : 'rounded-bl-xs'
                                )}
                              >
                                <Ban className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                <span>{isMe ? 'You deleted this message' : 'This message was deleted'}</span>
                              </div>
                            ) : (
                              <>
                                {/* 1. AUDIO VOICE NOTE BUBBLE */}
                                {msgType === 'audio' && m.attachment && (
                                  <ChatBubbleMessage
                                    variant={isMe ? 'sent' : 'received'}
                                    className={cn(
                                      'p-2 text-xs shadow-md transition-all rounded-2xl',
                                      isMe
                                        ? 'bg-blue-600 text-white rounded-br-xs shadow-blue-600/20'
                                        : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/70 dark:border-white/10 text-zinc-900 dark:text-zinc-100 rounded-bl-xs shadow-xs'
                                    )}
                                  >
                                    <VoiceNotePlayer
                                      url={m.attachment.url}
                                      duration={m.attachment.duration}
                                      isMe={isMe}
                                    />
                                  </ChatBubbleMessage>
                                )}

                                {/* 2. IMAGE (Clean photo presentation without frame, borders or padding) */}
                                {msgType === 'image' && m.attachment && (
                                  <div
                                    className={cn(
                                      'relative group overflow-hidden max-w-full rounded-2xl shadow-sm transition-all select-none',
                                      isMe ? 'rounded-br-xs' : 'rounded-bl-xs'
                                    )}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={m.attachment.url}
                                      alt={m.attachment.fileName}
                                      className={cn(
                                        'max-h-72 w-auto max-w-full block object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]',
                                        isMe ? 'rounded-2xl rounded-br-xs' : 'rounded-2xl rounded-bl-xs'
                                      )}
                                      onClick={() => setLightboxImage(m.attachment?.url || null)}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setLightboxImage(m.attachment?.url || null)}
                                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
                                      title="View Full Size"
                                    >
                                      <Maximize2 className="w-3.5 h-3.5" />
                                    </button>
                                    {m.content && m.content !== `📷 ${m.attachment.fileName}` && (
                                      <div
                                        className={cn(
                                          'px-3 py-1.5 text-xs break-words',
                                          isMe
                                            ? 'bg-blue-600 text-white rounded-b-2xl rounded-br-xs'
                                            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-t border-zinc-200 dark:border-zinc-800 rounded-b-2xl rounded-bl-xs'
                                        )}
                                      >
                                        {renderFormattedMessage(m.content, currentUser.username)}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* 3. DOCUMENT ATTACHMENT (Clean card, no blue bubble) */}
                                {msgType === 'document' && m.attachment && (
                                  <ChatBubbleMessage
                                    variant={isMe ? 'sent' : 'received'}
                                    className={cn(
                                      'p-2.5 text-xs shadow-md transition-all rounded-2xl max-w-full',
                                      isMe
                                        ? 'bg-blue-600 text-white rounded-br-xs shadow-blue-600/20'
                                        : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/70 dark:border-white/10 rounded-bl-xs text-zinc-900 dark:text-zinc-100 shadow-xs'
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 flex items-center justify-center shrink-0">
                                        {getDocumentIcon(m.attachment.fileName, m.attachment.fileType)}
                                      </div>
                                      <div className="flex flex-col flex-1 min-w-0 pr-1">
                                        <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate" title={m.attachment.fileName}>
                                          {m.attachment.fileName}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                                          {formatFileSize(m.attachment.fileSize)}
                                        </span>
                                      </div>
                                      <a
                                        href={m.attachment.url}
                                        download={m.attachment.fileName}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 hover:bg-blue-600 hover:text-white dark:hover:bg-sky-500 dark:hover:text-white text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 transition-colors shadow-xs cursor-pointer"
                                        title="Download File"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </div>
                                    {m.content && m.content !== `📄 ${m.attachment.fileName}` && (
                                      <div className="pt-2 px-1 text-xs text-zinc-800 dark:text-zinc-200 break-words border-t border-zinc-200/60 dark:border-zinc-800/60 mt-2">
                                        {renderFormattedMessage(m.content, currentUser.username)}
                                      </div>
                                    )}
                                  </ChatBubbleMessage>
                                )}

                                {/* 4. STANDARD TEXT BUBBLE */}
                                {msgType === 'text' && (
                                  <ChatBubbleMessage
                                    variant={isMe ? 'sent' : 'received'}
                                    className={cn(
                                      'px-3.5 py-2.5 text-xs leading-relaxed break-words shadow-sm transition-all',
                                      isMe
                                        ? 'bg-blue-600 text-white rounded-2xl rounded-br-xs shadow-blue-600/20'
                                        : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/70 dark:border-white/10 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-bl-xs shadow-xs'
                                    )}
                                  >
                                    {renderFormattedMessage(m.content, currentUser.username)}
                                  </ChatBubbleMessage>
                                )}
                              </>
                            )}

                            {/* WhatsApp Floating Emoji Reaction Bar */}
                            {!m.isDeleted && activeReactionMsgId === m.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  'absolute -top-10 z-30 flex items-center gap-0.5 px-2 py-1 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-xl border border-slate-200 dark:border-white/10 backdrop-blur-md animate-in zoom-in-75 fade-in duration-150 select-none',
                                  isMe ? 'right-0' : 'left-0'
                                )}
                              >
                                {QUICK_REACTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleToggleReaction(m.id, emoji)}
                                    className="text-base sm:text-lg hover:scale-125 active:scale-95 transition-transform duration-150 p-1 cursor-pointer leading-none border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                                    style={{ outline: 'none', border: 'none' }}
                                    title={`React ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* WhatsApp Reactions Badges */}
                            {!m.isDeleted && m.reactions && m.reactions.length > 0 && (
                              <div
                                className={cn(
                                  'flex flex-wrap items-center gap-1 mt-0.5 mb-0.5',
                                  isMe ? 'justify-end' : 'justify-start'
                                )}
                              >
                                {(() => {
                                  const map = new Map<string, { count: number; users: string[]; hasReacted: boolean }>();
                                  m.reactions.forEach((r) => {
                                    const ex = map.get(r.emoji) || { count: 0, users: [], hasReacted: false };
                                    ex.count += 1;
                                    ex.users.push(r.userName);
                                    if (r.userId === currentUser.id) ex.hasReacted = true;
                                    map.set(r.emoji, ex);
                                  });
                                  return Array.from(map.entries()).map(([emoji, data]) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => handleToggleReaction(m.id, emoji)}
                                      title={`${emoji} reacted by: ${data.users.join(', ')}`}
                                      className={cn(
                                        'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-transform active:scale-95 cursor-pointer border-0 ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 select-none shadow-sm',
                                        data.hasReacted
                                          ? 'bg-blue-50/95 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300'
                                          : 'bg-white/95 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700/80'
                                      )}
                                      style={{ outline: 'none', border: 'none' }}
                                    >
                                      <span>{emoji}</span>
                                      {data.count > 1 && <span className="font-mono text-[9px] font-bold">{data.count}</span>}
                                    </button>
                                  ));
                                })()}
                              </div>
                            )}

                            {/* Timestamp + WhatsApp Double Checkmark (✓✓) + Reaction Trigger + Delete Action */}
                            <div
                              className={cn(
                                'flex items-center gap-1 text-[9px] text-zinc-400 dark:text-zinc-500 font-mono px-1',
                                isMe ? 'justify-end' : 'justify-start'
                              )}
                            >
                              <span>
                                {new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>

                              {isMe && (
                                <span title={m.isRead ? 'Read' : 'Delivered'}>
                                  {m.isRead ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                                  ) : (
                                    <CheckCheck className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                                  )}
                                </span>
                              )}

                              {!m.isDeleted && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveReactionMsgId(activeReactionMsgId === m.id ? null : m.id);
                                  }}
                                  title="React with emoji"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-zinc-400 hover:text-amber-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 cursor-pointer ml-1"
                                >
                                  <Smile className="w-3 h-3" />
                                </button>
                              )}

                              {!m.isDeleted && (isMe || currentUser?.role === 'DEV') && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMessage(m.id)}
                                  title="Delete message for everyone"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-zinc-400 hover:text-red-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 cursor-pointer ml-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </ChatBubble>
                      );
                    })
                  )}
                  {/* Active Uploading Attachment Skeleton */}
                  {isUploading && (
                    <div className="flex flex-col items-end gap-1 ml-auto max-w-[85%] animate-in fade-in-50 duration-200">
                      <div className="p-2.5 rounded-2xl rounded-br-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                        <div className="space-y-1.5 flex-1 min-w-[140px]">
                          <Skeleton className="h-3 w-28 rounded-md" />
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-[200px]">
                              {uploadStatusText || 'Uploading media to VPS...'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp-style live typing bubble in message viewport */}
                  {((activePartner.isGroup && typingUsers['group-long-room']) || (!activePartner.isGroup && typingUsers[activePartner.partnerId])) && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-2xl bg-white/70 dark:bg-zinc-800/70 border border-slate-200/60 dark:border-white/10 w-fit backdrop-blur-md shadow-xs animate-in fade-in-50 slide-in-from-bottom-1">
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
                        {activePartner.isGroup ? `${typingUsers['group-long-room']?.name.split(' ')[0]} is typing` : 'Typing'}
                      </span>
                      <span className="flex gap-1 ml-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-sky-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-sky-400 animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-sky-400 animate-bounce delay-200" />
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* INPUT DOCK (Translucent Liquid Glass) */}
                <div className="relative p-2.5 border-t border-slate-300/30 dark:border-white/10 bg-transparent shrink-0 transition-colors">
                  {/* Messenger-style @mention dropdown popup */}
                  {showMentions && mentionCandidates.length > 0 && (
                    <div className="absolute bottom-full left-3 right-3 mb-2 max-h-48 overflow-y-auto rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200/80 dark:border-white/15 shadow-2xl p-1.5 z-50 animate-in fade-in-50 slide-in-from-bottom-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase border-b border-slate-100 dark:border-white/5 mb-1">
                        <AtSign className="w-3 h-3 text-blue-500" />
                        <span>Mention Customs Officer</span>
                      </div>
                      <div className="space-y-0.5">
                        {mentionCandidates.map((cand, idx) => (
                          <button
                            key={cand.partnerId}
                            type="button"
                            onClick={() => handleSelectMention(cand)}
                            className={cn(
                              'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer',
                              idx === mentionIndex
                                ? 'bg-blue-500/15 text-blue-700 dark:text-sky-300'
                                : 'hover:bg-slate-100 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200'
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="relative shrink-0">
                                <Avatar className="w-6 h-6 shrink-0">
                                  {cand.partnerAvatarUrl && !cand.partnerAvatarUrl.includes('images.unsplash.com') ? (
                                    <AvatarImage src={cand.partnerAvatarUrl} alt={cand.partnerName} />
                                  ) : null}
                                  <AvatarFallback className="p-0 border-0 bg-transparent">
                                    <MessengerDefaultAvatar className="w-full h-full" />
                                  </AvatarFallback>
                                </Avatar>
                                {onlineUserIds.includes(cand.partnerId) && (
                                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-black animate-pulse" />
                                )}
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-semibold truncate leading-tight">{cand.partnerName}</p>
                                <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">@{cand.partnerUsername}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[8px] font-mono px-1 py-0 shrink-0">
                              {cand.partnerRole}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* LIVE VOICE RECORDING MODE */}
                  {isRecording ? (
                    <div className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 animate-pulse">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                          Recording Voice Note... {formatSeconds(recordSeconds)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelRecording}
                          className="p-1.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 hover:bg-rose-100 dark:hover:bg-rose-900 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-300 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
                          title="Discard recording"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <Button
                          type="button"
                          onClick={stopAndSendRecording}
                          className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/40 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" /> Send Voice
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* STANDARD TEXT + MEDIA INPUT BAR */
                    <form onSubmit={handleSendText} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="w-8 h-8 rounded-full bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-sky-400 transition-colors shrink-0 cursor-pointer shadow-xs backdrop-blur-xs"
                        title="Attach Document (.pdf, .xlsx, .csv, .docx, .zip)"
                        disabled={isUploading}
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          imageInputRef.current?.click();
                        }}
                        className="w-8 h-8 rounded-full bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-zinc-600 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors shrink-0 cursor-pointer shadow-xs backdrop-blur-xs"
                        title="Send Declaration Image or Screenshot"
                        disabled={isUploading}
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-8 h-8 rounded-full bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-zinc-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors shrink-0 cursor-pointer shadow-xs backdrop-blur-xs"
                        title="Record Voice Note"
                        disabled={isUploading}
                      >
                        <Mic className="w-4 h-4" />
                      </button>

                      <Input
                        value={inputText}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (showMentions && mentionCandidates.length > 0) {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setMentionIndex((prev) => (prev + 1) % mentionCandidates.length);
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setMentionIndex((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length);
                            } else if (e.key === 'Enter' || e.key === 'Tab') {
                              if (mentionCandidates[mentionIndex]) {
                                e.preventDefault();
                                handleSelectMention(mentionCandidates[mentionIndex]);
                              }
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setShowMentions(false);
                            }
                          }
                        }}
                        placeholder={
                          isUploading
                            ? 'Uploading to VPS disk...'
                            : `Message ${activePartner.partnerName.split(' ')[0]} (@ to mention)...`
                        }
                        disabled={isUploading}
                        className="h-9 text-xs bg-white/30 dark:bg-white/10 border-slate-300/40 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded-full focus:border-blue-500 dark:focus:border-sky-500 flex-1 px-4 shadow-xs backdrop-blur-sm"
                      />

                      <Button
                        type="submit"
                        disabled={!inputText.trim() || isUploading}
                        className="h-9 w-9 p-0 rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 text-white shrink-0 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                        title="Send (Enter)"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================
           LIGHTBOX MODAL FOR HIGH-RESOLUTION IMAGE PREVIEWS
           ======================================================== */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in-50 duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] p-2" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <a
                href={lightboxImage}
                download
                className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white transition-colors"
                title="Download full size"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="High resolution preview"
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain border border-zinc-800"
            />
          </div>
        </div>
      )}

      {/* ========================================================
           MICROPHONE ACCESS & VOICE RECORDING MODAL
           ======================================================== */}
      {showMicModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in-50 duration-200"
          onClick={() => setShowMicModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Enable Voice Recording
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Browser Hardware Security Policy
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMicModal(false)}
                className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
              <p>
                Modern browsers (Chrome, Edge) strictly disable live microphone access when connected via an unencrypted network IP (
                <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">{typeof window !== 'undefined' ? location.origin : ''}</span>
                ).
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Choose an instant solution below:
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-1">
              {/* Option 1: Switch to localhost */}
              <button
                type="button"
                onClick={() => {
                  const target = new URL(window.location.href);
                  target.hostname = 'localhost';
                  window.location.href = target.toString();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                  <div className="text-left">
                    <div>Switch to localhost:5000 (Recommended)</div>
                    <div className="text-[10px] text-blue-100 font-normal">
                      Instant 1-click fix if you are on this computer
                    </div>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Option 2: Upload Audio File Fallback */}
              <button
                type="button"
                onClick={() => {
                  setShowMicModal(false);
                  audioInputRef.current?.click();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                <div className="text-left">
                  <div>Select Voice Memo or Audio File</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">
                    Upload pre-recorded voice note (.mp3, .wav, .webm, .m4a)
                  </div>
                </div>
                <Paperclip className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* LAN Devices note */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Accessing from another device on Wi-Fi?
              </span>
              <p>
                In Chrome, open <span className="font-mono text-blue-600 dark:text-sky-400 select-all">chrome://flags/#unsafely-treat-insecure-origin-as-secure</span>, enable it, and add <span className="font-mono text-zinc-800 dark:text-zinc-200 font-bold select-all">{typeof window !== 'undefined' ? location.origin : ''}</span>. Or launch the server with HTTPS using <span className="font-mono text-zinc-800 dark:text-zinc-200">npm run dev:https</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Realtime WhatsApp Notification Card Overlay (Bottom Right Corner with Sound) */}
      <WhatsAppNotificationToast
        notification={incomingNotification}
        onDismiss={() => setIncomingNotification(null)}
        onOpenChat={handleOpenFromNotification}
        isChatOpen={isOpen && !isMinimized}
      />
    </>
  );
}
