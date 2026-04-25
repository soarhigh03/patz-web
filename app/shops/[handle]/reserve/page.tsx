import Link from "next/link";

interface Params {
  params: Promise<{ handle: string }>;
}

// Placeholder — Step 2 will replace this with the option-select / feed /
// detail / form flow (Images #2–#5). Keeping it routable now so Image #1's
// CTA links to a real page.
export default async function ReservePlaceholder({ params }: Params) {
  const { handle } = await params;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm text-muted">예약 플로우는 Step 2에서 구현됩니다.</p>
      <Link
        href={`/shops/${handle}`}
        className="text-sm font-medium underline"
      >
        ← {handle} 샵으로 돌아가기
      </Link>
    </main>
  );
}
