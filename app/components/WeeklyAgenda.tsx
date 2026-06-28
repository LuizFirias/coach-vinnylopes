"use client";

import React, { useEffect, useState } from"react";
import { Barbell, X, Check, FileText, Moon, CircleNotch, PencilSimple } from "@phosphor-icons/react";
import { supabaseClient } from"@/lib/supabaseClient";
import { getSafeSession } from '@/lib/authErrorHandler';
import { extractStoragePath, getSignedStorageUrl } from '@/lib/storageUrls';
import AddManualWorkoutModal from"./AddManualWorkoutModal";
import { getTodayBrazil } from '@/lib/dateUtils';
import { cn } from '@/lib/utils/cn';

interface WorkoutOption {
  id: string;
  name: string;
  type: 'ficha' | 'pdf' | 'manual';
  url?: string;
}

interface AgendaEntry {
  dia_semana: number;
  ficha_id?: string;
  treino_pdf_id?: string;
  is_rest_day: boolean;
  workout_name?: string;
  type?: 'ficha' | 'pdf' | 'manual';
  url?: string;
}

const dayLabels = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
const dayFull   = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

// ─── Modal de configuração do dia ───────────────────────────────────────────
interface DayModalProps {
  isOpen: boolean;
  day: number | null;
  currentEntry?: AgendaEntry;
  availableWorkouts: WorkoutOption[];
  saving: boolean;
  onClose: () => void;
  onSave: (day: number, workout: WorkoutOption | 'rest' | 'livre', descricao: string) => void;
}

