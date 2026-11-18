'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  CalendarDays,
  FileText,
  Activity,
  FileSpreadsheet,
  ArrowRight,
  Download,
  RefreshCw,
  X,
  LayoutGrid,
  Zap,
  LineChart as LineChartIcon,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  PieChart as PieChartIcon,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CusDecRecord, Stats } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CalendarPicker } from '@/components/ui/calendar-picker';
import { DonutRingGauge } from '@/components/DonutRingGauge';

interface StatisticsAnalyticsDeckProps {
  records: CusDecRecord[];
  stats?: Stats;
  onNavigateToDeclarations?: () => void;
}

type DatePreset = 'today' | '7d' | '14d' | '30d' | 'month' | 'all';
type DateBasis = 'created' | 'customs';
type TrajectoryViewMode = 'cumulative' | 'velocity';

/**
 * Standardizes dates from ISO timestamps or DD/MM/YYYY into YYYY-MM-DD
 */
function parseRecordDate(record: CusDecRecord, basis: DateBasis): string | null {
  if (basis === 'created') {
    if (record.createdAt) {
      try {
        const d = new Date(record.createdAt);
        if (!isNaN(d.getTime())) {
          return d.toISOString().slice(0, 10);
        }
      } catch {}
    }
    return null;
  }

  const raw = record.customsDate;
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parts = raw.split(/[\/\-\.]/);
  if (parts.length === 3 && parts[2].length === 4) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {}

  return null;
}

function formatDateDisplay(isoDateStr: string): string {
  try {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoDateStr;
  }
}

function formatDayLabel(isoDateStr: string): string {
  if (!isoDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoDateStr)) {
    return isoDateStr || '—';
  }
  try {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return isoDateStr;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDateStr.slice(5);
  }
}

/**
 * Smart axis date formatter:
 * Displays 'MMM D' on month transitions or the initial point (e.g. 'Nov 4'),
 * and a clean compact day number 'D' (e.g. '12') within the same month to prevent horizontal text collision.
 */
function formatSmartAxisDate(
  isoDateStr: string,
  index: number,
  allDates: string[]
): { monthPart?: string; dayPart: string } {
  if (!isoDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoDateStr)) {
    return { dayPart: isoDateStr || '—' };
  }
  try {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return { dayPart: isoDateStr };

    const dayNum = String(d);
    const monthShort = date.toLocaleDateString('en-US', { month: 'short' });

    let isMonthChange = index === 0;
    if (index > 0 && allDates[index - 1] && /^\d{4}-\d{2}-\d{2}$/.test(allDates[index - 1])) {
      const prevM = Number(allDates[index - 1].split('-')[1]);
      if (prevM !== m) {
        isMonthChange = true;
      }
    }

    if (isMonthChange) {
      return { monthPart: monthShort, dayPart: dayNum };
    }
    return { dayPart: dayNum };
  } catch {
    return { dayPart: isoDateStr.slice(8) || isoDateStr };
  }
}

function formatMonthLabel(yearMonthStr: string): string {
  try {
    const [y, m] = yearMonthStr.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return yearMonthStr;
  }
}

function getCommodityCategory(desc?: string): string {
  if (!desc) return 'General Cargo';
  const u = desc.toUpperCase();
  if (u.includes('TYRE') || u.includes('VEHICLE') || u.includes('AUTOMOTIVE')) return 'Automotive & Tyres';
  if (u.includes('MACHINERY') || u.includes('SOLAR') || u.includes('CIRCUIT') || u.includes('PCBA')) return 'Machinery & Tech';
  if (u.includes('PHARMACEUTICAL') || u.includes('RESIN') || u.includes('CITRIC') || u.includes('CHEMICAL')) return 'Chemicals & Pharma';
  if (u.includes('COTTON') || u.includes('FABRIC') || u.includes('TEXTILE')) return 'Textiles & Apparel';
  if (u.includes('TILE') || u.includes('CERAMIC') || u.includes('FASTENER') || u.includes('STEEL')) return 'Construction Materials';
  return 'General Cargo';
}

function StatisticsAnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Hero Banner Skeleton */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] border border-slate-200/90 dark:border-cyan-500/20 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-xl" />
              <Skeleton className="h-8 w-72 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-96 rounded" />
            <Skeleton className="h-3.5 w-80 rounded" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* 2. Timeframe Filter Bar Skeleton */}
      <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-4 w-20 rounded" />
            <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-8 w-44 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
        </div>
      </Card>

      {/* 3. Top 5 Metric Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-3 w-36 rounded" />
            </div>
          </Card>
        ))}
        {/* Card 5 Skeleton: Circular Progress Ring Skeleton */}
        <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3.5 w-28 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
            <div className="w-[86px] h-[86px] rounded-full border-[7px] border-cyan-500/25 dark:border-cyan-500/30 flex items-center justify-center animate-pulse shrink-0">
              <Skeleton className="w-10 h-6 rounded" />
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Chart 1 Skeleton */}
      <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-80 rounded-lg" />
            <Skeleton className="h-3.5 w-96 rounded" />
          </div>
          <Skeleton className="h-8 w-48 rounded-xl" />
        </div>
        <div className="h-72 w-full flex items-end gap-3 pt-6 px-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton
                className="w-full rounded-t-md"
                style={{ height: `${20 + Math.sin(i * 0.5) * 40 + (i % 5) * 10}%` }}
              />
              <Skeleton className="h-2 w-6 rounded" />
            </div>
          ))}
        </div>
      </Card>

      {/* 5. Two-column Analytics Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <Skeleton className="h-5 w-52 rounded" />
            <Skeleton className="h-6 w-32 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="flex items-center justify-center py-6">
              <div className="w-44 h-44 rounded-full border-[18px] border-slate-200/80 dark:border-slate-800/80 animate-pulse flex items-center justify-center">
                <Skeleton className="w-16 h-8 rounded" />
              </div>
            </div>
            <div className="space-y-3.5 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-28 rounded" />
                    <Skeleton className="h-3.5 w-16 rounded" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Velocity Telemetry Skeleton */}
        <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 space-y-2">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-7 w-20 rounded" />
                <Skeleton className="h-2.5 w-48 rounded" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function StatisticsAnalyticsDeck({
  records,
  stats,
  onNavigateToDeclarations,
}: StatisticsAnalyticsDeckProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, []);
  // Date Basis & Preset State (Default: Ingestion / System Upload Date)
  const [dateBasis, setDateBasis] = useState<DateBasis>('created');
  const [activePreset, setActivePreset] = useState<DatePreset>('all');
  const [trajectoryMode, setTrajectoryMode] = useState<TrajectoryViewMode>('velocity');
  const [pieMode, setPieMode] = useState<'commodity' | 'fidelity'>('commodity');
  const [hoveredPieLabel, setHoveredPieLabel] = useState<string | null>(null);

  // Dynamic Cursor-Following Tooltip Tracking
  const lineChartContainerRef = useRef<HTMLDivElement>(null);
  const barChartContainerRef = useRef<HTMLDivElement>(null);
  const [lineTooltipPos, setLineTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [barTooltipPos, setBarTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Compute cursor-following floating coordinates inside chart containers
  const getDynamicTooltipStyle = (
    pos: { x: number; y: number } | null,
    containerRef: React.RefObject<HTMLDivElement | null>
  ): React.CSSProperties => {
    if (!pos) return { display: 'none' };

    const containerWidth = containerRef.current?.clientWidth || 700;
    const containerHeight = containerRef.current?.clientHeight || 270;
    const tooltipWidth = 250;
    const tooltipHeight = 115;

    // Horizontal placement:
    // Place to the right of cursor by default (+18px offset so point is visible)
    let left = pos.x + 18;
    // If it would overflow right boundary, flip to the left of the cursor (-18px)
    if (left + tooltipWidth > containerWidth - 12) {
      left = pos.x - tooltipWidth - 18;
    }
    // Prevent clipping off left edge
    left = Math.max(10, Math.min(left, containerWidth - tooltipWidth - 10));

    // Vertical placement:
    // Place above cursor by default (-18px offset so point is visible)
    let top = pos.y - tooltipHeight - 18;
    // If too close to the top, flip below cursor (+20px)
    if (top < 10) {
      top = pos.y + 20;
    }
    // Prevent clipping off bottom edge
    top = Math.max(8, Math.min(top, containerHeight - tooltipHeight - 8));

    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      pointerEvents: 'none',
      zIndex: 50,
      transition: 'left 60ms cubic-bezier(0,0,0.2,1), top 60ms cubic-bezier(0,0,0.2,1)',
    };
  };

  // Hover states for interactive tooltips
  const [hoveredBarData, setHoveredBarData] = useState<{
    date: string;
    total: number;
    cumulative: number;
    dayDelta: number;
    avgConfidence: number;
  } | null>(null);

  const [hoveredLinePoint, setHoveredLinePoint] = useState<{
    date: string;
    total: number;
    cumulative: number;
    rate: number;
  } | null>(null);

  // Compute absolute min & max dates across all records to seed controls
  const recordDates = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const d = parseRecordDate(r, dateBasis);
      if (d) set.add(d);
    });
    const arr = Array.from(set).sort();
    return arr;
  }, [records, dateBasis]);

  const minRecordDate = recordDates[0] || '2026-09-01';
  const maxRecordDate = recordDates[recordDates.length - 1] || '2026-11-30';

  // Custom start and end dates
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Smooth sliding pill indicator for Timeframe presets
  const [timeframePillStyle, setTimeframePillStyle] = useState<{ left: number; width: number } | null>(null);
  const presetRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const el = presetRefs.current[activePreset];
    if (el) {
      setTimeframePillStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [activePreset]);

  useEffect(() => {
    const handleResize = () => {
      const el = presetRefs.current[activePreset];
      if (el) {
        setTimeframePillStyle({
          left: el.offsetLeft,
          width: el.offsetWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activePreset]);

  // Effective Date Range based on presets or custom input
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (activePreset === 'all') {
      return {
        startDate: customStartDate || minRecordDate,
        endDate: customEndDate || maxRecordDate,
      };
    }

    if (activePreset === 'today') {
      return { startDate: todayStr, endDate: todayStr };
    }

    const calcPastDays = (days: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      return d.toISOString().slice(0, 10);
    };

    if (activePreset === '7d') {
      return { startDate: calcPastDays(7), endDate: todayStr };
    }
    if (activePreset === '14d') {
      return { startDate: calcPastDays(14), endDate: todayStr };
    }
    if (activePreset === '30d') {
      return { startDate: calcPastDays(30), endDate: todayStr };
    }
    if (activePreset === 'month') {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      return { startDate: firstOfMonth, endDate: todayStr };
    }

    return {
      startDate: customStartDate || minRecordDate,
      endDate: customEndDate || maxRecordDate,
    };
  }, [activePreset, customStartDate, customEndDate, minRecordDate, maxRecordDate]);

  // Handle Preset Clicks
  const handleSelectPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Filter records by selected date range
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const d = parseRecordDate(r, dateBasis);
      if (!d) return true;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [records, dateBasis, startDate, endDate]);

  // Compute Comparison Window (Previous Period of equal duration) for Delta Analytics
  const previousPeriodRecords = useMemo(() => {
    if (!startDate || !endDate) return [];
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - diffDays);

      const prevStartStr = prevStart.toISOString().slice(0, 10);
      const prevEndStr = prevEnd.toISOString().slice(0, 10);

      return records.filter((r) => {
        const d = parseRecordDate(r, dateBasis);
        if (!d) return false;
        return d >= prevStartStr && d <= prevEndStr;
      });
    } catch {
      return [];
    }
  }, [records, dateBasis, startDate, endDate]);

  // Daily Breakdown with Running Cumulative Count and Day-over-Day Deltas
  const dailyData = useMemo(() => {
    const dayMap = new Map<
      string,
      {
        date: string;
        total: number;
        confidenceSum: number;
      }
    >();

    filteredRecords.forEach((r) => {
      const d = parseRecordDate(r, dateBasis);
      if (!d || d === 'Unassigned' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      if (!dayMap.has(d)) {
        dayMap.set(d, {
          date: d,
          total: 0,
          confidenceSum: 0,
        });
      }

      const item = dayMap.get(d)!;
      item.total++;
      item.confidenceSum += Number(r.confidence || 0);
    });

    const list = Array.from(dayMap.values()).map((item) => ({
      ...item,
      avgConfidence: item.total > 0 ? Math.round(item.confidenceSum / item.total) : 0,
    }));

    // Sort chronologically
    list.sort((a, b) => a.date.localeCompare(b.date));

    // Compute cumulative run-up & day-over-day deltas
    let runningTotal = 0;
    return list.map((item, idx) => {
      runningTotal += item.total;
      const prevDayTotal = idx > 0 ? list[idx - 1].total : item.total;
      const dayDelta = item.total - prevDayTotal;
      const dayDeltaPct = prevDayTotal > 0 ? Math.round((dayDelta / prevDayTotal) * 100) : 0;
      return {
        ...item,
        cumulative: runningTotal,
        dayDelta,
        dayDeltaPct,
      };
    });
  }, [filteredRecords, dateBasis]);

  // Monthly Telemetry & Month-over-Month Increase / Decrease Analysis
  const monthlyTelemetry = useMemo(() => {
    const monthMap = new Map<string, { monthKey: string; count: number; confidenceSum: number }>();

    // Scan across all records to build monthly trajectory
    records.forEach((r) => {
      const d = parseRecordDate(r, dateBasis);
      if (!d) return;
      const monthKey = d.slice(0, 7); // YYYY-MM
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { monthKey, count: 0, confidenceSum: 0 });
      }
      const mItem = monthMap.get(monthKey)!;
      mItem.count++;
      mItem.confidenceSum += Number(r.confidence || 0);
    });

    const months = Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    // Calculate month-over-month increment / decrement
    return months.map((m, idx) => {
      const prevCount = idx > 0 ? months[idx - 1].count : m.count;
      const deltaDocs = m.count - prevCount;
      const deltaPct =
        prevCount > 0 ? Math.round(((m.count - prevCount) / prevCount) * 1000) / 10 : 0;
      const avgConfidence = m.count > 0 ? Math.round(m.confidenceSum / m.count) : 0;

      return {
        monthKey: m.monthKey,
        label: formatMonthLabel(m.monthKey),
        count: m.count,
        deltaDocs,
        deltaPct,
        isPositive: deltaDocs >= 0,
        avgConfidence,
      };
    });
  }, [records, dateBasis]);

  // Aggregate Metrics for Current vs Previous Period
  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    let totalConfidence = 0;

    filteredRecords.forEach((r) => {
      totalConfidence += Number(r.confidence || 0);
    });

    const avgConfidence = total > 0 ? Math.round(totalConfidence / total) : 0;
    const prevTotal = previousPeriodRecords.length;

    // Period over period deltas
    const totalDelta =
      prevTotal === 0
        ? total > 0
          ? 100
          : 0
        : ((total - prevTotal) / prevTotal) * 100;

    const activeDaysCount = dailyData.length || 1;
    const avgDailyVolume = (total / activeDaysCount).toFixed(1);

    // Peak volume day
    let peakDay = { date: '', total: 0 };
    dailyData.forEach((d) => {
      if (d.total > peakDay.total) {
        peakDay = { date: d.date, total: d.total };
      }
    });

    // Net month-over-month delta from latest monthly telemetry
    const latestMonth = monthlyTelemetry[monthlyTelemetry.length - 1];
    const prevMonth = monthlyTelemetry.length > 1 ? monthlyTelemetry[monthlyTelemetry.length - 2] : null;

    return {
      total,
      avgConfidence,
      prevTotal,
      totalDelta: Math.round(totalDelta * 10) / 10,
      avgDailyVolume,
      activeDaysCount,
      peakDay,
      latestMonth,
      prevMonth,
    };
  }, [filteredRecords, previousPeriodRecords, dailyData, monthlyTelemetry]);

  // Scaling helpers
  const maxDayTotal = useMemo(() => {
    const max = Math.max(...dailyData.map((d) => d.total), 1);
    return Math.ceil(max * 1.25);
  }, [dailyData]);

  const maxCumulativeTotal = useMemo(() => {
    const max = Math.max(...dailyData.map((d) => d.cumulative), 1);
    return Math.ceil(max * 1.15);
  }, [dailyData]);

  const maxMonthCount = useMemo(() => {
    const max = Math.max(...monthlyTelemetry.map((m) => m.count), 1);
    return Math.ceil(max * 1.2);
  }, [monthlyTelemetry]);

  // Top Consignees & Declarants leaderboards
  const topEntities = useMemo(() => {
    const consigneeMap = new Map<string, number>();
    const declarantMap = new Map<string, number>();

    filteredRecords.forEach((r) => {
      const c = (r.consigneeName || 'Unknown Consignee').trim();
      const d = (r.declarantName || 'Unknown Declarant').trim();
      if (c && c !== 'Unknown Consignee') consigneeMap.set(c, (consigneeMap.get(c) || 0) + 1);
      if (d && d !== 'Unknown Declarant') declarantMap.set(d, (declarantMap.get(d) || 0) + 1);
    });

    const topConsignees = Array.from(consigneeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        percent: metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0,
      }));

    const topDeclarants = Array.from(declarantMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        percent: metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0,
      }));

    return { topConsignees, topDeclarants };
  }, [filteredRecords, metrics.total]);

  // Cargo Category Distribution / Fidelity Tiers Donut Pie Segments
  const pieSegments = useMemo(() => {
    const total = filteredRecords.length;
    if (total === 0) return [];

    if (pieMode === 'commodity') {
      const map = new Map<string, number>();
      filteredRecords.forEach((r) => {
        const cat = getCommodityCategory(r.goodsDescription);
        map.set(cat, (map.get(cat) || 0) + 1);
      });

      const colorPalette: Record<string, { stroke: string; bg: string }> = {
        'Machinery & Tech': { stroke: '#06b6d4', bg: 'bg-cyan-500' },
        'Chemicals & Pharma': { stroke: '#0284c7', bg: 'bg-sky-600' },
        'Automotive & Tyres': { stroke: '#6366f1', bg: 'bg-indigo-500' },
        'Construction Materials': { stroke: '#a855f7', bg: 'bg-purple-500' },
        'Textiles & Apparel': { stroke: '#f59e0b', bg: 'bg-amber-500' },
        'General Cargo': { stroke: '#64748b', bg: 'bg-slate-500' },
      };

      const sorted = Array.from(map.entries())
        .map(([label, count]) => ({
          label,
          count,
          percent: Math.round((count / total) * 1000) / 10,
          color: colorPalette[label]?.stroke || '#06b6d4',
          bgClass: colorPalette[label]?.bg || 'bg-cyan-500',
        }))
        .sort((a, b) => b.count - a.count);

      const radius = 62;
      const circumference = 2 * Math.PI * radius;
      let accOffset = 0;

      return sorted.map((s) => {
        const dash = (s.percent / 100) * circumference;
        const gap = circumference - dash;
        const offset = accOffset;
        accOffset += dash;
        return {
          ...s,
          radius,
          circumference,
          dash,
          gap,
          offset,
        };
      });
    } else {
      let ultra = 0;
      let high = 0;
      let audit = 0;

      filteredRecords.forEach((r) => {
        const c = Number(r.confidence || 0);
        if (c >= 96) ultra++;
        else if (c >= 90) high++;
        else audit++;
      });

      const tiers = [
        { label: 'Ultra High (≥96%)', count: ultra, color: '#10b981', bgClass: 'bg-emerald-500' },
        { label: 'High Precision (90-95%)', count: high, color: '#06b6d4', bgClass: 'bg-cyan-500' },
        { label: 'Audit Queue (<90%)', count: audit, color: '#f59e0b', bgClass: 'bg-amber-500' },
      ].filter((t) => t.count > 0);

      const radius = 62;
      const circumference = 2 * Math.PI * radius;
      let accOffset = 0;

      return tiers.map((t) => {
        const percent = Math.round((t.count / total) * 1000) / 10;
        const dash = (percent / 100) * circumference;
        const gap = circumference - dash;
        const offset = accOffset;
        accOffset += dash;
        return {
          ...t,
          percent,
          radius,
          circumference,
          dash,
          gap,
          offset,
        };
      });
    }
  }, [filteredRecords, pieMode]);

  // Export Daily Breakdown to CSV
  const handleExportCSV = () => {
    if (dailyData.length === 0) return;
    const headers = [
      'Date',
      'Daily CusDec Ingested',
      'Cumulative Run-Up Total',
      'Day-over-Day Delta',
      'Day Delta (%)',
      'Mean OCR Accuracy (%)',
    ];
    const rows = dailyData.map((d) => [
      d.date,
      d.total,
      d.cumulative,
      d.dayDelta >= 0 ? `+${d.dayDelta}` : `${d.dayDelta}`,
      `${d.dayDeltaPct}%`,
      `${d.avgConfidence}%`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CusDec_Statistics_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Line Chart Coordinate Generator for the Cumulative Line Up Chart
  const svgLinePoints = useMemo(() => {
    if (dailyData.length === 0) return { pathD: '', areaD: '', points: [] };

    const totalSvgWidth = Math.max(1050, 90 + dailyData.length * 42);
    const chartLeft = 55;
    const chartRight = totalSvgWidth - 30;
    const chartTop = 35;
    const chartBottom = 225;
    const availableWidth = chartRight - chartLeft;
    const availableHeight = chartBottom - chartTop;

    const points = dailyData.map((d, index) => {
      const x =
        dailyData.length === 1
          ? chartLeft + availableWidth / 2
          : chartLeft + (index / (dailyData.length - 1)) * availableWidth;

      const yVal = trajectoryMode === 'cumulative' ? d.cumulative : d.total;
      const maxVal = trajectoryMode === 'cumulative' ? maxCumulativeTotal : maxDayTotal;
      const y = chartBottom - (yVal / maxVal) * availableHeight;

      return { x, y, data: d };
    });

    if (points.length === 1) {
      const p = points[0];
      return {
        pathD: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y}`,
        areaD: `M ${p.x - 20} ${chartBottom} L ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y} L ${p.x + 20} ${chartBottom} Z`,
        points,
      };
    }

    // Build smooth bezier curve
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const midX = (curr.x + next.x) / 2;
      pathD += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }

    const first = points[0];
    const last = points[points.length - 1];
    const areaD = `${pathD} L ${last.x} ${chartBottom} L ${first.x} ${chartBottom} Z`;

    return { pathD, areaD, points };
  }, [dailyData, trajectoryMode, maxCumulativeTotal, maxDayTotal]);

  if (isLoading) {
    return <StatisticsAnalyticsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* ========================================================
           HERO BANNER: STATISTICS & DAILY VOLUME TERMINAL
           ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] border border-slate-200/90 dark:border-cyan-500/20 p-4 sm:p-8 shadow-[0_12px_40px_-15px_rgba(14,165,233,0.12)] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85),0_0_35px_-10px_rgba(14,165,233,0.15)]">
        {/* Ambient Cyber Mesh Glow */}
        <div className="absolute -top-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 sm:w-80 h-60 sm:h-80 bg-blue-600/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2 max-w-2xl">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              CusDec Entry Velocity &amp;{' '}
              <span className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 bg-clip-text text-transparent">
                Growth Telemetry
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Real-time customs declarations entry volume, cumulative intake trajectory curves, month-over-month growth analytics, and period-over-period comparative telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-9 sm:h-10 px-3.5 sm:px-4 gap-2 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/70 text-xs font-semibold cursor-pointer shadow-xs w-full sm:w-auto justify-center"
            >
              <Download className="w-4 h-4 text-cyan-500" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================
           DATE FILTER & TIMEFRAME SELECTION BAR
           ======================================================== */}
      <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            {/* Left: Preset Buttons with Kinetic Sliding Pill */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 mr-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                <CalendarDays className="w-4 h-4 text-cyan-500" />
                <span>Timeframe:</span>
              </div>
              <div className="relative flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-inner overflow-x-auto no-scrollbar max-w-full">
                {/* Smooth Gliding Active Pill Indicator */}
                {timeframePillStyle && (
                  <div
                    style={{
                      left: `${timeframePillStyle.left}px`,
                      width: `${timeframePillStyle.width}px`,
                    }}
                    className="absolute top-1 bottom-1 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 shadow-md shadow-cyan-500/30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                  />
                )}
                {(
                  [
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: '14d', label: 'Last 14 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                    { id: 'month', label: 'This Month' },
                  ] as const
                ).map((preset) => {
                  const isActive = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      ref={(el) => {
                        presetRefs.current[preset.id] = el;
                      }}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={cn(
                        'relative z-10 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none',
                        isActive
                          ? 'text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Custom Date Range Pickers & Date Basis Toggle */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Basis Toggle with Smooth Sliding Indicator */}
              <div className="relative flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/60 text-xs shadow-inner">
                <div
                  className={cn(
                    "absolute top-1 bottom-1 rounded-lg bg-white dark:bg-slate-700 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none",
                    dateBasis === 'customs' ? "left-1 w-[98px]" : "left-[102px] w-[100px]"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setDateBasis('customs')}
                  className={cn(
                    'relative z-10 px-2.5 py-1 rounded-lg font-bold transition-colors duration-200 cursor-pointer',
                    dateBasis === 'customs'
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                  title="Filter using Box 54 Customs Declaration Stamp Date"
                >
                  Customs Date
                </button>
                <button
                  type="button"
                  onClick={() => setDateBasis('created')}
                  className={cn(
                    'relative z-10 px-2.5 py-1 rounded-lg font-bold transition-colors duration-200 cursor-pointer',
                    dateBasis === 'created'
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                  title="Filter using System Ingestion Timestamp"
                >
                  Ingestion Date
                </button>
              </div>

              {/* Start Date Picker (Custom Styled Popover) */}
              <CalendarPicker
                label="From:"
                value={startDate}
                maxDate={endDate || undefined}
                onChange={(val) => {
                  setCustomStartDate(val);
                  setActivePreset('all');
                }}
              />

              {/* End Date Picker (Custom Styled Popover) */}
              <CalendarPicker
                label="To:"
                value={endDate}
                minDate={startDate || undefined}
                onChange={(val) => {
                  setCustomEndDate(val);
                  setActivePreset('all');
                }}
              />

              <Badge
                variant="outline"
                className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1 rounded-full whitespace-nowrap"
              >
                {filteredRecords.length} / {records.length} Declarations
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================
           5 KEY TELEMETRY PERFORMANCE CARDS
           ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {/* Metric 1: Total Declarations Ingested */}
        <Card className="col-span-1 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-3.5 sm:p-5 shadow-sm hover:border-cyan-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase truncate">
              Total CusDec Volume
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {metrics.total}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500">docs</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            {metrics.totalDelta >= 0 ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-1.5 py-0.5">
                <TrendingUp className="w-3 h-3 mr-1 inline" />
                +{metrics.totalDelta}%
              </Badge>
            ) : (
              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold px-1.5 py-0.5">
                <TrendingDown className="w-3 h-3 mr-1 inline" />
                {metrics.totalDelta}%
              </Badge>
            )}
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              vs prior period
            </span>
          </div>
        </Card>

        {/* Metric 2: Monthly Increment / Decrement Status */}
        <Card className="col-span-1 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-3.5 sm:p-5 shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase truncate">
              Monthly Growth
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {metrics.latestMonth ? `+${metrics.latestMonth.deltaPct}%` : '+0.0%'}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-500/80 truncate">MoM</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            {metrics.latestMonth ? `+${metrics.latestMonth.deltaDocs} docs over previous month` : 'Baseline month'}
          </div>
        </Card>

        {/* Metric 3: Daily Ingestion Rate */}
        <Card className="col-span-1 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-3.5 sm:p-5 shadow-sm hover:border-sky-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase truncate">
              Daily Ingestion
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shrink-0">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400">
              ~{metrics.avgDailyVolume}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">/day</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Across {metrics.activeDaysCount} active intake days
          </div>
        </Card>

        {/* Metric 4: Peak Ingestion Velocity */}
        <Card className="col-span-1 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-3.5 sm:p-5 shadow-sm hover:border-indigo-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase truncate">
              Peak Day Intake
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {metrics.peakDay.total}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">docs</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {metrics.peakDay.date ? formatDateDisplay(metrics.peakDay.date) : 'N/A'}
          </div>
        </Card>

        {/* Metric 5: Mean OCR Accuracy */}
        <Card className="col-span-2 sm:col-span-2 lg:col-span-1 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-3.5 sm:p-5 shadow-sm hover:border-cyan-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
              Mean OCR Accuracy
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
              <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-[10px] font-bold px-2 py-0.5">
                High Precision
              </Badge>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Extraction Accuracy
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Multi-pass OCR fidelity
              </div>
            </div>
            <DonutRingGauge
              value={`${metrics.avgConfidence}%`}
              percent={metrics.avgConfidence}
              label="ACCURACY"
              color="cyan"
              size={86}
              strokeWidth={7}
              valueClassName="text-2xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight"
              labelClassName="text-[9px] font-extrabold tracking-wider mt-0.5"
            />
          </div>
        </Card>
      </div>

      {/* ========================================================
           TELEMETRY CHART 1: CUMULATIVE INTAKE TRAJECTORY (LINE UP CHART)
           ======================================================== */}
      <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <LineChartIcon className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
                {trajectoryMode === 'velocity'
                  ? 'Daily CusDec Intake Trendline (Volume Velocity Trajectory)'
                  : 'Cumulative CusDec Intake Trajectory (Ascending Volume Curve)'}
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {trajectoryMode === 'velocity'
                ? 'Visualizes daily customs declarations entry progression and volume velocity over the selected time window.'
                : 'Visualizes the progressive cumulative intake curve climbing over time, tracking overall customs ingestion velocity.'}
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setTrajectoryMode('velocity')}
                className={cn(
                  'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  trajectoryMode === 'velocity'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                Daily Trendline
              </button>
              <button
                type="button"
                onClick={() => setTrajectoryMode('cumulative')}
                className={cn(
                  'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  trajectoryMode === 'cumulative'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                Cumulative Line Up
              </button>
            </div>

            <Badge variant="outline" className="text-xs font-mono border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
              {trajectoryMode === 'velocity'
                ? `Avg Daily Volume: ${metrics.avgDailyVolume} docs/day`
                : `Total Run-Up: ${dailyData.length > 0 ? dailyData[dailyData.length - 1].cumulative : 0} docs`}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {dailyData.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                No declarations recorded within the selected date window ({startDate} to {endDate}).
              </p>
            </div>
          ) : (
            <div
              ref={lineChartContainerRef}
              className="relative overflow-visible"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setLineTooltipPos({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
              onTouchStart={(e) => {
                if (e.touches.length > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setLineTooltipPos({
                    x: e.touches[0].clientX - rect.left,
                    y: e.touches[0].clientY - rect.top,
                  });
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setLineTooltipPos({
                    x: e.touches[0].clientX - rect.left,
                    y: e.touches[0].clientY - rect.top,
                  });
                }
              }}
              onTouchEnd={() => {
                setTimeout(() => {
                  setHoveredLinePoint(null);
                  setLineTooltipPos(null);
                }, 3000);
              }}
              onMouseLeave={() => {
                setHoveredLinePoint(null);
                setLineTooltipPos(null);
              }}
            >
              {/* Near-Cursor Floating Tooltip Card */}
              {hoveredLinePoint && (
                <div
                  style={getDynamicTooltipStyle(lineTooltipPos, lineChartContainerRef)}
                  className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#070b14]/95 text-slate-900 dark:text-white border border-amber-500/30 dark:border-amber-500/40 shadow-xl shadow-slate-900/10 dark:shadow-2xl dark:shadow-amber-500/10 backdrop-blur-md text-xs space-y-1.5 w-[250px] select-none pointer-events-none transition-all"
                >
                  <div className="font-extrabold text-slate-900 dark:text-amber-400 text-sm flex items-center justify-between gap-2">
                    <span className="font-bold tracking-tight">{formatDateDisplay(hoveredLinePoint.date)}</span>
                    <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-500/30 text-[10px] font-mono shrink-0">
                      {trajectoryMode === 'velocity'
                        ? `${hoveredLinePoint.total} Ingested`
                        : `${hoveredLinePoint.cumulative} Total`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
                    <span className="text-slate-500 dark:text-slate-400">Day Ingestion Volume:</span>
                    <strong className="text-amber-600 dark:text-amber-300 font-mono font-bold">+{hoveredLinePoint.total} declarations</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">Cumulative to date:</span>
                    <strong className="text-amber-700 dark:text-amber-400 font-mono font-bold">{hoveredLinePoint.cumulative} docs</strong>
                  </div>
                </div>
              )}

              {/* Responsive SVG Smooth Curve Chart */}
              <div className="w-full overflow-x-auto pb-1">
                {(() => {
                  const lineSvgWidth = Math.max(1050, 90 + dailyData.length * 42);
                  const lineSvgHeight = 275;
                  const baselineY = 225;
                  const topGuideY = 35;
                  const availableHeight = baselineY - topGuideY;

                  return (
                    <div style={{ minWidth: dailyData.length > 20 ? `${lineSvgWidth}px` : '100%' }}>
                      <svg
                        viewBox={`0 0 ${lineSvgWidth} ${lineSvgHeight}`}
                        className="w-full h-72 sm:h-80 select-none"
                      >
                        <defs>
                          <linearGradient id="warmAmberAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
                            <stop offset="60%" stopColor="#f97316" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="warmAmberLineGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="50%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#f97316" />
                          </linearGradient>
                          <radialGradient id="amberNodeAura" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.12" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                          </radialGradient>
                          <filter id="amberPointGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#f59e0b" floodOpacity="0.8" />
                          </filter>
                        </defs>

                        {/* Horizontal Guide Lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                          const y = baselineY - pct * availableHeight;
                          const maxVal = trajectoryMode === 'cumulative' ? maxCumulativeTotal : maxDayTotal;
                          const val = Math.round(maxVal * pct);
                          return (
                            <g key={idx}>
                              <line
                                x1="50"
                                y1={y}
                                x2={lineSvgWidth - 20}
                                y2={y}
                                stroke="currentColor"
                                strokeDasharray="4 4"
                                className="text-slate-200 dark:text-slate-800/80"
                                strokeWidth="1"
                              />
                              <text
                                x="42"
                                y={y + 3}
                                textAnchor="end"
                                className="fill-slate-400 dark:fill-slate-500 font-mono text-xs font-bold"
                              >
                                {val}
                              </text>
                            </g>
                          );
                        })}

                        {/* Baseline Rule */}
                        <line
                          x1="50"
                          y1={baselineY}
                          x2={lineSvgWidth - 20}
                          y2={baselineY}
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="text-slate-200 dark:text-slate-700/80"
                        />

                        {/* Filled Area below the curve */}
                        {svgLinePoints.areaD && (
                          <path d={svgLinePoints.areaD} fill="url(#warmAmberAreaGrad)" />
                        )}

                        {/* Main Trajectory Curve Line */}
                        {svgLinePoints.pathD && (
                          <path
                            d={svgLinePoints.pathD}
                            fill="none"
                            stroke="url(#warmAmberLineGrad)"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-all duration-300"
                          />
                        )}

                    {/* Interactive Data Point Nodes */}
                    {svgLinePoints.points.map((p, idx) => {
                      const isHovered = hoveredLinePoint?.date === p.data.date;
                      const availableWidth = lineSvgWidth - 85;
                      const colWidth = availableWidth / dailyData.length;

                      return (
                        <g
                          key={p.data.date}
                          onMouseEnter={(e) => {
                            const rect = lineChartContainerRef.current?.getBoundingClientRect();
                            if (rect) {
                              setLineTooltipPos({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top,
                              });
                            }
                            setHoveredLinePoint({
                              date: p.data.date,
                              total: p.data.total,
                              cumulative: p.data.cumulative,
                              rate: p.data.avgConfidence,
                            });
                          }}
                          onMouseMove={(e) => {
                            const rect = lineChartContainerRef.current?.getBoundingClientRect();
                            if (rect) {
                              setLineTooltipPos({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top,
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredLinePoint(null)}
                          className="cursor-pointer"
                        >
                          {/* Invisible full-height hit area for effortless hover detection */}
                          <rect
                            x={p.x - colWidth / 2}
                            y="20"
                            width={colWidth}
                            height={baselineY + 40}
                            fill="transparent"
                          />

                          {/* Professional Motion Graphic Interactive Beacon on Hover */}
                          {isHovered && (
                            <g className="pointer-events-none">
                              {/* Ambient pulsating beacon aura */}
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="15"
                                fill="url(#amberNodeAura)"
                                className="animate-pulse"
                              />

                              {/* Precision reticle target ring */}
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="9.5"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="1.25"
                                strokeOpacity="0.5"
                              />

                              {/* Floating HUD micro-pill badge */}
                              <g className="animate-in fade-in zoom-in-95 duration-150">
                                <rect
                                  x={p.x - 20}
                                  y={p.y - 32}
                                  width="40"
                                  height="20"
                                  rx="6"
                                  className="fill-white dark:fill-[#070c18] stroke stroke-amber-500/50 dark:stroke-amber-500/60 shadow-md"
                                />
                                <polygon
                                  points={`${p.x - 4},${p.y - 12} ${p.x + 4},${p.y - 12} ${p.x},${p.y - 8}`}
                                  className="fill-white dark:fill-[#070c18]"
                                />
                                <text
                                  x={p.x}
                                  y={p.y - 18}
                                  textAnchor="middle"
                                  className="font-mono text-[11px] font-black fill-amber-600 dark:fill-amber-400 select-none tracking-tight"
                                >
                                  {trajectoryMode === 'cumulative' ? p.data.cumulative : p.data.total}
                                </text>
                              </g>
                            </g>
                          )}

                          {/* Clean Node Point */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isHovered ? 6 : 4}
                            fill={isHovered ? '#f59e0b' : '#ffffff'}
                            stroke="#f59e0b"
                            strokeWidth={isHovered ? 2.5 : 2}
                            filter={isHovered ? 'url(#amberPointGlow)' : undefined}
                            className="transition-all duration-200 ease-out"
                          />

                          {/* Inner crisp pupil when hovered */}
                          {isHovered && (
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="2"
                              fill="#ffffff"
                              className="pointer-events-none"
                            />
                          )}

                          {/* Top value badge on point (resting non-hovered state) */}
                          {!isHovered && idx % Math.ceil(dailyData.length / 8) === 0 && (
                            <text
                              x={p.x}
                              y={p.y - 10}
                              textAnchor="middle"
                              className="font-mono text-xs font-bold transition-all select-none fill-amber-600/80 dark:fill-amber-400/80"
                            >
                              {trajectoryMode === 'cumulative' ? p.data.cumulative : p.data.total}
                            </text>
                          )}

                          {/* X-axis date text */}
                          {(() => {
                            const smartDate = formatSmartAxisDate(
                              p.data.date,
                              idx,
                              svgLinePoints.points.map((pt) => pt.data.date)
                            );
                            return (
                              <text
                                x={p.x}
                                y={baselineY + 24}
                                textAnchor="middle"
                                className={cn(
                                  'text-xs font-bold transition-all select-none',
                                  isHovered
                                    ? 'fill-amber-500 font-extrabold text-[13px]'
                                    : smartDate.monthPart
                                    ? 'fill-amber-600 dark:fill-amber-400 font-extrabold'
                                    : 'fill-slate-600 dark:fill-slate-300'
                                )}
                              >
                                {smartDate.monthPart ? `${smartDate.monthPart} ${smartDate.dayPart}` : smartDate.dayPart}
                              </text>
                            );
                          })()}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              );
            })()}
          </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================
           TELEMETRY ROW 2: DAILY CUSDEC ENTRY BAR GRAPH (REDUCED WIDTH) + PIE CHART (TO THE RIGHT)
           ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left: Daily CusDec Entry Volume Chart (Reduced Width: lg:col-span-2) */}
        <Card className="lg:col-span-2 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-500" />
                <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Daily CusDec Entry Volume Chart
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Visualizes daily customs declarations entry counts and cargo intake velocity over time.
              </CardDescription>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-cyan-600 to-sky-400 inline-block shadow-xs" />
                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                  Daily CusDec Declarations
                </span>
              </div>
              {metrics.peakDay.total > 0 && (
                <Badge variant="outline" className="text-xs font-mono border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  Peak Day: {metrics.peakDay.total} docs ({formatDayLabel(metrics.peakDay.date)})
                </Badge>
              )}
            </div>
          </CardHeader>

          {/* Mini Summary Telemetry KPIs Row - Fills vertical void with high-value operational stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 pt-5 pb-1">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filtered Volume</div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                {metrics.total} <span className="text-[10px] font-normal text-slate-400">docs</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Daily Rate</div>
              <div className="text-lg font-extrabold text-cyan-600 dark:text-cyan-400 mt-0.5">
                {metrics.avgDailyVolume} <span className="text-[10px] font-normal text-slate-400">/day</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Intake Days</div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                {metrics.activeDaysCount} <span className="text-[10px] font-normal text-slate-400">days</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Peak Intake Day</div>
              <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {metrics.peakDay.total} <span className="text-[10px] font-normal text-slate-400">docs</span>
              </div>
            </div>
          </div>

          <CardContent className="p-6 pt-3 flex-1 flex flex-col justify-center">
            {dailyData.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  No declarations recorded within the selected date window ({startDate} to {endDate}).
                </p>
              </div>
            ) : (
              <div
                ref={barChartContainerRef}
                className="relative overflow-visible"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setBarTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
                onTouchStart={(e) => {
                  if (e.touches.length > 0) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setBarTooltipPos({
                      x: e.touches[0].clientX - rect.left,
                      y: e.touches[0].clientY - rect.top,
                    });
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length > 0) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setBarTooltipPos({
                      x: e.touches[0].clientX - rect.left,
                      y: e.touches[0].clientY - rect.top,
                    });
                  }
                }}
                onTouchEnd={() => {
                  setTimeout(() => {
                    setHoveredBarData(null);
                    setBarTooltipPos(null);
                  }, 3000);
                }}
                onMouseLeave={() => {
                  setHoveredBarData(null);
                  setBarTooltipPos(null);
                }}
              >
                {/* Dynamic Near-Cursor Floating Tooltip Card */}
                {hoveredBarData && (
                  <div
                    style={getDynamicTooltipStyle(barTooltipPos, barChartContainerRef)}
                    className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#070b14]/95 text-slate-900 dark:text-white border border-cyan-500/30 dark:border-cyan-500/40 shadow-xl shadow-slate-900/10 dark:shadow-2xl dark:shadow-cyan-500/10 backdrop-blur-md text-xs space-y-1.5 w-[230px] select-none pointer-events-none transition-all"
                  >
                    <div className="font-extrabold text-slate-900 dark:text-cyan-400 text-sm flex items-center justify-between gap-2">
                      <span className="truncate">{formatDateDisplay(hoveredBarData.date)}</span>
                      <Badge className="bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300/60 dark:border-cyan-500/30 text-[10px] font-mono shrink-0">
                        {hoveredBarData.total} Ingested
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400">Cumulative to Date:</span>
                      <strong className="text-cyan-600 dark:text-cyan-300 font-mono font-bold">{hoveredBarData.cumulative} docs</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Day Delta:</span>
                      <span className={cn('font-bold font-mono', hoveredBarData.dayDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                        {hoveredBarData.dayDelta >= 0 ? `+${hoveredBarData.dayDelta}` : hoveredBarData.dayDelta} vs prev day
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/40">
                      <span>Mean Accuracy:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{hoveredBarData.avgConfidence}%</strong>
                    </div>
                  </div>
                )}

                {/* Responsive SVG Chart with Bold Proportional Height and Large Bars */}
                <div className="w-full overflow-x-auto pb-1">
                  {(() => {
                    const chartSvgWidth = Math.max(1050, 90 + dailyData.length * 42);
                    const chartSvgHeight = 360;
                    const baselineY = 290;
                    const topGuideY = 40;
                    const maxBarHeight = 240;

                    return (
                      <div style={{ minWidth: dailyData.length > 20 ? `${chartSvgWidth}px` : '100%' }}>
                        <svg
                          viewBox={`0 0 ${chartSvgWidth} ${chartSvgHeight}`}
                          className="w-full h-[360px] sm:h-[400px] select-none"
                        >
                          <defs>
                            <linearGradient id="solidCyanBarGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#38bdf8" />
                              <stop offset="100%" stopColor="#0284c7" />
                            </linearGradient>
                            <linearGradient id="solidCyanBarGradHover" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#67e8f9" />
                              <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                            <filter id="cyanGlow" x="-30%" y="-30%" width="160%" height="160%">
                              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0284c7" floodOpacity="0.45" />
                            </filter>
                          </defs>

                          {/* Horizontal Guide Lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                            const y = baselineY - pct * (baselineY - topGuideY);
                            const val = Math.round(maxDayTotal * pct);
                            return (
                              <g key={idx}>
                                <line
                                  x1="52"
                                  y1={y}
                                  x2={chartSvgWidth - 20}
                                  y2={y}
                                  stroke="currentColor"
                                  strokeDasharray="4 4"
                                  className="text-slate-200 dark:text-slate-800/80"
                                  strokeWidth="1"
                                />
                                <text
                                  x="44"
                                  y={y + 4}
                                  textAnchor="end"
                                  className="fill-slate-400 dark:fill-slate-500 font-mono text-xs font-bold"
                                >
                                  {val}
                                </text>
                              </g>
                            );
                          })}

                          {/* Baseline Rule */}
                          <line
                            x1="52"
                            y1={baselineY}
                            x2={chartSvgWidth - 20}
                            y2={baselineY}
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="text-slate-200 dark:text-slate-700/80"
                          />

                          {/* Unified Daily Bar Columns */}
                          {dailyData.map((d, index) => {
                            const availableWidth = chartSvgWidth - 85;
                            const colWidth = availableWidth / dailyData.length;
                            const colCenterX = 60 + index * colWidth + colWidth / 2;

                            const isHovered = hoveredBarData?.date === d.date;
                            const barWidth = Math.min(36, Math.max(22, colWidth * 0.65));
                            const barHeight = Math.max(12, (d.total / maxDayTotal) * maxBarHeight);
                            const barY = baselineY - barHeight;

                            return (
                              <g
                                key={d.date}
                                onMouseEnter={(e) => {
                                  const rect = barChartContainerRef.current?.getBoundingClientRect();
                                  if (rect) {
                                    setBarTooltipPos({
                                      x: e.clientX - rect.left,
                                      y: e.clientY - rect.top,
                                    });
                                  }
                                  setHoveredBarData({
                                    date: d.date,
                                    total: d.total,
                                    cumulative: d.cumulative,
                                    dayDelta: d.dayDelta,
                                    avgConfidence: d.avgConfidence,
                                  });
                                }}
                                onMouseMove={(e) => {
                                  const rect = barChartContainerRef.current?.getBoundingClientRect();
                                  if (rect) {
                                    setBarTooltipPos({
                                      x: e.clientX - rect.left,
                                      y: e.clientY - rect.top,
                                    });
                                  }
                                }}
                                onMouseLeave={() => setHoveredBarData(null)}
                                className="cursor-pointer transition-all"
                              >
                                {/* Invisible full-height hit area for seamless hovering */}
                                <rect
                                  x={colCenterX - colWidth / 2}
                                  y="20"
                                  width={colWidth}
                                  height={baselineY + 50}
                                  fill="transparent"
                                />

                                {/* Hover highlight column */}
                                {isHovered && (
                                  <rect
                                    x={colCenterX - colWidth / 2 + 2}
                                    y={topGuideY - 10}
                                    width={colWidth - 4}
                                    height={baselineY - topGuideY + 15}
                                    rx="8"
                                    className="fill-cyan-500/10 dark:fill-cyan-500/15"
                                  />
                                )}

                                {/* Solid Bar */}
                                <rect
                                  x={colCenterX - barWidth / 2}
                                  y={barY}
                                  width={barWidth}
                                  height={barHeight}
                                  rx="7"
                                  fill={isHovered ? 'url(#solidCyanBarGradHover)' : 'url(#solidCyanBarGrad)'}
                                  filter={isHovered ? 'url(#cyanGlow)' : undefined}
                                  className={cn(
                                    'transition-all duration-200',
                                    isHovered ? 'opacity-100 scale-y-102' : 'opacity-90 hover:opacity-100'
                                  )}
                                />

                                {/* Count Label on Top */}
                                <text
                                  x={colCenterX}
                                  y={barY - 8}
                                  textAnchor="middle"
                                  className={cn(
                                    'font-mono text-xs font-black transition-all',
                                    isHovered
                                      ? 'fill-cyan-400 text-sm font-black'
                                      : 'fill-slate-800 dark:fill-slate-200'
                                  )}
                                >
                                  {d.total}
                                </text>

                                {/* X-Axis Date Label */}
                                {(() => {
                                  const smartDate = formatSmartAxisDate(
                                    d.date,
                                    index,
                                    dailyData.map((item) => item.date)
                                  );
                                  return (
                                    <text
                                      x={colCenterX}
                                      y={baselineY + 24}
                                      textAnchor="middle"
                                      className={cn(
                                        'text-xs font-bold transition-all select-none',
                                        isHovered
                                          ? 'fill-cyan-500 font-extrabold text-[13px]'
                                          : smartDate.monthPart
                                          ? 'fill-cyan-600 dark:fill-cyan-400 font-extrabold'
                                          : 'fill-slate-600 dark:fill-slate-300'
                                      )}
                                    >
                                      {smartDate.monthPart ? `${smartDate.monthPart} ${smartDate.dayPart}` : smartDate.dayPart}
                                    </text>
                                  );
                                })()}
                                <text
                                  x={colCenterX}
                                  y={baselineY + 42}
                                  textAnchor="middle"
                                  className={cn(
                                    'text-[10px] font-mono font-bold transition-all select-none',
                                    isHovered
                                      ? 'fill-emerald-400 font-extrabold text-[11px]'
                                      : 'fill-emerald-600 dark:fill-emerald-400'
                                  )}
                                >
                                  {d.avgConfidence}%
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Cargo Commodity Category Distribution Pie Chart (lg:col-span-1) */}
        <Card className="lg:col-span-1 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-cyan-500" />
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                    Cargo Category Share
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400">
                    Commodity &amp; tariff distribution
                  </CardDescription>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200 dark:border-slate-700/60 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPieMode('commodity')}
                  className={cn(
                    'px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer',
                    pieMode === 'commodity'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                  title="Breakdown by Cargo Commodity Classification"
                >
                  Commodity
                </button>
                <button
                  type="button"
                  onClick={() => setPieMode('fidelity')}
                  className={cn(
                    'px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer',
                    pieMode === 'fidelity'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                  title="Breakdown by OCR Fidelity Precision Tiers"
                >
                  Fidelity
                </button>
              </div>
            </div>

            {/* SVG Donut / Pie Chart */}
            <div className="py-2 flex flex-col items-center justify-center relative">
              <svg viewBox="0 0 200 200" className="w-44 h-44 select-none">
                {/* Background Ring Track */}
                <circle
                  cx="100"
                  cy="100"
                  r="62"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="20"
                  className="text-slate-100 dark:text-slate-800/60"
                />

                {/* Slices / Segments */}
                {pieSegments.map((seg) => {
                  const isHovered = hoveredPieLabel === seg.label;
                  return (
                    <circle
                      key={seg.label}
                      cx="100"
                      cy="100"
                      r="62"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={isHovered ? 26 : 20}
                      strokeDasharray={`${seg.dash} ${seg.gap}`}
                      strokeDashoffset={-seg.offset}
                      transform="rotate(-90 100 100)"
                      onMouseEnter={() => setHoveredPieLabel(seg.label)}
                      onMouseLeave={() => setHoveredPieLabel(null)}
                      className="cursor-pointer transition-all duration-200"
                      style={{
                        filter: isHovered ? `drop-shadow(0px 0px 6px ${seg.color})` : undefined,
                      }}
                    />
                  );
                })}

                {/* Center Content */}
                <text
                  x="100"
                  y="94"
                  textAnchor="middle"
                  className="font-extrabold font-mono text-2xl fill-slate-900 dark:fill-white"
                >
                  {hoveredPieLabel
                    ? pieSegments.find((s) => s.label === hoveredPieLabel)?.count || metrics.total
                    : metrics.total}
                </text>
                <text
                  x="100"
                  y="112"
                  textAnchor="middle"
                  className="text-[10px] font-semibold fill-slate-500 dark:fill-slate-400"
                >
                  {hoveredPieLabel
                    ? `${pieSegments.find((s) => s.label === hoveredPieLabel)?.percent}% share`
                    : 'Total Filings'}
                </text>
                <text
                  x="100"
                  y="126"
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-cyan-500 font-bold"
                >
                  {hoveredPieLabel || 'All Categories'}
                </text>
              </svg>
            </div>

            {/* Category Breakdown Legend */}
            <div className="space-y-1 mt-1">
              {pieSegments.map((seg) => {
                const isHovered = hoveredPieLabel === seg.label;
                return (
                  <div
                    key={seg.label}
                    onMouseEnter={() => setHoveredPieLabel(seg.label)}
                    onMouseLeave={() => setHoveredPieLabel(null)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-xl transition-all cursor-pointer space-y-1',
                      isHovered
                        ? 'bg-slate-100 dark:bg-slate-800/80 shadow-xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    )}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate max-w-[65%]">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: seg.color }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                          {seg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                        <span className="text-slate-500 dark:text-slate-400 font-bold">
                          {seg.count} docs
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 border-transparent bg-slate-100 dark:bg-slate-800 font-bold"
                        >
                          {seg.percent}%
                        </Badge>
                      </div>
                    </div>
                    <Progress
                      value={seg.percent}
                      className="h-1 bg-slate-100 dark:bg-slate-800"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Primary Share:</span>
            <strong className="text-cyan-500 font-bold">
              {pieSegments[0]?.label || 'General Cargo'} ({pieSegments[0]?.percent || 0}%)
            </strong>
          </div>
        </Card>
      </div>

      {/* ========================================================
           TELEMETRY CHART 3: MONTHLY INCREMENT & DECREMENT ANALYSIS
           ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Monthly Comparison Bars & Delta Analysis */}
        <Card className="lg:col-span-2 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Monthly Increment / Decrement Progression
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Month-over-month volume comparisons and intake trajectory deltas
                </p>
              </div>
            </div>

            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              Multi-Month Progression
            </Badge>
          </div>

          {/* Month Cards Grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {monthlyTelemetry.map((m, idx) => {
              const isLatest = idx === monthlyTelemetry.length - 1;
              return (
                <div
                  key={m.monthKey}
                  className={cn(
                    'p-4 rounded-2xl border transition-all space-y-3',
                    isLatest
                      ? 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-300 dark:border-cyan-800/50'
                      : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {m.label}
                    </span>
                    {idx > 0 && (
                      <Badge
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5',
                          m.isPositive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        )}
                      >
                        {m.isPositive ? (
                          <ArrowUpRight className="w-3 h-3 mr-0.5 inline" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 mr-0.5 inline" />
                        )}
                        {m.isPositive ? `+${m.deltaPct}%` : `${m.deltaPct}%`}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {m.count}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">docs</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Monthly Share</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {Math.round((m.count / records.length) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(m.count / maxMonthCount) * 100}
                      className={cn('h-1.5', isLatest ? 'bg-cyan-100 dark:bg-cyan-950' : 'bg-slate-200 dark:bg-slate-800')}
                    />
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    {idx === 0
                      ? 'Baseline observation month'
                      : m.isPositive
                      ? `+${m.deltaDocs} declarations increment`
                      : `${m.deltaDocs} declarations decrement`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Month-over-Month Growth Callout Banner */}
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-slate-900 dark:text-white block font-bold">
                  {metrics.latestMonth && metrics.latestMonth.isPositive
                    ? `Intake Rate Expanding: +${metrics.latestMonth.deltaPct}% Increment This Month`
                    : `Intake Rate Normalized: ${metrics.latestMonth?.deltaPct || 0}% Decrement`}
                </strong>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Positive month-over-month trajectory observed across active customs clearing manifests.
                </span>
              </div>
            </div>

            <Badge
              variant="outline"
              className="font-mono text-xs font-bold px-3 py-1 rounded-full shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            >
              Intake Ascending
            </Badge>
          </div>
        </Card>

        {/* Right: Intake Run-Rate & Velocity Telemetry */}
        <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Velocity Telemetry
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pace metrics &amp; capacity analysis
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Average Intake Pace
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-baseline gap-2">
                  <span>~{metrics.avgDailyVolume}</span>
                  <span className="text-xs text-slate-400 font-normal">docs / active day</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Calculated across registered manifest days in current window
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200/80 dark:border-cyan-800/30 space-y-1.5">
                <div className="text-xs text-cyan-800 dark:text-cyan-400 font-medium">
                  Highest Daily Volume
                </div>
                <div className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-400 flex items-baseline gap-2">
                  <span>{metrics.peakDay.total}</span>
                  <span className="text-xs text-cyan-500/80 font-normal">declarations</span>
                </div>
                <p className="text-[11px] text-cyan-800/70 dark:text-cyan-300/70">
                  {metrics.peakDay.date ? formatDateDisplay(metrics.peakDay.date) : 'N/A'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/30 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-emerald-800 dark:text-emerald-400 font-medium">
                    Mean Recognition Accuracy
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    High Fidelity Extraction
                  </div>
                  <p className="text-[11px] text-emerald-800/70 dark:text-emerald-300/70 mt-0.5">
                    Multi-pass OCR precision
                  </p>
                </div>
                <DonutRingGauge
                  value={`${metrics.avgConfidence}%`}
                  percent={metrics.avgConfidence}
                  label="ACC"
                  color="emerald"
                  size={58}
                  strokeWidth={5}
                  valueClassName="text-sm font-black text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ========================================================
           LEADERBOARDS: TOP CONSIGNEES & TOP DECLARANTS
           ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Consignees */}
        <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] shadow-sm p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              Top Ingested Consignees (Box 8)
            </h3>
            <Badge variant="outline" className="text-[10px] text-slate-400">
              Volume Leaderboard
            </Badge>
          </div>
          <div className="mt-4 space-y-3">
            {topEntities.topConsignees.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No consignee data in this range</p>
            ) : (
              topEntities.topConsignees.map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[70%]">
                      {i + 1}. {c.name}
                    </span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      {c.count} docs ({c.percent}%)
                    </span>
                  </div>
                  <Progress value={c.percent} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Top Declarants */}
        <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] shadow-sm p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Top Declarant &amp; Clearing Agents (Box 14)
            </h3>
            <Badge variant="outline" className="text-[10px] text-slate-400">
              Agent Leaderboard
            </Badge>
          </div>
          <div className="mt-4 space-y-3">
            {topEntities.topDeclarants.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No declarant data in this range</p>
            ) : (
              topEntities.topDeclarants.map((d, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[70%]">
                      {i + 1}. {d.name}
                    </span>
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                      {d.count} docs ({d.percent}%)
                    </span>
                  </div>
                  <Progress value={d.percent} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ========================================================
           DETAILED DAILY LEDGER TABLE
           ======================================================== */}
      <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-500" />
              Daily CusDec Telemetry Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Detailed chronological registry of entries, cumulative progression run-up, and day-over-day increments
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {dailyData.length} Active Days Logged
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {/* Mobile Card Feed for Small Screens */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
            {dailyData.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No records found in this date timeframe.
              </div>
            ) : (
              dailyData.map((day) => {
                const intensityPct = Math.round((day.total / (metrics.peakDay.total || 1)) * 100);
                return (
                  <div key={day.date} className="p-4 space-y-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {formatDateDisplay(day.date)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-xs bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 font-bold">
                          {day.total} docs
                        </Badge>
                        <span
                          className={cn(
                            'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md',
                            day.dayDelta >= 0
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                          )}
                        >
                          {day.dayDelta >= 0 ? `+${day.dayDelta}` : day.dayDelta}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Cumulative: <strong className="text-slate-700 dark:text-slate-300 font-mono">{day.cumulative} docs</strong></span>
                      <span>Accuracy: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{day.avgConfidence}%</strong></span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Intake Intensity</span>
                        <span className="font-mono font-semibold">{intensityPct}%</span>
                      </div>
                      <Progress value={intensityPct} className="h-1.5" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden md:block">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/60">
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="font-bold text-xs">Calendar Date</TableHead>
                  <TableHead className="font-bold text-xs text-center">Daily Ingested</TableHead>
                  <TableHead className="font-bold text-xs text-center">Cumulative Run-Up</TableHead>
                  <TableHead className="font-bold text-xs text-center">Day Delta</TableHead>
                  <TableHead className="font-bold text-xs">Volume Intensity</TableHead>
                  <TableHead className="font-bold text-xs text-right">Mean Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                      No records found in this date timeframe.
                    </TableCell>
                  </TableRow>
                ) : (
                  dailyData.map((day) => {
                    const intensityPct = Math.round((day.total / (metrics.peakDay.total || 1)) * 100);
                    return (
                      <TableRow
                        key={day.date}
                        className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-xs"
                      >
                        <TableCell className="font-bold text-slate-900 dark:text-slate-100">
                          {formatDateDisplay(day.date)}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          <Badge variant="outline" className="font-mono text-xs bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-500/20">
                            {day.total} docs
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono font-extrabold text-slate-800 dark:text-slate-200">
                          {day.cumulative} docs
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          <span
                            className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded-md',
                              day.dayDelta >= 0
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                            )}
                          >
                            {day.dayDelta >= 0 ? `+${day.dayDelta}` : day.dayDelta}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <Progress value={intensityPct} className="h-1.5 flex-1" />
                            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {intensityPct}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {day.avgConfidence}%
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
