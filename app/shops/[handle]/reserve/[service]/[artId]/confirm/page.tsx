import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getMockArt, getMockShopByHandle } from "@/lib/mockData";
import { isServiceType } from "@/lib/services";

interface Params {
  params: Promise<{ handle: string; service: string; artId: string }>;
}

export default async function ConfirmationPage({ params }: Params) {
  const { handle, service, artId } = await params;
  if (!isServiceType(service)) notFound();

  const shop = getMockShopByHandle(handle);
  const art = getMockArt(handle, artId);
  if (!shop || !art || art.service !== service) notFound();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/10">
        <Check size={28} className="text-ink" />
      </div>
      <h1 className="text-xl font-semibold">예약 요청을 보냈습니다.</h1>
      <p className="text-sm leading-relaxed text-muted">
        샵에서 확인 후 카카오톡 채널을 통해
        <br />
        예약 확정 안내를 보내드릴게요.
      </p>
      <Link
        href={`/shops/${shop.handle}`}
        className="mt-4 text-sm font-medium underline"
      >
        ← {shop.name}으로 돌아가기
      </Link>
    </main>
  );
}
