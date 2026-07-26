'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  getBootstrapProfile,
  peekBootstrapProfile,
} from '@/lib/auth/bootstrapProfile';
import { getPasswordChangePath, getPostLoginPath } from '@/lib/auth/getPostLoginPath';

interface MustChangePasswordGuardProps {
  children: React.ReactNode;
  area: 'aluno' | 'admin';
}

export default function MustChangePasswordGuard({ children, area }: MustChangePasswordGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const changePasswordPath = area === 'aluno' ? '/aluno/trocar-senha' : '/admin/trocar-senha';
  const isChangePasswordPage = pathname === changePasswordPath;

  const [ready, setReady] = useState(() => peekBootstrapProfile() !== null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const cached = await getBootstrapProfile();

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

    void check();
    return () => {
      cancelled = true;
    };
  }, [router, pathname, isChangePasswordPage]);

  if (!ready) {
    // Splash HTML global já cobre o first paint — evita segundo loader pesado
    return (
      <div className="min-h-screen bg-surface-0" aria-busy="true" />
    );
  }

  return <>{children}</>;
}
