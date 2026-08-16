"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  User,
  Target,
  Cake,
  Phone,
  EnvelopeSimple,
  CreditCard,
  CurrencyCircleDollar,
  CalendarBlank,
  CalendarCheck,
  CheckCircle,
  WhatsappLogo,
  Info,
} from "@phosphor-icons/react";
import { supabaseClient } from "@/lib/supabaseClient";
import { fetchCoachCustomPlans, mergedPlans, type CoachPlan } from "@/lib/coachPlans";
import { getBootstrapProfile } from "@/lib/auth/bootstrapProfile";
import { concluirPasso } from "@/lib/onboarding/concluirPasso";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const DRAFT_KEY = "draft_novo_aluno";

const OBJETIVO_OPTIONS = [
  { value: "bulking", label: "Hipertrofia (Bulking)" },
  { value: "cutting", label: "Emagrecimento (Cutting)" },
  { value: "recomposicao", label: "Definição (Recomposição)" },
  { value: "manutencao", label: "Condicionamento / Saúde / Outro" },
];

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

function FieldLabel({
  children,
  htmlFor,
  required,
}: {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-center gap-0.5 text-[13px] font-medium text-text-secondary"
    >
      {required && (
        <abbr title="Obrigatório" className="text-danger no-underline">
          *
        </abbr>
      )}
      {children}
    </label>
  );
}

export type NovoAlunoCreated = {
  name: string;
  phone: string;
  link: string;
};

type NovoAlunoFormProps = {
  layout: "page" | "modal";
  onCancel: () => void;
  onCreated?: (payload: NovoAlunoCreated) => void;
};

