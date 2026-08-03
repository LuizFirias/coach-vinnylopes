"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExerciseCard } from "./ExerciseCard";
import { BiSetGroupCard } from "./BiSetGroupCard";
import type { ExercicioFicha } from "./types";
import type { ExercicioFichaItem } from "@/lib/utils/biset";
import { isBiSetFichaItem } from "@/lib/utils/biset";
import { cn } from "@/lib/utils/cn";

interface ExerciseListProps {
  items: ExercicioFichaItem[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onUpdateSimple: (index: number, patch: Partial<ExercicioFicha>) => void;
  onDeleteSimple: (index: number) => void;
  onDuplicateSimple?: (index: number) => void;
  onAddSetSimple: (index: number) => void;
  onUpdateSerieSimple: (exIndex: number, serieIndex: number, field: string, value: unknown) => void;
  onDeleteSerieSimple: (exIndex: number, serieIndex: number) => void;
  onUpdateBiSetDescanso: (index: number, descanso: string) => void;
  onUpdateBiSetHalf: (index: number, half: "a" | "b", patch: { nome?: string; observacoes?: string }) => void;
  onUpdateBiSetSerie: (index: number, half: "a" | "b", serieIndex: number, field: string, value: unknown) => void;
  onAddBiSetSerie: (index: number) => void;
  onRemoveBiSetSerie: (index: number, serieIndex: number) => void;
  onSwapBiSetPartner: (index: number) => void;
  onRequestBiSetPartnerPick: (index: number) => void;
  onUndoBiSet: (index: number) => void;
  onDeleteBiSet: (index: number) => void;
  onBiSetSerieToast?: () => void;
}

type SlotLayout = { top: number; mid: number; height: number };

type ActiveDrag = {
  index: number;
  overIndex: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  x: number;
  y: number;
};

type PendingDrag = {
  index: number;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  originLeft: number;
  originTop: number;
};

/** gap do space-y-2.5 (10px) */
const LIST_GAP_PX = 10;
/** Só ativa o arraste depois deste deslocamento (evita clique acidental). */
const DRAG_ACTIVATION_PX = 10;
const SHIFT_EASE = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";

function itemKey(item: ExercicioFichaItem): string {
  if (isBiSetFichaItem(item)) return item.id;
  return item.instanceId;
}

/** Desloca vizinhos para abrir espaço no destino (comportamento tipo Hevy). */
function getShiftY(index: number, from: number, to: number, dragHeight: number): number {
  if (from === to || index === from) return 0;
  const delta = dragHeight + LIST_GAP_PX;
  if (from < to) {
    if (index > from && index <= to) return -delta;
  } else {
    if (index >= to && index < from) return delta;
  }
  return 0;
}

/**
 * Troca de posição só ao cruzar a metade de outro card.
 * Usa layout congelado no início do drag (ignora transforms) — evita bug no arraste para cima.
 */
function overIndexFromMidpoints(
  centerY: number,
  from: number,
  layout: SlotLayout[],
): number {
  let overIndex = from;

  for (let i = from + 1; i < layout.length; i++) {
    if (centerY > layout[i].mid) overIndex = i;
    else break;
  }

  for (let i = from - 1; i >= 0; i--) {
    if (centerY < layout[i].mid) overIndex = i;
    else break;
  }

  return overIndex;
}

export function ExerciseList({
  items,
  onReorder,
  onUpdateSimple,
  onDeleteSimple,
  onDuplicateSimple,
  onAddSetSimple,
  onUpdateSerieSimple,
  onDeleteSerieSimple,
  onUpdateBiSetDescanso,
  onUpdateBiSetHalf,
  onUpdateBiSetSerie,
  onAddBiSetSerie,
  onRemoveBiSetSerie,
  onSwapBiSetPartner,
  onRequestBiSetPartnerPick,
  onUndoBiSet,
  onDeleteBiSet,
}: ExerciseListProps) {
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const slotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const pendingDragRef = useRef<PendingDrag | null>(null);
  const layoutRef = useRef<SlotLayout[]>([]);
  const onReorderRef = useRef(onReorder);

  activeDragRef.current = activeDrag;
  onReorderRef.current = onReorder;

  const captureLayout = useCallback(() => {
    layoutRef.current = items.map((_, i) => {
      const el = slotRefs.current[i];
      if (!el) return { top: 0, mid: 0, height: 0 };
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top,
        mid: rect.top + rect.height / 2,
        height: rect.height,
      };
    });
  }, [items]);

  const clearPending = useCallback(() => {
    pendingDragRef.current = null;
  }, []);

