import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shopRow } = await supabase
    .from("shops")
    .select("handle, name")
    .eq("owner_id", user.id)
    .maybeSingle();
  const shop = shopRow as { handle: string; name: string } | null;

  return (
    <div className="min-h-dvh bg-white lg:bg-neutral-50">
      <DashboardSidebar shop={shop} userEmail={user.email ?? ""} />
      <div className="lg:pl-64">
        <div className="mx-auto w-full max-w-mobile lg:max-w-6xl lg:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
