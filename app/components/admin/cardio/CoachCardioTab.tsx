'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { HeartStraight, Plus, Trash } from '@phosphor-icons/react';
import { supabaseClient } from '@/lib/supabaseClient';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { DIAS_SEMANA_CURTO, ZONAS_FC } from '@/lib/constants/cardio';
import { formatarDuracao, toISODate } from '@/lib/utils/cardio';
import type { CardioPrescricao, CardioSessao } from '@/lib/types/cardio';
import {
  alternarPrescricaoCardio,
  criarPrescricaoCardio,
  excluirPrescricaoCardio,
} from '@/app/admin/cardio-actions';
import {
  PrescricaoCardioModal,
  type PrescricaoCardioValues,
} from './PrescricaoCardioModal';
import DumbbellLoader from '@/app/components/DumbbellLoader';

interface CoachCardioTabProps {
  alunoId: string;
}

const JANELA_DIAS = 28;

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });
}

export function CoachCardioTab({ alunoId }: CoachCardioTabProps) {
  const [loading, setLoading] = useState(true);
  const [sessoes, setSessoes] = useState<CardioSessao[]>([]);
  const [prescricoes, setPrescricoes] = useState<CardioPrescricao[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prescParaExcluir, setPrescParaExcluir] = useState<CardioPrescricao | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: sessoesData }, { data: prescData }] = await Promise.all([
      supabaseClient
        .from('cardio_sessoes')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('data', { ascending: false })
        .limit(40),
      supabaseClient
        .from('cardio_prescricoes')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('created_at', { ascending: false }),
    ]);

    setSessoes((sessoesData as CardioSessao[]) ?? []);
    setPrescricoes((prescData as CardioPrescricao[]) ?? []);
    setLoading(false);
  }, [alunoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - JANELA_DIAS);
    const limiteISO = toISODate(limite);
    const janela = sessoes.filter((s) => s.data >= limiteISO);

    return {
      kcal: Math.round(janela.reduce((acc, s) => acc + (Number(s.kcal_calculado) || 0), 0)),
      sessoes: janela.length,
      minutos: janela.reduce((acc, s) => acc + s.duracao_min, 0),
    };
  }, [sessoes]);

  const handlePrescrever = async (values: PrescricaoCardioValues) => {
    setSubmitting(true);
    setError(null);

    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      setError('Sessão expirada. Entre novamente.');
      setSubmitting(false);
      return;
    }

    const result = await criarPrescricaoCardio(token, { alunoId, ...values });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? 'Falha ao prescrever.');
      return;
    }

    setModalOpen(false);
    await fetchData();
  };

  const handleToggle = async (presc: CardioPrescricao) => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    await alternarPrescricaoCardio(token, presc.id, !presc.ativo);
    await fetchData();
  };

  const handleExcluirPrescricao = async () => {
    if (!prescParaExcluir) return;
    setExcluindo(true);

    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const token = session?.access_token;

    if (token) {
      await excluirPrescricaoCardio(token, prescParaExcluir.id);
    }

    setExcluindo(false);
    setPrescParaExcluir(null);
    await fetchData();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-surface-2 px-3 py-2 text-[11px] font-semibold text-brand transition-colors hover:border-card-hover"
        >
          <Plus size={12} weight="bold" /> Prescrever
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border-0 bg-surface-1 p-4">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-text-tertiary">
            Kcal 4 semanas
          </p>
          <p className="text-2xl font-black tabular-nums lining-nums tracking-display text-text-primary">
            {kpis.kcal.toLocaleString('pt-BR')}
            <span className="ml-1 text-xs font-bold text-brand">kcal</span>
          </p>
        </div>
        <div className="rounded-xl border-0 bg-surface-1 p-4">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-text-tertiary">Sessões</p>
          <p className="text-2xl font-black tabular-nums lining-nums tracking-display text-text-primary">
            {kpis.sessoes}
          </p>
        </div>
        <div className="rounded-xl border-0 bg-surface-1 p-4">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-text-tertiary">Volume</p>
          <p className="text-2xl font-black tabular-nums lining-nums tracking-display text-text-primary">
            {kpis.minutos}
            <span className="ml-1 text-xs font-bold text-brand">min</span>
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
          Prescrições
        </h4>
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border-0 bg-[var(--dash-card,#111827)] p-8">
            <DumbbellLoader size={36} variant="inline" />
          </div>
        ) : prescricoes.length === 0 ? (
          <div className="rounded-xl border-0 bg-surface-1 p-4">
            <p className="text-xs text-text-tertiary">Nenhuma prescrição de cardio criada.</p>
            <span className="text-[10px] text-text-disabled">
              O aluno ainda pode registrar sessões livres.
            </span>
          </div>
        ) : (
          prescricoes.map((p) => {
            const dias = p.dias_semana
              ?.slice()
              .sort((a, b) => a - b)
              .map((d) => DIAS_SEMANA_CURTO[d])
              .filter(Boolean);

            return (
              <div
                key={p.id}
                className="flex items-start justify-between gap-3 rounded-xl border-0 bg-surface-1 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                    <span className="truncate">{p.modalidade}</span>
                    {!p.ativo && (
                      <span className="rounded-[4px] border border-input bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-text-tertiary">
                        Pausada
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-secondary">
                    <span className="tabular-nums lining-nums">
                      {formatarDuracao(p.duracao_min)}
                    </span>
                    {p.intensidade && <> · {p.intensidade}</>}
                    {p.fc_alvo_min !== null && p.fc_alvo_max !== null && (
                      <>
                        {' · '}
                        <span className="tabular-nums lining-nums">
                          {p.fc_alvo_min}–{p.fc_alvo_max} bpm
                        </span>
                      </>
                    )}
                  </p>
                  {dias && dias.length > 0 && (
                    <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-text-tertiary">
                      {dias.join(' · ')}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(p)}
                    className="rounded-md border border-input bg-surface-2 px-2.5 py-1.5 text-[10px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {p.ativo ? 'Pausar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrescParaExcluir(p)}
                    aria-label={`Excluir prescrição de ${p.modalidade}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-input text-text-tertiary transition-colors hover:text-danger"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
          Sessões recentes
        </h4>
        {sessoes.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border-0 bg-surface-1 p-6 text-center">
            <HeartStraight size={20} className="text-text-disabled" />
            <p className="text-xs text-text-tertiary">Nenhuma sessão de cardio registrada.</p>
          </div>
        ) : (
          sessoes.slice(0, 8).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-xl border-0 bg-surface-1 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-text-primary">
                  {s.modalidade}
                </p>
                <p className="mt-0.5 text-[11px] text-text-secondary">
                  <span className="tabular-nums lining-nums">{formatarData(s.data)}</span>
                  {' · '}
                  <span className="tabular-nums lining-nums">
                    {formatarDuracao(s.duracao_min)}
                  </span>
                  {s.fc_media !== null && (
                    <>
                      {' · '}
                      <span className="tabular-nums lining-nums">{s.fc_media} bpm</span>
                    </>
                  )}
                  {s.rpe !== null && (
                    <>
                      {' · RPE '}
                      <span className="tabular-nums lining-nums">{s.rpe}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {s.zona_fc && (
                  <span
                    className="rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                    style={{
                      backgroundColor: `${ZONAS_FC[s.zona_fc].cor}18`,
                      color: ZONAS_FC[s.zona_fc].cor,
                      border: `1px solid ${ZONAS_FC[s.zona_fc].cor}40`,
                    }}
                  >
                    {s.zona_fc} · {ZONAS_FC[s.zona_fc].nome}
                  </span>
                )}
                {s.kcal_calculado !== null && (
                  <p className="text-[13px] font-bold tabular-nums lining-nums text-danger">
                    {Number(s.kcal_calculado).toLocaleString('pt-BR')}
                    <span className="ml-0.5 text-[10px] font-semibold">kcal</span>
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      <PrescricaoCardioModal
        open={modalOpen}
        submitting={submitting}
        error={error}
        onSubmit={handlePrescrever}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmModal
        open={prescParaExcluir !== null}
        title="Excluir prescrição"
        description={
          prescParaExcluir
            ? `A prescrição de ${prescParaExcluir.modalidade} será removida. As sessões já registradas pelo aluno são mantidas.`
            : ''
        }
        confirmLabel="Excluir"
        confirmVariant="danger"
        loading={excluindo}
        onConfirm={handleExcluirPrescricao}
        onClose={() => setPrescParaExcluir(null)}
      />
    </div>
  );
}
