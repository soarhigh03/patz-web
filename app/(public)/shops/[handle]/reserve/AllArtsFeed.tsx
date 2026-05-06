"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ArtTile } from "@/components/ArtTile";
import type { Art, ServiceCategory, StaffSeed } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  arts: Art[];
  categories: ServiceCategory[];
  staff: StaffSeed[];
  handle: string;
}

export function AllArtsFeed({ arts, categories, staff, handle }: Props) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Filter arts by selected staff
  const filteredArts = selectedStaffId
    ? arts.filter(
        (art) =>
          !art.staffIds ||
          art.staffIds.length === 0 ||
          art.staffIds.includes(selectedStaffId),
      )
    : arts;

  // Group arts by service category code
  const grouped = new Map<string, Art[]>();
  for (const art of filteredArts) {
    const list = grouped.get(art.service) ?? [];
    list.push(art);
    grouped.set(art.service, list);
  }

  // Only show categories that have at least one art
  const visibleCategories = categories.filter(
    (c) => (grouped.get(c.code)?.length ?? 0) > 0,
  );

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

      {visibleCategories.length === 0 ? (
        <p className="mt-20 text-center text-sm text-muted">
          {selectedStaffId
            ? "해당 쌤이 시술 가능한 아트가 없어요."
            : "아직 등록된 아트가 없어요."}
        </p>
      ) : (
        <div className="space-y-2">
          {visibleCategories.map((cat) => (
            <CategorySection
              key={cat.code}
              category={cat}
              arts={grouped.get(cat.code) ?? []}
              handle={handle}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function CategorySection({
  category,
  arts,
  handle,
}: {
  category: ServiceCategory;
  arts: Art[];
  handle: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 py-3 text-left"
      >
        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-accent transition-transform",
            !open && "-rotate-90",
          )}
        />
        <span className="text-base font-semibold text-accent">
          {category.name}
        </span>
        <span className="ml-1 text-sm text-muted">{arts.length}</span>
      </button>

      {open && (
        <div className="grid grid-cols-2 items-start gap-3 pb-3">
          {arts.map((art) => (
            <ArtTile
              key={art.id}
              art={art}
              href={`/shops/${handle}/reserve/${art.service}/${art.id}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
