/** Korean-style price formatting: 65000 → "65,000원". */
export function formatPriceKRW(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

/** Korean-style duration: 60 → "1시간", 90 → "1시간 30분", 30 → "30분". */
export function formatDurationKR(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}시간 ${m}분`;
  if (h) return `${h}시간`;
  return `${m}분`;
}
