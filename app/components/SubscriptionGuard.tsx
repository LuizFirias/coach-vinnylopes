"use client";

import React, { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  getBootstrapProfile,
  peekBootstrapProfile,
  type BootstrapProfile,
} from "@/lib/auth/bootstrapProfile";
import DumbbellLoader from "@/app/components/DumbbellLoader";

interface Props {
  children: React.ReactNode;
}

type Verdict = { allowed: boolean; status: string | null; coachId: string | null };

function evaluate(profile: BootstrapProfile | null): Verdict {
  if (!profile) return { allowed: false, status: null, coachId: null };
  if (profile.arquivado) return { allowed: false, status: "arquivado", coachId: profile.coach_id };

  const exp = profile.data_expiracao ? new Date(profile.data_expiracao) : null;
  const now = new Date();
  if (exp && exp >= now && profile.status_pagamento === "pago") {
    return { allowed: true, status: "pago", coachId: profile.coach_id };
  }
  return {
    allowed: false,
    status: exp && exp < now ? "atrasado" : profile.status_pagamento ?? null,
    coachId: profile.coach_id,
  };
}

export default function SubscriptionGuard({ children }: Props) {
  // Cache compartilhado (bootstrapProfile): navegações subsequentes renderizam sem loader
  const [verdict, setVerdict] = useState<Verdict | null>(() => {
    const cached = peekBootstrapProfile();
    return cached ? evaluate(cached) : null;
  });
  const [coachWhatsapp, setCoachWhatsapp] = useState<string | null>("556781232717");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const profile = await getBootstrapProfile();
        const result = evaluate(profile);
        if (cancelled) return;
        setVerdict(result);

        // Marca atrasado em background — não bloqueia a renderização
        if (
          profile &&
          result.status === "atrasado" &&
          profile.status_pagamento !== "atrasado"
        ) {
          void supabaseClient
            .from("profiles")
            .update({ status_pagamento: "atrasado" })
            .eq("id", profile.userId)
            .then(() => undefined, () => undefined);
        }
      } catch {
        if (!cancelled) setVerdict({ allowed: false, status: null, coachId: null });
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  // WhatsApp do coach só é necessário na tela de bloqueio — busca fora do caminho crítico
  useEffect(() => {
    if (!verdict || verdict.allowed || !verdict.coachId) return;
    let cancelled = false;

    const fetchWhatsapp = async () => {
      try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        const headers: HeadersInit = accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {};
        const res = await fetch(`/api/aluno/coach-whatsapp?coachId=${verdict.coachId}`, {
          headers,
        });
        if (cancelled) return;
        if (!res.ok) {
          setCoachWhatsapp(null);
          return;
        }
        const data = await res.json();
        if (!cancelled && data?.whatsapp) setCoachWhatsapp(data.whatsapp);
      } catch (e) {
        console.warn("Erro ao buscar whatsapp do coach:", e);
      }
    };

    void fetchWhatsapp();
    return () => {
      cancelled = true;
    };
  }, [verdict]);

  const waMessage = encodeURIComponent("Olá, preciso renovar minha assinatura no Auronfit.");

  if (!verdict) {
    return (
      <div className="min-h-50 flex items-center justify-center">
        <DumbbellLoader variant="inline" />
      </div>
    );
  }

  if (verdict.allowed) return <>{children}</>;

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
