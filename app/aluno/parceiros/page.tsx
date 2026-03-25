'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { 
  ShoppingBag, 
  Tag, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Star
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import DumbbellLoader from '@/app/components/DumbbellLoader';

interface Parceiro {
  id: string;
  nome_marca: string;
  descricao: string;
  cupom: string;
  link_desconto: string;
  logo_url?: string | null;
  imagens?: string[] | null;
}

export default function ParceirosPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCupom, setCopiedCupom] = useState<string | null>(null);

  useEffect(() => {
    const fetchParceiros = async () => {
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user;
        if (!user) {
          setError('Usuário não autenticado');
          setLoading(false);
          return;
        }

        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('coach_id')
          .eq('id', user.id)
          .single();

        const coachId = profileData?.coach_id;
        if (!coachId) {
          setParceiros([]);
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabaseClient
          .from('parceiros')
          .select('id, nome_marca, descricao, cupom, link_desconto, logo_url, imagens')
          .eq('coach_id', coachId)
          .order('nome_marca', { ascending: true });

        if (fetchError) {
          setError('Erro ao carregar parceiros: ' + fetchError.message);
          setLoading(false);
          return;
        }

        setParceiros(data || []);
        setLoading(false);
      } catch (err) {
        setError('Erro ao conectar com o servidor');
        setLoading(false);
      }
    };

    fetchParceiros();
  }, []);

  const handleCopiarCupom = (cupom: string) => {
    navigator.clipboard.writeText(cupom);
    setCopiedCupom(cupom);
    setTimeout(() => setCopiedCupom(null), 2000);
  };

  const handleIrParaSite = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    window.open(url, '_blank');
  };

  const handleScroll = (id: string, direction: number) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * direction, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 lg:pl-28">
        <DumbbellLoader text="Carregando benefícios..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 lg:pl-28 font-sans pb-32">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 mb-8 md:mb-16">
          <div>
            <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-brand-purple text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:ml-1 transition-all">
              <ArrowLeft size={12} /> Voltar ao Painel
            </Link>
            <h1 className="text-3xl md:text-4xl text-slate-900 tracking-tight leading-none mb-2 md:mb-3">
              Clube de <span className="text-brand-purple underline decoration-slate-200 decoration-8 underline-offset-4">Vantagens</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm">Benefícios exclusivos para alunos Coach Vinny em marcas parceiras.</p>
          </div>
        </div>

        {error && (
            <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 mb-10 text-sm">
              🚨 {error}
            </div>
        )}

        {/* Partners Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
          {parceiros.map((parceiro) => (
            <div
              key={parceiro.id}
              className="bg-white rounded-2xl md:rounded-[50px] border border-white shadow-2xl shadow-slate-200/40 overflow-hidden flex flex-col group transition-all duration-500 hover:shadow-brand-purple/5"
            >
              {/* Image Carousel */}
              <div className="relative h-[280px] md:h-[340px] w-full overflow-hidden bg-slate-100">
                <div
                  id={`carousel-${parceiro.id}`}
                  className="flex h-full transition-transform duration-500 ease-out overflow-x-hidden"
                >
                  {(parceiro.imagens || [parceiro.logo_url || '']).map((img, idx) => (
                    <div key={idx} className="min-w-full h-full relative p-4">
                      <div className="w-full h-full rounded-[40px] overflow-hidden relative border-8 border-white shadow-inner bg-white">
                        <Image
                          src={img}
                          alt={`${parceiro.nome_marca} view ${idx + 1}`}
                          fill
                          className="object-contain transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-w-768px) 100vw, 50vw"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Badges Overlay */}
                <div className="absolute top-8 left-8 flex flex-col gap-2 z-10">
                   <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
                      <Star size={14} className="fill-brand-purple text-brand-purple" />
                      <span className="text-[10px] uppercase tracking-widest">Premium Partner</span>
                   </div>
                </div>

                {/* Carousel Navigation */}
                {(parceiro.imagens && parceiro.imagens.length > 1) && (
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleScroll(`carousel-${parceiro.id}`, -1)}
                      className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-900 shadow-xl hover:bg-brand-purple hover:text-white transition-all border border-slate-100"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="px-4 py-2 bg-slate-900/80 backdrop-blur text-white rounded-full text-[10px] tabular-nums">
                       GALERIA
                    </div>
                    <button
                      onClick={() => handleScroll(`carousel-${parceiro.id}`, 1)}
                      className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-900 shadow-xl hover:bg-brand-purple hover:text-white transition-all border border-slate-100"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="p-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-3xl text-slate-900 leading-none mb-2 uppercase tracking-tighter group-hover:text-brand-purple transition-colors">
                      {parceiro.nome_marca}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400">
                       <ShieldCheck size={14} />
                       <span className="text-[10px] uppercase tracking-widest">Verificado pelo Coach</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-purple shadow-inner border border-white">
                     <ShoppingBag size={24} />
                  </div>
                </div>

                <p className="text-slate-500 font-medium text-sm mb-10 leading-relaxed max-w-lg">
                  {parceiro.descricao}
                </p>

                <div className="mt-auto space-y-6">
                   {/* Coupon Action */}
                   <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group/cupom">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                           <Tag size={12} className="text-brand-purple" />
                           Cupom Exclusivo
                        </p>
                        <span className="text-xl text-slate-900 tracking-wider font-mono uppercase">{parceiro.cupom}</span>
                      </div>
                      <button
                         onClick={() => handleCopiarCupom(parceiro.cupom)}
                         className={`px-6 py-3 rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg ${
                            copiedCupom === parceiro.cupom 
                             ? 'bg-green-500 text-white shadow-green-200' 
                             : 'bg-white text-slate-900 hover:bg-slate-900 hover:text-white shadow-slate-100'
                         }`}
                      >
                         {copiedCupom === parceiro.cupom ? (
                           <><Check size={14} strokeWidth={3} /> Copiado</>
                         ) : (
                           <><Copy size={14} /> Copiar</>
                         )}
                      </button>
                   </div>

                   {/* External Link */}
                   <button
                     onClick={() => handleIrParaSite(parceiro.link_desconto)}
                     className="w-full py-5 bg-brand-purple text-white rounded-3xl text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-purple/30 hover:-translate-y-1 hover:shadow-brand-purple/40 transition-all flex items-center justify-center gap-3 relative overflow-hidden active:scale-95"
                   >
                     Aproveitar Desconto
                     <ExternalLink size={18} />
                   </button>
                </div>
              </div>
            </div>
          ))}

          {parceiros.length === 0 && (
            <div className="col-span-full bg-white rounded-[50px] p-24 text-center border border-dashed border-slate-200 shadow-xl shadow-slate-100 flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 mb-8 border border-white">
                <ShieldCheck size={40} />
              </div>
              <h3 className="text-2xl text-slate-900 mb-2 uppercase tracking-tight">Clube em Formação</h3>
              <p className="max-w-xs text-slate-400 font-medium mb-6">
                Estamos finalizando parcerias com as melhores marcas para trazer benefícios únicos para você.
              </p>
              <div className="px-6 py-3 bg-slate-50 rounded-2xl flex items-center gap-3 opacity-50">
                 <div className="w-2 h-2 rounded-full bg-brand-purple animate-pulse"></div>
                 <span className="text-[10px] text-slate-400 uppercase tracking-widest">Em negociação estratégica</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
