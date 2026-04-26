import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback. Supabase redirects the user back here with `?code=...`
 * after Kakao/Google auth completes. We exchange the code for a session
 * (which sets the auth cookies via the server client) then route the user
 * to onboarding or the dashboard depending on profile completeness.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error ?? "missing_code")}`,
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  // Check onboarding status. The handle_new_user trigger created the
  // profiles row at signup; onboarded_at is NULL until the user fills the
  // onboarding form.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  const target = profile && (profile as { onboarded_at: string | null }).onboarded_at
    ? "/dashboard"
    : "/onboarding";

  return NextResponse.redirect(`${origin}${target}`);
}
