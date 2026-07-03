"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { ArrowLeft, CaretLeft, CaretRight, Barbell, Calendar } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import SubscriptionGuard from "@/app/components/SubscriptionGuard";

export default function AlunoCalendario() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);

  const getInitials = (name: string) => {
    if (!name) return "A";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  function formatWorkoutDate(isoString: string) {
    if (!isoString) return "";
    const parts = isoString.split("-").map(Number);
    if (parts.length < 3) return isoString;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    const formatted = date.toLocaleDateString('pt-BR', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  const fetchHistory = useCallback(async (uid: string) => {
    try {
      const { data: historicoData } = await supabaseClient
        .from("historico_treinos")
        .select("id, data_conclusao, dados_sessao, exercicio_id")
        .eq("aluno_id", uid)
        .order("data_conclusao", { ascending: false });

      if (historicoData) {
        // Group by data_conclusao
        const sessoesPorData = new Map<string, any[]>();
        historicoData.forEach(h => {
          const key = h.data_conclusao;
          if (!sessoesPorData.has(key)) sessoesPorData.set(key, []);
          sessoesPorData.get(key)!.push(h);
        });

        const sessoesList = Array.from(sessoesPorData.entries()).map(([data, exerciciosSessao]) => {
          const firstEx = exerciciosSessao[0];
          const nome_rotina = firstEx?.dados_sessao?.nome_rotina || "Treino";
          
          let volumeTotal = 0;
          let totalSets = 0;
          const parsedExercises = exerciciosSessao.map(ex => {
            const ds = ex.dados_sessao || {};
            const series = ds.series || [];
            const completedSeries = series.filter((s: any) => s.completado);
            totalSets += completedSeries.length;
            
            completedSeries.forEach((s: any) => {
              const peso = Number(s.peso_atual) || 0;
              const reps = Number(s.reps) || 0;
              volumeTotal += peso * reps;
            });

            return {
              nome: ds.nome_exercicio || "Exercício",
              sets: series.length,
              completedSets: completedSeries.length,
            };
          });

          return {
            data_conclusao: data,
            nome_rotina,
            volumeTotal,
            totalSets,
            exercises: parsedExercises,
          };
        });

        setWorkouts(sessoesList);
      }
    } catch (err) {
      console.error("Erro ao buscar histórico de treinos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const user = authData?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      
      const { data } = await supabaseClient
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setProfile(data);
        fetchHistory(user.id);
      }
    } catch (err) {
      console.error("Erro:", err);
      setLoading(false);
    }
  }, [router, fetchHistory]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    setSelectedDayISO(null);
  };

  const getMonthName = (date: Date) => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  // Group workouts by ISO date
  const workoutsByDate = new Map<string, any[]>();
  workouts.forEach(w => {
    const key = w.data_conclusao;
    if (!workoutsByDate.has(key)) {
      workoutsByDate.set(key, []);
    }
    workoutsByDate.get(key)!.push(w);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(new Date(year, month, i));
  }

  const getISOString = (date: Date | null) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handleDayClick = (iso: string) => {
    setSelectedDayISO(iso);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando calendário..." />
      </div>
    );
  }

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-36 text-text-primary">
        <div className="max-w-lg mx-auto flex flex-col gap-6">
          
          {/* Header */}
          <div className="flex items-center gap-3 pt-2">
            <Link 
              href="/aluno/perfil" 
              className="w-10 h-10 rounded-full bg-surface-1 border border-border-subtle hover:border-brand/30 flex items-center justify-center text-text-secondary hover:text-brand transition-colors active:scale-95"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-text-primary tracking-tight">Calendário de Treinos</h1>
              <p className="text-xs text-text-tertiary">Histórico completo de sessões executadas</p>
            </div>
          </div>

          {/* Calendar Header with Month/Year + Navigation Carets */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary">{getMonthName(currentDate)}</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateMonth("prev")}
                className="w-8 h-8 rounded-lg bg-surface-1 border border-border-subtle hover:border-brand/35 flex items-center justify-center text-text-secondary hover:text-brand active:scale-95 transition-all cursor-pointer"
              >
                <CaretLeft size={16} />
              </button>
              <button
                onClick={() => navigateMonth("next")}
                className="w-8 h-8 rounded-lg bg-surface-1 border border-border-subtle hover:border-brand/35 flex items-center justify-center text-text-secondary hover:text-brand active:scale-95 transition-all cursor-pointer"
              >
                <CaretRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar Grid Container with Styled Border */}
          <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4">
            {/* Week days labels */}
            <div className="grid grid-cols-7 text-center gap-1 mb-2">
              {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map(day => (
                <span key={day} className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{day}</span>
              ))}
            </div>

            {/* Calendar cells grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {cells.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
                }

                const iso = getISOString(cell);
                const hasWorkout = workoutsByDate.has(iso);
                const isSelected = selectedDayISO === iso;
                const isToday = getISOString(new Date()) === iso;

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => handleDayClick(iso)}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold relative transition-all active:scale-95",
                      hasWorkout 
                        ? "bg-brand/20 text-brand border border-brand/30 hover:bg-brand/30"
                        : "text-text-secondary hover:bg-surface-2",
                      isSelected && "ring-2 ring-brand ring-offset-2 ring-offset-surface-0",
                      isToday && !hasWorkout && "border border-text-tertiary/40"
                    )}
                  >
                    <span>{cell.getDate()}</span>
                    {hasWorkout && (
                      <span className="w-1 h-1 rounded-full bg-brand absolute bottom-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workouts Detail Pane */}
          <div className="mt-2">
            <h3 className="text-xs font-semibold text-text-tertiary mb-3 px-1">
              {selectedDayISO 
                ? `Treinos em ${formatWorkoutDate(selectedDayISO)}` 
                : "Selecione um dia no calendário para ver os treinos"
              }
            </h3>

            {selectedDayISO ? (
              workoutsByDate.has(selectedDayISO) ? (
                <div className="flex flex-col gap-4">
                  {workoutsByDate.get(selectedDayISO)!.map((workout, idx) => (
                    <div
                      key={idx}
                      className="bg-surface-1 border border-border-subtle rounded-2xl p-5"
                    >
                      {/* Linha: avatar + username + data */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-brand/20 flex items-center justify-center text-brand text-sm font-bold border border-brand/30 flex-shrink-0">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getInitials(profile?.full_name || "")
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary leading-none truncate">{profile?.full_name || 'Atleta'}</p>
                          <p className="text-xs text-text-tertiary mt-0.5">{formatWorkoutDate(workout.data_conclusao)}</p>
                        </div>
                      </div>

                      {/* Nome do treino */}
                      <h3 className="text-xl font-black text-text-primary mb-3 uppercase tracking-tight">{workout.nome_rotina}</h3>

                      {/* Métricas: Tempo | Volume | Séries */}
                      <div className="flex items-start gap-6 mb-4">
                        <div>
                          <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold mb-0.5">Tempo</p>
                          <p className="text-sm font-bold text-text-primary">
                            {(() => {
                              const totalMin = Math.max(30, workout.totalSets * 4 + 10);
                              const h = Math.floor(totalMin / 60);
                              const m = totalMin % 60;
                              return h > 0 ? `${h}h ${m}min` : `${m}min`;
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold mb-0.5">Volume</p>
                          <p className="text-sm font-bold text-text-primary">
                            {workout.volumeTotal > 0 ? `${workout.volumeTotal.toLocaleString('pt-BR')} kg` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold mb-0.5">Séries</p>
                          <p className="text-sm font-bold text-text-primary">{workout.totalSets}</p>
                        </div>
                      </div>

                      {/* Lista completa de exercícios */}
                      <div className="flex flex-col gap-2.5">
                        {workout.exercises.map((ex: any, exIdx: number) => (
                          <div key={exIdx} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center flex-shrink-0">
                              <Barbell size={15} className="text-text-tertiary" />
                            </div>
                            <span className="text-sm text-text-primary">
                              <span className="font-semibold">{ex.completedSets} {ex.completedSets === 1 ? 'série' : 'séries'}</span>
                              {' '}{ex.nome}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface-1 border border-dashed border-border-subtle rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
                  <Calendar size={32} className="text-text-disabled" />
                  <div>
                    <p className="text-sm font-semibold text-text-secondary">Nenhum treino no dia selecionado</p>
                    <p className="text-xs text-text-tertiary mt-1">Selecione um dia com preenchimento azul para ver os detalhes</p>
                  </div>
                </div>
              )
            ) : (
              <div className="bg-surface-1 border border-dashed border-border-subtle rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
                <Calendar size={32} className="text-text-disabled" />
                <div>
                  <p className="text-sm font-semibold text-text-secondary">Nenhum dia selecionado</p>
                  <p className="text-xs text-text-tertiary mt-1">Toque em qualquer dia do calendário para visualizar a rotina feita</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </SubscriptionGuard>
  );
}
