"use client";

import { cn } from "@/lib/utils/cn";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import { mascoteSrc, isMascoteSrc } from "@/lib/utils/mascote";

function resolvePhotoSrc(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  if (
    avatarUrl.startsWith("data:") ||
    avatarUrl.startsWith("blob:") ||
    avatarUrl.startsWith("http://") ||
    avatarUrl.startsWith("https://") ||
    avatarUrl.startsWith("/")
  ) {
    return avatarUrl;
  }
  return getPublicStorageUrl("avatars", avatarUrl);
}

interface StudentAvatarProps {
  name: string;
  avatarUrl?: string | null;
  sexo?: string | null;
  /** Mantido por compatibilidade — o fallback agora é o mascote. */
  colorClassName?: string;
  sizeClassName?: string;
  className?: string;
  alt?: string;
  uploading?: boolean;
}

/** Foto quadrada (cantos levemente arredondados). Sem foto, mostra o mascote. */
export function StudentAvatar({
  name,
  avatarUrl,
  sexo,
  sizeClassName = "w-7 h-7",
  className,
  alt,
  uploading,
}: StudentAvatarProps) {
  const photo = resolvePhotoSrc(avatarUrl);
  const src = photo || mascoteSrc(sexo);
  const isMascote = isMascoteSrc(src);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-white",
        sizeClassName,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? name}
        className={cn(
          "block h-full w-full object-cover object-center",
          isMascote && "opacity-60",
        )}
      />
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
        </div>
      )}
    </div>
  );
}
