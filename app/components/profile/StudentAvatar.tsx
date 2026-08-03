"use client";

import { cn } from "@/lib/utils/cn";
import { getPublicStorageUrl } from "@/lib/storageUrls";

interface StudentAvatarProps {
  name: string;
  avatarUrl?: string | null;
  /** Classes de gradiente quando não há foto */
  colorClassName?: string;
  sizeClassName?: string;
  className?: string;
  alt?: string;
}

/**
 * Avatar circular. Fotos antigas foram exportadas com máscara circular + fundo preto
 * no JPEG — scale + clipPath cortam a auréola nas bordas.
 */
export function StudentAvatar({
  name,
  avatarUrl,
  colorClassName,
  sizeClassName = "w-7 h-7 text-[10px]",
  className,
  alt,
}: StudentAvatarProps) {
  const src = avatarUrl ? getPublicStorageUrl("avatars", avatarUrl) : null;
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-white bg-surface-1",
        sizeClassName,
        !src && "bg-gradient-to-br",
        !src && (colorClassName || "from-brand/60 to-brand/30"),
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? name}
          className="block w-full h-full object-cover border-0"
          style={{ transform: "scale(1.28)", transformOrigin: "center" }}
        />
      ) : (
        initial
      )}
    </div>
  );
}
