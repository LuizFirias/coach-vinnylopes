"use client";

import { useCallback, useEffect, useState } from "react";
import { PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
import { supabaseClient } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import {
  DEFAULT_PLANS,
  fetchCoachCustomPlans,
  isReservedPlanSlug,
  slugifyPlanName,
  type CoachPlan,
} from "@/lib/coachPlans";

interface PlanFormState {
  id: string | null;
  nome: string;
  duracaoMeses: string;
  valorSugerido: string;
}

const EMPTY_FORM: PlanFormState = {
  id: null,
  nome: "",
  duracaoMeses: "",
  valorSugerido: "",
};

function fmtValor(v: number | null | undefined) {
  return v != null
    ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";
}

type Props = {
  coachId: string;
  /** Sem título de página — para o acordeão do perfil. */
  embedded?: boolean;
};

export function CoachPlanosManager({ coachId, embedded = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [customPlans, setCustomPlans] = useState<CoachPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoachPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setCustomPlans(await fetchCoachCustomPlans(coachId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar planos");
    }
  }, [coachId]);

  useEffect(() => {
    void (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (p: CoachPlan) => {
    setForm({
      id: p.id ?? null,
      nome: p.nome,
      duracaoMeses: String(p.duracao_meses),
      valorSugerido: p.valor_sugerido != null ? String(p.valor_sugerido) : "",
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const nome = form.nome.trim();
    const duracao = parseInt(form.duracaoMeses, 10);
    const valor = form.valorSugerido.trim().length
      ? Number(form.valorSugerido.replace(",", "."))
      : null;

    if (nome.length < 2) {
      setFormError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    if (!Number.isFinite(duracao) || duracao < 1 || duracao > 60) {
      setFormError("Duração deve ser entre 1 e 60 meses.");
      return;
    }
    if (valor !== null && (!Number.isFinite(valor) || valor < 0)) {
      setFormError("Valor sugerido inválido.");
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        const { error: err } = await supabaseClient
          .from("coach_planos")
          .update({ nome, duracao_meses: duracao, valor_sugerido: valor })
          .eq("id", form.id);
        if (err) throw err;
      } else {
        const slug = slugifyPlanName(nome);
        if (slug.length < 2) {
          setFormError("Nome gera um identificador inválido — use letras ou números.");
          return;
        }
        if (isReservedPlanSlug(slug)) {
          setFormError("Esse nome conflita com um plano padrão. Escolha outro nome.");
          return;
        }
        if (customPlans.some((p) => p.slug === slug)) {
          setFormError("Você já tem um plano com esse nome.");
          return;
        }
        const { error: err } = await supabaseClient.from("coach_planos").insert({
          coach_id: coachId,
          nome,
          slug,
          duracao_meses: duracao,
          valor_sugerido: valor,
        });
        if (err) throw err;
      }
      await load();
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar plano");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const { error: err } = await supabaseClient
        .from("coach_planos")
        .delete()
        .eq("id", deleteTarget.id);
      if (err) throw err;
      await load();
      setDeleteTarget(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao excluir plano");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <p className="px-1 py-4 text-xs text-text-tertiary">Carregando planos…</p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", !embedded && "gap-6")}>
      {error && (
        <div className="rounded-lg bg-danger-subtle px-3 py-2.5 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-text-secondary leading-relaxed">
          Crie modalidades próprias — ex.: mentoria de 2 meses. Só você enxerga
          seus planos.
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={openCreate}
          leftIcon={<Plus size={13} weight="bold" />}
          className="h-9 shrink-0 px-3 text-xs"
        >
          Novo plano
        </Button>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-tertiary">
          Planos padrão
        </p>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_PLANS.map((p) => (
            <span
              key={p.slug}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-transparent px-2.5 py-1.5 text-xs font-medium text-text-secondary"
            >
              {p.nome}
              <span className="text-text-tertiary tabular-nums lining-nums">
                {p.duracao_meses} {p.duracao_meses === 1 ? "mês" : "meses"}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-text-tertiary">
          Os planos padrão são fixos e continuam disponíveis para todos os alunos.
        </p>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-tertiary">
          Meus planos personalizados
        </p>
        {customPlans.length === 0 ? (
          <p className="text-xs text-text-secondary">
            Nenhum plano personalizado ainda.{" "}
            <button
              type="button"
              onClick={openCreate}
              className="border-0 bg-transparent p-0 text-xs font-semibold text-brand cursor-pointer"
            >
              Criar o primeiro
            </button>
          </p>
        ) : (
          <div className="divide-y divide-border-divider overflow-hidden rounded-lg">
            {customPlans.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {p.nome}
                  </p>
                  <p className="text-[11px] text-text-secondary tabular-nums lining-nums">
                    {p.duracao_meses}{" "}
                    {p.duracao_meses === 1 ? "mês" : "meses"} ·{" "}
                    {fmtValor(p.valor_sugerido)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    aria-label={`Editar plano ${p.nome}`}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                  >
                    <PencilSimple size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    aria-label={`Excluir plano ${p.nome}`}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-text-secondary hover:bg-danger-subtle hover:text-danger"
                  >
                    <Trash size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
            onClick={() => !saving && setFormOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="plano-modal-title"
            className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
          >
            <div
              className="mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-surface-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-divider px-4 pb-3 pt-4">
                <p
                  id="plano-modal-title"
                  className="text-sm font-bold text-text-primary"
                >
                  {form.id ? "Editar plano" : "Novo plano personalizado"}
                </p>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  aria-label="Fechar"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-text-secondary hover:text-text-primary"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
              <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-4 px-4 py-4">
                <Input
                  label="Nome do plano"
                  name="nomePlano"
                  value={form.nome}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nome: e.target.value }))
                  }
                  placeholder="Ex: Mentoria 2 Meses"
                  maxLength={40}
                  autoFocus
                />
                <Input
                  label="Duração (meses)"
                  name="duracaoMeses"
                  type="number"
                  min={1}
                  max={60}
                  inputMode="numeric"
                  value={form.duracaoMeses}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duracaoMeses: e.target.value }))
                  }
                  placeholder="Ex: 2"
                  helperText="Usada para calcular vencimento e MRR."
                />
                <Input
                  label="Valor sugerido (R$) — opcional"
                  name="valorSugerido"
                  inputMode="decimal"
                  value={form.valorSugerido}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valorSugerido: e.target.value }))
                  }
                  placeholder="Ex: 800"
                  helperText="Pré-preenche o valor ao cadastrar um aluno neste plano."
                />
                {formError && (
                  <p className="text-xs text-danger" role="alert">
                    {formError}
                  </p>
                )}
                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 flex-1 text-[13px]"
                    disabled={saving}
                    onClick={() => setFormOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="h-11 flex-1 text-[13px]"
                    loading={saving}
                    disabled={saving}
                  >
                    {form.id ? "Salvar" : "Criar plano"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
            onClick={() => !deleting && setDeleteTarget(null)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <div
              className="w-full max-w-sm rounded-xl bg-surface-1 p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-1.5 text-sm font-bold text-text-primary">
                Excluir &quot;{deleteTarget.nome}&quot;?
              </h3>
              <p className="mb-5 text-xs text-text-secondary">
                Alunos já cadastrados neste plano não são alterados — apenas o
                plano deixa de aparecer nas opções de novos cadastros.
              </p>
              <div className="flex gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 flex-1 text-[13px]"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="h-11 flex-1 text-[13px]"
                  disabled={deleting}
                  loading={deleting}
                  onClick={() => void handleDelete()}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
