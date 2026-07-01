"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { UserPlus, CheckCircle, ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import Link from "next/link";
import { Select } from "@/components/ui/Select";

export default function NovoAlunoPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [objetivo, setObjetivo] = useState("bulking");
  const [tipoPlano, setTipoPlano] = useState("mensal");
  const [dataExpiracao, setDataExpiracao] = useState("");

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

        if (profileError || (profileData?.role !== "coach" && profileData?.role !== "super_admin")) { router.replace("/aluno/dashboard"); return; }

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
        body: JSON.stringify({ 
          full_name: fullName.trim(), 
          email: email.trim(),
          date_of_birth: dateOfBirth || null,
          objetivo: objetivo || null,
          tipo_plano: tipoPlano || null,
          data_expiracao: dataExpiracao || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao criar aluno");

      setSuccess(data?.message || "Aluno cadastrado com sucesso!");
      setTemporaryPassword(data?.temporaryPassword);
      
      // Limpar formulário
      setFullName("");
      setEmail("");
      setDateOfBirth("");
      setObjetivo("bulking");
      setTipoPlano("mensal");
      setDataExpiracao("");
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
        <div className="max-w-2xl w-full bg-surface-1 p-12 rounded-xl border border-border-subtle shadow-sm text-text-secondary text-center text-sm uppercase tracking-caps">
          Acesso restrito para coach.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <Link href="/admin/alunos" className="inline-flex items-center gap-1.5 text-[13px] text-text-tertiary hover:text-text-primary transition-colors mb-4">
          <ArrowLeft size={14} /> Voltar para a base
        </Link>
      </div>

      <ScreenHeader
        title="Adicionar aluno"
        subtitle="Preencha os dados básicos para iniciar o acompanhamento"
      />

      <div className="px-4 max-w-4xl mx-auto flex flex-col gap-5">

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-danger-subtle border border-danger-border text-danger text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0 animate-pulse" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex flex-col gap-4 px-4 py-4 rounded-xl bg-success-subtle border border-success-border">
            <div className="flex items-center gap-3 text-success text-xs font-semibold">
              <CheckCircle size={16} />
              {success}
            </div>
            {temporaryPassword && (
              <div className="bg-surface-2 border border-border-default rounded-xl p-5 text-center">
                <p className="text-[10px] uppercase tracking-caps text-text-tertiary mb-3 font-bold">Senha Temporária de Ativação</p>
                <div className="text-2xl font-mono text-text-primary bg-surface-3 py-3 px-4 rounded-lg select-all border border-border-default mb-4 tracking-widest font-bold">
                  {temporaryPassword}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-danger-subtle border border-danger-border text-danger rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Copie e forneça ao aluno agora</span>
                </div>
              </div>
            )}
          </div>
        )}

        <Card className="rounded-xl shadow-sm border border-border-subtle/80 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative">
              
              {/* Coluna 1: Dados Básicos */}
              <div className="flex flex-col gap-5">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-2">
                  Dados Básicos
                </h3>
                
                <Input
                  label="Nome completo do aluno"
                  name="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: João Vitor Silva"
                  disabled={loading}
                  required
                />
                
                <Input
                  label="E-mail de cadastro"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aluno@email.com"
                  disabled={loading}
                  required
                />
                
                <Input
                  label="Data de nascimento (opcional)"
                  name="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Vertical divider visible on md and above */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border-subtle/70" />

              {/* Coluna 2: Plano & Acompanhamento */}
              <div className="flex flex-col gap-5">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-2">
                  Acompanhamento & Plano
                </h3>

                <Select
                  label="Objetivo"
                  value={objetivo}
                  onChange={setObjetivo}
                  disabled={loading}
                  options={[
                    { value: "bulking", label: "Hipertrofia (Bulking)" },
                    { value: "cutting", label: "Emagrecimento (Cutting)" },
                    { value: "recomposicao", label: "Definição (Recomposição)" },
                    { value: "manutencao", label: "Condicionamento / Saúde / Outro" },
                  ]}
                />

                <Select
                  label="Plano Contratado"
                  value={tipoPlano}
                  onChange={setTipoPlano}
                  disabled={loading}
                  options={[
                    { value: "mensal", label: "Mensal" },
                    { value: "trimestral", label: "Trimestral" },
                    { value: "semestral", label: "Semestral" },
                    { value: "anual", label: "Anual" },
                  ]}
                />

                <Input
                  label="Data de vencimento / próxima renovação"
                  name="dataExpiracao"
                  type="date"
                  value={dataExpiracao}
                  onChange={(e) => setDataExpiracao(e.target.value)}
                  disabled={loading}
                />
              </div>

            </div>

            <div className="pt-4 border-t border-border-subtle/50">
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                leftIcon={<UserPlus size={15} />}
                fullWidth
              >
                Cadastrar e liberar acesso
              </Button>
            </div>
            
          </form>
        </Card>
      </div>
    </div>
  );
}
