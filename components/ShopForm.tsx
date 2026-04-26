"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StickyCTA } from "./StickyCTA";
import { cn } from "@/lib/utils";
import { saveShop, type SaveShopInput } from "@/app/dashboard/shop/actions";

export interface ShopFormInitial extends SaveShopInput {}

interface ShopFormProps {
  /** Pre-filled values; for create mode pass empty defaults. */
  initial: ShopFormInitial;
  mode: "create" | "edit";
}

const KOREAN_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * Single form for both create and edit. Sections are visual only — they all
 * submit together via the saveShop action.
 */
export function ShopForm({ initial, mode }: ShopFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [handle, setHandle] = useState(initial.handle);
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [latitude, setLatitude] = useState(
    initial.latitude !== null ? String(initial.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    initial.longitude !== null ? String(initial.longitude) : "",
  );
  const [mapBadge, setMapBadge] = useState(initial.mapBadge ?? "");
  const [hoursOpen, setHoursOpen] = useState(initial.hoursOpen ?? "");
  const [hoursClose, setHoursClose] = useState(initial.hoursClose ?? "");
  const [hoursBreakStart, setHoursBreakStart] = useState(
    initial.hoursBreakStart ?? "",
  );
  const [hoursBreakEnd, setHoursBreakEnd] = useState(
    initial.hoursBreakEnd ?? "",
  );
  const [closedWeekdays, setClosedWeekdays] = useState<number[]>(
    initial.closedWeekdays,
  );
  const [hoursNote, setHoursNote] = useState(initial.hoursNote ?? "");
  const [cautionNote, setCautionNote] = useState(initial.cautionNote ?? "");
  const [parkingInfo, setParkingInfo] = useState(initial.parkingInfo ?? "");
  const [accountBank, setAccountBank] = useState(initial.accountBank ?? "");
  const [accountNumber, setAccountNumber] = useState(
    initial.accountNumber ?? "",
  );
  const [depositAmount, setDepositAmount] = useState(
    initial.depositAmount !== null ? String(initial.depositAmount) : "",
  );

  function toggleWeekday(idx: number) {
    setClosedWeekdays((prev) =>
      prev.includes(idx)
        ? prev.filter((n) => n !== idx)
        : [...prev, idx].sort(),
    );
  }

  // Required: handle + name. Everything else is optional.
  const handleValid = /^[a-z0-9][a-z0-9-]{1,30}$/.test(handle);
  const isValid = handleValid && name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || isPending) return;
    setError(null);

    const lat = latitude.trim() === "" ? null : Number(latitude);
    const lng = longitude.trim() === "" ? null : Number(longitude);
    if (latitude.trim() && (Number.isNaN(lat!) || lat! < -90 || lat! > 90)) {
      setError("위도는 -90 ~ 90 사이의 숫자여야 해요.");
      return;
    }
    if (
      longitude.trim() &&
      (Number.isNaN(lng!) || lng! < -180 || lng! > 180)
    ) {
      setError("경도는 -180 ~ 180 사이의 숫자여야 해요.");
      return;
    }

    const deposit =
      depositAmount.trim() === ""
        ? null
        : Math.max(0, Math.floor(Number(depositAmount)));
    if (depositAmount.trim() && Number.isNaN(deposit)) {
      setError("예약금은 숫자여야 해요.");
      return;
    }

    startTransition(async () => {
      const result = await saveShop({
        handle: handle.trim(),
        name: name.trim(),
        phone: phone || null,
        address: address || null,
        latitude: lat,
        longitude: lng,
        hoursOpen: hoursOpen || null,
        hoursClose: hoursClose || null,
        hoursBreakStart: hoursBreakStart || null,
        hoursBreakEnd: hoursBreakEnd || null,
        closedWeekdays,
        hoursNote: hoursNote || null,
        cautionNote: cautionNote || null,
        parkingInfo: parkingInfo || null,
        mapBadge: mapBadge || null,
        accountBank: accountBank || null,
        accountNumber: accountNumber || null,
        depositAmount: deposit,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="pb-2">
      <div className="space-y-10 pt-8">
        <Section title="기본 정보">
          <Field label="샵 URL" required>
            <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 transition focus-within:bg-neutral-200">
              <span className="text-sm text-muted">/shops/</span>
              <input
                type="text"
                value={handle}
                onChange={(e) =>
                  setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                maxLength={31}
                placeholder="orrnnail"
                autoCapitalize="none"
                autoComplete="off"
                className="block w-full bg-transparent py-3 text-base outline-none"
                required
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              영문 소문자 / 숫자 / 하이픈, 2~31자.
              {mode === "edit" && " URL을 바꾸면 기존 공유 링크는 더 이상 작동하지 않아요."}
            </p>
          </Field>

          <Field label="샵 이름" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="오른네일"
              className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
              required
            />
          </Field>
        </Section>

        <Section title="연락처 / 위치">
          <Field label="전화번호">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0507-1330-8551"
              className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
            />
          </Field>

          <Field label="주소">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="서울 마포구 동교로38길 42-5 3층"
              className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="위도">
              <input
                type="text"
                inputMode="decimal"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="37.5563"
                className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
              />
            </Field>
            <Field label="경도">
              <input
                type="text"
                inputMode="decimal"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="126.9236"
                className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
              />
            </Field>
          </div>
          <p className="-mt-3 text-xs text-muted">
            카카오맵에서 매장을 검색해서 좌표를 복사해 붙여넣으세요.
          </p>

          <Field label="지도 배지">
            <input
              type="text"
              value={mapBadge}
              onChange={(e) => setMapBadge(e.target.value)}
              maxLength={40}
              placeholder="홍대입구역에서 3분 거리에요!"
              className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
            />
            <p className="mt-1 text-xs text-muted">지도 위에 작은 라벨로 표시됩니다.</p>
          </Field>
        </Section>

        <Section title="영업 시간">
          <div className="grid grid-cols-2 gap-3">
            <Field label="오픈">
              <input
                type="time"
                value={hoursOpen}
                onChange={(e) => setHoursOpen(e.target.value)}
                className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
              />
            </Field>
            <Field label="마감">
              <input
                type="time"
                value={hoursClose}
                onChange={(e) => setHoursClose(e.target.value)}
                className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="휴게 시작">
              <input
                type="time"
                value={hoursBreakStart}
                onChange={(e) => setHoursBreakStart(e.target.value)}
                className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
              />
            </Field>
            <Field label="휴게 종료">
              <input
                type="time"
                value={hoursBreakEnd}
                onChange={(e) => setHoursBreakEnd(e.target.value)}
                className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
              />
            </Field>
          </div>

          <Field label="휴무 요일">
            <div className="mt-2 flex gap-2">
              {KOREAN_WEEKDAYS.map((label, i) => (
                <Chip
                  key={i}
                  selected={closedWeekdays.includes(i)}
                  onClick={() => toggleWeekday(i)}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="안내">
          <Field label="영업 안내">
            <textarea
              value={hoursNote}
              onChange={(e) => setHoursNote(e.target.value)}
              rows={2}
              placeholder="*매주 일요일 휴무, 휴게시간 14:00-15:00"
              className="mt-2 block w-full resize-y rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
            />
          </Field>

          <Field label="안내사항">
            <textarea
              value={cautionNote}
              onChange={(e) => setCautionNote(e.target.value)}
              rows={4}
              placeholder="타샵 디자인의 경우 미리 보내주셔야 가능합니다…"
              className="mt-2 block w-full resize-y rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
            />
          </Field>

          <Field label="주차 안내">
            <textarea
              value={parkingInfo}
              onChange={(e) => setParkingInfo(e.target.value)}
              rows={2}
              placeholder="건물 뒤편 공영주차장 이용"
              className="mt-2 block w-full resize-y rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
            />
          </Field>
        </Section>

        <Section title="결제">
          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <Field label="은행">
              <input
                type="text"
                value={accountBank}
                onChange={(e) => setAccountBank(e.target.value)}
                placeholder="국민은행"
                className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
              />
            </Field>
            <Field label="계좌번호">
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="000-0000000-00-00000"
                className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
              />
            </Field>
          </div>

          <Field label="예약금 (원)">
            <input
              type="text"
              inputMode="numeric"
              value={depositAmount}
              onChange={(e) =>
                setDepositAmount(e.target.value.replace(/[^\d]/g, ""))
              }
              placeholder="20000"
              className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
            />
            <p className="mt-1 text-xs text-muted">
              비워두면 예약금 없이 운영됩니다.
            </p>
          </Field>
        </Section>
      </div>

      {error && (
        <p className="px-6 pt-4 text-center text-xs text-accent">{error}</p>
      )}

      <StickyCTA sticky={false} disabled={!isValid || isPending}>
        {isPending
          ? "저장 중…"
          : mode === "create"
            ? "샵 만들기"
            : "변경사항 저장"}
      </StickyCTA>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-medium text-muted">{title}</h2>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

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
        "h-10 w-10 rounded-full border text-sm transition",
        selected
          ? "border-ink bg-ink text-white"
          : "border-line bg-white text-ink hover:bg-neutral-50",
      )}
    >
      {children}
    </button>
  );
}
