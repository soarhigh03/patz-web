"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, X } from "lucide-react";
import {
  acceptReservation,
  rejectReservation,
} from "@/app/dashboard/reservations/actions";
import type { ShopReservation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  requests: ShopReservation[];
}

export function RequestList({ requests }: Props) {
  return (
    <ul className="space-y-3">
      {requests.map((r) => (
        <RequestCard key={r.id} reservation={r} />
      ))}
    </ul>
  );
}

function RequestCard({ reservation: r }: { reservation: ShopReservation }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [handled, setHandled] = useState<"accepted" | "rejected" | null>(null);

  function handleAction(action: "accept" | "reject") {
    startTransition(async () => {
      const result =
        action === "accept"
          ? await acceptReservation(r.id)
          : await rejectReservation(r.id);
      if (result.ok) {
        setHandled(action === "accept" ? "accepted" : "rejected");
        router.refresh();
      }
    });
  }

  const dateLabel = formatDate(r.reservationDate);
  const options = [
    r.gelSelfRemoval && "자샵 제거",
    r.gelOtherRemoval && "타샵 제거",
    r.extensionCount > 0 && `연장 ${r.extensionCount}개`,
  ].filter(Boolean);

  if (handled) {
    return (
      <li
        className={cn(
          "rounded-xl border px-4 py-3 text-sm",
          handled === "accepted"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-neutral-200 bg-neutral-50 text-muted",
        )}
      >
        {r.customerName}님 · {dateLabel} {r.reservationTime} ·{" "}
        {handled === "accepted" ? "수락됨" : "거절됨"}
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-line bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Art thumbnail */}
        {r.artImageUrl && (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
            <Image
              src={r.artImageUrl}
              alt={r.artName}
              fill
              className="object-cover"
              sizes="56px"
              unoptimized
            />
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{r.customerName}</span>
            <span className="text-xs text-muted">
              {formatPhone(r.customerPhone)}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {dateLabel} {r.reservationTime} · {r.durationMinutes}분
          </p>
          <p className="mt-0.5 text-sm">
            {r.serviceCategoryName} · {r.artName}
            {r.staffName && ` · ${r.staffName}`}
          </p>
          {options.length > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              {options.join(" / ")}
            </p>
          )}
          {r.notes && (
            <p className="mt-1 text-xs text-muted italic">
              &ldquo;{r.notes}&rdquo;
            </p>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="font-medium">
              {r.totalPrice.toLocaleString()}원
            </span>
            {r.depositPaidAt ? (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">
                입금 확인
              </span>
            ) : (
              <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700">
                입금 대기
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => handleAction("accept")}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          <Check size={15} />
          수락
        </button>
        <button
          type="button"
          onClick={() => handleAction("reject")}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line py-2.5 text-sm font-medium text-muted transition hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50"
        >
          <X size={15} />
          거절
        </button>
      </div>
    </li>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const wd = weekdays[d.getDay()];
  return `${month}/${day}(${wd})`;
}

function formatPhone(phone: string): string {
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  }
  return phone;
}
