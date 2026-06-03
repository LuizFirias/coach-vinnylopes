"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { ShieldCheck, UserPlus, Envelope, Shield, CaretDown, CheckCircle, WarningCircle } from "@phosphor-icons/react";
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
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 antialiased">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col items-center text-center pt-4 pb-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-subtle border border-brand-border rounded-xl mb-6">
            <ShieldCheck className="w-4 h-4 text-brand" />
            <span className="text-2xs font-semibold uppercase tracking-caps text-brand">Controle Executivo</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight uppercase mb-2">
            Gerenciar <span className="text-brand">Acessos</span>
          </h1>
          <p className="text-xs text-text-tertiary uppercase tracking-caps">
            Controle de permissões e expansão da plataforma
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-1 border border-border-subtle shadow-elev-2 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brand-subtle border border-brand-border rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Novo Professor</h2>
              <p className="text-xs text-text-tertiary">Promova alunos ou conceda credenciais de Coach</p>
            </div>
          </div>

          <form onSubmit={handlePromote} className="space-y-5">
            <div className="space-y-2">
              <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">
                Nome Completo do Profissional
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Dr. Ricardo Silva"
                className="w-full h-14 bg-surface-0 border border-border-subtle text-text-primary px-5 rounded-2xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">
                E-mail de Cadastro
              </label>
              <div className="relative">
                <Envelope className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@consultoria.com"
                  required
                  className="w-full h-14 bg-surface-0 border border-border-subtle text-text-primary pl-12 pr-5 rounded-2xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">
                Nível de Autoridade
              </label>
              <div className="relative">
                <Shield className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-14 bg-surface-0 border border-border-subtle text-text-primary pl-12 pr-10 rounded-2xl text-sm focus:outline-none focus:border-brand/40 transition-colors appearance-none cursor-pointer uppercase tracking-wide"
                >
                  <option value="coach">Professor / Coach</option>
                  <option value="aluno">Usuário Aluno</option>
                  <option value="super_admin">Administrador Master</option>
                </select>
                <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              </div>
            </div>

            {message && (
              <div className={cn(
                "p-4 rounded-2xl text-xs flex items-center gap-3",
                message.type === "success"
                  ? "bg-brand-subtle border border-brand-border text-brand"
                  : "bg-danger/10 border border-danger/20 text-danger"
              )}>
                <div className={cn(
                  "p-1.5 rounded-lg flex-shrink-0",
                  message.type === "success" ? "bg-brand/20" : "bg-danger/20"
                )}>
                  {message.type === "success"
                    ? <CheckCircle className="w-4 h-4"  />
                    : <WarningCircle className="w-4 h-4"  />
                  }
                </div>
                <span className="font-medium">{message.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 bg-brand text-text-on-brand rounded-2xl text-xs font-semibold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-text-on-brand/20 border-t-text-on-brand rounded-full animate-spin" />
              ) : (
                "Aplicar Permissões Agora"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-text-disabled text-2xs uppercase tracking-caps px-4 leading-relaxed">
          O sistema processará o convite via e-mail e configurará o perfil automaticamente.
        </p>
      </div>
    </div>
  );
}
