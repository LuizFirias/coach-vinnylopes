'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
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

interface TreinoPDF {
  id: string;
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
  const [fichas, setFichas] = useState<FichaTreino[]>([]);
  const [treinosPdf, setTreinosPdf] = useState<TreinoPDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<TreinoPDF | null>(null);

  useEffect(() => {
    const fetchTreinos = async () => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !authData.user) {
          setError('Sessão expirada. Faça login novamente.');
          setLoading(false);
          return;
        }

        const userId = authData.user.id;

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
          .select('*')
          .eq('aluno_id', userId)
          .order('data_upload', { ascending: false });

        if (fichasError || pdfsError) {
          setError('Erro ao carregar treinos');
        } else {
          setFichas(fichasData || []);
          
          // Gerar URLs assinadas para cada PDF pois o bucket é privado
          const pdfsComLinks = await Promise.all((pdfsData || []).map(async (pdf: any) => {
            // Extrair o path do arquivo da URL antiga (que continha o publicUrl)
            // Se já tivermos o path no banco seria melhor, mas podemos extrair o path relativo do bucket
            // Como salvamos como "aluno_id/timestamp_nome.pdf", vamos extrair
            const pathParts = pdf.url_pdf.split('/treinos-pdf/');
            const filePath = pathParts.length > 1 ? pathParts[1] : pdf.url_pdf;

            const { data: signedData } = await supabaseClient.storage
              .from('treinos-pdf')
              .createSignedUrl(filePath, 3600); // Link válido por 1 hora

            return {
              ...pdf,
              url_pdf: signedData?.signedUrl || pdf.url_pdf
            };
          }));

          setTreinosPdf(pdfsComLinks);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Erro ao conectar com o servidor');
        setLoading(false);
      }
    };

    fetchTreinos();
  }, [router]);

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
        <div className="flex flex-col items-center gap-4 text-zinc-500">
          <div className="w-12 h-12 border-4 border-iron-red/20 border-t-iron-red rounded-full animate-spin"></div>
          <span className="font-bold uppercase tracking-widest text-[10px]">Carregando treinos...</span>
        </div>
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
              <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-[#D4AF37] font-black text-[10px] uppercase tracking-widest mb-4 hover:ml-1 transition-all">
                <ArrowLeft size={12} /> Dashboard
              </Link>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 uppercase">
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
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Total</p>
                  <p className="text-xl font-black text-white leading-none">{fichas.length + treinosPdf.length} Protocolos</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-500 p-6 rounded-3xl border border-red-500/20 mb-10 font-bold text-sm italic">
              🚨 {error}
            </div>
          )}

          {/* Fichas e PDFs Grid */}
          <div className="space-y-12">
            {/* Rotinas Estruturadas */}
            {fichas.length > 0 && (
              <section>
                <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                   Rotinas Interativas <div className="h-[1px] flex-1 bg-white/5"></div>
                </h2>
                <div className="flex flex-col gap-4">
                  {fichas.map((ficha) => (
                    <div 
                      key={ficha.id} 
                      onClick={() => router.push(`/aluno/treinos/ficha?id=${ficha.id}`)}
                      className="group bg-black/40 rounded-2xl p-6 border border-[#1a1a1a] shadow-2xl hover:border-[#D4AF37]/30 transition-all duration-300 cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-[#0F0F0F] rounded-xl flex items-center justify-center border border-[#1a1a1a] group-hover:border-[#D4AF37]/20 transition-all">
                          <Dumbbell className="text-zinc-700 group-hover:text-[#D4AF37] transition-colors" size={24} />
                        </div>

                        <div>
                          <h3 className="text-xl font-bold text-[#D4AF37] leading-tight group-hover:text-white transition-colors">
                            {ficha.nome_rotina}
                          </h3>
                          <p className="text-zinc-400 font-medium text-xs mt-1">
                            Acompanhamento de séries e cargas em tempo real.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden sm:flex flex-col items-end">
                          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Digital</span>
                          <span className="text-xs font-bold text-white uppercase">{formatarData(ficha.criado_em)}</span>
                        </div>
                        <div className="w-10 h-10 bg-[#0F0F0F] rounded-xl flex items-center justify-center text-zinc-600 group-hover:text-white group-hover:bg-[#D4AF37] transition-all">
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
                <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                   Fichas PDF (Protocolos) <div className="h-[1px] flex-1 bg-white/5"></div>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {treinosPdf.map((pdf) => (
                    <div 
                      key={pdf.id} 
                      onClick={() => setSelectedPdf(pdf)}
                      className="group bg-black/60 rounded-2xl p-5 border border-white/5 hover:border-[#D4AF37]/40 transition-all duration-500 cursor-pointer flex items-center gap-4 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-[#D4AF37]/10 transition-colors"></div>
                      
                      <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-[#D4AF37] shrink-0 border border-[#D4AF37]/20">
                        <FileCheck size={22} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">
                          {pdf.nome_arquivo.replace('.pdf', '')}
                        </h3>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          Enviado em {formatarData(pdf.data_upload)}
                        </p>
                      </div>

                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-600 group-hover:text-white group-hover:bg-[#D4AF37]/20 transition-all shrink-0">
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
                <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Nenhum treino ativo</h3>
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
