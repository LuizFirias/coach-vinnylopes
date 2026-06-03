"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { UserPlus, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import DumbbellLoader from "@/app/components/DumbbellLoader";

export default function NovoAlunoPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        const user = authData?.user;
        if (authError || !user) { router.replace("/login"); return; }

        const { data: profileData, error: profileError } = await supabaseClient
          .from("profiles").select("role").eq("id", user.id).single();

        if (profileError || profileData?.role !== "coach") { router.replace("/aluno/treinos"); return; }

        setIsCoach(true);
      } finally {
        setCheckingRole(false);
      }
    };

    checkRole();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setTemporaryPassword(null);

    if (!fullName.trim() || !email.trim()) { setError("Informe nome e e-mail"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim(), email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao criar aluno");

      setSuccess(data?.message || "Aluno cadastrado com sucesso!");
      setTemporaryPassword(data?.temporaryPassword);
      setFullName("");
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Erro ao criar aluno");
    } finally {
      setLoading(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-surface-1 p-12 rounded-2xl border border-border-subtle shadow-elev-1 text-text-secondary text-center text-sm uppercase tracking-caps">
          Acesso restrito para coach.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <ScreenHeader
        title="Recrutar Atleta"
        subtitle="Protocolo de convite e acesso imediato"
      />

      <div className="px-4 max-w-2xl flex flex-col gap-4">

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
            <div className="w-2 h-2 rounded-full bg-danger flex-shrink-0 animate-pulse" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex flex-col gap-4 px-4 py-4 rounded-xl bg-success-subtle border border-success-border">
            <div className="flex items-center gap-3 text-success text-sm">
              <CheckCircle size={18} />
              {success}
            </div>
            {temporaryPassword && (
              <div className="bg-surface-2 border border-border-default rounded-xl p-5 text-center">
                <p className="text-2xs uppercase tracking-caps text-text-tertiary mb-3">Senha Temporária de Ativação</p>
                <div className="text-3xl font-mono text-text-primary bg-surface-3 py-5 px-4 rounded-xl select-all border border-border-default mb-4 tracking-widest">
                  {temporaryPassword}
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-danger-subtle border border-danger-border text-danger rounded-lg">
                  <span className="text-xs">Copie e forneça ao atleta agora</span>
                </div>
              </div>
            )}
          </div>
        )}

        <Card className="rounded-2xl shadow-elev-1">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Nome completo do atleta"
              name="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: João Vitor Performance"
              disabled={loading}
            />
            <Input
              label="E-mail de cadastro"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="atleta@email.com"
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              leftIcon={<UserPlus size={16} />}
              fullWidth
            >
              Liberar Acesso Agora
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
