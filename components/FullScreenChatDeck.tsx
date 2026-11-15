'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SafeUser, UserRole, ROLE_CONFIGS } from '@/lib/authTypes';
import { ChatMessage, ConversationSummary, ChatAttachment, MessageType } from '@/lib/chatTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from '@/components/ui/chat-bubble';
import { Avatar, AvatarImage, AvatarFallback, DefaultUserAvatar, MessengerDefaultAvatar } from '@/components/ui/avatar';
import { AvatarStack, getOfficerAvatar } from '@/components/ui/avatar-group';
import { cn } from '@/lib/utils';
import {
  Search,
  SquarePen,
  ListFilter,
  MessageSquareDot,
  Star,
  CircleUserRound,
  CircleOff,
  Users,
  MessageSquareDashed,
  Video,
  Phone,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Camera,
  File as FileIcon,
  UserRound,
  ChartBarIncreasing,
  Brush,
  Send,
  Mic,
  HardDrive,
  CheckCheck,
  Download,
  Play,
  Pause,
  Trash2,
  X,
  Maximize2,
  Volume2,
  ArrowLeft,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Lock,
  User,
  Radio,
  Pin,
  Ban,
  AtSign
} from 'lucide-react';

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

interface FullScreenChatDeckProps {
  currentUser: SafeUser | null;
  initialPartnerId?: string;
  onClose?: () => void;
}

// WhatsApp-style quick reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

// Visual wave bars for voice notes
const WAVE_BARS = [35, 60, 95, 45, 80, 100, 70, 50, 85, 40, 65, 90, 55, 30, 75, 95, 40, 60];

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getDocumentIcon(fileName: string, mime: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf' || mime.includes('pdf')) {
    return <FileText className="w-5 h-5 text-rose-500 shrink-0" />;
  }
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || mime.includes('spreadsheet') || mime.includes('csv')) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />;
  }
  if (ext === 'zip' || ext === 'tar' || ext === 'gz') {
    return <FileArchive className="w-5 h-5 text-amber-500 shrink-0" />;
  }
  return <FileIcon className="w-5 h-5 text-blue-500 shrink-0" />;
}

