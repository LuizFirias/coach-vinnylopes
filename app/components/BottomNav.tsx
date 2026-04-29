"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Dumbbell, Apple, User, Users, Ruler, Camera, Trophy, BookOpen, BarChart3, Handshake, MessageSquare } from 'lucide-react';
import { useAuth } from './AuthProvider';

export default function BottomNav() {
  const pathname = usePathname();
  const { userRole, loading } = useAuth();
  
  console.log('[BottomNav] Rendered with role:', userRole, 'loading:', loading);

  // Don't render on login page or while loading
  if (pathname === '/login' || pathname === '/' || loading) {
    return null;
  }

  // Student navigation items (7 sections)
  const studentNavItems = [
    { 
      name: 'Início', 
      href: '/aluno/dashboard', 
      icon: Home,
      isActive: pathname === '/aluno/dashboard' || pathname?.startsWith('/aluno/dashboard')
    },
    { 
      name: 'Treinos', 
      href: '/aluno/treinos', 
      icon: Dumbbell,
      isActive: pathname?.startsWith('/aluno/treinos')
    },
    { 
      name: 'Nutrição', 
      href: '/aluno/plano-alimentar', 
      icon: Apple,
      isActive: pathname?.startsWith('/aluno/plano-alimentar')
    },
    { 
      name: 'Medidas', 
      href: '/aluno/medidas', 
      icon: Ruler,
      isActive: pathname?.startsWith('/aluno/medidas')
    },
    { 
      name: 'Fotos', 
      href: '/aluno/fotos', 
      icon: Camera,
      isActive: pathname?.startsWith('/aluno/fotos')
    },
    { 
      name: 'Ranking', 
      href: '/aluno/ranking', 
      icon: Trophy,
      isActive: pathname?.startsWith('/aluno/ranking')
    },
    { 
      name: 'Perfil', 
      href: '/aluno/perfil', 
      icon: User,
      isActive: pathname?.startsWith('/aluno/perfil')
    },
  ];

  // Coach navigation items (9 sections)
  const coachNavItems = [
    { 
      name: 'Alunos', 
      href: '/admin/alunos', 
      icon: Users,
      isActive: pathname?.startsWith('/admin/alunos') || pathname?.startsWith('/admin/aluno/')
    },
    { 
      name: 'Treinos', 
      href: '/admin/treinos', 
      icon: Dumbbell,
      isActive: pathname?.startsWith('/admin/treinos')
    },
    { 
      name: 'Nutrição', 
      href: '/admin/nutricao', 
      icon: Apple,
      isActive: pathname?.startsWith('/admin/nutricao')
    },
    { 
      name: 'Feedbacks', 
      href: '/admin/feedbacks', 
      icon: MessageSquare,
      isActive: pathname?.startsWith('/admin/feedbacks')
    },
    { 
      name: 'Biblioteca', 
      href: '/admin/biblioteca-exercicios', 
      icon: BookOpen,
      isActive: pathname?.startsWith('/admin/biblioteca-exercicios')
    },
    { 
      name: 'Parceiros', 
      href: '/admin/parceiros', 
      icon: Handshake,
      isActive: pathname?.startsWith('/admin/parceiros')
    },
    { 
      name: 'Relatórios', 
      href: '/admin/relatorios', 
      icon: BarChart3,
      isActive: pathname?.startsWith('/admin/relatorios')
    },
    { 
      name: 'Ranking', 
      href: '/admin/ranking', 
      icon: Trophy,
      isActive: pathname?.startsWith('/admin/ranking')
    },
    { 
      name: 'Perfil', 
      href: '/admin/perfil', 
      icon: User,
      isActive: pathname?.startsWith('/admin/perfil')
    },
  ];

  const navItems = userRole === 'coach' || userRole === 'super_admin' ? coachNavItems : studentNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-bg-base/95 backdrop-blur-xl border-t border-border-subtle safe-area-inset-bottom">
      {/* Scrollable container with fade effect on edges */}
      <div className="relative">
        {/* Left fade gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-bg-base/95 to-transparent z-10 pointer-events-none" />
        
        {/* Right fade gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-bg-base/95 to-transparent z-10 pointer-events-none" />
        
        {/* Scrollable items */}
        <div className="flex items-center h-16 px-2 overflow-x-auto scrollbar-hide gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-17.5 h-full px-2 transition-colors ${
                item.isActive
                  ? 'text-gold-light'
                  : 'text-text-secondary hover:text-gold-light'
              }`}
            >
              <item.icon size={20} strokeWidth={item.isActive ? 2.5 : 2} />
              <span className="text-[8px] mt-1 uppercase tracking-widest font-medium text-center leading-tight">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
