import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ArtForm } from "@/components/ArtForm";

interface Params {
  params: Promise<{ code: string }>;
}

interface ArtRow {
  id: string;
  code: string;
  name: string;
  price: number;
  is_this_month: boolean;
  image_path: string | null;
  service_categories: { code: string } | null;
}

export default async function EditArtPage({ params }: Params) {
  const { code } = await params;

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

  const { data: artData } = await supabase
    .from("arts")
    .select(
      "id, code, name, price, is_this_month, image_path, service_categories!inner(code)",
    )
    .eq("shop_id", shop.id)
    .eq("code", code)
    .is("archived_at", null)
    .maybeSingle();
  const art = artData as unknown as ArtRow | null;
  if (!art) notFound();

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

  const imageUrl = art.image_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shop-assets/${art.image_path}`
    : undefined;

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
        <h1 className="text-2xl font-semibold tracking-tight">아트 수정</h1>
        <p className="mt-1 text-sm text-muted">{art.name}</p>
      </header>
      <ArtForm
        shopId={shop.id}
        categories={categories.map((c) => ({ code: c.code, name: c.name }))}
        mode="edit"
        initial={{
          id: art.id,
          code: art.code,
          name: art.name,
          price: art.price,
          serviceCategoryCode: art.service_categories?.code ?? "",
          imagePath: art.image_path,
          imageUrl,
          isThisMonth: art.is_this_month,
        }}
      />
    </main>
  );
}
