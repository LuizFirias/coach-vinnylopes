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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #0A0F1C 0%, #010713 60%)' }}>
        <DumbbellLoader text="Carregando treinos..." />
      </div>
    );
  }

  const total = fichas.length + treinosPdf.length;

  return (
    <SubscriptionGuard>
      <div className="min-h-screen pb-24" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #0A0F1C 0%, #010713 60%)' }}>

        {/* Header */}
        <div className="px-4 pt-6 pb-4 max-w-md mx-auto">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Minhas Rotinas</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Seu cronograma técnico de treinamento</p>
        </div>

        <div className="px-4 max-w-md mx-auto flex flex-col gap-4">

          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
              {error}
            </div>
          )}

          {/* Fichas interativas */}
          {fichas.length > 0 && (
            <section>
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-text-secondary mb-2">
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
                      className="w-full border rounded-[16px] px-3 py-2 flex items-start gap-2 transition-all active:scale-[0.99] group hover:border-brand/30"
                      style={{ background: '#0B1320', borderColor: 'rgba(41,48,61,0.8)' }}
                    >
                      <div className="w-6 h-6 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Barbell size={12} className="text-brand" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-bold text-text-primary uppercase tracking-tight truncate pr-2">
                            {ficha.nome_rotina}
                          </p>
                          <ArrowRight size={13} className="text-text-tertiary shrink-0 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-[10px] text-text-tertiary mb-1">
                          {exercicios.length > 0
                            ? `${exercicios.length} exercício${exercicios.length !== 1 ? 's' : ''}`
                            : 'Sem exercícios'}
                          {' · '}
                          {new Date(ficha.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                        {exercicios.length > 0 && (
                          <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pr-1">
                            {exercicios.slice(0, 3).map((nome, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-medium text-text-tertiary leading-none" style={{ background: '#0D1829' }}>
                                {nome.length > 11 ? nome.slice(0, 11) + '…' : nome}
                              </span>
                            ))}
                            {exercicios.length > 3 && (
                              <span className="inline-flex items-center px-1 py-0.5 text-[9px] font-bold text-text-disabled leading-none">+{exercicios.length - 3}</span>
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
                <span className="w-1 h-4 rounded-full inline-block" style={{ background: 'rgba(41,48,61,0.8)' }} />
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
                    className="w-full text-left border p-3 rounded-[16px] transition-all active:scale-[0.99] flex items-center gap-3 group hover:border-brand/20"
                    style={{ background: '#0B1320', borderColor: 'rgba(41,48,61,0.8)' }}
                  >
                    <div className="w-8 h-8 rounded-lg border flex items-center justify-center text-text-secondary shrink-0 group-hover:border-brand/30 transition-colors" style={{ background: '#0D1829', borderColor: 'rgba(41,48,61,0.8)' }}>
                      <FileText size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate group-hover:text-brand transition-colors">
                        {pdf.nome_arquivo.replace('.pdf', '')}
                      </p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">
                        Enviado em {new Date(pdf.data_upload).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-text-tertiary shrink-0 transition-colors" style={{ background: '#0D1829' }}>
                      <MagnifyingGlass size={12} />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {total === 0 && (
            <div className="text-center py-24 border border-dashed rounded-2xl" style={{ background: '#0B1320', borderColor: 'rgba(41,48,61,0.8)' }}>
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
