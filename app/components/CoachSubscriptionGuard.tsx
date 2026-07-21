"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { hasActiveAccess } from "@/lib/access/hasActiveAccess";
import { getCachedAdminGuardProfile } from "@/lib/auth/adminGuardCache";
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

        const cached = await getCachedAdminGuardProfile(async () => {
          const { data: { session } } = await supabaseClient.auth.getSession();
          const user = session?.user;
          if (!user) return null;

          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("role, must_change_password, first_access_completed, subscription_active, account_type")
            .eq("id", user.id)
            .single();

          if (!profile) return null;

          return {
            userId: user.id,
            role: profile.role ?? null,
            must_change_password: profile.must_change_password ?? null,
            first_access_completed: profile.first_access_completed ?? null,
            subscription_active: profile.subscription_active ?? null,
            account_type: profile.account_type ?? null,
          };
        });

        if (!cached) {
          router.replace("/login");
          return;
        }

        if (cached.role === "super_admin") {
          if (!cancelled) setReady(true);
          return;
        }

        if (
          hasActiveAccess({
            subscription_active: cached.subscription_active,
            account_type: cached.account_type,
          })
        ) {
          if (!cancelled) setReady(true);
          return;
        }

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
