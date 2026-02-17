"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

interface Exercise {
  id: string;
  nome: string;
}

interface Registro {
  id: string;
  exercise_id: string;
  series: number;
  reps: number;
  carga: number;
  created_at: string;
}

export default function FichaTreinoPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [inputs, setInputs] = useState<Record<string, { series: string; reps: string; carga: string }>>({});
  const [lastCarga, setLastCarga] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user;
        if (!user) {
          setMsg("Usuário não autenticado");
          setLoading(false);
          return;
        }

        // tentar carregar exercícios da tabela 'exercicios', senão usar fallback
        const { data: exData } = await supabaseClient.from("exercicios").select("id, nome").order("nome", { ascending: true });

        let exList: Exercise[] = [];
        if (exData && exData.length > 0) {
          exList = exData as Exercise[];
        } else {
          // fallback examples
          exList = [
            { id: "ex-squat", nome: "Agachamento" },
            { id: "ex-bench", nome: "Supino" },
            { id: "ex-deadlift", nome: "Levantamento Terra" },
            { id: "ex-row", nome: "Remada" },
          ];
        }

        setExercises(exList);

        // init inputs
        const inputInit: Record<string, { series: string; reps: string; carga: string }> = {};
        exList.forEach((ex) => (inputInit[ex.id] = { series: "", reps: "", carga: "" }));
        setInputs(inputInit);

        // carregar último registro de cada exercício para o usuário
        const exIds = exList.map((e) => e.id);
        const { data: registros } = await supabaseClient
          .from("registros_treino")
          .select("id, exercise_id, carga, created_at")
          .eq("user_id", user.id)
          .in("exercise_id", exIds)
          .order("created_at", { ascending: false });

        const lastMap: Record<string, number | null> = {};
        exIds.forEach((id) => (lastMap[id] = null));
        if (registros && registros.length > 0) {
          for (const r of registros as Registro[]) {
            if (lastMap[r.exercise_id] == null) lastMap[r.exercise_id] = r.carga;
          }
        }
        setLastCarga(lastMap);
      } catch (err: any) {
        setMsg(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleChange = (exerciseId: string, field: 'series' | 'reps' | 'carga', value: string) => {
    setInputs((prev) => ({ ...prev, [exerciseId]: { ...prev[exerciseId], [field]: value } }));
  };

  const handleSave = async (exerciseId: string) => {
    const vals = inputs[exerciseId];
    if (!vals) return;
    const series = Number(vals.series);
    const reps = Number(vals.reps);
    const carga = Number(vals.carga);

    if (!series || !reps || !carga) {
      setMsg('Preencha Séries, Reps e Carga corretamente.');
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    setSavingIds((s) => new Set(s).add(exerciseId));
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabaseClient.from('registros_treino').insert({
        user_id: user.id,
        exercise_id: exerciseId,
        series,
        reps,
        carga,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // atualizar lastCarga local
      setLastCarga((prev) => ({ ...prev, [exerciseId]: carga }));
      setMsg('Série salva com sucesso');
      setTimeout(() => setMsg(null), 2500);
      // limpar inputs para aquele exercício
      setInputs((p) => ({ ...p, [exerciseId]: { series: '', reps: '', carga: '' } }));
    } catch (err: any) {
      setMsg(err?.message || String(err));
    } finally {
      setSavingIds((s) => {
        const next = new Set(s);
        next.delete(exerciseId);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-coach-black p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">Ficha de Treino</h1>
          <p className="text-gray-400">Registre suas séries e acompanhe a última carga usada.</p>
        </header>

        {msg && <div className="mb-4 card-glass">{msg}</div>}

        {loading ? (
          <div className="py-12 text-center text-gray-400">Carregando exercícios...</div>
        ) : (
          <div className="space-y-4">
            {exercises.map((ex) => (
              <div key={ex.id} className="card-glass flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">{ex.nome}</h3>
                    <div className="text-sm text-gray-300">Última carga: <span className="text-coach-gold font-semibold">{lastCarga[ex.id] ?? '—'}</span></div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3 max-w-sm">
                    <input
                      type="number"
                      placeholder="Séries"
                      value={inputs[ex.id]?.series || ''}
                      onChange={(e) => handleChange(ex.id, 'series', e.target.value)}
                      className="px-3 py-2 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold"
                    />
                    <input
                      type="number"
                      placeholder="Reps"
                      value={inputs[ex.id]?.reps || ''}
                      onChange={(e) => handleChange(ex.id, 'reps', e.target.value)}
                      className="px-3 py-2 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold"
                    />
                    <input
                      type="number"
                      placeholder="Carga (kg)"
                      value={inputs[ex.id]?.carga || ''}
                      onChange={(e) => handleChange(ex.id, 'carga', e.target.value)}
                      className="px-3 py-2 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold"
                    />
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <button
                    onClick={() => handleSave(ex.id)}
                    disabled={savingIds.has(ex.id)}
                    className="mt-3 md:mt-0 px-6 py-2 bg-linear-to-r from-coach-gold to-coach-gold-dark text-black font-semibold rounded disabled:opacity-60"
                  >
                    {savingIds.has(ex.id) ? 'Salvando...' : 'Salvar Série'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
