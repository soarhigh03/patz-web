import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButtons } from "@/components/LoginButtons";

export default async function LoginPage() {
  // If the user is already signed in, skip the OAuth round-trip entirely
  // and route them to wherever they belong. Without this, an owner who
  // re-visits /login (or whose OAuth provider falls back to this page)
  // sits on the login screen instead of getting to the dashboard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    const onboarded = (profile as { onboarded_at: string | null } | null)
      ?.onboarded_at;
    redirect(onboarded ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-between px-6 pb-10 pt-24">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-semibold tracking-tight">PATZ</h1>
        <p className="mt-3 text-sm text-muted">샵 사장님 로그인</p>
      </div>

      <LoginButtons />
    </main>
  );
}
