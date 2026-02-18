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
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4">
        <div className="flex items-center justify-between h-full">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 border border-slate-100 hover:bg-brand-purple/5 transition-colors"
          >
            <Menu size={20} className="text-brand-purple" />
          </button>
          <div className="flex-1 flex justify-center items-center max-h-10">
            {!logoFailed ? (
                <Image
                  src="/logo.png"
                  alt="Coach Logo"
                  width={140}
                  height={40}
                  priority
                  onError={() => setLogoFailed(true)}
                  style={{ height: 'auto' }}
                  className="w-28 sm:w-32 h-10 object-contain brightness-0"
                />
            ) : (
              <h1 className="text-[11px] leading-none font-bold tracking-widest uppercase text-slate-900 text-center z-50">
                VINNY LOPES COACH
              </h1>
            )}
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-100 flex-col z-40">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-100">
          {!logoFailed ? (
            <Image
              src="/logo.png"
              alt="Coach Logo"
              width={220}
              height={70}
              priority
              onError={() => setLogoFailed(true)}
              style={{ height: 'auto' }}
              className="w-52 mx-auto brightness-0"
            />
          ) : (
            <div>
              <h1 className="text-sm font-bold tracking-[0.15em] uppercase text-slate-900">
                VINNY LOPES
              </h1>
              <p className="text-xs tracking-widest uppercase text-slate-400 mt-1">
                COACH
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Menu */}
        <nav className="flex-1 px-4 py-8 flex flex-col gap-2">
          {effectiveMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium tracking-tight transition-all duration-200 ${
                  isActive 
                    ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20" 
                    : "text-slate-600 hover:text-brand-purple hover:bg-brand-purple/5"
                }`}
              >
                <Icon
                  size={18}
                  className={`${isActive ? "text-white" : "text-slate-400 group-hover:text-brand-purple"} transition-colors`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer com Nome e Botão Sair */}
        <div className="p-4 border-t border-slate-100">
          {userName && (
            <div className="mb-3 px-2">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Olá,</p>
              <p className="text-sm text-slate-900 font-bold truncate">{userName}</p>
            </div>
          )}
          <button
            onClick={async () => {
              await supabaseClient.auth.signOut();
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider text-red-500 hover:text-white hover:bg-red-500 transition-all duration-200 border border-red-100 hover:border-red-500"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6M10.6667 11.3333L14 8M14 8L10.6667 4.66667M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            SAIR
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
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      </div>

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-screen w-80 bg-white border-r border-slate-100 z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-slate-400">
            MENU
          </h2>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-brand-purple hover:bg-brand-purple/5 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Drawer Logo */}
        <div className="px-6 py-8 border-b border-slate-100 flex-shrink-0 flex items-center justify-center">
          {!logoFailed ? (
            <Image
              src="/logo.png"
              alt="Coach Logo"
              width={180}
              height={60}
              priority
              onError={() => setLogoFailed(true)}
              style={{ height: 'auto' }}
              className="w-44 brightness-0"
            />
          ) : (
            <div className="text-center">
              <h1 className="text-sm font-bold tracking-[0.15em] uppercase text-slate-900">
                VINNY LOPES
              </h1>
              <p className="text-xs tracking-widest uppercase text-slate-400 mt-1">
                COACH
              </p>
            </div>
          )}
        </div>

        {/* Drawer Menu */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-2 overflow-y-auto">
          {effectiveMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium tracking-tight transition-all duration-200 ${
                  isActive 
                    ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20" 
                    : "text-slate-600 hover:text-brand-purple hover:bg-brand-purple/5"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon
                  size={20}
                  className={`${isActive ? "text-white" : "text-slate-400 group-hover:text-brand-purple"} transition-colors`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Botão Sair Mobile */}
          <div className="pt-6 mt-auto border-t border-slate-100">
            {userName && (
              <div className="mb-4 px-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Olá,</p>
                <p className="text-sm text-slate-900 font-bold truncate">{userName}</p>
              </div>
            )}
            <button
              onClick={async () => {
                await supabaseClient.auth.signOut();
                window.location.href = '/login';
              }}
              className="w-full flex items-center justify-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold uppercase tracking-wider text-red-500 bg-red-50 hover:bg-red-500 hover:text-white transition-all duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6M10.6667 11.3333L14 8M14 8L10.6667 4.66667M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              SAIR DA CONTA
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
