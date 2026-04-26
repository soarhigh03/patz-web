"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StickyCTA } from "./StickyCTA";

interface OnboardingFormProps {
  initialNickname: string;
  initialPhone: string;
}

/**
 * Shop-owner onboarding: collects the profile fields needed before the
 * dashboard is usable (nickname for greetings, phone for Kakao Channel
 * notifications). Saves to `profiles` and stamps `onboarded_at = now()`.
 * See database-schema.md §10.5.
 *
 * `profiles.depositor_name` is the *customer's* bank-statement name and
 * is captured per-reservation. The web shop owner never enters one.
 */
export function OnboardingForm({
  initialNickname,
  initialPhone,
}: OnboardingFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [nickname, setNickname] = useState(initialNickname);
  // Phone is stored normalized (010xxxxxxxx, no dashes) but displayed with
  // dashes for readability.
  const [phoneDisplay, setPhoneDisplay] = useState(formatPhone(initialPhone));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneDigits = phoneDisplay.replace(/\D/g, "");
  const phoneValid = /^010\d{7,8}$/.test(phoneDigits);

  const missing: string[] = [];
  if (!nickname.trim()) missing.push("닉네임");
  if (!phoneValid) missing.push("전화번호");
  const isValid = missing.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        nickname: nickname.trim(),
        phone: phoneDigits,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="pb-2">
      <div className="px-6 pt-12">
        <h1 className="text-center text-base font-semibold">계정 정보 입력</h1>
        <p className="mt-2 text-center text-xs text-muted">
          예약 알림과 정산을 위해 한 번만 입력하면 됩니다.
        </p>

        <div className="mt-10 space-y-7">
          <Field label="닉네임" required>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={30}
              autoComplete="nickname"
              className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
              placeholder="예: 오른네일 사장님"
              required
            />
          </Field>

          <Field label="전화번호" required>
            <input
              type="tel"
              inputMode="numeric"
              value={phoneDisplay}
              onChange={(e) => setPhoneDisplay(formatPhone(e.target.value))}
              autoComplete="tel"
              className="mt-2 block w-full rounded-xl bg-neutral-100 px-3 py-3 text-base outline-none transition focus:bg-neutral-200"
              placeholder="010-1234-5678"
              maxLength={13}
              required
            />
            <p className="mt-1 text-xs text-muted">
              카카오톡 채널을 통해 예약 알림을 받습니다.
            </p>
          </Field>
        </div>

        {error && (
          <p className="mt-6 text-center text-xs text-accent">저장 실패: {error}</p>
        )}
      </div>

      {!isValid && (
        <p className="px-6 pt-2 text-center text-xs text-muted">
          입력 필요: {missing.join(", ")}
        </p>
      )}

      <StickyCTA sticky={false} disabled={!isValid || submitting}>
        {submitting ? "저장 중…" : "시작하기"}
      </StickyCTA>
    </form>
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

/** Formats a free-form digit string as `010-1234-5678`. */
function formatPhone(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
