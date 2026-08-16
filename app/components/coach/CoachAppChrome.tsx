"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { CoachHeaderActions } from "@/app/components/coach/CoachHeaderActions";
import { useNaoLidasRealtime } from "@/lib/chat/realtime";
import { useNotificacoesNaoLidas } from "@/lib/notifications/realtime";
import { supabaseClient } from "@/lib/supabaseClient";
import { fetchSubscriptionStatusCached } from "@/lib/subscriptions/statusClientCache";
import {
  formatPlanStudentCap,
  getPlanLabel,
} from "@/lib/subscriptions/plans";

function shouldHideChrome(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/boas-vindas") ||
    pathname.startsWith("/admin/preview-aluno") ||
    pathname.startsWith("/admin/trocar-senha")
  );
}

function coachPageTitle(pathname: string): string {
  if (pathname === "/admin/alunos" || pathname.startsWith("/admin/alunos/")) return "Seus alunos";
  if (pathname === "/admin/dashboard") return "Início";
  if (pathname.startsWith("/admin/treinos")) return "Treinos";
  if (pathname.startsWith("/admin/nutricao")) return "Nutrição";
  if (pathname.startsWith("/admin/feedbacks")) return "Feedbacks";
  if (pathname.startsWith("/admin/chat")) return "Mensagens";
  if (pathname.startsWith("/admin/relatorios")) return "Relatórios";
  if (pathname.startsWith("/admin/ranking")) return "Ranking";
  if (pathname.startsWith("/admin/parceiros")) return "Parceiros";
  if (pathname.startsWith("/admin/biblioteca")) return "Biblioteca";
  if (pathname.startsWith("/admin/planos")) return "Planos";
  if (pathname.startsWith("/admin/assinatura")) return "Assinatura";
  if (pathname.startsWith("/admin/perfil")) return "Perfil";
  if (pathname.startsWith("/admin/seguranca")) return "Segurança";
  if (pathname.startsWith("/admin/aluno/")) return "Aluno";
  return "Auron";
}

export function CoachAppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { user, loading: authLoading } = useAuth();
  const hide = shouldHideChrome(pathname);

  const chatNaoLidas = useNaoLidasRealtime(user?.id ?? null, "coach");
  const notifNaoLidas = useNotificacoesNaoLidas(user?.id ?? null);
  const [notifOpen, setNotifOpen] = useState(false);

  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sexo, setSexo] = useState<string | null>(null);
  const [planLabel, setPlanLabel] = useState("AuronFit");
  // Primeiro nome — usado na saudação do topbar (substitui "Início" no dashboard).
  const firstName = userName.trim().split(/\s+/).filter(Boolean)[0] || "";

  const loadChromeProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      const coachId = session?.user?.id ?? user.id;

      const [profileResult, statusResult] = await Promise.all([
        supabaseClient
          .from("profiles")
          .select("full_name, avatar_url, sexo")
          .eq("id", coachId)
          .maybeSingle(),
        session?.access_token
          ? fetchSubscriptionStatusCached(session.access_token)
          : Promise.resolve(null),
      ]);

      setUserName(profileResult.data?.full_name?.trim() || "");
      setAvatarUrl(profileResult.data?.avatar_url ?? null);
      setSexo(profileResult.data?.sexo ?? null);

      if (statusResult) {
        const tier = statusResult.planTier as string | null | undefined;
        const limit = statusResult.studentLimit as number | null | undefined;
        const accountType = statusResult.accountType as string | undefined;
        if (accountType === "parceiro" || limit == null) {
          setPlanLabel("Ilimitados");
        } else if (tier) {
          const cap = formatPlanStudentCap(tier, limit);
          setPlanLabel(cap === "Ilimitado" ? "Ilimitados" : getPlanLabel(tier));
        } else {
          setPlanLabel(getPlanLabel(tier));
        }
      }
    } catch {
      /* chrome não bloqueia a página */
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || hide) return;
    void loadChromeProfile();
  }, [authLoading, hide, loadChromeProfile, pathname]);

  useEffect(() => {
    setNotifOpen(false);
  }, [pathname]);

  if (hide) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="coach-chrome-header sticky top-0 z-50 isolate w-full max-w-full overflow-x-clip border-b border-border-subtle/40 bg-surface-0/95 backdrop-blur-md lg:overflow-visible">
        <div className="box-border flex h-full min-w-0 w-full max-w-full items-center gap-3 px-4 py-2 md:px-8 lg:h-full lg:px-0 lg:py-0">
          <h2 className="coach-page-title hidden min-w-0 truncate lg:block">
            {pathname === "/admin/dashboard" && firstName ? (
              <>
                Olá, <span className="text-brand">{firstName}</span>
              </>
            ) : (
              coachPageTitle(pathname)
            )}
          </h2>
          <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
            <CoachHeaderActions
            userName={userName}
            avatarUrl={avatarUrl}
            sexo={sexo}
            planLabel={planLabel}
            chatNaoLidas={chatNaoLidas + notifNaoLidas}
            chatNaoLidasPainel={chatNaoLidas}
            notifOpen={notifOpen}
            onNotifOpenChange={setNotifOpen}
          />
          </div>
        </div>
      </header>
      <div className="relative z-0 min-w-0 w-full max-w-full overflow-x-clip">{children}</div>
    </>
  );
}
