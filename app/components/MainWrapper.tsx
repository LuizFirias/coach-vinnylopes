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
    pathname.startsWith('/admin/preview-aluno');

  const className =
    isInternal && !hideCoachChrome
      ? 'lg:ml-[var(--sidebar-width,155px)] transition-[margin-left] duration-300'
      : 'pt-0';

  return <main className={className}>{children}</main>;
}
