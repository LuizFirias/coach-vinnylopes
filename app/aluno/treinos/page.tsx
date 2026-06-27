'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { getSignedStorageUrl } from '@/lib/storageUrls';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import { Barbell, FileText, MagnifyingGlass, ArrowRight, Lightning, Wind, PersonSimpleRun, Clock } from '@phosphor-icons/react';
import PDFViewer from '@/app/components/PDFViewer';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { motion } from 'framer-motion';

interface TreinoPDF {
  id: string;
  aluno_id: string;
  url_pdf: string;
  nome_arquivo: string;
  data_upload: string;
}

interface FichaTreino {
  id: string;
  nome_rotina: string;
  criado_em: string;
  configuracao?: {
    exercicios?: Array<{
      nome: string;
    }>;
  };
}

function parseDateSafe(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
  }
  return new Date(value);
}

export default function AlunoTreinosPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [fichas, setFichas] = useState<FichaTreino[]>([]);
  const [treinosPdf, setTreinosPdf] = useState<TreinoPDF[]>([]);
  const [frequencias, setFrequencias] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<TreinoPDF | null>(null);

  const [selectedFilter, setSelectedFilter] = useState<string>('Todos');

  useEffect(() => {
    const fetchTreinos = async () => {
      try {
        const session = await getSafeSession();
        const user = session?.user;
        if (!user) { setError('Sessão expirada. Faça login novamente.'); setLoading(false); return; }

        const uid = user.id;

        const { data: fichasData } = await supabaseClient
          .from('fichas_treino')
          .select('id, nome_rotina, criado_em, configuracao')
          .eq('aluno_id', uid)
          .eq('ativo', true)
          .order('criado_em', { ascending: false });

        const { data: pdfsData } = await supabaseClient
          .from('treinos_alunos')
          .select('id, aluno_id, url_pdf, nome_arquivo, data_upload')
          .eq('aluno_id', uid)
          .order('data_upload', { ascending: false });

        const { data: agendaData } = await supabaseClient
          .from('agenda_semanal')
          .select('ficha_id')
          .eq('aluno_id', uid);

        const freqMap: Record<string, number> = {};
        agendaData?.forEach((item: any) => {
          if (item.ficha_id) {
            freqMap[item.ficha_id] = (freqMap[item.ficha_id] || 0) + 1;
          }
        });
        setFrequencias(freqMap);

        setUserId(uid);
        setFichas(fichasData || []);

        const pdfsComLinks = await Promise.all((pdfsData || []).map(async (pdf: any) => {
          const signed = await getSignedStorageUrl('treinos-pdf', pdf.url_pdf, 3600);
          return { ...pdf, url_pdf: signed || pdf.url_pdf };
        }));

        setTreinosPdf(pdfsComLinks);
      } catch {
        setError('Erro ao conectar com o servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchTreinos();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando treinos..." />
      </div>
    );
  }

  const total = fichas.length + treinosPdf.length;

  const FILTERS = [
    { label: 'Todos', icon: Barbell },
    { label: 'Força', icon: Barbell },
    { label: 'Cardio', icon: PersonSimpleRun },
    { label: 'HIIT', icon: Lightning },
    { label: 'Mobilidade', icon: Wind },
  ];

  const fichasFiltradas = selectedFilter === 'Todos'
    ? fichas
    : fichas.filter(f =>
        f.nome_rotina.toLowerCase().includes(selectedFilter.toLowerCase())
      );

  const itemVariants: any = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
  };

  return (
    <SubscriptionGuard>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05
            }
          }
        }}
        className="min-h-screen bg-surface-0 pb-28 lg:pl-28"
      >

        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="px-4 pt-8 pb-6 max-w-2xl mx-auto relative overflow-hidden"
        >
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Meus Treinos</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {fichas.length} rotina{fichas.length !== 1 ? 's' : ''} ativa{fichas.length !== 1 ? 's' : ''} esta semana
          </p>

          {/* Category filter chips */}
          <div 
            className="flex gap-2 overflow-x-auto scrollbar-hide mt-4 pb-0.5"
            style={{
              maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)'
            }}
          >
            {FILTERS.map(({ label, icon: Icon }) => {
              const active = selectedFilter === label;
              return (
                <button
                  key={label}
                  onClick={() => setSelectedFilter(label)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all',
                    active
                      ? 'text-black shadow-gold-glow'
                      : 'bg-surface-2 text-text-secondary border border-border-subtle hover:border-brand/30',
                  )}
                  style={active ? { background: 'var(--gradient-gold)' } : {}}
                >
                  <Icon className="w-3.5 h-3.5" weight={active ? 'fill' : 'regular'} />
                  {label}
                </button>
              );
            })}
          </div>
        </motion.div>

        <div className="px-4 max-w-2xl mx-auto flex flex-col gap-5">

          {error && (
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Fichas interativas */}
          {fichasFiltradas.length > 0 && (
            <section>
              <div className="flex flex-col gap-2">
                {fichasFiltradas.map(ficha => {
                  const exercicios = (ficha.configuracao?.exercicios ?? [])
                    .map(ex => ex.nome)
                    .filter(Boolean) as string[];

                  const freq = frequencias[ficha.id] || 0;

                  return (
                    <motion.div key={ficha.id} variants={itemVariants}>
                      <Link
                        href={`/aluno/treinos/ficha?id=${ficha.id}`}
                        className="w-full bg-surface-1 hover:bg-surface-2 rounded-[14px] p-4 flex items-start gap-4 transition-all active:scale-[0.99] group border-none shadow-sm"
                      >
                        <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center shrink-0 mt-0.5 text-brand">
                          <Barbell size={24} weight="fill" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h2 className="text-[17px] font-semibold text-text-primary group-hover:text-brand transition-colors truncate">
                                {ficha.nome_rotina}
                              </h2>
                              <p className="text-2xs text-text-secondary mt-0.5">
                                {exercicios.length > 0
                                  ? `${exercicios.length} exercício${exercicios.length !== 1 ? 's' : ''}`
                                  : 'Sem exercícios'}
                                {' · '}
                                Criado em {parseDateSafe(ficha.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </p>
                            </div>
                            {freq > 0 ? (
                              <span className="px-2.5 py-1 bg-brand-subtle text-brand text-[10px] font-bold rounded-lg shrink-0">
                                {freq}×/semana
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-surface-2 text-text-tertiary text-[10px] font-semibold rounded-lg shrink-0">
                                Ficha
                              </span>
                            )}
                          </div>
                          {exercicios.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {exercicios.slice(0, 3).map((nome, i) => (
                                <span key={i} className="px-2.5 py-1 bg-surface-2 rounded-lg text-2xs font-medium text-text-secondary whitespace-nowrap">
                                  {nome}
                                </span>
                              ))}
                              {exercicios.length > 3 && (
                                <span className="px-2.5 py-1 bg-surface-2/40 rounded-lg text-[10px] font-semibold text-text-tertiary">
                                  +{exercicios.length - 3} mais
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* PDFs */}
          {treinosPdf.length > 0 && (
            <section>
              <motion.p
                variants={itemVariants}
                className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3 flex items-center gap-2"
              >
                <span className="w-1 h-4 bg-border-subtle rounded-full inline-block" />
                Fichas PDF
              </motion.p>
              <div className="flex flex-col gap-2">
                {treinosPdf.map(pdf => (
                  <motion.div key={pdf.id} variants={itemVariants}>
                    <button
                      onClick={() => {
                        if (pdf.aluno_id !== userId) return;
                        setSelectedPdf(pdf);
                      }}
                      className="w-full text-left bg-surface-1 border border-border-subtle shadow-elev-1 hover:shadow-elev-2 hover:border-brand/20 p-4 rounded-2xl transition-all active:scale-[0.99] flex items-center gap-3.5 group"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary shrink-0 group-hover:border-brand/30 transition-colors">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate group-hover:text-brand transition-colors">
                          {pdf.nome_arquivo.replace('.pdf', '')}
                        </p>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          Enviado em {parseDateSafe(pdf.data_upload).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-xl bg-surface-3 group-hover:bg-surface-2 flex items-center justify-center text-text-tertiary shrink-0 transition-colors">
                        <MagnifyingGlass size={13} />
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {total === 0 && (
            <motion.div variants={itemVariants} className="text-center py-20 bg-surface-1 rounded-[14px]">
              <Barbell size={80} className="text-text-tertiary mx-auto mb-4 opacity-50" />
              <h2 className="text-sm font-bold text-text-primary">Seu coach ainda está preparando seu treino</h2>
              <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary mt-2">
                <Clock size={14} className="text-brand" />
                <span>Em breve sua rotina estará disponível por aqui</span>
              </div>
            </motion.div>
          )}

        </div>
      </motion.div>

      {selectedPdf && (
        <PDFViewer
          url={selectedPdf.url_pdf}
          title={selectedPdf.nome_arquivo}
          onClose={() => setSelectedPdf(null)}
        />
      )}
    </SubscriptionGuard>
  );
}
