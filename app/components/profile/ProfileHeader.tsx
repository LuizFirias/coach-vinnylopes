"use client";

import { Camera, Gear } from "@phosphor-icons/react";
import { StudentAvatar } from "@/app/components/profile/StudentAvatar";

interface ProfileHeaderProps {
  userId: string | null;
  fullName: string;
  memberSince: string;
  avatarSrc: string | null;
  sexo?: string | null;
  initials: string;
  uploadingAvatar: boolean;
  isDesktop?: boolean;
  onSettingsClick: () => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileHeader({
  fullName,
  memberSince,
  avatarSrc,
  sexo,
  uploadingAvatar,
  isDesktop = false,
  onSettingsClick,
  onAvatarUpload,
}: ProfileHeaderProps) {
  const avatarSize = isDesktop ? "w-[72px] h-[72px]" : "w-14 h-14";

  return (
    <div className="flex items-start justify-between gap-3 pt-2 pb-5 lg:pt-0">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="relative shrink-0">
          <StudentAvatar
            name={fullName}
            avatarUrl={avatarSrc}
            sexo={sexo}
            sizeClassName={avatarSize}
            uploading={uploadingAvatar}
          />
          <label
            htmlFor="avatar-upload-header"
            className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] bg-surface-1 border border-surface-0 rounded-md flex items-center justify-center text-text-secondary cursor-pointer hover:text-text-primary transition-colors"
          >
            <Camera size={10} weight="bold" />
          </label>
          <input
            id="avatar-upload-header"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarUpload}
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-text-primary truncate leading-tight">
            {fullName || "Atleta"}
          </h1>
          {memberSince ? (
            <p className="text-[11px] text-text-tertiary mt-0.5">Membro desde {memberSince}</p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onSettingsClick}
        className="w-11 h-11 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors touch-manipulation"
        aria-label="Configurações"
      >
        <Gear size={20} />
      </button>
    </div>
  );
}
