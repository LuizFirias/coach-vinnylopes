'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils/cn';
import { supabaseClient } from '@/lib/supabaseClient';
import { getBootstrapProfile } from '@/lib/auth/bootstrapProfile';
import {
  mergedPlans,
  planDisplayName,
  type CoachPlan,
} from '@/lib/coachPlans';
import {
  FORMAS_PAGAMENTO,
  fimPorDuracaoMeses,
  inicioPadraoRenovacao,
  toISODateLocal,
  type FormaPagamento,
} from '@/lib/financeiro/types';

export type RenovarPlanoProfile = {
  status_pagamento?: string | null;
  tipo_plano?: string | null;
  valor_plano?: number | null;
  data_expiracao?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  alunoId: string;
  alunoNome: string;
  profile: RenovarPlanoProfile;
  planosPersonalizados: CoachPlan[];
};

const fieldLabelClass = '[&_label]:text-white/70';
const dateInputClass =
  'w-full h-9 px-3 rounded-[10px] text-[13px] font-medium text-text-primary bg-surface-2 border-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand/30';
const fieldLabelTextClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70';

export function RenovarPlanoModal({
  open,
  onClose,
  onSaved,
  alunoId,
  alunoNome,
  profile,
  planosPersonalizados,
}: Props) {
  const planos = useMemo(
    () => mergedPlans(planosPersonalizados),
    [planosPersonalizados],
  );

  const [status, setStatus] = useState('pago');
  const [plano, setPlano] = useState('mensal');
  const [valor, setValor] = useState('');
  const [dataPagamento, setDataPagamento] = useState(toISODateLocal(new Date()));
  const [periodoInicio, setPeriodoInicio] = useState(toISODateLocal(new Date()));
  const [forma, setForma] = useState<FormaPagamento>('pix');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatus(profile.status_pagamento || 'pago');
    setPlano(profile.tipo_plano || 'mensal');
    setValor(profile.valor_plano != null ? String(profile.valor_plano) : '');
    setDataPagamento(toISODateLocal(new Date()));
    setPeriodoInicio(inicioPadraoRenovacao(profile.data_expiracao));
    setForma('pix');
    setObservacao('');
    setError(null);
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const duracaoMeses =
    planos.find((p) => p.slug === plano)?.duracao_meses ?? 1;
  const periodoFim = fimPorDuracaoMeses(periodoInicio, duracaoMeses);

  const periodoFimLabel = useMemo(() => {
    try {
      return parseLocaleDate(periodoFim);
    } catch {
      return periodoFim;
    }
  }, [periodoFim]);

  async function persist(opts: { registrarPagamento: boolean }) {
    if (!periodoInicio) {
      setError('Selecione o início do plano');
      return;
    }
    const valorPlanoNumber = valor.trim().length
      ? Number(valor.replace(',', '.'))
      : null;
    if (
      opts.registrarPagamento &&
      (!Number.isFinite(valorPlanoNumber) ||
        valorPlanoNumber === null ||
        valorPlanoNumber <= 0)
    ) {
      setError('Informe um valor válido para registrar o pagamento');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          status_pagamento: status,
          tipo_plano: plano,
          valor_plano: Number.isFinite(valorPlanoNumber)
            ? valorPlanoNumber
            : null,
          data_inicio: new Date(`${periodoInicio}T12:00:00`).toISOString(),
          data_expiracao: new Date(`${periodoFim}T12:00:00`).toISOString(),
        })
        .eq('id', alunoId);
      if (profileError) throw profileError;

      if (
        opts.registrarPagamento &&
        status === 'pago' &&
        Number.isFinite(valorPlanoNumber) &&
        valorPlanoNumber !== null
      ) {
        const coachId = (await getBootstrapProfile())?.userId;
        if (!coachId) throw new Error('Sessão inválida para registrar pagamento');

        const { error: historyError } = await supabaseClient
          .from('aluno_planos_historico')
          .insert({
            aluno_id: alunoId,
            coach_id: coachId,
            status_pagamento: 'pago',
            tipo_plano: plano,
            valor_plano: valorPlanoNumber,
            data_inicio: periodoInicio,
            data_expiracao: periodoFim,
            data_pagamento: dataPagamento,
            forma_pagamento: forma,
            origem: 'manual_coach',
            observacao:
              observacao.trim() || 'Renovação registrada pelo coach',
          });
        if (historyError) throw historyError;
      }

      await onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao salvar renovação';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-backdrop-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="renovar-plano-title"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'pointer-events-auto relative w-full max-w-lg rounded-2xl',
            'bg-brand shadow-[0_20px_60px_rgba(147,51,234,0.45)]',
            'animate-sheet-up max-h-[min(90vh,720px)] flex flex-col overflow-hidden',
          )}
        >
          <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2.5 border-b border-white/15 shrink-0">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/75">
                Cobrança
              </p>
              <p
                id="renovar-plano-title"
                className="text-[15px] font-bold text-white mt-0.5 truncate"
              >
                Renovar plano
              </p>
              <p className="text-[11px] text-white/70 truncate">
                {alunoNome}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white hover:bg-white/10 active:scale-95 border-0 bg-transparent cursor-pointer"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 flex flex-col gap-2.5">
            <Select
              label="Situação"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'pago', label: 'Pago (Acesso ativo)' },
                { value: 'pendente', label: 'Pendente (Bloqueado)' },
                { value: 'atrasado', label: 'Em atraso (Bloqueado)' },
              ]}
              className={fieldLabelClass}
            />

            <div className="flex flex-col gap-1">
              <label className={fieldLabelTextClass}>
                Data do pagamento
              </label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className={dateInputClass}
              />
              <p className="text-[10px] text-white/55">
                Quando o dinheiro entrou (regime de caixa)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={fieldLabelTextClass}>
                  Início do plano
                </label>
                <input
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  className={dateInputClass}
                  required
                />
              </div>
              <Select
                label="Modalidade"
                value={plano}
                onChange={setPlano}
                options={[
                  ...planos.map((p) => ({
                    value: p.slug,
                    label: p.custom
                      ? `${p.nome} (${p.duracao_meses} ${p.duracao_meses === 1 ? 'mês' : 'meses'})`
                      : p.nome,
                  })),
                  ...(!planos.some((p) => p.slug === plano)
                    ? [
                        {
                          value: plano,
                          label: planDisplayName(plano, planosPersonalizados),
                        },
                      ]
                    : []),
                ]}
                className={fieldLabelClass}
              />
            </div>

            <p className="text-[11px] text-white/60 -mt-1">
              Vigência até{' '}
              <span className="text-white font-semibold">{periodoFimLabel}</span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={fieldLabelTextClass}>
                  Valor (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="Ex: 149,90"
                  className={dateInputClass}
                />
              </div>
              <Select
                label="Forma de pagamento"
                value={forma}
                onChange={(v) => setForma(v as FormaPagamento)}
                options={FORMAS_PAGAMENTO.map((f) => ({
                  value: f.value,
                  label: f.label,
                }))}
                className={fieldLabelClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={fieldLabelTextClass}>
                Observação (opcional)
              </label>
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: pago adiantado, desconto..."
                className={dateInputClass}
              />
            </div>

            {error && (
              <p className="text-[12px] font-medium text-white bg-danger/30 border border-white/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => void persist({ registrarPagamento: true })}
              className="mt-0.5 w-full rounded-xl bg-white text-brand py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-white/95 transition-colors disabled:opacity-60 border-0 cursor-pointer"
            >
              {saving ? 'Salvando…' : 'Registrar pagamento'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void persist({ registrarPagamento: false })}
              className="w-full bg-transparent border-0 py-1.5 text-[11px] font-semibold text-white/70 hover:text-white transition-colors cursor-pointer disabled:opacity-60"
            >
              Salvar vínculo sem registrar pagamento
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

function parseLocaleDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
