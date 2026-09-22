import React, { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  isAfter,
  startOfToday,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from "lucide-react";

interface BookedRange {
  startDate: string | Date;
  endDate: string | Date;
}

interface RentalCalendarProps {
  bookedRanges?: BookedRange[];
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  onMonthChange?: (month: Date) => void;
  minDays?: number;
  maxDays?: number;
}

export function RentalCalendar({
  bookedRanges = [],
  startDate,
  endDate,
  onChange,
  onMonthChange,
  minDays = 1,
  maxDays = 90,
}: RentalCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const today = startOfToday();

  const parsedBookedRanges = bookedRanges.map((r) => ({
    start: new Date(r.startDate),
    end: new Date(r.endDate),
  }));

  const isDateBooked = (date: Date) => {
    return parsedBookedRanges.some(
      (range) => !isBefore(date, range.start) && isBefore(date, range.end)
    );
  };

  const isDatePast = (date: Date) => {
    return isBefore(date, today);
  };

  const handleDateClick = (day: Date) => {
    if (isDatePast(day) || isDateBooked(day)) return;

    if (!startDate || (startDate && endDate)) {
      // Pick start date
      onChange(day, null);
    } else if (startDate && !endDate) {
      if (isBefore(day, startDate)) {
        // Reset start date if clicked before current start
        onChange(day, null);
      } else {
        // Validate no booked dates exist between startDate and day
        const daysBetween = eachDayOfInterval({ start: startDate, end: day });
        const hasOverlap = daysBetween.some((d) => isDateBooked(d));

        if (hasOverlap) {
          // Cannot cross booked range
          onChange(day, null);
        } else {
          onChange(startDate, day);
        }
      }
    }
  };

  const changeMonth = (direction: "previous" | "next") => {
    const nextMonth =
      direction === "next"
        ? addMonths(currentMonth, 1)
        : subMonths(currentMonth, 1);

    setCurrentMonth(nextMonth);
    onMonthChange?.(nextMonth);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Starting empty offset days (Sunday = 0)
  const startDayOffset = monthStart.getDay();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      {/* Calendar Header with Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-600" />
          <h4 className="font-bold text-slate-900 text-sm">
            {format(currentMonth, "MMMM yyyy")}
          </h4>
        </div>
        <div className="relative z-10 flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => changeMonth("previous")}
            className="relative z-10 p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
          >
            <ChevronLeft className="w-4 h-4 pointer-events-none" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => changeMonth("next")}
            className="relative z-10 p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
          >
            <ChevronRight className="w-4 h-4 pointer-events-none" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-2">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9" />
        ))}

        {daysInMonth.map((day) => {
          const isPast = isDatePast(day);
          const isBooked = isDateBooked(day);
          const isStart = startDate && isSameDay(day, startDate);
          const isEnd = endDate && isSameDay(day, endDate);
          const isInRange =
            startDate &&
            endDate &&
            isAfter(day, startDate) &&
            isBefore(day, endDate);

          let stateClass = "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600";

          if (isPast) {
            stateClass = "text-slate-300 cursor-not-allowed bg-transparent";
          } else if (isBooked) {
            stateClass = "text-rose-400 line-through bg-rose-50/50 cursor-not-allowed font-medium";
          } else if (isStart || isEnd) {
            stateClass = "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200";
          } else if (isInRange) {
            stateClass = "bg-indigo-50 text-indigo-700 font-medium";
          }

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isPast || isBooked}
              onClick={() => handleDateClick(day)}
              className={`h-9 w-full rounded-lg text-xs flex items-center justify-center transition-colors ${stateClass}`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-200 border border-rose-300" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          <span>Past</span>
        </div>
      </div>

      {/* Helper prompt */}
      <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
        {!startDate && <span>Select your pickup start date</span>}
        {startDate && !endDate && <span>Now select your return date</span>}
        {startDate && endDate && (
          <span className="text-emerald-600 font-medium">
            {format(startDate, "MMM d")} → {format(endDate, "MMM d")} selected
          </span>
        )}
      </div>
    </div>
  );
}
