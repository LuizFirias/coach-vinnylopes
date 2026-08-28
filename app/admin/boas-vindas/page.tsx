"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Confetes } from "@/app/components/onboarding/Confetes";
import { supabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/app/components/AuthProvider";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import {
  ALUNOS_ATUAIS_OPTIONS,
  type AlunosAtuaisFaixa,
} from "@/lib/onboarding/passos";
import { sincronizarProgressoOnboarding } from "@/lib/onboarding/concluirPasso";
import { invalidateBootstrapProfile } from "@/lib/auth/bootstrapProfile";

function onlyDigits(v: string, max = 11) {
  return v.replace(/\D/g, "").slice(0, max);
}

function formatPhone(v: string) {
  const d = onlyDigits(v);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function BoasVindasCoachPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [alunosAtuais, setAlunosAtuais] = useState<AlunosAtuaisFaixa | "">("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role, full_name, whatsapp, telefone, onboarding_visto")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!profile || (profile.role !== "coach" && profile.role !== "super_admin")) {
        router.replace("/login");
        return;
      }

      if (profile.onboarding_visto) {
        router.replace("/admin/dashboard");
        return;
      }

      setNome(profile.full_name?.trim() || "");
      const phone = profile.telefone || profile.whatsapp || "";
      setTelefone(phone ? formatPhone(phone.replace(/^55/, "")) : "");
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id || salvando) return;

    const nomeTrim = nome.trim();
    if (nomeTrim.length < 2) {
      setErro("Informe seu nome completo.");
      return;
    }
    if (!alunosAtuais) {
      setErro("Selecione quantos alunos você tem hoje.");
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      const digits = onlyDigits(telefone);
      const phoneE164 =
        digits.length >= 10
          ? digits.startsWith("55")
            ? digits
            : `55${digits}`
          : null;

      const { error } = await supabaseClient
        .from("profiles")
        .update({
          full_name: nomeTrim,
          telefone: phoneE164,
          whatsapp: phoneE164,
          alunos_atuais: alunosAtuais,
          onboarding_visto: true,
        })
        .eq("id", user.id);

      if (error) throw error;

      await sincronizarProgressoOnboarding(user.id);
      invalidateBootstrapProfile();
      router.replace("/admin/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível salvar.";
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Preparando sua conta..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-surface-0">
      <Confetes />

      <div className="w-full max-w-md flex flex-col gap-6 py-10">
        <div className="text-center">
          <p className="text-4xl mb-3" aria-hidden>
            🎉
          </p>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Bem-vindo ao Coach Vinny!
          </h1>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            Sua consultoria digital começa aqui. Antes de começar, conta um pouco
            sobre você.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Seu nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
            required
          />
          <Input
            label="WhatsApp (com DDD)"
            type="tel"
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(formatPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            autoComplete="tel"
          />
          <Select
            label="Quantos alunos você tem hoje?"
            value={alunosAtuais}
            onChange={(v) => setAlunosAtuais(v as AlunosAtuaisFaixa)}
            options={[...ALUNOS_ATUAIS_OPTIONS]}
            placeholder="Selecione…"
          />

          {erro && (
            <p className="text-xs text-danger" role="alert">
              {erro}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={salvando}
            fullWidth
            className="mt-2"
          >
            Começar →
          </Button>
        </form>
      </div>
    </div>
  );
}
