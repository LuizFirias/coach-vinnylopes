"use client";

import { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

export default function PWAInstall() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Verificar se já está instalado (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Detectar plataforma
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    }

    // Mostrar após 3 segundos
    const timer = setTimeout(() => {
      const dismissed = localStorage.getItem('pwa-dismissed');
      if (!dismissed) setShow(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-slide-up">
      <div className="bg-iron-gray border border-iron-gold/30 rounded-4xl p-6 shadow-2xl shadow-black">
        <button 
          onClick={() => {
            setShow(false);
            localStorage.setItem('pwa-dismissed', 'true');
          }}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-iron-gold rounded-2xl flex items-center justify-center shadow-lg shadow-iron-gold/20">
            <Smartphone className="text-black" size={24} />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-wider text-sm">Instalar Aplicativo</h3>
            <p className="text-slate-500 text-xs">Acesse seu treino com um clique.</p>
          </div>
        </div>

        <div className="space-y-4 bg-black/40 rounded-2xl p-4 border border-white/5">
          {platform === 'ios' ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-[11px] text-slate-300">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
                <p>Toque no ícone de <span className="text-iron-gold font-bold">Compartilhar</span> na barra inferior.</p>
              </div>
              <div className="flex items-start gap-3 text-[11px] text-slate-300">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
                <p>Role para baixo e selecione <span className="text-iron-gold font-bold">"Adicionar à Tela de Início"</span>.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-[11px] text-slate-300">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
                <p>Toque nos <span className="text-iron-gold font-bold">três pontos (⋮)</span> no canto superior do navegador.</p>
              </div>
              <div className="flex items-start gap-3 text-[11px] text-slate-300">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
                <p>Selecione <span className="text-iron-gold font-bold">"Instalar aplicativo"</span> ou "Adicionar à tela inicial".</p>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => setShow(false)}
          className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
