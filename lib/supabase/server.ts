import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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

  // Note: not passing the Database generic — until `supabase gen types` is
  // run, the hand-rolled types in ./types.ts are incomplete (no Insert/Update
  // shapes) and cause query results to infer as `never`. Local row types are
  // applied via casts in lib/data.ts. Swap back to the generic once the
  // generated types land.
  return createServerClient(
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
