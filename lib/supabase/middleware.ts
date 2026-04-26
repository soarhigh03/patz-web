import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware-side Supabase client. Run on every request matched by the
 * top-level `middleware.ts` matcher to refresh the auth session cookie before
 * the request hits a route handler / server component.
 *
 * Without this, the access token in the cookie eventually expires and
 * subsequent server reads see the user as logged-out even though the refresh
 * token is still valid.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: this call refreshes the session if needed and rewrites the
  // cookies via setAll above. It must be awaited.
  await supabase.auth.getUser();

  return supabaseResponse;
}
