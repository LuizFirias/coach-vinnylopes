"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { DeviceMobile, X } from '@phosphor-icons/react';

export default function PWAInstall() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Verificar se já está instalado (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone
      || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Detectar plataforma
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIOS) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      // Se não for mobile (iOS ou Android), não mostrar o modal
      return;
    }

    // Mostrar após 3 segundos
    const timer = setTimeout(() => {
      const dismissed = localStorage.getItem('pwa-dismissed');
      if (!dismissed) setShow(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Don't render anything until client-side hydration is complete
  if (!mounted || !show) return null;

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-dismissed', 'true');
  };

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 animate-slide-up md:left-auto md:right-6 md:w-96">
      <div
        className="relative rounded-[20px] p-6"
        style={{
          background: 'var(--mobile-card-bg)',
          border: '1px solid var(--mobile-card-border)',
          boxShadow: 'var(--mobile-card-shadow, 0 8px 32px rgba(0,0,0,0.18))',
        }}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-4 right-4 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div className="mb-4 flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #F5D061 0%, #D4A843 55%, #B8902F 100%)',
              boxShadow: '0 3px 10px rgba(212, 168, 67,0.35)',
            }}
          >
            <DeviceMobile className="text-white" size={24} weight="bold" />
          </div>
          <div>
            <h3
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-primary)' }}
            >
              Instalar Aplicativo
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Acesse seu treino com um clique.
            </p>
          </div>
        </div>

        <div
          className="space-y-3 rounded-2xl p-4"
          style={{
            background: 'var(--filter-bg, #ebebf0)',
            border: '1px solid var(--mobile-card-border)',
          }}
        >
          {platform === 'ios' ? (
            <>
              <Step n={1}>
                Toque no ícone de <span style={{ color: '#D4A843', fontWeight: 600 }}>Compartilhar</span> na barra inferior.
              </Step>
              <Step n={2}>
                Role para baixo e selecione <span style={{ color: '#D4A843', fontWeight: 600 }}>&quot;Adicionar à Tela de Início&quot;</span>.
              </Step>
            </>
          ) : (
            <>
              <Step n={1}>
                Toque nos <span style={{ color: '#D4A843', fontWeight: 600 }}>três pontos (⋮)</span> no canto superior do navegador.
              </Step>
              <Step n={2}>
                Selecione <span style={{ color: '#D4A843', fontWeight: 600 }}>&quot;Instalar aplicativo&quot;</span> ou <span style={{ color: '#D4A843', fontWeight: 600 }}>&quot;Adicionar à tela inicial&quot;</span>.
              </Step>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShow(false)}
          className="mt-4 w-full rounded-[10px] py-3 text-[10px] font-semibold uppercase tracking-[0.2em] transition-opacity active:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #F5D061 0%, #D4A843 55%, #B8902F 100%)',
            boxShadow: '0 3px 10px rgba(212, 168, 67,0.35)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          Entendi
        </button>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
      <div
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
        style={{
          background: 'var(--mobile-card-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--mobile-card-border)',
        }}
      >
        {n}
      </div>
      <p>{children}</p>
    </div>
  );
}
