"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Eye, PlusCircle, X } from "@phosphor-icons/react";
import { BackButton } from "@/app/components/ui/BackButton";
import { cn } from "@/lib/utils/cn";
import { supabaseClient } from "@/lib/supabaseClient";
import { StudentAvatar } from "@/app/components/profile/StudentAvatar";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { withReturnUrl } from "@/lib/utils/adminNav";
import type { WorkoutGroup, WorkoutPlan } from "./types";
import { WorkoutRoutineCard } from "./WorkoutRoutineCard";

/** Espaçamento base: ícone ↔ borda e entre os 3 slots (fichas / olho / criar). */
export const WORKOUT_ACTION_GAP = "1.25rem";

interface StudentWorkoutsModalProps {
  group: WorkoutGroup;
  onClose: () => void;
  onView?: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

export function StudentWorkoutsModal({
  group,
  onClose,
  onEdit,
  onDelete,
}: StudentWorkoutsModalProps) {
  const [previewPlan, setPreviewPlan] = useState<WorkoutPlan | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const backToList = useCallback(() => {
    setPreviewPlan(null);
    setPreviewLoading(false);
  }, []);

  const handleView = useCallback(async (plan: WorkoutPlan) => {
    if (plan.tipo !== "digital") {
      if (plan.pdf_url) {
        window.open(plan.pdf_url, "_blank", "noopener,noreferrer");
      }
      return;
    }

    setPreviewPlan(plan);
    setPreviewLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("fichas_treino")
        .select("configuracao")
        .eq("id", plan.id)
        .single();
      if (error) throw error;
      setPreviewPlan({
        ...plan,
        configuracao: data?.configuracao ?? null,
      });
    } catch (err) {
      console.error(err);
      setPreviewPlan(plan);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Menu do card / modal de exclusão tratam o Escape primeiro
      if (document.querySelector('[role="menu"]')) return;
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs.length > 1) return;
      if (previewPlan) {
        backToList();
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, previewPlan, backToList]);

  const exercises =
    (previewPlan?.configuracao?.exercicios as Array<Record<string, unknown>>) ||
    [];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={
        previewPlan
          ? `Ficha ${previewPlan.nome_rotina}`
          : `Treinos de ${group.studentName}`
      }
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md max-h-[min(80vh,640px)] flex flex-col rounded-2xl border border-border-subtle bg-surface-1 shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden animate-sheet-up">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-divider/40 shrink-0">
          {previewPlan ? (
            <>
              <BackButton
                onClick={backToList}
                aria-label="Voltar para lista de treinos"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">
                  Ficha digital
                </p>
                <p className="text-sm font-semibold text-text-primary truncate">
                  {previewPlan.nome_rotina}
                </p>
              </div>
            </>
          ) : (
            <>
              <StudentAvatar
                name={group.studentName}
                avatarUrl={group.avatarUrl}
                colorClassName={group.avatarColor}
                sizeClassName="w-8 h-8 text-[11px]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {group.studentName}
                </p>
                <p className="text-[10px] text-text-tertiary">
                  {group.plans.length}{" "}
                  {group.plans.length === 1 ? "treino" : "treinos"}
                </p>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {previewPlan ? (
          <div className="flex-1 overflow-y-auto overscroll-contain p-3 flex flex-col gap-2.5 bg-surface-0/40">
            {previewLoading ? (
              <div className="flex justify-center py-10">
                <DumbbellLoader text="Carregando exercícios..." variant="inline" />
              </div>
            ) : exercises.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-8">
                Nenhum exercício cadastrado nesta ficha.
              </p>
            ) : (
              exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border-subtle/60 bg-surface-2/50 px-3.5 py-3 space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xs font-bold text-text-primary">
                      {idx + 1}. {String(ex.nome ?? "")}
                    </h4>
                    {ex.descanso ? (
                      <span className="text-[10px] text-text-tertiary font-mono bg-surface-3 px-1.5 py-0.5 rounded shrink-0">
                        Descanso: {String(ex.descanso)}
                      </span>
                    ) : null}
                  </div>
                  {ex.observacoes ? (
                    <p className="text-[11px] text-text-secondary italic">
                      Obs: {String(ex.observacoes)}
                    </p>
                  ) : null}
                  <div className="pt-2 border-t border-border-divider/40 space-y-1.5">
                    {Array.isArray(ex.series) &&
                      (ex.series as Array<Record<string, unknown>>).map(
                        (s, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex items-center gap-3 text-[11px] text-text-secondary font-medium flex-wrap"
                          >
                            <span className="w-5 h-5 rounded bg-brand/10 text-brand text-[9px] font-bold flex items-center justify-center shrink-0">
                              {String(s.ordem ?? sIdx + 1)}
                            </span>
                            <span>
                              {s.reps_sugerido
                                ? `${String(s.reps_sugerido)} reps`
                                : ""}
                              {s.tempo_sugerido
                                ? `${String(s.tempo_sugerido)} tempo`
                                : ""}
                              {s.distancia_sugerida
                                ? ` • ${String(s.distancia_sugerida)}m`
                                : ""}
                            </span>
                            {Boolean(s.tecnica || s.tecnica_extra) && (
                              <span className="text-[9px] uppercase font-bold text-brand tracking-wider bg-brand/5 px-1 rounded">
                                {[s.tecnica, s.tecnica_extra]
                                  .filter(Boolean)
                                  .map(String)
                                  .join(" + ")}
                              </span>
                            )}
                          </div>
                        ),
                      )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-contain p-3 flex flex-col gap-2.5 bg-surface-0/40">
            {group.plans.map((plan) => (
              <WorkoutRoutineCard
                key={plan.id}
                plan={plan}
                onView={handleView}
                onEdit={(p) => {
                  onClose();
                  onEdit(p);
                }}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

const floatingIconBtn =
  "inline-flex items-center justify-center border-0 bg-transparent p-0 text-brand hover:text-brand-hover transition-colors shrink-0 drop-shadow-[0_2px_6px_rgba(117, 27, 180,0.45)]";

/** Botão que abre o modal das fichas do aluno. */
export function StudentWorkoutsEyeButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(floatingIconBtn, className)}
      title="Abrir treinos"
      aria-label="Abrir treinos do aluno"
    >
      <Eye size={17} weight="bold" />
    </button>
  );
}

/** Atalho para criar ficha já vinculada ao aluno. */
export function StudentCreateFichaButton({
  studentId,
  className,
}: {
  studentId: string;
  className?: string;
}) {
  return (
    <Link
      href={withReturnUrl(
        `/admin/treinos/nova-ficha?alunoId=${studentId}`,
        "/admin/treinos",
      )}
      onClick={(e) => e.stopPropagation()}
      className={cn(floatingIconBtn, className)}
      title="Nova ficha para este aluno"
      aria-label="Criar ficha para este aluno"
    >
      <PlusCircle size={17} weight="bold" />
    </Link>
  );
}
