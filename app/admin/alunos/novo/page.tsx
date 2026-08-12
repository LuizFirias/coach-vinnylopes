"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getBootstrapProfile } from "@/lib/auth/bootstrapProfile";
import { CaretDown, Check, CheckCircle, Info, X, WhatsappLogo } from "@phosphor-icons/react";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { BackButton } from "@/app/components/ui/BackButton";
import {
  fetchCoachCustomPlans,
  mergedPlans,
  type CoachPlan,
} from "@/lib/coachPlans";
import { readReturnUrl } from "@/lib/utils/adminNav";
import { concluirPasso } from "@/lib/onboarding/concluirPasso";

const DRAFT_KEY = "draft_novo_aluno";
const INPUT: CSSProperties = {
  background: "transparent",
  border: "none",
  outline: "none",
  boxShadow: "none",
  width: "100%",
  fontSize: 14,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  padding: 0,
  margin: 0,
  borderRadius: 0,
  minHeight: 0,
  WebkitAppearance: "none",
  appearance: "none",
};

type FlatOption = { value: string; label: string };

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addMonthsISO(iso: string, months: number) {
  const [y, m, day] = iso.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, day || 1);
  date.setMonth(date.getMonth() + months);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function FlatSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: FlatOption[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
        style={{
          ...INPUT,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span className={selected ? "text-text-primary" : "text-text-disabled"}>
          {selected?.label || "Selecione"}
        </span>
        <CaretDown
          size={14}
          weight="bold"
          className="text-brand shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-2 max-h-56 overflow-y-auto rounded-xl border border-brand-border bg-surface-2 p-1.5 shadow-[var(--elev-3)]"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={
                  active
                    ? "w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-lg text-[13px] font-semibold bg-brand/15 text-brand cursor-pointer border-0"
                    : "w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-lg text-[13px] font-medium text-text-primary hover:bg-brand/10 cursor-pointer border-0 bg-transparent"
                }
              >
                <span>{opt.label}</span>
                {active && <Check size={14} weight="bold" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FieldLabel({
  children,
  required,
  optional,
}: {
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div className="text-[11px] text-text-tertiary mb-1">
      {children}
      {required && <span className="text-brand"> *</span>}
      {optional && <span className="text-text-disabled font-normal"> opcional</span>}
    </div>
  );
}

function FieldCell({
  children,
  borderRight,
}: {
  children: ReactNode;
  borderRight?: boolean;
}) {
  return (
    <div
      className={
        borderRight
          ? "px-5 py-3.5 md:border-r md:border-border-divider lg:border-r-0 xl:border-r"
          : "px-5 py-3.5"
      }
    >
      {children}
    </div>
  );
}

function FieldRow({
  children,
  cols = 2,
  last,
}: {
  children: ReactNode;
  cols?: 1 | 2;
  last?: boolean;
}) {
  return (
    <div
      className={
        cols === 2
          ? // md: 2 cols quando a página ainda é 1 coluna; lg: 1 col dentro de cada metade; xl: 2 cols de novo
            `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2${last ? "" : " border-b border-border-divider"}`
          : `block${last ? "" : " border-b border-border-divider"}`
      }
    >
      {children}
    </div>
  );
}

function FieldGroup({ children }: { children: ReactNode }) {
  return (
    <div className="relative rounded-2xl mb-6 overflow-visible bg-surface-1 border border-border-subtle">
      {children}
    </div>
  );
}

export default function NovoAlunoPage() {
  const router = useRouter();
  const goBack = () => {
    router.push(readReturnUrl(window.location.search, "/admin/alunos"));
  };
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [objetivo, setObjetivo] = useState("bulking");
  const [tipoPlano, setTipoPlano] = useState("mensal");
  const [dataInicio, setDataInicio] = useState(todayISO);
  const [dataExpiracao, setDataExpiracao] = useState("");
  const [valorPlano, setValorPlano] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [planosPersonalizados, setPlanosPersonalizados] = useState<CoachPlan[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [createdStudentName, setCreatedStudentName] = useState("");
  const [createdStudentPhone, setCreatedStudentPhone] = useState("");
  const [createdStudentLink, setCreatedStudentLink] = useState("");
  const [rascunhoSalvo, setRascunhoSalvo] = useState(false);
  const [temRascunho, setTemRascunho] = useState(false);
  const skipExpiryOnce = useRef(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const boot = await getBootstrapProfile();
        if (!boot) {
          router.replace("/login");
          return;
        }

        if (boot.role !== "coach" && boot.role !== "super_admin") {
          router.replace("/aluno/dashboard");
          return;
        }

        setIsCoach(true);

        try {
          const custom = await fetchCoachCustomPlans(boot.userId);
          setPlanosPersonalizados(custom);
        } catch {
          // sem planos personalizados — segue só com os padrão
        }
      } finally {
        setCheckingRole(false);
      }
    };

    checkRole();
  }, [router]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const d = JSON.parse(saved) as {
        fullName?: string;
        email?: string;
        whatsapp?: string;
        dateOfBirth?: string;
        objetivo?: string;
        tipoPlano?: string;
        valorPlano?: string;
        dataInicio?: string;
        dataExpiracao?: string;
      };
      skipExpiryOnce.current = true;
      if (d.fullName) setFullName(d.fullName);
      if (d.email) setEmail(d.email);
      if (d.whatsapp) setWhatsapp(d.whatsapp);
      if (d.dateOfBirth) setDateOfBirth(d.dateOfBirth);
      if (d.objetivo) setObjetivo(d.objetivo);
      if (d.tipoPlano) setTipoPlano(d.tipoPlano);
      if (d.valorPlano) setValorPlano(d.valorPlano);
      if (d.dataInicio) setDataInicio(d.dataInicio);
      if (d.dataExpiracao) setDataExpiracao(d.dataExpiracao);
      setTemRascunho(true);
    } catch {
      // rascunho inválido
    }
  }, []);

  useEffect(() => {
    if (tipoPlano === "outros") return;
    if (skipExpiryOnce.current) {
      skipExpiryOnce.current = false;
      return;
    }

    const plano = mergedPlans(planosPersonalizados).find((p) => p.slug === tipoPlano);
    const meses = plano?.duracao_meses ?? 1;
    const inicio = dataInicio || todayISO();
    if (!dataInicio) setDataInicio(inicio);
    setDataExpiracao(addMonthsISO(inicio, meses));

    if (plano?.custom && plano.valor_sugerido != null) {
      setValorPlano((v) => (v.trim() ? v : String(plano.valor_sugerido)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoPlano, planosPersonalizados]);

  // Recalcula vencimento quando a data de início muda (planos com duração conhecida)
  useEffect(() => {
    if (tipoPlano === "outros") return;
    if (skipExpiryOnce.current) return;
    if (!dataInicio) return;
    const plano = mergedPlans(planosPersonalizados).find((p) => p.slug === tipoPlano);
    const meses = plano?.duracao_meses ?? 1;
    setDataExpiracao(addMonthsISO(dataInicio, meses));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio]);

  const salvarRascunho = () => {
    const dados = {
      fullName,
      email,
      whatsapp,
      dateOfBirth,
      objetivo,
      tipoPlano,
      valorPlano,
      dataInicio,
      dataExpiracao,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(dados));
    setTemRascunho(true);
    setRascunhoSalvo(true);
    window.setTimeout(() => setRascunhoSalvo(false), 2000);
  };

  const descartarRascunho = () => {
    localStorage.removeItem(DRAFT_KEY);
    setTemRascunho(false);
    setFullName("");
    setEmail("");
    setWhatsapp("");
    setDateOfBirth("");
    setObjetivo("bulking");
    setTipoPlano("mensal");
    setValorPlano("");
    setDataInicio(todayISO());
    setDataExpiracao("");
  };

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

    if (!tipoPlano.trim()) {
      setError("Selecione o plano contratado.");
      return;
    }

    const valorNum = parseFloat(valorPlano);
    if (!valorPlano.trim() || Number.isNaN(valorNum) || valorNum < 0) {
      setError("Informe o valor do plano.");
      return;
    }

    setLoading(true);
    try {
      let cleanedPhone = whatsapp.replace(/\D/g, "");
      if (cleanedPhone.length === 10 || cleanedPhone.length === 11) {
        cleanedPhone = `55${cleanedPhone}`;
      }

      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token || "";

      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          whatsapp: cleanedPhone,
          date_of_birth: dateOfBirth || null,
          objetivo: objetivo || null,
          tipo_plano: tipoPlano || null,
          data_inicio: dataInicio || null,
          data_expiracao: dataExpiracao || null,
          valor_plano: valorPlano ? parseFloat(valorPlano) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao criar aluno");

      const coachId = sessionData?.session?.user?.id;
      if (coachId) await concluirPasso(coachId, "cadastrar-aluno");

      setCreatedStudentName(fullName.trim());
      setCreatedStudentPhone(cleanedPhone);
      setCreatedStudentLink(data?.inviteLink || "https://www.auronfit.com.br/login");
      setShowModal(true);
      localStorage.removeItem(DRAFT_KEY);
      setTemRascunho(false);

      setFullName("");
      setEmail("");
      setWhatsapp("");
      setDateOfBirth("");
      setObjetivo("manutencao");
      setTipoPlano("mensal");
      setValorPlano("");
      setDataInicio(todayISO());
      setDataExpiracao("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar aluno";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <DumbbellLoader />
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-0">
        <div className="max-w-2xl w-full p-12 rounded-xl bg-surface-1 text-text-secondary text-center text-sm uppercase tracking-caps">
          Acesso restrito para coach.
        </div>
      </div>
    );
  }

  const valorOk =
    Boolean(valorPlano.trim()) &&
    !Number.isNaN(parseFloat(valorPlano)) &&
    parseFloat(valorPlano) >= 0;
  const canSubmit =
    Boolean(fullName.trim() && email.trim() && tipoPlano.trim() && valorOk) && !loading;

  return (
    <div className="min-h-screen pb-24 bg-surface-0">
      {/* MainWrapper já aplica ml do sidebar — não repetir aqui */}
      <div className="w-full flex justify-center px-4 sm:px-8 pt-4 pb-8 sm:pt-6 sm:pb-10">
        <div className="w-full max-w-2xl lg:max-w-5xl">
        <div className="flex items-center gap-2.5 mb-1">
          <BackButton onClick={goBack} />
          <p className="text-xl font-semibold text-text-primary leading-tight">
            Adicionar aluno
          </p>
        </div>
        <p className="text-[13px] text-text-tertiary mb-5 pl-[46px]">
          Preencha os dados para criar o acesso e vínculo.
        </p>

        {temRascunho && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-[10px] mb-5 bg-brand-subtle border border-brand-border">
            <p className="text-[13px] text-brand m-0">
              Rascunho restaurado — continue de onde parou.
            </p>
            <button
              type="button"
              onClick={descartarRascunho}
              className="text-xs text-text-tertiary hover:text-text-primary bg-transparent border-0 cursor-pointer shrink-0"
            >
              Descartar
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-danger-subtle border border-danger-border text-danger text-xs font-semibold mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-danger shrink-0 animate-pulse" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="field-flat-input">
          <div className="flex flex-col gap-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
            <section>
              <p className="text-[13px] font-semibold text-text-primary mb-3">
                Dados pessoais
              </p>

              <FieldGroup>
                <FieldRow>
                  <FieldCell borderRight>
                    <FieldLabel required>Nome completo</FieldLabel>
                    <input
                      type="text"
                      name="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: João Vitor Silva"
                      disabled={loading}
                      required
                      style={INPUT}
                    />
                  </FieldCell>
                  <FieldCell>
                    <FieldLabel required>E-mail de cadastro</FieldLabel>
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="aluno@email.com"
                      disabled={loading}
                      required
                      style={INPUT}
                    />
                  </FieldCell>
                </FieldRow>

                <FieldRow>
                  <FieldCell borderRight>
                    <FieldLabel>WhatsApp (com DDD)</FieldLabel>
                    <input
                      type="tel"
                      name="whatsapp"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(11) 99999-9999"
                      disabled={loading}
                      style={INPUT}
                    />
                  </FieldCell>
                  <FieldCell>
                    <FieldLabel optional>Data de nascimento</FieldLabel>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      disabled={loading}
                      style={INPUT}
                    />
                  </FieldCell>
                </FieldRow>

                <FieldRow cols={1} last>
                  <FieldCell>
                    <FieldLabel>Objetivo</FieldLabel>
                    <FlatSelect
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
                  </FieldCell>
                </FieldRow>
              </FieldGroup>
            </section>

            <section>
              <p className="text-[13px] font-semibold text-text-primary mb-3">
                Plano e acesso
              </p>

              <FieldGroup>
                <FieldRow>
                  <FieldCell borderRight>
                    <FieldLabel required>Plano contratado</FieldLabel>
                    <FlatSelect
                      value={tipoPlano}
                      onChange={setTipoPlano}
                      disabled={loading}
                      options={[
                        ...mergedPlans(planosPersonalizados).map((p) => ({
                          value: p.slug,
                          label: p.custom
                            ? `${p.nome} (${p.duracao_meses} ${p.duracao_meses === 1 ? "mês" : "meses"})`
                            : p.nome,
                        })),
                        { value: "outros", label: "Outros" },
                      ]}
                    />
                  </FieldCell>
                  <FieldCell>
                    <FieldLabel required>Valor do plano (R$)</FieldLabel>
                    <input
                      type="number"
                      name="valorPlano"
                      min="0"
                      step="0.01"
                      value={valorPlano}
                      onChange={(e) => setValorPlano(e.target.value)}
                      placeholder="350,00"
                      disabled={loading}
                      required
                      style={INPUT}
                    />
                  </FieldCell>
                </FieldRow>

                <FieldRow last>
                  <FieldCell borderRight>
                    <FieldLabel>
                      Data de início
                      {tipoPlano === "outros" ? (
                        <span className="text-text-disabled font-normal"> (manual)</span>
                      ) : null}
                    </FieldLabel>
                    <input
                      type="date"
                      name="dataInicio"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      disabled={loading}
                      style={INPUT}
                    />
                  </FieldCell>
                  <FieldCell>
                    <FieldLabel>
                      {tipoPlano === "outros"
                        ? "Vencimento (informe manualmente)"
                        : "Vencimento / próxima renovação"}
                    </FieldLabel>
                    <input
                      type="date"
                      name="dataExpiracao"
                      value={dataExpiracao}
                      onChange={(e) => setDataExpiracao(e.target.value)}
                      disabled={loading}
                      style={INPUT}
                    />
                  </FieldCell>
                </FieldRow>
              </FieldGroup>
            </section>
          </div>

          <div className="flex justify-end items-center flex-wrap gap-2.5">
            <button
              type="button"
              onClick={salvarRascunho}
              className={`h-10 px-4 rounded-[10px] border border-brand-border bg-transparent text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
                rascunhoSalvo ? "text-success" : "text-brand"
              }`}
            >
              {rascunhoSalvo ? "✓ Rascunho salvo" : "Salvar rascunho"}
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="h-10 px-6 rounded-[10px] border-0 text-text-on-brand text-[13px] font-semibold transition-opacity"
              style={{
                background: "linear-gradient(135deg, #c084fc 0%, #751BB4 55%, #7e22ce 100%)",
                boxShadow: "0 3px 12px rgba(117, 27, 180,0.35)",
                cursor: canSubmit ? "pointer" : "not-allowed",
                opacity: canSubmit ? 1 : 0.5,
              }}
            >
              {loading ? "Cadastrando..." : "Cadastrar"}
            </button>
          </div>

          <div className="flex items-start gap-3 px-4 py-3 rounded-xl mt-4 bg-brand-subtle border border-brand-border">
            <div className="w-8 h-8 rounded-lg shrink-0 bg-brand/15 flex items-center justify-center text-brand">
              <Info size={16} weight="fill" />
            </div>
            <div>
              <p className="text-xs font-semibold text-brand mb-0.5 mt-0">
                O que acontece após o cadastro?
              </p>
              <p className="text-xs text-text-tertiary leading-relaxed m-0">
                O aluno receberá um e-mail com o acesso à plataforma. O vínculo com você será criado
                automaticamente e ele já poderá visualizar os treinos e planos que você prescrever.
              </p>
            </div>
          </div>
        </form>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-1 border-0 rounded-2xl w-full max-w-md p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                goBack();
              }}
              className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors p-1"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-success/15 border border-success-border flex items-center justify-center text-success">
                <CheckCircle size={24} weight="fill" />
              </div>
              <h3 className="font-display font-bold text-lg text-text-primary">Aluno cadastrado!</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                O perfil de <strong>{createdStudentName}</strong> foi criado e ativado. Envie o link de acesso diretamente para o WhatsApp dele para criar a senha.
              </p>
            </div>

            <div className="bg-surface-1 border-0 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary block">
                Link Único de Ativação
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdStudentLink}
                  className="flex-1 h-9 bg-surface-3 border border-input text-text-primary px-3 rounded-lg text-2xs focus:outline-none select-all"
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
                onClick={() => {
                  setShowModal(false);
                  goBack();
                }}
                className="w-full h-11 bg-surface-3 hover:bg-surface-2 border-0 text-text-primary rounded-lg text-xs font-semibold transition-all"
              >
                Concluir e voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
