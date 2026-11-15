"use client";

import React, { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback, MessengerDefaultAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface OfficerAvatarItem {
  id: string;
  name: string;
  role?: string;
  image?: string | null;
  isOnline?: boolean;
}

export const DEFAULT_OFFICER_AVATARS: Record<string, string> = {};

export function getOfficerAvatar(userId?: string, role?: string, currentUrl?: string | null): string {
  if (currentUrl && currentUrl.trim() !== "" && !currentUrl.includes("images.unsplash.com")) {
    return currentUrl;
  }
  return "";
}

/**
 * Exact ReverseOrder demo as requested by user
 */
export function ReverseOrder() {
  return (
    <div className="flex flex-row-reverse justify-end -space-x-3 space-x-reverse *:ring-2 *:ring-background">
      <Avatar>
        <AvatarImage src="https://cdn.21st.dev/assets/localized/d1ed44cae2562d30f25fc797e01dc5b639ec45375dc4079fca370e2bf417d2ee.webp" />
      </Avatar>
      <Avatar>
        <AvatarImage src="https://cdn.21st.dev/assets/localized/55af7e180cc86b6c1cfc029601e5a89c3e3530fef7ef25d4818baa4341557a8d.webp" />
      </Avatar>
      <Avatar>
        <AvatarImage src="https://cdn.21st.dev/assets/localized/3e14564fe91df8e31fae8034557a1bc79cb8370a2f5a1fd87a06b0d226a46eaa.webp" />
      </Avatar>
    </div>
  );
}

/**
 * AvatarStack / AvatarGroup matching Image 1
 * Displays overlapping avatars (-space-x-3) with rings, realistic portraits,
 * hover-lift effects, officer details on hover, and an overflow counter badge (+99).
 */
export function AvatarStack({
  items,
  max = 4,
  activeId,
  onSelect,
  className,
  size = "md",
  showCounter = true,
  counterValue,
}: {
  items: OfficerAvatarItem[];
  max?: number;
  activeId?: string;
  onSelect?: (item: OfficerAvatarItem) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  showCounter?: boolean;
  counterValue?: string | number;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sizeClasses = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-10 h-10 text-xs",
    lg: "w-11 h-11 text-xs",
  }[size];

  // Prioritize active/online officers first so active ones are visible at the front of the stack
  const sortedItems = [...items].sort((a, b) => {
    if (!!a.isOnline === !!b.isOnline) return 0;
    return a.isOnline ? -1 : 1;
  });

  const visibleItems = sortedItems.slice(0, max);
  const overflowItems = sortedItems.slice(max);
  const remainingCount = overflowItems.length;
  const displayCount = counterValue !== undefined
    ? counterValue
    : remainingCount > 0
      ? `+${remainingCount}`
      : null;

  return (
    <div className={cn("relative flex items-center", className)}>
      <div className="flex flex-row items-center -space-x-3 hover:-space-x-1 transition-all duration-300 py-1">
        {visibleItems.map((item, idx) => {
          const isSelected = activeId === item.id;
          const isHovered = hoveredId === item.id;
          const initials = item.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "OF";

          return (
            <div
              key={item.id || idx}
              className="relative"
              style={{ zIndex: isHovered ? 40 : isSelected ? 35 : visibleItems.length - idx }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                type="button"
                onClick={() => onSelect?.(item)}
                className={cn(
                  "relative block rounded-full focus:outline-none transition-all duration-200 cursor-pointer",
                  "hover:-translate-y-1.5 hover:scale-110",
                  isSelected && "ring-2 ring-blue-500 scale-105"
                )}
                title={`${item.name} (${item.role || "Customs Officer"})`}
              >
                <Avatar
                  className={cn(
                    sizeClasses,
                    "ring-2 ring-white dark:ring-zinc-950 shadow-md transition-shadow",
                    isHovered && "shadow-xl ring-blue-500"
                  )}
                >
                  {item.image && !item.image.includes('images.unsplash.com') ? (
                    <AvatarImage
                      src={item.image}
                      alt={item.name}
                      className="object-cover w-full h-full"
                    />
                  ) : null}
                  <AvatarFallback className="p-0 border-0 bg-transparent">
                    <MessengerDefaultAvatar className="w-full h-full" />
                  </AvatarFallback>
                </Avatar>

                {/* Online indicator dot */}
                {item.isOnline !== false && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950" />
                )}
              </button>

              {/* Floating Tooltip Pill */}
              {isHovered && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                  <div className="bg-zinc-900/95 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-xl border border-white/10 dark:border-zinc-300/40 flex items-center gap-1.5 backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{item.name}</span>
                    {item.role && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/10 text-blue-200 dark:text-blue-800 uppercase font-mono">
                        {item.role}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Counter Badge (+N) displaying actual overflow count */}
        {showCounter && displayCount !== null && (
          <div
            className="relative"
            style={{ zIndex: 1 }}
          >
            <div
              className={cn(
                sizeClasses,
                "flex shrink-0 items-center justify-center rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 font-bold text-zinc-900 dark:text-zinc-100 ring-2 ring-white dark:ring-zinc-950 shadow-md select-none transition-transform duration-200 hover:scale-105 cursor-pointer"
              )}
              title={`${remainingCount} more officer${remainingCount === 1 ? '' : 's'} in Customs network${overflowItems.length > 0 ? ': ' + overflowItems.map(o => o.name).join(', ') : ''}`}
              onClick={() => {
                if (overflowItems.length > 0 && onSelect) {
                  onSelect(overflowItems[0]);
                }
              }}
            >
              {displayCount}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AvatarStack;
