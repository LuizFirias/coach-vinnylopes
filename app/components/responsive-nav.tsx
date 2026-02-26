"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from 'next/navigation';
import Link from "next/link";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  Menu,
  X,
  Dumbbell,
  Utensils,
  TrendingUp,
  Camera,
  Users,
  Trophy,
  BarChart3,
  Handshake,
  User,
  ShieldCheck,
} from "lucide-react";

const menuItems = [
  { name: "TREINOS", href: "/aluno/treinos", icon: Dumbbell },
  { name: "PLANO ALIMENTAR", href: "/aluno/plano-alimentar", icon: Utensils },
  { name: "MEDIDAS", href: "/aluno/medidas", icon: TrendingUp },
  { name: "FOTOS", href: "/aluno/fotos", icon: Camera },
  { name: "PARCEIROS", href: "/aluno/parceiros", icon: Users },
  { name: "RANKING", href: "/aluno/ranking", icon: Trophy },
  { name: "PERFIL", href: "/aluno/perfil", icon: User },
];

const coachMenuItems = [
  { name: "ALUNOS", href: "/admin/alunos", icon: Users },
  { name: "TREINOS", href: "/admin/treinos", icon: Dumbbell },
  { name: "PARCEIROS", href: "/admin/parceiros", icon: Handshake },
  { name: "RANKING", href: "/admin/ranking", icon: Trophy },
  { name: "PERFIL", href: "/admin/perfil", icon: User },
];

const superAdminMenuItems = [
  { name: "GERENCIAR ACESSOS", href: "/super-admin", icon: ShieldCheck },
  { name: "PERFIL", href: "/super-admin/perfil", icon: User },
];

export default function ResponsiveNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        const { data: profileData, error } = await supabaseClient
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single();

        if (!error && profileData) {
          setUserRole(profileData.role);
          setUserName(profileData.full_name || user.email?.split('@')[0] || 'Usuário');
        }
      } catch (err) {
        console.error('Erro ao buscar role do usuario:', err);
      }
    };

    fetchRole();
  }, []);

  const effectiveMenuItems = 
    userRole === 'super_admin' ? superAdminMenuItems : 
    userRole === 'coach' ? coachMenuItems : 
    menuItems;

  // Hide the nav entirely on the login page
  if (pathname === '/login') return null;

  return (
    <>
      {/* Mobile Header (hidden on desktop) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 z-50 bg-iron-black/80 backdrop-blur-xl border-b border-white/[0.03] px-4">
        <div className="flex items-center justify-between h-full">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.05] active:scale-95 transition-all"
          >
            <Menu size={20} className="text-zinc-400" />
          </button>
          <div className="flex-1 flex justify-center items-center">
            {!logoFailed ? (
                <Image
                  src="/logo.png"
                  alt="Coach Logo"
                  width={120}
                  height={35}
                  priority
                  onError={() => setLogoFailed(true)}
                  style={{ height: 'auto' }}
                  className="w-24 object-contain"
                />
            ) : (
              <h1 className="text-[11px] font-bold tracking-widest text-white text-center">
                VINNY LOPES <span className="text-iron-gold">COACH</span>
              </h1>
            )}
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-20 bg-iron-black border-r border-white-[0.03] flex-col z-40 items-center">
        {/* Sidebar Header */}
        <div className="py-10 flex flex-col items-center">
          <div className="w-10 h-10 bg-iron-gold rounded-lg flex items-center justify-center shadow-lg shadow-iron-gold/5 group cursor-pointer">
            <span className="text-black font-black text-xs">CV</span>
          </div>
        </div>

        {/* Sidebar Menu */}
        <nav className="flex-1 w-full px-3 py-4 flex flex-col gap-4">
          {effectiveMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.name}
                className={`group flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? "bg-white/[0.05] text-iron-gold" 
                    : "text-zinc-600 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={isActive ? "text-iron-gold" : "text-zinc-600 group-hover:text-zinc-300"}
                />
                <span className="text-[8px] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.name.split(' ')[0]}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="py-8 w-full px-3 border-t border-white-[0.03] flex flex-col items-center gap-4">
          <button
            onClick={async () => {
              await supabaseClient.auth.signOut();
              window.location.href = '/login';
            }}
            title="Sair"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-600 hover:text-iron-red hover:bg-iron-red/10 transition-all"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileMenuOpen}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      </div>

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-screen w-72 bg-iron-black border-r border-white-[0.03] z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-white-[0.03]">
          <h2 className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
            NAVEGAÇÃO
          </h2>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Menu */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1 overflow-y-auto">
          {effectiveMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? "bg-white/[0.05] text-iron-gold" 
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={isActive ? "text-iron-gold" : "text-zinc-500 group-hover:text-zinc-300"}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Botão Sair Mobile */}
          <div className="mt-auto px-2 pb-6">
            <button
              onClick={async () => {
                await supabaseClient.auth.signOut();
                window.location.href = '/login';
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-medium text-zinc-500 border border-white-[0.05]"
            >
              <X size={14} />
              SAIR DA CONTA
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
