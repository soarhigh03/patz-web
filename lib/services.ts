import type { ServiceCode, ServiceCategory } from "./types";

/**
 * Default service categories seeded on shop creation in Postgres
 * (see `seed_default_categories()` trigger in 0001_init.sql). The web app
 * uses this list as a fallback whenever a shop is rendered from mock data
 * (DB empty) so the option-select grid still has something to show.
 *
 * Real shops fetch their own `service_categories` from Supabase, including
 * any custom ones (왁싱, 아이래시, ...).
 */
export const DEFAULT_SERVICE_CATEGORIES: ServiceCategory[] = [
  { code: "nail-art",       name: "네일아트 (손)" },
  { code: "one-color",      name: "원컬러 (손)" },
  { code: "pedicure",       name: "페디큐어" },
  { code: "hand-foot-care", name: "손/발 케어" },
];

const DEFAULT_BY_CODE = new Map(
  DEFAULT_SERVICE_CATEGORIES.map((c) => [c.code, c]),
);

/** Lookup the display label for a default category code. */
export function defaultCategoryLabel(code: ServiceCode): string | undefined {
  return DEFAULT_BY_CODE.get(code)?.name;
}
