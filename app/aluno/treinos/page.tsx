'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { getSignedStorageUrl } from '@/lib/storageUrls';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import { 
  Dumbbell, 
  FileText, 
  Calendar, 
  ArrowRight, 
  ChevronRight, 
  Clock,
  Layout,
  Search,
  ArrowLeft,
  FileCheck
} from 'lucide-react';
import Link from 'next/link';
import PDFViewer from '@/app/components/PDFViewer';
import DumbbellLoader from '@/app/components/DumbbellLoader';

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
}

export default function AlunoTreinosPage() {
  const router = useRouter();
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

        if (!user) {
          setError('Sessão expirada. Faça login novamente.');
          setLoading(false);
          return;
        }

        const userId = user.id;

        // Buscar fichas estruturadas
        const { data: fichasData, error: fichasError } = await supabaseClient
          .from('fichas_treino')
          .select('*')
          .eq('aluno_id', userId)
          .eq('ativo', true)
          .order('criado_em', { ascending: false });

        // Buscar PDFs
        const { data: pdfsData, error: pdfsError } = await supabaseClient
          .from('treinos_alunos')
          .select('id, aluno_id, url_pdf, nome_arquivo, data_upload')
          .eq('aluno_id', userId)
          .order('data_upload', { ascending: false });

        if (fichasError) {
          console.error('[Treinos] Erro ao buscar fichas:', fichasError);
        }
        if (pdfsError) {
          console.error('[Treinos] Erro ao buscar PDFs:', pdfsError);
        }

        setUserId(userId);
        setFichas(fichasData || []);

        // Gerar URLs assinadas para cada PDF pois o bucket é privado
        const pdfsComLinks = await Promise.all((pdfsData || []).map(async (pdf: any) => {
          const signed = await getSignedStorageUrl('treinos-pdf', pdf.url_pdf, 3600);
          return { ...pdf, url_pdf: signed || pdf.url_pdf };
        }));

        setTreinosPdf(pdfsComLinks);

        setLoading(false);
      } catch (err) {
        console.error('[Treinos] Erro ao carregar treinos:', err);
        setError('Erro ao conectar com o servidor');
        setLoading(false);
      }
    };

    fetchTreinos();
  }, []);

  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(data);
    } catch {
      return dataString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-iron-black flex items-center justify-center p-6">
        <DumbbellLoader text="Carregando treinos..." />
      </div>
    );
  }

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-iron-black p-4 md:p-6 lg:p-10 lg:pl-28 font-sans">
        <div className="max-w-6xl mx-auto pb-16 md:pb-20">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-12">
            <div>
              <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-[#D4AF37] text-[10px] uppercase tracking-widest mb-4 hover:ml-1 transition-all">
                <ArrowLeft size={12} /> Dashboard
              </Link>
              <h1 className="text-4xl md:text-5xl text-white tracking-tight mb-2 uppercase">
                Minhas <span className="text-[#D4AF37]">Rotinas</span>
              </h1>
              <p className="text-zinc-500 font-medium text-sm border-l-2 border-[#D4AF37] pl-4">Seu cronograma técnico de treinamento.</p>
            </div>
            
            {fichas.length + treinosPdf.length > 0 && (
              <div className="bg-black px-6 py-4 rounded-2xl border border-[#1a1a1a] shadow-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-[#D4AF37]">
                  <Layout size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest leading-none mb-1">Total</p>
                  <p className="text-xl text-white leading-none">{fichas.length + treinosPdf.length} Protocolos</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-500 p-6 rounded-3xl border border-red-500/20 mb-10 text-sm">
              ?? {error}
            </div>
          )}

          {/* Fichas e PDFs Grid */}
          <div className="space-y-12">
            {/* Rotinas Estruturadas */}
            {fichas.length > 0 && (
              <section>
                <h2 className="label-overline text-gold-light mb-8 flex items-center gap-3">
                   <div className="w-2 h-8 bg-gold-default rounded-full"></div>
                   Rotinas Interativas
                </h2>
                <div className="flex flex-col gap-4">
                  {fichas.map((ficha) => (
                    <div 
                      key={ficha.id} 
                      onClick={() => router.push(`/aluno/treinos/ficha?id=${ficha.id}`)}
                      className="group bg-gold-default/10 border border-gold-default/30 rounded-lg p-6 shadow-xl shadow-gold-default/10 hover:border-gold-light/50 hover:shadow-gold-default/20 hover:bg-gold-default/15 transition-all duration-300 cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-gold-default/20 rounded-lg flex items-center justify-center border border-gold-default/40 group-hover:bg-gold-default/30 transition-all">
                          <Dumbbell className="text-gold-light" size={24} />
                        </div>

                        <div>
                          <h3 className="heading-h3 text-gold-light leading-tight">
                            {ficha.nome_rotina}
                          </h3>
                          <p className="label-small text-text-secondary mt-1">Estruturada Interativa</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden sm:flex flex-col items-end">
                          <span className="label-small text-text-secondary">Digital</span>
                          <span className="text-xs text-text-primary uppercase font-600">{formatarData(ficha.criado_em)}</span>
                        </div>
                        <div className="w-10 h-10 bg-gold-default/20 rounded-lg flex items-center justify-center text-gold-light group-hover:bg-gold-light group-hover:text-black transition-all">
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* PDFs */}
            {treinosPdf.length > 0 && (
              <section>
                <h2 className="label-overline text-text-secondary mb-8 flex items-center gap-3">
                   <div className="w-2 h-8 bg-border-subtle rounded-full"></div>
                   Fichas PDF (Protocolos)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {treinosPdf.map((pdf) => (
                    <div 
                      key={pdf.id} 
                      onClick={() => {
                        // ===== VERIFICAÇÃO DE SEGURANÇA =====
                        if (pdf.aluno_id !== userId) {
                          console.error('[SECURITY] Tentativa de acessar PDF de treino de outro aluno bloqueada');
                          alert('Erro de segurança: PDF não encontrado');
                          return;
                        }
                        setSelectedPdf(pdf);
                      }}
                      className="group bg-bg-card border border-border-subtle rounded-lg p-5 hover:border-border-default hover:shadow-lg hover:shadow-gold-default/5 transition-all duration-300 cursor-pointer flex items-center gap-4 relative overflow-hidden"
                    >
                      <div className="w-12 h-12 bg-bg-elevated rounded-lg flex items-center justify-center text-text-secondary group-hover:text-gold-light shrink-0 border border-border-subtle group-hover:border-gold-default/30 transition-all">
                        <FileCheck size={22} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm text-text-primary uppercase tracking-tight truncate font-600">
                          {pdf.nome_arquivo.replace('.pdf', '')}
                        </h3>
                        <p className="label-small text-text-secondary">
                          Enviado em {formatarData(pdf.data_upload)}
                        </p>
                      </div>

                      <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-gold-light group-hover:text-gold-highlight group-hover:bg-gold-default/10 transition-all shrink-0 border border-border-subtle group-hover:border-gold-default/30">
                         <Search size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {fichas.length === 0 && treinosPdf.length === 0 && (
              <div className="bg-iron-gray rounded-[50px] p-24 text-center border border-dashed border-white/10 shadow-2xl flex flex-col items-center">
                <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center text-zinc-800 mb-8 border border-white/5">
                  <Search size={40} />
                </div>
                <h3 className="text-2xl text-white mb-2 uppercase tracking-tight">Nenhum treino ativo</h3>
                <p className="max-w-xs text-zinc-500 font-medium mb-10">
                  Seu Coach ainda não atribuiu uma rotina de treinos para o seu perfil.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal PDF Viewer */}
        {selectedPdf && (
          <PDFViewer 
            url={selectedPdf.url_pdf} 
            title={selectedPdf.nome_arquivo} 
            onClose={() => setSelectedPdf(null)} 
          />
        )}
      </div>
    </SubscriptionGuard>
  );
}

