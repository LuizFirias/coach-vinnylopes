// Server actions do cardio do aluno.
// kcal e zona de FC são derivados aqui — o client nunca envia esses valores.

'use server';

import { createClient } from '@/lib/supabase/server';
import { CARDIO_PESO_FALLBACK_KG } from '@/lib/constants/cardio';
import type { ZonaFC } from '@/lib/constants/cardio';
import {
  calcFcMax,
  calcIdade,
  calcKcal,
  calcZonaFC,
  normalizarSexo,
} from '@/lib/utils/cardio';

export interface RegistrarSessaoInput {
  prescricaoId?: string;
  modalidade: string;
  data: string;
  duracaoMin: number;
  fcMedia?: number;
  distanciaKm?: number;
  rpe?: number;
  observacao?: string;
}

export interface RegistrarSessaoResult {
  success: boolean;
  error?: string;
  /** false = kcal estimada com peso padrão, porque o aluno não tem medidas. */
  temMedidaReal?: boolean;
  kcal?: number | null;
  zonaFc?: ZonaFC | null;
}

function validarInput(input: RegistrarSessaoInput): string | null {
  if (!input.modalidade?.trim()) return 'Informe a modalidade.';
  if (!Number.isFinite(input.duracaoMin) || input.duracaoMin <= 0 || input.duracaoMin > 600) {
    return 'Duração deve estar entre 1 e 600 minutos.';
  }
  if (input.fcMedia !== undefined && (input.fcMedia < 30 || input.fcMedia > 250)) {
    return 'FC média deve estar entre 30 e 250 bpm.';
  }
  if (input.distanciaKm !== undefined && (input.distanciaKm <= 0 || input.distanciaKm > 999)) {
    return 'Distância inválida.';
  }
  if (input.rpe !== undefined && (input.rpe < 1 || input.rpe > 10)) {
    return 'RPE deve estar entre 1 e 10.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data)) return 'Data inválida.';
  return null;
}

export async function registrarSessaoCardio(
  accessToken: string,
  input: RegistrarSessaoInput,
): Promise<RegistrarSessaoResult> {
  try {
    const validacao = validarInput(input);
    if (validacao) return { success: false, error: validacao };

    const supabase = createClient(accessToken);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Não autenticado' };

    const [{ data: perfil }, { data: ultimaMedida }] = await Promise.all([
      supabase.from('profiles').select('date_of_birth, sexo').eq('id', user.id).maybeSingle(),
      supabase
        .from('medidas_aluno')
        .select('peso')
        .eq('aluno_id', user.id)
        .not('peso', 'is', null)
        .order('data_medicao', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const pesoMedido = ultimaMedida?.peso ? Number(ultimaMedida.peso) : null;
    const pesoKg = pesoMedido ?? CARDIO_PESO_FALLBACK_KG;
    const temMedidaReal = pesoMedido !== null;

    const idadeUsada = perfil?.date_of_birth ? calcIdade(perfil.date_of_birth) : null;

    let kcalCalculado: number | null = null;
    let zonaFc: ZonaFC | null = null;

    if (input.fcMedia && idadeUsada) {
      zonaFc = calcZonaFC(input.fcMedia, calcFcMax(idadeUsada));
      kcalCalculado = calcKcal({
        fcMedia: input.fcMedia,
        pesoKg,
        idade: idadeUsada,
        sexo: normalizarSexo(perfil?.sexo),
        duracaoMin: input.duracaoMin,
      });
    }

    const { error } = await supabase.from('cardio_sessoes').insert({
      aluno_id: user.id,
      prescricao_id: input.prescricaoId ?? null,
      modalidade: input.modalidade.trim(),
      data: input.data,
      duracao_min: input.duracaoMin,
      fc_media: input.fcMedia ?? null,
      distancia_km: input.distanciaKm ?? null,
      rpe: input.rpe ?? null,
      kcal_calculado: kcalCalculado,
      peso_usado: pesoKg,
      idade_usada: idadeUsada,
      zona_fc: zonaFc,
      observacao: input.observacao?.trim() || null,
    });

    if (error) {
      console.error('[registrarSessaoCardio] Erro:', error);
      return { success: false, error: 'Falha ao registrar sessão de cardio.' };
    }

    return { success: true, temMedidaReal, kcal: kcalCalculado, zonaFc };
  } catch (err) {
    console.error('[registrarSessaoCardio] Exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    };
  }
}

export async function excluirSessaoCardio(
  accessToken: string,
  sessaoId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(accessToken);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Não autenticado' };

    const { error } = await supabase
      .from('cardio_sessoes')
      .delete()
      .eq('id', sessaoId)
      .eq('aluno_id', user.id);

    if (error) {
      console.error('[excluirSessaoCardio] Erro:', error);
      return { success: false, error: 'Falha ao excluir sessão.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[excluirSessaoCardio] Exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    };
  }
}
