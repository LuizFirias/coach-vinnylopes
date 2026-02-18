"use client";

import React from 'react';
import { usePathname } from 'next/navigation';

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';

  // Consider internal routes to be those under /aluno or /admin
  const isInternal = pathname.startsWith('/aluno') || pathname.startsWith('/admin');

  // For internal pages we add a large top padding so content never hides under header
  const className = isInternal ? 'pt-[120px] lg:pt-0 lg:ml-64' : 'pt-0';

  return <main className={className}>{children}</main>;
}
