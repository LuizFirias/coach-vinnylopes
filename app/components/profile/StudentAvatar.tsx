"use client";

import { cn } from "@/lib/utils/cn";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import { getInitials, getAvatarColor } from "@/lib/utils/initialsAvatar";

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
  /** Mantido por compatibilidade — sem efeito (o fallback são as iniciais). */
  colorClassName?: string;
  sizeClassName?: string;
  className?: string;
  alt?: string;
  uploading?: boolean;
}

/** Foto quadrada (cantos levemente arredondados). Sem foto, mostra as
 *  iniciais do nome sobre um fundo colorido (cor fixa por pessoa). */
export function StudentAvatar({
  name,
  avatarUrl,
  sizeClassName = "w-7 h-7",
  className,
  alt,
  uploading,
}: StudentAvatarProps) {
  const photo = resolvePhotoSrc(avatarUrl);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-white",
        sizeClassName,
        className,
      )}
      style={{ containerType: "size" }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={alt ?? name}
          className="block h-full w-full object-cover object-center"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-bold text-white"
          style={{ background: getAvatarColor(name), fontSize: "42cqmin" }}
          aria-label={alt ?? name}
        >
          {getInitials(name)}
        </div>
      )}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
        </div>
      )}
    </div>
  );
}
