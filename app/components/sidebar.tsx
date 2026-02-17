"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

const coachMenuItems = [
  { name: 'Dashboard de Alunos', href: '/admin/dashboard' },
  { name: 'Configurar Parceiros', href: '/admin/parceiros/new' },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !authData.user) {
          setLoading(false);
          return;
        }

        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        if (!profileError && profileData) {
          setUserRole(profileData.role);
        }
      } catch (error) {
        console.error('Erro ao buscar role do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  return (
    <>
      {/* Hamburger button */}
      <button
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
        className="fixed top-5 left-5 z-50 w-10 h-10 rounded-full flex items-center justify-center bg-black/60 border border-white/10 hover:bg-black/80 transition-colors lg:hidden"
      >
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect y="1" width="20" height="2" rx="1" fill="#D4AF37" />
          <rect y="6" width="20" height="2" rx="1" fill="#D4AF37" />
          <rect y="11" width="20" height="2" rx="1" fill="#D4AF37" />
        </svg>
      </button>

      {/* Drawer Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} lg:hidden`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      </div>

      {/* Drawer Menu */}
      <aside className={`fixed left-0 top-0 h-full w-[80%] max-w-xs bg-coach-black text-white z-50 transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:hidden`}>
        {/* Close button (X icon) */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center text-coach-gold hover:text-coach-gold/80 transition-colors"
          aria-label="Fechar menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Menu content */}
        <nav className="p-6 pt-16 flex flex-col gap-6">
          {menuItems.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="uppercase tracking-widest text-sm text-gray-200 hover:text-coach-gold transition-colors"
              onClick={() => setOpen(false)}
            >
              {m.name}
            </Link>
          ))}

          {/* Seção GESTÃO para Coaches */}
          {userRole === 'coach' && (
            <div className="pt-6 border-t border-white/10">
              <div className="mb-4">
                <p className="uppercase tracking-widest text-xs font-semibold text-coach-gold">Gestão</p>
              </div>
              <div className="flex flex-col gap-4">
                {coachMenuItems.map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    className="uppercase tracking-widest text-sm text-gray-200 hover:text-coach-gold transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    {m.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}