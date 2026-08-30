// Server actions de prescrição de cardio (coach).
// A faixa de FC alvo é derivada da idade do aluno no servidor.

'use server';

import { createClient } from '@/lib/supabase/server';
import type { CardioIntensidade } from '@/lib/constants/cardio';
import { calcFcAlvo, calcFcMax, calcIdade } from '@/lib/utils/cardio';

export interface CriarPrescricaoInput {
  alunoId: string;
  modalidade: string;
  duracaoMin: number;
  intensidade: CardioIntensidade;
  distanciaAlvoKm?: number;
  velocidadeAlvoKmh?: number;
  inclinacaoAlvoPct?: number;
  nivelResistenciaAlvo?: number;
  diasSemana?: number[];
  observacao?: string;
}

export interface CriarPrescricaoResult {
  success: boolean;
  error?: string;
  /** null quando o aluno não tem data de nascimento cadastrada. */
  fcAlvo?: { min: number; max: number } | null;
}

export async function criarPrescricaoCardio(
  accessToken: string,
  input: CriarPrescricaoInput,
): Promise<CriarPrescricaoResult> {
  try {
    if (!input.alunoId) return { success: false, error: 'Aluno não informado.' };
    if (!input.modalidade?.trim()) return { success: false, error: 'Informe a modalidade.' };
    if (!Number.isFinite(input.duracaoMin) || input.duracaoMin <= 0 || input.duracaoMin > 600) {
      return { success: false, error: 'Duração deve estar entre 1 e 600 minutos.' };
    }
    if (
      input.velocidadeAlvoKmh !== undefined &&
      (input.velocidadeAlvoKmh <= 0 || input.velocidadeAlvoKmh > 40)
    ) {
      return { success: false, error: 'Velocidade alvo inválida.' };
    }
    if (
      input.inclinacaoAlvoPct !== undefined &&
      (input.inclinacaoAlvoPct < 0 || input.inclinacaoAlvoPct > 25)
    ) {
      return { success: false, error: 'Inclinação alvo inválida.' };
    }
    if (
      input.nivelResistenciaAlvo !== undefined &&
      (input.nivelResistenciaAlvo < 1 || input.nivelResistenciaAlvo > 20)
    ) {
      return { success: false, error: 'Nível de resistência alvo inválido.' };
    }

    const supabase = createClient(accessToken);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Não autenticado' };

    const { data: vinculo } = await supabase
      .from('coach_alunos')
      .select('aluno_id')
      .eq('coach_id', user.id)
      .eq('aluno_id', input.alunoId)
      .maybeSingle();

    if (!vinculo) return { success: false, error: 'Aluno não vinculado a este coach.' };

    const { data: perfilAluno } = await supabase
      .from('profiles')
      .select('date_of_birth')
      .eq('id', input.alunoId)
      .maybeSingle();

    const idade = perfilAluno?.date_of_birth ? calcIdade(perfilAluno.date_of_birth) : null;
    const fcAlvo = idade ? calcFcAlvo(calcFcMax(idade), input.intensidade) : null;

    const { error } = await supabase.from('cardio_prescricoes').insert({
      coach_id: user.id,
      aluno_id: input.alunoId,
      modalidade: input.modalidade.trim(),
      duracao_min: input.duracaoMin,
      intensidade: input.intensidade,
      fc_alvo_min: fcAlvo?.min ?? null,
      fc_alvo_max: fcAlvo?.max ?? null,
      distancia_alvo_km: input.distanciaAlvoKm ?? null,
      velocidade_alvo_kmh: input.velocidadeAlvoKmh ?? null,
      inclinacao_alvo_pct: input.inclinacaoAlvoPct ?? null,
      nivel_resistencia_alvo: input.nivelResistenciaAlvo ?? null,
      dias_semana: input.diasSemana?.length ? input.diasSemana : null,
      observacao: input.observacao?.trim() || null,
    });

    if (error) {
      console.error('[criarPrescricaoCardio] Erro:', error);
      return { success: false, error: 'Falha ao criar prescrição de cardio.' };
    }

    return { success: true, fcAlvo };
  } catch (err) {
    console.error('[criarPrescricaoCardio] Exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    };
  }
}

export async function alternarPrescricaoCardio(
  accessToken: string,
  prescricaoId: string,
  ativo: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(accessToken);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Não autenticado' };

    const { error } = await supabase
      .from('cardio_prescricoes')
      .update({ ativo })
      .eq('id', prescricaoId)
      .eq('coach_id', user.id);

    if (error) {
      console.error('[alternarPrescricaoCardio] Erro:', error);
      return { success: false, error: 'Falha ao atualizar prescrição.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[alternarPrescricaoCardio] Exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    };
  }
}

export async function excluirPrescricaoCardio(
  accessToken: string,
  prescricaoId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(accessToken);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Não autenticado' };

    const { error } = await supabase
      .from('cardio_prescricoes')
      .delete()
      .eq('id', prescricaoId)
      .eq('coach_id', user.id);

    if (error) {
      console.error('[excluirPrescricaoCardio] Erro:', error);
      return { success: false, error: 'Falha ao excluir prescrição.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[excluirPrescricaoCardio] Exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    };
  }
}
