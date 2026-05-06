"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Calendar } from "@/components/Calendar";
import { SLOT_INTERVAL_MIN } from "@/lib/duration";
import { formatDurationKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getBusyIntervals,
  type BusyInterval,
} from "@/app/(public)/shops/[handle]/reserve/[service]/[artId]/form/actions";
import { createManualReservation } from "./actions";
import type { Weekday } from "@/lib/types";

interface ShopHours {
  open: string; // "HH:mm"
  close: string;
  breakStart?: string;
  breakEnd?: string;
  closedWeekdays: Weekday[];
}

interface ManualReservationButtonProps {
  shopHandle: string;
  shopHours: ShopHours;
}

/**
 * Quick-add entry point for shop owners migrating pre-existing bookings into
 * the timetable. Renders a compact "+" trigger that opens a modal collecting
 * just date / start time / end time — the minimum the platform needs to mark
 * the slot as busy. Customer/art/option metadata is left null (is_manual=true
 * on the inserted row).
 */
export function ManualReservationButton({
  shopHandle,
  shopHours,
}: ManualReservationButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-sm font-medium text-white transition hover:opacity-90"
      >
        <Plus size={16} />
        예약 추가
      </button>
      {open && (
        <ManualReservationModal
          shopHandle={shopHandle}
          shopHours={shopHours}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ManualReservationModal({
  shopHandle,
  shopHours,
  onClose,
}: {
  shopHandle: string;
  shopHours: ShopHours;
  onClose: () => void;
}) {
  const [date, setDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busyIntervals, setBusyIntervals] = useState<BusyInterval[]>([]);
  const [loadingBusy, setLoadingBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Lock background scroll while the modal is open — same behavior as the
  // existing reservation detail modal.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Refresh busy windows whenever the date changes — the same RPC the public
  // form uses, which already filters to pending+confirmed for the (shop,
  // date) pair (no PII leaked).
  useEffect(() => {
    if (date === null) {
      setBusyIntervals([]);
      return;
    }
    let cancelled = false;
    setLoadingBusy(true);
    getBusyIntervals(shopHandle, formatLocalDate(date))
      .then((rows) => {
        if (!cancelled) setBusyIntervals(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, shopHandle]);

  const startSlots = useMemo(
    () =>
      date
        ? deriveStartSlots({
            shopHours,
            date,
            busyIntervals,
            now: new Date(),
          })
        : [],
    [date, shopHours, busyIntervals],
  );

  // Drop the chosen start time if the date or busy windows changed it out
  // from under the user (e.g., switching dates).
  useEffect(() => {
    if (startTime === null) return;
    const match = startSlots.find((s) => s.time === startTime);
    if (!match || !match.available) {
      setStartTime(null);
      setEndTime(null);
    }
  }, [startSlots, startTime]);

  const endSlots = useMemo(
    () =>
      startTime !== null
        ? deriveEndSlots({
            startTime,
            shopHours,
            busyIntervals,
          })
        : [],
    [startTime, shopHours, busyIntervals],
  );

  // Same self-correction for end time when start changes.
  useEffect(() => {
    if (endTime === null) return;
    if (!endSlots.find((s) => s.time === endTime)) setEndTime(null);
  }, [endSlots, endTime]);

  const canSubmit =
    date !== null &&
    startTime !== null &&
    endTime !== null &&
    !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);

    const reservationDate = formatLocalDate(date!);
    const durationMinutes =
      parseHHmm(endTime!) - parseHHmm(startTime!);

    startTransition(async () => {
      const result = await createManualReservation({
        reservationDate,
        reservationTime: startTime!,
        durationMinutes,
        notes: notes.trim() ? notes : null,
      });
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white"
        >
          <X size={18} />
        </button>

        <form onSubmit={handleSubmit} className="space-y-6 px-5 pb-6 pt-6">
          <header>
            <h2 className="text-lg font-semibold">예약 직접 추가</h2>
            <p className="mt-1 text-xs text-muted">
              입점 전 예약을 빠르게 입력해 시간대를 차단해요.
            </p>
          </header>

          <Field label="날짜" required>
            <div className="mt-2">
              <Calendar
                value={date}
                onChange={(d) => {
                  setDate(d);
                  setStartTime(null);
                  setEndTime(null);
                }}
                closedWeekdays={shopHours.closedWeekdays}
              />
            </div>
          </Field>

          {date && (
            <Field label="시작 시간" required>
              <div className="mt-2">
                {loadingBusy ? (
                  <p className="text-xs text-muted">예약 현황 불러오는 중…</p>
                ) : (() => {
                  const available = startSlots.filter((s) => s.available);
                  if (available.length === 0) {
                    return (
                      <p className="text-xs text-muted">
                        선택할 수 있는 시간이 없어요.
                      </p>
                    );
                  }
                  return (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {available.map((s) => (
                        <TimePill
                          key={s.time}
                          time={s.time}
                          selected={startTime === s.time}
                          onClick={() => {
                            setStartTime(s.time);
                            setEndTime(null);
                          }}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </Field>
          )}

          {startTime && (
            <Field label="종료 시간" required>
              <p className="mt-1 text-[11px] text-muted">
                고른 종료 시간이 곧 시술 시간이 돼요.
              </p>
              <div className="mt-2">
                {endSlots.length === 0 ? (
                  <p className="text-xs text-muted">
                    이 시작 시간에서 가능한 종료 시간이 없어요.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {endSlots.map((s) => (
                      <DurationEndPill
                        key={s.time}
                        time={s.time}
                        durationMinutes={s.durationMinutes}
                        selected={endTime === s.time}
                        onClick={() => setEndTime(s.time)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Field>
          )}

          <Field label="메모">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="고객 이름, 시술 내용 등 (선택)"
              className="mt-2 block w-full resize-y rounded-xl bg-neutral-100 px-3 py-2.5 text-sm outline-none transition placeholder:text-neutral-400 focus:bg-neutral-200"
            />
          </Field>

          {submitError && (
            <p className="text-center text-xs text-accent">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="block w-full rounded-xl bg-ink py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {isPending ? "추가하는 중..." : "예약 추가"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Local primitives                                                          */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-accent">*</span>}
      </label>
      {children}
    </div>
  );
}

function TimePill({
  time,
  selected,
  onClick,
}: {
  time: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 items-center justify-center rounded-xl border text-sm tabular-nums transition",
        selected
          ? "border-ink bg-ink text-white"
          : "border-line bg-white text-ink hover:bg-neutral-50",
      )}
    >
      {time}
    </button>
  );
}

function DurationEndPill({
  time,
  durationMinutes,
  selected,
  onClick,
}: {
  time: string;
  durationMinutes: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-14 flex-col items-center justify-center rounded-xl border text-sm tabular-nums transition",
        selected
          ? "border-ink bg-ink text-white"
          : "border-line bg-white text-ink hover:bg-neutral-50",
      )}
    >
      <span>{time}</span>
      <span
        className={cn(
          "text-[11px]",
          selected ? "text-white/80" : "text-muted",
        )}
      >
        {formatDurationKR(durationMinutes)}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Slot derivation                                                           */
/* -------------------------------------------------------------------------- */

interface StartSlot {
  time: string;
  available: boolean;
}

/**
 * 30-min slots from open to close. A slot is unavailable if it sits in the
 * past (today only), inside the break window, or inside any existing
 * reservation. Unlike the public form there's no duration here yet — start
 * picks just need to land on a free 30-min cell.
 */
function deriveStartSlots({
  shopHours,
  date,
  busyIntervals,
  now,
}: {
  shopHours: ShopHours;
  date: Date;
  busyIntervals: BusyInterval[];
  now: Date;
}): StartSlot[] {
  const openMin = parseHHmm(shopHours.open);
  const closeMin = parseHHmm(shopHours.close);
  const breakStart = shopHours.breakStart
    ? parseHHmm(shopHours.breakStart)
    : null;
  const breakEnd = shopHours.breakEnd ? parseHHmm(shopHours.breakEnd) : null;

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  const slots: StartSlot[] = [];
  for (let s = openMin; s + SLOT_INTERVAL_MIN <= closeMin; s += SLOT_INTERVAL_MIN) {
    const cellEnd = s + SLOT_INTERVAL_MIN;
    let available = true;

    if (isToday && s <= nowMin) available = false;
    else if (
      breakStart !== null &&
      breakEnd !== null &&
      s < breakEnd &&
      breakStart < cellEnd
    )
      available = false;
    else if (busyIntervals.some((b) => s < b.end && b.start < cellEnd))
      available = false;

    slots.push({ time: toHHmm(s), available });
  }
  return slots;
}

interface EndSlot {
  time: string;
  durationMinutes: number;
}

/**
 * End-time candidates are 30-min increments past `startTime`, capped at the
 * first conflict (break, busy interval, or shop close). The list grows
 * monotonically — once any candidate end overlaps something, all later ends
 * would too, so we stop. Each entry's labeled duration is end - start.
 */
function deriveEndSlots({
  startTime,
  shopHours,
  busyIntervals,
}: {
  startTime: string;
  shopHours: ShopHours;
  busyIntervals: BusyInterval[];
}): EndSlot[] {
  const startMin = parseHHmm(startTime);
  const closeMin = parseHHmm(shopHours.close);
  const breakStart = shopHours.breakStart
    ? parseHHmm(shopHours.breakStart)
    : null;
  const breakEnd = shopHours.breakEnd ? parseHHmm(shopHours.breakEnd) : null;

  const slots: EndSlot[] = [];
  for (let e = startMin + SLOT_INTERVAL_MIN; e <= closeMin; e += SLOT_INTERVAL_MIN) {
    if (
      breakStart !== null &&
      breakEnd !== null &&
      startMin < breakEnd &&
      breakStart < e
    )
      break;

    if (busyIntervals.some((b) => startMin < b.end && b.start < e)) break;

    slots.push({ time: toHHmm(e), durationMinutes: e - startMin });
  }
  return slots;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseHHmm(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

function toHHmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
