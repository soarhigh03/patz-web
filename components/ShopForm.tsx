"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "./ImageUpload";
import { cn } from "@/lib/utils";
import {
  saveShop,
  type HoursMode,
  type HoursPerWeekday,
  type SaveShopInput,
  type ShopType,
  updateShopImage,
} from "@/app/dashboard/shop/actions";

export interface ShopFormInitial extends SaveShopInput {}

interface ShopFormProps {
  initial: ShopFormInitial;
  mode: "create" | "edit";
  /** Required in edit mode for image upload paths. Omit in create mode. */
  shopId?: string;
  profileImageUrl?: string;
  backgroundImageUrl?: string;
}

const KOREAN_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const PER_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 월~일 표시

export function ShopForm({
  initial,
  mode,
  shopId,
  profileImageUrl,
  backgroundImageUrl,
}: ShopFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [handle, setHandle] = useState(initial.handle);
  const [name, setName] = useState(initial.name);
  const [shopType, setShopType] = useState<ShopType>(initial.shopType);
  const [staffNames, setStaffNames] = useState<string[]>(
    initial.staffNames.length > 0 ? initial.staffNames : [""],
  );

  const [phone, setPhone] = useState(initial.phone ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [mapBadge, setMapBadge] = useState(initial.mapBadge ?? "");

  const [hoursMode, setHoursMode] = useState<HoursMode>(initial.hoursMode);
  const [hoursOpen, setHoursOpen] = useState(initial.hoursOpen ?? "");
  const [hoursClose, setHoursClose] = useState(initial.hoursClose ?? "");
  const [closedWeekdays, setClosedWeekdays] = useState<number[]>(
    initial.closedWeekdays,
  );
  const [hasBreak, setHasBreak] = useState(
    Boolean(initial.hoursBreakStart || initial.hoursBreakEnd),
  );
  const [hoursBreakStart, setHoursBreakStart] = useState(
    initial.hoursBreakStart ?? "",
  );
  const [hoursBreakEnd, setHoursBreakEnd] = useState(
    initial.hoursBreakEnd ?? "",
  );
  const [hoursPerWeekday, setHoursPerWeekday] = useState<HoursPerWeekday>(
    initial.hoursPerWeekday,
  );

  const [hoursNote, setHoursNote] = useState(initial.hoursNote ?? "");
  const [cautionNote, setCautionNote] = useState(initial.cautionNote ?? "");
  const [parkingInfo, setParkingInfo] = useState(initial.parkingInfo ?? "");

  const [accountBank, setAccountBank] = useState(initial.accountBank ?? "");
  const [accountNumber, setAccountNumber] = useState(
    initial.accountNumber ?? "",
  );
  const [hasDeposit, setHasDeposit] = useState(initial.depositAmount !== null);
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

  function setPerWeekday(
    day: number,
    field: "open" | "close",
    value: string,
  ) {
    setHoursPerWeekday((prev) => {
      const next = { ...prev };
      const cur = next[String(day)] ?? { open: null, close: null };
      next[String(day)] = { ...cur, [field]: value || null };
      return next;
    });
  }

  const handleValid = /^[a-z0-9][a-z0-9-]{3,30}$/.test(handle);
  const isValid =
    handleValid &&
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    (hoursMode !== "fixed" || (hoursOpen !== "" && hoursClose !== "")) &&
    (hoursMode !== "fixed" ||
      !hasBreak ||
      (hoursBreakStart !== "" && hoursBreakEnd !== "")) &&
    (!hasDeposit || depositAmount.trim() !== "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || isPending) return;
    setError(null);

    const deposit = hasDeposit
      ? Math.max(0, Math.floor(Number(depositAmount)))
      : null;
    if (hasDeposit && Number.isNaN(deposit)) {
      setError("예약금은 숫자여야 해요.");
      return;
    }

    const cleanedStaff =
      shopType === "multi"
        ? staffNames.map((s) => s.trim()).filter(Boolean)
        : [];

    startTransition(async () => {
      const result = await saveShop({
        handle: handle.trim(),
        name: name.trim(),
        shopType,
        staffNames: cleanedStaff,
        phone: phone || null,
        address: address || null,
        hoursMode,
        hoursOpen: hoursMode === "fixed" ? hoursOpen || null : null,
        hoursClose: hoursMode === "fixed" ? hoursClose || null : null,
        hoursBreakStart:
          hoursMode === "fixed" && hasBreak ? hoursBreakStart || null : null,
        hoursBreakEnd:
          hoursMode === "fixed" && hasBreak ? hoursBreakEnd || null : null,
        hoursPerWeekday: hoursMode === "per_weekday" ? hoursPerWeekday : {},
        closedWeekdays: hoursMode === "fixed" ? closedWeekdays : [],
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

  const hasImages = mode === "edit" && shopId;

  return (
    <form onSubmit={handleSubmit} noValidate className="pb-8">
      <div
        className={cn(
          "pt-6 lg:pt-10",
          hasImages &&
            "lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-12",
        )}
      >
        {hasImages && (
          <aside className="lg:sticky lg:top-8">
            <h2 className="text-base font-semibold">이미지</h2>
            <div className="mt-4 space-y-5">
              <ImageUpload
                label="배경"
                pathPrefix={shopId}
                filenameBase="background"
                aspect="wide"
                currentUrl={backgroundImageUrl}
                hint="공개 페이지 상단에 표시돼요."
                onUploaded={async (path) => {
                  const result = await updateShopImage("background", path);
                  if (!result.ok) throw new Error(result.error);
                  router.refresh();
                }}
                enableCrop
                cropAspect={3 / 1}
                cropFixed
              />
              <ImageUpload
                label="프로필"
                pathPrefix={shopId}
                filenameBase="profile"
                aspect="square"
                currentUrl={profileImageUrl}
                hint="샵 카드 / 채팅 등에 표시돼요."
                onUploaded={async (path) => {
                  const result = await updateShopImage("profile", path);
                  if (!result.ok) throw new Error(result.error);
                  router.refresh();
                }}
                enableCrop
                cropAspect={1}
                cropFixed
              />
            </div>
          </aside>
        )}

        <div className={cn("lg:max-w-2xl", !hasImages && "lg:mx-auto")}>
          <Section number="1" title="기본 정보">
            <Field label="샵 URL" required>
              <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 transition focus-within:bg-neutral-200">
                <span className="text-sm text-muted">/shops/</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) =>
                    setHandle(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                  maxLength={31}
                  placeholder="orrnnail"
                  autoCapitalize="none"
                  autoComplete="off"
                  className="block w-full bg-transparent py-3 text-base outline-none"
                  required
                />
              </div>
              <Hint>
                영문 소문자 / 숫자 / 하이픈, 4~31자.
                {mode === "edit" &&
                  " URL을 바꾸면 기존 공유 링크는 더 이상 작동하지 않아요."}
              </Hint>
            </Field>

            <Field label="샵 이름" required>
              <TextInput
                value={name}
                onChange={setName}
                maxLength={60}
                placeholder="오른네일"
                required
              />
            </Field>

            <Field label="샵 종류" required>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                <Radio
                  name="shop-type"
                  value="solo"
                  checked={shopType === "solo"}
                  onChange={() => setShopType("solo")}
                  label="1인 샵이에요"
                />
                <Radio
                  name="shop-type"
                  value="multi"
                  checked={shopType === "multi"}
                  onChange={() => setShopType("multi")}
                  label="쌤이 여러 명이에요"
                />
              </div>
              {shopType === "multi" && (
                <StaffNamesEditor
                  values={staffNames}
                  onChange={setStaffNames}
                />
              )}
            </Field>
          </Section>

          <Section number="2" title="연락처 / 위치">
            <Field label="전화번호" required>
              <TextInput
                value={phone}
                onChange={setPhone}
                type="tel"
                placeholder="0507-1330-8551"
                required
              />
            </Field>

            <Field label="주소">
              <TextInput
                value={address}
                onChange={setAddress}
                placeholder="서울 마포구 동교로38길 42-5 3층"
              />
              <Hint>주소를 입력하면 지도 좌표가 자동으로 설정돼요.</Hint>
            </Field>

            <Field label="지도 배지">
              <TextInput
                value={mapBadge}
                onChange={setMapBadge}
                maxLength={40}
                placeholder="홍대입구역에서 3분 거리에요!"
              />
              <Hint>지도 위에 작은 라벨로 표시됩니다.</Hint>
            </Field>
          </Section>

          <Section number="3" title="영업 시간">
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              <Radio
                name="hours-mode"
                value="fixed"
                checked={hoursMode === "fixed"}
                onChange={() => setHoursMode("fixed")}
                label="정기적으로 운영해요"
              />
              <Radio
                name="hours-mode"
                value="by_reservation"
                checked={hoursMode === "by_reservation"}
                onChange={() => setHoursMode("by_reservation")}
                label="예약 일정에 맞춰요"
              />
              <Radio
                name="hours-mode"
                value="per_weekday"
                checked={hoursMode === "per_weekday"}
                onChange={() => setHoursMode("per_weekday")}
                label="요일마다 달라요"
              />
            </div>

            {hoursMode === "fixed" && (
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="오픈" required>
                    <TimeInput
                      value={hoursOpen}
                      onChange={setHoursOpen}
                      required
                    />
                  </Field>
                  <Field label="마감" required>
                    <TimeInput
                      value={hoursClose}
                      onChange={setHoursClose}
                      required
                    />
                  </Field>
                </div>

                <Field label="휴무 요일">
                  <div className="mt-2 flex flex-wrap gap-2">
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

                <Checkbox
                  checked={hasBreak}
                  onChange={setHasBreak}
                  label="휴게가 있어요"
                />
                {hasBreak && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="휴게 시작" required>
                      <TimeInput
                        value={hoursBreakStart}
                        onChange={setHoursBreakStart}
                        required
                      />
                    </Field>
                    <Field label="휴게 종료" required>
                      <TimeInput
                        value={hoursBreakEnd}
                        onChange={setHoursBreakEnd}
                        required
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}

            {hoursMode === "per_weekday" && (
              <div className="mt-5 space-y-3">
                {PER_WEEKDAY_ORDER.map((day) => {
                  const cur = hoursPerWeekday[String(day)] ?? {
                    open: null,
                    close: null,
                  };
                  return (
                    <div
                      key={day}
                      className="grid grid-cols-[44px_minmax(0,1fr)_12px_minmax(0,1fr)] items-center gap-2"
                    >
                      <span className="text-sm font-medium">
                        {KOREAN_WEEKDAYS[day]}
                      </span>
                      <input
                        type="time"
                        value={cur.open ?? ""}
                        onChange={(e) =>
                          setPerWeekday(day, "open", e.target.value)
                        }
                        className="block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
                      />
                      <span className="text-center text-sm text-muted">~</span>
                      <input
                        type="time"
                        value={cur.close ?? ""}
                        onChange={(e) =>
                          setPerWeekday(day, "close", e.target.value)
                        }
                        className="block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
                      />
                    </div>
                  );
                })}
                <Hint>비워두면 해당 요일은 휴무로 표시돼요.</Hint>
              </div>
            )}

            {hoursMode === "by_reservation" && (
              <p className="mt-5 text-sm text-muted">
                고정된 영업 시간 없이 예약된 일정에 맞춰 운영돼요.
              </p>
            )}
          </Section>

          <Section number="4" title="안내">
            <Field label="영업 안내">
              <Textarea
                value={hoursNote}
                onChange={setHoursNote}
                rows={2}
                placeholder="*매주 일요일 휴무, 휴게시간 14:00-15:00"
              />
            </Field>

            <Field label="아트 안내 사항">
              <Textarea
                value={cautionNote}
                onChange={setCautionNote}
                rows={4}
                placeholder="타샵 디자인의 경우 미리 보내주셔야 가능합니다…"
              />
            </Field>

            <Field label="주차 안내">
              <Textarea
                value={parkingInfo}
                onChange={setParkingInfo}
                rows={2}
                placeholder="건물 뒤편 공영주차장 이용"
              />
            </Field>
          </Section>

          <Section number="5" title="결제">
            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <Field label="은행">
                <TextInput
                  value={accountBank}
                  onChange={setAccountBank}
                  placeholder="국민은행"
                />
              </Field>
              <Field label="계좌번호">
                <TextInput
                  value={accountNumber}
                  onChange={setAccountNumber}
                  placeholder="000-0000000-00-00000"
                />
              </Field>
            </div>

            <Checkbox
              checked={hasDeposit}
              onChange={setHasDeposit}
              label="예약금이 있어요"
            />
            {hasDeposit && (
              <Field label="예약금 (원)" required>
                <TextInput
                  value={depositAmount}
                  onChange={(v) => setDepositAmount(v.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="20000"
                />
              </Field>
            )}
          </Section>

          {error && (
            <p className="px-2 pt-6 text-center text-xs text-accent">
              {error}
            </p>
          )}

          <div className="flex justify-center pt-10">
            <button
              type="submit"
              disabled={!isValid || isPending}
              className={cn(
                "rounded-full bg-ink px-12 py-4 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-50",
                "shadow-[0_4px_10px_-3px_rgba(0,0,0,0.35),_0_14px_30px_-8px_rgba(0,0,0,0.4)]",
              )}
            >
              {isPending
                ? "저장 중…"
                : mode === "create"
                  ? "샵 만들기"
                  : "변경사항 저장"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

// --- Layout helpers ---------------------------------------------------------

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="flex items-baseline gap-2 text-base font-semibold">
        <span>{number}.</span>
        <span>{title}</span>
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
      <div className="mt-12 border-t border-line/60" />
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

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted">{children}</p>;
}

// --- Inputs -----------------------------------------------------------------

const inputClass =
  "mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200";

function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
  inputMode,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "tel";
  placeholder?: string;
  maxLength?: number;
  inputMode?: "numeric" | "decimal";
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      inputMode={inputMode}
      placeholder={placeholder}
      required={required}
      className={inputClass}
    />
  );
}

function TimeInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={inputClass}
    />
  );
}

function Textarea({
  value,
  onChange,
  rows,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={cn(inputClass, "resize-y")}
    />
  );
}

function Radio({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="size-4 cursor-pointer accent-ink"
      />
      <span>{label}</span>
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 cursor-pointer accent-ink"
      />
      <span>{label}</span>
    </label>
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

// --- Multi-staff editor -----------------------------------------------------

function StaffNamesEditor({
  values,
  onChange,
}: {
  values: string[];
  onChange: (next: string[]) => void;
}) {
  function update(idx: number, value: string) {
    onChange(values.map((v, i) => (i === idx ? value : v)));
  }
  function add() {
    onChange([...values, ""]);
  }
  function remove(idx: number) {
    if (values.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(values.filter((_, i) => i !== idx));
  }

  return (
    <div className="mt-3 space-y-2">
      {values.map((value, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`쌤 ${i + 1} 이름`}
            maxLength={40}
            className="block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 rounded-full border border-line px-3 py-2 text-xs text-muted transition hover:bg-neutral-50"
            aria-label={`${i + 1}번째 쌤 삭제`}
          >
            삭제
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        + 쌤 추가
      </button>
    </div>
  );
}
