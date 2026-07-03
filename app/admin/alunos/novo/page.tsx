"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { UserPlus, CheckCircle, ArrowLeft, X, WhatsappLogo } from "@phosphor-icons/react";
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
  const [whatsapp, setWhatsapp] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [objetivo, setObjetivo] = useState("bulking");
  const [tipoPlano, setTipoPlano] = useState("mensal");
  const [dataExpiracao, setDataExpiracao] = useState("");
  const [valorPlano, setValorPlano] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  // Success Modal States
  const [showModal, setShowModal] = useState(false);
  const [createdStudentName, setCreatedStudentName] = useState("");
  const [createdStudentPhone, setCreatedStudentPhone] = useState("");
  const [createdStudentLink, setCreatedStudentLink] = useState("");

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        const user = authData?.user;
        if (authError || !user) { router.replace("/login"); return; }

        const { data: profileData, error: profileError } = await supabaseClient
          .from("profiles").select("role").eq("id", user.id).single();

        if (profileError || (profileData?.role !== "coach" && profileData?.role !== "super_admin")) { 
          router.replace("/aluno/dashboard"); 
          return; 
        }

        setIsCoach(true);
      } finally {
        setCheckingRole(false);
      }
    };

    checkRole();
  }, [router]);

  // Autopopulate dataExpiracao based on plan selection (today + X days)
  useEffect(() => {
    // 'outros' não tem validade automática — o coach define manualmente
    if (tipoPlano === "outros") return;

    const today = new Date();
    let daysToAdd = 30;
    if (tipoPlano === "trimestral") daysToAdd = 90;
    else if (tipoPlano === "semestral") daysToAdd = 180;
    else if (tipoPlano === "anual") daysToAdd = 365;

    const expiryDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const yyyy = expiryDate.getFullYear();
    const mm = String(expiryDate.getMonth() + 1).padStart(2, "0");
    const dd = String(expiryDate.getDate()).padStart(2, "0");
    setDataExpiracao(`${yyyy}-${mm}-${dd}`);
  }, [tipoPlano]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim()) { 
      setError("Informe nome e e-mail"); 
      return; 
    }

    if (!whatsapp.trim()) {
      setError("O número do WhatsApp é obrigatório para envio do convite.");
      return;
    }

    setLoading(true);
    try {
      // Clean phone number format for WhatsApp (ensure it begins with 55 if Brazilian standard 10-11 digits)
      let cleanedPhone = whatsapp.replace(/\D/g, "");
      if (cleanedPhone.length === 10 || cleanedPhone.length === 11) {
        cleanedPhone = `55${cleanedPhone}`;
      }

      // Buscar o token de sessão ativo para enviar no header Authorization
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token || "";

      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ 
          full_name: fullName.trim(), 
          email: email.trim(),
          whatsapp: cleanedPhone,
          date_of_birth: dateOfBirth || null,
          objetivo: objetivo || null,
          tipo_plano: tipoPlano || null,
          data_expiracao: dataExpiracao || null,
          valor_plano: valorPlano ? parseFloat(valorPlano) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao criar aluno");

      // Setup success modal states
      setCreatedStudentName(fullName.trim());
      setCreatedStudentPhone(cleanedPhone);
      setCreatedStudentLink(data?.inviteLink || "https://www.auronfit.com.br/login");
      setShowModal(true);
      
      // Clear form
      setFullName("");
      setEmail("");
      setWhatsapp("");
      setDateOfBirth("");
      setObjetivo("manutencao");
      setTipoPlano("mensal");
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
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28 relative">
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

        <Card className="rounded-xl shadow-sm border border-border-subtle/80 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative">
              
              {/* Coluna 1: DADOS BÁSICOS */}
              <div className="flex flex-col gap-5">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-2">
                  DADOS BÁSICOS
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
                  label="WhatsApp (com DDD)"
                  name="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
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

              {/* Coluna 2: ACOMPANHAMENTO & PLANO */}
              <div className="flex flex-col gap-5">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-2">
                  ACOMPANHAMENTO & PLANO
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
                    { value: "outros", label: "Outros" },
                  ]}
                />

                <Input
                  label="Valor do plano (R$)"
                  name="valorPlano"
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorPlano}
                  onChange={(e) => setValorPlano(e.target.value)}
                  placeholder="Ex: 350,00"
                  disabled={loading}
                />

                <Input
                  label={tipoPlano === "outros" ? "Data de vencimento (informe manualmente)" : "Data de vencimento / próxima renovação"}
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

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-1 border border-border-subtle rounded-2xl w-full max-w-md p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button 
              type="button" 
              onClick={() => { setShowModal(false); router.push("/admin/alunos"); }}
              className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors p-1"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-success/15 border border-success-border flex items-center justify-center text-success">
                <CheckCircle size={24} weight="fill" />
              </div>
              <h3 className="font-display font-bold text-lg text-white">Aluno cadastrado!</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                O perfil de <strong>{createdStudentName}</strong> foi criado e ativado. Envie o link de acesso diretamente para o WhatsApp dele para criar a senha.
              </p>
            </div>

            {/* Magic Link Box */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary block">Link Único de Ativação</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdStudentLink}
                  className="flex-1 h-9 bg-surface-3 border border-border-subtle text-text-primary px-3 rounded-lg text-2xs focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdStudentLink);
                    alert("Link copiado!");
                  }}
                  className="px-3 h-9 bg-brand hover:bg-brand-hover text-text-on-brand rounded-lg text-2xs font-semibold transition-all"
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              <a
                href={`https://wa.me/${createdStudentPhone}?text=${encodeURIComponent(
                  `Fala ${createdStudentName}! Seu perfil no AURON está pronto. Acesse este link para criar sua senha e ver seu treino: ${createdStudentLink}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 bg-[#25D366] hover:bg-[#20BA56] text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <WhatsappLogo size={18} weight="fill" />
                Enviar convite por WhatsApp
              </a>
              <button
                type="button"
                onClick={() => { setShowModal(false); router.push("/admin/alunos"); }}
                className="w-full h-11 bg-surface-3 hover:bg-surface-2 border border-border-subtle text-text-primary rounded-lg text-xs font-semibold transition-all"
              >
                Concluir e voltar à base
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
