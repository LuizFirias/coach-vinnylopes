'use client';

import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import { Utensils, Construction, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PlanoAlimentarPage() {
  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-10 lg:pl-28 font-sans">
        <div className="max-w-4xl mx-auto">
          
          <div className="mb-8 md:mb-12">
            <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-brand-purple font-black text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:ml-1 transition-all">
              <ArrowLeft size={12} /> Voltar ao Painel
            </Link>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
              Plano <span className="text-brand-purple">Alimentar</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm">Sua nutrição estratégica para resultados máximos.</p>
          </div>

          <div className="bg-white p-12 md:p-24 rounded-2xl md:rounded-[50px] border border-slate-50 shadow-2xl shadow-slate-200/40 text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-slate-50/50 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000"></div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-brand-purple/5 rounded-3xl md:rounded-[40px] flex items-center justify-center mx-auto mb-8 md:mb-10 text-brand-purple shadow-inner">
                <Utensils size={32} />
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-4">
                <Construction className="text-slate-300" size={16} />
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">Em construção</h2>
              </div>
              
              <p className="max-w-sm mx-auto text-slate-500 font-medium leading-relaxed text-sm md:text-base">
                Seu plano alimentar personalizado está sendo desenhado pelo coach e estará disponível em breve nesta seção.
              </p>
              
              <div className="mt-10 md:mt-12 pt-10 md:pt-12 border-t border-slate-50 flex justify-center">
                 <div className="px-6 py-3 bg-slate-50 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-brand-purple animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando liberação do Coach</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SubscriptionGuard>
  );
}
