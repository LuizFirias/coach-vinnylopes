"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

export type DadosCartaoForm = {
  numero: string;
  nomeTitular: string;
  validadeMes: string;
  validadeAno: string;
  cvv: string;
  cpfTitular: string;
  cep: string;
  numeroEndereco: string;
  telefone: string;
};

type Props = {
  onSubmit: (dados: DadosCartaoForm) => Promise<void>;
  loading?: boolean;
  className?: string;
  /** Texto do CTA (trial vs reativação). */
  submitLabel?: string;
  defaultCpf?: string;
  defaultPhone?: string;
};

function onlyDigits(v: string, max?: number) {
  const d = v.replace(/\D/g, "");
  return max ? d.slice(0, max) : d;
}

function formatCardNumber(v: string) {
  const d = onlyDigits(v, 19);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatCpf(v: string) {
  const d = onlyDigits(v, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatCep(v: string) {
  const d = onlyDigits(v, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function formatPhone(v: string) {
  const d = onlyDigits(v, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function FormularioCartao({
  onSubmit,
  loading = false,
  className,
  submitLabel = "Liberar 30 dias grátis",
  defaultCpf = "",
  defaultPhone = "",
}: Props) {
  const [dados, setDados] = useState<DadosCartaoForm>({
    numero: "",
    nomeTitular: "",
    validadeMes: "",
    validadeAno: "",
    cvv: "",
    cpfTitular: defaultCpf,
    cep: "",
    numeroEndereco: "",
    telefone: defaultPhone,
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  const ocupado = loading || enviando;

  const set =
    (key: keyof DadosCartaoForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setDados((d) => ({ ...d, [key]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviandoRef.current || loading) return;
    setLocalError(null);

    const numero = onlyDigits(dados.numero);
    const mes = onlyDigits(dados.validadeMes, 2);
    const ano = onlyDigits(dados.validadeAno, 4);
    const cvv = onlyDigits(dados.cvv, 4);
    const cpf = onlyDigits(dados.cpfTitular);
    const cep = onlyDigits(dados.cep, 8);
    const tel = onlyDigits(dados.telefone);

    if (numero.length < 13) {
      setLocalError("Número do cartão inválido.");
      return;
    }
    if (!dados.nomeTitular.trim()) {
      setLocalError("Informe o nome impresso no cartão.");
      return;
    }
    if (mes.length !== 2 || Number(mes) < 1 || Number(mes) > 12) {
      setLocalError("Mês de validade inválido.");
      return;
    }
    if (ano.length !== 2 && ano.length !== 4) {
      setLocalError("Ano de validade inválido.");
      return;
    }
    if (cvv.length < 3) {
      setLocalError("CVV inválido.");
      return;
    }
    if (cpf.length !== 11 && cpf.length !== 14) {
      setLocalError("CPF do titular inválido.");
      return;
    }
    if (cep.length !== 8) {
      setLocalError("CEP inválido.");
      return;
    }
    if (!dados.numeroEndereco.trim()) {
      setLocalError("Informe o número do endereço.");
      return;
    }
    if (tel.length < 10) {
      setLocalError("Telefone inválido.");
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    try {
      await onSubmit({
        ...dados,
        numero,
        validadeMes: mes,
        validadeAno: ano,
        cvv,
        cpfTitular: cpf,
        cep,
        telefone: tel,
        nomeTitular: dados.nomeTitular.trim(),
        numeroEndereco: dados.numeroEndereco.trim(),
      });
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-4", className)}
      noValidate
    >
      <Input
        label="Número do cartão"
        placeholder="0000 0000 0000 0000"
        value={formatCardNumber(dados.numero)}
        onChange={(e) =>
          setDados((d) => ({ ...d, numero: onlyDigits(e.target.value, 19) }))
        }
        inputMode="numeric"
        autoComplete="cc-number"
      />
      <Input
        label="Nome impresso no cartão"
        placeholder="Como no cartão"
        value={dados.nomeTitular}
        onChange={set("nomeTitular")}
        autoComplete="cc-name"
      />
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Mês"
          placeholder="MM"
          value={dados.validadeMes}
          onChange={(e) =>
            setDados((d) => ({ ...d, validadeMes: onlyDigits(e.target.value, 2) }))
          }
          inputMode="numeric"
          autoComplete="cc-exp-month"
        />
        <Input
          label="Ano"
          placeholder="AAAA"
          value={dados.validadeAno}
          onChange={(e) =>
            setDados((d) => ({ ...d, validadeAno: onlyDigits(e.target.value, 4) }))
          }
          inputMode="numeric"
          autoComplete="cc-exp-year"
        />
        <Input
          label="CVV"
          placeholder="000"
          value={dados.cvv}
          onChange={(e) =>
            setDados((d) => ({ ...d, cvv: onlyDigits(e.target.value, 4) }))
          }
          inputMode="numeric"
          autoComplete="cc-csc"
        />
      </div>
      <Input
        label="CPF do titular"
        placeholder="000.000.000-00"
        value={formatCpf(dados.cpfTitular)}
        onChange={(e) =>
          setDados((d) => ({ ...d, cpfTitular: onlyDigits(e.target.value, 11) }))
        }
        inputMode="numeric"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="CEP"
          placeholder="00000-000"
          value={formatCep(dados.cep)}
          onChange={(e) =>
            setDados((d) => ({ ...d, cep: onlyDigits(e.target.value, 8) }))
          }
          inputMode="numeric"
          autoComplete="postal-code"
        />
        <Input
          label="Nº endereço"
          placeholder="123"
          value={dados.numeroEndereco}
          onChange={set("numeroEndereco")}
          autoComplete="address-line2"
        />
      </div>
      <Input
        label="Telefone"
        placeholder="(11) 99999-9999"
        value={formatPhone(dados.telefone)}
        onChange={(e) =>
          setDados((d) => ({ ...d, telefone: onlyDigits(e.target.value, 11) }))
        }
        inputMode="tel"
        autoComplete="tel"
      />

      {localError && (
        <p className="text-xs text-danger">{localError}</p>
      )}

      <button
        type="submit"
        disabled={ocupado}
        aria-busy={ocupado}
        className="mt-2 flex h-12 w-full shrink-0 items-center justify-center rounded-[10px] text-sm font-bold shadow-btn-glow disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "var(--btn-primary-bg)",
          color: "var(--text-on-brand)",
        }}
      >
        {ocupado ? "Processando..." : submitLabel}
      </button>

      <p className="text-center text-xs text-text-tertiary leading-relaxed">
        Seus dados são protegidos e processados com segurança.
        Grátis por 30 dias — cancele quando quiser.
      </p>
    </form>
  );
}