  const activateDrag = useCallback((pending: PendingDrag, clientX: number, clientY: number) => {
    captureLayout();
    const next: ActiveDrag = {
      index: pending.index,
      overIndex: pending.index,
      offsetX: pending.offsetX,
      offsetY: pending.offsetY,
      width: pending.width,
      height: pending.height,
      x: clientX - pending.offsetX,
      y: clientY - pending.offsetY,
    };
    pendingDragRef.current = null;
    activeDragRef.current = next;
    setActiveDrag(next);
  }, [captureLayout]);

  const startPointer = useCallback((index: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const slot = slotRefs.current[index];
    if (!slot) return;

    const rect = slot.getBoundingClientRect();
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    pendingDragRef.current = {
      index,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      originLeft: rect.left,
      originTop: rect.top,
    };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const pending = pendingDragRef.current;
      const drag = activeDragRef.current;

      if (pending && !drag) {
        const dx = e.clientX - pending.startClientX;
        const dy = e.clientY - pending.startClientY;
        if (Math.hypot(dx, dy) < DRAG_ACTIVATION_PX) return;
        activateDrag(pending, e.clientX, e.clientY);
        return;
      }

      if (!drag) return;
      e.preventDefault();

      const x = e.clientX - drag.offsetX;
      const y = e.clientY - drag.offsetY;
      const centerY = y + drag.height / 2;
      const overIndex = overIndexFromMidpoints(centerY, drag.index, layoutRef.current);

      if (x === drag.x && y === drag.y && overIndex === drag.overIndex) return;

      const next = { ...drag, x, y, overIndex };
      activeDragRef.current = next;
      setActiveDrag(next);
    };

    const onUp = () => {
      const drag = activeDragRef.current;
      if (drag) {
        if (drag.index !== drag.overIndex) {
          onReorderRef.current(drag.index, drag.overIndex);
        }
        activeDragRef.current = null;
        setActiveDrag(null);
      }
      clearPending();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [activateDrag, clearPending]);

  useEffect(() => {
    if (!activeDrag) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [activeDrag?.index]);

  return (
    <div className="space-y-2.5">
      {items.map((item, exIndex) => {
        const isActive = activeDrag?.index === exIndex;
        const shiftY =
          activeDrag != null
            ? getShiftY(exIndex, activeDrag.index, activeDrag.overIndex, activeDrag.height)
            : 0;

        return (
          <div
            key={itemKey(item)}
            ref={(el) => {
              slotRefs.current[exIndex] = el;
            }}
            className="relative"
            style={
              isActive
                ? { height: activeDrag.height }
                : {
                    transform: shiftY ? `translateY(${shiftY}px)` : undefined,
                    transition: SHIFT_EASE,
                    zIndex: shiftY ? 1 : undefined,
                  }
            }
          >
            {isActive && (
              <div
                aria-hidden
                className="absolute inset-0 rounded-xl border border-dashed border-brand/40 bg-brand/5"
              />
            )}
            <div
              className={cn(isActive && "fixed z-50 pointer-events-none will-change-transform")}
              style={
                isActive
                  ? {
                      left: activeDrag.x,
                      top: activeDrag.y,
                      width: activeDrag.width,
                      transform: "scale(1.02)",
                      boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                      transition: "box-shadow 180ms ease",
                    }
                  : undefined
              }
            >
              {isBiSetFichaItem(item) ? (
                <BiSetGroupCard
                  group={item}
                  groupIndex={exIndex}
                  isDragging={isActive}
                  dragHandleProps={{
                    onPointerDown: (e) => startPointer(exIndex, e),
                  }}
                  onUpdateDescanso={(d) => onUpdateBiSetDescanso(exIndex, d)}
                  onUpdateHalf={(half, patch) => onUpdateBiSetHalf(exIndex, half, patch)}
                  onUpdateSerie={(half, sIdx, field, val) =>
                    onUpdateBiSetSerie(exIndex, half, sIdx, field, val)
                  }
                  onAddSerie={() => onAddBiSetSerie(exIndex)}
                  onRemoveSerie={(sIdx) => onRemoveBiSetSerie(exIndex, sIdx)}
                  onSwapPartner={() => onSwapBiSetPartner(exIndex)}
                  onRequestPickPartner={() => onRequestBiSetPartnerPick(exIndex)}
                  onUndoBiSet={() => onUndoBiSet(exIndex)}
                  onDelete={() => onDeleteBiSet(exIndex)}
                />
              ) : (
                <ExerciseCard
                  exercicio={item}
                  exIndex={exIndex}
                  isDragging={isActive}
                  dragHandleProps={{
                    onPointerDown: (e) => startPointer(exIndex, e),
                  }}
                  onUpdate={onUpdateSimple}
                  onDelete={onDeleteSimple}
                  onDuplicate={onDuplicateSimple}
                  onAddSet={onAddSetSimple}
                  onUpdateSerie={onUpdateSerieSimple}
                  onDeleteSerie={onDeleteSerieSimple}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
