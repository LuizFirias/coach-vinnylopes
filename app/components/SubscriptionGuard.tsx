"use client";

import React, { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import Link from "next/link";

interface Props {
  children: React.ReactNode;
}

export default function SubscriptionGuard({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      setLoading(true);
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user;
        if (!user) {
          setAllowed(false);
          setStatus(null);
          setLoading(false);
          return;
        }

        const { data: profile, error } = await supabaseClient
          .from("profiles")
          .select("status_pagamento, data_expiracao")
          .eq("id", user.id)
          .single();

        if (error || !profile) {
          setAllowed(false);
          setStatus(null);
        } else {
          const exp = profile.data_expiracao ? new Date(profile.data_expiracao) : null;
          const now = new Date();
          if (exp && exp >= now && profile.status_pagamento === 'pago') {
            // active
            const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            setDaysLeft(diff);
            setAllowed(true);
            setStatus('pago');
          } else {
            // expired or not paid
            if (exp && exp < now) {
              // auto mark as atrasado
              await supabaseClient.from('profiles').update({ status_pagamento: 'atrasado' }).eq('id', user.id);
              setStatus('atrasado');
            } else {
              setStatus(profile.status_pagamento ?? null);
            }
            setAllowed(false);
            setDaysLeft(exp ? Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null);
          }
        }
      } catch (err) {
        setAllowed(false);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, []);

  const WHATSAPP_NUMBER = "556781232717"; // international format without '+'
  const waMessage = encodeURIComponent("Olá Coach Vinny, preciso renovar minha assinatura.");

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (allowed) return <>{children}</>;

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
            className="inline-block px-5 py-3 bg-linear-to-r from-coach-gold to-coach-gold-dark text-black font-semibold rounded shadow hover:shadow-lg transition"
          >
            Falar com Coach no WhatsApp
          </a>

          <Link href="/login" className="mt-2 sm:mt-0 inline-block px-4 py-2 btn-glass">
            Entrar / Gerenciar Assinatura
          </Link>
        </div>
      </div>
    </div>
  );
}
