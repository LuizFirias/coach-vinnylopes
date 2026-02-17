"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  X,
  Dumbbell,
  Utensils,
  TrendingUp,
  Camera,
  Users,
  Trophy,
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

export default function ResponsiveNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <>
      {/* Mobile Header (hidden on desktop) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 z-50 bg-coach-black/98 backdrop-blur-md border-b border-white/10 px-4">
        <div className="flex items-center justify-between h-full">
          <button
            aria-label="Abrir menu"
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/40 border border-white/20 hover:bg-white/5 transition-colors"
          >
            <Menu size={20} className="text-coach-gold" />
          </button>
          {!logoFailed ? (
            <Image
              src="/logo.png"
              alt="Coach Logo"
              width={140}
              height={40}
              priority
              onError={() => setLogoFailed(true)}
              className="h-10 w-auto"
            />
          ) : (
            <h1 className="text-xs font-bold tracking-[0.15em] uppercase text-white/90">
              VINNY COACH
            </h1>
          )}
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
              width={180}
              height={50}
              priority
              onError={() => setLogoFailed(true)}
              className="h-12 w-auto"
            />
          ) : (
            <div>
              <h1 className="text-sm font-bold tracking-[0.15em] uppercase text-white">
                VINNY LOPES
              </h1>
              <p className="text-xs tracking-[0.1em] uppercase text-gray-400 mt-1">
                COACH
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Menu */}
        <nav className="flex-1 px-4 py-8 flex flex-col gap-2">
          {menuItems.map((item) => {
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
          <p className="text-xs text-gray-500 text-center">© 2026 Coach</p>
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
        className={`lg:hidden fixed left-0 top-0 h-screen w-80 bg-coach-black/99 border-r border-white/10 z-50 transform transition-transform duration-300 ease-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
          <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-white/80">
            MENU
          </h2>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-coach-gold hover:text-coach-gold/60 hover:bg-white/5 rounded-lg transition-all"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Menu */}
        <nav className="px-4 py-6 flex flex-col gap-4">
          {menuItems.map((item) => {
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
