'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { getSignedStorageUrl } from '@/lib/storageUrls';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import { Barbell, FileText, MagnifyingGlass, ArrowRight } from '@phosphor-icons/react';
import PDFViewer from '@/app/components/PDFViewer';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import Link from 'next/link';

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

export default function AlunoTreinosPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [fichas, setFichas] = useState<FichaTreino[]>([]);
  const [treinosPdf, setTreinosPdf] = useState<TreinoPDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<TreinoPDF | null>(null);

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

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-surface-0 pb-28 lg:pl-28">

        {/* Header */}
        <div className="px-4 pt-8 pb-5 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Minhas Rotinas</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Seu cronograma técnico de treinamento</p>
        </div>

        <div className="px-4 max-w-2xl mx-auto flex flex-col gap-5">

          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
              {error}
            </div>
          )}

          {/* Fichas interativas */}
          {fichas.length > 0 && (
            <section>
              <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-brand rounded-full inline-block" />
                Rotinas Interativas
              </p>
              <div className="flex flex-col gap-2">
                {fichas.map(ficha => {
                  const exercicios = (ficha.configuracao?.exercicios ?? [])
                    .map(ex => ex.nome)
                    .filter(Boolean) as string[];

                  return (
                    <Link
                      key={ficha.id}
                      href={`/aluno/treinos/${ficha.id}/executar`}
                      className="w-full bg-surface-1 border border-border-subtle shadow-elev-1 hover:shadow-elev-2 hover:border-brand/30 rounded-2xl p-4 flex items-start gap-3.5 transition-all active:scale-[0.99] group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Barbell size={16} className="text-brand" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-bold text-text-primary uppercase tracking-tight truncate pr-2">
                            {ficha.nome_rotina}
                          </p>
                          <ArrowRight size={15} className="text-text-tertiary shrink-0 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-2xs text-text-tertiary mb-2">
                          {exercicios.length > 0
                            ? `${exercicios.length} exercício${exercicios.length !== 1 ? 's' : ''}`
                            : 'Sem exercícios'}
                          {' · '}
                          {new Date(ficha.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                        {exercicios.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {exercicios.slice(0, 3).map((nome, i) => (
                              <span key={i} className="px-2 py-0.5 bg-surface-2 rounded-lg text-2xs text-text-secondary">
                                {nome.length > 14 ? nome.slice(0, 14) + '…' : nome}
                              </span>
                            ))}
                            {exercicios.length > 3 && (
                              <span className="px-2 py-0.5 text-2xs text-text-disabled">+{exercicios.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* PDFs */}
          {treinosPdf.length > 0 && (
            <section>
              <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-border-subtle rounded-full inline-block" />
                Fichas PDF
              </p>
              <div className="flex flex-col gap-2">
                {treinosPdf.map(pdf => (
                  <button
                    key={pdf.id}
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
                        Enviado em {new Date(pdf.data_upload).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-surface-3 group-hover:bg-surface-2 flex items-center justify-center text-text-tertiary shrink-0 transition-colors">
                      <MagnifyingGlass size={13} />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {total === 0 && (
            <div className="text-center py-24 bg-surface-1 border border-dashed border-border-subtle rounded-2xl shadow-elev-1">
              <Barbell size={32} className="text-text-disabled mx-auto mb-3" />
              <p className="text-text-disabled text-xs uppercase tracking-caps">Nenhum treino ativo.</p>
              <p className="text-xs text-text-tertiary mt-2 max-w-xs mx-auto">
                Seu coach ainda não atribuiu uma rotina de treinos para o seu perfil.
              </p>
            </div>
          )}

        </div>
      </div>

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
