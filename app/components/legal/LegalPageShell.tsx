import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

type Props = {
  title: string;
  updatedAt: string;
  children: ReactNode;
};

/** Shell público para Termos / Privacidade — mesmo visual das telas de auth. */
export function LegalPageShell({ title, updatedAt, children }: Props) {
  return (
    <div
      className="min-h-screen text-text-primary"
      style={{
        background:
          "linear-gradient(160deg, #faf5ff 0%, #f5f5f7 55%, #ffffff 100%)",
      }}
    >
      <header className="border-b border-black/5 bg-white/70 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <Image
              src="/images/logo-auron-nome-roxo.svg"
              alt="Auronfit"
              width={140}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>
          <nav className="flex items-center gap-4 text-xs font-semibold">
            <Link
              href="/termos"
              className="text-text-secondary hover:text-brand transition-colors"
            >
              Termos
            </Link>
            <Link
              href="/privacidade"
              className="text-text-secondary hover:text-brand transition-colors"
            >
              Privacidade
            </Link>
            <Link
              href="/"
              className="rounded-full bg-brand px-3.5 py-1.5 text-white hover:opacity-90 transition-opacity"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand mb-3">
          Documento legal
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary mb-2">
          {title}
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Última atualização: {updatedAt}
        </p>

        <article className="rounded-2xl bg-white border border-black/5 shadow-sm px-5 py-7 md:px-8 md:py-9 legal-prose">
          {children}
        </article>

        <p className="mt-8 text-center text-xs text-text-tertiary">
          Dúvidas?{" "}
          <a
            href="mailto:suporte@auronfit.com.br"
            className="text-brand font-semibold hover:underline"
          >
            suporte@auronfit.com.br
          </a>
        </p>
      </main>
    </div>
  );
}
