"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-background",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, children, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-[#E4E6EB] dark:bg-[#3A3B3C] text-muted-foreground font-semibold text-xs overflow-hidden",
      className,
    )}
    {...props}
  >
    {children ?? (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <circle cx="18" cy="18" r="18" className="fill-[#E4E6EB] dark:fill-[#3A3B3C]" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M18 19c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6zm-8.835 8.167C10.74 24.382 14.154 22.5 18 22.5s7.26 1.882 8.835 4.667A17.933 17.933 0 0118 36c-3.21 0-6.223-.842-8.835-2.333z"
          className="fill-[#65676B] dark:fill-[#B0B3B8]"
        />
      </svg>
    )}
  </AvatarPrimitive.Fallback>
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export function MessengerDefaultAvatar({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-full aspect-square bg-[#E4E6EB] dark:bg-[#3A3B3C] flex items-center justify-center overflow-hidden shrink-0 select-none",
        className
      )}
      title="Officer"
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("w-full h-full", iconClassName)}
      >
        <circle cx="18" cy="18" r="18" className="fill-[#E4E6EB] dark:fill-[#3A3B3C]" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M18 19c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6zm-8.835 8.167C10.74 24.382 14.154 22.5 18 22.5s7.26 1.882 8.835 4.667A17.933 17.933 0 0118 36c-3.21 0-6.223-.842-8.835-2.333z"
          className="fill-[#65676B] dark:fill-[#B0B3B8]"
        />
      </svg>
    </div>
  );
}

export const DefaultUserAvatar = MessengerDefaultAvatar;

export { Avatar, AvatarImage, AvatarFallback };

export default Avatar;
