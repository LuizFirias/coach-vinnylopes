"use client";

import React from 'react';
import { usePathname } from 'next/navigation';

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';

  const isInternal =
    pathname.startsWith('/aluno') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/super-admin');

  const hideCoachChrome =
    pathname.startsWith('/admin/boas-vindas') ||
    pathname.startsWith('/admin/preview-aluno') ||
    pathname.startsWith('/admin/trocar-senha');

  const className =
    isInternal && !hideCoachChrome
      ? `${pathname.startsWith("/admin") ? "coach-main-shell " : ""}min-w-0 max-w-full overflow-x-clip lg:ml-[var(--sidebar-width,155px)] lg:w-[calc(100%-var(--sidebar-width,155px))] transition-[margin-left,width] duration-300`
      : "min-w-0 w-full max-w-full overflow-x-clip pt-0";

  return <main className={className}>{children}</main>;
}
