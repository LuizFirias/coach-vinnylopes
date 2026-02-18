"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { 
  Dumbbell, 
  Utensils, 
  Ruler, 
  Camera, 
  Handshake, 
  Trophy, 
  User, 
  LogOut, 
  Menu, 
  X,
  Users,
  LayoutDashboard,
  ShieldAlert,
  Settings
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', href: '/aluno/dashboard', icon: LayoutDashboard },
  { name: 'Treinos', href: '/aluno/treinos', icon: Dumbbell },
  { name: 'Plano Alimentar', href: '/aluno/plano-alimentar', icon: Utensils },
  { name: 'Medidas', href: '/aluno/medidas', icon: Ruler },
  { name: 'Fotos', href: '/aluno/fotos', icon: Camera },
  { name: 'Ranking', href: '/aluno/ranking', icon: Trophy },
  { name: 'Perfil', href: '/aluno/perfil', icon: User },
];

const coachMenuItems = [
  { name: 'Painel Alunos', href: '/admin/alunos', icon: Users },
  { name: 'Treinos Gerais', href: '/admin/treinos', icon: Dumbbell },
  { name: 'Parceiros', href: '/admin/parceiros', icon: Handshake },
  { name: 'Ranking Geral', href: '/admin/ranking', icon: Trophy },
  { name: 'Meu Perfil', href: '/admin/perfil', icon: User },
];

const superAdminMenuItems = [
  { name: 'Master Control', href: '/super-admin', icon: ShieldAlert },
  { name: 'Perfil Master', href: '/super-admin/perfil', icon: Settings },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

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
    
    // Revalidar role quando a rota mudar
    const interval = setInterval(fetchUserRole, 2000);
    return () => clearInterval(interval);
  }, [pathname]);

  // Ocultar em rotas de login ou se não estiver logado
  if (pathname === '/login' || pathname === '/') return null;

  const currentMenuItems = userRole === 'aluno' ? menuItems : userRole === 'coach' ? coachMenuItems : superAdminMenuItems;

  return (
    <>
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-20 bg-iron-black border-r border-white/5 flex-col py-8 items-center z-60 shadow-2xl">
        <Link href={userRole === 'aluno' ? '/aluno/dashboard' : userRole === 'coach' ? '/admin/alunos' : '/super-admin'} className="mb-10 group cursor-pointer">
          <div className="w-14 h-14 bg-iron-gray rounded-2xl flex items-center justify-center shadow-xl border border-white/5 group-hover:border-iron-red/30 group-hover:scale-105 transition-all overflow-hidden">
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
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group relative ${
                    isActive ? 'bg-iron-red text-white shadow-lg shadow-iron-red/20' : 'text-zinc-500 hover:text-iron-red hover:bg-white/5'
                  }`}
                >
                   <Icon size={22} className={`${!isActive && 'group-hover:scale-110'} transition-transform`} />
                   {!isActive && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-iron-gray/95 backdrop-blur-xl text-white text-[10px] font-bold uppercase tracking-wider rounded-xl opacity-0 group-hover:opacity-100 border border-white/10 pointer-events-none transition-all whitespace-nowrap z-100 shadow-2xl">
                        {m.name}
                      </div>
                   )}
                </Link>
              );
           })}
        </nav>

        <button
          onClick={async () => {
             await supabaseClient.auth.signOut();
             window.location.href = '/login';
          }}
          className="mt-4 w-14 h-14 rounded-2xl flex items-center justify-center text-zinc-600 hover:text-iron-red hover:bg-iron-red/10 transition-all group"
          title="Sair"
        >
           <LogOut size={22} />
        </button>
      </aside>

      {/* Hamburger button - Mobile Only */}
      <button
        aria-label="Menu"
        onClick={() => setOpen(true)}
        className="fixed top-6 left-6 z-50 w-12 h-12 rounded-2xl flex items-center justify-center bg-iron-black shadow-2xl border border-white/10 hover:border-iron-red/50 active:scale-95 transition-all lg:hidden"
      >
        <Menu size={22} className="text-iron-red" />
      </button>

      {/* Drawer Overlay - Mobile Only */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-500 ${open ? 'opacity-100 pointer-events-auto backdrop-blur-md' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Drawer Menu - Mobile Only */}
      <aside className={`fixed left-0 top-0 h-full w-[75%] max-w-[280px] bg-iron-black shadow-[20px_0_60px_rgba(0,0,0,0.4)] z-50 transform transition-transform duration-500 ease-out border-r border-white/5 ${open ? 'translate-x-0' : '-translate-x-full'} lg:hidden`}>
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="w-11 h-11 bg-iron-gray rounded-xl flex items-center justify-center shadow-lg border border-white/5 overflow-hidden">
            <Image src="/logo.png" alt="Coach Vinny" width={36} height={36} className="object-contain" />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 flex items-center justify-center bg-white/5 text-zinc-500 hover:text-iron-red rounded-xl transition-all"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 mt-3 mb-6">
           <div className="p-4 bg-iron-gray rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                 <User size={15} className="text-iron-red" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider leading-none mb-1">Acesso</span>
                 <span className="text-[9px] font-bold text-white uppercase tracking-wide">
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
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all group ${
                  isActive ? 'bg-iron-red text-white shadow-lg shadow-iron-red/20' : 'text-zinc-500 hover:text-iron-red hover:bg-white/5'
                }`}
                onClick={() => setOpen(false)}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm border ${
                  isActive ? 'bg-white/10 border-white/10' : 'bg-white/5 border-white/5'
                }`}>
                  <Icon size={16} />
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
              className="w-full h-12 bg-iron-red text-white rounded-2xl flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-wider hover:bg-red-600 transition-all active:scale-95 shadow-neon-red"
            >
              <LogOut size={16} />
              Sair
            </button>
        </div>
      </aside>
    </>
  );
}
