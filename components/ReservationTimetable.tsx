"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Check, Coffee, X } from "lucide-react";
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
}

interface ReservationTimetableProps {
  reservations: ShopReservation[];
  shopHours: ShopHours;
}

/**
 * Shop dashboard timetable.
 *
 * Per day, draws a 30-min slot grid spanning the shop's open hours.
 * Reservations are rendered as overlay cards positioned with CSS-grid
 * row-spans so a 90-min booking visually covers all three of its slots
 * (12:00 / 12:30 / 13:00) as one continuous block. The break window is
 * drawn the same way.
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

  if (reservations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
        아직 들어온 예약이 없어요.
      </div>
    );
  }

  // Group by date — server returns date-then-time order, so we can scan once.
  const groups: Array<{ date: string; items: ShopReservation[] }> = [];
  for (const r of reservations) {
    const last = groups[groups.length - 1];
    if (last && last.date === r.reservationDate) last.items.push(r);
    else groups.push({ date: r.reservationDate, items: [r] });
  }

  const openMin = parseHHmm(shopHours.open);
  const closeMin = parseHHmm(shopHours.close);

  return (
    <>
      <div className="space-y-8">
        {groups.map((g) => (
          <DayGrid
            key={g.date}
            date={g.date}
            items={g.items}
            openMin={openMin}
            closeMin={closeMin}
            breakStart={
              shopHours.breakStart ? parseHHmm(shopHours.breakStart) : null
            }
            breakEnd={
              shopHours.breakEnd ? parseHHmm(shopHours.breakEnd) : null
            }
            onOpen={setSelected}
          />
        ))}
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

interface GridCell {
  startRow: number; // 0-based slot index from openMin
  span: number;     // number of 30-min slots covered
}

function DayGrid({
  date,
  items,
  openMin,
  closeMin,
  breakStart,
  breakEnd,
  onOpen,
}: {
  date: string;
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

  return (
    <section>
      <h3 className="mb-3 text-sm font-medium">{formatDateHeader(date)}</h3>
      <div
        className="grid overflow-hidden rounded-xl border border-line"
        style={{
          gridTemplateColumns: "64px 1fr",
          // Each 30-min slot is at least 56px tall; rows expand to fit a
          // card that needs more height (e.g. a pending 30-min booking).
          gridAutoRows: "minmax(56px, auto)",
        }}
      >
        {/* Background layer: time labels in column 1, empty cells +
            row dividers in column 2. Reservations and break overlay this. */}
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

        {/* Break window — drawn under reservations so a same-time booking
            (shouldn't happen, but if it does) visually wins. */}
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

        {/* Reservation cards as overlays — span the full duration. */}
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
    </section>
  );
}

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
    e.stopPropagation(); // don't open the modal when clicking 수락/거절
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

function ReservationDetailModal({
  reservation: r,
  onClose,
}: {
  reservation: ShopReservation;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
