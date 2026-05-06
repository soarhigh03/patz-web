"use client";

import { useState, useCallback, useRef } from "react";
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

const OVERLAY_COLOR = "rgba(0,0,0,0.45)";

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

  const isFreeMode = !fixedAspect && selectedAspect === 0;

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
        {isFreeMode ? (
          <FreeCropper
            imageSrc={imageSrc}
            onCropChange={(area) => setCroppedAreaPixels(area)}
          />
        ) : (
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
                boxShadow: `0 0 0 9999px ${OVERLAY_COLOR}`,
              },
            }}
            classes={{
              containerClassName: "!absolute !inset-0",
            }}
          />
        )}
      </div>

      {/* Aspect ratio presets -- hidden when aspect is fixed */}
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

      {/* Zoom slider -- hidden in free mode (user resizes crop directly) */}
      {!isFreeMode && (
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
      )}

      {!fixedAspect && (
        <p className="pb-4 text-center text-xs text-white/50">
          긴 변이 짧은 변의 4배를 넘지 않아야 해요
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FreeCropper – custom free-ratio crop with corner handles          */
/* ------------------------------------------------------------------ */

interface ImgLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_SIZE = 30;
const HANDLE_HIT = 40;
const HANDLE_VISIBLE = 20;
const CORNERS = ["tl", "tr", "bl", "br"] as const;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function FreeCropper({
  imageSrc,
  onCropChange,
}: {
  imageSrc: string;
  onCropChange: (area: Area) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgLayout, setImgLayout] = useState<ImgLayout | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);

  // Report pixel area to parent whenever crop changes
  const reportCrop = useCallback(
    (rect: CropRect, img: ImgLayout) => {
      onCropChange({
        x: Math.round((rect.x - img.left) / img.scale),
        y: Math.round((rect.y - img.top) / img.scale),
        width: Math.round(rect.w / img.scale),
        height: Math.round(rect.h / img.scale),
      });
    },
    [onCropChange],
  );

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const container = containerRef.current;
      if (!container) return;

      const cRect = container.getBoundingClientRect();
      const scale = Math.min(
        cRect.width / img.naturalWidth,
        cRect.height / img.naturalHeight,
      );
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const layout: ImgLayout = {
        left: (cRect.width - w) / 2,
        top: (cRect.height - h) / 2,
        width: w,
        height: h,
        scale,
      };
      setImgLayout(layout);

      const margin = 0.1;
      const initCrop: CropRect = {
        x: layout.left + w * margin,
        y: layout.top + h * margin,
        w: w * (1 - 2 * margin),
        h: h * (1 - 2 * margin),
      };
      setCropRect(initCrop);
      reportCrop(initCrop, layout);
    },
    [reportCrop],
  );

  const startDrag = useCallback(
    (handle: string) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!cropRect || !imgLayout) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const s = { ...cropRect };
      const img = imgLayout;

      const onMove = (me: PointerEvent) => {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;
        const imgRight = img.left + img.width;
        const imgBottom = img.top + img.height;

        const next: CropRect = { ...s };

        if (handle === "move") {
          next.x = clamp(s.x + dx, img.left, imgRight - s.w);
          next.y = clamp(s.y + dy, img.top, imgBottom - s.h);
        } else {
          if (handle.includes("l")) {
            const rightEdge = s.x + s.w;
            const newLeft = clamp(s.x + dx, img.left, rightEdge - MIN_SIZE);
            next.x = newLeft;
            next.w = rightEdge - newLeft;
          } else if (handle.includes("r")) {
            const newRight = clamp(s.x + s.w + dx, s.x + MIN_SIZE, imgRight);
            next.w = newRight - s.x;
          }

          if (handle.includes("t")) {
            const bottomEdge = s.y + s.h;
            const newTop = clamp(s.y + dy, img.top, bottomEdge - MIN_SIZE);
            next.y = newTop;
            next.h = bottomEdge - newTop;
          } else if (handle.includes("b")) {
            const newBottom = clamp(
              s.y + s.h + dy,
              s.y + MIN_SIZE,
              imgBottom,
            );
            next.h = newBottom - s.y;
          }
        }

        setCropRect(next);
        reportCrop(next, img);
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [cropRect, imgLayout, reportCrop],
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ touchAction: "none" }}
    >
      {/* Image */}
      <img
        src={imageSrc}
        alt=""
        draggable={false}
        className="absolute select-none"
        style={
          imgLayout
            ? {
                left: imgLayout.left,
                top: imgLayout.top,
                width: imgLayout.width,
                height: imgLayout.height,
              }
            : { opacity: 0 }
        }
        onLoad={handleImageLoad}
      />

      {cropRect && (
        <>
          {/* Overlay (semi-transparent outside crop) */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: cropRect.x,
              top: cropRect.y,
              width: cropRect.w,
              height: cropRect.h,
              boxShadow: `0 0 0 9999px ${OVERLAY_COLOR}`,
              border: "3px solid #FACC15",
              zIndex: 10,
            }}
          />

          {/* Move area */}
          <div
            className="absolute cursor-move"
            style={{
              left: cropRect.x,
              top: cropRect.y,
              width: cropRect.w,
              height: cropRect.h,
              zIndex: 11,
              touchAction: "none",
            }}
            onPointerDown={startDrag("move")}
          />

          {/* Corner handles */}
          {CORNERS.map((h) => {
            const cx = h.includes("l") ? cropRect.x : cropRect.x + cropRect.w;
            const cy = h.includes("t") ? cropRect.y : cropRect.y + cropRect.h;
            const cursor =
              h === "tl" || h === "br" ? "nwse-resize" : "nesw-resize";
            return (
              <div
                key={h}
                className="absolute"
                style={{
                  left: cx - HANDLE_HIT / 2,
                  top: cy - HANDLE_HIT / 2,
                  width: HANDLE_HIT,
                  height: HANDLE_HIT,
                  cursor,
                  zIndex: 20,
                  touchAction: "none",
                }}
                onPointerDown={startDrag(h)}
              >
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-400 bg-white"
                  style={{ width: HANDLE_VISIBLE, height: HANDLE_VISIBLE }}
                />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  getCroppedImg helper                                              */
/* ------------------------------------------------------------------ */

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
