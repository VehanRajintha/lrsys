'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DonutRingGaugeProps {
  value: string | number;
  label?: string;
  percent?: number;
  color?: 'emerald' | 'cyan' | 'blue' | 'purple' | 'amber' | 'rose';
  size?: number;
  strokeWidth?: number;
  valueClassName?: string;
  labelClassName?: string;
  className?: string;
  animateOnMount?: boolean;
}

export function DonutRingGauge({
  value,
  label,
  percent = 75,
  color = 'cyan',
  size = 64,
  strokeWidth = 5.5,
  valueClassName,
  labelClassName,
  className,
  animateOnMount = true,
}: DonutRingGaugeProps) {
  const [animatedPercent, setAnimatedPercent] = useState<number>(animateOnMount ? 0 : percent);
  const [displayValue, setDisplayValue] = useState<string | number>(() => {
    if (!animateOnMount) return value;
    if (typeof value === 'number') return 0;
    if (typeof value === 'string' && value.endsWith('%')) return '0%';
    return value;
  });

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, percent));

  useEffect(() => {
    if (!animateOnMount) {
      setAnimatedPercent(clampedPercent);
      setDisplayValue(value);
      return;
    }

    // Trigger ring stroke progress animation on mount / percent change
    const startTimer = setTimeout(() => {
      setAnimatedPercent(clampedPercent);
    }, 60);

    // Number count-up animation if value is numeric or formatted percentage
    const isPct = typeof value === 'string' && value.endsWith('%');
    const numericTarget = typeof value === 'number' ? value : (isPct ? parseFloat(value) : NaN);

    if (!isNaN(numericTarget)) {
      const duration = 1100; // ms
      const startTime = performance.now();

      const animateNumber = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Ease-out cubic: 1 - (1 - t)^3
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.round(numericTarget * ease);

        setDisplayValue(isPct ? `${currentVal}%` : currentVal);

        if (progress < 1) {
          requestAnimationFrame(animateNumber);
        } else {
          setDisplayValue(value);
        }
      };

      const animId = requestAnimationFrame(animateNumber);
      return () => {
        clearTimeout(startTimer);
        cancelAnimationFrame(animId);
      };
    } else {
      setDisplayValue(value);
    }

    return () => clearTimeout(startTimer);
  }, [clampedPercent, value, animateOnMount]);

  const strokeDashoffset = circumference - (circumference * animatedPercent) / 100;

  const colorStyles = {
    emerald: {
      stroke: 'stroke-emerald-500',
      track: 'stroke-emerald-500/15',
      text: 'text-emerald-700 dark:text-emerald-400',
      glow: 'rgba(16,185,129,0.3)',
    },
    cyan: {
      stroke: 'stroke-cyan-500',
      track: 'stroke-cyan-500/15',
      text: 'text-cyan-700 dark:text-cyan-400',
      glow: 'rgba(6,182,212,0.35)',
    },
    blue: {
      stroke: 'stroke-sky-500',
      track: 'stroke-sky-500/15',
      text: 'text-sky-700 dark:text-sky-400',
      glow: 'rgba(14,165,233,0.35)',
    },
    purple: {
      stroke: 'stroke-purple-500',
      track: 'stroke-purple-500/15',
      text: 'text-purple-700 dark:text-purple-400',
      glow: 'rgba(168,85,247,0.35)',
    },
    amber: {
      stroke: 'stroke-amber-500',
      track: 'stroke-amber-500/15',
      text: 'text-amber-700 dark:text-amber-400',
      glow: 'rgba(245,158,11,0.35)',
    },
    rose: {
      stroke: 'stroke-rose-500',
      track: 'stroke-rose-500/15',
      text: 'text-rose-700 dark:text-rose-400',
      glow: 'rgba(244,63,94,0.35)',
    },
  };

  const scheme = colorStyles[color] || colorStyles.cyan;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0 select-none', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        aria-hidden="true"
        style={{
          filter: `drop-shadow(0 0 6px ${scheme.glow})`,
        }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className={scheme.track}
        />
        {/* Animated Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className={cn('transition-all duration-1000 ease-out', scheme.stroke)}
        />
      </svg>

      {/* Center Value and Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1 leading-none">
        <span className={cn('font-extrabold text-xs tracking-tight text-foreground transition-all', valueClassName)}>
          {displayValue}
        </span>
        {label && (
          <span
            className={cn(
              'text-[8px] font-bold tracking-wider uppercase mt-0.5',
              scheme.text,
              labelClassName
            )}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

