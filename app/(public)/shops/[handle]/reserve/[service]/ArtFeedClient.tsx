"use client";

import { useState } from "react";
import { ArtTile } from "@/components/ArtTile";
import type { Art, StaffSeed } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  arts: Art[];
  staff: StaffSeed[];
  handle: string;
  service: string;
}

export function ArtFeedClient({ arts, staff, handle, service }: Props) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const filteredArts = selectedStaffId
    ? arts.filter(
        (art) =>
          // No staffIds means all staff can do it
          !art.staffIds ||
          art.staffIds.length === 0 ||
          art.staffIds.includes(selectedStaffId),
      )
    : arts;

  return (
    <main className="min-h-dvh px-4 pt-20 pb-10">
      <h1 className="mb-4 text-center text-base font-medium">
        원하시는 아트를 선택하세요.
      </h1>

      {/* Staff filter pills */}
      {staff.length > 0 && (
        <div className="mb-5 flex items-center justify-start gap-2 overflow-x-auto px-2">
          <button
            type="button"
            onClick={() => setSelectedStaffId(null)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition",
              selectedStaffId === null
                ? "bg-ink text-white"
                : "bg-neutral-100 text-ink hover:bg-neutral-200",
            )}
          >
            전체
          </button>
          {staff.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                setSelectedStaffId(selectedStaffId === s.id ? null : s.id)
              }
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition",
                selectedStaffId === s.id
                  ? "bg-ink text-white"
                  : "bg-neutral-100 text-ink hover:bg-neutral-200",
              )}
            >
              {s.name} 쌤
            </button>
          ))}
        </div>
      )}

      {filteredArts.length === 0 ? (
        <p className="mt-20 text-center text-sm text-muted">
          {selectedStaffId
            ? "해당 쌤이 시술 가능한 아트가 없어요."
            : "아직 등록된 아트가 없어요."}
        </p>
      ) : (
        <div className="grid grid-cols-2 items-start gap-3">
          {filteredArts.map((art) => (
            <ArtTile
              key={art.id}
              art={art}
              href={`/shops/${handle}/reserve/${service}/${art.id}`}
            />
          ))}
        </div>
      )}
    </main>
  );
}