export function NovoAlunoForm({ layout, onCancel, onCreated }: NovoAlunoFormProps) {
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
  const [planosPersonalizados, setPlanosPersonalizados] = useState<CoachPlan[]>([]);
  const [rascunhoSalvo, setRascunhoSalvo] = useState(false);
  const [temRascunho, setTemRascunho] = useState(false);
  const [created, setCreated] = useState<NovoAlunoCreated | null>(null);
  const skipExpiryOnce = useRef(false);

  useEffect(() => {
    void (async () => {
      const boot = await getBootstrapProfile();
      if (!boot) return;
      try {
        const custom = await fetchCoachCustomPlans(boot.userId);
        setPlanosPersonalizados(custom);
      } catch {
        setPlanosPersonalizados([]);
      }
    })();
  }, []);

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
      /* rascunho inválido */
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
  }, [tipoPlano, planosPersonalizados, dataInicio]);

  const salvarRascunho = () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        fullName,
        email,
        whatsapp,
        dateOfBirth,
        objetivo,
        tipoPlano,
        valorPlano,
        dataInicio,
        dataExpiracao,
      }),
    );
    setTemRascunho(true);
    setRascunhoSalvo(true);
    window.setTimeout(() => setRascunhoSalvo(false), 2000);
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

      localStorage.removeItem(DRAFT_KEY);
      setTemRascunho(false);

      const payload: NovoAlunoCreated = {
        name: fullName.trim(),
        phone: cleanedPhone,
        link: data?.inviteLink || "https://www.auronfit.com.br/login",
      };
      setCreated(payload);
      onCreated?.(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar aluno");
    } finally {
      setLoading(false);
    }
  };

  const valorOk =
    Boolean(valorPlano.trim()) &&
    !Number.isNaN(parseFloat(valorPlano)) &&
    parseFloat(valorPlano) >= 0;
  const canSubmit =
    Boolean(fullName.trim() && email.trim() && tipoPlano.trim() && valorOk) && !loading;

  const planoOptions = [
    ...mergedPlans(planosPersonalizados).map((p) => ({
      value: p.slug,
      label: p.custom
        ? `${p.nome} (${p.duracao_meses} ${p.duracao_meses === 1 ? "mês" : "meses"})`
        : p.nome,
    })),
    { value: "outros", label: "Outros" },
  ];

  if (created) {
    return (
      <NovoAlunoSuccess
        created={created}
        onDone={onCancel}
        doneLabel={layout === "page" ? "Concluir e voltar" : "Concluir"}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="novo-aluno-form flex flex-col gap-3">
      {temRascunho && (
        <p className="m-0 text-[12px] text-text-tertiary">
          Rascunho restaurado.
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(DRAFT_KEY);
              setTemRascunho(false);
            }}
            className="ml-2 border-0 bg-transparent p-0 text-[12px] text-brand cursor-pointer"
          >
            Descartar
          </button>
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-danger-border bg-danger-subtle px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      <div>
        <FieldLabel htmlFor="novo-aluno-nome" required>
          Nome completo
        </FieldLabel>
        <Input
          id="novo-aluno-nome"
          name="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="ex: João da Silva"
          disabled={loading}
          required
          autoFocus={layout === "modal"}
          leftIcon={<User size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="novo-aluno-objetivo">Objetivo</FieldLabel>
          <Select
            id="novo-aluno-objetivo"
            value={objetivo}
            onChange={setObjetivo}
            options={OBJETIVO_OPTIONS}
            disabled={loading}
            leftIcon={<Target size={18} />}
          />
        </div>
        <div>
          <FieldLabel htmlFor="novo-aluno-nascimento">Data de nascimento</FieldLabel>
          <Input
            id="novo-aluno-nascimento"
            type="date"
            name="dateOfBirth"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={loading}
            leftIcon={<Cake size={18} />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="novo-aluno-whatsapp" required>
            Número de celular
          </FieldLabel>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3.5 z-[1] flex items-center gap-1.5 text-text-tertiary">
              <Phone size={18} />
              <span className="text-[13px] text-text-disabled">(+55)</span>
            </span>
            <Input
              id="novo-aluno-whatsapp"
              type="tel"
              name="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="11 99999-9999"
              disabled={loading}
              className="has-phone-prefix"
            />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="novo-aluno-email" required>
            E-mail
          </FieldLabel>
          <Input
            id="novo-aluno-email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex: nome@email.com"
            disabled={loading}
            required
            leftIcon={<EnvelopeSimple size={18} />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="novo-aluno-plano" required>
            Plano contratado
          </FieldLabel>
          <Select
            id="novo-aluno-plano"
            value={tipoPlano}
            onChange={setTipoPlano}
            options={planoOptions}
            disabled={loading}
            leftIcon={<CreditCard size={18} />}
          />
        </div>
        <div>
          <FieldLabel htmlFor="novo-aluno-valor" required>
            Valor do plano (R$)
          </FieldLabel>
          <Input
            id="novo-aluno-valor"
            type="number"
            name="valorPlano"
            min="0"
            step="0.01"
            value={valorPlano}
            onChange={(e) => setValorPlano(e.target.value)}
            placeholder="350,00"
            disabled={loading}
            required
            leftIcon={<CurrencyCircleDollar size={18} />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="novo-aluno-inicio">Data de início</FieldLabel>
          <Input
            id="novo-aluno-inicio"
            type="date"
            name="dataInicio"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            disabled={loading}
            leftIcon={<CalendarBlank size={18} />}
          />
        </div>
        <div>
          <FieldLabel htmlFor="novo-aluno-vencimento">
            {tipoPlano === "outros" ? "Vencimento (manual)" : "Vencimento"}
          </FieldLabel>
          <Input
            id="novo-aluno-vencimento"
            type="date"
            name="dataExpiracao"
            value={dataExpiracao}
            onChange={(e) => setDataExpiracao(e.target.value)}
            disabled={loading}
            leftIcon={<CalendarCheck size={18} />}
          />
        </div>
      </div>

      {layout === "page" && (
        <div className="mt-1 flex items-start gap-3 rounded-xl border border-brand-border bg-brand-subtle px-4 py-3">
          <Info size={16} weight="fill" className="mt-0.5 shrink-0 text-brand" />
          <p className="m-0 text-xs leading-relaxed text-text-tertiary">
            O aluno recebe um e-mail com o acesso. O vínculo com você é criado na hora.
          </p>
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-between gap-3 pt-2",
          layout === "modal" && "border-t border-border-subtle mt-1",
        )}
      >
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={salvarRascunho}
            className={cn(
              "h-10 border-0 bg-transparent px-2 text-[13px] font-medium cursor-pointer",
              rascunhoSalvo ? "text-success" : "text-text-tertiary hover:text-brand",
            )}
          >
            {rascunhoSalvo ? "Rascunho salvo" : "Salvar rascunho"}
          </button>
          <Button
            type="submit"
            size="sm"
            disabled={!canSubmit}
            loading={loading}
            className="auron-cta-btn border-0"
          >
            Cadastrar aluno
          </Button>
        </div>
      </div>
    </form>
  );
}

function NovoAlunoSuccess({
  created,
  onDone,
  doneLabel,
}: {
  created: NovoAlunoCreated;
  onDone: () => void;
  doneLabel: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-success-border bg-success/15 text-success">
          <CheckCircle size={24} weight="fill" />
        </div>
        <h3 className="font-display text-lg font-bold text-text-primary">Aluno cadastrado!</h3>
        <p className="text-xs leading-relaxed text-text-secondary">
          O perfil de <strong>{created.name}</strong> foi criado. Envie o link para ele criar a senha.
        </p>
      </div>

      <div className="space-y-2 rounded-xl bg-surface-1 p-4">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
          Link único de ativação
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={created.link}
            className="h-9 flex-1 select-all rounded-lg border border-input bg-surface-3 px-3 text-2xs text-text-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(created.link);
            }}
            className="auron-cta-btn h-9 rounded-lg px-3 text-2xs font-semibold"
          >
            Copiar
          </button>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        <a
          href={`https://wa.me/${created.phone}?text=${encodeURIComponent(
            `Fala ${created.name}! Seu perfil no AURON está pronto. Acesse este link para criar sua senha e ver seu treino: ${created.link}`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-xs font-bold text-white hover:bg-[#20BA56]"
        >
          <WhatsappLogo size={18} weight="fill" />
          Enviar convite por WhatsApp
        </a>
        <Button type="button" variant="secondary" fullWidth onClick={onDone}>
          {doneLabel}
        </Button>
      </div>
    </div>
  );
}
