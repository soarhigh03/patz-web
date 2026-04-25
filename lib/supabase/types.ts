/**
 * Database types for the Supabase Postgres schema.
 *
 * These will be auto-generated once the migration is applied:
 *   npx supabase gen types typescript --project-id mszziznkthkpdlqqhnrg \
 *     --schema public > lib/supabase/types.ts
 *
 * Until then, this is a hand-rolled minimum that the client modules can
 * reference. Phase 2 (live data swap) replaces this with the generated file.
 */
export type Database = {
  // Filled in once `supabase gen types` runs after migrations.
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      reservation_status:
        | "pending"
        | "confirmed"
        | "rejected"
        | "cancelled"
        | "no_show"
        | "completed";
    };
  };
};
