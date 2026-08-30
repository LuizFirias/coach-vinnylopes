"use client";

import { Trash } from "@phosphor-icons/react";
import TimeInput from "@/app/components/TimeInput";
import { TechniqueCell } from "./TechniqueCell";
import { RepsField } from "./RepsField";
import { InfoHint } from "./InfoHint";
import { isIsometria } from "@/lib/constants/workout-techniques";
import type { ColunaSerie, SerieDefinicao } from "./types";
import { cn } from "@/lib/utils/cn";

interface SetRowProps {
  serie: SerieDefinicao;
  serieIndex: number;
  colunas: ColunaSerie[];
  showPeso?: boolean;
  /** Bi-set já é uma técnica em si — some com a coluna Téc (tecnica_extra) para não misturar. */
  showExtra?: boolean;
  /** Maior nº de blocos de Cluster Set entre as séries do exercício — larga a
   *  coluna de reps o suficiente pra caber, empurrando kg/téc pro lado, e
   *  mantém todas as linhas da tabela alinhadas na mesma largura. */
  maxClusterBlocos?: number;
  onChange: (field: string, value: unknown) => void;
  onDelete: () => void;
}

// Contorno leve + fundo normal (padrão Hevy) — dá pra ver que o campo é
// editável sem parecer só texto solto.
const cellInputCls =
  "serie-metric-input w-full h-8 bg-surface-2 border border-border-subtle rounded-md text-center text-sm font-medium text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand focus:text-brand tabular-nums lining-nums shadow-none";

function gridTemplate(colunas: ColunaSerie[], showPeso: boolean, showExtra: boolean, maxClusterBlocos: number = 1): string {
  // Largura FIXA (não minmax/auto) — cada linha da tabela é uma grid
  // independente; com "auto" cada uma cresceria só até caber o próprio
  // conteúdo, e a coluna (e o título dela) desalinhava entre as linhas.
  // Fixo garante a mesma largura pro cabeçalho e todas as séries juntos.
  const metricCols = colunas
    .map((col) =>
      col.key === "reps_sugerido" && maxClusterBlocos > 1
        ? `${maxClusterBlocos * 2.75 + 3}rem`
        : "minmax(2.75rem,3.5rem)",
    )
    .join(" ");
  // "0.5rem" — espaçador fixo (nem todo mundo usa o mesmo `gap`) entre
  // Set→Reps e Reps→kg; cada um precisa de uma célula vazia correspondente
  // no JSX (ver <span aria-hidden /> abaixo), senão o grid preenche esse
  // espaço com a próxima coluna de verdade em vez de deixar vazio.
  const parts = ["2.25rem", "0.5rem", metricCols];
  // Reserva o espaço do kg mesmo sem peso (ex.: exercício de peso corporal)
  // sempre que tiver Téc depois — senão Téc "andaria" pra esquerda quando o
  // exercício não usa kg, mudando de lugar em relação aos outros.
  if (showPeso || showExtra) parts.push("0.5rem", "minmax(2.5rem,3.5rem)");
  if (showExtra) {
    // Espaço ~10% antes de Téc (empurra a coluna para a direita) — igual já era.
    parts.push("10%", "minmax(2.5rem,1.1fr)");
    parts.push("1.25rem");
  } else {
    // Sem Téc pra absorver a sobra (bi-set) — o espaço livre vai ANTES da
    // lixeira, senão ela "flutua" no meio da linha em vez de ficar no fim.
    parts.push("minmax(0,1fr)");
    parts.push("1.25rem");
  }
  return parts.join(" ");
}

