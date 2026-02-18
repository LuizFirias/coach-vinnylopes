"use client";

import React from 'react';
import { usePathname } from 'next/navigation';

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';

  // Consider internal routes to be those under /aluno, /admin, or /super-admin
  const isInternal = pathname.startsWith('/aluno') || pathname.startsWith('/admin') || pathname.startsWith('/super-admin');

  // For internal pages we add a large top padding on mobile for the floating header
  // and a left margin on desktop for the permanent sidebar (w-24 = 96px)
  const className = isInternal ? 'pt-24 lg:pt-0 lg:ml-24 transition-all duration-300' : 'pt-0';

  return <main className={className}>{children}</main>;
}
