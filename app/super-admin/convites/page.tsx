"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  Copy,
  Link as LinkIcon,
  WarningCircle,
} from "@phosphor-icons/react";
import { supabaseClient } from "@/lib/supabaseClient";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { SuperAdminPageShell } from "@/app/super-admin/SuperAdminPageShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { readApiJson } from "@/lib/utils/parseApiResponse";

type AccountType = "teste" | "parceiro";

interface InviteRow {
  id: string;
  code: string;
  account_type: AccountType;
  student_limit: number | null;
  max_uses: number;
  uses_count: number;
  notes: string | null;
  created_at: string;
  inviteLink: string;
  isExhausted: boolean;
}

interface CreatedInvite extends InviteRow {}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function accountTypeLabel(type: AccountType): string {
  return type === "parceiro" ? "Parceiro" : "Teste";
}

export default function SuperAdminConvitesPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [accountType, setAccountType] = useState<AccountType>("teste");
  const [notes, setNotes] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [studentLimit, setStudentLimit] = useState("15");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [lastCreated, setLastCreated] = useState<CreatedInvite | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/super-admin/invites", { headers });
      const json = await readApiJson<{ invites?: InviteRow[]; error?: string }>(res);

      if (!res.ok) {
        throw new Error(json.error || "Erro ao carregar convites");
      }

      setInvites(json.invites ?? []);
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "Erro ao carregar convites";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setMessage({ type: "error", text: "Não foi possível copiar." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setLastCreated(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/super-admin/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          accountType,
          notes: notes.trim() || null,
          maxUses: Number(maxUses),
          studentLimit: accountType === "teste" ? Number(studentLimit) : null,
        }),
      });

      const json = await readApiJson<{ invite: CreatedInvite; error?: string }>(res);
      if (!res.ok) {
        throw new Error(json.error || "Erro ao criar convite");
      }

      const invite: CreatedInvite = {
        ...json.invite,
        isExhausted: json.invite.uses_count >= json.invite.max_uses,
      };

      setLastCreated(invite);
      setInvites((prev) => [invite, ...prev]);
      setMessage({
        type: "success",
        text: `Convite ${invite.code} criado.`,
      });
      setNotes("");
      setMaxUses("1");
      setStudentLimit("15");
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "Erro ao criar convite";
      setMessage({ type: "error", text });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && invites.length === 0) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center lg:pl-28">
        <DumbbellLoader text="Carregando convites..." />
      </div>
    );
  }

  return (
    <SuperAdminPageShell
      title="Convites"
      subtitle="Links de cadastro para contas teste e parceiro"
      backHref="/super-admin"
      backLabel="Master Control"
      maxWidth="7xl"
      headerAction={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={loadInvites}
          disabled={loading}
        >
          Atualizar lista
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        <Card className="lg:col-span-2 rounded-xl border border-card p-4 md:p-5 shadow-sm h-fit">
          <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-divider pb-2 mb-4">
            Novo convite
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Select
              label="Tipo de conta"
              value={accountType}
              onChange={(v) => setAccountType(v as AccountType)}
              disabled={submitting}
              options={[
                { value: "teste", label: "Teste (limite de alunos)" },
                { value: "parceiro", label: "Parceiro (ilimitado)" },
              ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Usos permitidos"
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                disabled={submitting}
              />

              {accountType === "teste" ? (
                <Input
                  label="Limite de alunos"
                  type="number"
                  min={1}
                  value={studentLimit}
                  onChange={(e) => setStudentLimit(e.target.value)}
                  disabled={submitting}
                />
              ) : (
                <div className="flex flex-col gap-1.5 justify-end">
                  <span className="text-xs font-medium text-text-secondary">Limite de alunos</span>
                  <p className="h-10 flex items-center px-3 rounded-md bg-surface-2 border border-input text-xs text-text-tertiary">
                    Ilimitado
                  </p>
                </div>
              )}
            </div>

            <Input
              label="Nome / referência"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Academia XPTO"
              disabled={submitting}
            />

            {message && (
              <div
                className={cn(
                  "flex items-start gap-2 px-3 py-2 rounded-lg text-xs",
                  message.type === "success"
                    ? "bg-success-subtle border border-success-border text-success"
                    : "bg-danger-subtle border border-danger-border text-danger"
                )}
              >
                {message.type === "success" ? (
                  <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <WarningCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {lastCreated && (
              <div className="rounded-lg bg-surface-2 border border-card p-3 space-y-2">
                <p className="text-xs font-semibold text-text-primary">Link gerado</p>
                <p className="text-xs text-brand font-mono break-all">{lastCreated.code}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyText(lastCreated.code, `code-${lastCreated.id}`)}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    className="flex-1"
                  >
                    {copiedId === `code-${lastCreated.id}` ? "Copiado" : "Código"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => copyText(lastCreated.inviteLink, `link-${lastCreated.id}`)}
                    leftIcon={<LinkIcon className="w-3.5 h-3.5" />}
                    className="flex-1"
                  >
                    {copiedId === `link-${lastCreated.id}` ? "Copiado" : "Link"}
                  </Button>
                </div>
              </div>
            )}

            <Button type="submit" size="sm" loading={submitting} fullWidth>
              Gerar convite
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-3 rounded-xl border border-card p-0 shadow-sm overflow-hidden">
          <div className="px-4 py-3 md:px-5 border-b border-divider flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-text-primary">Convites recentes</h2>
              <p className="text-xs text-text-tertiary mt-0.5">{invites.length} no histórico</p>
            </div>
          </div>

          {invites.length === 0 ? (
            <p className="px-4 py-10 md:px-5 text-center text-xs text-text-tertiary">
              Nenhum convite criado ainda.
            </p>
          ) : (
            <div className="divide-y divide-divider/70 max-h-[min(70vh,640px)] overflow-y-auto">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="px-4 py-3 md:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary truncate max-w-full">
                        {invite.code}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary">
                        {accountTypeLabel(invite.account_type)}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          invite.isExhausted
                            ? "bg-danger-subtle text-danger"
                            : "bg-success-subtle text-success"
                        )}
                      >
                        {invite.uses_count}/{invite.max_uses}
                      </span>
                    </div>

                    {invite.notes && (
                      <p className="text-xs text-text-secondary mt-1 truncate">{invite.notes}</p>
                    )}

                    <p className="text-[11px] text-text-tertiary mt-1">
                      {invite.account_type === "teste"
                        ? `${invite.student_limit ?? 15} alunos`
                        : "Ilimitado"}
                      {" · "}
                      {formatDate(invite.created_at)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyText(invite.inviteLink, invite.id)}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    {copiedId === invite.id ? "Copiado" : "Copiar link"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SuperAdminPageShell>
  );
}
