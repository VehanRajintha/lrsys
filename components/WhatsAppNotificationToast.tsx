"use client";

import React, { useEffect, useState, useRef } from "react";
import { ChatMessage } from "@/lib/chatTypes";
import { UserRole } from "@/lib/authTypes";
import { DefaultUserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  X,
  ArrowRight,
  Camera,
  Mic,
  FileText,
  Users,
  CornerDownLeft,
} from "lucide-react";

export interface WhatsAppNotificationPayload {
  id: string;
  message: ChatMessage;
  partnerId: string;
  partnerName: string;
  partnerRole?: UserRole | "GROUP";
  partnerUsername?: string;
  isGroup: boolean;
  receivedAt: number;
}

interface WhatsAppNotificationToastProps {
  notification: WhatsAppNotificationPayload | null;
  onDismiss: () => void;
  onOpenChat: (payload: WhatsAppNotificationPayload) => void;
  isChatOpen?: boolean;
}

export function WhatsAppNotificationToast({
  notification,
  onDismiss,
  onOpenChat,
  isChatOpen = false,
}: WhatsAppNotificationToastProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const DURATION_MS = 7000;

  useEffect(() => {
    if (!notification) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const startTime = Date.now();

    progressIntervalRef.current = setInterval(() => {
      if (isPaused) return;
      const elapsed = Date.now() - startTime;
      const pct = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      if (pct <= 0) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        onDismiss();
      }
    }, 40);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [notification?.id, isPaused, onDismiss]);

  if (!notification) return null;

  const { message, partnerName, isGroup } = notification;

  // Determine message preview display
  const getMessagePreview = () => {
    if (message.type === "image" || message.attachment?.fileType.startsWith("image/")) {
      return (
        <span className="inline-flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-medium">
          <Camera className="w-3.5 h-3.5" />
          <span>Photo {message.content ? `• ${message.content}` : ""}</span>
        </span>
      );
    }
    if (message.type === "audio" || message.attachment?.fileType.startsWith("audio/")) {
      return (
        <span className="inline-flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-medium">
          <Mic className="w-3.5 h-3.5" />
          <span>Voice note {message.attachment?.duration ? `(${message.attachment.duration}s)` : ""}</span>
        </span>
      );
    }
    if (message.type === "document" || message.attachment) {
      return (
        <span className="inline-flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-medium">
          <FileText className="w-3.5 h-3.5" />
          <span className="truncate max-w-[220px]">{message.attachment?.fileName || "Document"}</span>
        </span>
      );
    }
    return (
      <span className="line-clamp-2 text-slate-700 dark:text-slate-300 font-normal leading-relaxed break-words">
        {message.content}
      </span>
    );
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={cn(
        "fixed z-[140] transition-all duration-300 ease-out select-none",
        "bottom-24 right-4 sm:right-6",
        "w-[calc(100vw-32px)] sm:w-[410px] max-w-[430px]"
      )}
      style={{ willChange: "transform, opacity" }}
    >
      <div
        onClick={() => onOpenChat(notification)}
        className={cn(
          "relative overflow-hidden cursor-pointer group",
          // LRSYS Signature Left Accent: Cyan / Blue
          "rounded-2xl border-l-4 border-l-cyan-500 dark:border-l-cyan-400",
          // Modern Frosted Glass Transparency Effect
          "backdrop-blur-xl backdrop-saturate-150",
          // Light Mode: Frosted Blue & White glass aesthetic
          "bg-white/85 border-y border-r border-slate-200/80 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.12),0_0_25px_-5px_rgba(6,182,212,0.25)]",
          // Dark Mode: Frosted Blue & Black cyber-glass aesthetic
          "dark:bg-[#070b14]/85 dark:bg-gradient-to-b dark:from-[#0d1629]/90 dark:to-[#050811]/90",
          "dark:border-y dark:border-r dark:border-slate-800/80",
          "dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_35px_-5px_rgba(6,182,212,0.35)]",
          "p-4 transition-all hover:scale-[1.01] hover:border-slate-300 dark:hover:border-slate-700/80",
          "animate-in slide-in-from-bottom-5 fade-in duration-300"
        )}
      >
        {/* Subtle Frosted Glass Prismatic Highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 dark:via-cyan-400/30 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none" />

        {/* Cyber Cyan Ambient Glow */}
        <div className="absolute -top-14 -right-14 w-36 h-36 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Row (Sri Lanka Customs • Live Dispatch) */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800/90">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <MessageCircle className="w-3 h-3 fill-white" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-white whitespace-nowrap truncate">
              Sri Lanka Customs
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
            <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 hidden sm:inline whitespace-nowrap">
              Live Dispatch
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded-full whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Just now
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notification Main Body */}
        <div className="flex items-start gap-3">
          {/* Avatar with status indicator */}
          <div className="relative shrink-0 mt-0.5">
            {isGroup ? (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm ring-2 ring-cyan-500/50">
                <Users className="w-5 h-5" />
              </div>
            ) : (
              <div className="relative">
                <DefaultUserAvatar
                  className="w-11 h-11 ring-2 ring-cyan-500/60 shadow-sm"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-cyan-500 ring-2 ring-white dark:ring-[#070b14]" />
              </div>
            )}
          </div>

          {/* Text & Message Snippet */}
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {isGroup ? "Long Room Operations" : message.senderName || partnerName}
              </h4>
              {message.senderRole && !isGroup && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 shrink-0"
                >
                  {message.senderRole}
                </Badge>
              )}
              {isGroup && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 font-semibold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 shrink-0"
                >
                  GROUP
                </Badge>
              )}
            </div>

            {isGroup && (
              <p className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 truncate">
                {message.senderName} ({message.senderRole || "Officer"}):
              </p>
            )}

            <div className="text-xs leading-snug pt-0.5">
              {getMessagePreview()}
            </div>
          </div>
        </div>

        {/* Bottom Actions Row */}
        <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/90 text-[11px]">
          <span className="text-slate-400 dark:text-slate-500 text-[11px] flex items-center gap-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            <span>Tap anywhere to open</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChat(notification);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 active:scale-95 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
        </div>

        {/* Auto-Dismiss Cyan / Blue Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
