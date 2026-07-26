"use client";

import {
  MapPin,
  IdentificationCard,
  Users,
  CheckCircle,
} from "@phosphor-icons/react";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import { COACH_MODALITIES, type CoachPublicProfileForm } from "@/lib/coach/publicProfile";
import { cn } from "@/lib/utils/cn";

type Props = {
  form: CoachPublicProfileForm;
  fullName: string;
  avatarUrl: string | null;
  activeStudents: number | null;
  coachSinceYear: number | null;
  compact?: boolean;
};

export function PublicProfilePreviewCard({
  form,
  fullName,
  avatarUrl,
  activeStudents,
  coachSinceYear,
  compact,
}: Props) {
  const cover =
    form.galleryPaths[0] != null
      ? getPublicStorageUrl("coach-gallery", form.galleryPaths[0])
      : null;
  const avatar = avatarUrl
    ? avatarUrl.startsWith("data:") || avatarUrl.startsWith("blob:")
      ? avatarUrl
      : getPublicStorageUrl("avatars", avatarUrl)
    : null;
  const modalityLabel = COACH_MODALITIES.find((m) => m.value === form.modality)?.label;
  const location =
    form.city && form.state
      ? `${form.city}, ${form.state}`
      : form.city || form.state || null;

  if (compact) {
    return (
      <div className="rounded-xl border border-card bg-surface-1 p-3 flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-3 shrink-0 flex items-center justify-center">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-text-tertiary">
              {fullName?.charAt(0)?.toUpperCase() || "C"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-text-primary truncate">
              {fullName || "Seu nome"}
            </p>
            {form.disponivelNoMercado && (
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-success/15 text-success">
                Mercado
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-secondary truncate">
            {form.headline || "Headline profissional"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-card bg-surface-1 overflow-hidden shadow-sm">
      <div className="relative h-36 bg-surface-3">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface-3 to-surface-2" />
        )}
        <div className="absolute -bottom-8 left-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-surface-1 bg-surface-3 flex items-center justify-center">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-text-tertiary">
                {fullName?.charAt(0)?.toUpperCase() || "C"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-10 px-4 pb-4">
        <div
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide mb-2",
            form.disponivelNoMercado ? "text-success" : "text-text-tertiary",
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              form.disponivelNoMercado ? "bg-success" : "bg-text-tertiary",
            )}
          />
          {form.disponivelNoMercado
            ? form.aceitandoNovosAlunos
              ? "Disponível no Mercado"
              : "Visível · vagas fechadas"
            : "Oculto no Mercado"}
        </div>

        <h3 className="text-base font-bold text-text-primary leading-tight">
          {fullName || "Seu nome"}
        </h3>
        {form.handle ? (
          <p className="text-xs text-brand font-medium mt-0.5">@{form.handle}</p>
        ) : (
          <p className="text-xs text-text-tertiary mt-0.5">@seu_instagram</p>
        )}
        <p className="text-xs text-text-secondary mt-2 leading-snug">
          {form.headline || "Sua headline profissional aparece aqui"}
        </p>

        {form.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {form.specialties.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-3 text-text-secondary border border-card"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-1.5 text-[11px] text-text-secondary">
          {location && (
            <p className="flex items-center gap-1.5">
              <MapPin size={12} className="text-text-tertiary shrink-0" />
              {location}
              {modalityLabel ? ` · ${modalityLabel}` : ""}
            </p>
          )}
          {form.cref && (
            <p className="flex items-center gap-1.5">
              <IdentificationCard size={12} className="text-text-tertiary shrink-0" />
              CREF {form.cref}
            </p>
          )}
          {form.showStudentCount && activeStudents != null && (
            <p className="flex items-center gap-1.5">
              <Users size={12} className="text-text-tertiary shrink-0" />
              {activeStudents} aluno{activeStudents === 1 ? "" : "s"} ativo
              {activeStudents === 1 ? "" : "s"}
            </p>
          )}
          {coachSinceYear && (
            <p className="flex items-center gap-1.5">
              <CheckCircle size={12} className="text-text-tertiary shrink-0" />
              Coach desde {coachSinceYear}
            </p>
          )}
          {form.priceDisplay && (
            <p className="text-brand font-medium pt-1">{form.priceDisplay}</p>
          )}
        </div>
      </div>
    </div>
  );
}
