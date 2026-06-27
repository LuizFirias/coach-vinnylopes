"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Check, Barbell, Moon, PencilSimple, X, CircleNotch, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { supabaseClient } from "@/lib/supabaseClient";
import { getTodayBrazil } from "@/lib/dateUtils";
import { getSafeSession } from '@/lib/authErrorHandler';
import Link from "next/link";

interface TrailDay {
  dayIdx: number; // 0-6
  label: string;
  status: 'concluido' | 'pendente' | 'futuro' | 'perdido' | 'off';
  isToday: boolean;
  isOff: boolean;
  workoutName?: string;
  fichaId?: string;
  type?: 'ficha' | 'pdf';
}

interface WorkoutOption {
  id: string;
  name: string;
  type: 'ficha' | 'pdf';
}

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const dayFull = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

// ─── Modal de configuração do dia (Inlined for simplicity and consistency) ───
interface DayModalProps {
  isOpen: boolean;
  day: number | null;
  availableWorkouts: WorkoutOption[];
  saving: boolean;
  onClose: () => void;
  onSave: (day: number, workout: WorkoutOption | 'rest' | 'livre', descricao: string) => void;
}

function DayConfigModal({ isOpen, day, availableWorkouts, saving, onClose, onSave }: DayModalProps) {
  const [selected, setSelected] = useState<WorkoutOption | 'rest' | 'livre' | null>(null);
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (isOpen) { setSelected(null); setDescricao(''); }
  }, [isOpen, day]);

  if (!isOpen || day === null) return null;

  const fichas = availableWorkouts.filter(w => w.type === 'ficha');
  const pdfs = availableWorkouts.filter(w => w.type === 'pdf');

  return (
    <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div
        className="relative bg-surface-1 w-full md:max-w-lg rounded-t-3xl md:rounded-3xl border border-border-subtle shadow-elev-3 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-surface-3 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div>
            <p className="text-2xs text-brand font-bold uppercase tracking-caps">Configurar dia</p>
            <h2 className="text-lg text-text-primary font-bold">{dayFull[day]}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-surface-2 hover:bg-surface-3 rounded-xl text-text-tertiary hover:text-text-primary transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Descanso */}
          <button
            onClick={() => setSelected('rest')}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all",
              selected === 'rest' ? "bg-surface-3 border-text-tertiary" : "bg-surface-2 border-transparent hover:border-border-subtle"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-surface-3 flex items-center justify-center text-text-secondary">
              <Moon size={24} weight="fill" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-bold text-text-primary uppercase tracking-tight">Dia de Descanso</p>
              <p className="text-xs text-text-tertiary">Recuperação ativa</p>
            </div>
            {selected === 'rest' && <Check size={20} weight="bold" className="text-brand" />}
          </button>

          {/* Treino Livre */}
          <div>
            <p className="text-2xs text-text-tertiary font-bold uppercase tracking-caps mb-2 ml-1">Treino Livre</p>
            <button
              onClick={() => setSelected('livre')}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all",
                selected === 'livre' ? "bg-brand/10 border-brand/50" : "bg-surface-2 border-transparent hover:border-brand/20"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                <Plus size={24} weight="bold" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-bold text-text-primary uppercase tracking-tight">Treino Livre</p>
                <p className="text-xs text-text-tertiary">Check-in rápido sem plano</p>
              </div>
              {selected === 'livre' && <Check size={20} weight="bold" className="text-brand" />}
            </button>
            {selected === 'livre' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="O que você treinou? (ex: Corrida, Cardio...)"
                  autoFocus
                  className="w-full bg-surface-2 border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand transition-all"
                />
              </div>
            )}
          </div>

          {/* Fichas */}
          {fichas.length > 0 && (
            <div>
              <p className="text-2xs text-text-tertiary font-bold uppercase tracking-caps mb-2 ml-1">Fichas Digitais</p>
              <div className="space-y-2">
                {fichas.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setSelected(w)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all",
                      selected !== 'rest' && selected !== 'livre' && (selected as WorkoutOption)?.id === w.id
                        ? "bg-brand/10 border-brand/50" : "bg-surface-2 border-transparent hover:border-brand/20"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success">
                      <Barbell size={24} weight="bold" />
                    </div>
                    <div className="text-left flex-1 truncate">
                      <p className="text-sm font-bold text-text-primary uppercase tracking-tight truncate">{w.name}</p>
                      <p className="text-xs text-text-tertiary">Ficha Digital</p>
                    </div>
                    {selected !== 'rest' && selected !== 'livre' && (selected as WorkoutOption)?.id === w.id && (
                      <Check size={20} weight="bold" className="text-brand" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border-subtle flex gap-3 bg-surface-1">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-surface-2 text-text-secondary text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-surface-3 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => selected && onSave(day, selected, descricao)}
            disabled={!selected || saving}
            className="flex-1 py-4 bg-brand disabled:opacity-40 text-black text-xs font-bold uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            {saving ? <CircleNotch size={18} className="animate-spin" /> : <Check size={18} weight="bold" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkoutTrail({ userId, onUpdate }: { userId: string; onUpdate?: () => void }) {
  const [trail, setTrail] = useState<TrailDay[]>([]);
  const [availableWorkouts, setAvailableWorkouts] = useState<WorkoutOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchTrailData = useCallback(async () => {
    try {
      const today = new Date();
      const todayIdx = today.getDay();
      const todayStr = getTodayBrazil();

      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - todayIdx);
      const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

      // 1. Agenda
      const { data: agenda } = await supabaseClient
        .from('agenda_semanal')
        .select('dia_semana, is_off, ficha_id, treino_pdf_id, fichas_treino(nome_rotina), treinos_alunos(nome_arquivo)')
        .eq('aluno_id', userId);

      // 2. Histórico (Treinos de Ficha)
      const { data: historico } = await supabaseClient
        .from('v_historico_validos')
        .select('data_conclusao')
        .eq('aluno_id', userId)
        .gte('data_conclusao', startOfWeekStr);

      // 3. Treinos Manuais (Check-ins)
      const { data: manuais } = await supabaseClient
        .from('treinos_manuais')
        .select('data_treino')
        .eq('aluno_id', userId)
        .eq('concluido', true)
        .gte('data_treino', startOfWeekStr);

      const completedDays = new Set<number>();
      historico?.forEach(h => {
        completedDays.add(new Date(h.data_conclusao).getDay());
      });
      manuais?.forEach(m => {
        // Garantir que a data manual seja tratada sem problemas de fuso
        const datePart = m.data_treino.split('T')[0];
        completedDays.add(new Date(datePart + 'T12:00:00').getDay());
      });

      const agendaMap = new Map<number, any>();
      agenda?.forEach(a => agendaMap.set(a.dia_semana, a));

      const newTrail: TrailDay[] = dayLabels.map((label, idx) => {
        const isToday = idx === todayIdx;
        const dayAgenda = agendaMap.get(idx);
        const isOff = dayAgenda?.is_off ?? false;

        // Considera concluído se tem histórico/check-in, OU se é um dia de descanso no passado
        const isCompleted = completedDays.has(idx) || (isOff && idx < todayIdx);

        let status: TrailDay['status'] = 'futuro';

        if (isCompleted) {
          status = 'concluido';
        } else if (isToday) {
          status = isOff ? 'off' : 'pendente';
        } else if (idx < todayIdx) {
          status = isOff ? 'off' : 'perdido';
        } else {
          status = 'futuro';
        }

        return {
          dayIdx: idx,
          label,
          status,
          isToday,
          isOff,
          workoutName: dayAgenda?.fichas_treino?.nome_rotina || dayAgenda?.treinos_alunos?.nome_arquivo,
          fichaId: dayAgenda?.ficha_id || dayAgenda?.treino_pdf_id,
          type: dayAgenda?.ficha_id ? 'ficha' : dayAgenda?.treino_pdf_id ? 'pdf' : undefined,
        };
      });

      setTrail(newTrail);
    } catch (err) {
      console.error("[WorkoutTrail] Erro:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchAvailableWorkouts = useCallback(async () => {
    try {
      const { data: fichas } = await supabaseClient
        .from('fichas_treino')
        .select('id, nome_rotina')
        .eq('aluno_id', userId)
        .eq('ativo', true);

      const { data: pdfs } = await supabaseClient
        .from('treinos_alunos')
        .select('id, nome_arquivo')
        .eq('aluno_id', userId);

      const options: WorkoutOption[] = [
        ...(fichas || []).map(f => ({ id: f.id, name: f.nome_rotina, type: 'ficha' as const })),
        ...(pdfs || []).map(p => ({ id: p.id, name: p.nome_arquivo, type: 'pdf' as const })),
      ];
      setAvailableWorkouts(options);
    } catch (err) {
      console.error("[WorkoutTrail] Erro ao buscar treinos:", err);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchTrailData();
      fetchAvailableWorkouts();
    }
  }, [userId, fetchTrailData, fetchAvailableWorkouts]);

  const saveDay = async (day: number, workout: WorkoutOption | 'rest' | 'livre', descricao?: string) => {
    if (workout === 'livre') {
      setSaving(true);
      try {
        const session = await getSafeSession();
        if (!session?.user) return;
        const todayStr = getTodayBrazil();
        await supabaseClient.from('treinos_manuais').insert({
          aluno_id: session.user.id,
          tipo_treino: 'musculacao',
          concluido: true,
          pontos_earn: 20,
          descricao: descricao?.trim() || null,
          data_treino: todayStr,
        });
        await fetchTrailData();
      } catch (err) {
        console.error('Erro ao salvar treino livre:', err);
      } finally {
        setSaving(false);
        setEditingDay(null);
      }
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        aluno_id: userId,
        dia_semana: day,
        is_off: workout === 'rest',
        ficha_id: (workout !== 'rest' && workout.type === 'ficha') ? workout.id : null,
        treino_pdf_id: (workout !== 'rest' && workout.type === 'pdf') ? workout.id : null,
      };

      const { error } = await supabaseClient
        .from('agenda_semanal')
        .upsert(payload, { onConflict: 'aluno_id,dia_semana' });

      if (error) throw error;

      // Check-in se for hoje
      if (day === new Date().getDay() && workout !== 'rest') {
        const todayStr = getTodayBrazil();
        await supabaseClient.from('treinos_manuais').upsert({
          aluno_id: userId,
          tipo_treino: 'musculacao',
          concluido: true,
          data_treino: todayStr,
        }, { onConflict: 'aluno_id,data_treino' });
      }

      await fetchTrailData();
      if (onUpdate) onUpdate();
      setEditingDay(null);
    } catch (err) {
      console.error("[WorkoutTrail] Erro ao salvar:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-10 text-center text-text-tertiary animate-pulse text-xs uppercase tracking-widest">Carregando trilha...</div>;

  return (
    <>
      <div className="grid grid-cols-7 gap-1 py-1">
        {trail.map((day, idx) => {
          const isCompleted = day.status === 'concluido';
          const isCurrentPending = day.status === 'pendente';
          const isMissed = day.status === 'perdido';
          const isFuture = day.status === 'futuro';
          const isOffStatus = day.status === 'off';

          return (
            <button
              key={idx}
              onClick={() => setEditingDay(day.dayIdx)}
              className={cn(
                "flex flex-col items-center gap-2 py-2 rounded-xl transition-all outline-none",
                day.isToday && "bg-brand-subtle/30"
              )}
            >
              {/* Dia da semana */}
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                day.isToday ? "text-brand" : "text-text-tertiary"
              )}>
                {day.label}
              </span>

              {/* Indicador visual de status */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                isCompleted && "bg-brand text-black shadow-gold-glow",
                isCurrentPending && day.isToday && "border-2 border-brand text-brand shadow-gold-glow",
                isCurrentPending && !day.isToday && "border border-border-default text-text-secondary",
                isFuture && "bg-surface-2/40 border border-transparent hover:border-border-subtle",
                isMissed && "bg-surface-3/30 border border-transparent opacity-60 text-danger",
                isOffStatus && "flex items-center justify-center"
              )}>
                {isCompleted ? (
                  <Check weight="bold" className="w-4 h-4 text-text-on-brand" />
                ) : isCurrentPending ? (
                  <Barbell weight="fill" className="w-4 h-4" />
                ) : isMissed ? (
                  <span className="text-[10px] font-bold text-danger">!</span>
                ) : isOffStatus ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
                ) : (
                  <div className="w-1 h-1 rounded-full bg-text-disabled" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <DayConfigModal
        isOpen={editingDay !== null}
        day={editingDay}
        availableWorkouts={availableWorkouts}
        saving={saving}
        onClose={() => setEditingDay(null)}
        onSave={saveDay}
      />
    </>
  );
}
