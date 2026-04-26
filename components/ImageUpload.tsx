"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB matches the bucket's limit
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

interface ImageUploadProps {
  /** Storage bucket. Defaults to shop-assets. */
  bucket?: string;
  /** Folder path under the bucket, no trailing slash. Examples:
   *  `<shop_id>` (profile / background) or `<shop_id>/arts` (art images). */
  pathPrefix: string;
  /** Filename stem; the timestamp + ext are appended. Examples:
   *  `profile`, `background`, or the art's row id. */
  filenameBase: string;
  /** Existing image URL to show as the initial preview. */
  currentUrl?: string;
  aspect?: "square" | "wide";
  /** Optional override for the preview's width class (Tailwind), e.g. "w-64".
   *  Defaults to "w-32" for square and "w-full" for wide. */
  previewClassName?: string;
  /** Called with the new storage path after a successful upload. The parent
   *  is responsible for persisting it (server action OR local form state). */
  onUploaded: (path: string) => Promise<void> | void;
  hint?: string;
  label?: string;
}

/**
 * Upload-image-and-preview widget. Uploads happen client-side via the
 * supabase-js browser client; storage RLS validates the user owns the
 * shop folder in the path. Keeps local preview state so the new image
 * appears immediately even before the parent persists the path.
 */
export function ImageUpload({
  bucket = "shop-assets",
  pathPrefix,
  filenameBase,
  currentUrl,
  aspect = "square",
  previewClassName,
  onUploaded,
  hint,
  label,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED_MIME.includes(file.type)) {
      setError("JPEG / PNG / WEBP만 업로드할 수 있어요.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("파일이 너무 커요. 5MB 이하로 올려주세요.");
      return;
    }

    setBusy(true);
    const localPreview = URL.createObjectURL(file);
    const previousUrl = previewUrl;
    setPreviewUrl(localPreview);

    try {
      // Unique filename per upload — orphans the previous file but skips
      // the CDN-cache-vs-overwrite headache. Cleanup is a future task.
      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `${pathPrefix}/${filenameBase}-${Date.now()}.${ext}`;

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        setError(upErr.message);
        setPreviewUrl(previousUrl);
        URL.revokeObjectURL(localPreview);
        return;
      }

      await onUploaded(path);

      const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data
        .publicUrl;
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드에 실패했어요.");
      setPreviewUrl(previousUrl);
      URL.revokeObjectURL(localPreview);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {label && <p className="text-sm font-medium">{label}</p>}
      <div
        className={cn(
          "relative mt-2 overflow-hidden rounded-xl border border-line bg-neutral-100",
          aspect === "square" ? "aspect-square" : "aspect-[3/1]",
          previewClassName ?? (aspect === "square" ? "w-32" : "w-full"),
        )}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={label ?? "이미지"}
            fill
            className="object-cover"
            sizes={aspect === "wide" ? "100vw" : "200px"}
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            이미지 없음
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs font-medium text-white">
            업로드 중…
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:bg-neutral-50 disabled:opacity-50"
      >
        <Camera size={13} />
        {previewUrl ? "이미지 변경" : "이미지 업로드"}
      </button>
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = ""; // allow re-uploading the same file
        }}
        className="hidden"
      />
    </div>
  );
}
