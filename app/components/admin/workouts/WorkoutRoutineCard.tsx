"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  DotsThree,
  Eye,
  PencilSimple,
  Trash,
  FilePdf,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import type { WorkoutPlan } from "./types";
import { formatExerciseNamesLine } from "./workoutFormat";

interface WorkoutRoutineCardProps {
  plan: WorkoutPlan;
  onView: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  onDelete: (plan: WorkoutPlan) => void;
}

export function WorkoutRoutineCard({
  plan,
  onView,
  onEdit,
  onDelete,
}: WorkoutRoutineCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const subtitle = formatExerciseNamesLine(plan);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const openPrimary = () => {
    if (plan.tipo === "pdf" && plan.pdf_url) {
      window.open(plan.pdf_url, "_blank", "noopener,noreferrer");
      return;
    }
    onView(plan);
  };

  return (
    <div
      ref={cardRef}
      className="workout-routine-card relative rounded-2xl border border-black/6 bg-white px-4 py-3.5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={openPrimary}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-[15px] font-bold text-[#111827] leading-snug truncate">
            {plan.nome_rotina}
          </p>
          <p className="mt-1 text-[13px] text-[#6b7280] leading-snug truncate">
            {subtitle}
          </p>
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-[#6b7280] hover:text-[#111827] hover:bg-black/5 transition-colors"
            aria-label="Opções da rotina"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
          >
            <DotsThree size={22} weight="bold" />
          </button>

          {menuOpen && (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 top-full mt-1 z-40 min-w-[168px] rounded-xl border border-black/8 bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
            >
              {plan.tipo === "digital" ? (
                <>
                  <MenuItem
                    icon={<Eye size={16} />}
                    label="Ver ficha"
                    onClick={() => {
                      setMenuOpen(false);
                      onView(plan);
                    }}
                  />
                  <MenuItem
                    icon={<PencilSimple size={16} />}
                    label="Editar"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(plan);
                    }}
                  />
                </>
              ) : (
                <MenuItem
                  icon={<FilePdf size={16} />}
                  label="Ver PDF"
                  onClick={() => {
                    setMenuOpen(false);
                    if (plan.pdf_url) {
                      window.open(plan.pdf_url, "_blank", "noopener,noreferrer");
                    }
                  }}
                />
              )}
              <div className="my-1 h-px bg-border-divider/50" />
              <MenuItem
                icon={<Trash size={16} />}
                label="Excluir"
                danger
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(plan);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "w-full px-3 py-2.5 text-left text-[13px] font-medium flex items-center gap-2.5 transition-colors",
        danger
          ? "text-danger hover:bg-danger/10"
          : "text-[#111827] hover:bg-black/5",
      )}
    >
      <span className="opacity-80">{icon}</span>
      {label}
    </button>
  );
}
