'use client';

import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import UploadNutritionPlan from '@/app/components/UploadNutritionPlan';
import PDFViewer from '@/app/components/PDFViewer';
import { Utensils, ArrowLeft, Upload, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

interface NutritionPlan {
  id: string;
  nome_arquivo: string;
  url_pdf: string;
  descricao: string | null;
  criado_em: string;
}

export default function PlanoAlimentarPage() {
  const [planos, setPlanos] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{url: string, title: string} | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      if (!authData.user) {
        setLoading(false);
        return;
      }

      setUserId(authData.user.id);

      // Get user profile info
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('full_name, role')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name || 'Aluno');
        setUserRole(profile.role);
      }

      // If student, fetch their own plans
      if (profile?.role === 'aluno') {
        const { data: plans } = await supabaseClient
          .from('plano_alimentar_pdf')
          .select('*')
          .eq('aluno_id', authData.user.id)
          .order('criado_em', { ascending: false });

        setPlanos(plans || []);
      }
      // If coach, they can upload via modal (no display list for now)
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPdf = async (plano: NutritionPlan) => {
    try {
      // Check if URL is a path that needs signing
      if (plano.url_pdf.includes('plano-alimentar/')) {
        const pathMatch = plano.url_pdf.match(/plano-alimentar\/(.*)/);
        if (pathMatch) {
          const { data: signedUrl } = await supabaseClient.storage
            .from('plano-alimentar')
            .createSignedUrl(pathMatch[1], 3600);
          
          if (signedUrl?.signedUrl) {
            setSelectedPdf({
              url: signedUrl.signedUrl,
              title: plano.nome_arquivo
            });
          }
        }
      } else {
        setSelectedPdf({
          url: plano.url_pdf,
          title: plano.nome_arquivo
        });
      }
      setPdfViewerOpen(true);
    } catch (err) {
      console.error('Erro ao abrir PDF:', err);
      alert('Erro ao abrir plano alimentar');
    }
  };

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-iron-black p-4 md:p-6 lg:p-10 lg:pl-28 font-sans">
        <div className="max-w-4xl mx-auto">
          
          <div className="mb-8 md:mb-12">
            <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-iron-red font-black text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:ml-1 transition-all">
              <ArrowLeft size={12} /> Voltar ao Painel
            </Link>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              Plano <span className="text-[#D4AF37]">Alimentar</span>
            </h1>
            <p className="text-zinc-500 font-medium text-sm">Sua nutrição estratégica para resultados máximos.</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-zinc-500">
              <Loader2 size={40} className="animate-spin text-[#D4AF37]" />
              <p className="text-xs font-black uppercase tracking-[0.3em]">Carregando planos...</p>
            </div>
          ) : userRole === 'coach' ? (
            // Coach view - can upload plans
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-[40px] p-12 md:p-24 border border-white/5 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-[#D4AF37]/10 rounded-3xl md:rounded-[40px] flex items-center justify-center mx-auto mb-8 md:mb-10 text-[#D4AF37] shadow-inner">
                <Utensils size={32} />
              </div>
              
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase mb-4">
                Gerenciar Planos Alimentares
              </h2>
              
              <p className="max-w-sm mx-auto text-zinc-400 font-medium leading-relaxed text-sm md:text-base mb-8">
                Selecione um aluno para enviar seu plano alimentar personalizado.
              </p>
              
              <button
                onClick={() => setUploadModalOpen(true)}
                className="px-8 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-black text-sm uppercase tracking-tight rounded-lg transition-all flex items-center gap-2"
              >
                <Upload size={18} />
                Enviar Plano
              </button>
            </div>
          ) : planos.length === 0 ? (
            // Student view - no plans yet
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-[40px] p-12 md:p-24 border border-white/5 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-[#D4AF37]/10 rounded-3xl md:rounded-[40px] flex items-center justify-center mx-auto mb-8 md:mb-10 text-[#D4AF37] shadow-inner">
                <Utensils size={32} />
              </div>
              
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase mb-4">
                Plano em Breve
              </h2>
              
              <p className="max-w-sm mx-auto text-zinc-400 font-medium leading-relaxed text-sm md:text-base">
                Seu plano alimentar personalizado está sendo desenhado pelo coach e estará disponível em breve.
              </p>
              
              <div className="mt-10 md:mt-12 pt-10 md:pt-12 border-t border-white/10 flex justify-center">
                 <div className="px-6 py-3 bg-zinc-800 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Aguardando liberação do Coach</span>
                 </div>
              </div>
            </div>
          ) : (
            // Student view - show plans
            <div className="space-y-4">
              {planos.map((plano) => (
                <div
                  key={plano.id}
                  className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-[#D4AF37]/30 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                      <FileText size={20} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-white truncate mb-1 uppercase text-sm">
                        {plano.nome_arquivo.replace('.pdf', '')}
                      </h3>
                      {plano.descricao && (
                        <p className="text-[9px] text-zinc-400 mb-3">{plano.descricao}</p>
                      )}
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                        {new Date(plano.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenPdf(plano)}
                      className="px-4 py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-black text-xs uppercase tracking-tight rounded-lg transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      <FileText size={14} />
                      Visualizar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal - for coaches */}
      {userRole === 'coach' && userId && (
        <CoachSelectStudent
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          coachId={userId}
          onSelect={(alunoId, alunoName) => {
            setUploadModalOpen(false);
            // Open upload modal
            setTimeout(() => {
              const modal = document.getElementById(`upload-${alunoId}`);
              if (modal) {
                (modal as any).click();
              }
            }, 100);
          }}
        />
      )}

      {/* PDF Viewer */}
      {selectedPdf && pdfViewerOpen && (
        <PDFViewer
          url={selectedPdf.url}
          title={selectedPdf.title}
          onClose={() => {
            setPdfViewerOpen(false);
            setSelectedPdf(null);
          }}
        />
      )}
    </SubscriptionGuard>
  );
}

// Componente para coach selecionar aluno
function CoachSelectStudent({
  isOpen,
  onClose,
  coachId,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  coachId: string;
  onSelect: (alunoId: string, alunoName: string) => void;
}) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [uploadModal, setUploadModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen]);

  const fetchStudents = async () => {
    try {
      const { data } = await supabaseClient
        .from('coach_alunos')
        .select(`
          aluno_id,
          profiles!coach_alunos_aluno_id_fkey(full_name, id)
        `)
        .eq('coach_id', coachId);

      setStudents(
        (data || []).map((item: any) => ({
          id: item.aluno_id,
          name: item.profiles?.full_name || 'Aluno'
        }))
      );
    } catch (err) {
      console.error('Erro ao carregar alunos:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-[#0a0a0a] rounded-2xl border border-[#D4AF37]/20 shadow-[0_0_50px_rgba(212,175,55,0.1)] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/40">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">
              Selecionar Aluno
            </h2>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"
            >
              <Utensils size={20} />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhum aluno atribuído</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student.id);
                      setUploadModalOpen(true);
                      onClose();
                    }}
                    className="w-full p-3 text-left rounded-lg bg-zinc-800 hover:bg-[#D4AF37] text-white hover:text-black font-bold text-sm uppercase tracking-tight transition-all"
                  >
                    {student.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {selectedStudent && (
        <UploadNutritionPlan
          isOpen={uploadModal}
          onClose={() => {
            setUploadModalOpen(false);
            setSelectedStudent(null);
            onClose();
          }}
          alunoId={selectedStudent}
          alunoName={students.find(s => s.id === selectedStudent)?.name || 'Aluno'}
          onUploadSuccess={() => {
            setUploadModalOpen(false);
            setSelectedStudent(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
