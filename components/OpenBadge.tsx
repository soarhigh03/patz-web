"use client";

import { useEffect, useState } from "react";
import { getOpenStatus, type OpenStatus } from "@/lib/openStatus";
import type { BusinessHours } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL: Record<OpenStatus, string> = {
  open: "영업 중",
  on_break: "영업 종료",
  closed: "영업 종료",
};

/**
 * Live 영업 중/영업 종료 indicator. Re-evaluates each minute so the badge flips
 * around open/close/break transitions without a refresh.
 */
export function OpenBadge({ hours, className }: { hours: BusinessHours; className?: string }) {
  const [status, setStatus] = useState<OpenStatus>(() => getOpenStatus(hours));

  useEffect(() => {
    const tick = () => setStatus(getOpenStatus(hours));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [hours]);

  return (
    <span
      className={cn(
        "text-sm font-semibold",
        status === "open" ? "text-emerald-600" : "text-accent",
        className,
      )}
    >
      {LABEL[status]}
    </span>
  );
}
