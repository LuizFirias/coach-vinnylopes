"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getBootstrapProfile,
  peekBootstrapProfile,
  type BootstrapProfile,
} from "@/lib/auth/bootstrapProfile";

interface Props {
  children: React.ReactNode;
}

function parseDateSafe(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
  }
  return new Date(value);
}

function resolveAllowed(profile: BootstrapProfile | null): boolean {
  if (!profile) return false;
  if (profile.arquivado) return false;
  const exp = profile.data_expiracao ? parseDateSafe(profile.data_expiracao) : null;
  const now = new Date();
  return !!(exp && exp >= now && profile.status_pagamento === "pago");
}

/**
 * Bloqueia conteúdo do aluno com pagamento atrasado/vencido.
 *
 * Antes fazia sua própria consulta (auth.getUser + profiles) do zero toda
 * vez que a tela montava — um round-trip de rede a mais, com spinner
 * próprio, em cima do que o MustChangePasswordGuard/AlunoBodyGenderProvider
 * já buscam (e cacheiam) no layout. Reaproveita esse mesmo bootstrap —
 * zero query extra, sem spinner bloqueando a navegação.
 */
export default function SubscriptionGuard({ children }: Props) {
  const [profile, setProfile] = useState<BootstrapProfile | null>(() => peekBootstrapProfile());
  const [ready, setReady] = useState(() => peekBootstrapProfile() !== null);

  useEffect(() => {
    let cancelled = false;
    void getBootstrapProfile().then((p) => {
      if (!cancelled) {
        setProfile(p);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const WHATSAPP_NUMBER = "556781232717"; // international format without '+'
  const waMessage = encodeURIComponent("Olá Coach Vinny, preciso renovar minha assinatura.");

  if (!ready) {
    return (
      <div className="min-h-50 flex items-center justify-center">
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (resolveAllowed(profile)) return <>{children}</>;

  // Blocked view
  return (
    <div className="w-full flex items-center justify-center py-12">
      <div className="max-w-xl w-full card-glass text-center">
        <h3 className="text-xl font-semibold text-white mb-3">Sua assinatura precisa de renovação</h3>
        <p className="text-gray-300 mb-6">Sua assinatura precisa de renovação para liberar este conteúdo.</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-4 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98]"
          >
            Falar com Coach no WhatsApp
          </a>

          <Link href="/login" className="mt-2 sm:mt-0 inline-block px-6 py-4 bg-white/[0.03] border border-white/10 text-white text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-white/[0.05] transition-all duration-300">
            Entrar / Gerenciar Assinatura
          </Link>
        </div>
      </div>
    </div>
  );
}
