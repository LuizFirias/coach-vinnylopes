"use client";

import { useEffect, useRef } from "react";
import { MapPin, VideoCamera, Lock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { isSameDay } from "@/lib/agenda/dateHelpers";
import type { AulaAgenda } from "@/lib/agenda/queries";

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00:00 .. 23:00
const ROW_H = 56; // px por hora
/** Altura visível da grade — o resto rola dentro do card (padrão Nutrium). */
const VISIBLE_HEIGHT = 480;
/** Hora em que o scroll começa (evita abrir sempre na madrugada). */
const SCROLL_TO_HOUR = 7;

interface GridCalendarProps {
  /** 1 dia (visão Dia) ou 7 dias seg→dom (visão Semana). */
  days: Date[];
  items: AulaAgenda[];
  onSlotClick: (date: Date, hour: number) => void;
  onItemClick: (item: AulaAgenda) => void;
}

function eventTop(item: AulaAgenda): number {
  const d = new Date(item.data_hora);
  const minutesFromMidnight = d.getHours() * 60 + d.getMinutes();
  return (minutesFromMidnight / 60) * ROW_H;
}

function eventHeight(item: AulaAgenda): number {
  return Math.max(24, (item.duracao_min / 60) * ROW_H);
}

export function GridCalendar({ days, items, onSlotClick, onItemClick }: GridCalendarProps) {
  const today = new Date();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: SCROLL_TO_HOUR * ROW_H });
  }, []);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Cabeçalho dos dias — fixo, fora da área com scroll */}
        <div
          className="grid border-b border-[#E4E7ED]"
          style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
        >
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="px-2 pb-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
              </div>
              <div
                className={cn(
                  "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                  isSameDay(d, today) ? "bg-brand text-white" : "text-text-primary",
                )}
              >
                {d.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Grade hora × dia — 00:00 a 23:59, com scroll interno (só mostra uma janela) */}
        <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: VISIBLE_HEIGHT }}>
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
            {/* Coluna de horas */}
            <div className="relative">
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: ROW_H }}
                  className="-translate-y-2 pr-2 text-right text-[10px] text-text-tertiary"
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Colunas dos dias */}
            {days.map((day) => {
              const dayItems = items.filter((it) => isSameDay(new Date(it.data_hora), day));
              return (
                <div
                  key={day.toISOString()}
                  className="relative border-l border-[#E4E7ED]"
                  style={{ height: ROW_H * HOURS.length }}
                >
                  {HOURS.map((h, i) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => onSlotClick(day, h)}
                      style={{ top: i * ROW_H, height: ROW_H }}
                      className="absolute left-0 right-0 w-full border-t border-[#EDEFF3] transition-colors hover:bg-brand/5"
                      aria-label={`Marcar em ${day.toLocaleDateString("pt-BR")} às ${h}:00`}
                    />
                  ))}

                  {dayItems.map((item) => {
                    const nome =
                      item.tipo === "evento"
                        ? item.titulo || "Evento"
                        : item.aluno?.coaching_reference || item.aluno?.full_name || "Aluno";
                    const hora = new Date(item.data_hora).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemClick(item);
                        }}
                        style={{ top: eventTop(item), height: eventHeight(item) }}
                        className={cn(
                          "absolute left-1 right-1 z-10 flex flex-col overflow-hidden rounded-lg px-2 py-1 text-left transition-opacity hover:opacity-90",
                          item.tipo === "evento"
                            ? "bg-surface-3 text-text-secondary"
                            : "bg-brand-subtle text-brand",
                        )}
                      >
                        <span className="flex items-center gap-1 truncate text-[10px] font-bold leading-tight">
                          {item.tipo === "evento" ? (
                            <Lock size={10} className="shrink-0" />
                          ) : item.local_tipo === "online" ? (
                            <VideoCamera size={10} className="shrink-0" />
                          ) : (
                            <MapPin size={10} className="shrink-0" />
                          )}
                          {nome}
                        </span>
                        <span className="truncate text-[9px] opacity-80">{hora}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
