"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, LogOut } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';

const menuItems = [
  { name: 'TREINOS', href: '/aluno/treinos' },
  { name: 'PLANO ALIMENTAR', href: '/aluno/plano-alimentar' },
  { name: 'MEDIDAS', href: '/aluno/medidas' },
  { name: 'FOTOS', href: '/aluno/fotos' },
  { name: 'PARCEIROS', href: '/aluno/parceiros' },
  { name: 'RANKING', href: '/aluno/ranking' },
  { name: 'PERFIL', href: '/aluno/perfil' },
];

export default function Navigation() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Fixed Header - Modern Premium Style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100/50 py-5">
        <div className="px-6 sm:px-10 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
             {/* Hamburger button */}
            <button
              aria-label="Abrir menu"
              onClick={() => setOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100 hover:bg-brand-purple/5 hover:border-brand-purple/20 transition-all duration-300 lg:hidden"
            >
              <Menu size={18} className="text-brand-purple" />
            </button>
            <h1 className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-900">
              VINNY LOPES <span className="text-brand-purple">COACH</span>
            </h1>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {menuItems.slice(0, 4).map((m) => (
              <Link 
                key={m.href} 
                href={m.href} 
                className="text-[9px] font-black tracking-[0.2em] text-slate-400 hover:text-brand-purple transition-all"
              >
                {m.name}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Drawer Overlay */}
      <div
        className={`fixed inset-0 z-60 transition-all duration-500 ${open ? 'opacity-100 pointer-events-auto backdrop-blur-md' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-slate-900/10" />
      </div>

      {/* Drawer Menu */}
      <aside className={`fixed left-0 top-0 h-screen w-[85%] max-w-sm bg-white border-r border-slate-50 shadow-2xl z-70 transform transition-transform duration-500 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Close button (X icon) */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-50">
          <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-400">Navegação</h2>
          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-brand-purple rounded-xl transition-all"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu content */}
        <nav className="px-6 py-10 flex flex-col gap-4">
          {menuItems.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-brand-purple hover:bg-brand-purple/5 transition-all"
              onClick={() => setOpen(false)}
            >
              {m.name}
            </Link>
          ))}

          {/* Botão Sair */}
          <button
            onClick={async () => {
              await supabaseClient.auth.signOut();
              window.location.href = '/login';
            }}
            className="flex items-center gap-3 px-6 py-5 mt-10 rounded-2xl bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-red-100 transition-all"
          >
            <LogOut size={16} />
            Sair da Plataforma
          </button>
        </nav>
      </aside>
    </>
  );
}
