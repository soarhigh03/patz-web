"use client";

import { useState } from "react";
import { ArtForm } from "@/components/ArtForm";

interface Props {
  shopId: string;
  categories: Array<{ code: string; name: string }>;
}

/**
 * Picks a fresh UUID once on mount so the image upload path
 * (`<shop>/arts/<id>-<ts>.<ext>`) lines up with the row that gets inserted
 * — ensuring the uploaded file is owned by the right art at first save.
 */
export function NewArtClientWrapper({ shopId, categories }: Props) {
  const [id] = useState(() => crypto.randomUUID());

  return (
    <ArtForm
      shopId={shopId}
      categories={categories}
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
      }}
    />
  );
}
