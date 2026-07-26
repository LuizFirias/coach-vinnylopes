"use client";

import { Camera, Gear } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { getAvatarGradient } from "@/lib/utils/avatarColor";

interface ProfileHeaderProps {
  userId: string | null;
  fullName: string;
  memberSince: string;
  avatarSrc: string | null;
  initials: string;
  uploadingAvatar: boolean;
  isDesktop?: boolean;
  onSettingsClick: () => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileHeader({
  userId,
  fullName,
  memberSince,
  avatarSrc,
  initials,
  uploadingAvatar,
  isDesktop = false,
  onSettingsClick,
  onAvatarUpload,
}: ProfileHeaderProps) {
  const avatarSize = isDesktop ? "w-[72px] h-[72px] text-2xl" : "w-14 h-14 text-xl";

  return (
    <div className="flex items-start justify-between gap-3 pt-2 pb-5 lg:pt-0">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="relative shrink-0">
          <div
            className={cn(
              "rounded-full overflow-hidden flex items-center justify-center font-bold text-white bg-gradient-to-br",
              avatarSize,
              !avatarSrc && userId && getAvatarGradient(userId),
              !avatarSrc && !userId && "bg-surface-2"
            )}
          >
            {uploadingAvatar ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <label
            htmlFor="avatar-upload-main"
            className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] bg-surface-1 border border-surface-0 rounded-full flex items-center justify-center text-text-secondary cursor-pointer hover:text-text-primary transition-colors"
            aria-label="Alterar foto de perfil"
          >
            <Camera size={10} weight="bold" />
          </label>
          <input
            id="avatar-upload-main"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onAvatarUpload(e);
              e.target.value = "";
            }}
          />
        </div>

        <div className="min-w-0">
          <p
            className={cn(
              "font-bold text-text-primary leading-tight truncate",
              isDesktop ? "text-[22px]" : "text-lg"
            )}
          >
            {fullName || "Atleta"}
          </p>
          {memberSince && (
            <p
              className={cn(
                "text-text-muted mt-0.5",
                isDesktop ? "text-[13px]" : "text-xs"
              )}
            >
              Cliente desde {memberSince}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onSettingsClick}
        className="w-11 h-11 shrink-0 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors active:scale-95 cursor-pointer"
        title="Ajustes"
        aria-label="Abrir ajustes"
      >
        <Gear size={20} />
      </button>
    </div>
  );
}
