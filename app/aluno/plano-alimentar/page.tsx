'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { extractStoragePath } from '@/lib/storageUrls';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import PDFViewer from '@/app/components/PDFViewer';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import Link from 'next/link';
import {
  ArrowLeft, ForkKnife, FileText, Drop, Check, Plus, Minus, CaretDown, CaretUp, FilePdf
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Plano {
  id: string;
  aluno_id: string;
  nome_arquivo: string;
  descricao: string | null;
  criado_em: string;
  url_pdf: string;
}

interface Refeicao {
  id: string;
  plano_id: string;
  nome: string;
  horario_sugerido: string | null; // "HH:MM:SS"
  ordem: number;
  ingredientes: Ingrediente[];
  observacoes: string | null;
}

interface Ingrediente {
  nome: string;
  quantidade?: string;
  gramas?: number;
}

interface RegistroAgua {
  id: string | null;
  copos: number;
  ml_por_copo: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtHorario(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5); // "HH:MM"
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanoAlimentarPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [plano, setPlano] = useState<Plano | null>(null);
  const [historicoPlanos, setHistoricoPlanos] = useState<Plano[]>([]);
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([]);
  const [consumidosHoje, setConsumidosHoje] = useState<Set<string>>(new Set());
  const [agua, setAgua] = useState<RegistroAgua>({ id: null, copos: 0, ml_por_copo: 250 });
  const [metaCopos] = useState(8);

  const [expandedRefeicao, setExpandedRefeicao] = useState<string | null>(null);
  const [savingConsumido, setSavingConsumido] = useState<string | null>(null);
  const [savingAgua, setSavingAgua] = useState(false);

  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>('');

  // ── Carregar ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const session = await getSafeSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      const uid = user.id;
      setUserId(uid);
      const today = getTodayISO();

      // Buscar todos os planos alimentares ordenados do mais recente ao antigo
      const { data: planosData } = await supabaseClient
        .from('plano_alimentar_pdf')
        .select('id, aluno_id, nome_arquivo, descricao, criado_em, url_pdf')
        .eq('aluno_id', uid)
        .order('criado_em', { ascending: false });

      if (!planosData || planosData.length === 0) { setLoading(false); return; }
      
      const planoData = planosData[0];
      setPlano(planoData);
      setHistoricoPlanos(planosData.slice(1));

      // Refeições do plano
      const { data: refeicaoData } = await supabaseClient
        .from('refeicoes_plano')
        .select('id, plano_id, nome, horario_sugerido, ordem, ingredientes, observacoes')
        .eq('plano_id', planoData.id)
        .order('ordem', { ascending: true });

      setRefeicoes(refeicaoData || []);

      // Consumos de hoje
      if (refeicaoData && refeicaoData.length > 0) {
        const ids = refeicaoData.map((r: any) => r.id);
        const { data: consumos } = await supabaseClient
          .from('consumos_refeicao')
          .select('refeicao_id')
          .eq('aluno_id', uid)
          .eq('data_consumo', today)
          .in('refeicao_id', ids);

        setConsumidosHoje(new Set((consumos || []).map((c: any) => c.refeicao_id)));
      }

      // Água de hoje
      const { data: aguaData } = await supabaseClient
        .from('registros_agua')
        .select('id, copos, ml_por_copo')
        .eq('aluno_id', uid)
        .eq('data_registro', today)
        .maybeSingle();

      if (aguaData) {
        setAgua({ id: aguaData.id, copos: aguaData.copos, ml_por_copo: aguaData.ml_por_copo });
      }
    } catch (err) {
      console.error('[PlanoAlimentar] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Ações ───────────────────────────────────────────────────────────────────

  const toggleRefeicao = async (refeicaoId: string) => {
    if (!userId || savingConsumido) return;
    setSavingConsumido(refeicaoId);

    const today = getTodayISO();
    const jaConsumido = consumidosHoje.has(refeicaoId);

    try {
      if (jaConsumido) {
        await supabaseClient
          .from('consumos_refeicao')
          .delete()
          .eq('aluno_id', userId)
          .eq('refeicao_id', refeicaoId)
          .eq('data_consumo', today);

        setConsumidosHoje(prev => {
          const next = new Set(prev);
          next.delete(refeicaoId);
          return next;
        });
      } else {
        await supabaseClient
          .from('consumos_refeicao')
          .insert({ aluno_id: userId, refeicao_id: refeicaoId, data_consumo: today });

        setConsumidosHoje(prev => new Set([...prev, refeicaoId]));
      }
    } catch (err) {
      console.error('[Consumo] Erro:', err);
    } finally {
      setSavingConsumido(null);
    }
  };

  const updateAgua = async (delta: number) => {
    if (!userId || savingAgua) return;
    const next = Math.max(0, Math.min(20, agua.copos + delta));
    if (next === agua.copos) return;

    setSavingAgua(true);
    const today = getTodayISO();

    try {
      if (agua.id) {
        await supabaseClient
          .from('registros_agua')
          .update({ copos: next, atualizado_em: new Date().toISOString() })
          .eq('id', agua.id);
      } else {
        const { data } = await supabaseClient
          .from('registros_agua')
          .insert({ aluno_id: userId, data_registro: today, copos: next, ml_por_copo: agua.ml_por_copo })
          .select('id')
          .single();
        setAgua(a => ({ ...a, id: data?.id ?? null }));
      }
      setAgua(a => ({ ...a, copos: next }));
    } catch (err) {
      console.error('[Água] Erro:', err);
    } finally {
      setSavingAgua(false);
    }
  };

  const openPdfForPlan = async (targetPlano: Plano) => {
    if (!userId) return;
    if (targetPlano.aluno_id !== userId) return;

    try {
      const filePath = extractStoragePath('plano_alimentar', targetPlano.url_pdf) || targetPlano.url_pdf;
      const { data, error } = await supabaseClient.storage
        .from('plano_alimentar')
        .createSignedUrl(filePath, 3600);

      if (error || !data?.signedUrl) {
        alert('Erro ao abrir PDF. Tente novamente.');
        return;
      }
      setPdfUrl(data.signedUrl);
      setPdfTitle(targetPlano.nome_arquivo);
      setPdfViewerOpen(true);
    } catch (err) {
      console.error('[PDF] Erro:', err);
    }
  };

  const openPdf = () => {
    if (plano) openPdfForPlan(plano);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando nutrição..." />
      </div>
    );
  }

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const refeicoesFeitasHoje = refeicoes.filter(r => consumidosHoje.has(r.id)).length;

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">

          {/* ── Header ── */}
          <div>
            <Link
              href="/aluno/dashboard"
              className="inline-flex items-center gap-1.5 text-brand text-2xs uppercase tracking-caps mb-4"
            >
              <ArrowLeft className="w-3 h-3" /> Dashboard
            </Link>
            <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-0.5">
              {hoje}
            </p>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Nutrição</h1>
          </div>

          {/* ── Sem plano ── */}
          {!plano && (
            <div className="flex flex-col items-center text-center gap-4 px-4 py-8">
              <div className="w-16 h-16 bg-surface-2 border border-border-subtle rounded-2xl flex items-center justify-center">
                <ForkKnife className="w-8 h-8 text-brand" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-2">Plano em preparação</h2>
                <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
                  Seu coach está preparando seu plano alimentar personalizado. Ele aparecerá aqui assim que for liberado.
                </p>
              </div>

              {/* Dicas básicas enquanto aguarda */}
              <div className="w-full mt-2 flex flex-col gap-2 text-left">
                <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-1">Enquanto isso</p>
                {[
                  { icon: '💧', text: 'Beba pelo menos 35ml de água por kg corporal por dia' },
                  { icon: '🥩', text: 'Priorize proteínas em todas as refeições' },
                  { icon: '⏰', text: 'Mantenha intervalos regulares entre as refeições (3-4h)' },
                  { icon: '🥗', text: 'Prefira alimentos naturais aos ultraprocessados' },
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 bg-surface-1 border border-border-subtle rounded-xl px-4 py-3">
                    <span className="text-lg leading-tight mt-0.5 flex-shrink-0">{tip.icon}</span>
                    <span className="text-sm text-text-secondary leading-relaxed">{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plano && (
            <>
              {/* ── Card do plano ── */}
              <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface-3 border border-border-subtle flex items-center justify-center text-brand flex-shrink-0">
                    <ForkKnife className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {plano.nome_arquivo.replace('.pdf', '')}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {new Date(plano.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={openPdf}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-surface-3 border border-border-subtle text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-border-default transition-colors flex-shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Ver PDF
                </button>
              </div>

              {/* ── Refeições de hoje ── */}
              {refeicoes.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Refeições de hoje</p>
                    <span className="text-xs text-text-tertiary">
                      {refeicoesFeitasHoje} de {refeicoes.length} feitas
                    </span>
                  </div>

                  {/* Barra de progresso */}
                  <div className="h-1.5 bg-surface-3 rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all duration-300"
                      style={{ width: refeicoes.length > 0 ? `${(refeicoesFeitasHoje / refeicoes.length) * 100}%` : '0%' }}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    {refeicoes.map(r => {
                      const feita = consumidosHoje.has(r.id);
                      const expanded = expandedRefeicao === r.id;
                      const temIngredientes = r.ingredientes && r.ingredientes.length > 0;

                      return (
                        <div
                          key={r.id}
                          className={cn(
                            'rounded-2xl border transition-all duration-200',
                            feita
                              ? 'bg-success-subtle border-success-border shadow-elev-1'
                              : 'bg-surface-1 border-border-subtle shadow-elev-1'
                          )}
                        >
                          <div className="flex items-center gap-3 p-3">
                            {/* Check button */}
                            <button
                              onClick={() => toggleRefeicao(r.id)}
                              disabled={savingConsumido === r.id}
                              className={cn(
                                'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                feita
                                  ? 'bg-success border-success text-white'
                                  : 'border-border-default bg-surface-3 text-transparent hover:border-brand'
                              )}
                              aria-label={feita ? 'Desmarcar refeição' : 'Marcar como feita'}
                            >
                              <Check className="w-3.5 h-3.5" weight="bold" />
                            </button>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-sm font-semibold leading-tight',
                                feita ? 'text-success line-through opacity-70' : 'text-text-primary'
                              )}>
                                {r.nome}
                              </p>
                              {r.horario_sugerido && (
                                <p className="text-2xs text-text-tertiary mt-0.5">{fmtHorario(r.horario_sugerido)}</p>
                              )}
                            </div>

                            {/* Expandir ingredientes */}
                            {temIngredientes && (
                              <button
                                onClick={() => setExpandedRefeicao(expanded ? null : r.id)}
                                className="w-8 h-8 flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors"
                                aria-label="Ver ingredientes"
                              >
                                {expanded ? <CaretUp className="w-4 h-4" /> : <CaretDown className="w-4 h-4" />}
                              </button>
                            )}
                          </div>

                          {/* Ingredientes expandidos */}
                          {expanded && temIngredientes && (
                            <div className="px-3 pb-3 pt-0 border-t border-border-subtle/50">
                              <ul className="mt-2 space-y-1">
                                {r.ingredientes.map((ing, i) => (
                                  <li key={i} className="flex items-center justify-between text-xs text-text-secondary">
                                    <span>{ing.nome}</span>
                                    {(ing.quantidade || ing.gramas) && (
                                      <span className="text-text-tertiary ml-2">
                                        {ing.gramas ? `${ing.gramas}g` : ing.quantidade}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                              {r.observacoes && (
                                <p className="mt-2 text-xs text-text-tertiary italic border-t border-border-subtle/50 pt-2">
                                  {r.observacoes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Água ── */}
              <section className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Drop className="w-4 h-4 text-brand" />
                    <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Hidratação</p>
                  </div>
                  <span className="text-xs text-text-tertiary">
                    {agua.copos * agua.ml_por_copo}ml / {metaCopos * agua.ml_por_copo}ml
                  </span>
                </div>

                {/* Copos visuais */}
                <div className="flex gap-1.5 flex-wrap mb-4">
                  {Array.from({ length: metaCopos }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => updateAgua(i < agua.copos ? -(agua.copos - i) : i + 1 - agua.copos)}
                      disabled={savingAgua}
                      className={cn(
                        'w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all',
                        i < agua.copos
                          ? 'bg-brand/20 border-brand text-brand'
                          : 'bg-surface-3 border-border-subtle text-text-tertiary'
                      )}
                      aria-label={`${i + 1} copo${i > 0 ? 's' : ''}`}
                    >
                      <Drop className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>

                {/* Controles +/- */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateAgua(-1)}
                    disabled={savingAgua || agua.copos === 0}
                    className="w-9 h-9 rounded-xl bg-surface-3 border border-border-subtle flex items-center justify-center text-text-secondary disabled:opacity-30 hover:text-text-primary transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-lg font-bold text-text-primary">{agua.copos}</span>
                    <span className="text-xs text-text-tertiary ml-1">/ {metaCopos} copos</span>
                  </div>
                  <button
                    onClick={() => updateAgua(1)}
                    disabled={savingAgua || agua.copos >= metaCopos}
                    className="w-9 h-9 rounded-xl bg-brand text-text-on-brand flex items-center justify-center disabled:opacity-30 shadow-sm shadow-brand/30 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {agua.copos >= metaCopos && (
                  <p className="mt-3 text-xs font-semibold text-brand text-center">
                    Meta atingida! Excelente hidratação hoje.
                  </p>
                )}
              </section>

              {/* ── Histórico de planos anteriores ── */}
              {historicoPlanos.length > 0 && (
                <section className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-4 mt-2">
                  <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3 flex items-center gap-1.5">
                    <FilePdf className="w-3.5 h-3.5" />
                    Histórico de Planos
                  </p>
                  <div className="flex flex-col gap-2">
                    {historicoPlanos.map(histPlano => (
                      <div 
                        key={histPlano.id}
                        className="bg-surface-2 border border-border-subtle/50 rounded-xl p-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FilePdf className="w-4 h-4 text-text-secondary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-text-primary truncate">
                              {histPlano.nome_arquivo.replace('.pdf', '')}
                            </p>
                            <p className="text-[10px] text-text-tertiary mt-0.5">
                              Enviado em {new Date(histPlano.criado_em).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => openPdfForPlan(histPlano)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-3 border border-border-subtle text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                        >
                          Abrir PDF
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      {pdfViewerOpen && pdfUrl && (
        <PDFViewer
          url={pdfUrl}
          title={pdfTitle}
          onClose={() => { setPdfViewerOpen(false); setPdfUrl(null); }}
        />
      )}
    </SubscriptionGuard>
  );
}
