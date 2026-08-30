"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";

const STORAGE_KEY = "auron-app-version";
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/api/version?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { v?: string };
    return data.v?.trim() || null;
  } catch {
    return null;
  }
}

/** Só o app instalado (PWA "standalone") precisa desse aviso — uma aba no
 *  navegador (mobile ou desktop) já pega a versão nova sozinha ao recarregar. */
function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !!mq || !!iosStandalone;
}

const CARD_STYLE = {
  background: "var(--mobile-card-bg, #ffffff)",
  border: "1px solid var(--mobile-card-border, rgba(0,0,0,0.08))",
  boxShadow: "var(--mobile-card-shadow, 0 12px 32px rgba(0,0,0,0.18))",
} as const;

/**
 * No PWA instalado (sobretudo iPhone) não há "puxar para atualizar".
 * Quando o usuário volta ao app e a versão do servidor mudou, mostramos um
 * modal central bloqueante — pede pra tocar em "Atualizar" antes de seguir,
 * garantindo que ele nunca fique numa versão velha sem perceber.
 */
export default function PwaUpdateBanner() {
  const [available, setAvailable] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const checking = useRef(false);

  useEffect(() => {
    setIsPwa(isStandalonePwa());
  }, []);

  const check = useCallback(async () => {
    if (!isStandalonePwa()) return;
    if (checking.current) return;
    checking.current = true;
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration("/");
        await reg?.update().catch(() => undefined);
      }

      const remote = await fetchRemoteVersion();
      if (!remote || remote === "dev") return;

      const local = localStorage.getItem(STORAGE_KEY);
      if (!local) {
        localStorage.setItem(STORAGE_KEY, remote);
        return;
      }
      if (local !== remote) {
        setAvailable(true);
      }
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isStandalonePwa()) return;

    void (async () => {
      if ("serviceWorker" in navigator) {
        try {
          await navigator.serviceWorker.register("/sw.js");
        } catch {
          /* push/offline opcional */
        }
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          setAvailable(true);
        });
      }
      await check();
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onFocus = () => void check();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => void check(), CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [check]);

  const atualizar = async () => {
    const remote = await fetchRemoteVersion();
    if (remote) localStorage.setItem(STORAGE_KEY, remote);
    window.location.reload();
  };

  if (!available || !isPwa) return null;

  return <PwaUpdateModal onUpdate={() => void atualizar()} />;
}

/**
 * Só a parte visual do modal — separada pra dar pra pré-visualizar em telas
 * de teste sem precisar estar num PWA instalado com versão desatualizada de
 * verdade (ver botão de teste em /aluno/treinos).
 */
export function PwaUpdateModal({ onUpdate }: { onUpdate: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pwa-update-title"
      // Sem onClick no fundo — "obriga" a tocar no botão, não fecha clicando fora.
    >
      <div
        className="w-full max-w-[300px] rounded-[18px] px-5 py-6 text-center"
        style={CARD_STYLE}
      >
        <span
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "rgba(212, 168, 67, 0.12)" }}
          aria-hidden
        >
          <Sparkle size={22} weight="fill" className="text-brand" />
        </span>
        <p id="pwa-update-title" className="text-[15px] font-bold leading-snug text-text-primary">
          Estamos sempre melhorando por você
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-text-tertiary">
          Uma nova versão do Coach Vinny já está disponível. Atualize pra continuar com tudo em dia.
        </p>
        <button
          type="button"
          onClick={onUpdate}
          className="mt-4 h-11 w-full touch-manipulation rounded-[10px] text-sm font-bold text-white"
          style={{
            background: "linear-gradient(135deg, #F5D061 0%, #D4A843 55%, #B8902F 100%)",
            boxShadow: "0 4px 20px rgba(212, 168, 67, 0.45)",
            border: "none",
          }}
        >
          Atualizar agora
        </button>
      </div>
    </div>
  );
}
