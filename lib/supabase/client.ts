import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Use in client components.
 *
 * Reads `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
 * both of which ship to the browser by design — RLS policies (see
 * `docs/database-schema.md` §9) are what actually keep data private.
 *
 * Database generic is intentionally omitted until `supabase gen types`
 * lands — see lib/supabase/server.ts for the same note.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
