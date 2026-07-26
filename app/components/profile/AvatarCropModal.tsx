"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import {
  exportAvatarCrop,
  getCoverScale,
} from "@/lib/utils/cropAvatar";

const CROP_SIZE = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface AvatarCropModalProps {
  imageSrc: string;
  open: boolean;
  confirming?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
}

export function AvatarCropModal({
  imageSrc,
  open,
  confirming = false,
  onCancel,
  onConfirm,
}: AvatarCropModalProps) {
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImgSize(null);

    const img = new Image();
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      const base = getCoverScale(img.naturalWidth, img.naturalHeight, CROP_SIZE);
      const displayW = img.naturalWidth * base;
      const displayH = img.naturalHeight * base;
      setOffset({
        x: (CROP_SIZE - displayW) / 2,
        y: (CROP_SIZE - displayH) / 2,
      });
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  const baseScale = imgSize
    ? getCoverScale(imgSize.w, imgSize.h, CROP_SIZE)
    : 1;
  const scale = baseScale * zoom;

  const clampOffset = useCallback(
    (x: number, y: number, nextZoom: number) => {
      if (!imgSize) return { x, y };
      const s = getCoverScale(imgSize.w, imgSize.h, CROP_SIZE) * nextZoom;
      const dw = imgSize.w * s;
      const dh = imgSize.h * s;
      const minX = CROP_SIZE - dw;
      const minY = CROP_SIZE - dh;
      return {
        x: Math.min(0, Math.max(minX, x)),
        y: Math.min(0, Math.max(minY, y)),
      };
    },
    [imgSize]
  );

  const applyZoom = useCallback(
    (nextZoom: number, originX = CROP_SIZE / 2, originY = CROP_SIZE / 2) => {
      if (!imgSize) return;
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      const oldScale = getCoverScale(imgSize.w, imgSize.h, CROP_SIZE) * zoom;
      const newScale = getCoverScale(imgSize.w, imgSize.h, CROP_SIZE) * z;
      // Mantém o ponto sob o cursor/centro ao dar zoom
      const imgX = (originX - offset.x) / oldScale;
      const imgY = (originY - offset.y) / oldScale;
      const nx = originX - imgX * newScale;
      const ny = originY - imgY * newScale;
      setZoom(z);
      setOffset(clampOffset(nx, ny, z));
    },
    [imgSize, zoom, offset, clampOffset]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (confirming) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(
      clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy, zoom)
    );
  };

  const onPointerUp = () => {
    setDragging(false);
    dragStart.current = null;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchStart.current = { dist, zoom };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist / pinchStart.current.dist;
      applyZoom(pinchStart.current.zoom * ratio);
    }
  };

  const onTouchEnd = () => {
    pinchStart.current = null;
  };

  const handleConfirm = async () => {
    if (!imgSize || confirming) return;
    const blob = await exportAvatarCrop(imageSrc, {
      offsetX: offset.x,
      offsetY: offset.y,
      scale,
      cropSize: CROP_SIZE,
      imageWidth: imgSize.w,
      imageHeight: imgSize.h,
    });
    await onConfirm(blob);
  };

  if (!open) return null;

  const displayW = imgSize ? imgSize.w * scale : 0;
  const displayH = imgSize ? imgSize.h * scale : 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={confirming ? undefined : onCancel}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-crop-title"
        className="relative w-full max-w-[360px] rounded-2xl border border-card bg-surface-1 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
          <h2 id="avatar-crop-title" className="text-sm font-bold text-text-primary">
            Posicionar foto
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary disabled:opacity-40"
            aria-label="Cancelar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pt-5 pb-3 flex flex-col items-center gap-4">
          <p className="text-[11px] text-text-secondary text-center leading-relaxed">
            Arraste para posicionar · use o zoom para ajustar
          </p>

          <div
            ref={viewportRef}
            className={cn(
              "relative select-none touch-none overflow-hidden rounded-full bg-[#0d0d0d]",
              "ring-2 ring-brand/40",
              dragging ? "cursor-grabbing" : "cursor-grab"
            )}
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {imgSize ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt=""
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  width: displayW,
                  height: displayH,
                  left: offset.x,
                  top: offset.y,
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
              </div>
            )}
            {/* máscara sutil nas bordas */}
            <div
              className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10"
              aria-hidden
            />
          </div>

          <div className="w-full flex items-center gap-3 px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted shrink-0">
              Zoom
            </span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={!imgSize || confirming}
              onChange={(e) => applyZoom(parseFloat(e.target.value))}
              className="flex-1 accent-brand h-1.5 cursor-pointer disabled:opacity-40"
              aria-label="Zoom da foto"
            />
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-4 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 h-11 rounded-[10px] bg-surface-2 border border-card text-sm font-semibold text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!imgSize || confirming}
            className="flex-1 h-11 rounded-[10px] bg-brand text-text-on-brand text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {confirming ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando…
              </>
            ) : (
              "Confirmar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
