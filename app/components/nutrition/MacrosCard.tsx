"use client";

import { useMemo } from "react";
import { kcalFromMacros } from "@/lib/nutrition/calculateMacros";

export type MacroField = "proteina" | "carbo" | "gordura";

interface MacrosCardProps {
  proteina: number;
  carbo: number;
  gordura: number;
  onChange?: (field: MacroField, value: number) => void;
  readOnly?: boolean;
  /** Soma dos alimentos — no personal, este é o valor principal (sem linha de meta) */
  atual?: {
    proteina: number;
    carbo: number;
    gordura: number;
    kcal?: number;
  };
}

interface MacroDef {
  key: MacroField;
  label: string;
  kcalPerGram: number;
  colorVar: string;
  bgVar: string;
  borderVar: string;
}

const MACROS: MacroDef[] = [
  {
    key: "proteina",
    label: "Proteína",
    kcalPerGram: 4,
    colorVar: "--mc-protein-color",
    bgVar: "--mc-protein-bg",
    borderVar: "--mc-protein-border",
  },
  {
    key: "carbo",
    label: "Carbo",
    kcalPerGram: 4,
    colorVar: "--mc-carbo-color",
    bgVar: "--mc-carbo-bg",
    borderVar: "--mc-carbo-border",
  },
  {
    key: "gordura",
    label: "Gordura",
    kcalPerGram: 9,
    colorVar: "--mc-fat-color",
    bgVar: "--mc-fat-bg",
    borderVar: "--mc-fat-border",
  },
];

function formatGrams(value: number): string {
  const n = Math.max(0, Number(value) || 0);
  return Math.round(n * 10) % 10 === 0
    ? String(Math.round(n))
    : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export function MacrosCard({
  proteina,
  carbo,
  gordura,
  onChange,
  readOnly = false,
  atual,
}: MacrosCardProps) {
  /** Personal montando dieta: só alimentos. Aluno / edição de meta: usa proteina/carbo/gordura. */
  const coachFoodMode = Boolean(atual);
  const canEditMeta = !readOnly && !coachFoodMode && Boolean(onChange);

  const valores = coachFoodMode
    ? {
        proteina: Math.max(0, Number(atual?.proteina) || 0),
        carbo: Math.max(0, Number(atual?.carbo) || 0),
        gordura: Math.max(0, Number(atual?.gordura) || 0),
      }
    : {
        proteina: Math.max(0, Number(proteina) || 0),
        carbo: Math.max(0, Number(carbo) || 0),
        gordura: Math.max(0, Number(gordura) || 0),
      };

  const kcalTotal = useMemo(() => {
    if (coachFoodMode && atual?.kcal != null && Number.isFinite(Number(atual.kcal))) {
      return Math.round(Number(atual.kcal));
    }
    return kcalFromMacros(valores.proteina, valores.carbo, valores.gordura);
  }, [coachFoodMode, atual?.kcal, valores.proteina, valores.carbo, valores.gordura]);

  const pcts = useMemo(() => {
    if (kcalTotal === 0) return { proteina: 0, carbo: 0, gordura: 0 };
    const proteinaPct = Math.round(((valores.proteina * 4) / kcalTotal) * 100);
    const carboPct = Math.round(((valores.carbo * 4) / kcalTotal) * 100);
    return {
      proteina: proteinaPct,
      carbo: carboPct,
      gordura: Math.max(0, 100 - proteinaPct - carboPct),
    };
  }, [valores.proteina, valores.carbo, valores.gordura, kcalTotal]);

  return (
    <div
      className="relative rounded-[20px]"
      style={{
        background: "var(--card-macros-bg)",
        border: "0.5px solid var(--card-macros-border)",
        boxShadow: "var(--card-macros-shadow)",
      }}
    >
      <div className="relative overflow-hidden rounded-[20px]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--card-macros-glow)" }}
        aria-hidden
      />

      <div
        className="h-[3px] w-full"
        style={{ background: "var(--card-macros-topline)", opacity: 0.9 }}
        aria-hidden
      />

      <div className="relative z-10 p-4">
        <div
          className="mb-4 border-b pb-4 text-center"
          style={{ borderColor: "var(--card-macros-divider)" }}
        >
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-[36px] font-extrabold leading-none tabular-nums lining-nums tracking-display text-text-primary">
              {kcalTotal.toLocaleString("pt-BR")}
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--brand-primary)" }}>
              kcal
            </span>
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-[0.06em] text-text-disabled">
            {coachFoodMode ? "total dos alimentos" : "meta calórica diária"}
          </p>
        </div>

        <div className="mb-4 flex h-[5px] gap-0.5 overflow-hidden rounded-full">
          <div
            className="rounded-full transition-all duration-300"
            style={{ background: "var(--mc-protein-color)", flex: valores.proteina * 4 || 0.01 }}
            aria-hidden
          />
          <div
            className="rounded-full transition-all duration-300"
            style={{ background: "var(--mc-carbo-color)", flex: valores.carbo * 4 || 0.01 }}
            aria-hidden
          />
          <div
            className="rounded-full transition-all duration-300"
            style={{ background: "var(--mc-fat-color)", flex: valores.gordura * 9 || 0.01 }}
            aria-hidden
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MACROS.map((macro) => {
            const val = valores[macro.key];
            const kcalMacro = Math.round(val * macro.kcalPerGram);

            return (
              <div
                key={macro.key}
                className="relative overflow-hidden rounded-[14px] p-3"
                style={{
                  background: `var(${macro.bgVar})`,
                  border: `0.5px solid var(${macro.borderVar})`,
                  boxShadow: "var(--mc-shadow)",
                }}
              >
                <div className="mb-1.5 flex items-center gap-1">
                  <div
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: `var(${macro.colorVar})` }}
                    aria-hidden
                  />
                  <span className="text-[10px] font-medium tracking-[0.04em] text-text-tertiary">
                    {macro.label}
                  </span>
                </div>

                {canEditMeta ? (
                  <div className="relative flex items-baseline gap-0.5">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={val}
                      min={0}
                      max={999}
                      onChange={(e) =>
                        onChange?.(
                          macro.key,
                          Math.max(0, Math.min(999, parseInt(e.target.value, 10) || 0)),
                        )
                      }
                      aria-label={`${macro.label} em gramas`}
                      className="input-macro w-full min-w-0 tabular-nums lining-nums tracking-headline"
                    />
                    <span className="pointer-events-none text-[11px] text-text-disabled">g</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[24px] font-extrabold leading-none tabular-nums lining-nums tracking-headline text-text-primary">
                      {formatGrams(val)}
                    </span>
                    <span className="text-[11px] text-text-disabled">g</span>
                  </div>
                )}

                <p className="mt-1 text-[9px] tabular-nums lining-nums text-text-disabled">
                  {kcalMacro} kcal
                </p>
              </div>
            );
          })}
        </div>

        <div
          className="mt-3 flex justify-between border-t pt-2.5"
          style={{ borderColor: "var(--card-macros-divider)" }}
        >
          {MACROS.map((macro) => (
            <div key={macro.key} className="flex items-center gap-1">
              <div
                className="h-[5px] w-[5px] rounded-full"
                style={{ background: `var(${macro.colorVar})` }}
                aria-hidden
              />
              <span className="text-[10px] text-text-tertiary">
                {macro.label.slice(0, 4)}{" "}
                <span className="font-semibold tabular-nums lining-nums text-text-secondary">
                  {pcts[macro.key]}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
