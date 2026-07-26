"use client";

import React, { useEffect, useState } from"react";
import { supabaseClient } from"@/lib/supabaseClient";
import Link from"next/link";
import DumbbellLoader from "@/app/components/DumbbellLoader";

interface Props {
  children: React.ReactNode;
}

export default function SubscriptionGuard({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [coachWhatsapp, setCoachWhatsapp] = useState<string | null>("556781232717");

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
          .select("status_pagamento, data_expiracao, arquivado, coach_id")
          .eq("id", user.id)
          .single();

        if (error || !profile) {
          setAllowed(false);
          setStatus(null);
        } else if (profile.arquivado) {
          // Se estiver arquivado, ignore o resto e bloqueie
          setAllowed(false);
          setStatus("arquivado");
        } else {
          // Fetch coach whatsapp if coach_id is present
          if (profile.coach_id) {
            try {
              const { data: sessionData } = await supabaseClient.auth.getSession();
              const accessToken = sessionData?.session?.access_token;
              const headers: HeadersInit = accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : {};
              const res = await fetch(`/api/aluno/coach-whatsapp?coachId=${profile.coach_id}`, {
                headers,
              });
              if (!res.ok) {
                setCoachWhatsapp(null);
              } else {
                const data = await res.json();
                if (data?.whatsapp) {
                  setCoachWhatsapp(data.whatsapp);
                }
              }
            } catch (e) {
              console.warn("Erro ao buscar whatsapp do coach:", e);
            }
          }

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

  const waMessage = encodeURIComponent("Olá, preciso renovar minha assinatura no Auronfit.");

  if (loading) {
    return (
      <div className="min-h-50 flex items-center justify-center">
        <DumbbellLoader variant="inline" />
      </div>
    );
  }

  if (allowed) return <>{children}</>;

  // Blocked view
  return (
    <div className="w-full flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-surface-1 border border-card p-8 rounded-2xl text-center shadow-elev-1">
        <h3 className="text-lg font-semibold text-text-primary mb-3">Sua assinatura precisa de renovação</h3>
        <p className="text-xs text-text-secondary mb-6 leading-relaxed">
          Sua assinatura precisa de renovação para liberar este conteúdo. Fale com seu personal/coach para renovar seu acesso.
        </p>

        <div className="flex flex-col items-stretch justify-center">
          {coachWhatsapp ? (
            <a
              href={`https://wa.me/${coachWhatsapp}?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-11 px-6 bg-brand hover:bg-brand/90 text-text-on-brand text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-md"
            >
              Falar com Coach no WhatsApp
            </a>
          ) : (
            <p className="text-xs text-text-tertiary">
              Entre em contato com seu coach para renovar o acesso.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
