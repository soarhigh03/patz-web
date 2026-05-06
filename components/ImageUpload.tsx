"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Crop } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CropModal } from "./CropModal";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB matches the bucket's limit
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

interface ImageUploadProps {
  /** Storage bucket. Defaults to shop-assets. */
  bucket?: string;
  /** Folder path under the bucket, no trailing slash. */
  pathPrefix: string;
  /** Filename stem; the timestamp + ext are appended. */
  filenameBase: string;
  /** Existing image URL to show as the initial preview. */
  currentUrl?: string;
  aspect?: "square" | "wide";
  /** Optional override for the preview's width class (Tailwind). */
  previewClassName?: string;
  /** Called with the new storage path after a successful upload. */
  onUploaded: (path: string) => Promise<void> | void;
  hint?: string;
  label?: string;
  /** Enable cropping features (default square crop + manual crop button). */
  enableCrop?: boolean;
}

/**
 * Upload-image-and-preview widget with optional cropping support.
 * When enableCrop is true:
 * - Images are auto-cropped to square (centered, max fill by shorter side)
 * - A "크롭" button appears to open a manual crop modal
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
  enableCrop = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // For cropping: store the original full image as a data URL
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

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

    if (enableCrop) {
      // Store the original for crop modal use
      const dataUrl = await fileToDataUrl(file);
      setOriginalImageSrc(dataUrl);
      // Auto square-crop (centered, shorter side = full)
      const croppedBlob = await autoSquareCrop(dataUrl);
      if (croppedBlob) {
        await uploadBlob(croppedBlob);
      }
    } else {
      await uploadFile(file);
    }
  }

  async function uploadFile(file: File) {
    setBusy(true);
    const localPreview = URL.createObjectURL(file);
    const previousUrl = previewUrl;
    setPreviewUrl(localPreview);

    try {
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

  async function uploadBlob(blob: Blob) {
    setBusy(true);
    const localPreview = URL.createObjectURL(blob);
    const previousUrl = previewUrl;
    setPreviewUrl(localPreview);

    try {
      const path = `${pathPrefix}/${filenameBase}-${Date.now()}.jpg`;

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { upsert: false, contentType: "image/jpeg" });
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

  function handleCropDone(croppedBlob: Blob) {
    setShowCropModal(false);
    uploadBlob(croppedBlob);
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

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:bg-neutral-50 disabled:opacity-50"
        >
          <Camera size={13} />
          {previewUrl ? "이미지 변경" : "이미지 업로드"}
        </button>

        {enableCrop && originalImageSrc && (
          <button
            type="button"
            onClick={() => setShowCropModal(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400 bg-yellow-50 px-3 py-1.5 text-xs text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
          >
            <Crop size={13} />
            크롭
          </button>
        )}
      </div>

      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
        className="hidden"
      />

      {showCropModal && originalImageSrc && (
        <CropModal
          imageSrc={originalImageSrc}
          onCropDone={handleCropDone}
          onClose={() => setShowCropModal(false)}
        />
      )}
    </div>
  );
}

/** Convert a File to a data URL for use in canvas/cropper. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Auto-crop to square (centered, shorter side = full extent). */
async function autoSquareCrop(imageSrc: string): Promise<Blob | null> {
  const img = new window.Image();
  img.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });

  const size = Math.min(img.naturalWidth, img.naturalHeight);
  const x = (img.naturalWidth - size) / 2;
  const y = (img.naturalHeight - size) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(img, x, y, size, size, 0, 0, size, size);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}
