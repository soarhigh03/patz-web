import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, phone, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !(profile as { onboarded_at: string | null }).onboarded_at) {
    redirect("/onboarding");
  }

  const p = profile as {
    nickname: string;
    phone: string;
  };

  // Look up this user's shop (UNIQUE(owner_id) means at most one).
  const { data: shopRow } = await supabase
    .from("shops")
    .select("id, handle, name")
    .eq("owner_id", user.id)
    .maybeSingle();
  const shop = shopRow as { id: string; handle: string; name: string } | null;

  return (
    <main className="min-h-dvh px-6 pt-12 pb-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
        <p className="mt-1 text-sm text-muted">{p.nickname} 님 환영합니다.</p>
      </header>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted">내 샵</h2>
        {shop ? (
          <div className="mt-3 rounded-xl border border-line p-4">
            <p className="text-base font-medium">{shop.name}</p>
            <p className="mt-0.5 text-xs text-muted">@{shop.handle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/shops/${shop.handle}`}
                className="rounded-full border border-line px-4 py-1.5 text-sm hover:bg-neutral-50"
              >
                공개 페이지 보기
              </Link>
              <DisabledButton hint="Step 6에서 구현됩니다">
                샵 정보 수정
              </DisabledButton>
              <Link
                href="/dashboard/reservations"
                className="rounded-full border border-line px-4 py-1.5 text-sm hover:bg-neutral-50"
              >
                예약 관리
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-line p-6 text-center">
            <p className="text-sm text-muted">아직 등록한 샵이 없어요.</p>
            <DisabledButton
              hint="Step 6에서 구현됩니다"
              className="mt-3"
            >
              샵 만들기
            </DisabledButton>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted">계정</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row term="이메일" value={user.email ?? "—"} />
          <Row term="전화번호" value={formatPhone(p.phone)} />
        </dl>

        <form action="/auth/signout" method="POST" className="mt-8">
          <button
            type="submit"
            className="text-sm text-muted underline hover:text-ink"
          >
            로그아웃
          </button>
        </form>
      </section>
    </main>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function DisabledButton({
  children,
  hint,
  className,
}: {
  children: React.ReactNode;
  hint: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled
      title={hint}
      className={`cursor-not-allowed rounded-full border border-line px-4 py-1.5 text-sm text-muted ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function formatPhone(digits: string): string {
  if (!digits || digits.length < 10) return digits;
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
