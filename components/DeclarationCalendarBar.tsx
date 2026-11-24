"use client";

import React, { useMemo } from "react";
import { CusDecRecord } from "@/lib/types";
import {
  parseRecordDate,
  formatDateDisplay,
  formatLongDateDisplay,
  formatShortDateDisplay,
  stepDate,
  getTodayIso,
} from "@/lib/dateUtils";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CalendarCheck2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowRight,
  X,
  UploadCloud,
} from "lucide-react";

interface DeclarationCalendarBarProps {
  selectedDate: string; // YYYY-MM-DD or ""
  onSelectDate: (date: string) => void;
  records: CusDecRecord[];
  totalFilteredRecordsCount: number;
  onOpenMissingAuditModal?: () => void;
}

export function DeclarationCalendarBar({
  selectedDate,
  onSelectDate,
  records,
  totalFilteredRecordsCount,
  onOpenMissingAuditModal,
}: DeclarationCalendarBarProps) {
  // Aggregate available dates and metrics based strictly on when CusDecs were uploaded to the system
  const { availableDatesWithCounts, minRecordDate, maxRecordDate } = useMemo(() => {
    const map = new Map<string, { total: number; verified: number; review: number }>();

    for (const r of records) {
      const d = parseRecordDate(r, "created");
      if (d) {
        const cur = map.get(d) || { total: 0, verified: 0, review: 0 };
        cur.total += 1;
        if (r.status === "VERIFIED" || r.status === "CORRECTED") {
          cur.verified += 1;
        } else if (r.status === "NEEDS_REVIEW") {
          cur.review += 1;
        }
        map.set(d, cur);
      }
    }

    const sortedAsc = Array.from(map.keys()).sort();
    const sortedDesc = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));

    return {
      availableDatesWithCounts: sortedDesc,
      minRecordDate: sortedAsc[0] || "",
      maxRecordDate: sortedAsc[sortedAsc.length - 1] || "",
    };
  }, [records]);

  // Compute daily stamp sequence audit gaps independently for each upload day tab
  const dateStampGapsMap = useMemo(() => {
    const parseNum = (s?: string) => {
      if (!s) return null;
      const clean = String(s).replace(/\D/g, "");
      if (!clean) return null;
      const n = parseInt(clean, 10);
      return isNaN(n) ? null : n;
    };

    const dateGroups = new Map<string, CusDecRecord[]>();
    for (const r of records) {
      const d = parseRecordDate(r, "created");
      if (d) {
        const list = dateGroups.get(d) || [];
        list.push(r);
        dateGroups.set(d, list);
      }
    }

    const gapMap = new Map<string, { gapsCount: number; missingCount: number }>();

    for (const [dateStr, recs] of dateGroups.entries()) {
      const sorted = [...recs].sort((a, b) => {
        const numA = parseNum(a.greenStampNumber) ?? Infinity;
        const numB = parseNum(b.greenStampNumber) ?? Infinity;
        if (numA !== numB) return numA - numB;
        return (a.greenStampNumber || "").localeCompare(b.greenStampNumber || "");
      });

      let gapsCount = 0;
      let missingCount = 0;

      for (let i = 1; i < sorted.length; i++) {
        const prevNum = parseNum(sorted[i - 1].greenStampNumber);
        const currNum = parseNum(sorted[i].greenStampNumber);

        if (prevNum !== null && currNum !== null && currNum > prevNum + 1) {
          const count = currNum - prevNum - 1;
          gapsCount++;
          missingCount += count;
        }
      }

      gapMap.set(dateStr, { gapsCount, missingCount });
    }

    return gapMap;
  }, [records]);

  // Statistics for the currently selected date
  const activeDateStats = useMemo(() => {
    if (!selectedDate) return null;
    let total = 0;
    let verified = 0;
    let review = 0;

    for (const r of records) {
      if (parseRecordDate(r, "created") === selectedDate) {
        total++;
        if (r.status === "VERIFIED" || r.status === "CORRECTED") {
          verified++;
        } else if (r.status === "NEEDS_REVIEW") {
          review++;
        }
      }
    }
    return { total, verified, review };
  }, [records, selectedDate]);

  // Sequence audit for the currently selected date tab
  const activeDateStampAudit = useMemo(() => {
    if (!selectedDate) return null;
    return dateStampGapsMap.get(selectedDate) || { gapsCount: 0, missingCount: 0 };
  }, [selectedDate, dateStampGapsMap]);

  // Nearest available date if currently selected date has 0 records
  const nearestRecordedDate = useMemo(() => {
    if (!selectedDate || (activeDateStats && activeDateStats.total > 0)) return null;
    if (availableDatesWithCounts.length === 0) return null;

    let closest = availableDatesWithCounts[0][0];
    let minDiff = Math.abs(new Date(selectedDate).getTime() - new Date(closest).getTime());

    for (const [dateStr] of availableDatesWithCounts) {
      const diff = Math.abs(new Date(selectedDate).getTime() - new Date(dateStr).getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = dateStr;
      }
    }
    return closest;
  }, [selectedDate, activeDateStats, availableDatesWithCounts]);

  // Handlers for step controls
  const handlePrevDay = () => {
    if (!selectedDate) {
      const latest = availableDatesWithCounts[0]?.[0] || getTodayIso();
      onSelectDate(latest);
      return;
    }
    onSelectDate(stepDate(selectedDate, -1));
  };

  const handleNextDay = () => {
    if (!selectedDate) {
      const latest = availableDatesWithCounts[0]?.[0] || getTodayIso();
      onSelectDate(latest);
      return;
    }
    onSelectDate(stepDate(selectedDate, 1));
  };

  const handleToday = () => {
    onSelectDate(getTodayIso());
  };

  const handleClear = () => {
    onSelectDate("");
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-4 sm:p-5 shadow-sm dark:shadow-[0_12px_35px_-10px_rgba(0,0,0,0.6)] transition-all">
      {/* Decorative Cyber Glow Accent */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Top Header Row: Title & Upload Basis Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Day-by-Day Calendar Inspection
                </h3>
                {selectedDate ? (
                  <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 font-mono text-[10px] px-2 py-0.5 rounded-full">
                    Active Filter
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-[10px] px-2 py-0.5 rounded-full">
                    All Dates
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Audit declarations day by day based on system upload &amp; optical extraction date.
              </p>
            </div>
          </div>

          {/* Basis Indicator Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <UploadCloud className="w-3.5 h-3.5 text-cyan-500" />
              <span>System Upload Date</span>
            </div>
          </div>
        </div>

        {/* Middle Row: Stepper Controls & Calendar Picker */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Prev Day Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrevDay}
              className="h-8.5 px-2.5 rounded-xl border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all cursor-pointer gap-1 shadow-xs"
              title="Step to Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev Day</span>
            </Button>

            {/* Interactive Calendar Popover Picker */}
            <CalendarPicker
              value={selectedDate}
              onChange={onSelectDate}
              placeholder="Pick upload date..."
              minDate={minRecordDate}
              maxDate={maxRecordDate}
              className="h-8.5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900/80 shadow-xs"
            />

            {/* Next Day Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              className="h-8.5 px-2.5 rounded-xl border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all cursor-pointer gap-1 shadow-xs"
              title="Step to Next Day"
            >
              <span className="hidden sm:inline">Next Day</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>

            {/* Jump to Today Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className={cn(
                "h-8.5 px-2.5 rounded-xl text-xs transition-all cursor-pointer gap-1",
                selectedDate === getTodayIso()
                  ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/60"
              )}
              title="Jump to Today's Date"
            >
              <CalendarCheck2 className="w-3.5 h-3.5 text-cyan-500" />
              <span>Today</span>
            </Button>

            {/* All Days / Clear Button */}
            {selectedDate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="h-8.5 px-2.5 rounded-xl text-xs text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer gap-1 shadow-xs"
                title="Clear date filter and view all declarations"
              >
                <X className="w-3.5 h-3.5" />
                <span>Show All Days</span>
              </Button>
            )}
          </div>

          {/* Selected Date Metric Badges */}
          {selectedDate && activeDateStats && activeDateStats.total > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
                <span>{activeDateStats.total} Declarations Uploaded</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>{activeDateStats.verified} Verified</span>
              </div>
              {activeDateStats.review > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{activeDateStats.review} Needs Review</span>
                </div>
              )}
              {activeDateStampAudit && (
                activeDateStampAudit.gapsCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onOpenMissingAuditModal?.()}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition-all cursor-pointer shadow-2xs"
                    title={`View ${activeDateStampAudit.gapsCount} missing stamp gap(s) (${activeDateStampAudit.missingCount} missing) for ${formatLongDateDisplay(selectedDate)}`}
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{activeDateStampAudit.gapsCount} Sequence Gap{activeDateStampAudit.gapsCount > 1 ? 's' : ''} ({activeDateStampAudit.missingCount} missing)</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Sequence Intact</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Notice Banner when selected date has 0 declarations */}
        {selectedDate && activeDateStats && activeDateStats.total === 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                No declarations uploaded on <strong>{formatLongDateDisplay(selectedDate)}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {nearestRecordedDate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectDate(nearestRecordedDate)}
                  className="h-7 text-xs rounded-lg border-amber-300 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-semibold gap-1"
                >
                  <span>Jump to {formatDateDisplay(nearestRecordedDate)} ({availableDatesWithCounts.find(x => x[0] === nearestRecordedDate)?.[1].total} uploads)</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 text-xs rounded-lg text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                View All Days
              </Button>
            </div>
          </div>
        )}

        {/* Quick Date Carousel / Recorded Days Pill Strip */}
        <div className="pt-1">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-cyan-500" />
              Available Upload Days ({availableDatesWithCounts.length} {availableDatesWithCounts.length === 1 ? 'day' : 'days'} with uploads):
            </span>
            {selectedDate && (
              <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono font-medium">
                Showing: {formatLongDateDisplay(selectedDate)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {/* "All Days" Pill */}
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0 shadow-xs",
                !selectedDate
                  ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-sm shadow-cyan-500/25 scale-[1.02]"
                  : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              )}
              title="Show all recorded declarations"
            >
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>All Days</span>
              <span
                className={cn(
                  "font-mono text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  !selectedDate
                    ? "bg-white/25 text-white"
                    : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                {records.length}
              </span>
            </button>

            {/* Individual Recorded Date Pills */}
            {availableDatesWithCounts.map(([dateStr, countInfo]) => {
              const isSelected = selectedDate === dateStr;
              const stampAudit = dateStampGapsMap.get(dateStr);
              const hasGaps = stampAudit && stampAudit.gapsCount > 0;

              return (
                <button
                  key={`date-pill-${dateStr}`}
                  type="button"
                  onClick={() => onSelectDate(dateStr)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer select-none shrink-0 shadow-xs",
                    isSelected
                      ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-sm shadow-cyan-500/25 scale-[1.02]"
                      : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-500/40"
                  )}
                  title={`Inspect declarations uploaded on ${formatLongDateDisplay(dateStr)} (${countInfo.total} total${hasGaps ? `, ${stampAudit.gapsCount} sequence gaps` : ''})`}
                >
                  <span>{formatShortDateDisplay(dateStr)}</span>
                  <span
                    className={cn(
                      "font-mono text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {countInfo.total}
                  </span>
                  {hasGaps && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-tight whitespace-nowrap shrink-0",
                        isSelected
                          ? "bg-amber-300 text-amber-950 shadow-xs"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      )}
                      title={`${stampAudit.gapsCount} missing stamp gap(s) on ${formatLongDateDisplay(dateStr)}`}
                    >
                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                      <span>{stampAudit.gapsCount} gap{stampAudit.gapsCount > 1 ? 's' : ''}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
