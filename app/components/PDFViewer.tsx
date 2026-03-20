"use client";

import React, { useState, useEffect } from "react";
import { X, ExternalLink, FileText, ArrowLeft, Smartphone } from "lucide-react";

interface PDFViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function PDFViewer({ url, title, onClose }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(mobile);
    // Em mobile, abrir direto no leitor nativo do dispositivo
    if (mobile) {
      window.open(url, '_blank');
    }
  }, [url]);

  // Iframe apenas para desktop — no desktop os parâmetros de zoom funcionam
  const pdfUrl = `${url}#toolbar=0&navpanes=0&view=Fit&zoom=page-fit`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/95 backdrop-blur-sm">
      <div className="relative w-full h-full bg-[#0a0a0a] rounded-3xl border border-[#D4AF37]/20 shadow-[0_0_50px_rgba(212,175,55,0.1)] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5 bg-black/40 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={onClose}
              className="lg:hidden p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-9 h-9 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-[#D4AF37] shrink-0">
              <FileText size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm md:text-base font-black text-white uppercase tracking-tight leading-none truncate">
                {title}
              </h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Protocolo Oficial</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink size={18} />
            </a>
            <button
              onClick={onClose}
              className="hidden lg:flex ml-2 p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-xl text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-zinc-950 overflow-auto flex justify-center items-center">

          {/* Mobile: tela de confirmação (PDF já abriu no app nativo) */}
          {isMobile ? (
            <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
              <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center">
                <Smartphone size={32} className="text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-white font-black uppercase tracking-widest text-sm mb-2">PDF Aberto</p>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  O protocolo foi aberto no leitor do seu dispositivo.
                </p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-[#D4AF37] text-black font-black uppercase tracking-widest text-xs rounded-xl"
              >
                Abrir novamente
              </a>
              <button onClick={onClose} className="text-zinc-600 text-xs uppercase tracking-widest font-bold">
                Fechar
              </button>
            </div>
          ) : (
            /* Desktop: iframe normal */
            <>
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-zinc-950">
                  <div className="w-10 h-10 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Carregando Documento...</p>
                </div>
              )}
              <iframe
                src={pdfUrl}
                className="border-none"
                style={{ width: '100%', maxWidth: '960px', height: '100%', minHeight: '400px' }}
                onLoad={() => setLoading(false)}
                title={title}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0">
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
            Exibição segura • Coach Vinny Protocol
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest hover:underline"
          >
            Abrir completo ↗
          </a>
        </div>
      </div>
    </div>
  );
}
