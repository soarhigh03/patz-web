"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Weekday } from "@/lib/types";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface CalendarProps {
  value: Date | null;
  onChange: (date: Date) => void;
  /** Weekdays the shop is closed (휴무) — disabled in the picker. */
  closedWeekdays?: Weekday[];
}

/**
 * Minimal month-grid calendar for the reservation form (Image #5). Single
 * date selection only; past dates and shop-closed weekdays are disabled.
 */
export function Calendar({ value, onChange, closedWeekdays = [] }: CalendarProps) {
  const today = startOfDay(new Date());
  const [view, setView] = useState(value ?? today);
  const year = view.getFullYear();
  const month = view.getMonth();

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLast = new Date(year, month, 0).getDate();

  const leadingDays = Array.from(
    { length: firstWeekday },
    (_, i) => prevMonthLast - firstWeekday + 1 + i,
  );
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const trailingCount = 42 - leadingDays.length - monthDays.length;
  const trailingDays = Array.from({ length: trailingCount }, (_, i) => i + 1);

  // Year dropdown: today's year ± a small range so it works year-round without
  // needing constant maintenance.
  const yearOptions = Array.from(
    { length: 5 },
    (_, i) => today.getFullYear() - 1 + i,
  );

  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="rounded p-1 text-muted transition hover:bg-neutral-100"
          aria-label="이전 달"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <SelectChip
            value={month}
            onChange={(v) => setView(new Date(year, v, 1))}
            options={MONTH_NAMES.map((name, i) => ({ value: i, label: name }))}
          />
          <SelectChip
            value={year}
            onChange={(v) => setView(new Date(v, month, 1))}
            options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
          />
        </div>

        <button
          type="button"
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="rounded p-1 text-muted transition hover:bg-neutral-100"
          aria-label="다음 달"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {leadingDays.map((day, i) => (
          <DayCell key={`p-${i}`} day={day} disabled subdued />
        ))}
        {monthDays.map((day) => {
          const date = new Date(year, month, day);
          const selected = !!value && sameDate(value, date);
          const past = date < today;
          const closed = closedWeekdays.includes(date.getDay() as Weekday);
          const disabled = past || closed;
          return (
            <DayCell
              key={day}
              day={day}
              selected={selected}
              disabled={disabled}
              subdued={disabled && !selected}
              onClick={() => !disabled && onChange(date)}
            />
          );
        })}
        {trailingDays.map((day, i) => (
          <DayCell key={`n-${i}`} day={day} disabled subdued />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day,
  selected,
  disabled,
  subdued,
  onClick,
}: {
  day: number;
  selected?: boolean;
  disabled?: boolean;
  subdued?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 items-center justify-center rounded-md text-sm transition",
        selected && "bg-ink text-white",
        !selected && subdued && "text-muted/50",
        !selected && !disabled && "hover:bg-neutral-100",
      )}
    >
      {day}
    </button>
  );
}

function SelectChip<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="relative">
      <select
        value={String(value)}
        onChange={(e) => {
          const next = options.find((o) => String(o.value) === e.target.value);
          if (next) onChange(next.value);
        }}
        className="cursor-pointer appearance-none rounded-md border border-line bg-white py-1 pl-3 pr-7 text-sm focus:outline-none"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

function sameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
