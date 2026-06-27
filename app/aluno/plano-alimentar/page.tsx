'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { getPublicStorageUrl, extractStoragePath } from '@/lib/storageUrls';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import PDFViewer from '@/app/components/PDFViewer';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import Link from 'next/link';
import {
  ArrowLeft, ForkKnife, FileText, Drop, Check, Plus, Minus, CaretDown, CaretUp,
  Barbell, Timer, Leaf,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { getTodayBrazil } from '@/lib/dateUtils';
import { motion } from 'framer-motion';

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
  return getTodayBrazil();
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanoAlimentarPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [plano, setPlano] = useState<Plano | null>(null);
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([]);
  const [consumidosHoje, setConsumidosHoje] = useState<Set<string>>(new Set());
  const [agua, setAgua] = useState<RegistroAgua>({ id: null, copos: 0, ml_por_copo: 250 });
  const [metaCopos] = useState(8);

  const [expandedRefeicao, setExpandedRefeicao] = useState<string | null>(null);
  const [savingConsumido, setSavingConsumido] = useState<string | null>(null);
  const [savingAgua, setSavingAgua] = useState(false);

  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [coachInfo, setCoachInfo] = useState<{ nome: string; avatar: string | null } | null>(null);

  // ── Carregar ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const session = await getSafeSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      const uid = user.id;
      setUserId(uid);
      const today = getTodayISO();

      // Buscar coach do aluno no profile
      try {
        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('coach_id')
          .eq('id', uid)
          .maybeSingle();

        if (profileData?.coach_id) {
          const { data: coachData } = await supabaseClient
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', profileData.coach_id)
            .maybeSingle();

          if (coachData) {
            setCoachInfo({
              nome: coachData.full_name?.split(' ')[0] || 'Coach',
              avatar: coachData.avatar_url ? getPublicStorageUrl('avatars', coachData.avatar_url) : null,
            });
          }
        }
      } catch (err) {
        console.warn('[Nutrição] Erro ao buscar coach:', err);
      }

      // Plano mais recente
      const { data: planoData } = await supabaseClient
        .from('plano_alimentar_pdf')
        .select('id, aluno_id, nome_arquivo, descricao, criado_em, url_pdf')
        .eq('aluno_id', uid)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!planoData) { setLoading(false); return; }
      setPlano(planoData);

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

  const openPdf = async () => {
    if (!plano || !userId) return;
    if (plano.aluno_id !== userId) return;

    try {
      const filePath = extractStoragePath('plano_alimentar', plano.url_pdf) || plano.url_pdf;
      const { data, error } = await supabaseClient.storage
        .from('plano_alimentar')
        .createSignedUrl(filePath, 3600);

      if (error || !data?.signedUrl) {
        alert('Erro ao abrir PDF. Tente novamente.');
        return;
      }
      setPdfUrl(data.signedUrl);
      setPdfViewerOpen(true);
    } catch (err) {
      console.error('[PDF] Erro:', err);
    }
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

  // Metas diárias de macros para exibição estética/funcional (Fase 8)
  const metaProt = 150; // 150g
  const metaCarb = 180; // 180g
  const metaGord = 60;  // 60g
  const metaKcal = (metaProt * 4) + (metaCarb * 4) + (metaGord * 9);

  // Computar consumidos hoje com base nas refeições marcadas
  const macrosHoje = refeicoes.reduce(
    (acc, r, index) => {
      if (!consumidosHoje.has(r.id)) return acc;
      
      // Distribuir valores estéticos baseados no index da refeição
      let p = 25;
      let c = 35;
      let g = 10;
      if (index === 0) { p = 30; c = 45; g = 12; } // Café da manhã
      else if (index === 1) { p = 15; c = 10; g = 5; }  // Lanche
      else if (index === 2) { p = 45; c = 60; g = 18; } // Almoço
      else if (index === 3) { p = 20; c = 15; g = 6; }  // Lanche da tarde
      else if (index === 4) { p = 40; c = 50; g = 9; }  // Jantar
      
      return {
        prot: acc.prot + p,
        carb: acc.carb + c,
        gord: acc.gord + g,
      };
    },
    { prot: 0, carb: 0, gord: 0 }
  );

  const kcalHoje = (macrosHoje.prot * 4) + (macrosHoje.carb * 4) + (macrosHoje.gord * 9);

  // Frações de progresso para os anéis circulares
  const pctProt = Math.min(1, macrosHoje.prot / metaProt);
  const pctCarb = Math.min(1, macrosHoje.carb / metaCarb);
  const pctGord = Math.min(1, macrosHoje.gord / metaGord);

  return (
    <SubscriptionGuard>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24 text-text-primary"
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-6">

          {/* ── Header ── */}
          <div>
            <Link
              href="/aluno/dashboard"
              className="inline-flex items-center gap-1.5 text-brand text-2xs uppercase tracking-caps mb-4 hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="w-3 h-3" /> Dashboard
            </Link>
            <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-0.5">
              {hoje}
            </p>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Nutrição</h1>
          </div>

          {/* ── Sem plano (Empty State com dicas e avatar do Coach) ── */}
          {!plano && (
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex flex-col items-center text-center gap-4 px-4 py-8 border border-border-subtle rounded-2xl relative overflow-hidden"
              style={{ background: 'var(--gradient-surface)' }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-glow-gold)', opacity: 0.6 }} aria-hidden="true" />
              <div className="w-16 h-16 bg-surface-2 border border-border-subtle rounded-2xl flex items-center justify-center">
                <ForkKnife className="w-8 h-8 text-brand" weight="light" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-2">Plano em preparação</h2>
                <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
                  Seu coach está preparando seu plano alimentar personalizado. Ele aparecerá aqui assim que for liberado.
                </p>
              </div>

              {/* Dicas básicas enquanto aguarda */}
              <div className="w-full mt-2 text-left">
                <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-2">Enquanto isso</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { Icon: Drop, text: 'Beba 35ml/kg de água por dia' },
                    { Icon: Barbell, text: 'Priorize proteínas em cada refeição' },
                    { Icon: Timer, text: 'Intervalos de 3-4h entre refeições' },
                    { Icon: Leaf, text: 'Prefira alimentos naturais' },
                  ].map(({ Icon, text }, i) => (
                    <div key={i} className="flex flex-col gap-2 bg-surface-1 border border-border-subtle rounded-xl p-3">
                      <Icon className="w-5 h-5 text-brand" weight="light" />
                      <span className="text-xs text-text-secondary leading-relaxed">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dicas do Coach com Avatar (Fase 8) */}
              <div className="w-full mt-4 p-4 bg-surface-2/40 border border-border-subtle rounded-2xl flex gap-3 items-start text-left">
                <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {coachInfo?.avatar ? (
                    <img src={coachInfo.avatar} alt={coachInfo.nome} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-brand">{coachInfo?.nome?.charAt(0) || 'V'}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-text-primary">Dicas do {coachInfo?.nome || 'Coach Vinny'}</p>
                  <p className="text-2xs text-text-secondary mt-1 leading-relaxed">
                    "Mantenha a constância na água e na proteína. Seu plano está sendo elaborado sob medida para o seu objetivo!"
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {plano && (
            <>
              {/* ── Card do plano ── */}
              <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface-3 border border-border-subtle flex items-center justify-center text-brand flex-shrink-0">
                    <ForkKnife className="w-5 h-5 text-brand" weight="light" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {plano.nome_arquivo.replace('.pdf', '')}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {new Date(plano.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={openPdf}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-surface-3 border border-border-subtle text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-border-default transition-all flex-shrink-0"
                >
                  <FileText className="w-3.5 h-3.5 text-text-tertiary" weight="light" />
                  Ver PDF
                </button>
              </div>

              {/* ── Anéis de Progresso de Macros (Fase 8) ── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-5 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xs font-bold uppercase tracking-caps text-text-tertiary">Progresso Nutricional</span>
                    <h3 className="text-sm font-bold text-text-primary mt-0.5">Balanço de Macronutrientes</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-brand tabular-nums">{kcalHoje}</span>
                    <span className="text-xs text-text-tertiary"> / {metaKcal} kcal</span>
                  </div>
                </div>

                <div className="flex items-center justify-around gap-4 py-2">
                  {/* Círculo Proteínas */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          className="stroke-surface-3"
                          strokeWidth="4"
                          fill="transparent"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          className="stroke-rose-500 transition-all duration-500 ease-out"
                          strokeWidth="4"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 26}
                          strokeDashoffset={2 * Math.PI * 26 * (1 - pctProt)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-[10px] font-extrabold text-rose-500 leading-none">{Math.round(pctProt * 100)}%</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-text-primary">Proteínas</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">{macrosHoje.prot}g / {metaProt}g</p>
                    </div>
                  </div>

                  {/* Círculo Carboidratos */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          className="stroke-surface-3"
                          strokeWidth="4"
                          fill="transparent"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          className="stroke-amber-500 transition-all duration-500 ease-out"
                          strokeWidth="4"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 26}
                          strokeDashoffset={2 * Math.PI * 26 * (1 - pctCarb)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-[10px] font-extrabold text-amber-500 leading-none">{Math.round(pctCarb * 100)}%</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-text-primary">Carbos</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">{macrosHoje.carb}g / {metaCarb}g</p>
                    </div>
                  </div>

                  {/* Círculo Gorduras */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          className="stroke-surface-3"
                          strokeWidth="4"
                          fill="transparent"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          className="stroke-sky-500 transition-all duration-500 ease-out"
                          strokeWidth="4"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 26}
                          strokeDashoffset={2 * Math.PI * 26 * (1 - pctGord)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-[10px] font-extrabold text-sky-500 leading-none">{Math.round(pctGord * 100)}%</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-text-primary">Gorduras</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">{macrosHoje.gord}g / {metaGord}g</p>
                    </div>
                  </div>
                </div>
              </motion.div>

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
                    {refeicoes.map((r, rIdx) => {
                      const feita = consumidosHoje.has(r.id);
                      const expanded = expandedRefeicao === r.id;
                      const temIngredientes = r.ingredientes && r.ingredientes.length > 0;

                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + rIdx * 0.05, duration: 0.3 }}
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
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Água ── */}
              <section className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Drop className="w-4 h-4 text-brand" weight="light" />
                    <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Hidratação</p>
                  </div>
                  <span className="text-xs text-text-tertiary font-semibold">
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
                          ? 'bg-brand/20 border-brand text-brand shadow-sm'
                          : 'bg-surface-3 border-border-subtle text-text-tertiary hover:border-brand/40'
                      )}
                      aria-label={`${i + 1} copo${i > 0 ? 's' : ''}`}
                    >
                      <Drop className="w-3.5 h-3.5" weight="light" />
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
                    <Minus className="w-4 h-4" weight="bold" />
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
                    <Plus className="w-4 h-4" weight="bold" />
                  </button>
                </div>

                {agua.copos >= metaCopos && (
                  <p className="mt-3 text-xs font-semibold text-brand text-center animate-pulse">
                    Meta atingida! Excelente hidratação hoje.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </motion.div>

      {/* PDF Viewer */}
      {pdfViewerOpen && pdfUrl && plano && (
        <PDFViewer
          url={pdfUrl}
          title={plano.nome_arquivo}
          onClose={() => { setPdfViewerOpen(false); setPdfUrl(null); }}
        />
      )}
    </SubscriptionGuard>
  );
}
