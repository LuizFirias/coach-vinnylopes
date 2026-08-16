import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateItemMacros, sumMacros } from "@/lib/nutrition/calculateMacros";
import {
  assessorDateRange,
  toDateKey,
  type AssessorPeriodo,
} from "@/lib/ai/assessorPeriod";

type SerieSessao = {
  completado?: boolean;
  reps?: number | string;
  reps_executadas?: number | string;
  peso_atual?: number | string;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function assertCoachOwnsAluno(
  coachId: string,
  alunoId: string,
): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from("coach_alunos")
    .select("aluno_id")
    .eq("coach_id", coachId)
    .eq("aluno_id", alunoId)
    .maybeSingle();
  return Boolean(data);
}

/** Pacote estatístico do aluno para a IA (treino, dieta, medidas, água). */
export async function buildAlunoAssessorContext(
  alunoId: string,
  periodo: AssessorPeriodo,
) {
  const range = assessorDateRange(periodo);
  const startDate = range.startIso.slice(0, 10);
  const endDate = range.endIso.slice(0, 10);
  const supabase = getSupabaseAdmin();

  const [
    profileRes,
    historicoRes,
    medidasRes,
    fotosRes,
    planRes,
    checkinsRes,
    aguaRes,
    cardioRes,
    recordesRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, sexo, date_of_birth, height_cm, objetivo, coaching_reference",
      )
      .eq("id", alunoId)
      .maybeSingle(),
    supabase
      .from("historico_treinos")
      .select("id, exercicio_id, data_conclusao, dados_sessao")
      .eq("aluno_id", alunoId)
      .gte("data_conclusao", range.startIso)
      .lte("data_conclusao", range.endIso)
      .order("data_conclusao", { ascending: true })
      .limit(800),
    supabase
      .from("medidas_aluno")
      .select(
        "data_medicao, peso, gordura_corporal, massa_magra, cintura, peitoral, abdomen, quadril",
      )
      .eq("aluno_id", alunoId)
      .gte("data_medicao", range.startIso)
      .lte("data_medicao", range.endIso)
      .order("data_medicao", { ascending: true }),
    supabase
      .from("fotos_evolucao")
      .select("posicao, data_upload, periodo_referencia")
      .eq("aluno_id", alunoId)
      .order("data_upload", { ascending: false })
      .limit(12),
    supabase
      .from("nutrition_plans")
      .select("id, name, goal, calories_target, protein_target, carbs_target, fat_target, orientacoes_gerais, status")
      .eq("student_id", alunoId)
      .eq("status", "active")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("nutrition_meal_checkins")
      .select(
        `
        checkin_date, status, meal_id,
        meal:nutrition_meals (
          items:nutrition_meal_items (
            quantity_grams,
            food:nutrition_foods (
              calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g
            )
          )
        )
      `,
      )
      .eq("student_id", alunoId)
      .gte("checkin_date", startDate)
      .lte("checkin_date", endDate),
    supabase
      .from("registros_agua")
      .select("data_registro, copos, ml_por_copo")
      .eq("aluno_id", alunoId)
      .gte("data_registro", startDate)
      .lte("data_registro", endDate)
      .order("data_registro", { ascending: true }),
    supabase
      .from("cardio_sessoes")
      .select("data, modalidade, duracao_min, kcal_calculado, distancia_km, rpe")
      .eq("aluno_id", alunoId)
      .gte("data", startDate)
      .lte("data", endDate)
      .order("data", { ascending: true }),
    supabase
      .from("recordes_pessoais")
      .select("exercicio_id, peso, reps, conquistado_em")
      .eq("aluno_id", alunoId)
      .order("conquistado_em", { ascending: false })
      .limit(20),
  ]);

  const historico = historicoRes.data || [];
  const exercicioIds = [
    ...new Set(historico.map((h) => h.exercicio_id).filter(Boolean)),
  ] as string[];
  const { data: exercicios } = exercicioIds.length
    ? await supabase
        .from("exercicios_biblioteca")
        .select("id, nome, grupo_muscular")
        .in("id", exercicioIds)
    : { data: [] as { id: string; nome: string; grupo_muscular: string | null }[] };
  const nomeEx = new Map((exercicios || []).map((e) => [e.id, e.nome]));
  const grupoEx = new Map((exercicios || []).map((e) => [e.id, e.grupo_muscular]));

  const byExercise = new Map<
    string,
    {
      nome: string;
      grupo: string | null;
      sessoes: number;
      volumeKg: number;
      pesos: number[];
    }
  >();
  const diasTreino = new Set<string>();

  for (const row of historico) {
    const ds = (row.dados_sessao || {}) as {
      series?: SerieSessao[];
      nome_exercicio?: string;
    };
    const series = (ds.series || []).filter((s) => s.completado);
    if (series.length === 0) continue;
    const day = toDateKey(row.data_conclusao);
    diasTreino.add(day);
    const id = row.exercicio_id || ds.nome_exercicio || "desconhecido";
    const cur = byExercise.get(id) || {
      nome: nomeEx.get(row.exercicio_id) || ds.nome_exercicio || "Exercício",
      grupo: grupoEx.get(row.exercicio_id) || null,
      sessoes: 0,
      volumeKg: 0,
      pesos: [] as number[],
    };
    cur.sessoes += 1;
    for (const s of series) {
      const peso = num(s.peso_atual);
      const reps = num(s.reps_executadas ?? s.reps);
      cur.volumeKg += peso * reps;
      if (peso > 0) cur.pesos.push(peso);
    }
    byExercise.set(id, cur);
  }

  const dinamicaCarga = [...byExercise.values()].map((ex) => {
    const primeiro = ex.pesos[0] ?? null;
    const ultimo = ex.pesos[ex.pesos.length - 1] ?? null;
    const deltaKg =
      primeiro != null && ultimo != null ? Math.round((ultimo - primeiro) * 10) / 10 : null;
    const deltaPct =
      primeiro && ultimo && primeiro > 0
        ? Math.round(((ultimo - primeiro) / primeiro) * 1000) / 10
        : null;
    return {
      exercicio: ex.nome,
      grupo_muscular: ex.grupo,
      sessoes_no_periodo: ex.sessoes,
      volume_kg: Math.round(ex.volumeKg),
      carga_inicial_kg: primeiro,
      carga_final_kg: ultimo,
      variacao_kg: deltaKg,
      variacao_pct: deltaPct,
    };
  });

  const checkins = checkinsRes.data || [];
  const macrosPorDia = new Map<string, ReturnType<typeof sumMacros>>();
  let refeicoesFeitas = 0;
  let refeicoesPuladas = 0;

  for (const c of checkins) {
    const day = String(c.checkin_date).slice(0, 10);
    if (c.status === "skipped") {
      refeicoesPuladas += 1;
      continue;
    }
    if (c.status !== "done" && c.status !== "substituted" && c.status !== "partial") {
      continue;
    }
    refeicoesFeitas += 1;
    const mealRaw = c.meal as unknown;
    const mealObj = (Array.isArray(mealRaw) ? mealRaw[0] : mealRaw) as {
      items?: {
        quantity_grams: number;
        food?: {
          calories_per_100g: number;
          protein_per_100g: number;
          carbs_per_100g: number;
          fat_per_100g: number;
        } | null;
      }[];
    } | null;
    const items = (mealObj?.items || []).map((i) => {
      const foodRaw = i.food as unknown;
      const food = (Array.isArray(foodRaw) ? foodRaw[0] : foodRaw) as {
        calories_per_100g: number;
        protein_per_100g: number;
        carbs_per_100g: number;
        fat_per_100g: number;
      } | null;
      if (!food) return null;
      return calculateItemMacros(food, Number(i.quantity_grams) || 0);
    }).filter((x): x is NonNullable<typeof x> => Boolean(x));
    const daySum = macrosPorDia.get(day) || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    };
    macrosPorDia.set(day, sumMacros([daySum, ...items]));
  }

  const plan = planRes.data;
  const kcalPrescritasDia = Number(plan?.calories_target) || 0;
  const kcalPrescritasPeriodo = kcalPrescritasDia * range.dias;
  const kcalIngeridas = [...macrosPorDia.values()].reduce(
    (acc, m) => acc + m.calories,
    0,
  );
  const aderenciaKcalPct =
    kcalPrescritasPeriodo > 0
      ? Math.round((kcalIngeridas / kcalPrescritasPeriodo) * 1000) / 10
      : null;

  const agua = aguaRes.data || [];
  const diasComAgua = agua.filter((a) => (a.copos || 0) > 0).length;
  const mlTotal = agua.reduce(
    (acc, a) => acc + (Number(a.copos) || 0) * (Number(a.ml_por_copo) || 250),
    0,
  );

  const medidas = medidasRes.data || [];
  const primeira = medidas[0];
  const ultima = medidas[medidas.length - 1];

  const cardio = cardioRes.data || [];
  const kcalCardio = cardio.reduce(
    (acc, s) => acc + (Number(s.kcal_calculado) || 0),
    0,
  );

  return {
    periodo,
    janela: { de: startDate, ate: endDate, dias: range.dias },
    aluno: profileRes.data,
    treino: {
      dias_com_treino: diasTreino.size,
      frequencia_pct: Math.round((diasTreino.size / range.dias) * 1000) / 10,
      exercicios: dinamicaCarga,
      volume_total_kg: dinamicaCarga.reduce((acc, e) => acc + e.volume_kg, 0),
    },
    dieta: {
      plano: plan
        ? {
            nome: plan.name,
            objetivo: plan.goal,
            kcal_alvo_dia: kcalPrescritasDia,
            proteina_alvo_g: plan.protein_target,
            carbo_alvo_g: plan.carbs_target,
            gordura_alvo_g: plan.fat_target,
            orientacoes: plan.orientacoes_gerais,
          }
        : null,
      kcal_prescritas_periodo: kcalPrescritasPeriodo,
      kcal_ingeridas_periodo: Math.round(kcalIngeridas),
      aderencia_kcal_pct: aderenciaKcalPct,
      refeicoes_feitas: refeicoesFeitas,
      refeicoes_puladas: refeicoesPuladas,
      por_dia: [...macrosPorDia.entries()].map(([data, m]) => ({
        data,
        kcal: m.calories,
        proteina_g: m.protein,
        carbo_g: m.carbs,
        gordura_g: m.fat,
        kcal_prescritas: kcalPrescritasDia,
      })),
    },
    hidratacao: {
      dias_com_registro: diasComAgua,
      frequencia_pct: Math.round((diasComAgua / range.dias) * 1000) / 10,
      ml_total: mlTotal,
      ml_medio_nos_dias_registrados:
        diasComAgua > 0 ? Math.round(mlTotal / diasComAgua) : 0,
      registros: agua.map((a) => ({
        data: a.data_registro,
        ml: (Number(a.copos) || 0) * (Number(a.ml_por_copo) || 250),
        copos: a.copos,
      })),
    },
    medidas: {
      registros_no_periodo: medidas.length,
      inicio: primeira || null,
      fim: ultima || null,
    },
    fotos_recentes: fotosRes.data || [],
    cardio: {
      sessoes: cardio.length,
      kcal_gastas: Math.round(kcalCardio),
    },
    recordes_recentes: recordesRes.data || [],
    notas_para_ia: [
      "kcal_ingeridas vêm das refeições com check-in (feita/substituída), usando os alimentos prescritos — o aluno não registra item a item o que comeu fora do plano.",
      "kcal de musculação não são gravadas; gasto calórico extra está em cardio.kcal_gastas.",
      "Use este JSON para relatório de dinâmica de carga e para orientar o coach, não o aluno diretamente.",
    ],
  };
}
