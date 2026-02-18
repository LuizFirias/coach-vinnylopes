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
  { name: "RELATORIOS", href: "/admin/relatorios", icon: BarChart3 },
  { name: "PARCEIROS", href: "/admin/parceiros", icon: Handshake },
  { name: "RANKING", href: "/admin/ranking", icon: Trophy },
];

export default function ResponsiveNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user;
        if (!user) return;

        const { data: profileData, error } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!error && profileData?.role) {
          setUserRole(profileData.role);
        }
      } catch (err) {
        console.error('Erro ao buscar role do usuario:', err);
      }
    };

    fetchRole();
  }, []);

  const effectiveMenuItems = userRole === 'coach' ? coachMenuItems : menuItems;

  // Hide the nav entirely on the login page
  if (pathname === '/login') return null;

  return (
    <>
      {/* Mobile Header (hidden on desktop) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 z-50 bg-black backdrop-blur-md border-b border-white/10 px-4">
        <div className="flex items-center justify-between h-full">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/40 border border-white/20 hover:bg-white/5 transition-colors"
          >
            <Menu size={20} className="text-coach-gold" />
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
                  className="w-28 sm:w-32 h-10 object-contain"
                />
            ) : (
              <h1 className="text-[11px] leading-none font-bold tracking-widest uppercase text-white/90 text-center z-50">
                VINNY LOPES COACH
              </h1>
            )}
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-coach-black/95 border-r border-white/10 flex-col z-40">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/10">
          {!logoFailed ? (
            <Image
              src="/logo.png"
              alt="Coach Logo"
              width={220}
              height={70}
              priority
              onError={() => setLogoFailed(true)}
              style={{ height: 'auto' }}
              className="w-52 mx-auto"
            />
          ) : (
            <div>
              <h1 className="text-sm font-bold tracking-[0.15em] uppercase text-white">
                VINNY LOPES
              </h1>
              <p className="text-xs tracking-widest uppercase text-gray-400 mt-1">
                COACH
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Menu */}
        <nav className="flex-1 px-4 py-8 flex flex-col gap-2">
          {effectiveMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 px-4 py-3 rounded-lg text-sm uppercase tracking-[0.08em] text-gray-300 hover:text-coach-gold hover:bg-white/5 transition-all duration-200"
              >
                <Icon
                  size={16}
                  className="text-gray-400 group-hover:text-coach-gold transition-colors"
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-gray-500 text-center">© Coach Vinny Lopes</p>
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
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      </div>

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-screen w-80 bg-coach-black/99 border-r border-white/10 z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-white/80">
            MENU
          </h2>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-coach-gold hover:text-coach-gold/60 hover:bg-white/5 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Logo */}
        <div className="px-6 py-4 border-b border-white/10 flex-shrink-0 max-h-[100px] flex items-center justify-center">
          {!logoFailed ? (
            <Image
              src="/logo.png"
              alt="Coach Logo"
              width={180}
              height={60}
              priority
              onError={() => setLogoFailed(true)}
              style={{ height: 'auto' }}
              className="w-44 max-h-[100px] object-contain"
            />
          ) : (
            <div className="text-center">
              <h1 className="text-sm font-bold tracking-[0.15em] uppercase text-white">
                VINNY LOPES
              </h1>
              <p className="text-xs tracking-widest uppercase text-gray-400 mt-1">
                COACH
              </p>
            </div>
          )}
        </div>

        {/* Drawer Menu */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-4 overflow-y-auto h-screen">
          {effectiveMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm uppercase tracking-[0.08em] text-gray-300 hover:text-coach-gold hover:bg-white/5 transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon
                  size={16}
                  className="text-gray-400 group-hover:text-coach-gold transition-colors"
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
