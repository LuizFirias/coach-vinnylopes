'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import {
  ShoppingBag, Tag, ArrowSquareOut, Copy, Check, ArrowLeft,
  CaretLeft, CaretRight, ShieldCheck,
} from '@phosphor-icons/react';
import Link from 'next/link';
import Image from 'next/image';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { cn } from '@/lib/utils/cn';

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
        if (!user) { setError('Usuário não autenticado'); setLoading(false); return; }

        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('coach_id')
          .eq('id', user.id)
          .single();

        const coachId = profileData?.coach_id;
        if (!coachId) { setParceiros([]); setLoading(false); return; }

        const { data, error: fetchError } = await supabaseClient
          .from('parceiros')
          .select('id, nome_marca, descricao, cupom, link_desconto, logo_url, imagens')
          .eq('coach_id', coachId)
          .order('nome_marca', { ascending: true });

        if (fetchError) { setError('Erro ao carregar parceiros: ' + fetchError.message); setLoading(false); return; }
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
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    window.open(url, '_blank');
  };

  const handleScroll = (id: string, direction: number) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * direction, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6 lg:pl-28">
        <DumbbellLoader text="Carregando benefícios..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div>
          <Link
            href="/aluno/dashboard"
            className="inline-flex items-center gap-1.5 text-brand text-2xs uppercase tracking-caps mb-4"
          >
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Clube de <span className="text-brand">Vantagens</span>
          </h1>
          <p className="text-sm text-text-tertiary mt-0.5">Benefícios exclusivos para alunos Auronfit em marcas parceiras.</p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* Partners Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {parceiros.map((parceiro) => {
            const images = parceiro.imagens && parceiro.imagens.length > 0
              ? parceiro.imagens
              : parceiro.logo_url
                ? [parceiro.logo_url]
                : [];
            const hasCarousel = images.length > 1;

            return (
              <div
                key={parceiro.id}
                className="bg-surface-1 border border-card shadow-elev-1 hover:shadow-elev-2 hover:border-brand/20 rounded-2xl overflow-hidden transition-all"
              >
                {/* Image carousel */}
                {images.length > 0 && (
                  <div className="relative h-56 w-full overflow-hidden bg-surface-2">
                    <div
                      id={`carousel-${parceiro.id}`}
                      className="flex h-full overflow-x-hidden"
                    >
                      {images.map((img, idx) => (
                        <div key={idx} className="min-w-full h-full relative p-3">
                          <div className="w-full h-full rounded-xl overflow-hidden relative bg-surface-3">
                            <Image
                              src={getPublicStorageUrl('parceiros-logos', img) || ''}
                              alt={`${parceiro.nome_marca} ${idx + 1}`}
                              fill
                              className="object-contain"
                              sizes="(max-width: 768px) 100vw, 50vw"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Premium badge */}
                    <div className="absolute top-5 left-5 z-10">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-0/80 backdrop-blur-sm border border-card rounded-xl">
                        <ShieldCheck className="w-3 h-3 text-brand" />
                        <span className="text-2xs font-semibold uppercase tracking-caps text-text-secondary">Verificado</span>
                      </div>
                    </div>

                    {/* Carousel navigation */}
                    {hasCarousel && (
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-3 z-10">
                        <button
                          onClick={() => handleScroll(`carousel-${parceiro.id}`, -1)}
                          className="w-8 h-8 bg-surface-1/90 backdrop-blur border border-card rounded-full flex items-center justify-center text-text-secondary shadow-sm hover:border-brand/30 transition-colors"
                        >
                          <CaretLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleScroll(`carousel-${parceiro.id}`, 1)}
                          className="w-8 h-8 bg-surface-1/90 backdrop-blur border border-card rounded-full flex items-center justify-center text-text-secondary shadow-sm hover:border-brand/30 transition-colors"
                        >
                          <CaretRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-text-primary uppercase tracking-tight">{parceiro.nome_marca}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <ShieldCheck className="w-3 h-3 text-text-tertiary" />
                        <span className="text-2xs text-text-tertiary uppercase tracking-caps">Verificado pelo Coach</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-surface-2 border border-card rounded-xl flex items-center justify-center text-text-tertiary flex-shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>

                  <p className="text-sm text-text-secondary leading-relaxed">{parceiro.descricao}</p>

                  {/* Coupon */}
                  <div className="flex items-center justify-between bg-surface-2 border border-card px-4 py-3 rounded-xl">
                    <div>
                      <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-0.5 flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-brand" />
                        Cupom Exclusivo
                      </p>
                      <span className="text-base font-mono font-bold text-text-primary uppercase tracking-wider">{parceiro.cupom}</span>
                    </div>
                    <button
                      onClick={() => handleCopiarCupom(parceiro.cupom)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold uppercase tracking-caps transition-all',
                        copiedCupom === parceiro.cupom
                          ? 'bg-success text-white'
                          : 'bg-surface-3 border border-card text-text-secondary hover:text-brand hover:border-brand/20'
                      )}
                    >
                      {copiedCupom === parceiro.cupom ? (
                        <><Check className="w-3.5 h-3.5" weight="bold" /> Copiado</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copiar</>
                      )}
                    </button>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handleIrParaSite(parceiro.link_desconto)}
                    className="w-full h-11 bg-brand text-text-on-brand rounded-xl text-xs font-semibold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Aproveitar Desconto
                    <ArrowSquareOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {parceiros.length === 0 && !error && (
            <div className="col-span-full bg-surface-1 border border-card shadow-elev-1 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-surface-2 border border-card rounded-2xl flex items-center justify-center text-text-disabled mb-6">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1 uppercase tracking-tight">Clube em Formação</h3>
              <p className="text-sm text-text-tertiary max-w-xs mb-4">
                Estamos finalizando parcerias com as melhores marcas para trazer benefícios únicos para você.
              </p>
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-card rounded-xl opacity-60">
                <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                <span className="text-2xs text-text-tertiary uppercase tracking-caps">Em negociação estratégica</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
