"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasActiveAccess } from "@/lib/access/hasActiveAccess";
import {
  getBootstrapProfile,
  peekBootstrapProfile,
  type BootstrapProfile,
} from "@/lib/auth/bootstrapProfile";
import DumbbellLoader from "@/app/components/DumbbellLoader";

const ALLOWED_WITHOUT_SUBSCRIPTION = [
  "/admin/assinatura",
  "/admin/trocar-senha",
  "/admin/boas-vindas",
  "/admin/preview-aluno",
];

function isAllowedWithoutSubscription(pathname: string | null): boolean {
  if (!pathname) return false;
  return ALLOWED_WITHOUT_SUBSCRIPTION.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Bloqueia o painel do coach sem assinatura ativa.
 * Contas teste/parceiro e super_admin passam. Sem acesso, redireciona para /admin/assinatura.
 * trial_pendente_cartao: força concluir cadastro do cartão em /admin/assinatura.
 */
function isAllowed(profile: BootstrapProfile): boolean {
  if (profile.role === "super_admin") return true;
  if (profile.trial_pendente_cartao) return false;
  return hasActiveAccess({
    subscription_active: profile.subscription_active,
    account_type: profile.account_type,
  });
}

export default function CoachSubscriptionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Mesma request/cache do MustChangePasswordGuard (bootstrapProfile) —
  // com cache válido a tela monta direto, sem loader nem query extra
  const [ready, setReady] = useState(() => {
    if (isAllowedWithoutSubscription(pathname)) return true;
    const cached = peekBootstrapProfile();
    return cached ? isAllowed(cached) : false;
  });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        if (isAllowedWithoutSubscription(pathname)) {
          if (!cancelled) setReady(true);
          return;
        }

        const cached = await getBootstrapProfile();

        if (!cached) {
          if (!cancelled) setReady(true);
          router.replace("/login");
          return;
        }

        if (isAllowed(cached)) {
          if (!cancelled) setReady(true);
          return;
        }

        // Libera o loader antes do redirect para não ficar preso em "Verificando..."
        if (!cancelled) setReady(true);
        router.replace("/admin/assinatura");
      } catch {
        if (!cancelled) setReady(true);
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Verificando assinatura..." />
      </div>
    );
  }

  return <>{children}</>;
}
