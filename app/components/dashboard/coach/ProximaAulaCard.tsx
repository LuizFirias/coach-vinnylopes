"use client";

import Link from "next/link";
import { CalendarPlus, MapPin, VideoCamera } from "@phosphor-icons/react";
import { StudentAvatar } from "@/app/components/profile/StudentAvatar";
import { cn } from "@/lib/utils/cn";
import type { AulaAgenda } from "@/lib/agenda/queries";

interface ProximaAulaCardProps {
  aula: AulaAgenda | null;
  className?: string;
}

function formatDiaHora(iso: string): string {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia} | ${hora}`;
}

export function ProximaAulaCard({ aula, className }: ProximaAulaCardProps) {
  const nome = aula?.aluno?.coaching_reference || aula?.aluno?.full_name || null;

  return (
    <div className={cn("flex flex-col", className)}>
      <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        Próxima aula
      </h2>

      <div
        className={cn(
          "relative rounded-2xl border-0 bg-[#F4EBFC] p-4",
          !aula && "bg-surface-1",
        )}
      >
        <div className="flex items-center gap-3">
          <StudentAvatar
            name={nome ?? ""}
            avatarUrl={aula?.aluno?.avatar_url}
            sexo={aula?.aluno?.sexo}
            sizeClassName="h-12 w-12"
            className={cn(!aula && "opacity-40")}
          />
          <div className="min-w-0 flex-1">
            {/* Sem aula marcada: nome fica em branco de propósito (estado "fantasma") */}
            <p
              className={cn(
                "truncate text-sm font-semibold text-text-primary",
                !aula && "opacity-0",
              )}
            >
              {nome || "—"}
            </p>
            <p
              className={cn(
                "mt-0.5 flex items-center gap-1.5 text-xs capitalize text-text-tertiary",
                !aula && "opacity-40",
              )}
            >
              {aula ? (
                <>
                  {formatDiaHora(aula.data_hora)}
                  <span className="text-text-disabled">·</span>
                  {aula.local_tipo === "online" ? (
                    <VideoCamera size={12} className="shrink-0" />
                  ) : (
                    <MapPin size={12} className="shrink-0" />
                  )}
                </>
              ) : (
                "14 de agosto | 18:00"
              )}
            </p>
          </div>
        </div>

        <Link
          href="/admin/agenda"
          className={cn(
            "auron-cta-btn mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-semibold",
            !aula && "opacity-70",
          )}
        >
          {aula ? (
            "Ver agenda"
          ) : (
            <>
              <CalendarPlus size={16} weight="bold" /> Agendar aula
            </>
          )}
        </Link>

        {!aula && (
          <span className="absolute right-3 top-3 rounded-full bg-surface-2 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-disabled">
            Exemplo
          </span>
        )}
      </div>
    </div>
  );
}
