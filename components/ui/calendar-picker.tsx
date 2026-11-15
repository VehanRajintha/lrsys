"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
} from "lucide-react";

interface CalendarPickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  label?: string; // e.g. "From:" or "To:"
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  className?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarPicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
  minDate,
  maxDate,
  className,
}: CalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial year/month from value or default to current date
  const parsedDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  }, [value]);

  const [viewDate, setViewDate] = useState<Date>(() => parsedDate || new Date());

  // Keep viewDate synchronized when value changes
  useEffect(() => {
    if (parsedDate) {
      setViewDate(parsedDate);
    }
  }, [parsedDate]);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleYearChange = (year: number) => {
    setViewDate(new Date(year, currentMonth, 1));
  };

  const handleMonthChange = (month: number) => {
    setViewDate(new Date(currentYear, month, 1));
  };

  // Generate calendar grid (days of current month with padding for prev/next month)
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      day: number;
      monthOffset: number; // -1 for prev, 0 for current, 1 for next
      dateStr: string;
      isSelected: boolean;
      isToday: boolean;
      isDisabled: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split("T")[0];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = currentMonth === 0 ? 12 : currentMonth;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        day: d,
        monthOffset: -1,
        dateStr,
        isSelected: value === dateStr,
        isToday: todayStr === dateStr,
        isDisabled: Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        day: d,
        monthOffset: 0,
        dateStr,
        isSelected: value === dateStr,
        isToday: todayStr === dateStr,
        isDisabled: Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)),
      });
    }

    // Next month padding to fill standard 42-day (6-row) or 35-day grid
    const remaining = (7 - (days.length % 7)) % 7;
    const totalSlots = days.length + remaining < 35 ? 35 : days.length + remaining;
    const nextMonthSlots = totalSlots - days.length;

    for (let d = 1; d <= nextMonthSlots; d++) {
      const m = currentMonth === 11 ? 1 : currentMonth + 2;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        day: d,
        monthOffset: 1,
        dateStr,
        isSelected: value === dateStr,
        isToday: todayStr === dateStr,
        isDisabled: Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)),
      });
    }

    return days;
  }, [currentYear, currentMonth, value, minDate, maxDate]);

  const handleSelectDay = (dateStr: string, isDisabled: boolean) => {
    if (isDisabled) return;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setViewDate(today);
    onChange(todayStr);
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  // Formatted display (e.g. "09/05/2026")
  const displayFormatted = useMemo(() => {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return value;
  }, [value]);

  // Year choices for quick selection (currentYear - 5 to currentYear + 5)
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    const base = currentYear;
    for (let y = base - 5; y <= base + 5; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer select-none",
            "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:border-blue-400 dark:hover:border-blue-500",
            isOpen && "border-blue-500 ring-2 ring-blue-500/20 dark:ring-blue-500/30",
            className
          )}
          title={`Click to pick ${label || "date"}`}
        >
          {label && (
            <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">
              {label}
            </span>
          )}

          <span
            className={cn(
              "font-mono text-xs tracking-tight",
              displayFormatted
                ? "font-semibold text-slate-800 dark:text-slate-100"
                : "text-slate-400 dark:text-slate-500 font-normal"
            )}
          >
            {displayFormatted || placeholder}
          </span>

          <CalendarIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 ml-1 shrink-0" />

          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClear();
              }}
              className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-0.5 transition-colors"
              title="Clear date"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[280px] p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-md"
      >
        {/* Month & Year Navigation Header */}
        <div className="flex items-center justify-between gap-1 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1">
            {/* Month Dropdown / Display */}
            <select
              value={currentMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="bg-transparent font-bold text-xs text-slate-900 dark:text-white rounded-md px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {name}
                </option>
              ))}
            </select>

            {/* Year Dropdown */}
            <select
              value={currentYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="bg-transparent font-bold text-xs text-slate-900 dark:text-white rounded-md px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none font-mono"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {DAYS_OF_WEEK.map((d) => (
            <span
              key={d}
              className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase py-0.5"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((item, idx) => {
            const isCurrentMonth = item.monthOffset === 0;

            return (
              <button
                key={idx}
                type="button"
                disabled={item.isDisabled}
                onClick={() => handleSelectDay(item.dateStr, item.isDisabled)}
                className={cn(
                  "h-8 w-8 text-xs rounded-xl flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none",
                  item.isDisabled && "opacity-25 cursor-not-allowed hover:bg-transparent",
                  // Selected state
                  item.isSelected
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 scale-105"
                    : isCurrentMonth
                    ? "text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-800/80 hover:text-blue-600 dark:hover:text-blue-400"
                    : "text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40",
                  // Today outline
                  item.isToday && !item.isSelected && "border border-blue-500/60 font-bold text-blue-600 dark:text-blue-400"
                )}
                title={item.dateStr}
              >
                {item.day}
              </button>
            );
          })}
        </div>

        {/* Footer Quick Actions */}
        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleClear()}
            className="text-[11px] font-semibold text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer px-1.5 py-0.5 rounded-md"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline transition-all cursor-pointer px-1.5 py-0.5 rounded-md"
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default CalendarPicker;
