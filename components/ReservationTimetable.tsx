"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { formatPriceKRW, formatDurationKR } from "@/lib/format";
import type { ShopReservation } from "@/lib/types";

interface ReservationTimetableProps {
  reservations: ShopReservation[];
}

/**
 * Shop dashboard timetable. Lists confirmed reservations grouped by date,
 * tap a row to open the detail modal with the art photo + full booking info.
 */
export function ReservationTimetable({
  reservations,
}: ReservationTimetableProps) {
  const [selected, setSelected] = useState<ShopReservation | null>(null);

  // Esc to close — only attached while the modal is open so it doesn't fight
  // with other handlers.
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
        아직 확정된 예약이 없어요.
      </div>
    );
  }

  // Single pass — preserves the server's date-then-time order.
  const groups: Array<{ date: string; items: ShopReservation[] }> = [];
  for (const r of reservations) {
    const last = groups[groups.length - 1];
    if (last && last.date === r.reservationDate) last.items.push(r);
    else groups.push({ date: r.reservationDate, items: [r] });
  }

  return (
    <>
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.date}>
            <h3 className="mb-2 text-sm font-medium">{formatDateHeader(g.date)}</h3>
            <ul className="overflow-hidden rounded-xl border border-line">
              {g.items.map((r, i) => (
                <li
                  key={r.id}
                  className={i > 0 ? "border-t border-line" : undefined}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className="flex w-full items-center gap-4 bg-white px-4 py-3 text-left transition hover:bg-neutral-50"
                  >
                    <span className="w-14 shrink-0 text-base font-semibold tabular-nums">
                      {r.reservationTime}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {r.customerName}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {r.serviceCategoryName || r.artName}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {formatDurationKR(r.durationMinutes)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
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

function ReservationDetailModal({
  reservation: r,
  onClose,
}: {
  reservation: ShopReservation;
  onClose: () => void;
}) {
  // Lock body scroll behind the modal — otherwise the page underneath scrolls
  // when the user pans the modal.
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
            <p className="text-xs text-muted">{r.serviceCategoryName}</p>
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

/** "2026-04-26" → "4월 26일 (일)". KST is fine — the date itself is KST already. */
function formatDateHeader(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  // Use UTC noon to dodge any DST/timezone offset; we only care about Y-M-D.
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
