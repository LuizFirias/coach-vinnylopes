"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';
import { cn } from '@/lib/utils/cn';
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
  ChartBar,
  CaretLeft,
  CaretRight
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
  { name: 'Dashboard', href: '/admin/dashboard', icon: SquaresFour },
  { name: 'Alunos', href: '/admin/alunos', icon: Users },
  { name: 'Treinos', href: '/admin/treinos', icon: Barbell },
  { name: 'Nutrição', href: '/admin/nutricao', icon: AppleLogo },
  { name: 'Financeiro', href: '/admin/relatorios', icon: ChartBar },
  { name: 'Biblioteca', href: '/admin/biblioteca-exercicios', icon: BookOpen },
  { name: 'Parceiros', href: '/admin/parceiros', icon: Handshake },
  { name: 'Feedbacks', href: '/admin/feedbacks', icon: ChatCircle },
  { name: 'Ranking', href: '/admin/ranking', icon: Trophy },
  { name: 'Perfil', href: '/admin/perfil', icon: User },
];

const superAdminMenuItems = [
  { name: 'Master Control', href: '/super-admin', icon: ShieldWarning },
  { name: 'Perfil Master', href: '/super-admin/perfil', icon: Gear },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { userRole, loading, user } = useAuth();
  const pathname = usePathname();

  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    const expanded = saved !== 'false';
    setIsExpanded(expanded);
    document.documentElement.style.setProperty('--sidebar-width', expanded ? '240px' : '80px');
  }, []);

  const toggleSidebar = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem('sidebar-expanded', String(next));
    document.documentElement.style.setProperty('--sidebar-width', next ? '240px' : '80px');
  };

  console.log('[Sidebar] Rendered with role:', userRole, 'loading:', loading, 'user:', user?.id);

  // Ocultar em rotas públicas ou enquanto carrega
  if (pathname === '/login' || pathname === '/' || loading) {
    return null;
  }

  // Se não há usuário autenticado, não renderizar
  if (!user) {
    return null;
  }

  const currentMenuItems = 
    userRole === 'aluno' 
      ? menuItems 
      : userRole === 'super_admin'
        ? [
            ...coachMenuItems.filter(item => item.name !== 'Perfil'),
            { name: 'Master Control', href: '/super-admin', icon: ShieldWarning },
            { name: 'Perfil Master', href: '/super-admin/perfil', icon: Gear },
          ]
        : coachMenuItems;

  return (
    <>
      {/* Sidebar for Desktop */}
      <aside
        style={{ width: isExpanded ? '240px' : '80px' }}
        className="hidden lg:flex fixed left-0 top-0 h-full bg-surface-1 border-r border-border-subtle flex-col py-5 px-3 items-stretch z-60 shadow-2xl transition-[width] duration-300"
      >
        <div className="flex flex-col items-center gap-3 mb-5 px-2 relative">
          <Link href={userRole === 'aluno' ? '/aluno/dashboard' : '/admin/dashboard'} className="flex items-center justify-center group cursor-pointer">
            <Image 
              src="/logo.png" 
              alt="Auronfit" 
              width={isExpanded ? 48 : 40} 
              height={isExpanded ? 48 : 40} 
              className={cn(
                "object-contain group-hover:scale-105 transition-transform",
                isExpanded ? "w-12 h-12" : "w-10 h-10"
              )} 
            />
          </Link>
          
          <button
            onClick={toggleSidebar}
            className={cn(
              "w-7 h-7 rounded-lg border border-border-subtle bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-text-secondary hover:text-brand transition-colors shrink-0",
              isExpanded ? "absolute right-2 top-1/2 -translate-y-1/2" : "mt-0.5"
            )}
            title={isExpanded ? "Recolher menu" : "Expandir menu"}
          >
            {isExpanded ? <CaretLeft size={15} /> : <CaretRight size={15} />}
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
           {currentMenuItems.map((m) => {
              const Icon = m.icon;
              const isActive = pathname === m.href;
              const isPerfil = m.name === 'Perfil' || m.name === 'Perfil Master';
              return (
                <div key={m.href} className="flex flex-col gap-1 shrink-0">
                  {isPerfil && (
                    <div className="border-t border-border-subtle my-1.5 mx-2" />
                  )}
                  <Link
                    href={m.href}
                    title={!isExpanded ? m.name : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 h-10 transition-all group relative",
                      isActive
                        ? "bg-brand/12 text-text-primary font-medium border-l-2 border-brand rounded-r-lg rounded-l-none"
                        : "text-text-disabled hover:text-brand hover:bg-brand/5 rounded-lg",
                      isExpanded ? "justify-start" : "justify-center"
                    )}
                  >
                     {isActive && !isExpanded && <div className="absolute left-0 w-1 h-5 bg-brand rounded-r-full" />}
                     <Icon size={16} weight={isActive ? 'fill' : 'regular'} className={cn(!isActive && 'group-hover:scale-105 transition-transform shrink-0')} />
                     
                     {isExpanded && (
                       <span className="text-xs font-medium tracking-wide truncate">
                         {m.name}
                       </span>
                     )}
                     
                     {!isExpanded && (
                        <div className="absolute left-full ml-4 px-2 py-1 bg-surface-1/95 backdrop-blur-xl text-text-primary text-[10px] tracking-wider rounded border border-border-subtle pointer-events-none opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-100 shadow-xl">
                          {m.name}
                        </div>
                     )}
                  </Link>
                </div>
              );
           })}
        </nav>

        <div className="mt-auto border-t border-border-subtle pt-4 flex flex-col gap-2 shrink-0">
          {isExpanded && user && (
            <div className="flex flex-col min-w-0 px-2 py-1">
              <span className="text-[9px] font-semibold text-text-tertiary uppercase tracking-[0.06em] mb-1">
                Acesso
              </span>
              <span className="text-[11px] font-bold text-text-primary uppercase tracking-wide truncate">
                {userRole?.replace('_', ' ') || 'Aluno'}
              </span>
            </div>
          )}
          
          <button
            onClick={async () => {
              try { await supabaseClient.auth.signOut({ scope: 'local' }); } catch {}
              localStorage.clear();
              window.location.href = '/login';
            }}
            className={`w-full h-10 rounded-lg flex items-center gap-3 text-text-disabled hover:text-danger hover:bg-danger/10 transition-all group ${isExpanded ? 'px-3.5 justify-start' : 'justify-center'}`}
            title="Sair"
          >
             <SignOut size={16} className="shrink-0" />
             {isExpanded && (
                <span className="text-xs font-semibold tracking-wide">Sair</span>
             )}
          </button>
        </div>
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
            <Image src="/logo.png" alt="Auronfit" width={36} height={36} className="object-contain" />
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
