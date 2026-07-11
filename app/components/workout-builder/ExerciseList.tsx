"use client";

import { useState } from "react";
import { ExerciseCard } from "./ExerciseCard";
import { BiSetGroupCard } from "./BiSetGroupCard";
import type { ExercicioFicha } from "./types";
import type { ExercicioFichaItem, BiSetGroupFicha } from "@/lib/utils/biset";
import { isBiSetFichaItem } from "@/lib/utils/biset";

interface CatalogExercise {
  id: string;
  nome: string;
  grupo_muscular: string;
  tipo_exercicio?: string;
  video_url?: string;
}

interface ExerciseListProps {
  items: ExercicioFichaItem[];
  catalog: CatalogExercise[];
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
  onSelectBiSetPartner: (index: number, ex: CatalogExercise) => void;
  onSwapBiSetPartner: (index: number) => void;
  onUndoBiSet: (index: number) => void;
  onDeleteBiSet: (index: number) => void;
  onBiSetSerieToast?: () => void;
}

function itemKey(item: ExercicioFichaItem): string {
  if (isBiSetFichaItem(item)) return item.id;
  return item.instanceId;
}

export function ExerciseList({
  items,
  catalog,
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
  onSelectBiSetPartner,
  onSwapBiSetPartner,
  onUndoBiSet,
  onDeleteBiSet,
}: ExerciseListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDrop = (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    onReorder(dragIndex, toIndex);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2.5">
      {items.map((item, exIndex) => (
        <div
          key={itemKey(item)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverIndex(exIndex);
          }}
          onDragLeave={() => setDragOverIndex((i) => (i === exIndex ? null : i))}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(exIndex);
          }}
          className={dragOverIndex === exIndex && dragIndex !== exIndex ? "ring-2 ring-brand/30 rounded-xl" : ""}
        >
          {isBiSetFichaItem(item) ? (
            <BiSetGroupCard
              group={item}
              groupIndex={exIndex}
              catalog={catalog}
              isDragging={dragIndex === exIndex}
              dragHandleProps={{
                draggable: true,
                onDragStart: () => setDragIndex(exIndex),
                onDragEnd: () => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                },
              }}
              onUpdateDescanso={(d) => onUpdateBiSetDescanso(exIndex, d)}
              onUpdateHalf={(half, patch) => onUpdateBiSetHalf(exIndex, half, patch)}
              onUpdateSerie={(half, sIdx, field, val) => onUpdateBiSetSerie(exIndex, half, sIdx, field, val)}
              onAddSerie={() => onAddBiSetSerie(exIndex)}
              onRemoveSerie={(sIdx) => onRemoveBiSetSerie(exIndex, sIdx)}
              onSelectPartner={(ex) => onSelectBiSetPartner(exIndex, ex)}
              onSwapPartner={() => onSwapBiSetPartner(exIndex)}
              onUndoBiSet={() => onUndoBiSet(exIndex)}
              onDelete={() => onDeleteBiSet(exIndex)}
            />
          ) : (
            <ExerciseCard
              exercicio={item}
              exIndex={exIndex}
              isDragging={dragIndex === exIndex}
              dragHandleProps={{
                draggable: true,
                onDragStart: () => setDragIndex(exIndex),
                onDragEnd: () => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                },
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
      ))}
    </div>
  );
}
