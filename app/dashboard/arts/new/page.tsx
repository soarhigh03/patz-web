import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ArtForm } from "@/components/ArtForm";
import { NewArtClientWrapper } from "./NewArtClientWrapper";

export default async function NewArtPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shopRow } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  const shop = shopRow as { id: string } | null;
  if (!shop) redirect("/dashboard/shop");

  const { data: catData } = await supabase
    .from("service_categories")
    .select("code, name, sort_order")
    .eq("shop_id", shop.id)
    .is("archived_at", null)
    .order("sort_order");
  const categories = (catData ?? []) as Array<{
    code: string;
    name: string;
    sort_order: number;
  }>;

  return (
    <main className="min-h-dvh px-6 pt-12 pb-16">
      <Link
        href="/dashboard/arts"
        className="-ml-1 inline-flex items-center gap-1 text-sm text-muted hover:text-ink lg:hidden"
      >
        <ChevronLeft size={16} />
        아트 관리
      </Link>
      <header className="mt-6 lg:mt-0">
        <h1 className="text-2xl font-semibold tracking-tight">새 아트</h1>
        <p className="mt-1 text-sm text-muted">
          이미지를 먼저 올린 후 나머지 정보를 입력해도 됩니다.
        </p>
      </header>
      <NewArtClientWrapper
        shopId={shop.id}
        categories={categories.map((c) => ({ code: c.code, name: c.name }))}
      />
    </main>
  );
}
