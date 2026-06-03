"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';
import {
  Barbell,
  ForkKnife,
  Ruler,
  Camera,
  Handshake,
  Trophy,
  User,
  SignOut,
  List,
  X,
  Users,
  SquaresFour,
  ShieldWarning,
  Gear,
  AppleLogo,
  BookOpen,
  ChatCircle,
  ChartBar
} from '@phosphor-icons/react';

const menuItems = [
  { name: 'Dashboard', href: '/aluno/dashboard', icon: SquaresFour },
  { name: 'Treinos', href: '/aluno/treinos', icon: Barbell },
  { name: 'Plano Alimentar', href: '/aluno/plano-alimentar', icon: ForkKnife },
  { name: 'Medidas', href: '/aluno/medidas', icon: Ruler },
  { name: 'Fotos', href: '/aluno/fotos', icon: Camera },
  { name: 'Ranking', href: '/aluno/ranking', icon: Trophy },
  { name: 'Perfil', href: '/aluno/perfil', icon: User },
];

const coachMenuItems = [
  { name: 'Painel Alunos', href: '/admin/alunos', icon: Users },
  { name: 'Biblioteca', href: '/admin/biblioteca-exercicios', icon: BookOpen },
  { name: 'Treinos Gerais', href: '/admin/treinos', icon: Barbell },
  { name: 'Nutrição', href: '/admin/nutricao', icon: AppleLogo },
  { name: 'Feedbacks', href: '/admin/feedbacks', icon: ChatCircle },
  { name: 'Parceiros', href: '/admin/parceiros', icon: Handshake },
  { name: 'Ranking Geral', href: '/admin/ranking', icon: Trophy },
  { name: 'Relatórios', href: '/admin/relatorios', icon: ChartBar },
  { name: 'Meu Perfil', href: '/admin/perfil', icon: User },
];

const superAdminMenuItems = [
  { name: 'Master Control', href: '/super-admin', icon: ShieldWarning },
  { name: 'Perfil Master', href: '/super-admin/perfil', icon: Gear },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { userRole, loading, user } = useAuth();
  const pathname = usePathname();
  
  console.log('[Sidebar] Rendered with role:', userRole, 'loading:', loading, 'user:', user?.id);

  // Ocultar em rotas públicas ou enquanto carrega
  if (pathname === '/login' || pathname === '/' || loading) {
    return null;
  }

  // Se não há usuário autenticado, não renderizar
  if (!user) {
    return null;
  }

  const currentMenuItems = userRole === 'aluno' ? menuItems : userRole === 'coach' ? coachMenuItems : superAdminMenuItems;

  return (
    <>
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-20 bg-bg-base border-r border-border-subtle flex-col py-8 items-center z-60 shadow-2xl">
        <Link href={userRole === 'aluno' ? '/aluno/dashboard' : userRole === 'coach' ? '/admin/alunos' : '/super-admin'} className="mb-10 group cursor-pointer">
          <div className="w-14 h-14 bg-surface-1 rounded-lg flex items-center justify-center shadow-xl border border-border-subtle group-hover:border-brand/40 group-hover:scale-105 transition-all overflow-hidden">
            <Image src="/logo.png" alt="Coach Vinny" width={44} height={44} className="object-contain" />
          </div>
        </Link>

        <nav className="flex flex-col gap-3 flex-1">
           {currentMenuItems.map((m) => {
              const Icon = m.icon;
              const isActive = pathname === m.href;
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  title={m.name}
                  className={`w-14 h-14 rounded-lg flex items-center justify-center transition-all group relative ${
                    isActive ? 'text-brand' : 'text-text-disabled hover:text-brand/60 hover:bg-brand/5'
                  }`}
                >
                   {isActive && <div className="absolute left-0 w-1 h-6 bg-brand rounded-r-full" />}
                   <Icon size={22} weight={isActive ? 'fill' : 'regular'} className={`${!isActive && 'group-hover:scale-110'} transition-transform`} />
                   {!isActive && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-surface-1/95 backdrop-blur-xl text-text-primary text-[10px] uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 border border-border-subtle pointer-events-none transition-all whitespace-nowrap z-100 shadow-2xl">
                        {m.name}
                      </div>
                   )}
                </Link>
              );
           })}
        </nav>

        <button
          onClick={async () => {
            try { await supabaseClient.auth.signOut({ scope: 'local' }); } catch {}
            localStorage.clear();
            window.location.href = '/login';
          }}
          className="mt-4 w-14 h-14 rounded-lg flex items-center justify-center text-text-disabled hover:text-brand hover:bg-brand/10 transition-all group"
          title="Sair"
        >
           <SignOut size={22} />
        </button>
      </aside>

      {/* Hamburger button - Mobile Only - DISABLED (using bottom nav instead) */}
      <button
        aria-label="Menu"
        onClick={() => setOpen(true)}
        className="hidden"
      >
        <List size={22} className="text-brand" />
      </button>

      {/* Drawer Overlay - Mobile Only */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-500 ${open ? 'opacity-100 pointer-events-auto backdrop-blur-md' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/80" />
      </div>

      {/* Drawer Menu - Mobile Only */}
      <aside className={`fixed left-0 top-0 h-full w-[75%] max-w-[280px] bg-bg-base shadow-[20px_0_60px_rgba(0,0,0,0.4)] z-50 transform transition-transform duration-500 ease-out border-r border-border-subtle ${open ? 'translate-x-0' : '-translate-x-full'} lg:hidden`}>
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="w-11 h-11 bg-surface-1 rounded-lg flex items-center justify-center shadow-lg border border-border-subtle overflow-hidden">
            <Image src="/logo.png" alt="Coach Vinny" width={36} height={36} className="object-contain" />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 flex items-center justify-center bg-surface-1 text-text-secondary hover:text-brand rounded-lg transition-all"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 mt-3 mb-6">
           <div className="p-4 bg-surface-1 rounded-lg border border-border-subtle flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center border border-border-subtle">
                 <User size={15} className="text-brand" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[8px] text-text-disabled uppercase tracking-widest leading-none mb-1">Acesso</span>
                 <span className="text-[9px] text-text-primary uppercase tracking-wide">
                    {userRole?.replace('_', ' ') || 'Carregando...'}
                 </span>
              </div>
           </div>
        </div>

        <nav className="px-4 flex flex-col gap-1.5 overflow-y-auto max-h-[60vh]">
          {currentMenuItems.map((m) => {
            const Icon = m.icon;
            const isActive = pathname === m.href;
            return (
              <Link
                key={m.href}
                href={m.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-[10px] uppercase tracking-widest transition-all group ${
                  isActive ? 'bg-brand text-black shadow-lg shadow-brand/20' : 'text-text-secondary hover:text-brand hover:bg-brand/5'
                }`}
                onClick={() => setOpen(false)}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm border ${
                  isActive ? 'bg-brand/20 border-brand/30' : 'bg-surface-2 border-border-subtle'
                }`}>
                  <Icon size={16} weight={isActive ? 'fill' : 'regular'} />
                </div>
                {m.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-8 left-0 right-0 px-5">
            <button
              onClick={async () => {
                await supabaseClient.auth.signOut();
                window.location.href = '/login';
              }}
              className="w-full h-12 bg-danger text-white rounded-lg flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest hover:bg-danger/80 transition-all active:scale-95 shadow-lg shadow-danger/20"
            >
              <SignOut size={16} />
              Sair
            </button>
        </div>
      </aside>
    </>
  );
}
