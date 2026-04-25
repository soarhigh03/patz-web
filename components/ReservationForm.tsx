"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar } from "./Calendar";
import { CopyButton } from "./CopyButton";
import { StickyCTA } from "./StickyCTA";
import { formatPriceKRW } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Art, Shop, StaffSeed } from "@/lib/types";

interface ReservationFormProps {
  shop: Shop;
  art: Art;
  staff: StaffSeed[];
  availableTimes: string[];
}

const ANY_STAFF = "any" as const;
type StaffSelection = string | typeof ANY_STAFF;

/**
 * Image #5 — reservation form. Submit currently navigates to a confirmation
 * page; Step 7 will swap that for a real DB insert + Kakao Channel handoff.
 */
export function ReservationForm({ shop, art, staff, availableTimes }: ReservationFormProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [phone3, setPhone3] = useState("");
  const [staffId, setStaffId] = useState<StaffSelection | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const depositLabel = shop.depositAmount
    ? `예약금 ${formatPriceKRW(shop.depositAmount)} 입금`
    : "예약금 입금";

  // Revoke any object URL we created when it changes or the component unmounts
  // — otherwise the browser holds the file in memory until tab close.
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const isValid =
    name.trim() !== "" &&
    phone1.length >= 2 &&
    phone2.length >= 3 &&
    phone3.length >= 4 &&
    staffId !== null &&
    date !== null &&
    time !== null;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    // Step 7 will replace this with a real submit. For now, navigate to the
    // confirmation screen — keeps the user-visible flow complete.
    router.push(
      `/shops/${shop.handle}/reserve/${art.service}/${art.id}/confirm`,
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="pb-2">
      <div className="px-6 pt-12">
        <h1 className="text-center text-base font-semibold">예약 양식</h1>

        <div className="mt-10 space-y-7">
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
              <div className="mt-4 flex flex-wrap gap-2">
                {availableTimes.map((t) => (
                  <Chip
                    key={t}
                    selected={time === t}
                    onClick={() => setTime(t)}
                  >
                    {t}
                  </Chip>
                ))}
              </div>
            )}
          </Field>

          <Field label="총 금액" required>
            <p className="mt-2 text-base">{formatPriceKRW(art.price)}</p>
          </Field>

          <Field label={depositLabel} required>
            {shop.account ? (
              <>
                <div className="mt-2 flex items-center gap-3 text-base">
                  <span>
                    {shop.account.bank} {shop.account.number}
                  </span>
                  <CopyButton value={shop.account.number} label="계좌번호" />
                </div>
                <p className="mt-2 text-xs text-muted">
                  *노쇼 시 예약금은 환불되지 않습니다.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">
                계좌 정보가 등록되지 않았어요.
              </p>
            )}
          </Field>

          <Field label="추가 요청사항">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-2 block w-full resize-y rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
            />
          </Field>

          <PhotoUpload photoUrl={photoUrl} onChange={handleFile} />
        </div>
      </div>

      <StickyCTA sticky={false} disabled={!isValid}>
        예약하기
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

function PhotoUpload({
  photoUrl,
  onChange,
}: {
  photoUrl: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="block h-44 w-full overflow-hidden rounded-2xl bg-neutral-200 transition hover:bg-neutral-300"
    >
      {photoUrl ? (
        // Use a plain <img> for the user-uploaded preview — next/image can't
        // optimize blob: URLs and would error.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt="첨부 이미지 미리보기"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm text-muted">
          참고 이미지 첨부 (선택)
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />
    </button>
  );
}
