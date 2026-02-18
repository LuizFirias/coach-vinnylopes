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
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface Treino {
  id: string;
  nome: string;
  url_pdf: string;
  data_upload: string;
}

interface FichaTreino {
  id: string;
  rotina: string;
  criado_em: string;
}

export default function AlunoTreinosPage() {
  const router = useRouter();
  const [fichas, setFichas] = useState<FichaTreino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (profileData?.role === 'coach') {
          router.push('/admin/alunos');
          return;
        }

        // Buscar fichas de treino do aluno
        const { data: fichasData, error: fichasError } = await supabaseClient
          .from('fichas_treino')
          .select('id, rotina, criado_em')
          .eq('aluno_id', userId)
          .eq('ativo', true)
          .order('criado_em', { ascending: false });

        if (fichasError) {
          setError('Erro ao carregar treinos: ' + fichasError.message);
        } else {
          setFichas(fichasData || []);
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12">
            <div>
              <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-iron-red font-black text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:ml-1 transition-all">
                <ArrowLeft size={12} /> Voltar ao Painel
              </Link>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
                Central de <span className="text-gradient-red">Treinos</span>
              </h1>
              <p className="text-zinc-500 font-medium text-sm">Sua rotina técnica otimizada pelo Coach.</p>
            </div>
            
            {fichas.length > 0 && (
              <div className="bg-iron-gray px-4 md:px-6 py-3 md:py-4 rounded-2xl md:rounded-3xl border border-white/5 shadow-2xl flex items-center gap-3 md:gap-4">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-iron-red/10 rounded-xl md:rounded-2xl flex items-center justify-center text-iron-red">
                  <Layout size={18} />
                </div>
                <div>
                  <p className="text-[9px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest">Total Ativos</p>
                  <p className="text-lg md:text-xl font-black text-white leading-none">{fichas.length} Fichas</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-iron-red/10 text-iron-red p-6 rounded-3xl border border-iron-red/20 mb-10 font-bold text-sm italic">
              🚨 {error}
            </div>
          )}

          {/* Fichas Grid */}
          {fichas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {fichas.map((ficha) => (
                <div 
                  key={ficha.id} 
                  onClick={() => router.push(`/aluno/treinos/ficha?id=${ficha.id}`)}
                  className="group bg-iron-gray rounded-2xl md:rounded-3xl p-5 md:p-8 border border-white/5 shadow-2xl hover:border-iron-red/30 hover:-translate-y-2 transition-all duration-500 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-bl-[100px] flex items-center justify-center -mr-4 -mt-4 transition-colors group-hover:bg-iron-red/10">
                    <Dumbbell className="text-zinc-800 group-hover:text-iron-red/20 transition-colors" size={32} />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-5 md:mb-6">
                      <div className="px-3 py-1 bg-iron-red/10 text-iron-red rounded-full text-[10px] font-black uppercase tracking-widest shadow-neon-red">
                        Digital
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                        <Calendar size={12} />
                        {formatarData(ficha.criado_em)}
                      </div>
                    </div>

                    <h3 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight pr-10 group-hover:text-iron-red transition-colors">
                      {ficha.rotina}
                    </h3>
                    
                    <p className="text-zinc-500 font-medium text-xs md:text-sm mb-6 md:mb-8 line-clamp-2">
                       Acesse seus exercícios detalhados, séries, repetições e vídeos.
                    </p>

                    <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-600 group-hover:text-iron-red group-hover:bg-iron-red/10 transition-colors">
                          <Clock size={16} />
                        </div>
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Iniciado agora</span>
                      </div>
                      <div className="w-12 h-12 bg-iron-black rounded-2xl flex items-center justify-center text-white group-hover:bg-iron-red transition-all shadow-lg group-hover:shadow-neon-red group-hover:rotate-12">
                        <ChevronRight size={24} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-iron-gray rounded-[50px] p-24 text-center border border-dashed border-white/10 shadow-2xl flex flex-col items-center">
              <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center text-zinc-800 mb-8 border border-white/5">
                <Search size={40} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Nenhum treino ativo</h3>
              <p className="max-w-xs text-zinc-500 font-medium mb-10">
                Seu Coach ainda não atribuiu uma rotina de treinos para o seu perfil.
              </p>
              <div className="px-6 py-3 bg-white/5 rounded-2xl flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-zinc-800 animate-pulse"></div>
                 <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Aguardando definição</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </SubscriptionGuard>
  );
}
