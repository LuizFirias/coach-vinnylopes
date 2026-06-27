"use client";

import React from 'react';
import { usePathname } from 'next/navigation';

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';

  const isInternal =
    pathname.startsWith('/aluno') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/super-admin');

  // Add bottom padding on mobile to prevent content from being hidden behind bottom nav
  // No top padding on mobile since there's no fixed header
  const className = isInternal ? 'pb-20 lg:pb-0 lg:ml-16 xl:ml-[240px] transition-[margin-left] duration-200 ease-in-out' : 'pt-0';

  return <main className={className}>{children}</main>;
}
