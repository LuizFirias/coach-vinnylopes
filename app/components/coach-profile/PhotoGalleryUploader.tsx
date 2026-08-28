"use client";

import { useRef, useState } from "react";
import { DotsSixVertical, Plus, Trash } from "@phosphor-icons/react";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import { cn } from "@/lib/utils/cn";

const MAX = 6;
const BUCKET = "coach-gallery";

type Props = {
  paths: string[];
  onChange: (paths: string[]) => void;
  coachId: string;
  onUploadError?: (msg: string) => void;
};

export function PhotoGalleryUploader({
  paths,
  onChange,
  coachId,
  onUploadError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const resolveUrl = (path: string) =>
    path.startsWith("blob:") || path.startsWith("data:")
      ? path
      : getPublicStorageUrl(BUCKET, path);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = MAX - paths.length;
    if (remaining <= 0) return;

    const slice = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const { supabaseClient } = await import("@/lib/supabaseClient");
      const uploaded: string[] = [];

      for (const file of slice) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${coachId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabaseClient.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) throw error;
        uploaded.push(path);
      }

      onChange([...paths, ...uploaded].slice(0, MAX));
    } catch (err: any) {
      onUploadError?.(err?.message || "Erro ao enviar foto");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = async (index: number) => {
    const path = paths[index];
    const next = paths.filter((_, i) => i !== index);
    onChange(next);
    if (!path.startsWith("blob:") && !path.startsWith("data:")) {
      try {
        const { supabaseClient } = await import("@/lib/supabaseClient");
        await supabaseClient.storage.from(BUCKET).remove([path]);
      } catch {
        // ignore cleanup errors
      }
    }
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = [...paths];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {paths.map((path, index) => {
          const url = resolveUrl(path);
          return (
            <div
              key={`${path}-${index}`}
              draggable
              onDragStart={() => setDragFrom(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom != null) reorder(dragFrom, index);
                setDragFrom(null);
              }}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border-0 bg-surface-2 group",
                dragFrom === index && "opacity-60",
              )}
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-surface-3" />
              )}
              <div className="absolute inset-x-0 top-0 flex justify-between p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <span className="w-7 h-7 rounded-md bg-black/50 text-white flex items-center justify-center cursor-grab">
                  <DotsSixVertical size={14} weight="bold" />
                </span>
                <button
                  type="button"
                  onClick={() => void removeAt(index)}
                  className="w-7 h-7 rounded-md bg-black/50 text-danger flex items-center justify-center touch-manipulation"
                  aria-label="Remover foto"
                >
                  <Trash size={14} />
                </button>
              </div>
              {index === 0 && (
                <span className="absolute bottom-1.5 left-1.5 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-black/55 text-white">
                  Capa
                </span>
              )}
            </div>
          );
        })}

        {paths.length < MAX && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "aspect-square rounded-lg border border-dashed border-divider",
              "bg-surface-2 text-text-secondary hover:border-brand/40 hover:text-brand",
              "flex flex-col items-center justify-center gap-1 text-[10px] font-medium touch-manipulation",
              uploading && "opacity-50",
            )}
          >
            <Plus size={18} weight="bold" />
            {uploading
              ? "Enviando…"
              : paths.length === 0
                ? "Capa"
                : "Adicionar"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <p className="mt-2 text-[10px] text-text-tertiary">
        Até {MAX} fotos · 1ª = capa · arraste para reordenar
      </p>
    </div>
  );
}
