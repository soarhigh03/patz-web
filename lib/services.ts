import type { ServiceType } from "./types";

/**
 * Display labels for each service type. Korean copy is sourced from the
 * Image #2 mockup. The order here is the canonical order used wherever
 * services are listed in a grid or filter.
 */
export const SERVICE_ORDER: ServiceType[] = [
  "nail_art",
  "one_color",
  "pedicure",
  "hand_foot_care",
];

export const SERVICE_LABELS: Record<ServiceType, string> = {
  nail_art: "네일아트 (손)",
  one_color: "원컬러 (손)",
  pedicure: "페디큐어",
  hand_foot_care: "손/발 케어",
};

const ALL_TYPES = new Set<ServiceType>(SERVICE_ORDER);

/** Type-guard that narrows a URL slug into a valid ServiceType. */
export function isServiceType(value: string): value is ServiceType {
  return ALL_TYPES.has(value as ServiceType);
}
