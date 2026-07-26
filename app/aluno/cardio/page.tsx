'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, HeartStraight, Plus, X } from '@phosphor-icons/react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { inicioSemanaISO, toISODate } from '@/lib/utils/cardio';
import type { CardioPrescricao, CardioSessao } from '@/lib/types/cardio';
import { registrarSessaoCardio, excluirSessaoCardio } from './actions';
import { CardioKpis } from './components/CardioKpis';
import { CardioForm, type CardioFormValues } from './components/CardioForm';
import { CardioHistorico } from './components/CardioHistorico';
import { CardioKcalChart, type KcalSemanaDatum } from './components/CardioKcalChart';
import { PrescricaoCard } from './components/PrescricaoCard';

const SEMANAS_NO_GRAFICO = 8;

function semanasRecentes(sessoes: CardioSessao[]): KcalSemanaDatum[] {
  const hoje = new Date();
  const buckets: KcalSemanaDatum[] = [];

  for (let i = SEMANAS_NO_GRAFICO - 1; i >= 0; i--) {
    const ref = new Date(hoje);
    ref.setDate(ref.getDate() - i * 7);
    const inicio = inicioSemanaISO(ref);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 6);

    const kcal = sessoes.reduce((acc, s) => {
      if (s.data >= inicio && s.data <= toISODate(fim)) {
        return acc + (Number(s.kcal_calculado) || 0);
      }
      return acc;
    }, 0);

    const [, mes, dia] = inicio.split('-');
    buckets.push({ semana: `${dia}/${mes}`, kcal });
  }

  return buckets;
}

export default function CardioPage() {
  const [loading, setLoading] = useState(true);
  const [sessoes, setSessoes] = useState<CardioSessao[]>([]);
  const [prescricoes, setPrescricoes] = useState<CardioPrescricao[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [preset, setPreset] = useState<{ modalidade?: string; duracao?: number; prescricaoId?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [avisoPeso, setAvisoPeso] = useState(false);
  const [sessaoParaExcluir, setSessaoParaExcluir] = useState<CardioSessao | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const fetchData = useCallback(async () => {
    const session = await getSafeSession();
    const user = session?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: sessoesData }, { data: prescricoesData }, { data: medidaData }] =
      await Promise.all([
        supabaseClient
          .from('cardio_sessoes')
          .select('*')
          .eq('aluno_id', user.id)
          .order('data', { ascending: false })
          .limit(60),
        supabaseClient
          .from('cardio_prescricoes')
          .select('*')
          .eq('aluno_id', user.id)
          .eq('ativo', true)
          .order('created_at', { ascending: false }),
        supabaseClient
          .from('medidas_aluno')
          .select('peso')
          .eq('aluno_id', user.id)
          .not('peso', 'is', null)
          .limit(1),
      ]);

    setSessoes((sessoesData as CardioSessao[]) ?? []);
    setPrescricoes((prescricoesData as CardioPrescricao[]) ?? []);
    setAvisoPeso((medidaData?.length ?? 0) === 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = useMemo(() => {
    const inicio = inicioSemanaISO();
    const daSemana = sessoes.filter((s) => s.data >= inicio);
    const kcalSemana = daSemana.reduce((acc, s) => acc + (Number(s.kcal_calculado) || 0), 0);
    const duracaoTotal = daSemana.reduce((acc, s) => acc + s.duracao_min, 0);

    return {
      kcalSemana: Math.round(kcalSemana),
      sessoesSemana: daSemana.length,
      duracaoMediaMin: daSemana.length ? Math.round(duracaoTotal / daSemana.length) : 0,
    };
  }, [sessoes]);

  const grafico = useMemo(() => semanasRecentes(sessoes), [sessoes]);

  const abrirForm = (p?: CardioPrescricao) => {
    setPreset(
      p ? { modalidade: p.modalidade, duracao: p.duracao_min, prescricaoId: p.id } : {},
    );
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (values: CardioFormValues) => {
    setSubmitting(true);
    setFormError(null);

    const session = await getSafeSession();
    const token = session?.access_token;
    if (!token) {
      setFormError('Sessão expirada. Entre novamente.');
      setSubmitting(false);
      return;
    }

    const result = await registrarSessaoCardio(token, {
      ...values,
      prescricaoId: preset.prescricaoId,
    });

    if (!result.success) {
      setFormError(result.error ?? 'Falha ao registrar.');
      setSubmitting(false);
      return;
    }

    setFormOpen(false);
    setSubmitting(false);
    await fetchData();
  };

  const handleDelete = async () => {
    if (!sessaoParaExcluir) return;
    setExcluindo(true);

    const session = await getSafeSession();
    const token = session?.access_token;
    if (!token) {
      setExcluindo(false);
      setSessaoParaExcluir(null);
      return;
    }

    await excluirSessaoCardio(token, sessaoParaExcluir.id);
    setExcluindo(false);
    setSessaoParaExcluir(null);
    await fetchData();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0">
        <DumbbellLoader text="Carregando cardio..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-4 pb-24 md:p-6 lg:p-10 lg:pl-28">
      <div className="mx-auto flex max-w-lg flex-col gap-5">
        <div>
          <Link
            href="/aluno/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 text-2xs uppercase tracking-caps text-brand"
          >
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-text-primary">
                Cardio
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Registre suas sessões e acompanhe o gasto calórico
              </p>
            </div>
            <HeartStraight className="h-7 w-7 shrink-0 text-danger" weight="fill" />
          </div>
        </div>

        <CardioKpis
          kcalSemana={kpis.kcalSemana}
          sessoesSemana={kpis.sessoesSemana}
          duracaoMediaMin={kpis.duracaoMediaMin}
          semMedidaReal={avisoPeso}
        />

        <CardioKcalChart data={grafico} />

        {prescricoes.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
              Prescrito pelo coach
            </h2>
            {prescricoes.map((p) => (
              <PrescricaoCard key={p.id} prescricao={p} onRegistrar={abrirForm} />
            ))}
          </section>
        )}

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
              Histórico
            </h2>
            <button
              type="button"
              onClick={() => abrirForm()}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-brand px-3 py-2 text-[11px] font-semibold text-white touch-manipulation"
            >
              <Plus size={12} weight="bold" /> Nova sessão
            </button>
          </div>
          <CardioHistorico sessoes={sessoes} onDelete={setSessaoParaExcluir} />
        </section>
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cardio-form-title"
          onClick={() => !submitting && setFormOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border-0 bg-surface-1 p-5 sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="cardio-form-title" className="text-lg font-semibold text-text-primary">
                Registrar cardio
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Fechar"
                className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-input text-text-tertiary touch-manipulation"
              >
                <X size={15} />
              </button>
            </div>

            <CardioForm
              modalidadePreset={preset.modalidade}
              duracaoPreset={preset.duracao}
              submitting={submitting}
              error={formError}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        open={sessaoParaExcluir !== null}
        title="Excluir sessão"
        description={
          sessaoParaExcluir
            ? `A sessão de ${sessaoParaExcluir.modalidade} será removida do seu histórico. Essa ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        confirmVariant="danger"
        loading={excluindo}
        onConfirm={handleDelete}
        onClose={() => setSessaoParaExcluir(null)}
      />
    </div>
  );
}
