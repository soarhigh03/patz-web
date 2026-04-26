import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/OnboardingForm";

export default async function OnboardingPage() {
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

  if (profile && (profile as { onboarded_at: string | null }).onboarded_at) {
    redirect("/dashboard");
  }

  const initial = (profile as {
    nickname: string | null;
    phone: string | null;
  } | null) ?? { nickname: null, phone: null };

  return (
    <main className="min-h-dvh">
      <OnboardingForm
        initialNickname={initial.nickname ?? ""}
        initialPhone={initial.phone ?? ""}
      />
    </main>
  );
}
