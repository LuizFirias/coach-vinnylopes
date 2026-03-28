"use client";

import { useEffect, useState } from"react";
import { useRouter } from"next/navigation";
import { supabaseClient } from"@/lib/supabaseClient";
import { Calendar } from"lucide-react";
import DumbbellLoader from"@/app/components/DumbbellLoader";

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

        // Verifica se aluno e se ainda n�o completou onboarding
        const { data: profileData, error: profileError } = await supabaseClient
          .from("profiles")
          .select("role, first_access_completed, coaching_reference, full_name")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          router.replace("/login");
          return;
        }

        // Apenas alunos podem acessar
        if (profileData.role !=="aluno") {
          router.replace("/admin/dashboard");
          return;
        }

        // Se j� completou onboarding, ir para dashboard
        if (profileData.first_access_completed && profileData.full_name) {
          router.replace("/aluno/dashboard");
          return;
        }

        // Salva o nome de refer�ncia do coach para exibir
        setCoachName(profileData.coaching_reference);

        // Se full_name j� existe (caso raro), preenche o formul�rio
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
        setError("Sess�o expirada. Fa�a login novamente");
        return;
      }

      // Atualiza perfil com nome, data de nascimento e marca como first_access_completed
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

      // Redireciona para dashboard
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <DumbbellLoader text="Carregando..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header com logo e boas-vindas */}
      <div className="bg-gradient-to-b from-black to-gray-900 border-b border-gray-800 px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-4xl text-iron-gold mb-2">COACH VINNY</h1>
          <p className="text-gray-400 text-sm uppercase tracking-wider">Bem-vindo ao Time</p>
        </div>
      </div>

      {/* Conte�do principal */}
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Card de boas-vindas */}
        <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-lg p-8 mb-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-iron-gold/10 border-2 border-iron-gold rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-iron-gold" />
            </div>
            <h2 className="text-2xl text-white mb-2">Comple te seu Perfil</h2>
            <p className="text-gray-400 text-sm">
              {coachName && (
                <>
                  Seu coach <span className="text-iron-gold">{coachName}</span> j� criou sua conta.
                  <br />
                  <br />
                </>
              )}
              Agora precisamos de algumas informa��es seus para que voc� possa come�ar.
            </p>
          </div>
        </div>

        {/* Formul�rio */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-700/50 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Campo: Nome Completo */}
          <div>
            <label htmlFor="fullName" className="block text-sm text-gray-300 mb-2 uppercase tracking-wider">
              Seu Nome Completo
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jo�o Silva Santos"
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-iron-gold focus:ring-1 focus:ring-iron-gold/50 transition"
              disabled={loading}
            />
            <p className="text-gray-500 text-xs mt-1">Este � seu nome verdadeiro, vis�vel para voc� e para o ranking.</p>
          </div>

          {/* Campo: Data de Nascimento */}
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm text-gray-300 mb-2 uppercase tracking-wider">
              Data de Nascimento
            </label>
            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-iron-gold focus:ring-1 focus:ring-iron-gold/50 transition"
              disabled={loading}
            />
            <p className="text-gray-500 text-xs mt-1">Necess�rio para c�lculos de idade e planejamento.</p>
          </div>

          {/* Bot�o de Submiss�o */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-iron-gold to-yellow-500 hover:from-yellow-500 hover:to-iron-gold disabled:opacity-50 disabled:cursor-not-allowed text-black py-4 rounded-lg uppercase tracking-wider transition"
          >
            {loading ?"Salvando..." :"Come�ar Meu Treino"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-8 uppercase tracking-wider">
          Essas informa��es s�o protegidas e acess�veis apenas por voc� e seu coach
        </p>
      </div>
    </div>
  );
}

