"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import SubscriptionGuard from "@/app/components/SubscriptionGuard";
import { WorkoutCalendarHeader } from "@/app/components/calendar/WorkoutCalendarHeader";
import { WorkoutCalendarGrid } from "@/app/components/calendar/WorkoutCalendarGrid";
import {
  WorkoutDayDetail,
  type WorkoutSession,
} from "@/app/components/calendar/WorkoutDayDetail";

function toWorkoutDateKey(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getISOString(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatWorkoutDate(isoString: string) {
  const dateKey = toWorkoutDateKey(isoString);
  if (!dateKey) return "";
  const parts = dateKey.split("-").map(Number);
  if (parts.length < 3) return dateKey;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const formatted = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getMonthName(date: Date) {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[date.getMonth()]} de ${date.getFullYear()}`;
}

export default function AlunoCalendario() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const fetchHistory = useCallback(async (uid: string) => {
    try {
      const { getHistoricoTreinosFull } = await import('@/lib/queries/historicoTreinosCache');
      const historicoData = await getHistoricoTreinosFull(uid);
      const sessoesPorData = new Map<string, typeof historicoData>();
      historicoData.forEach((h) => {
        const key = toWorkoutDateKey(h.data_conclusao);
        if (!key) return;
        if (!sessoesPorData.has(key)) sessoesPorData.set(key, []);
        sessoesPorData.get(key)!.push(h);
      });

      const sessoesList: WorkoutSession[] = Array.from(sessoesPorData.entries()).map(
        ([data, exerciciosSessao]) => {
          const firstEx = exerciciosSessao[0];
          const ds0 = (firstEx?.dados_sessao ?? {}) as Record<string, unknown>;
          const nome_rotina = (ds0.nome_rotina as string) || "Treino";

          let volumeTotal = 0;
          let totalSets = 0;
          const parsedExercises = exerciciosSessao.map((ex) => {
            const ds = (ex.dados_sessao ?? {}) as Record<string, unknown>;
            const series = (ds.series as Array<{ completado?: boolean; peso_atual?: number | string; reps?: number | string }>) || [];
            const completedSeries = series.filter((s) => s.completado);
            totalSets += completedSeries.length;

            completedSeries.forEach((s) => {
              const peso = Number(s.peso_atual) || 0;
              const reps = Number(s.reps) || 0;
              volumeTotal += peso * reps;
            });

            return {
              nome: (ds.nome_exercicio as string) || "Exercício",
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
        }
      );

      setWorkouts(sessoesList);
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
      fetchHistory(user.id);
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

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    workouts.forEach((w) => {
      const key = toWorkoutDateKey(w.data_conclusao);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    });
    return map;
  }, [workouts]);

  const workoutDates = useMemo(
    () => new Set(workoutsByDate.keys()),
    [workoutsByDate]
  );

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

  const todayISO = getISOString(new Date());
  const selectedWorkouts = selectedDayISO
    ? workoutsByDate.get(selectedDayISO) ?? []
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando calendário..." />
      </div>
    );
  }

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-surface-0 px-4 pb-36 lg:px-8 lg:pb-12 lg:pl-28 text-text-primary">
        <div className="max-w-[720px] mx-auto flex flex-col gap-4 lg:gap-6 lg:pt-10">
          <WorkoutCalendarHeader />

          <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
            <WorkoutCalendarGrid
              cells={cells}
              monthLabel={getMonthName(currentDate)}
              todayISO={todayISO}
              selectedDayISO={selectedDayISO}
              workoutDates={workoutDates}
              isDesktop={isDesktop}
              onPrevMonth={() => navigateMonth("prev")}
              onNextMonth={() => navigateMonth("next")}
              onDayClick={setSelectedDayISO}
              getISOString={getISOString}
            />

            <div className="lg:min-h-[320px] lg:overflow-y-auto">
              <WorkoutDayDetail
                selectedDayISO={selectedDayISO}
                workouts={selectedWorkouts}
                formatWorkoutDate={formatWorkoutDate}
              />
            </div>
          </div>
        </div>
      </div>
    </SubscriptionGuard>
  );
}
