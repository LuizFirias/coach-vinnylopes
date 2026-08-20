"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import {
  fetchHorarioTrabalho,
  salvarHorarioTrabalho,
  type HorarioTrabalhoDia,
} from "@/lib/agenda/queries";

const DIA_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
// Exibição seg→dom (igual ao resto da agenda), mas dia_semana guarda 0=domingo..6=sábado
const ORDEM_EXIBICAO = [1, 2, 3, 4, 5, 6, 0];

interface HorarioTrabalhoModalProps {
  coachId: string;
  onClose: () => void;
}

export function HorarioTrabalhoModal({ coachId, onClose }: HorarioTrabalhoModalProps) {
  const [dias, setDias] = useState<HorarioTrabalhoDia[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    void fetchHorarioTrabalho(coachId).then(setDias);
  }, [coachId]);

  const updateDia = (diaSemana: number, patch: Partial<HorarioTrabalhoDia>) => {
    setDias((prev) =>
      prev
        ? prev.map((d) => (d.diaSemana === diaSemana ? { ...d, ...patch } : d))
        : prev,
    );
  };

  const handleSave = async () => {
    if (!dias) return;
    setSaving(true);
    try {
      await salvarHorarioTrabalho(coachId, dias);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface-1"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
          <h2 className="text-sm font-bold text-text-primary">Definir horário</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-text-tertiary hover:text-text-primary"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-5">
          {!dias
            ? null
            : ORDEM_EXIBICAO.map((diaSemana) => {
                const dia = dias.find((d) => d.diaSemana === diaSemana)!;
                return (
                  <div
                    key={diaSemana}
                    className="flex flex-col gap-3 rounded-xl bg-surface-2/60 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-primary">
                        {DIA_LABEL[diaSemana]}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={dia.ativo}
                        onClick={() => updateDia(diaSemana, { ativo: !dia.ativo })}
                        className={cn(
                          "flex h-7 items-center gap-1.5 rounded-full px-1 text-[10px] font-semibold transition-colors",
                          dia.ativo ? "bg-brand text-white justify-start pl-2 pr-2.5" : "bg-surface-3 text-text-tertiary justify-end pr-2 pl-2.5",
                        )}
                      >
                        {dia.ativo ? "Ativo" : "Desativo"}
                      </button>
                    </div>

                    {dia.ativo && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-text-tertiary">
                            Início
                          </span>
                          <input
                            type="time"
                            value={dia.horaInicio}
                            onChange={(e) => updateDia(diaSemana, { horaInicio: e.target.value })}
                            className="h-9 rounded-lg border border-[#e4e4e7] bg-white px-2 text-sm text-[#1f2430] dark:border-[#2d3748] dark:bg-[#0d1117] dark:text-[#d8dce6]"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-text-tertiary">
                            Fim
                          </span>
                          <input
                            type="time"
                            value={dia.horaFim}
                            onChange={(e) => updateDia(diaSemana, { horaFim: e.target.value })}
                            className="h-9 rounded-lg border border-[#e4e4e7] bg-white px-2 text-sm text-[#1f2430] dark:border-[#2d3748] dark:bg-[#0d1117] dark:text-[#d8dce6]"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
        </div>

        <div className="flex items-center gap-3 border-t border-border-subtle p-5">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" fullWidth loading={saving} onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
