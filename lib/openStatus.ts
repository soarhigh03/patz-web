import type { BusinessHours, Weekday } from "./types";

export type OpenStatus = "open" | "closed" | "on_break";

/**
 * Returns whether the shop is currently open, on break, or closed.
 * Evaluated in the Asia/Seoul timezone so behavior matches owners' expectations
 * regardless of the viewer's locale.
 */
export function getOpenStatus(hours: BusinessHours, now: Date = new Date()): OpenStatus {
  const { weekday, minutes } = nowInSeoul(now);
  if (hours.closedWeekdays.includes(weekday)) return "closed";

  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  const breakStart = hours.breakStart ? toMinutes(hours.breakStart) : null;
  const breakEnd = hours.breakEnd ? toMinutes(hours.breakEnd) : null;

  // Hours that wrap past midnight (close < open) — treat the closed window as
  // [close, open) and everything else as open.
  const inOpenWindow =
    close > open
      ? minutes >= open && minutes < close
      : minutes >= open || minutes < close;

  if (!inOpenWindow) return "closed";

  if (
    breakStart !== null &&
    breakEnd !== null &&
    minutes >= breakStart &&
    minutes < breakEnd
  ) {
    return "on_break";
  }

  return "open";
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function nowInSeoul(d: Date): { weekday: Weekday; minutes: number } {
  // Format the date in Asia/Seoul, then parse the parts back out.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const map: Record<string, Weekday> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return { weekday: map[weekdayStr] ?? 0, minutes: hour * 60 + minute };
}
