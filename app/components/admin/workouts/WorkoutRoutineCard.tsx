"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

const MENU_MIN_WIDTH = 168;
const MENU_EST_HEIGHT = 148;

export function WorkoutRoutineCard({
  plan,
  onView,
  onEdit,
  onDelete,
}: WorkoutRoutineCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [openUp, setOpenUp] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const subtitle = formatExerciseNamesLine(plan);

  const reposition = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldOpenUp = spaceBelow < MENU_EST_HEIGHT + 8;
    setOpenUp(shouldOpenUp);
    setMenuPos({
      top: shouldOpenUp ? rect.top - 4 : rect.bottom + 4,
      left: Math.min(rect.right, window.innerWidth - 8),
    });
  };

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPos(null);
      return;
    }
    reposition();
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        btnRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      event.stopImmediatePropagation();
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [menuOpen]);

  const openPrimary = () => {
    if (plan.tipo === "pdf" && plan.pdf_url) {
      window.open(plan.pdf_url, "_blank", "noopener,noreferrer");
      return;
    }
    onView(plan);
  };

  const menu =
    menuOpen &&
    menuPos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        className="fixed z-[200] rounded-xl border border-black/8 bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
        style={{
          top: menuPos.top,
          left: menuPos.left,
          minWidth: MENU_MIN_WIDTH,
          transform: openUp ? "translate(-100%, -100%)" : "translateX(-100%)",
        }}
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
      </div>,
      document.body,
    );

  return (
    <div className="workout-routine-card relative rounded-2xl border-0 bg-surface-1 px-4 py-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={openPrimary}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-[15px] font-bold text-text-primary leading-snug truncate">
            {plan.nome_rotina}
          </p>
          <p className="mt-1 text-[13px] text-text-secondary leading-snug truncate">
            {subtitle}
          </p>
        </button>

        <div className="relative shrink-0">
          <button
            ref={btnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
            aria-label="Opções da rotina"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
          >
            <DotsThree size={22} weight="bold" />
          </button>
          {menu}
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
          : "text-text-primary hover:bg-surface-2",
      )}
    >
      <span className="opacity-80">{icon}</span>
      {label}
    </button>
  );
}
