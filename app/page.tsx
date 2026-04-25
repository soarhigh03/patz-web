import Link from "next/link";
import { listShops } from "@/lib/data";

export default async function Home() {
  const shops = await listShops();
  return (
    <main className="px-6 py-16">
      <h1 className="text-2xl font-semibold">PATZ</h1>
      <p className="mt-2 text-sm text-muted">네일 예약을 가장 간편하게.</p>
      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted">샵 미리보기</h2>
        <ul className="mt-3 space-y-2">
          {shops.map((shop) => (
            <li key={shop.handle}>
              <Link
                href={`/shops/${shop.handle}`}
                className="block rounded-xl border border-line px-4 py-3 text-sm hover:bg-neutral-50"
              >
                <span className="font-medium">{shop.name}</span>
                <span className="ml-2 text-muted">@{shop.handle}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
