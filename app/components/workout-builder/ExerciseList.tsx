"use client";

import { useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { ExerciseCard } from "./ExerciseCard";
import { BiSetGroupCard } from "./BiSetGroupCard";
import type { ExercicioFicha } from "./types";
import type { ExercicioFichaItem } from "@/lib/utils/biset";
import { isBiSetFichaItem } from "@/lib/utils/biset";

interface ExerciseListProps {
  items: ExercicioFichaItem[];
  onReorder: (items: ExercicioFichaItem[]) => void;
  onUpdateSimple: (index: number, patch: Partial<ExercicioFicha>) => void;
  onDeleteSimple: (index: number) => void;
  onDuplicateSimple?: (index: number) => void;
  onAddSetSimple: (index: number) => void;
  onUpdateSerieSimple: (exIndex: number, serieIndex: number, field: string, value: unknown) => void;
  onDeleteSerieSimple: (exIndex: number, serieIndex: number) => void;
  onUpdateClusterDescanso?: (exIndex: number, segundos: number) => void;
  onUpdateMyoDescanso?: (exIndex: number, segundos: number) => void;
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

function itemKey(item: ExercicioFichaItem): string {
  if (isBiSetFichaItem(item)) return item.id;
  return item.instanceId;
}

interface RowProps extends Omit<ExerciseListProps, "items" | "onReorder"> {
  item: ExercicioFichaItem;
  exIndex: number;
}

/** Uma linha da lista — arrastável via Reorder.Item (framer-motion). O
 *  handle (ícone de 6 pontinhos) inicia o drag manualmente por cima do
 *  dragControls, então o resto do card continua clicável normalmente. */
function ExerciseListRow({
  item,
  exIndex,
  onUpdateSimple,
  onDeleteSimple,
  onAddSetSimple,
  onUpdateSerieSimple,
  onDeleteSerieSimple,
  onUpdateClusterDescanso,
  onUpdateMyoDescanso,
  onUpdateBiSetDescanso,
  onUpdateBiSetHalf,
  onUpdateBiSetSerie,
  onAddBiSetSerie,
  onRemoveBiSetSerie,
  onSwapBiSetPartner,
  onRequestBiSetPartnerPick,
  onUndoBiSet,
  onDeleteBiSet,
}: RowProps) {
  const dragControls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);

  return (
    <Reorder.Item
      as="div"
      value={item}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      whileDrag={{ scale: 1.02, boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}
      className="relative"
      style={{ zIndex: isDragging ? 20 : undefined, position: "relative" }}
    >
      {isBiSetFichaItem(item) ? (
        <BiSetGroupCard
          group={item}
          groupIndex={exIndex}
          isDragging={isDragging}
          dragHandleProps={{
            onPointerDown: (e) => dragControls.start(e),
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
          isDragging={isDragging}
          dragHandleProps={{
            onPointerDown: (e) => dragControls.start(e),
          }}
          onUpdate={onUpdateSimple}
          onDelete={onDeleteSimple}
          onAddSet={onAddSetSimple}
          onUpdateSerie={onUpdateSerieSimple}
          onDeleteSerie={onDeleteSerieSimple}
          onUpdateClusterDescanso={onUpdateClusterDescanso}
          onUpdateMyoDescanso={onUpdateMyoDescanso}
        />
      )}
    </Reorder.Item>
  );
}

export function ExerciseList({ items, onReorder, ...rowHandlers }: ExerciseListProps) {
  return (
    <Reorder.Group as="div" axis="y" values={items} onReorder={onReorder} className="space-y-2.5">
      {items.map((item, exIndex) => (
        <ExerciseListRow key={itemKey(item)} item={item} exIndex={exIndex} {...rowHandlers} />
      ))}
    </Reorder.Group>
  );
}
