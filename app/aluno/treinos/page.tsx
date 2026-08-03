'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { getSignedStorageUrl } from '@/lib/storageUrls';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import { FileText, MagnifyingGlass } from '@phosphor-icons/react';
import PDFViewer from '@/app/components/PDFViewer';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { RoutineCard } from '@/app/components/treinos/RoutineCard';

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
      grupo_muscular?: string;
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
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  const openPdf = async (pdf: TreinoPDF) => {
    if (pdf.aluno_id !== userId || openingPdfId) return;
    setOpeningPdfId(pdf.id);
    try {
      const signed = await getSignedStorageUrl('treinos-pdf', pdf.url_pdf, 3600);
      setSelectedPdf({ ...pdf, url_pdf: signed || pdf.url_pdf });
    } finally {
      setOpeningPdfId(null);
    }
  };

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const fetchTreinos = async () => {
      try {
        const session = await getSafeSession();
        const user = session?.user;
        if (!user) { setError('Sessão expirada. Faça login novamente.'); setLoading(false); return; }

        const uid = user.id;

        const [{ data: fichasData }, { data: pdfsData }] = await Promise.all([
          supabaseClient
            .from('fichas_treino')
            .select('id, nome_rotina, criado_em, configuracao')
            .eq('aluno_id', uid)
            .eq('ativo', true)
            .order('criado_em', { ascending: false }),
          supabaseClient
            .from('treinos_alunos')
            .select('id, aluno_id, url_pdf, nome_arquivo, data_upload')
            .eq('aluno_id', uid)
            .order('data_upload', { ascending: false }),
        ]);

        setUserId(uid);
        setFichas(fichasData || []);
        // URL assinada só quando o aluno abre o PDF — evita 1 request por PDF no boot
        setTreinosPdf(pdfsData || []);
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
        <DumbbellLoader text="Carregando treinos..." />
      </div>
    );
  }

  const total = fichas.length + treinosPdf.length;

  return (
    <SubscriptionGuard>
      <div className="min-h-screen pb-24" style={{ background: 'var(--surface-0)' }}>
        <div className="px-4 pt-6 pb-4 max-w-[680px] mx-auto lg:pt-10 lg:pb-6">
          <h1
            className="text-[22px] lg:text-[26px] font-extrabold tracking-tight"
            style={{ color: '#1a1a1a' }}
          >
            Minhas Rotinas
          </h1>
        </div>

        <div className="px-4 max-w-[680px] mx-auto flex flex-col gap-4 lg:gap-6">
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
              {error}
            </div>
          )}

          {fichas.length > 0 && (
            <section>
              <div
                className={`
                  flex flex-col gap-2.5 lg:gap-3
                  md:grid md:grid-cols-2 md:gap-3
                  lg:flex lg:flex-col
                `}
              >
                {fichas.map((ficha, index) => {
                  const exercicios = ficha.configuracao?.exercicios ?? [];
                  const isLastOddOnTablet =
                    fichas.length % 2 === 1 && index === fichas.length - 1;

                  return (
                    <div
                      key={ficha.id}
                      className={isLastOddOnTablet ? 'md:col-span-2 lg:col-span-1' : undefined}
                    >
                      <RoutineCard
                        isDesktop={isDesktop}
                        routine={{
                          id: ficha.id,
                          nome_rotina: ficha.nome_rotina,
                          criado_em: ficha.criado_em,
                          exercicios,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {fichas.length < 3 && (
                <p className="text-xs text-center mt-4 lg:mt-6" style={{ color: '#999' }}>
                  Seu coach pode adicionar mais rotinas ao seu plano
                </p>
              )}
            </section>
          )}

          {treinosPdf.length > 0 && (
            <section>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-3 flex items-center gap-2"
                style={{ color: '#888' }}
              >
                Fichas PDF
              </p>
              <div className="flex flex-col gap-2.5">
                {treinosPdf.map(pdf => (
                  <button
                    key={pdf.id}
                    onClick={() => void openPdf(pdf)}
                    className="w-full text-left p-3.5 rounded-[12px] transition-all active:scale-[0.99] flex items-center gap-3 group min-h-16"
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{ background: 'var(--surface-2)', color: '#555' }}
                    >
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>
                        {pdf.nome_arquivo.replace('.pdf', '')}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#888' }}>
                        Enviado em {new Date(pdf.data_upload).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--surface-2)', color: '#bbb' }}
                    >
                      <MagnifyingGlass size={14} />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {total === 0 && (
            <p className="text-sm text-center py-16" style={{ color: '#999' }}>
              Nenhum treino ativo. Seu coach ainda não atribuiu uma rotina para o seu perfil.
            </p>
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
