"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Provider = "kakao" | "google";

export function LoginButtons() {
  const supabase = createClient();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setBusy(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Supabase will round-trip the auth code back to this URL after the
        // provider's redirect — see app/auth/callback/route.ts for the
        // exchange + redirect-to-onboarding-or-dashboard logic.
        redirectTo: `${window.location.origin}/auth/callback`,
        // Narrow Kakao scopes to email only — we don't use the nickname or
        // profile picture Supabase pulls by default. Google's scopes are
        // left at default ("email profile") since Google requires `profile`
        // alongside `email` for the OIDC handshake to issue a usable id token.
        scopes: provider === "kakao" ? "account_email" : undefined,
      },
    });
    if (error) {
      setBusy(null);
      setError(error.message);
    }
    // On success, browser navigates away — no further state to set.
  }

  return (
    <div className="flex w-full flex-col gap-3 pb-4">
      <SocialButton
        onClick={() => signIn("kakao")}
        disabled={busy !== null}
        loading={busy === "kakao"}
        className="bg-[#FEE500] text-ink"
      >
        카카오로 시작하기
      </SocialButton>

      <SocialButton
        onClick={() => signIn("google")}
        disabled={busy !== null}
        loading={busy === "google"}
        className="border border-line bg-white text-ink"
      >
        Google로 시작하기
      </SocialButton>

      {error && (
        <p className="mt-1 text-center text-xs text-accent">
          로그인 중 문제가 발생했어요: {error}
        </p>
      )}

      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        로그인 시 PATZ 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
      </p>
    </div>
  );
}

function SocialButton({
  onClick,
  disabled,
  loading,
  className,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-14 w-full items-center justify-center rounded-full text-base font-medium transition disabled:opacity-60",
        className,
      )}
    >
      {loading ? "잠시만요…" : children}
    </button>
  );
}
