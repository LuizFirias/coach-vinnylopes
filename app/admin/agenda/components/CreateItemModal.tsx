"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, MapPin, Clock } from "@phosphor-icons/react";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { criarAula, criarEvento, type LocalTipo, type ItemTipo } from "@/lib/agenda/queries";

interface AlunoOption {
  id: string;
  nome: string;
}

interface CreateItemModalProps {
  coachId: string;
  tipoInicial: ItemTipo;
  alunos: AlunoOption[];
  /** Data/hora pré-preenchida (ex: clique numa célula do calendário). */
  initialDate?: string; // yyyy-mm-dd
  initialTime?: string; // HH:mm
  onClose: () => void;
  onCreated: () => void;
}

export function CreateItemModal({
  coachId,
  tipoInicial,
  alunos,
  initialDate,
  initialTime,
  onClose,
  onCreated,
}: CreateItemModalProps) {
  const [tipo, setTipo] = useState<ItemTipo>(tipoInicial);
  const [alunoId, setAlunoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState(initialDate ?? "");
  const [hora, setHora] = useState(initialTime ?? "");
  const [duracaoMin, setDuracaoMin] = useState("60");
  const [localTipo, setLocalTipo] = useState<LocalTipo>("presencial");
  const [endereco, setEndereco] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const alunoOptions = alunos.map((a) => ({ value: a.id, label: a.nome }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !hora) {
      setError("Selecione a data e o horário.");
      return;
    }
    if (tipo === "aula" && !alunoId) {
      setError("Selecione o aluno.");
      return;
    }
    if (tipo === "evento" && !titulo.trim()) {
      setError("Descreva o evento.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const dataHoraISO = new Date(`${data}T${hora}:00`).toISOString();
      if (tipo === "aula") {
        await criarAula({
          coachId,
          alunoId,
          dataHoraISO,
          duracaoMin: Number(duracaoMin) || 60,
          localTipo,
          endereco: localTipo === "presencial" ? endereco : null,
        });
      } else {
        await criarEvento({
          coachId,
          titulo: titulo.trim(),
          dataHoraISO,
          duracaoMin: Number(duracaoMin) || 60,
        });
      }
      onCreated();
    } catch (err: any) {
      setError(err?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface-1"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
          <h2 className="text-sm font-bold text-text-primary">
            {tipo === "aula" ? "Agendar aula" : "Registrar evento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-text-tertiary hover:text-text-primary"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-5">
          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
              {error}
            </div>
          )}

          {tipo === "aula" ? (
            <Select
              label="Aluno"
              value={alunoId}
              onChange={setAlunoId}
              options={alunoOptions}
              placeholder="Selecionar aluno…"
            />
          ) : (
            <Input
              label="Descrição do evento"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Compromisso pessoal"
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data"
              labelClassName="font-normal"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
            <Input
              label="Horário"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              leftIcon={<Clock size={16} />}
              required
            />
          </div>

          <Input
            label="Duração (minutos)"
            labelClassName="font-normal"
            type="number"
            min={15}
            step={15}
            value={duracaoMin}
            onChange={(e) => setDuracaoMin(e.target.value)}
          />

          {tipo === "aula" && (
            <>
              <Select
                label="Local"
                value={localTipo}
                onChange={(v) => setLocalTipo(v as LocalTipo)}
                options={[
                  { value: "presencial", label: "Presencial" },
                  { value: "online", label: "Online" },
                ]}
              />
              {localTipo === "presencial" && (
                <Input
                  label="Endereço (opcional)"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Studio, Av. Principal, 123"
                  leftIcon={<MapPin size={16} />}
                />
              )}
            </>
          )}

          <div className="mt-2">
            <Button type="submit" variant="primary" fullWidth loading={saving}>
              {tipo === "aula" ? "Agendar" : "Registrar"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
