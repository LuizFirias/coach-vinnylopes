'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { getPasswordChangePath, getPostLoginPath } from '@/lib/auth/getPostLoginPath';
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
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user;

        if (!user) {
          router.replace('/login');
          return;
        }

        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('role, must_change_password, first_access_completed')
          .eq('id', user.id)
          .single();

        if (!profile) {
          router.replace('/login');
          return;
        }

        const expectedPath = getPasswordChangePath(profile.role);
        const mustChange = Boolean(profile.must_change_password && expectedPath);

        if (mustChange && !isChangePasswordPage) {
          router.replace(expectedPath!);
          return;
        }

        if (!mustChange && isChangePasswordPage) {
          router.replace(getPostLoginPath(profile));
          return;
        }

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    };

    setReady(false);
    check();
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
