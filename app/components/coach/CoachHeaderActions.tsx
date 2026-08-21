"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Bell,
  BellSlash,
  ChatCircle,
  CaretDown,
  User,
  CreditCard,
  GearSix,
  ShieldCheck,
  Cookie,
  SignOut,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { StudentAvatar } from "@/app/components/profile/StudentAvatar";
import {
  getPushPermission,
  isPushSupported,
  isSubscribedToPush,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";
import { CoachNotificationsPanel } from "@/app/components/notifications/CoachNotificationsPanel";

const MENU_LINKS = [
  { label: "O seu perfil", href: "/admin/perfil", icon: User },
  { label: "Gestão da assinatura", href: "/admin/assinatura", icon: CreditCard },
  {
    label: "Configurações e preferências",
    href: "/admin/perfil?sec=config",
    icon: GearSix,
  },
  {
    label: "Segurança e privacidade",
    href: "/admin/seguranca",
    icon: ShieldCheck,
  },
  {
    label: "Configuração de cookies",
    href: "/privacidade",
    icon: Cookie,
  },
] as const;

export type CoachHeaderActionsProps = {
  userName?: string;
  avatarUrl?: string | null;
  sexo?: string | null;
  planLabel?: string;
  /** Badge: chat + notificações in-app */
  chatNaoLidas?: number;
  /** Só chat — item do painel */
  chatNaoLidasPainel?: number;
  showNotificationBadge?: boolean;
  notifOpen: boolean;
  onNotifOpenChange: (open: boolean) => void;
};

/** Sino push + mensagens/notif + card de perfil (menu). */
export function CoachHeaderActions({
  userName,
  avatarUrl,
  sexo,
  planLabel = "AuronFit",
  chatNaoLidas = 0,
  chatNaoLidasPainel = 0,
  showNotificationBadge,
  notifOpen,
  onNotifOpenChange,
}: CoachHeaderActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushUnsupported, setPushUnsupported] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  // Portal (document.body) — igual ao painel de notificações: preso na
  // árvore normal, o menu fica na stacking context do header (com
  // backdrop-blur) e o Chrome às vezes o desenha por baixo de cards com
  // glass/blur na página (ex.: KPIs).
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const displayName = (userName ?? "").trim() || "Coach";
  const hasCount = chatNaoLidas > 0;

  useEffect(() => {
    if (!isPushSupported()) {
      setPushUnsupported(true);
      return;
    }
    void (async () => {
      const permission = getPushPermission();
      if (permission === "denied" || permission === "unsupported") {
        setPushOn(false);
        return;
      }
      setPushOn(await isSubscribedToPush());
    })();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (menuBtnRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const updatePos = () => {
      const rect = menuBtnRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [menuOpen]);

  const togglePush = async () => {
    if (pushBusy || pushUnsupported) return;
    setPushBusy(true);
    try {
      if (pushOn) {
        await unsubscribeFromPush();
        setPushOn(false);
      } else {
        const res = await subscribeToPush();
        if (res.ok) setPushOn(true);
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      const { supabaseClient } = await import("@/lib/supabaseClient");
      await supabaseClient.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    } finally {
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  const iconBtn =
    "coach-header-icon-btn relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-surface-1 text-text-tertiary shadow-sm transition-colors hover:text-text-primary";

  return (
    <div className="flex max-w-full min-w-0 items-center justify-end gap-1.5 sm:gap-2">
      {!pushUnsupported && (
        <button
          type="button"
          disabled={pushBusy}
          onClick={() => void togglePush()}
          style={{ touchAction: "manipulation" }}
          className={cn(iconBtn, "disabled:opacity-50")}
          aria-label={pushOn ? "Desativar notificações" : "Ativar notificações"}
          title={pushOn ? "Notificações ligadas" : "Notificações desligadas"}
        >
          {pushOn ? (
            <Bell size={18} weight="regular" />
          ) : (
            <BellSlash size={18} weight="regular" />
          )}
        </button>
      )}

      <div className="relative shrink-0">
        <button
          ref={notifBtnRef}
          type="button"
          onClick={() => onNotifOpenChange(!notifOpen)}
          style={{ touchAction: "manipulation" }}
          className={iconBtn}
          aria-label={
            hasCount
              ? `Mensagens e notificações, ${chatNaoLidas} não lidas`
              : "Mensagens e notificações"
          }
          aria-expanded={notifOpen}
        >
          <ChatCircle size={18} weight="regular" />
          {hasCount ? (
            <span className="absolute right-0 top-0 flex h-4 min-w-4 translate-x-[2px] -translate-y-[2px] items-center justify-center rounded-full border-2 border-surface-0 bg-warning px-[3px] text-[9px] font-bold text-white">
              {chatNaoLidas > 99 ? "99+" : chatNaoLidas}
            </span>
          ) : showNotificationBadge ? (
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full border-2 border-surface-0 bg-warning" />
          ) : null}
        </button>

        <CoachNotificationsPanel
          open={notifOpen}
          onClose={() => onNotifOpenChange(false)}
          chatNaoLidas={chatNaoLidasPainel}
          anchorRef={notifBtnRef}
        />
      </div>

      <div className="relative min-w-0 max-w-[min(100%,18rem)]">
        <button
          ref={menuBtnRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          style={{ touchAction: "manipulation" }}
          className={cn(
            "flex min-w-0 max-w-full cursor-pointer items-center gap-2 px-0 py-0 text-left",
            "rounded-xl border border-border-subtle bg-surface-1 shadow-sm",
            "sm:px-1.5 sm:py-1 sm:hover:bg-surface-2/50",
          )}
        >
          <StudentAvatar
            name={displayName}
            avatarUrl={avatarUrl}
            sexo={sexo}
            sizeClassName="h-8 w-8 sm:h-12 sm:w-12"
            className="rounded-full border-0 sm:rounded-lg sm:border sm:border-border-subtle"
          />
          <span className="flex min-h-8 min-w-0 flex-col justify-between sm:min-h-12">
            <span className="flex min-w-0 items-center gap-1">
              <span className="block min-w-0 truncate text-sm font-semibold leading-tight text-text-primary">
                {displayName}
              </span>
              <CaretDown
                size={18}
                weight="bold"
                className={cn(
                  "shrink-0 text-text-primary transition-transform",
                  menuOpen && "rotate-180",
                )}
              />
            </span>
            <span className="hidden truncate text-xs leading-tight text-text-secondary sm:block">
              {planLabel}
            </span>
          </span>
        </button>

        {menuOpen && menuPos && typeof document !== "undefined" && createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-300 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-surface-1 py-1 shadow-elev-3"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            {MENU_LINKS.map(({ label, href, icon: Icon }) => (
              <Link
                key={`${href}-${label}`}
                href={href}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 text-left no-underline transition-colors hover:bg-surface-2/60"
              >
                <Icon
                  size={18}
                  weight="regular"
                  className="shrink-0 text-text-tertiary"
                />
                <span className="text-[13px] font-medium text-text-primary">
                  {label}
                </span>
              </Link>
            ))}
            <div className="my-1 h-px bg-divider/60" />
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleLogout()}
              className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3.5 py-2.5 text-left transition-colors hover:bg-danger/5"
            >
              <SignOut
                size={18}
                weight="regular"
                className="shrink-0 text-danger"
              />
              <span className="text-[13px] font-medium text-danger">
                Encerrar sessão
              </span>
            </button>
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
}
