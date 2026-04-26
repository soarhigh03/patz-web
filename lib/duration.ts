import type { ServiceCode } from "./types";

/**
 * Base duration per service category (minutes). Default for unknown / custom
 * categories is 60 — shop owners can refine when category-level duration
 * defaults land in the dashboard.
 *
 * Source of truth for both the customer reservation form (slot blocking) and
 * the server-side `submitReservation` action (snapshot at insert).
 */
const BASE_DURATION_MINUTES: Record<string, number> = {
  "hand-foot-care": 30,
  "nail-art": 60,
  "one-color": 60,
  pedicure: 60,
};
const DEFAULT_BASE_DURATION = 60;
const REMOVAL_ADD_MIN = 30;
const EXTENSION_ADD_MIN = 30;

export interface DurationInput {
  serviceCode: ServiceCode;
  /** True when 타샵 OR 자샵 제거 is selected. */
  hasRemoval: boolean;
  /** True when extension count > 0. */
  hasExtension: boolean;
}

export function computeReservationDuration({
  serviceCode,
  hasRemoval,
  hasExtension,
}: DurationInput): number {
  const base = BASE_DURATION_MINUTES[serviceCode] ?? DEFAULT_BASE_DURATION;
  return base + (hasRemoval ? REMOVAL_ADD_MIN : 0) + (hasExtension ? EXTENSION_ADD_MIN : 0);
}

/** 30-min slot grid is the project default. */
export const SLOT_INTERVAL_MIN = 30;
