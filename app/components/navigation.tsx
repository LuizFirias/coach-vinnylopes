"use client";

import React, { useState } from 'react';
import Link from 'next/link';

const menuItems = [
  { name: 'TREINOS', href: '/aluno/treinos' },
  { name: 'PLANO ALIMENTAR', href: '/aluno/plano-alimentar' },
  { name: 'MEDIDAS', href: '/aluno/medidas' },
  { name: 'FOTOS', href: '/aluno/fotos' },
  { name: 'PARCEIROS', href: '/aluno/parceiros' },
  { name: 'RANKING', href: '/aluno/ranking' },
];

export default function Navigation() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-coach-black/98 backdrop-blur-md border-b border-white/10 py-4">
        <div className="px-4 sm:px-6 md:px-8 flex items-center justify-center relative">
          {/* Hamburger button - left side */}
          <button
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            className="absolute left-4 sm:left-6 md:left-8 w-10 h-10 rounded-lg flex items-center justify-center bg-black/40 border border-white/20 hover:bg-coach-gold/10 transition-all duration-200"
          >
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect y="1" width="20" height="2" rx="1" fill="#D4AF37" />
              <rect y="6" width="20" height="2" rx="1" fill="#D4AF37" />
              <rect y="11" width="20" height="2" rx="1" fill="#D4AF37" />
            </svg>
          </button>

          {/* Brand name - center */}
          <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-[0.15em] uppercase text-white/95">
            VINNY LOPES COACH
          </h1>
        </div>
      </header>

      {/* Drawer Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      </div>

      {/* Drawer Menu */}
      <aside className={`fixed left-0 top-0 h-screen w-[85%] max-w-sm bg-coach-black/99 border-r border-white/10 text-white z-[45] transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Close button (X icon) */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
          <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-white/80">MENU</h2>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-coach-gold hover:text-coach-gold/60 transition-colors rounded-lg hover:bg-white/5"
            aria-label="Fechar menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Menu content */}
        <nav className="px-6 py-8 flex flex-col gap-8">
          {menuItems.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="uppercase tracking-[0.1em] text-sm font-medium text-gray-300 hover:text-coach-gold transition-colors duration-200"
              onClick={() => setOpen(false)}
            >
              {m.name}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
