"use client";

import React, { useState } from "react";
import { X, ExternalLink, Download, Maximize2, FileText, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface PDFViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function PDFViewer({ url, title, onClose }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-5xl bg-[#0a0a0a] rounded-3xl border border-[#D4AF37]/20 shadow-[0_0_50px_rgba(212,175,55,0.1)] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/40">
          <div className="flex items-center gap-4 flex-1">
            {/* Back Button for Mobile */}
            <button 
              onClick={onClose}
              className="lg:hidden p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all transform hover:scale-105"
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-[#D4AF37]">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none mb-1 truncate">
                {title}
              </h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Protocolo de Treinamento Oficial</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink size={20} />
            </a>
            {/* X Button Hidden on Mobile */}
            <button 
              onClick={onClose}
              className="hidden lg:flex ml-4 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all transform hover:scale-105"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-zinc-900/50">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
              <div className="w-12 h-12 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Carregando Documento...</p>
            </div>
          )}
          
          <iframe
            src={`${url}#view=FitH`}
            className="w-full h-full border-none"
            onLoad={() => setLoading(false)}
            title={title}
          />
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 bg-black/40 flex justify-center">
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
                Exibição segura • Coach Vinny Protocol
            </p>
        </div>
      </div>
    </div>
  );
}
