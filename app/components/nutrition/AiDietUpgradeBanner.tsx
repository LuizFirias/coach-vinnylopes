"use client";

import Link from "next/link";

export function AiDietUpgradeBanner() {
  return (
    <Link
      href="/admin/assinatura"
      className="mb-4 flex min-h-11 items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-text-primary touch-manipulation"
    >
      <span className="font-semibold text-brand">✦ IA de dietas</span>
      <span className="text-text-secondary">· Exclusivo PRO</span>
      <span className="ml-auto font-semibold text-brand">Fazer upgrade →</span>
    </Link>
  );
}
