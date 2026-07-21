'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { getPasswordChangePath, getPostLoginPath } from '@/lib/auth/getPostLoginPath';
import { getCachedAdminGuardProfile } from '@/lib/auth/adminGuardCache';
import DumbbellLoader from '@/app/components/DumbbellLoader';

interface MustChangePasswordGuardProps {
  children: React.ReactNode;
  area: 'aluno' | 'admin';
}

export default function MustChangePasswordGuard({ children, area }: MustChangePasswordGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const changePasswordPath = area === 'aluno' ? '/aluno/trocar-senha' : '/admin/trocar-senha';
  const isChangePasswordPage = pathname === changePasswordPath;

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const cached = await getCachedAdminGuardProfile(async () => {
          const { data: { session } } = await supabaseClient.auth.getSession();
          const user = session?.user;
          if (!user) return null;

          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role, must_change_password, first_access_completed, subscription_active, account_type')
            .eq('id', user.id)
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
          router.replace('/login');
          return;
        }

        const expectedPath = cached.role
          ? getPasswordChangePath(cached.role)
          : null;
        const mustChange = Boolean(cached.must_change_password && expectedPath);

        if (mustChange && !isChangePasswordPage) {
          router.replace(expectedPath!);
          return;
        }

        if (!mustChange && isChangePasswordPage && cached.role) {
          router.replace(
            getPostLoginPath({
              role: cached.role,
              first_access_completed: cached.first_access_completed,
              must_change_password: cached.must_change_password,
            }),
          );
          return;
        }

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    };

    // Se já temos cache quente, não mostra loader full-screen
    void check();
    return () => { cancelled = true; };
  }, [router, pathname, isChangePasswordPage]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando..." />
      </div>
    );
  }

  return <>{children}</>;
}
