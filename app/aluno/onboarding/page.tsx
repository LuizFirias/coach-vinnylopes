"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { Calendar, WarningCircle } from "@phosphor-icons/react";
import DumbbellLoader from "@/app/components/DumbbellLoader";

export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [coachName, setCoachName] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        const user = authData?.user;

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabaseClient
          .from("profiles")
          .select("role, first_access_completed, coaching_reference, full_name, must_change_password")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          router.replace("/login");
          return;
        }

        if (profileData.role !== "aluno") {
          router.replace("/admin/dashboard");
          return;
        }

        if (profileData.must_change_password) {
          router.replace("/aluno/trocar-senha");
          return;
        }

        if (profileData.first_access_completed && profileData.full_name) {
          router.replace("/aluno/dashboard");
          return;
        }

        setCoachName(profileData.coaching_reference);

        if (profileData.full_name) {
          setFullName(profileData.full_name);
        }
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Informe seu nome completo");
      return;
    }

    if (!dateOfBirth) {
      setError("Informe sua data de nascimento");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabaseClient.auth.getUser();
      const user = authData?.user;

      if (authError || !user) {
        setError("Sessão expirada. Faça login novamente");
        return;
      }

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          date_of_birth: dateOfBirth,
          first_access_completed: true,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Erro ao atualizar perfil:", updateError);
        setError("Erro ao salvar dados. Tente novamente.");
        return;
      }

      router.push("/aluno/dashboard");
    } catch (err) {
      console.error("Erro inesperado:", err);
      setError("Erro ao processar onboarding. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 flex flex-col items-center justify-center antialiased">
      {/* Glow decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-brand/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-brand/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-1">Coach Vinny</p>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Bem-vindo ao Time</h1>
        </div>

        {/* Card de boas-vindas */}
        <div className="bg-surface-1 border border-card shadow-elev-1 rounded-2xl p-6 text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-brand-subtle border border-brand-border rounded-2xl flex items-center justify-center">
            <Calendar className="w-7 h-7 text-brand" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary mb-1">Complete seu Perfil</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {coachName && (
                <>
                  Seu coach <span className="text-brand font-semibold">{coachName}</span> já criou sua conta.{" "}
                </>
              )}
              Precisamos de algumas informações para você começar.
            </p>
          </div>
        </div>

        {/* Formulário */}
        <div className="bg-surface-1 border border-card shadow-elev-1 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-2xl text-xs flex items-center gap-2">
                <WarningCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="fullName" className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">
                Seu Nome Completo
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="João Silva Santos"
                disabled={loading}
                className="w-full min-w-0 h-14 bg-surface-0 border border-input text-text-primary px-4 rounded-2xl text-base placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
              />
              <p className="text-2xs text-text-disabled ml-1">Visível para você e no ranking</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="dateOfBirth" className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">
                Data de Nascimento
              </label>
              <input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={loading}
                className="w-full min-w-0 h-14 bg-surface-0 border border-input text-text-primary px-4 rounded-2xl text-base focus:outline-none focus:border-brand/40 transition-colors [color-scheme:dark]"
              />
              <p className="text-2xs text-text-disabled ml-1">Necessário para cálculos de planejamento</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 bg-brand text-text-on-brand rounded-2xl text-xs font-semibold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-text-on-brand/20 border-t-text-on-brand rounded-full animate-spin" />
              ) : (
                "Começar Meu Treino"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-text-disabled text-2xs uppercase tracking-caps">
          Informações protegidas, acessíveis apenas por você e seu coach
        </p>
      </div>
    </div>
  );
}