export function SetRow({
  serie,
  serieIndex,
  colunas,
  showPeso = false,
  showExtra = true,
  maxClusterBlocos = 1,
  onChange,
  onDelete,
}: SetRowProps) {
  const serieRecord = serie as unknown as Record<string, unknown>;

  return (
    <div
      className="grid gap-1 items-center py-1 border-b border-border-divider/40 last:border-0"
      style={{ gridTemplateColumns: gridTemplate(colunas, showPeso, showExtra, maxClusterBlocos) }}
    >
      <TechniqueCell
        type="technique"
        value={serie.tecnica ?? ""}
        onChange={(v) => onChange("tecnica", v)}
        fallback={String(serie.ordem ?? serieIndex + 1)}
        className="tabular-nums lining-nums text-brand!"
      />

      <span aria-hidden className="block" />

      {colunas.map((col) =>
        col.key === "reps_sugerido" && isIsometria(serie) ? (
          // Isometria é por série — só essa linha vira Tempo, sem afetar as outras do exercício
          <TimeInput
            key={col.key}
            value={String(serieRecord["tempo_sugerido"] ?? "00:00")}
            onChange={(v) => onChange("tempo_sugerido", v)}
            className={cn(cellInputCls, "text-center")}
          />
        ) : col.key === "reps_sugerido" ? (
          <RepsField key={col.key} serie={serie} placeholder={col.placeholder} onChange={onChange} />
        ) : col.timeInput ? (
          <TimeInput
            key={col.key}
            value={String(serieRecord[col.key] ?? "00:00")}
            onChange={(v) => onChange(col.key, v)}
            className={cn(cellInputCls, "text-center")}
          />
        ) : col.type === "number" ? (
          <input
            key={col.key}
            type="number"
            step={col.step}
            placeholder={col.placeholder}
            value={serieRecord[col.key] != null && serieRecord[col.key] !== "" ? String(serieRecord[col.key]) : ""}
            onChange={(e) => onChange(col.key, e.target.value === "" ? null : Number(e.target.value))}
            className={cellInputCls}
          />
        ) : (
          <input
            key={col.key}
            type="text"
            inputMode={col.key === "reps_sugerido" ? "numeric" : "text"}
            placeholder={col.placeholder}
            value={String(serieRecord[col.key] ?? "")}
            onChange={(e) => onChange(col.key, e.target.value)}
            className={cellInputCls}
          />
        )
      )}

      {(showPeso || showExtra) && (
        <>
          <span aria-hidden className="block" />
          {showPeso ? (
            <input
              type="number"
              step="0.5"
              placeholder="—"
              value={serie.peso_sugerido != null && serie.peso_sugerido > 0 ? String(serie.peso_sugerido) : ""}
              onChange={(e) => {
                const raw = e.target.value;
                onChange("peso_sugerido", raw === "" ? null : Number(raw));
              }}
              className={cn(cellInputCls, "max-w-14 mx-auto")}
              aria-label="Peso sugerido (kg)"
            />
          ) : (
            // Sem kg (ex.: peso corporal) — mantém o lugar reservado vazio,
            // pra Téc não mudar de posição.
            <span aria-hidden className="block" />
          )}
        </>
      )}

      {showExtra && (
        <>
          <span aria-hidden className="block" />

          <TechniqueCell
            type="extra"
            value={serie.tecnica_extra ?? ""}
            onChange={(v) => onChange("tecnica_extra", v)}
          />
        </>
      )}

      <button
        type="button"
        onClick={onDelete}
        className="flex items-center justify-center text-text-tertiary hover:text-danger transition-colors min-h-[32px] min-w-[32px]"
        title="Remover série"
        aria-label="Remover série"
      >
        <Trash size={14} />
      </button>
    </div>
  );
}

export function SetsTableHeader({
  colunas,
  showPeso = false,
  showExtra = true,
  maxClusterBlocos = 1,
}: {
  colunas: ColunaSerie[];
  showPeso?: boolean;
  showExtra?: boolean;
  maxClusterBlocos?: number;
}) {
  return (
    <div
      className="grid gap-1 px-0 pb-1 border-b border-border-divider/50"
      style={{ gridTemplateColumns: gridTemplate(colunas, showPeso, showExtra, maxClusterBlocos) }}
    >
      <span className="flex items-center justify-center gap-0.5 text-[10px] font-semibold text-brand uppercase text-center">
        Set
        <InfoHint text="Toque no número pra escolher uma técnica de série (drop set, rest pause...)." />
      </span>

      <span aria-hidden className="block" />

      {colunas.map((col) => (
        <span
          key={col.key}
          className="text-[10px] font-semibold text-text-muted uppercase text-center truncate"
        >
          {col.label}
        </span>
      ))}
      {(showPeso || showExtra) && (
        <>
          <span aria-hidden className="block" />
          {showPeso ? (
            <span className="text-[10px] font-semibold text-text-muted uppercase text-center">kg</span>
          ) : (
            <span aria-hidden className="block" />
          )}
        </>
      )}
      {showExtra && (
        <>
          <span aria-hidden className="block" />
          <span className="flex items-center justify-center gap-0.5 text-[10px] font-semibold text-brand/80 uppercase text-center">
            Téc
            <InfoHint text="Método extra pra essa série (bi-set, super-set, giant set...)." />
          </span>
        </>
      )}
      <span />
    </div>
  );
}
