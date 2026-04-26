"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Calendar } from "./Calendar";
import { CopyButton } from "./CopyButton";
import { StickyCTA } from "./StickyCTA";
import { formatPriceKRW, formatDurationKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { computeReservationDuration, SLOT_INTERVAL_MIN } from "@/lib/duration";
import {
  getBusyIntervals,
  submitReservation,
  type BusyInterval,
} from "@/app/shops/[handle]/reserve/[service]/[artId]/form/actions";
import type { Art, Shop, StaffSeed } from "@/lib/types";

interface ReservationFormProps {
  shop: Shop;
  art: Art;
  staff: StaffSeed[];
}

const ANY_STAFF = "any" as const;
type StaffSelection = string | typeof ANY_STAFF;

/**
 * Image #5 — reservation form. Time slots are 30-min increments derived from
 * shop hours minus pending+confirmed busy windows for the selected date.
 * Slot duration is computed live from service category + 제거 + 연장.
 */
export function ReservationForm({ shop, art, staff }: ReservationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [phone3, setPhone3] = useState("");
  const [staffId, setStaffId] = useState<StaffSelection | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [gelOtherRemoval, setGelOtherRemoval] = useState(false);
  const [gelSelfRemoval, setGelSelfRemoval] = useState(false);
  const [gelNoRemoval, setGelNoRemoval] = useState(false);
  const [extensionCount, setExtensionCount] = useState(0);
  const [notes, setNotes] = useState("");

  // Two-screen flow: step 1 = customer info + options (which determine
  // duration), step 2 = date+time + payment review. Splitting keeps slot
  // availability accurate — duration is fully known by the time slots render.
  const [step, setStep] = useState<1 | 2>(1);

  // Busy windows for the currently selected date — pending + confirmed.
  const [busyIntervals, setBusyIntervals] = useState<BusyInterval[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  // Computed appointment duration drives both the slot grid (rejecting slots
  // that overflow shop hours / break / busy windows) AND the snapshot stored
  // on the reservation. Keep both in sync via this single helper.
  const durationMinutes = computeReservationDuration({
    serviceCode: art.service,
    hasRemoval: gelOtherRemoval || gelSelfRemoval,
    hasExtension: extensionCount > 0,
  });

  // Re-fetch busy windows whenever the customer picks a new date. The fetch
  // is gated on `date` being non-null — slots aren't shown until a date is
  // selected.
  useEffect(() => {
    if (date === null) {
      setBusyIntervals([]);
      return;
    }
    const dateStr = formatLocalDate(date);
    let cancelled = false;
    setLoadingTimes(true);
    getBusyIntervals(shop.handle, dateStr)
      .then((rows) => {
        if (!cancelled) setBusyIntervals(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingTimes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, shop.handle]);

  // Derive the 30-min slot grid for the selected date. Updates whenever the
  // chosen options shift duration, so a slot that fit at 60min may be 불가 at
  // 90min.
  const slots = useMemo(
    () =>
      date
        ? deriveSlots({
            shopHours: shop.hours,
            date,
            durationMinutes,
            busyIntervals,
            now: new Date(),
          })
        : [],
    [date, shop.hours, durationMinutes, busyIntervals],
  );

  // If the previously-selected time is no longer available (options changed
  // and pushed it into 불가), clear it so the form doesn't submit a bad slot.
  useEffect(() => {
    if (time === null) return;
    const match = slots.find((s) => s.time === time);
    if (!match || !match.available) setTime(null);
  }, [slots, time]);

  // "제거 없음" is mutually exclusive with the other two; 타샵 + 자샵 can both
  // be checked when the customer has gel from a mix of shops.
  function toggleNoRemoval(next: boolean) {
    setGelNoRemoval(next);
    if (next) {
      setGelOtherRemoval(false);
      setGelSelfRemoval(false);
    }
  }
  function toggleOtherRemoval(next: boolean) {
    setGelOtherRemoval(next);
    if (next) setGelNoRemoval(false);
  }
  function toggleSelfRemoval(next: boolean) {
    setGelSelfRemoval(next);
    if (next) setGelNoRemoval(false);
  }

  const depositLabel = shop.depositAmount
    ? `예약금 ${formatPriceKRW(shop.depositAmount)}을 아래 계좌로 입금해주세요.`
    : "아래 계좌로 예약금을 입금해주세요.";

  // Validation per step. Step 1 needs everything required to compute
  // duration + identify the customer; step 2 just needs date + time.
  const step1Missing: string[] = [];
  if (!name.trim()) step1Missing.push("이름");
  if (phone1.length < 3 || phone2.length < 3 || phone3.length < 4)
    step1Missing.push("전화번호");
  if (staffId === null) step1Missing.push("쌤");
  if (!gelOtherRemoval && !gelSelfRemoval && !gelNoRemoval)
    step1Missing.push("제거 여부");

  const step2Missing: string[] = [];
  if (date === null) step2Missing.push("예약 날짜");
  if (time === null) step2Missing.push("예약 시간");

  const step1Valid = step1Missing.length === 0;
  const step2Valid = step2Missing.length === 0;
  const missing = step === 1 ? step1Missing : step2Missing;
  const canAdvance = step === 1 ? step1Valid : step1Valid && step2Valid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Step 1 → step 2: validate page-1 fields, then advance.
    if (step === 1) {
      if (!step1Valid) return;
      setStep(2);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      return;
    }

    // Step 2: actual submit.
    if (!step1Valid || !step2Valid || isPending || date === null || time === null)
      return;
    setSubmitError(null);

    const reservationDate = formatLocalDate(date);
    const phone = phone1 + phone2 + phone3;

    startTransition(async () => {
      const result = await submitReservation({
        shopHandle: shop.handle,
        serviceCode: art.service,
        artCode: art.id,
        customerName: name,
        customerPhone: phone,
        staffId: staffId === ANY_STAFF || staffId === null ? null : staffId,
        reservationDate,
        reservationTime: time,
        gelSelfRemoval,
        gelOtherRemoval,
        extensionCount,
        notes: notes.trim() ? notes : null,
      });

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      router.push(
        `/shops/${shop.handle}/reserve/${art.service}/${art.id}/confirm`,
      );
    });
  }

  // Slots that pass the duration / break / past / busy checks. Unavailable
  // ones are filtered out (rather than disabled) per product preference.
  const availableSlots = slots.filter((s) => s.available);

  return (
    <form onSubmit={handleSubmit} noValidate className="pb-2">
      <div className="px-6 pt-12">
        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="-ml-1 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
          >
            <ChevronLeft size={16} />
            이전
          </button>
        )}
        <h1 className="mt-2 text-center text-base font-semibold">
          {step === 1 ? "예약 양식" : "예약 일정 확인"}
        </h1>
        <p className="mt-1 text-center text-xs text-muted">
          {step}/2 단계
        </p>

        {step === 1 && (
          <div className="mt-8 space-y-7">
            <Field label="이름" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
                autoComplete="name"
                required
              />
            </Field>

            <Field label="전화번호" required>
              <div className="mt-2 flex items-center gap-2">
                <PhoneSegment value={phone1} onChange={setPhone1} max={3} />
                <Sep />
                <PhoneSegment value={phone2} onChange={setPhone2} max={4} />
                <Sep />
                <PhoneSegment value={phone3} onChange={setPhone3} max={4} />
              </div>
            </Field>

            <Field label="쌤 지정하기" required>
              <div className="mt-2 flex flex-wrap gap-2">
                {staff.map((s) => (
                  <Chip
                    key={s.id}
                    selected={staffId === s.id}
                    onClick={() => setStaffId(s.id)}
                  >
                    {s.name}
                  </Chip>
                ))}
                <Chip
                  selected={staffId === ANY_STAFF}
                  onClick={() => setStaffId(ANY_STAFF)}
                >
                  상관없음
                </Chip>
              </div>
            </Field>

            <Field label="제거 여부" required>
              <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={gelOtherRemoval}
                    onChange={(e) => toggleOtherRemoval(e.target.checked)}
                    className="h-5 w-5 rounded border-line accent-ink"
                  />
                  <span className="text-sm font-medium">타샵 제거</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={gelSelfRemoval}
                    onChange={(e) => toggleSelfRemoval(e.target.checked)}
                    className="h-5 w-5 rounded border-line accent-ink"
                  />
                  <span className="text-sm font-medium">자샵 제거</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={gelNoRemoval}
                    onChange={(e) => toggleNoRemoval(e.target.checked)}
                    className="h-5 w-5 rounded border-line accent-ink"
                  />
                  <span className="text-sm font-medium">제거 없음</span>
                </label>
              </div>
            </Field>

            <Field label="연장 (개수)">
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10}
                  value={extensionCount === 0 ? "" : extensionCount}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") return setExtensionCount(0);
                    const v = Number(raw);
                    if (Number.isNaN(v)) return;
                    setExtensionCount(Math.min(10, Math.max(0, Math.floor(v))));
                  }}
                  placeholder="0"
                  className="h-12 w-20 rounded-xl bg-neutral-100 px-3 text-center text-base outline-none transition focus:bg-neutral-200"
                />
                <span className="text-sm text-muted">개 (최대 10개)</span>
              </div>
            </Field>

            <Field label="추가 요청사항">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="mt-2 block w-full resize-y rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="mt-8 space-y-7">
            <p className="rounded-xl bg-neutral-50 px-4 py-3 text-xs text-muted">
              예상 시술 시간 · {formatDurationKR(durationMinutes)}
            </p>

            <Field label="예약 날짜" required>
              <div className="mt-2">
                <Calendar
                  value={date}
                  onChange={(d) => {
                    setDate(d);
                    setTime(null); // re-pick a time when the date changes
                  }}
                  closedWeekdays={shop.hours.closedWeekdays}
                />
                <p className="mt-2 text-xs text-muted">
                  *본 예약 현황은 PATZ에서 제공하는 실시간 예약 정보입니다.
                </p>
              </div>

              {date && (
                <div className="mt-4">
                  {loadingTimes ? (
                    <p className="text-xs text-muted">
                      실시간 예약 현황 불러오는 중…
                    </p>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-xs text-muted">
                      이 날짜에는 예약 가능한 시간이 없어요.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {availableSlots.map((s) => (
                        <TimePill
                          key={s.time}
                          time={s.time}
                          selected={time === s.time}
                          onClick={() => setTime(s.time)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>

            <Field label="총 금액" required>
              <p className="mt-2 text-base">{formatPriceKRW(art.price)}</p>
            </Field>

            <Field label={depositLabel}>
              {shop.account ? (
                <>
                  <div className="mt-2 flex items-center gap-3 text-base">
                    <span>
                      {shop.account.bank} {shop.account.number}
                    </span>
                    <CopyButton value={shop.account.number} label="계좌번호" />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    *예약금 입금이 확인되기 전까지 예약은 확정되지 않습니다.
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    *노쇼 시 예약금은 환불되지 않습니다.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  계좌 정보가 등록되지 않았어요.
                </p>
              )}
            </Field>
          </div>
        )}
      </div>

      {missing.length > 0 && (
        <p className="px-6 pt-2 text-center text-xs text-muted">
          입력 필요: {missing.join(", ")}
        </p>
      )}
      {submitError && (
        <p className="px-6 pt-2 text-center text-xs text-accent">
          {submitError}
        </p>
      )}

      <StickyCTA sticky={false} disabled={!canAdvance || isPending}>
        {step === 1 ? "다음" : isPending ? "예약 요청 중..." : "예약하기"}
      </StickyCTA>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Local components                                                          */
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

function PhoneSegment({
  value,
  onChange,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  max: number;
}) {
  return (
    <input
      type="tel"
      inputMode="numeric"
      value={value}
      onChange={(e) =>
        onChange(e.target.value.replace(/\D/g, "").slice(0, max))
      }
      maxLength={max}
      className="h-10 w-full min-w-0 rounded-xl bg-neutral-100 px-2 text-center text-base outline-none transition focus:bg-neutral-200"
    />
  );
}

function Sep() {
  return <span className="text-muted">-</span>;
}

function Chip({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm transition",
        selected
          ? "border-ink bg-ink text-white"
          : "border-line bg-white text-ink hover:bg-neutral-50",
      )}
    >
      {children}
    </button>
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

/** Calendar-selected `Date` → "YYYY-MM-DD" using the local clock (KST in
 *  practice). `toISOString()` would shift to UTC and bump to the previous day
 *  for late-evening picks. */
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DerivedSlot {
  time: string; // "HH:mm"
  available: boolean;
}

/**
 * Build the 30-min slot grid for a given date. A slot is rejected when its
 * window [start, start+duration) overflows shop hours, falls in the past
 * (today only), overlaps the break window, or collides with any pending /
 * confirmed reservation.
 *
 * The overlap rule blocks downstream slots automatically: a candidate at
 * 12:00 with duration 90 ends at 13:30 and conflicts with an existing
 * 13:00 booking — so 12:00 is rejected even though that minute itself is
 * "free."
 */
function deriveSlots({
  shopHours,
  date,
  durationMinutes,
  busyIntervals,
  now,
}: {
  shopHours: Shop["hours"];
  date: Date;
  durationMinutes: number;
  busyIntervals: BusyInterval[];
  now: Date;
}): DerivedSlot[] {
  const openMin = parseHHmm(shopHours.open);
  const closeMin = parseHHmm(shopHours.close);
  const breakStart = shopHours.breakStart ? parseHHmm(shopHours.breakStart) : null;
  const breakEnd = shopHours.breakEnd ? parseHHmm(shopHours.breakEnd) : null;

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  const slots: DerivedSlot[] = [];
  for (let s = openMin; s + SLOT_INTERVAL_MIN <= closeMin; s += SLOT_INTERVAL_MIN) {
    const e = s + durationMinutes;
    let available = true;

    if (isToday && s <= nowMin) available = false;
    else if (e > closeMin) available = false;
    else if (
      breakStart !== null &&
      breakEnd !== null &&
      s < breakEnd &&
      breakStart < e
    )
      available = false;
    else if (busyIntervals.some((b) => s < b.end && b.start < e))
      available = false;

    slots.push({ time: toHHmm(s), available });
  }
  return slots;
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