// ---------------------------------------------------------------------------
// Interactive Voice Note Player
// ---------------------------------------------------------------------------
function VoiceNoteBubble({
  url,
  duration,
  isMe,
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
        setTotalDuration(Math.round(audio.duration));
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
    <div className="flex items-center gap-3 py-1 px-1 min-w-[210px] sm:min-w-[260px]">
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md cursor-pointer',
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
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            <span>Voice</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full-Screen Edge-to-Edge Synchronized Chat Deck
// ---------------------------------------------------------------------------
export function FullScreenChatDeck({
  currentUser,
  initialPartnerId,
  onClose,
}: FullScreenChatDeckProps) {
  // Navigation & Partner State
  const [activePartner, setActivePartner] = useState<ConversationSummary | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // UI Modals & Uploading
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Audio Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Skeleton Loading States
  const [isConversationsLoading, setIsConversationsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

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

  // Clean up stale typing statuses every 1.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
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
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const activePartnerRef = useRef<ConversationSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    activePartnerRef.current = activePartner;
  }, [activePartner]);

  // 1. Fetch live conversations list
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

        // Accurately sync exact live online user IDs from server
        const activeIds = data.conversations
          .filter((c: ConversationSummary) => c.isOnline)
          .map((c: ConversationSummary) => c.partnerId);
        setOnlineUserIds(activeIds);

        // Auto-select initial partner if none active
        if (!activePartnerRef.current && data.conversations.length > 0) {
          const target = initialPartnerId
            ? data.conversations.find((c: ConversationSummary) => c.partnerId === initialPartnerId) || data.conversations[0]
            : data.conversations[0];
          setActivePartner(target);
          activePartnerRef.current = target;
          fetchMessages(target.partnerId);
        }
      }
    } catch (err) {
      console.error('[FullChat Fetch Conversations Error]:', err);
    } finally {
      setIsConversationsLoading(false);
    }
  }, [currentUser, initialPartnerId]);

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
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    } catch (err) {
      console.error('[FullChat Fetch Messages Error]:', err);
    } finally {
      setIsMessagesLoading(false);
    }
  }, [currentUser]);

  // 3. Setup Zero-Delay SSE Stream (Synced with Floating Widget)
  useEffect(() => {
    if (!currentUser) return;

    let isSubscribed = true;
    let sseInstance: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    fetchConversations(true);

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

      // A. Connected event
      sse.addEventListener('connected', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data.onlineUserIds)) {
            setOnlineUserIds(data.onlineUserIds);
          }
        } catch (err) {
          console.error('[FullChat SSE Connected Parse Error]:', err);
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
          console.error('[FullChat SSE Presence Parse Error]:', err);
        }
      });

      // C. Incoming messages (Instant Zero-Delay Push for 1-on-1 and Group Chat)
      sse.addEventListener('new_message', (event: MessageEvent) => {
        try {
          const newMsg: ChatMessage = JSON.parse(event.data);
          const currentPartner = activePartnerRef.current;
          const isGroupMsg = newMsg.receiverId === 'group-long-room' || newMsg.channelId === 'group-long-room';

          // 1. Update message viewport if chatting in this channel/partner
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

            // Mark as read if from partner or group
            if (isGroupMsg) {
              fetch('/api/chat/messages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partnerId: 'group-long-room' })
              }).catch(() => { });
            } else if (newMsg.senderId === currentPartner.partnerId) {
              fetch('/api/chat/messages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partnerId: currentPartner.partnerId })
              }).catch(() => { });
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
              fetchConversations(false);
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

          // Sync server conversations state in background
          fetchConversations(false);
        } catch (err) {
          console.error('[FullChat SSE message parse error]:', err);
        }
      });

      // D. Realtime Read Receipt (Instant WhatsApp Double Blue Tick ✓✓ without page reload)
      sse.addEventListener('read_receipt', (event: MessageEvent) => {
        try {
          const receipt = JSON.parse(event.data);
          const currentPartner = activePartnerRef.current;

          // 1. If currently looking at the conversation, turn sent grey checks into blue double ticks
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
          console.error('[FullChat SSE Read Receipt Error]:', err);
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
          console.error('[FullChat SSE message_deleted Error]:', err);
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
          console.error('[FullChat SSE typing Error]:', err);
        }
      });

      // Message reactions (WhatsApp emoji reactions)
      sse.addEventListener('message_reaction', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setMessages((prev) =>
            prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
          );
        } catch (err) {
          console.error('[FullChat SSE Reaction Error]:', err);
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

  // Select partner
  const handleSelectPartner = (partner: ConversationSummary) => {
    setActivePartner(partner);
    activePartnerRef.current = partner;
    fetchMessages(partner.partnerId);

    // Mark as read
    if (partner.unreadCount > 0) {
      fetch('/api/chat/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId: partner.partnerId })
      }).then(() => fetchConversations(false)).catch(() => { });
    }
  };

  // Upload attachment raw
  const uploadAttachmentRaw = async (
    file: Blob | File,
    customName?: string,
    duration?: number
  ): Promise<ChatAttachment | null> => {
    const formData = new FormData();
    const finalName = customName || (file instanceof File ? file.name : `attachment-${Date.now()}`);
    formData.append('file', file, finalName);
    if (duration) {
      formData.append('duration', duration.toString());
    }

    try {
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.attachment) {
        return data.attachment;
      }
      return null;
    } catch (err) {
      console.error('[Upload Exception]:', err);
      return null;
    }
  };

  // Send message payload
  const sendMessagePayload = async ({
    content,
    attachment,
    type,
  }: {
    content?: string;
    attachment?: ChatAttachment;
    type?: MessageType;
  }) => {
    if (!activePartner || !currentUser) return;

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: activePartner.partnerId,
          content: content || '',
          type: type || 'text',
          attachment
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
        fetchConversations(false);
      }
    } catch (err) {
      console.error('[FullChat Send Error]:', err);
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
      console.error('[FullChat Toggle Reaction Error]:', err);
    }
  };

  // Text submit
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

  // File pickers
  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activePartner) return;
    const fileList = Array.from(files);
    e.target.value = '';

    setIsUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const isImg = file.type.startsWith('image/');
        const isAudio = file.type.startsWith('audio/');
        const type: MessageType = isImg ? 'image' : isAudio ? 'audio' : 'document';
        setUploadStatusText(`Sending ${file.name}...`);

        const attachment = await uploadAttachmentRaw(file);
        if (attachment) {
          await sendMessagePayload({
            attachment,
            type,
            content: isImg ? `📷 ${file.name}` : `📄 ${file.name}`
          });
        }
      }
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        if (recordSeconds > 0) {
          setIsUploading(true);
          setUploadStatusText('Transmitting voice note...');
          try {
            const fileName = `voice-note-${Date.now()}.webm`;
            const attachment = await uploadAttachmentRaw(audioBlob, fileName, recordSeconds);
            if (attachment) {
              await sendMessagePayload({
                attachment,
                type: 'audio',
                content: `🎙️ Voice Note (${formatSeconds(recordSeconds)})`
              });
            }
          } finally {
            setIsUploading(false);
            setUploadStatusText('');
          }
        }
        setIsRecording(false);
        setRecordSeconds(0);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[Mic Permission Error]:', err);
      alert('Microphone access is required to record voice notes.');
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
    }
    if (mediaRecorderRef.current && isRecording) {
      setRecordSeconds(0);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Format time
  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.partnerName.toLowerCase().includes(q) ||
      c.partnerUsername.toLowerCase().includes(q) ||
      c.partnerRole.toLowerCase().includes(q);

    if (roleFilter === 'UNREAD') return matchesSearch && c.unreadCount > 0;
    if (roleFilter === 'APPRAISER') return matchesSearch && c.partnerRole.includes('APPRAISER');
    if (roleFilter === 'IC') return matchesSearch && c.partnerRole === 'IC';
    return matchesSearch;
  });

  return (
    <div className="w-full h-[calc(100vh-5.5rem)] flex flex-col bg-white dark:bg-[#070b14] overflow-hidden select-none">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilePicked}
        className="hidden"
        multiple
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFilePicked}
        accept="image/*,video/*"
        className="hidden"
        multiple
      />

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in-50 duration-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Resizable Edge-to-Edge Container */}
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        {/* ========================================================
             LEFT PANEL: CHATS INBOX & OFFICERS DIRECTORY
             ======================================================== */}
        <ResizablePanel defaultSize={28} minSize={22} maxSize={40} className="flex-grow">
          <div className="flex flex-col h-full border-r border-slate-200/90 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#070b14]">
            {/* Top Toolbar */}
            <div className="h-14 px-4 border-b border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-white dark:bg-[#070b14]">
              <div className="flex items-center gap-2.5">
                <h1 className="font-black text-base text-slate-900 dark:text-white tracking-tight">Chats</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  {conversations.filter(c => onlineUserIds.includes(c.partnerId)).length} Officers Online
                </span>
              </div>

              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl">
                      <ListFilter className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48" align="end">
                    <DropdownMenuLabel className="text-xs">Filter Chats</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setRoleFilter('ALL')} className={roleFilter === 'ALL' ? 'font-bold text-cyan-600' : ''}>
                      <Users className="mr-2 w-4 h-4" /> All Officers
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRoleFilter('UNREAD')} className={roleFilter === 'UNREAD' ? 'font-bold text-cyan-600' : ''}>
                      <MessageSquareDot className="mr-2 w-4 h-4 text-emerald-500" /> Unread Messages
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRoleFilter('APPRAISER')} className={roleFilter === 'APPRAISER' ? 'font-bold text-cyan-600' : ''}>
                      <Star className="mr-2 w-4 h-4 text-amber-500" /> Appraisers
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRoleFilter('IC')} className={roleFilter === 'IC' ? 'font-bold text-cyan-600' : ''}>
                      <CircleUserRound className="mr-2 w-4 h-4 text-sky-500" /> IC Officers
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchConversations(true)}
                  className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl"
                  title="Refresh Conversations"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-3 pb-2 shrink-0 bg-white dark:bg-[#070b14]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search or start new chat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 pr-4 rounded-xl bg-slate-100 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Active Officers Avatar Stack Bar (Image 1 style) */}
            <div className="px-3.5 py-2.5 border-b border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#070b14] shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
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
                    <Skeleton key={idx} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900" />
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
                    activeId={activePartner?.partnerId}
                    onSelect={(item) => {
                      const conv = conversations.find((c) => c.partnerId === item.id);
                      if (conv) handleSelectPartner(conv);
                    }}
                  />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 italic select-none">
                    Select to open line
                  </span>
                </div>
              )}
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 bg-white dark:bg-[#070b14]">
              {isConversationsLoading ? (
                <div className="p-2 space-y-2 select-none">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-2xl">
                      <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-28 rounded-md" />
                        <Skeleton className="h-3 w-40 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                filteredConversations.map((c, idx) => {
                  const isSelected = activePartner?.partnerId === c.partnerId;
                  const hasUnread = c.unreadCount > 0;

                  return (
                    <React.Fragment key={c.partnerId}>
                      {/* Section Divider between Pinned Group and 1-on-1 Direct Messages */}
                      {idx === 1 && filteredConversations.some((x) => x.isPinned) && (
                        <div className="flex items-center gap-2 px-3 pt-2 pb-1 select-none">
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                            Direct Messages
                          </span>
                          <div className="h-[1px] flex-1 bg-slate-200/60 dark:bg-slate-800" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSelectPartner(c)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left cursor-pointer group',
                          isSelected
                            ? 'bg-slate-100/95 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/60 border border-transparent text-slate-900 dark:text-slate-100'
                        )}
                      >
                        <div className="relative shrink-0">
                          {c.isGroup ? (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white ring-2 ring-white dark:ring-slate-800 shadow-md group-hover:scale-105 transition-transform">
                              <Users className="w-6 h-6" />
                            </div>
                          ) : (
                            <Avatar className="w-12 h-12 ring-2 ring-white dark:ring-slate-800 shadow-md group-hover:scale-105 transition-transform shrink-0">
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
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black animate-pulse" title="Live Frequency" />
                          ) : onlineUserIds.includes(c.partnerId) ? (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black animate-pulse" title="Online Now" />
                          ) : (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 ring-2 ring-white dark:ring-black" title="Offline" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className={cn('text-xs truncate font-bold', hasUnread ? 'text-black dark:text-white font-black' : 'text-slate-900 dark:text-slate-100')}>
                                {c.partnerName}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {c.isPinned && (
                                <span title="Pinned Chat">
                                  <Pin className="w-3.5 h-3.5 rotate-45 shrink-0 text-slate-400 dark:text-slate-500 fill-slate-400/20 dark:fill-slate-500/20" />
                                </span>
                              )}
                              <span className="text-[10px] shrink-0 font-medium text-slate-400 dark:text-slate-500">
                                {formatTime(c.lastMessage?.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
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
                                  <span className="italic text-slate-400 dark:text-slate-500 flex items-center gap-1 text-[11px]">
                                    <Ban className="w-3 h-3 inline opacity-60" />
                                    <span>This message was deleted</span>
                                  </span>
                                ) : (
                                  <>
                                    {c.lastMessage && c.lastMessage.senderId === currentUser?.id && (
                                      <span className="shrink-0">
                                        {c.lastMessage.isRead ? (
                                          <CheckCheck className="w-3.5 h-3.5 inline text-blue-600 dark:text-cyan-400" />
                                        ) : (
                                          <CheckCheck className="w-3.5 h-3.5 inline text-slate-400 dark:text-slate-500" />
                                        )}
                                      </span>
                                    )}
                                    <p className={cn('text-[11px] truncate', hasUnread ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400')}>
                                      {c.lastMessage && c.lastMessage.senderId !== currentUser?.id && c.lastMessage.senderName ? (
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                          {c.lastMessage.senderName.split(' ')[0]}:{' '}
                                        </span>
                                      ) : null}
                                      {c.lastMessage?.content || (c.lastMessage?.attachment ? `[Attachment: ${c.lastMessage.attachment.fileName}]` : 'Say hello...')}
                                    </p>
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
                                  <span className="italic text-slate-400 dark:text-slate-500 flex items-center gap-1 text-[11px]">
                                    <Ban className="w-3 h-3 inline opacity-60" />
                                    <span>This message was deleted</span>
                                  </span>
                                ) : (
                                  <>
                                    {c.lastMessage && c.lastMessage.senderId === currentUser?.id && (
                                      <span className="shrink-0">
                                        {c.lastMessage.isRead ? (
                                          <CheckCheck className="w-3.5 h-3.5 inline text-blue-600 dark:text-cyan-400" />
                                        ) : (
                                          <CheckCheck className="w-3.5 h-3.5 inline text-slate-400 dark:text-slate-500" />
                                        )}
                                      </span>
                                    )}
                                    <p className={cn('text-[11px] truncate', hasUnread ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400')}>
                                      {c.lastMessage?.content || (c.lastMessage?.attachment ? `[Attachment: ${c.lastMessage.attachment.fileName}]` : 'Say hello...')}
                                    </p>
                                  </>
                                )
                              )}
                            </div>
                            {hasUnread ? (
                              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500 text-white shrink-0 shadow-xs">
                                {c.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* ========================================================
             RIGHT PANEL: ACTIVE PRIVATE CONVERSATION STREAM & INPUT
             ======================================================== */}
        <ResizablePanel defaultSize={72} minSize={55}>
          {activePartner ? (
            <div className="flex flex-col h-full bg-white dark:bg-[#070b14]">
              {/* Header */}
              <div className="h-14 border-b border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between px-4 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {activePartner.isGroup ? (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white ring-2 ring-white dark:ring-slate-800 shadow-md">
                        <Users className="w-5 h-5" />
                      </div>
                    ) : (
                      <Avatar className="w-10 h-10 ring-2 ring-white dark:ring-slate-800 shadow-sm shrink-0">
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

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                        {activePartner.partnerName}
                      </p>
                      {activePartner.isGroup ? (
                        <Badge variant="outline" className="text-[9px] font-mono border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" />
                          GROUP
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-mono border-slate-300 dark:border-slate-700">
                          {activePartner.partnerRole}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {activePartner.isGroup ? (
                        typingUsers['group-long-room'] ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse">
                            <span className="flex gap-0.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" />
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce delay-100" />
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce delay-200" />
                            </span>
                            <span>{typingUsers['group-long-room'].name.split(' ')[0]} is typing...</span>
                          </span>
                        ) : (
                          <>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">All Officers ({activePartner.memberCount || 6})</span>
                            <span className="text-slate-400 dark:text-slate-600">•</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live Frequency
                            </span>
                          </>
                        )
                      ) : (
                        typingUsers[activePartner.partnerId] ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse">
                            <span className="flex gap-0.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" />
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce delay-100" />
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce delay-200" />
                            </span>
                            <span>typing...</span>
                          </span>
                        ) : (
                          <>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">@{activePartner.partnerUsername}</span>
                            <span className="text-slate-400 dark:text-slate-600">•</span>
                            {onlineUserIds.includes(activePartner.partnerId) ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Online
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                Offline
                              </span>
                            )}
                          </>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 dark:bg-black/30 select-text">
                {isMessagesLoading ? (
                  <div className="space-y-4 py-2">
                    <div className="flex items-end gap-2 max-w-[70%]">
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <Skeleton className="h-10 w-64 rounded-2xl" />
                    </div>
                    <div className="flex items-end gap-2 max-w-[70%] ml-auto justify-end">
                      <Skeleton className="h-10 w-48 rounded-2xl" />
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                    <Avatar className="w-16 h-16 ring-2 ring-slate-200 dark:ring-slate-800 shadow-xl shrink-0">
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
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Private Line with {activePartner.partnerName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                        Send documents, declaration inspections, voice notes, or text updates directly across the Long Room.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === currentUser?.id;
                    const hasAttachment = Boolean(m.attachment);
                    const isImg = m.type === 'image' || m.attachment?.fileType.startsWith('image/');
                    const isAudio = m.type === 'audio' || m.attachment?.fileType.startsWith('audio/');

                    return (
                      <ChatBubble
                        key={m.id}
                        variant={isMe ? 'sent' : 'received'}
                        className="group mb-3.5 items-end"
                      >
                        <ChatBubbleAvatar
                          src={
                            isMe
                              ? currentUser?.avatarUrl
                              : activePartner.isGroup
                                ? undefined
                                : activePartner.partnerAvatarUrl
                          }
                          className="w-7 h-7 shrink-0 ring-1.5 ring-white dark:ring-slate-800 shadow-xs mb-1"
                        />

                        {/* Message Content Layout */}
                        <div className={cn('flex flex-col gap-1 max-w-[85%] sm:max-w-[70%] relative', isMe ? 'items-end' : 'items-start')}>
                          {/* Group Chat: Sender Identification for other officers */}
                          {activePartner.isGroup && !isMe && (
                            <div className="flex items-center gap-1.5 px-1 mb-0.5">
                              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                                {m.senderName}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[8px] font-mono px-1 py-0 uppercase",
                                  ROLE_CONFIGS[m.senderRole]?.badgeClass || "border-slate-200 dark:border-slate-700"
                                )}
                              >
                                {m.senderRole}
                              </Badge>
                            </div>
                          )}

                          {/* Message Content vs Deleted Tombstone */}
                          {m.isDeleted ? (
                            <div
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs italic select-none border border-dashed border-slate-300 dark:border-white/10 bg-slate-100/70 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 backdrop-blur-xs',
                                isMe ? 'rounded-br-xs' : 'rounded-bl-xs'
                              )}
                            >
                              <Ban className="w-3.5 h-3.5 opacity-70 shrink-0" />
                              <span>{isMe ? 'You deleted this message' : 'This message was deleted'}</span>
                            </div>
                          ) : (
                            <>
                              {/* 1. Voice Note Audio (Clean, no bulky enclosing chat bubble) */}
                              {hasAttachment && isAudio && m.attachment && (
                                <div
                                  className={cn(
                                    'p-2 rounded-2xl shadow-sm border backdrop-blur-md transition-all select-none',
                                    isMe
                                      ? 'bg-blue-600 text-white rounded-br-xs border-blue-500 shadow-blue-500/20'
                                      : 'bg-white/90 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                                  )}
                                >
                                  <VoiceNoteBubble
                                    url={m.attachment.url}
                                    duration={m.attachment.duration}
                                    isMe={isMe}
                                  />
                                </div>
                              )}

                              {/* 2. Image Attachment (Clean standalone photo presentation, no chat bubble) */}
                              {hasAttachment && isImg && m.attachment && (
                                <div
                                  className={cn(
                                    'relative group overflow-hidden max-w-full rounded-2xl shadow-sm transition-all select-none border border-black/5 dark:border-white/10',
                                    isMe ? 'rounded-br-xs' : 'rounded-bl-xs'
                                  )}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={m.attachment.url}
                                    alt={m.attachment.fileName}
                                    className={cn(
                                      'max-h-72 w-auto max-w-full block object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]',
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
                                          : 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl rounded-bl-xs'
                                      )}
                                    >
                                      {renderFormattedMessage(m.content, currentUser?.username)}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 3. Document Attachment (Clean file card, no enclosing chat bubble) */}
                              {hasAttachment && !isImg && !isAudio && m.attachment && (
                                <div
                                  className={cn(
                                    'p-2.5 rounded-2xl shadow-sm border transition-all max-w-full',
                                    isMe
                                      ? 'bg-blue-600 text-white rounded-br-xs border-blue-500 shadow-blue-500/20'
                                      : 'bg-white/90 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                                      isMe ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-blue-500 dark:text-sky-400'
                                    )}>
                                      {getDocumentIcon(m.attachment.fileName, m.attachment.fileType)}
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0 pr-1">
                                      <span className={cn('font-semibold text-xs truncate', isMe ? 'text-white' : 'text-slate-900 dark:text-slate-100')} title={m.attachment.fileName}>
                                        {m.attachment.fileName}
                                      </span>
                                      <span className={cn('text-[10px] font-mono mt-0.5', isMe ? 'text-white/80' : 'text-slate-500 dark:text-slate-400')}>
                                        {formatFileSize(m.attachment.fileSize)}
                                      </span>
                                    </div>
                                    <a
                                      href={m.attachment.url}
                                      download={m.attachment.fileName}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={cn(
                                        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-xs cursor-pointer',
                                        isMe
                                          ? 'bg-white/20 hover:bg-white text-white hover:text-blue-600'
                                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-sky-500 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                      )}
                                      title="Download File"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                  {m.content && m.content !== `📄 ${m.attachment.fileName}` && (
                                    <div className={cn(
                                      'pt-2 px-1 text-xs break-words border-t mt-2',
                                      isMe ? 'border-white/20 text-white' : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                                    )}>
                                      {renderFormattedMessage(m.content, currentUser?.username)}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 4. Text Content (Standard text bubble) */}
                              {!hasAttachment && m.content && (
                                <ChatBubbleMessage
                                  variant={isMe ? 'sent' : 'received'}
                                  className={cn(
                                    'px-3.5 py-2.5 text-xs rounded-2xl shadow-xs leading-relaxed break-words',
                                    isMe
                                      ? 'bg-blue-600 text-white rounded-br-xs shadow-blue-500/20'
                                      : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                                  )}
                                >
                                  {renderFormattedMessage(m.content, currentUser?.username)}
                                </ChatBubbleMessage>
                              )}
                            </>
                          )}

                          {/* WhatsApp Floating Emoji Reaction Bar */}
                          {!m.isDeleted && activeReactionMsgId === m.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                'absolute -top-10 z-30 flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-xl border border-slate-200 dark:border-white/10 backdrop-blur-md animate-in zoom-in-75 fade-in duration-150 select-none',
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
                                  if (r.userId === currentUser?.id) ex.hasReacted = true;
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
                              'flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500 font-mono px-1 mt-0.5',
                              isMe ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <span>{formatTime(m.createdAt)}</span>
                            {isMe && (
                              <span title={m.isRead ? 'Read (Double Blue Tick)' : 'Delivered'}>
                                {m.isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400 inline" />
                                ) : (
                                  <CheckCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 inline" />
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
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ml-1 text-slate-400"
                              >
                                <Smile className="w-3 h-3" />
                              </button>
                            )}
                            {!m.isDeleted && (isMe || currentUser?.role === 'DEV') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(m.id)}
                                title="Delete message for everyone"
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ml-1"
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
                {/* Live typing indicator bubble in message thread */}
                {((activePartner.isGroup && typingUsers['group-long-room']) || (!activePartner.isGroup && typingUsers[activePartner.partnerId])) && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-white/10 w-fit backdrop-blur-md shadow-xs animate-in fade-in-50 slide-in-from-bottom-1">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
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

              {/* Upload Status Banner */}
              {isUploading && (
                <div className="px-4 py-2 bg-blue-500/10 border-t border-blue-500/20 text-xs text-blue-600 dark:text-sky-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadStatusText || 'Uploading...'}</span>
                </div>
              )}

              {/* Bottom Input Toolbar */}
              <div className="relative p-3 border-t border-slate-200/90 dark:border-slate-800/80 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md flex items-center gap-2 shrink-0">
                {/* Messenger-style @mention dropdown popup */}
                {showMentions && mentionCandidates.length > 0 && (
                  <div className="absolute bottom-full left-4 right-4 mb-2 max-h-52 overflow-y-auto rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in-50 slide-in-from-bottom-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800 mb-1">
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
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
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
                              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">@{cand.partnerUsername}</p>
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

                {isRecording ? (
                  <div className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span>Recording Voice Note: {formatSeconds(recordSeconds)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelRecording} className="text-slate-500 hover:text-slate-700 h-7 px-2">
                        Cancel
                      </Button>
                      <Button size="sm" onClick={stopRecording} className="bg-rose-600 hover:bg-rose-700 text-white h-7 px-3 rounded-xl font-bold">
                        Send Note
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl">
                          <Paperclip className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                          <ImageIcon className="mr-2 w-4 h-4 text-sky-500" /> Photos &amp; Videos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                          <FileIcon className="mr-2 w-4 h-4 text-amber-500" /> Document (PDF / CusDec)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={startRecording}>
                          <Mic className="mr-2 w-4 h-4 text-emerald-500" /> Record Voice Note
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <form onSubmit={handleSendText} className="flex-1 flex items-center gap-2">
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
                        placeholder="Type a message or @ to mention..."
                        className="h-10 rounded-xl bg-slate-100 dark:bg-slate-900/90 border-0 focus-visible:ring-1 focus-visible:ring-blue-500 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                      />
                      <Button
                        type="submit"
                        disabled={!inputText.trim() || isUploading}
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 shrink-0 cursor-pointer disabled:opacity-50"
                        title="Send Message (Enter)"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={startRecording}
                      className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl shrink-0"
                      title="Hold or Click to Record Voice Note"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-6 text-slate-400">
              Select an officer to begin messaging
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default FullScreenChatDeck;