function DayConfigModal({ isOpen, day, currentEntry, availableWorkouts, saving, onClose, onSave }: DayModalProps) {
  const [selected, setSelected] = useState<WorkoutOption | 'rest' | 'livre' | null>(null);
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (isOpen) { setSelected(null); setDescricao(''); }
  }, [isOpen, day]);

  if (!isOpen || day === null) return null;

  const fichas = availableWorkouts.filter(w => w.type === 'ficha');
  const pdfs   = availableWorkouts.filter(w => w.type === 'pdf');

  return (
    <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div
        className="relative bg-[#0A0A0A] w-full md:max-w-lg rounded-t-2xl md:rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[78vh] md:max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle mobile */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="w-8 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-white/5">
          <div>
            <p className="text-[9px] text-[#D4AF37] uppercase tracking-[0.4em]">Configurar dia</p>
            <h2 className="text-base md:text-xl text-white uppercase tracking-tight">{dayFull[day]}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 md:p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Options */}
        <div className="flex-1 overflow-y-auto px-3 py-3 md:p-6 space-y-2 md:space-y-4">

          {/* Descanso */}
          <button
            onClick={() => setSelected('rest')}
            className={`w-full flex items-center gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all ${
              selected === 'rest'
                ? 'bg-zinc-700/40 border-white/30 ring-2 ring-white/20'
                : 'bg-zinc-900/50 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
              <Moon size={16} />
            </div>
            <div className="text-left flex-1">
              <p className="text-xs md:text-sm text-white uppercase tracking-tight">Dia de Descanso</p>
              <p className="text-[9px] md:text-[10px] text-zinc-500 tracking-widest uppercase">Recuperação ativa</p>
            </div>
            {selected === 'rest' && <Check size={16} className="text-white shrink-0" />}
          </button>

          {/* Treino Livre */}
          <div>
            <p className="text-[9px] md:text-[10px] text-zinc-600 uppercase tracking-[0.3em] mb-1.5 px-1">Treino Livre</p>
            <button
              onClick={() => setSelected('livre')}
              className={`w-full flex items-center gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all ${
                selected === 'livre'
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]/50 ring-2 ring-[#D4AF37]/20'
                  : 'bg-zinc-900/50 border-white/5 hover:border-[#D4AF37]/20'
              }`}
            >
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] shrink-0">
                <PencilSimple size={16} />
              </div>
              <div className="text-left flex-1">
                <p className="text-xs md:text-sm text-white uppercase tracking-tight">Treino Livre</p>
                <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-widest">Descreva o que treinou</p>
              </div>
              {selected === 'livre' && <Check size={16} className="text-[#D4AF37] shrink-0" />}
            </button>
            {selected === 'livre' && (
              <div className="mt-2">
                <input
                  type="text"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Peito, Quadríceps, Corrida..."
                  autoFocus
                  className="w-full bg-zinc-900/60 border border-[#D4AF37]/20 rounded-xl px-3 py-2.5 text-xs md:text-sm text-white placeholder-zinc-700 outline-none focus:border-[#D4AF37]/40 transition-all"
                />
              </div>
            )}
          </div>

          {/* Fichas */}
          {fichas.length > 0 && (
            <div>
              <p className="text-[9px] md:text-[10px] text-zinc-600 uppercase tracking-[0.3em] mb-1.5 px-1">Fichas Digitais</p>
              <div className="space-y-1.5 md:space-y-2">
                {fichas.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setSelected(w)}
                    className={`w-full flex items-center gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all ${
                      selected !== 'rest' && selected !== 'livre' && (selected as WorkoutOption)?.id === w.id
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37]/50 ring-2 ring-[#D4AF37]/20'
                        : 'bg-zinc-900/50 border-white/5 hover:border-[#D4AF37]/20'
                    }`}
                  >
                    <div className="w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
                      <Barbell size={16} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs md:text-sm text-white uppercase tracking-tight truncate">{w.name}</p>
                      <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-widest">Ficha Digital</p>
                    </div>
                    {selected !== 'rest' && selected !== 'livre' && (selected as WorkoutOption)?.id === w.id && (
                      <Check size={16} className="text-[#D4AF37] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PDFs */}
          {pdfs.length > 0 && (
            <div>
              <p className="text-[9px] md:text-[10px] text-zinc-600 uppercase tracking-[0.3em] mb-1.5 px-1">Protocolos PDF</p>
              <div className="space-y-1.5 md:space-y-2">
                {pdfs.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setSelected(w)}
                    className={`w-full flex items-center gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all ${
                      selected !== 'rest' && selected !== 'livre' && (selected as WorkoutOption)?.id === w.id
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37]/50 ring-2 ring-[#D4AF37]/20'
                        : 'bg-zinc-900/50 border-white/5 hover:border-[#D4AF37]/20'
                    }`}
                  >
                    <div className="w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs md:text-sm text-white uppercase tracking-tight truncate">{w.name}</p>
                      <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-widest">Protocolo PDF</p>
                    </div>
                    {selected !== 'rest' && selected !== 'livre' && (selected as WorkoutOption)?.id === w.id && (
                      <Check size={16} className="text-[#D4AF37] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-3 md:p-6 border-t border-white/5 flex gap-2 md:gap-3 bg-black/40">
          <button
            onClick={onClose}
            className="flex-1 py-3 md:py-4 bg-zinc-900 border border-white/10 text-zinc-400 text-[10px] md:text-[11px] uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-zinc-800 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (selected !== null) onSave(day, selected, descricao);
            }}
            disabled={selected === null || saving}
            className="flex-1 py-3 md:py-4 bg-[#D4AF37] hover:bg-[#D4AF37]/90 disabled:opacity-40 text-black text-[10px] md:text-[11px] uppercase tracking-widest rounded-xl md:rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            {saving ? <CircleNotch size={14} className="animate-spin" /> : <Check size={14} />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function WeeklyAgenda() {
  const [agenda, setAgenda] = useState<Record<number, AgendaEntry>>({});
  const [availableWorkouts, setAvailableWorkouts] = useState<WorkoutOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedModalDate, setSelectedModalDate] = useState<Date>(new Date());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserId(user.id);

      const { data: fichas } = await supabaseClient
        .from('fichas_treino')
        .select('id, nome_rotina')
        .eq('aluno_id', user.id)
        .eq('ativo', true);

      const { data: pdfs } = await supabaseClient
        .from('treinos_alunos')
        .select('id, aluno_id, nome_arquivo, url_pdf')
        .eq('aluno_id', user.id);

      const options: WorkoutOption[] = [
        ...(fichas || []).map(f => ({ id: f.id, name: f.nome_rotina, type: 'ficha' as const })),
        ...(pdfs || [])
          // segurança extra: garantir apenas PDFs do aluno logado
          .filter((p: any) => p.aluno_id === user.id)
          .map((p: any) => {
            const filePath = extractStoragePath('treinos-pdf', p.url_pdf) || p.url_pdf;
            return { id: p.id, name: p.nome_arquivo, type: 'pdf' as const, url: filePath };
          }),
      ];
      setAvailableWorkouts(options);

      const { data: agendaData } = await supabaseClient
        .from('agenda_semanal')
        .select(`*, fichas_treino(nome_rotina), treinos_alunos(nome_arquivo, url_pdf)`)
        .eq('aluno_id', user.id);

      const agendaMap: Record<number, AgendaEntry> = {};
      if (agendaData) {
        for (const item of agendaData) {
          let finalUrl = item.treinos_alunos?.url_pdf;
          if (item.treino_pdf_id && finalUrl) {
            const signed = await getSignedStorageUrl('treinos-pdf', finalUrl, 3600);
            finalUrl = signed || finalUrl;
          }
          agendaMap[item.dia_semana] = {
            ...item,
            workout_name: item.fichas_treino?.nome_rotina || item.treinos_alunos?.nome_arquivo,
            type: item.ficha_id ? 'ficha' : item.treino_pdf_id ? 'pdf' : undefined,
            url: finalUrl,
            is_rest_day: item.is_off,
          };
        }
      }
      setAgenda(agendaMap);
    } catch (err) {
      console.error("Error fetching agenda:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveDay = async (day: number, workout: WorkoutOption | 'rest' | 'livre', descricao?: string) => {
    // Treino livre: só registra check-in, sem atualizar agenda
    if (workout === 'livre') {
      setSaving(true);
      try {
        const session = await getSafeSession();
        if (!session?.user) return;
        const todayStr = getTodayBrazil();
        const { data: existing } = await supabaseClient
          .from('treinos_manuais')
          .select('id')
          .eq('aluno_id', session.user.id)
          .eq('data_treino', todayStr)
          .eq('concluido', true)
          .limit(1);
        if (!existing || existing.length === 0) {
          await supabaseClient.from('treinos_manuais').insert({
            aluno_id: session.user.id,
            tipo_treino: 'musculacao',
            concluido: true,
            pontos_earn: 20,
            descricao: descricao?.trim() || null,
            data_treino: todayStr,
          });
        }
      } catch (err) {
        console.error('Erro ao salvar treino livre:', err);
      } finally {
        setSaving(false);
        setEditingDay(null);
      }
      return;
    }

    if (workout !== 'rest' && workout.type === 'manual') {
      const today = new Date();
      const diff = day - today.getDay();
      const workoutDate = new Date(today);
      workoutDate.setDate(workoutDate.getDate() + diff);
      setSelectedModalDate(workoutDate);
      setModalOpen(true);
      setEditingDay(null);
      return;
    }

    setSaving(true);
    try {
      const session = await getSafeSession();
      const user = session?.user;
      if (!user) throw new Error('Usuário não autenticado');

      const payload: any = {
        aluno_id: user.id,
        dia_semana: day,
        is_off: workout === 'rest',
      };

      if (workout !== 'rest' && workout.type === 'ficha') {
        payload.ficha_id = workout.id;
        payload.treino_pdf_id = null;
      } else if (workout !== 'rest' && workout.type === 'pdf') {
        payload.ficha_id = null;
        payload.treino_pdf_id = workout.id;
      } else {
        payload.ficha_id = null;
        payload.treino_pdf_id = null;
      }

      const { error } = await supabaseClient
        .from('agenda_semanal')
        .upsert(payload, { onConflict: 'aluno_id,dia_semana' });

      if (error) throw new Error(error.message);

      // Se for o dia de hoje e não for descanso, registrar check-in
      if (day === new Date().getDay() && workout !== 'rest') {
        const todayStr = getTodayBrazil();
        const { data: existing } = await supabaseClient
          .from('treinos_manuais')
          .select('id')
          .eq('aluno_id', user.id)
          .eq('data_treino', todayStr)
          .eq('concluido', true)
          .limit(1);
        if (!existing || existing.length === 0) {
          await supabaseClient.from('treinos_manuais').insert({
            aluno_id: user.id,
            tipo_treino: 'musculacao',
            concluido: true,
            pontos_earn: 20,
            descricao: descricao?.trim() || null,
            data_treino: todayStr,
          });
        }
      }

      await fetchData();
      setEditingDay(null);
    } catch (err: any) {
      alert(`Erro ao salvar agenda: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-20 flex items-center justify-center text-text-secondary animate-pulse uppercase text-[10px] tracking-widest">
      Carregando Agenda...
    </div>
  );

  const todayIdx = new Date().getDay();

  return (
    <>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {dayLabels.map((label, dayIdx) => {
          const entry = agenda[dayIdx];
          const isToday = dayIdx === todayIdx;

          return (
            <button
              key={dayIdx}
              onClick={() => setEditingDay(dayIdx)}
              className={cn(
                'flex flex-col items-center gap-1 min-w-[50px] flex-shrink-0 rounded-lg border p-1.5 transition-all',
                isToday
                  ? 'bg-brand/10 border-brand/40 shadow-sm'
                  : entry?.is_rest_day
                    ? 'bg-surface-1 border-border-subtle opacity-50'
                    : entry?.workout_name
                      ? 'bg-surface-1 border-border-subtle hover:border-border-default'
                      : 'bg-surface-1 border-dashed border-border-default hover:border-brand/20'
              )}
            >
              <span className={cn(
                'text-[8px] font-bold uppercase tracking-wider',
                isToday ? 'text-brand' : 'text-text-tertiary'
              )}>
                {label}
              </span>
              {entry?.is_rest_day ? (
                <span className="text-[9px] font-medium text-text-disabled leading-none">Off</span>
              ) : entry?.workout_name ? (
                <span className="text-[9px] font-semibold text-text-primary leading-none text-center w-full truncate block px-0.5" title={entry.workout_name}>
                  {entry.workout_name.length > 5 ? entry.workout_name.slice(0, 5) + '…' : entry.workout_name}
                </span>
              ) : (
                <span className="text-[8px] font-bold text-text-disabled leading-none">+</span>
              )}
              <div className={cn(
                'w-1 h-1 rounded-full mt-0.5',
                entry?.is_rest_day
                  ? 'bg-border-default'
                  : entry?.workout_name
                    ? isToday ? 'bg-brand' : 'bg-brand/50'
                    : 'bg-border-subtle'
              )} />
            </button>
          );
        })}
      </div>

      {/* Modal de configuração do dia */}
      <DayConfigModal
        isOpen={editingDay !== null}
        day={editingDay}
        currentEntry={editingDay !== null ? agenda[editingDay] : undefined}
        availableWorkouts={availableWorkouts}
        saving={saving}
        onClose={() => setEditingDay(null)}
        onSave={(day, workout, descricao) => {
          saveDay(day, workout, descricao);
          if (workout !== 'livre') setEditingDay(null);
        }}
      />

      {/* Modal for adding manual workout */}
      <AddManualWorkoutModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        date={selectedModalDate}
        onWorkoutAdded={fetchData}
      />
    </>
  );
}
