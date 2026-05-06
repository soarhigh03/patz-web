"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

interface CropModalProps {
  imageSrc: string;
  onCropDone: (croppedBlob: Blob) => void;
  onClose: () => void;
  /** When set, locks the crop area to this aspect ratio (hides ratio selector). */
  fixedAspect?: number;
}

const ASPECT_OPTIONS = [
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "자유", value: 0 }, // 0 = free mode
] as const;

/**
 * Full-screen crop modal with yellow selection box.
 * Constraint: long side / short side <= 4.
 */
export function CropModal({ imageSrc, onCropDone, onClose, fixedAspect }: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [selectedAspect, setSelectedAspect] = useState(fixedAspect ?? 1);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;

    // Validate 4:1 constraint
    const { width, height } = croppedAreaPixels;
    const longSide = Math.max(width, height);
    const shortSide = Math.min(width, height);
    if (shortSide > 0 && longSide / shortSide > 4) {
      alert("긴 변이 짧은 변의 4배를 넘을 수 없어요.");
      return;
    }

    const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
    if (blob) onCropDone(blob);
  }

  // When fixedAspect is set, always use it. Otherwise allow switching.
  const cropperAspect = fixedAspect
    ? fixedAspect
    : selectedAspect === 0
      ? undefined
      : selectedAspect;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black lg:left-64">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-white/80 hover:text-white"
        >
          취소
        </button>
        <span className="text-sm font-medium text-white">영역 선택</span>
        <button
          type="button"
          onClick={handleConfirm}
          className="text-sm font-bold text-yellow-400 hover:text-yellow-300"
        >
          완료
        </button>
      </div>

      {/* Cropper area */}
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={cropperAspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={false}
          style={{
            cropAreaStyle: {
              border: "3px solid #FACC15",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
            },
          }}
          classes={{
            containerClassName: "!absolute !inset-0",
          }}
        />
      </div>

      {/* Aspect ratio presets — hidden when aspect is fixed */}
      {!fixedAspect && (
        <div className="flex items-center justify-center gap-3 px-4 py-4">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setSelectedAspect(opt.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                selectedAspect === opt.value
                  ? "bg-yellow-400 text-black"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Zoom slider */}
      <div className="flex items-center justify-center gap-3 px-8 pb-6">
        <span className="text-xs text-white/60">-</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1 w-full max-w-xs cursor-pointer appearance-none rounded bg-white/30 accent-yellow-400"
        />
        <span className="text-xs text-white/60">+</span>
      </div>

      {!fixedAspect && (
        <p className="pb-4 text-center text-xs text-white/50">
          긴 변이 짧은 변의 4배를 넘지 않아야 해요
        </p>
      )}
    </div>
  );
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
): Promise<Blob | null> {
  const image = new window.Image();
  image.crossOrigin = "anonymous";
  image.src = imageSrc;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}
