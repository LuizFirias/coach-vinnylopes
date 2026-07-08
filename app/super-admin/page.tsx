"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  UserPlus,
  Ticket,
  CheckCircle,
  WarningCircle,
  ArrowRight,
} from "@phosphor-icons/react";
import { SuperAdminPageShell } from "@/app/super-admin/SuperAdminPageShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export default function SuperAdminPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("coach");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/super-admin/set-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email, role, full_name: fullName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao atualizar papel");
      }

      setMessage({ type: "success", text: data.message });
      setEmail("");
      setFullName("");
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "Erro ao atualizar papel";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SuperAdminPageShell
      title="Master Control"
      subtitle="Permissões de usuários e convites de acesso"
      maxWidth="7xl"
      headerAction={
        <Link
          href="/super-admin/convites"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hover text-text-on-brand text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-md shadow-brand/10"
        >
          <Ticket size={13} weight="bold" />
          Convites
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        <Card className="lg:col-span-3 rounded-xl border border-border-subtle/80 p-4 md:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border-subtle">
            <div className="w-9 h-9 rounded-lg bg-brand-subtle border border-brand-border flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 text-brand" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-text-primary">Gerenciar acessos</h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                Promova usuários ou defina papel no sistema
              </p>
            </div>
          </div>

          <form onSubmit={handlePromote} className="flex flex-col gap-4">
            <Input
              label="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Dr. Ricardo Silva"
              disabled={loading}
            />

            <Input
              label="E-mail de cadastro"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@consultoria.com"
              required
              disabled={loading}
            />

            <Select
              label="Nível de autoridade"
              value={role}
              onChange={setRole}
              disabled={loading}
              options={[
                { value: "coach", label: "Professor / Coach" },
                { value: "aluno", label: "Usuário Aluno" },
                { value: "super_admin", label: "Administrador Master" },
              ]}
            />

            {message && (
              <div
                className={cn(
                  "flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs",
                  message.type === "success"
                    ? "bg-success-subtle border border-success-border text-success"
                    : "bg-danger-subtle border border-danger-border text-danger"
                )}
              >
                {message.type === "success" ? (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span className="font-medium">{message.text}</span>
              </div>
            )}

            <Button type="submit" size="sm" loading={loading} fullWidth className="mt-1">
              Aplicar permissões
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <Link href="/super-admin/convites" className="block group">
            <Card
              variant="interactive"
              className="rounded-xl border border-border-subtle/80 p-4 md:p-5 h-full shadow-sm group-hover:border-brand/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-brand-subtle border border-brand-border flex items-center justify-center shrink-0">
                    <Ticket className="w-4 h-4 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-text-primary group-hover:text-brand transition-colors">
                      Convites teste e parceiro
                    </h2>
                    <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
                      Gere links de cadastro com limite de alunos, sem Mercado Pago.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-brand shrink-0 mt-1 transition-colors" />
              </div>
            </Card>
          </Link>

          <Card className="rounded-xl border border-border-subtle/80 p-4 md:p-5 shadow-sm">
            <p className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase mb-2">
              Sobre este painel
            </p>
            <ul className="text-xs text-text-secondary space-y-2 leading-relaxed">
              <li>· Acessos alteram o papel no perfil do usuário.</li>
              <li>· Convites criam contas coach com tipo teste ou parceiro.</li>
              <li>· Novos usuários recebem e-mail quando aplicável.</li>
            </ul>
          </Card>
        </div>
      </div>
    </SuperAdminPageShell>
  );
}
