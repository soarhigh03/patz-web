"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, Coffee, X } from "lucide-react";
import { formatPriceKRW, formatDurationKR } from "@/lib/format";
import { SLOT_INTERVAL_MIN } from "@/lib/duration";
import { cn } from "@/lib/utils";
import {
  acceptReservation,
  rejectReservation,
} from "@/app/dashboard/reservations/actions";
import type { ShopReservation } from "@/lib/types";

interface ShopHours {
  open: string; // "HH:mm"
  close: string;
  breakStart?: string;
  breakEnd?: string;
  /** 0=Sun..6=Sat. Used by the weekly view to grey out closed columns. */
  closedWeekdays?: number[];
}

interface ReservationTimetableProps {
  reservations: ShopReservation[];
  shopHours: ShopHours;
}

const KOREAN_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * Shop dashboard timetable.
 *
 * Renders two views — switched purely with Tailwind responsive classes so
 * SSR/hydration stays simple:
 *   - Mobile (`<lg`): day pager. Existing UX, one day at a time.
 *   - PC (`>=lg`): weekly grid. 7 day-columns × 30-min rows on one screen.
 *
 * Both share the modal + accept/reject card so logic stays in one place.
 */
export function ReservationTimetable({
  reservations,
  shopHours,
}: ReservationTimetableProps) {
  const [selected, setSelected] = useState<ShopReservation | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <>
      <div className="lg:hidden">
        <DayView
          reservations={reservations}
          shopHours={shopHours}
          onOpen={setSelected}
        />
      </div>
      <div className="hidden lg:block">
        <WeekView
          reservations={reservations}
          shopHours={shopHours}
          onOpen={setSelected}
        />
      </div>

      {selected && (
        <ReservationDetailModal
          reservation={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mobile: single-day view                                                   */
/* -------------------------------------------------------------------------- */

function DayView({
  reservations,
  shopHours,
  onOpen,
}: {
  reservations: ShopReservation[];
  shopHours: ShopHours;
  onOpen: (r: ShopReservation) => void;
}) {
  const today = todayKST();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const dayItems = reservations.filter(
    (r) => r.reservationDate === selectedDate,
  );
  const openMin = parseHHmm(shopHours.open);
  const closeMin = parseHHmm(shopHours.close);
  const canGoBack = selectedDate > today;

  return (
    <>
      <div className="mb-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() =>
            canGoBack && setSelectedDate(shiftDate(selectedDate, -1))
          }
          disabled={!canGoBack}
          aria-label="이전 날"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="min-w-[8rem] text-center text-sm font-medium tabular-nums">
          {formatDateHeader(selectedDate)}
        </h3>
        <button
          type="button"
          onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
          aria-label="다음 날"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-neutral-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <DayGrid
        items={dayItems}
        openMin={openMin}
        closeMin={closeMin}
        breakStart={
          shopHours.breakStart ? parseHHmm(shopHours.breakStart) : null
        }
        breakEnd={shopHours.breakEnd ? parseHHmm(shopHours.breakEnd) : null}
        onOpen={onOpen}
      />
    </>
  );
}

interface GridCell {
  startRow: number; // 0-based slot index from openMin
  span: number; // number of 30-min slots covered
}

function DayGrid({
  items,
  openMin,
  closeMin,
  breakStart,
  breakEnd,
  onOpen,
}: {
  items: ShopReservation[];
  openMin: number;
  closeMin: number;
  breakStart: number | null;
  breakEnd: number | null;
  onOpen: (r: ShopReservation) => void;
}) {
  const slotMinutes: number[] = [];
  for (let s = openMin; s < closeMin; s += SLOT_INTERVAL_MIN) slotMinutes.push(s);
  const totalRows = slotMinutes.length;

  function positionFor(startMin: number, durationMin: number): GridCell {
    const snapped = Math.floor(startMin / SLOT_INTERVAL_MIN) * SLOT_INTERVAL_MIN;
    const startRow = Math.max(
      0,
      Math.floor((snapped - openMin) / SLOT_INTERVAL_MIN),
    );
    const rawSpan = Math.max(1, Math.ceil(durationMin / SLOT_INTERVAL_MIN));
    const span = Math.max(1, Math.min(rawSpan, totalRows - startRow));
    return { startRow, span };
  }

  const reservationCells: Array<GridCell & { r: ShopReservation }> = items.map(
    (r) => ({ r, ...positionFor(parseHHmm(r.reservationTime), r.durationMinutes) }),
  );

  const breakCell: (GridCell & { startMin: number; endMin: number }) | null =
    breakStart !== null && breakEnd !== null && breakEnd > breakStart
      ? {
          ...positionFor(breakStart, breakEnd - breakStart),
          startMin: breakStart,
          endMin: breakEnd,
        }
      : null;

  return (
    <div
      className="grid overflow-hidden rounded-xl border border-line"
      style={{
        gridTemplateColumns: "64px 1fr",
        gridAutoRows: "minmax(56px, auto)",
      }}
    >
      {slotMinutes.map((slot, i) => (
        <Fragment key={slot}>
          <div
            className={cn(
              "px-3 pt-2 text-xs tabular-nums text-muted",
              i > 0 && "border-t border-line",
            )}
            style={{ gridColumn: 1, gridRow: i + 1 }}
          >
            {toHHmm(slot)}
          </div>
          <div
            className={cn(i > 0 && "border-t border-line")}
            style={{ gridColumn: 2, gridRow: i + 1 }}
            aria-hidden
          />
        </Fragment>
      ))}

      {breakCell && (
        <div
          className="z-0 m-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-neutral-100 text-xs text-muted"
          style={{
            gridColumn: 2,
            gridRow: `${breakCell.startRow + 1} / span ${breakCell.span}`,
          }}
        >
          <Coffee size={13} />
          <span>
            휴게 · {toHHmm(breakCell.startMin)}–{toHHmm(breakCell.endMin)}
          </span>
        </div>
      )}

      {reservationCells.map(({ r, startRow, span }) => (
        <div
          key={r.id}
          className="z-10 p-1.5"
          style={{
            gridColumn: 2,
            gridRow: `${startRow + 1} / span ${span}`,
          }}
        >
          <ReservationCard r={r} onOpen={onOpen} fill />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  PC: weekly view                                                           */
/* -------------------------------------------------------------------------- */

function WeekView({
  reservations,
  shopHours,
  onOpen,
}: {
  reservations: ShopReservation[];
  shopHours: ShopHours;
  onOpen: (r: ShopReservation) => void;
}) {
  const today = todayKST();
  const todayWeekStart = startOfWeekKST(today);
  const [weekStart, setWeekStart] = useState<string>(todayWeekStart);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(weekStart, i);
    const weekday = weekdayOf(date); // 0..6 (Sun..Sat)
    return { date, weekday };
  });

  const openMin = parseHHmm(shopHours.open);
  const closeMin = parseHHmm(shopHours.close);
  const breakStart = shopHours.breakStart ? parseHHmm(shopHours.breakStart) : null;
  const breakEnd = shopHours.breakEnd ? parseHHmm(shopHours.breakEnd) : null;
  const closedSet = new Set(shopHours.closedWeekdays ?? []);

  const slotMinutes: number[] = [];
  for (let s = openMin; s < closeMin; s += SLOT_INTERVAL_MIN) slotMinutes.push(s);
  const totalRows = slotMinutes.length;

  function positionFor(startMin: number, durationMin: number): GridCell {
    const snapped = Math.floor(startMin / SLOT_INTERVAL_MIN) * SLOT_INTERVAL_MIN;
    const startRow = Math.max(
      0,
      Math.floor((snapped - openMin) / SLOT_INTERVAL_MIN),
    );
    const rawSpan = Math.max(1, Math.ceil(durationMin / SLOT_INTERVAL_MIN));
    const span = Math.max(1, Math.min(rawSpan, totalRows - startRow));
    return { startRow, span };
  }

  // Pre-bucket reservations by date to avoid scanning the full list per column.
  const byDate = new Map<string, ShopReservation[]>();
  for (const r of reservations) {
    const arr = byDate.get(r.reservationDate);
    if (arr) arr.push(r);
    else byDate.set(r.reservationDate, [r]);
  }

  const canGoBack = weekStart > todayWeekStart;
  const breakCell =
    breakStart !== null && breakEnd !== null && breakEnd > breakStart
      ? { ...positionFor(breakStart, breakEnd - breakStart), startMin: breakStart, endMin: breakEnd }
      : null;

  // Grid rows: row 1 = day header (sticky); rows 2..N+1 = time slots.
  const HEADER_ROW = 1;
  const slotRow = (i: number) => i + 2;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => canGoBack && setWeekStart(shiftDate(weekStart, -7))}
            disabled={!canGoBack}
            aria-label="이전 주"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-sm font-medium tabular-nums">
            {formatRangeHeader(days[0].date, days[6].date)}
          </h3>
          <button
            type="button"
            onClick={() => setWeekStart(shiftDate(weekStart, 7))}
            aria-label="다음 주"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-neutral-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>

      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div
          className="grid"
          style={{
            gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))",
            gridAutoRows: "minmax(48px, auto)",
          }}
        >
          {/* Sticky day-header row */}
          <div
            className="sticky top-0 z-20 border-b border-line bg-white"
            style={{ gridColumn: 1, gridRow: HEADER_ROW }}
            aria-hidden
          />
          {days.map((d, i) => {
            const closed = closedSet.has(d.weekday);
            const isToday = d.date === today;
            return (
              <div
                key={d.date}
                className={cn(
                  "sticky top-0 z-20 border-b border-l border-line px-2 py-2 text-center",
                  closed && "bg-neutral-50 text-muted",
                  !closed && "bg-white",
                )}
                style={{ gridColumn: i + 2, gridRow: HEADER_ROW }}
              >
                <div className="text-[10px] uppercase tracking-wide text-muted">
                  {KOREAN_WEEKDAYS[d.weekday]}
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-sm font-medium tabular-nums",
                    isToday && "inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-white",
                  )}
                >
                  {Number(d.date.slice(8))}
                </div>
              </div>
            );
          })}

          {/* Slot rows: time label + 7 day cells */}
          {slotMinutes.map((slot, i) => (
            <Fragment key={slot}>
              <div
                className="border-t border-line px-3 pt-1.5 text-[11px] tabular-nums text-muted"
                style={{ gridColumn: 1, gridRow: slotRow(i) }}
              >
                {toHHmm(slot)}
              </div>
              {days.map((d, dayIdx) => (
                <div
                  key={d.date}
                  className={cn(
                    "border-l border-t border-line",
                    closedSet.has(d.weekday) && "bg-neutral-50",
                  )}
                  style={{ gridColumn: dayIdx + 2, gridRow: slotRow(i) }}
                  aria-hidden
                />
              ))}
            </Fragment>
          ))}

          {/* Break overlay — once per non-closed day */}
          {breakCell &&
            days.map((d, dayIdx) => {
              if (closedSet.has(d.weekday)) return null;
              return (
                <div
                  key={`break-${d.date}`}
                  className="z-0 m-0.5 flex items-center justify-center rounded bg-neutral-100 text-[10px] text-muted"
                  style={{
                    gridColumn: dayIdx + 2,
                    gridRow: `${slotRow(breakCell.startRow)} / span ${breakCell.span}`,
                  }}
                >
                  <Coffee size={11} />
                </div>
              );
            })}

          {/* Reservation overlays */}
          {days.flatMap((d, dayIdx) => {
            const items = byDate.get(d.date) ?? [];
            return items.map((r) => {
              const { startRow, span } = positionFor(
                parseHHmm(r.reservationTime),
                r.durationMinutes,
              );
              return (
                <div
                  key={r.id}
                  className="z-10 p-0.5"
                  style={{
                    gridColumn: dayIdx + 2,
                    gridRow: `${slotRow(startRow)} / span ${span}`,
                  }}
                >
                  <WeekReservationCard r={r} onOpen={onOpen} />
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Cards + modal (shared)                                                    */
/* -------------------------------------------------------------------------- */

function ReservationCard({
  r,
  onOpen,
  fill,
}: {
  r: ShopReservation;
  onOpen: (r: ShopReservation) => void;
  /** When true, the card stretches to fill its grid cell vertically so a
   *  multi-slot reservation visually covers all slots it spans. */
  fill?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle(action: "accept" | "reject", e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const result =
        action === "accept"
          ? await acceptReservation(r.id)
          : await rejectReservation(r.id);
      if (!result.ok) setError(result.error);
    });
  }

  const isPendingStatus = r.status === "pending";

  return (
    <div
      className={cn(
        "rounded-lg border p-2.5",
        fill && "flex h-full flex-col",
        isPendingStatus
          ? "border-amber-300 bg-amber-50"
          : "border-line bg-white",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(r)}
        className={cn("block w-full text-left", fill && "flex-1")}
      >
        <div className="flex items-center gap-2">
          {isPendingStatus && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-900">
              요청
            </span>
          )}
          <span className="truncate text-sm font-medium">{r.customerName}</span>
          <span className="ml-auto shrink-0 text-xs text-muted">
            {formatDurationKR(r.durationMinutes)}
          </span>
        </div>
        <div className="mt-0.5 truncate text-xs text-muted">
          {r.serviceCategoryName || r.artName}
        </div>
      </button>

      {isPendingStatus && (
        <div className="mt-2 flex shrink-0 gap-2">
          <button
            type="button"
            onClick={(e) => handle("accept", e)}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-ink px-2 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Check size={13} />
            수락
          </button>
          <button
            type="button"
            onClick={(e) => handle("reject", e)}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-line bg-white px-2 py-1.5 text-xs font-medium text-ink transition hover:bg-neutral-50 disabled:opacity-50"
          >
            <X size={13} />
            거절
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-[11px] text-accent">{error}</p>}
    </div>
  );
}

/**
 * Compact card used in the weekly grid where each cell is much narrower.
 * Drops the duration badge and the inline accept/reject — clicking opens the
 * detail modal where the same actions live.
 */
function WeekReservationCard({
  r,
  onOpen,
}: {
  r: ShopReservation;
  onOpen: (r: ShopReservation) => void;
}) {
  const isPendingStatus = r.status === "pending";
  return (
    <button
      type="button"
      onClick={() => onOpen(r)}
      className={cn(
        "flex h-full w-full flex-col items-stretch overflow-hidden rounded border px-1.5 py-1 text-left transition",
        isPendingStatus
          ? "border-amber-300 bg-amber-50 hover:bg-amber-100"
          : "border-line bg-white hover:bg-neutral-50",
      )}
    >
      <div className="flex items-center gap-1">
        {isPendingStatus && (
          <span className="rounded-full bg-amber-200 px-1 text-[9px] font-medium text-amber-900">
            요청
          </span>
        )}
        <span className="text-[10px] tabular-nums text-muted">
          {r.reservationTime}
        </span>
      </div>
      <span className="truncate text-xs font-medium">{r.customerName}</span>
      <span className="truncate text-[10px] text-muted">
        {r.serviceCategoryName || r.artName}
      </span>
    </button>
  );
}

function ReservationDetailModal({
  reservation: r,
  onClose,
}: {
  reservation: ShopReservation;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handle(action: "accept" | "reject") {
    setActionError(null);
    startTransition(async () => {
      const result =
        action === "accept"
          ? await acceptReservation(r.id)
          : await rejectReservation(r.id);
      if (!result.ok) {
        setActionError(result.error);
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

        {r.artImageUrl ? (
          <div className="relative aspect-square w-full bg-neutral-100">
            <Image
              src={r.artImageUrl}
              alt={r.artName}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 28rem"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-neutral-100 text-sm text-muted">
            아트 사진 없음
          </div>
        )}

        <div className="space-y-5 px-5 pb-6 pt-5">
          <header>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted">{r.serviceCategoryName}</p>
              {r.status === "pending" && (
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                  예약 요청
                </span>
              )}
            </div>
            <h2 className="mt-0.5 text-lg font-semibold">{r.artName}</h2>
          </header>

          <dl className="space-y-2 text-sm">
            <Row term="예약 일시">
              {formatDateHeader(r.reservationDate)} · {r.reservationTime} (
              {formatDurationKR(r.durationMinutes)})
            </Row>
            <Row term="예약자">
              {r.customerName}
              {r.depositorName && r.depositorName !== r.customerName && (
                <span className="ml-1 text-muted">
                  (입금자 {r.depositorName})
                </span>
              )}
            </Row>
            <Row term="연락처">
              <a
                href={`tel:${r.customerPhone}`}
                className="underline underline-offset-2"
              >
                {formatPhone(r.customerPhone)}
              </a>
            </Row>
            <Row term="쌤">{r.staffName ?? "상관없음"}</Row>
            <Row term="제거">{describeRemoval(r)}</Row>
            {r.extensionCount > 0 && (
              <Row term="연장">{r.extensionCount}개</Row>
            )}
            <Row term="총 금액">{formatPriceKRW(r.totalPrice)}</Row>
            <Row term="예약금">
              {formatPriceKRW(r.depositAmount)}
              <span
                className={
                  "ml-1 text-xs " +
                  (r.depositPaidAt ? "text-emerald-600" : "text-muted")
                }
              >
                {r.depositPaidAt ? "입금 확인됨" : "미입금"}
              </span>
            </Row>
          </dl>

          {r.notes && (
            <section>
              <p className="text-xs font-medium text-muted">추가 요청사항</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                {r.notes}
              </p>
            </section>
          )}

          {r.status === "pending" && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => handle("reject")}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-neutral-50 disabled:opacity-50"
              >
                <X size={14} />
                거절
              </button>
              <button
                type="button"
                onClick={() => handle("accept")}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-ink px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                <Check size={14} />
                수락
              </button>
            </div>
          )}
          {actionError && (
            <p className="text-center text-xs text-accent">{actionError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <dt className="w-20 shrink-0 text-muted">{term}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function describeRemoval(r: ShopReservation): string {
  const parts: string[] = [];
  if (r.gelOtherRemoval) parts.push("타샵");
  if (r.gelSelfRemoval) parts.push("자샵");
  if (parts.length === 0) return "제거 없음";
  return parts.join(" + ");
}

/** "2026-04-26" → "4월 26일 (일)". The date is already KST. */
function formatDateHeader(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][dt.getUTCDay()];
  return `${m}월 ${d}일 (${weekday})`;
}

/** "2026-04-26" + "2026-05-02" → "4월 26일 — 5월 2일". */
function formatRangeHeader(startYmd: string, endYmd: string): string {
  const [, sm, sd] = startYmd.split("-").map(Number);
  const [, em, ed] = endYmd.split("-").map(Number);
  if (sm === em) return `${sm}월 ${sd}일 – ${ed}일`;
  return `${sm}월 ${sd}일 – ${em}월 ${ed}일`;
}

/** Today as YYYY-MM-DD in Asia/Seoul. */
function todayKST(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function shiftDate(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** 0 = Sunday … 6 = Saturday for the given KST YYYY-MM-DD. */
function weekdayOf(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

/** Sunday-aligned week start for the given KST YYYY-MM-DD. */
function startOfWeekKST(ymd: string): string {
  return shiftDate(ymd, -weekdayOf(ymd));
}

function formatPhone(digits: string): string {
  if (!digits || digits.length < 10) return digits;
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
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
