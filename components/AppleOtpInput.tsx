'use client';

import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AppleOtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  onComplete?: (otp: string) => void;
  className?: string;
}

export function AppleOtpInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
  disabled = false,
  onComplete,
  className
}: AppleOtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Auto focus input on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const digits = value.split('').slice(0, length);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '').slice(0, length);
    onChange(rawVal);
    if (rawVal.length === length && onComplete) {
      onComplete(rawVal);
    }
  };

  const handleBoxClick = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={cn("relative inline-block select-none", className)}>
      {/* Hidden real input capturing keyboard, paste, and one-time-code autofill */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text tracking-[1em]"
        aria-label="One-Time Security Passcode"
      />

      {/* Visual Shadcn Segmented Slots */}
      <div
        onClick={handleBoxClick}
        className="flex items-center justify-center gap-2 py-1 cursor-text"
      >
        {Array.from({ length }).map((_, idx) => {
          const char = digits[idx] || '';
          const isCurrentActive = isFocused && (digits.length === idx || (idx === length - 1 && digits.length === length));
          const isFilled = char !== '';
          const isMiddleDivider = idx === Math.floor(length / 2);

          return (
            <React.Fragment key={idx}>
              {isMiddleDivider && (
                <div className="w-2 h-0.5 bg-border rounded-full mx-0.5 shrink-0" />
              )}

              <div
                className={cn(
                  "relative w-10 h-12 sm:w-11 sm:h-14 rounded-md border text-center flex items-center justify-center font-mono font-bold text-lg transition-all shadow-xs",
                  isCurrentActive
                    ? "border-ring ring-1 ring-ring bg-background text-foreground"
                    : isFilled
                    ? "border-input bg-card text-foreground"
                    : "border-input bg-background/50 text-muted-foreground/30",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {isFilled ? (
                  <span className="text-foreground animate-in zoom-in-75 duration-100">
                    {char}
                  </span>
                ) : isCurrentActive ? (
                  <div className="w-0.5 h-5 bg-foreground animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/25" />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
