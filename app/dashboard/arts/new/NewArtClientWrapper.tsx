"use client";

import { useState } from "react";
import { ArtForm } from "@/components/ArtForm";

interface Props {
  shopId: string;
  categories: Array<{ code: string; name: string }>;
  staffList: Array<{ id: string; name: string }>;
}

export function NewArtClientWrapper({ shopId, categories, staffList }: Props) {
  const [id] = useState(() => crypto.randomUUID());

  return (
    <ArtForm
      shopId={shopId}
      categories={categories}
      staffList={staffList}
      mode="create"
      initial={{
        id,
        code: "",
        name: "",
        price: 0,
        serviceCategoryCode: categories[0]?.code ?? "",
        imagePath: null,
        imageUrl: undefined,
        isThisMonth: false,
        staffIds: [],
      }}
    />
  );
}
