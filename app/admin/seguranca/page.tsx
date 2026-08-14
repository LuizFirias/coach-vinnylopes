"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Info,
  LockKey,
  ShieldCheck,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { supabaseClient } from "@/lib/supabaseClient";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { BackButton } from "@/app/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { BodyPortal, useLockBodyScroll } from "@/app/components/ui/BodyPortal";
import { Card } from "@/components/ui/Card";
import {
  getPushPermission,
  isPushSupported,
  isSubscribedToPush,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";

const ATIVADA_DESATIVADA = [
  { value: "on", label: "Ativada" },
  { value: "off", label: "Desativada" },
];

const TERMOS_OPTS = [
  { value: "on", label: "Aceito os Termos e Condições" },
  { value: "off", label: "Não aceito os Termos e Condições" },
];

const POLITICA_OPTS = [
  { value: "on", label: "Aceito a Política de Privacidade" },
  { value: "off", label: "Não aceito a Política de Privacidade" },
];

const MARKETING_OPTS = [
  { value: "all", label: "Quero receber todas as comunicações" },
  { value: "personalized", label: "Quero receber acompanhamento personalizado" },
  { value: "none", label: "Não quero receber comunicações" },
];

const BROWSER_OPTS = [
  { value: "on", label: "Quero receber notificações" },
  { value: "off", label: "Não quero receber notificações" },
];

const RESUMO_OPTS = [
  { value: "on", label: "Quero receber e-mails com o meu resumo do mês" },
  { value: "off", label: "Não quero receber e-mails com o meu resumo do mês" },
];

function prefsKey(userId: string) {
  return `auron-seguranca-prefs:${userId}`;
}

type MarketingPref = "all" | "personalized" | "none";

type LocalPrefs = {
  marketing: MarketingPref;
  monthlySummary: "on" | "off";
  termos: "on" | "off";
  politica: "on" | "off";
};

function FieldLabel({
  htmlFor,
  children,
  infoHref,
  infoLabel,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  infoHref?: string;
  infoLabel?: string;
}) {
  return (
    <div className="mb-1.5 flex w-full items-center justify-between gap-2">
      <label
        htmlFor={htmlFor}
        className="text-sm font-normal text-text-tertiary"
      >
        {children}
      </label>
      {infoHref && (
        <Link
          href={infoHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={infoLabel ?? "Abrir documento"}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary hover:text-brand"
        >
          <Info size={18} />
        </Link>
      )}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="auron-widget-card overflow-visible">
      <h2 className="flex items-center gap-2 border-b border-border-subtle px-4 py-3.5 text-base font-semibold text-text-primary sm:px-5">
        <span className="text-text-tertiary">{icon}</span>
        {title}
      </h2>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

export default function SegurancaPrivacidadePage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState(true);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const [twoFaSms, setTwoFaSms] = useState("off");
  const [twoFaEmail, setTwoFaEmail] = useState("off");
  const [twoFaHint, setTwoFaHint] = useState<string | null>(null);

  const [marketing, setMarketing] = useState<MarketingPref>("all");
  const [monthlySummary, setMonthlySummary] = useState<"on" | "off">("on");
  const [termos, setTermos] = useState<"on" | "off">("on");
  const [politica, setPolitica] = useState<"on" | "off">("on");
  const [browserPush, setBrowserPush] = useState<"on" | "off">("off");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushHint, setPushHint] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useLockBodyScroll(deleteOpen);

  const persistPrefs = useCallback(
    (next: LocalPrefs) => {
      if (!userId) return;
      try {
        localStorage.setItem(prefsKey(userId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [userId],
  );

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      const user = session?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? null);
      setEmailConfirmed(Boolean(user.email_confirmed_at));

      try {
        const raw = localStorage.getItem(prefsKey(user.id));
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<LocalPrefs> & {
            marketing?: string;
          };
          if (
            parsed.marketing === "all" ||
            parsed.marketing === "personalized" ||
            parsed.marketing === "none"
          ) {
            setMarketing(parsed.marketing);
          } else if (parsed.marketing === "on") {
            setMarketing("all");
          } else if (parsed.marketing === "off") {
            setMarketing("none");
          }
          if (parsed.monthlySummary === "on" || parsed.monthlySummary === "off") {
            setMonthlySummary(parsed.monthlySummary);
          }
          if (parsed.termos === "on" || parsed.termos === "off") {
            setTermos(parsed.termos);
          }
          if (parsed.politica === "on" || parsed.politica === "off") {
            setPolitica(parsed.politica);
          }
        }
      } catch {
        /* ignore */
      }

      if (isPushSupported()) {
        const sub = await isSubscribedToPush();
        const perm = getPushPermission();
        setBrowserPush(sub && perm === "granted" ? "on" : "off");
      }
      setLoading(false);
    })();
  }, []);

  const handleTwoFa = (channel: "sms" | "email", value: string) => {
    if (value === "on") {
      setTwoFaHint(
        "A autenticação em duas etapas por SMS e e-mail ainda não está disponível. Por enquanto permanece Desativada.",
      );
      if (channel === "sms") setTwoFaSms("off");
      else setTwoFaEmail("off");
      return;
    }
    setTwoFaHint(null);
    if (channel === "sms") setTwoFaSms("off");
    else setTwoFaEmail("off");
  };

  const handleBrowserPush = async (value: string) => {
    setPushBusy(true);
    setPushHint(null);
    try {
      if (value === "on") {
        const result = await subscribeToPush();
        if (!result.ok) {
          setBrowserPush("off");
          setPushHint(result.error);
          return;
        }
        setBrowserPush("on");
      } else {
        await unsubscribeFromPush();
        setBrowserPush("off");
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendBusy(true);
    setResendMsg(null);
    try {
      const { error } = await supabaseClient.auth.resend({
        type: "signup",
        email,
      });
      if (error) {
        setResendMsg("Não foi possível reenviar. Tente de novo em instantes.");
        return;
      }
      setResendMsg("Enviamos um novo e-mail de confirmação.");
    } finally {
      setResendBusy(false);
    }
  };

  const mailboxUrl = email?.toLowerCase().includes("@gmail")
    ? "https://mail.google.com/mail/u/0/#search/from:auronfit"
    : "https://mail.google.com/";

  const handleDelete = async () => {
    if (deleteInput.trim().toUpperCase() !== "EXCLUIR") {
      setDeleteError('Digite EXCLUIR para confirmar.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await supabaseClient.rpc("delete_user_account");
      if (error) throw error;
      try {
        await supabaseClient.auth.signOut({ scope: "local" });
      } catch {
        /* ignore */
      }
      localStorage.clear();
      try {
        await fetch("/api/session", { method: "DELETE" });
      } catch {
        /* ignore */
      }
      window.location.href = "/login";
    } catch {
      setDeleteError("Não foi possível excluir a conta. Fale com o suporte se o problema continuar.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0 lg:pl-28">
        <DumbbellLoader />
      </div>
    );
  }

  return (
    <div className="auron-settings-page min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <div className="mx-auto flex w-full max-w-[min(860px,96vw)] flex-col gap-5 px-4 pt-4 sm:max-w-[66%] md:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <BackButton href="/admin/perfil" aria-label="Voltar ao perfil" />
          <h1 className="text-2xl font-medium text-text-primary sm:text-[28px] sm:font-normal">
            Segurança e privacidade
          </h1>
        </div>

        {!emailConfirmed && (
          <div className="flex flex-col gap-3 rounded-xl bg-warning/15 px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
              <Warning size={22} className="mt-0.5 shrink-0 self-center text-warning" />
              <p className="text-sm leading-relaxed text-warning">
                Confirme o seu endereço de e-mail para ativar a sua conta, caso
                contrário o seu acesso ao Auronfit será restringido.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              <button
                type="button"
                disabled={resendBusy}
                onClick={() => void handleResend()}
                className="inline-flex h-10 items-center rounded-lg bg-warning px-3 text-xs font-semibold text-white disabled:opacity-50"
              >
                {resendBusy ? "Enviando..." : "Reenviar e-mail de confirmação"}
              </button>
              <a
                href={mailboxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center px-3 text-xs font-medium text-warning hover:underline"
              >
                Abrir e-mail
              </a>
            </div>
          </div>
        )}
        {resendMsg && (
          <p className="text-xs text-text-secondary">{resendMsg}</p>
        )}

        <SectionCard
          icon={<LockKey size={22} />}
          title="Autenticação de dois fatores"
        >
          {twoFaHint && (
            <p className="mb-3 text-xs leading-relaxed text-text-tertiary">
              {twoFaHint}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="2fa-sms">SMS</FieldLabel>
              <Select
                id="2fa-sms"
                value={twoFaSms}
                onChange={(v) => handleTwoFa("sms", v)}
                options={ATIVADA_DESATIVADA}
              />
            </div>
            <div>
              <FieldLabel htmlFor="2fa-email">E-mail</FieldLabel>
              <Select
                id="2fa-email"
                value={twoFaEmail}
                onChange={(v) => handleTwoFa("email", v)}
                options={ATIVADA_DESATIVADA}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={<ShieldCheck size={22} />} title="Privacidade">
          <div className="flex flex-col gap-4">
            <div>
              <FieldLabel
                htmlFor="termos"
                infoHref="/termos"
                infoLabel="Abrir Termos de Uso"
              >
                Termos de Utilização
              </FieldLabel>
              <Select
                id="termos"
                value={termos}
                onChange={(v) => {
                  const next = v === "on" ? "on" : "off";
                  setTermos(next);
                  persistPrefs({
                    marketing,
                    monthlySummary,
                    termos: next,
                    politica,
                  });
                }}
                options={TERMOS_OPTS}
              />
            </div>
            <div>
              <FieldLabel
                htmlFor="politica"
                infoHref="/privacidade"
                infoLabel="Abrir Política de Privacidade"
              >
                Política de Privacidade
              </FieldLabel>
              <Select
                id="politica"
                value={politica}
                onChange={(v) => {
                  const next = v === "on" ? "on" : "off";
                  setPolitica(next);
                  persistPrefs({
                    marketing,
                    monthlySummary,
                    termos,
                    politica: next,
                  });
                }}
                options={POLITICA_OPTS}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={<Bell size={22} />} title="Notificações">
          {pushHint && (
            <p className="mb-3 text-xs leading-relaxed text-danger">{pushHint}</p>
          )}
          <div className="flex flex-col gap-4">
            <div>
              <FieldLabel htmlFor="marketing">Comunicações de marketing</FieldLabel>
              <Select
                id="marketing"
                value={marketing}
                onChange={(v) => {
                  const next: MarketingPref =
                    v === "personalized" || v === "none" ? v : "all";
                  setMarketing(next);
                  persistPrefs({
                    marketing: next,
                    monthlySummary,
                    termos,
                    politica,
                  });
                }}
                options={MARKETING_OPTS}
              />
            </div>
            <div>
              <FieldLabel htmlFor="browser-push">Notificações do browser</FieldLabel>
              <Select
                id="browser-push"
                value={browserPush}
                onChange={(v) => void handleBrowserPush(v)}
                options={BROWSER_OPTS}
                disabled={pushBusy || !isPushSupported()}
                helperText={
                  !isPushSupported()
                    ? "Este navegador não suporta notificações."
                    : undefined
                }
              />
            </div>
            <div>
              <FieldLabel htmlFor="resumo-mes">
                E-mails com o meu resumo do mês
              </FieldLabel>
              <Select
                id="resumo-mes"
                value={monthlySummary}
                onChange={(v) => {
                  const next = v === "on" ? "on" : "off";
                  setMonthlySummary(next);
                  persistPrefs({
                    marketing,
                    monthlySummary: next,
                    termos,
                    politica,
                  });
                }}
                options={RESUMO_OPTS}
              />
            </div>
          </div>
        </SectionCard>

        <div className="pt-1">
          <Button
            variant="danger"
            fullWidth
            className="h-12 justify-between px-4"
            rightIcon={<Trash size={20} />}
            onClick={() => {
              setDeleteStep(1);
              setDeleteInput("");
              setDeleteError(null);
              setDeleteOpen(true);
            }}
          >
            Excluir definitivamente a minha conta
          </Button>
        </div>
      </div>

      {deleteOpen && deleteStep === 1 && (
        <ConfirmModal
          open
          title="Excluir a conta?"
          description="Você vai perder alunos vinculados, treinos, histórico e dados da consultoria. Esta ação não pode ser desfeita."
          confirmLabel="Continuar"
          cancelLabel="Manter conta"
          confirmVariant="danger"
          onConfirm={() => setDeleteStep(2)}
          onClose={() => !deleting && setDeleteOpen(false)}
        />
      )}

      {deleteOpen && deleteStep === 2 && (
        <BodyPortal>
          <div
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
            role="dialog"
            aria-modal
            onClick={() => !deleting && setDeleteOpen(false)}
          >
            <Card
              className="w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-2 text-lg font-semibold text-text-primary">
                Confirme a exclusão
              </h3>
              <p className="mb-4 text-sm text-text-secondary">
                Digite <span className="font-semibold text-text-primary">EXCLUIR</span>{" "}
                para apagar a conta de forma permanente.
              </p>
              <Input
                value={deleteInput}
                onChange={(e) => {
                  setDeleteInput(e.target.value);
                  setDeleteError(null);
                }}
                placeholder="EXCLUIR"
                error={deleteError ?? undefined}
              />
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="danger"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                >
                  {deleting ? "Excluindo..." : "Excluir definitivamente"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={deleting}
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          </div>
        </BodyPortal>
      )}
    </div>
  );
}
