"use client";

import React, { useEffect, useState } from "react";
import { Dumbbell, Plus, Trash2, Calendar as CalIcon, ChevronDown, Check, FileText } from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";

interface WorkoutOption {
  id: string;
  name: string;
  type: 'ficha' | 'pdf';
  url?: string;
}

interface AgendaEntry {
  dia_semana: number;
  ficha_id?: string;
  treino_pdf_id?: string;
  is_rest_day: boolean;
  workout_name?: string;
  type?: 'ficha' | 'pdf';
  url?: string;
}

const dayLabels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export default function WeeklyAgenda() {
  const [agenda, setAgenda] = useState<Record<number, AgendaEntry>>({});
  const [availableWorkouts, setAvailableWorkouts] = useState<WorkoutOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      // 1. Fetch available workouts (fichas)
      const { data: fichas } = await supabaseClient
        .from('fichas_treino')
        .select('id, nome_rotina')
        .eq('aluno_id', user.id)
        .eq('ativo', true);

      // 2. Fetch available PDFs
      const { data: pdfs } = await supabaseClient
        .from('treinos_alunos')
        .select('id, nome_arquivo, url_pdf')
        .eq('aluno_id', user.id);

      const options: WorkoutOption[] = [
        ...(fichas || []).map(f => ({ id: f.id, name: f.nome_rotina, type: 'ficha' as const })),
        ...(pdfs || []).map(p => {
          // Extrair o path do bucket para assinar se necessário
          // Como o URL pode ser um publicUrl antigo, garantimos que pegamos o path relativo
          const pathParts = p.url_pdf.split('/treinos-pdf/');
          const filePath = pathParts.length > 1 ? pathParts[1] : p.url_pdf;
          
          return { 
            id: p.id, 
            name: p.nome_arquivo, 
            type: 'pdf' as const, 
            url: filePath // Guardamos o PATH para assinar depois se necessário
          };
        })
      ];
      setAvailableWorkouts(options);

      // 3. Fetch agenda
      const { data: agendaData } = await supabaseClient
        .from('agenda_semanal')
        .select(`
          *,
          fichas_treino(nome_rotina),
          treinos_alunos(nome_arquivo, url_pdf)
        `)
        .eq('aluno_id', user.id);

      const agendaMap: Record<number, AgendaEntry> = {};
      
      // Assinar URLs dos PDFs na Agenda
      if (agendaData) {
        for (const item of agendaData) {
          let finalUrl = item.treinos_alunos?.url_pdf;
          if (item.treino_pdf_id && finalUrl) {
            const pathParts = finalUrl.split('/treinos-pdf/');
            const filePath = pathParts.length > 1 ? pathParts[1] : finalUrl;
            
            const { data: signedData } = await supabaseClient.storage
              .from('treinos-pdf')
              .createSignedUrl(filePath, 3600);
            
            finalUrl = signedData?.signedUrl || finalUrl;
          }

          agendaMap[item.dia_semana] = {
            ...item,
            workout_name: item.fichas_treino?.nome_rotina || item.treinos_alunos?.nome_arquivo,
            type: item.ficha_id ? 'ficha' : item.treino_pdf_id ? 'pdf' : undefined,
            url: finalUrl,
            is_rest_day: item.is_off // Map is_off to is_rest_day for UI compatibility
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

  const saveDay = async (day: number, workout: WorkoutOption | 'rest') => {
    setSaving(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Create payload with columns that actually exist in the database
      const payload: any = {
        aluno_id: user.id,
        dia_semana: day,
        is_off: workout === 'rest', // Use is_off instead of is_rest_day
      };

      // Set ficha_id if it's a ficha workout, otherwise null
      if (workout !== 'rest' && workout.type === 'ficha') {
        payload.ficha_id = workout.id;
        payload.treino_pdf_id = null;
      } 
      // Set treino_pdf_id if it's a PDF workout, otherwise null
      else if (workout !== 'rest' && workout.type === 'pdf') {
        payload.ficha_id = null;
        payload.treino_pdf_id = workout.id;
      } 
      // Both are null for rest day
      else {
        payload.ficha_id = null;
        payload.treino_pdf_id = null;
      }

      const { error } = await supabaseClient
        .from('agenda_semanal')
        .upsert(payload, { onConflict: 'aluno_id,dia_semana' });

      if (error) {
        console.error('Database error details:', error.message, error.code);
        throw new Error(error.message || 'Erro ao atualizar agenda');
      }
      
      await fetchData();
      setEditingDay(null);
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || 'Erro desconhecido';
      console.error("Error saving day:", errorMessage, err);
      alert(`Erro ao salvar agenda: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-32 flex items-center justify-center text-zinc-500 animate-pulse uppercase text-[10px] font-black tracking-widest">Carregando Agenda...</div>;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
           <h2 className="text-sm font-black text-white tracking-widest uppercase">Agenda Semanal</h2>
           <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-tighter">Organize sua rotina de elite</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {dayLabels.map((label, dayIdx) => {
          const entry = agenda[dayIdx];
          const isEditing = editingDay === dayIdx;

          return (
            <div 
              key={dayIdx} 
              className={`flex flex-col h-36 rounded-xl border relative transition-all duration-300
                ${entry?.is_rest_day 
                  ? 'bg-zinc-900/20 border-white/5 opacity-60' 
                  : entry?.workout_name 
                    ? 'bg-black border-iron-gold/30 shadow-[0_4px_20px_rgba(212,175,55,0.05)]' 
                    : 'bg-black border-white/5 hover:border-white/10'}
                ${isEditing ? 'ring-2 ring-iron-gold z-10' : ''}
              `}
            >
              {/* Day Header */}
              <div className="p-3 border-b border-white/5 flex justify-between items-start">
                <span className="text-[10px] font-black text-iron-gold tracking-widest">{label}</span>
                {!isEditing && (
                  <button 
                    onClick={() => setEditingDay(dayIdx)}
                    className="text-zinc-600 hover:text-white transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>

              {/* Day Content */}
              <div className="flex-1 p-3 flex flex-col justify-center overflow-hidden">
                {isEditing ? (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1">
                    <button 
                      onClick={() => saveDay(dayIdx, 'rest')}
                      className="text-[8px] font-black uppercase tracking-tighter bg-zinc-800 hover:bg-zinc-700 text-white p-1 rounded transition-colors"
                    >
                      Descanso
                    </button>
                    <div className="max-h-16 overflow-y-auto flex flex-col gap-1 custom-scrollbar">
                      {availableWorkouts.map(w => (
                        <button 
                          key={w.id}
                          onClick={() => saveDay(dayIdx, w)}
                          className="text-[8px] font-bold text-left p-1 rounded bg-iron-gold/10 hover:bg-iron-gold/20 text-iron-gold truncate"
                        >
                          {w.name}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setEditingDay(null)} className="text-[7px] font-black uppercase text-zinc-600 self-center">Cancelar</button>
                  </div>
                ) : (
                  <>
                    {entry?.is_rest_day ? (
                      <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em] italic self-center">Off-Day</span>
                    ) : entry?.workout_name ? (
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-white uppercase tracking-tighter leading-tight line-clamp-2 mb-1">
                          {entry.workout_name}
                        </span>
                        <div className="flex items-center gap-2">
                           {entry.type === 'pdf' ? (
                             <div className="px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded text-[7px] font-black uppercase tracking-widest">PDF</div>
                           ) : (
                             <div className="px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded text-[7px] font-black uppercase tracking-widest">Digi</div>
                           )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[8px] font-bold text-zinc-800 uppercase tracking-widest self-center">Vazio</span>
                    )}
                  </>
                )}
              </div>

              {/* Background Icon */}
              {!isEditing && (
                <div className="absolute -right-1 -bottom-1 opacity-[0.03] pointer-events-none">
                   <Dumbbell size={48} className="text-white" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
