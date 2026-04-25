import Link from "next/link";

interface Params {
  params: Promise<{ handle: string; service: string; artId: string }>;
}

// Step 3 will replace this with the full reservation form (Image #5).
export default async function ReservationFormPlaceholder({ params }: Params) {
  const { handle, service, artId } = await params;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm text-muted">예약 양식은 Step 3에서 구현됩니다.</p>
      <p className="text-xs text-muted">
        shop: {handle} · service: {service} · art: {artId}
      </p>
      <Link
        href={`/shops/${handle}/reserve/${service}/${artId}`}
        className="text-sm font-medium underline"
      >
        ← 아트 상세로 돌아가기
      </Link>
    </main>
  );
}
