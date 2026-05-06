import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPriceKRW } from "@/lib/format";

interface ArtRow {
  id: string;
  code: string;
  name: string;
  price: number;
  is_this_month: boolean;
  image_path: string | null;
  service_categories: { code: string; name: string; sort_order: number } | null;
}

export default async function ArtsListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shopRow } = await supabase
    .from("shops")
    .select("id, handle")
    .eq("owner_id", user.id)
    .maybeSingle();
  const shop = shopRow as { id: string; handle: string } | null;

  if (!shop) {
    return (
      <main className="min-h-dvh px-6 pt-12 pb-10">
        <BackLink />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">아트 관리</h1>
        <p className="mt-8 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          먼저{" "}
          <Link href="/dashboard/shop" className="underline">
            샵을 만들어
          </Link>
          야 아트를 등록할 수 있어요.
        </p>
      </main>
    );
  }

  const { data: artsData } = await supabase
    .from("arts")
    .select(
      "id, code, name, price, is_this_month, image_path, service_categories!inner(code, name, sort_order)",
    )
    .eq("shop_id", shop.id)
    .is("archived_at", null)
    .order("is_this_month", { ascending: false })
    .order("sort_order");
  const arts = (artsData ?? []) as unknown as ArtRow[];

  // Group by category sort_order for stable display.
  const groups = new Map<
    string,
    { name: string; sort_order: number; items: ArtRow[] }
  >();
  for (const a of arts) {
    const cat = a.service_categories;
    if (!cat) continue;
    const g = groups.get(cat.code);
    if (g) g.items.push(a);
    else
      groups.set(cat.code, {
        name: cat.name,
        sort_order: cat.sort_order,
        items: [a],
      });
  }
  const sortedGroups = [...groups.entries()].sort(
    (a, b) => a[1].sort_order - b[1].sort_order,
  );

  return (
    <main className="min-h-dvh px-6 pt-12 pb-10">
      <BackLink />
      <header className="mt-6 flex items-end justify-between lg:mt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">아트 관리</h1>
          <p className="mt-1 text-sm text-muted">총 {arts.length}개</p>
        </div>
        <Link
          href="/dashboard/arts/new"
          className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-neutral-50 lg:bg-ink lg:text-white lg:border-ink lg:px-4 lg:py-2 lg:hover:bg-ink/90"
        >
          <Plus size={14} />새 아트
        </Link>
      </header>

      {arts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
          등록된 아트가 없어요.
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {sortedGroups.map(([code, g]) => (
            <section key={code}>
              <h2 className="mb-3 text-sm font-medium text-muted">{g.name}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {g.items.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/dashboard/arts/${a.code}`}
                      className="block overflow-hidden rounded-xl border border-line transition hover:border-ink"
                    >
                      <div className="relative aspect-square w-full bg-neutral-100">
                        {a.image_path ? (
                          <Image
                            src={storageUrl(a.image_path)!}
                            alt={a.name}
                            fill
                            sizes="(max-width: 640px) 50vw, 200px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted">
                            이미지 없음
                          </div>
                        )}
                        {a.is_this_month && (
                          <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-medium text-white">
                            이달의 아트
                          </span>
                        )}
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="truncate text-sm font-medium">{a.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatPriceKRW(a.price)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="-ml-1 inline-flex items-center gap-1 text-sm text-muted hover:text-ink lg:hidden"
    >
      <ChevronLeft size={16} />
      대시보드
    </Link>
  );
}

function storageUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("__default__/")) {
    return `/default_pic/${path.slice("__default__/".length)}`;
  }
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shop-assets/${path}`;
}
