"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Envelope, ArrowRight } from "@phosphor-icons/react";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const email = searchParams ? searchParams.get("email") : "";

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary flex flex-col items-center justify-center p-6 md:p-12 select-none selection:bg-brand/35 selection:text-white">
      <div className="w-full max-w-[400px] text-center space-y-8 p-8 bg-surface-1 border border-border-subtle rounded-2xl shadow-xl">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mx-auto">
          <Envelope className="w-8 h-8" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="font-display font-black text-2xl text-white">
            Confirme seu e-mail
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Enviamos um link de ativação para a sua caixa de entrada:
          </p>
          {email && (
            <p className="text-sm text-brand font-semibold select-all break-all">
              {email}
            </p>
          )}
          <p className="text-xs text-text-tertiary leading-relaxed pt-2">
            Clique no link contido na mensagem para ativar sua conta. Verifique também sua pasta de spam.
          </p>
        </div>

        {/* Button */}
        <div className="pt-4">
          <Link
            href="/login"
            className="w-full h-11 bg-brand text-text-on-brand rounded-lg text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>Ir para o Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="text-2xs text-text-disabled uppercase tracking-widest">
          AURONFIT PLATFORM
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
