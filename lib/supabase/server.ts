import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Server-side Supabase client. Use in server components, route handlers,
 * and server actions. Wires Next.js cookies through so auth sessions persist
 * across SSR + client navigation.
 *
 * Cookie writes are wrapped in try/catch because Server Components can read
 * but cannot write cookies — the auth token refresh middleware (added in
 * Step 5) handles writes during request lifecycle.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components can read but not write cookies — middleware
            // (Step 5) refreshes the session in a request-scope where writes
            // are allowed.
          }
        },
      },
    },
  );
}
