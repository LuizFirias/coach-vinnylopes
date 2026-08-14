"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";

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

/**
 * No PWA (sobretudo iPhone) não há “puxar para atualizar”.
 * Quando o usuário volta ao app ou passa um tempo com ele aberto,
 * comparamos a versão do servidor e oferecemos um toque para recarregar.
 */
export default function PwaUpdateBanner() {
  const [available, setAvailable] = useState(false);
  const checking = useRef(false);

  const check = useCallback(async () => {
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

  if (!available) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border-0 bg-surface-1 px-3 py-2.5 shadow-elev-2">
        <p className="min-w-0 flex-1 text-xs font-medium leading-snug text-text-primary">
          Nova versão do Auronfit disponível
        </p>
        <button
          type="button"
          onClick={() => void atualizar()}
          className="inline-flex h-9 shrink-0 touch-manipulation items-center gap-1.5 rounded-lg bg-brand/15 px-3 text-xs font-bold text-brand"
        >
          <ArrowsClockwise size={14} weight="bold" />
          Atualizar
        </button>
      </div>
    </div>
  );
}
