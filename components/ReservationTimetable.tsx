"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Check, X } from "lucide-react";
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
 * Per day, draws a 30-min slot grid spanning the shop's open hours. Each
 * reservation occupies its starting slot (full card with detail + 수락/거절
 * for pending) and renders a faded "예약중" placeholder in the slots it
 * spans, so gaps are visually obvious.
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

function DayGrid({
  date,
  items,
  openMin,
  closeMin,
  onOpen,
}: {
  date: string;
  items: ShopReservation[];
  openMin: number;
  closeMin: number;
  onOpen: (r: ShopReservation) => void;
}) {
  // Index reservations by their starting slot, snapped to a 30-min boundary.
  const startingHere = new Map<number, ShopReservation[]>();
  const occupies = items.map((r) => {
    const s = parseHHmm(r.reservationTime);
    const snapped = Math.floor(s / SLOT_INTERVAL_MIN) * SLOT_INTERVAL_MIN;
    const list = startingHere.get(snapped) ?? [];
    list.push(r);
    startingHere.set(snapped, list);
    return { start: s, end: s + r.durationMinutes };
  });

  const slotMinutes: number[] = [];
  for (let s = openMin; s < closeMin; s += SLOT_INTERVAL_MIN) slotMinutes.push(s);

  return (
    <section>
      <h3 className="mb-3 text-sm font-medium">{formatDateHeader(date)}</h3>
      <ul className="overflow-hidden rounded-xl border border-line">
        {slotMinutes.map((slotStart, i) => {
          const slotEnd = slotStart + SLOT_INTERVAL_MIN;
          const starting = startingHere.get(slotStart) ?? [];
          const isCovered = occupies.some(
            (o) => o.start < slotEnd && slotStart < o.end,
          );
          const isPlaceholder = starting.length === 0 && isCovered;

          return (
            <li
              key={slotStart}
              className={cn(
                "flex items-stretch gap-3 px-3 py-2",
                i > 0 && "border-t border-line",
              )}
            >
              <span className="w-12 shrink-0 pt-1 text-xs font-medium tabular-nums text-muted">
                {toHHmm(slotStart)}
              </span>
              <div className="flex-1 space-y-1.5">
                {starting.map((r) => (
                  <ReservationCard key={r.id} r={r} onOpen={onOpen} />
                ))}
                {isPlaceholder && (
                  <div className="rounded-lg bg-neutral-50 px-3 py-1.5 text-xs text-muted">
                    예약 진행 중
                  </div>
                )}
                {!isCovered && starting.length === 0 && (
                  <div className="h-7" aria-hidden />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ReservationCard({
  r,
  onOpen,
}: {
  r: ShopReservation;
  onOpen: (r: ShopReservation) => void;
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
        isPendingStatus
          ? "border-amber-300 bg-amber-50"
          : "border-line bg-white",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(r)}
        className="block w-full text-left"
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
        <div className="mt-2 flex gap-2">
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
