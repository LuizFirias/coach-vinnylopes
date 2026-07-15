"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { hasActiveAccess } from "@/lib/access/hasActiveAccess";
import DumbbellLoader from "@/app/components/DumbbellLoader";

const ALLOWED_WITHOUT_SUBSCRIPTION = [
  "/admin/assinatura",
  "/admin/trocar-senha",
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
 */
export default function CoachSubscriptionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        if (isAllowedWithoutSubscription(pathname)) {
          if (!cancelled) setReady(true);
          return;
        }

        const {
          data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("role, subscription_active, account_type")
          .eq("id", user.id)
          .single();

        if (!profile) {
          router.replace("/login");
          return;
        }

        if (profile.role === "super_admin") {
          if (!cancelled) setReady(true);
          return;
        }

        if (hasActiveAccess(profile)) {
          if (!cancelled) setReady(true);
          return;
        }

        router.replace("/admin/assinatura");
      } catch {
        if (!cancelled) setReady(true);
      }
    };

    setReady(false);
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
