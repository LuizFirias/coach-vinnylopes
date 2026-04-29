'use client';

import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import UploadNutritionPlan from '@/app/components/UploadNutritionPlan';
import PDFViewer from '@/app/components/PDFViewer';
import { Utensils, ArrowLeft, Upload, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { extractStoragePath } from '@/lib/storageUrls';

interface NutritionPlan {
  id: string;
  aluno_id: string;
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
      // ===== VERIFICAÇÃO DE SEGURANÇA =====
      if (plano.aluno_id !== userId) {
        console.error('[SECURITY] Tentativa de acessar PDF de outro aluno bloqueada');
        alert('Erro de segurança: PDF não encontrado');
        return;
      }

      // Extrair path para signed URL — suporta URLs completas legadas e paths novos
      const filePath = extractStoragePath('plano_alimentar', plano.url_pdf) || plano.url_pdf;

      console.log('[PDF] Plano ID:', plano.id);
      console.log('[PDF] URL original do banco:', plano.url_pdf);
      console.log('[PDF] Nome do arquivo:', plano.nome_arquivo);
      console.log('[PDF] FilePath extraído para signed URL:', filePath);

      // Tentar criar signed URL
      const { data: signedData, error: signError } = await supabaseClient.storage
        .from('plano_alimentar')
        .createSignedUrl(filePath, 3600);

      console.log('[PDF] Resposta do Supabase Storage:');
      console.log('  - signedData:', signedData);
      console.log('  - signError:', signError);

      if (signError) {
        console.error('[PDF] Erro ao criar signed URL:', signError);
        
        // Mensagem de erro mais específica
        let errorMsg = 'Erro ao gerar link de acesso ao PDF.';
        if (signError.message.includes('not found')) {
          errorMsg = `O arquivo "${plano.nome_arquivo}" não foi encontrado no storage. O arquivo pode ter sido movido ou deletado. Entre em contato com seu coach.`;
        } else if (signError.message.includes('permission')) {
          errorMsg = 'Você não tem permissão para acessar este arquivo. Verifique suas configurações ou entre em contato com o suporte.';
        }
        
        alert(`${errorMsg}\n\nDetalhes técnicos: ${signError.message}`);
        return;
      }

      if (!signedData?.signedUrl) {
        console.error('[PDF] signedData vazio - resposta inesperada do Supabase');
        alert('Erro: Não foi possível gerar o link de acesso ao PDF. Tente novamente em alguns instantes.');
        return;
      }

      console.log('[PDF] ✓ Signed URL gerada com sucesso');
      console.log('[PDF] Abrindo PDF no viewer...');
      setSelectedPdf({ url: signedData.signedUrl, title: plano.nome_arquivo });
      setPdfViewerOpen(true);
    } catch (err: any) {
      console.error('[PDF] Erro completo:', err);
      console.error('[PDF] Stack trace:', err.stack);
      alert(`Erro inesperado ao abrir plano alimentar:\n${err.message || 'Erro desconhecido'}\n\nVerifique o console para mais detalhes.`);
    }
  };

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-bg-base p-4 md:p-6 lg:p-10 lg:pl-28 font-sans">
        <div className="max-w-4xl mx-auto">
          
          <div className="mb-8 md:mb-12">
            <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-gold-light text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:ml-1 transition-all">
              <ArrowLeft size={12} /> Voltar ao Painel
            </Link>
            <h1 className="heading-h1 text-text-primary mb-2">
              Plano <span className="text-gold-light">Alimentar</span>
            </h1>
            <p className="body-text text-text-secondary text-sm">Sua nutrição estratégica para resultados máximos.</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-text-secondary">
              <Loader2 size={40} className="animate-spin text-gold-light" />
              <p className="label-small text-text-secondary">Carregando planos...</p>
            </div>
          ) : userRole === 'coach' ? (
            // Coach view - can upload plans
            <div className="bg-bg-card rounded-lg p-12 md:p-24 border border-border-subtle flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gold-default/10 rounded-lg md:rounded-xl flex items-center justify-center mx-auto mb-8 md:mb-10 text-gold-light shadow-lg shadow-gold-default/5">
                <Utensils size={32} />
              </div>
              
              <h2 className="heading-h2 text-text-primary mb-4">
                Gerenciar Planos Alimentares
              </h2>
              
              <p className="max-w-sm mx-auto text-text-secondary font-300 leading-relaxed text-sm md:text-base mb-8">
                Selecione um aluno para enviar seu plano alimentar personalizado.
              </p>
              
              <button
                onClick={() => setUploadModalOpen(true)}
                className="btn-primary px-8 py-3 text-sm flex items-center gap-2"
              >
                <Upload size={18} />
                Enviar Plano
              </button>
            </div>
          ) : planos.length === 0 ? (
            // Student view - no plans yet
            <div className="bg-bg-card rounded-lg p-12 md:p-24 border border-border-subtle flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gold-default/10 rounded-lg md:rounded-xl flex items-center justify-center mx-auto mb-8 md:mb-10 text-gold-light shadow-lg shadow-gold-default/5">
                <Utensils size={32} />
              </div>
              
              <h2 className="heading-h2 text-text-primary mb-4">
                Plano em Breve
              </h2>
              
              <p className="max-w-sm mx-auto text-text-secondary font-300 leading-relaxed text-sm md:text-base">
                Seu plano alimentar personalizado está sendo desenhado pelo coach e estará disponível em breve.
              </p>
              
              <div className="mt-10 md:mt-12 pt-10 md:pt-12 border-t border-border-subtle flex justify-center">
                 <div className="px-6 py-3 bg-bg-elevated rounded-lg flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gold-light animate-pulse"></div>
                    <span className="label-small text-text-secondary">Aguardando liberação do Coach</span>
                 </div>
              </div>
            </div>
          ) : (
            // Student view - show plans
            <div className="space-y-4">
              {planos.map((plano) => (
                <div
                  key={plano.id}
                  className="bg-bg-card border border-border-subtle rounded-lg p-6 hover:border-gold-default/40 hover:shadow-lg hover:shadow-gold-default/5 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gold-default/10 flex items-center justify-center text-gold-light group-hover:scale-110 transition-transform">
                      <FileText size={20} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-text-primary mb-1 uppercase text-sm font-600 break-words">
                        {plano.nome_arquivo.replace('.pdf', '')}
                      </h3>
                      {plano.descricao && (
                        <p className="text-[9px] text-text-secondary mb-3">{plano.descricao}</p>
                      )}
                      <p className="label-small text-text-disabled">
                        {new Date(plano.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenPdf(plano)}
                      className="bg-gold-default text-black rounded-lg px-4 py-2 text-xs flex items-center gap-2 whitespace-nowrap hover:bg-gold-light transition-all font-600 shrink-0"
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
        <div className="relative w-full max-w-md bg-bg-card rounded-lg border border-border-default shadow-2xl shadow-gold-default/5 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-border-subtle bg-bg-elevated">
            <h2 className="heading-h3 text-text-primary">
              Selecionar Aluno
            </h2>
            <button
              onClick={onClose}
              className="p-2 bg-bg-card hover:bg-border-subtle rounded-lg text-text-secondary hover:text-text-primary transition-all"
            >
              <Utensils size={20} />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-gold-light" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">Nenhum aluno atribuído</p>
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
                    className="w-full p-3 text-left rounded-lg bg-bg-elevated hover:bg-gold-default text-text-primary hover:text-black text-sm uppercase tracking-tight transition-all font-500"
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
