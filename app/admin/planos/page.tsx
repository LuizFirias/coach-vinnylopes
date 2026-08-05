"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getBootstrapProfile } from "@/lib/auth/bootstrapProfile";
import {
  Plus,
  PencilSimple,
  Trash,
  X,
} from "@phosphor-icons/react";
import { BackButton } from "@/app/components/ui/BackButton";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { Input } from "@/components/ui/Input";
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

const EMPTY_FORM: PlanFormState = { id: null, nome: "", duracaoMeses: "", valorSugerido: "" };

export default function CoachPlanosPage() {
  const router = useRouter();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customPlans, setCustomPlans] = useState<CoachPlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoachPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (cid: string) => {
    try {
      setCustomPlans(await fetchCoachCustomPlans(cid));
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar planos");
    }
  }, []);

  useEffect(() => {
    (async () => {
      const boot = await getBootstrapProfile();
      if (!boot) { router.replace("/login"); return; }
      if (boot.role !== "coach" && boot.role !== "super_admin") {
        router.replace("/aluno/dashboard");
        return;
      }
      setCoachId(boot.userId);
      await load(boot.userId);
      setLoading(false);
    })();
  }, [router, load]);

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
    if (!coachId) return;
    setFormError(null);

    const nome = form.nome.trim();
    const duracao = parseInt(form.duracaoMeses, 10);
    const valor = form.valorSugerido.trim().length
      ? Number(form.valorSugerido.replace(",", "."))
      : null;

    if (nome.length < 2) { setFormError("Informe um nome com pelo menos 2 caracteres."); return; }
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
        // Edição: o slug permanece o da criação (alunos já vinculados não quebram)
        const { error: err } = await supabaseClient
          .from("coach_planos")
          .update({ nome, duracao_meses: duracao, valor_sugerido: valor })
          .eq("id", form.id);
        if (err) throw err;
      } else {
        const slug = slugifyPlanName(nome);
        if (slug.length < 2) { setFormError("Nome gera um identificador inválido — use letras ou números."); return; }
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
      await load(coachId);
      setFormOpen(false);
    } catch (e: any) {
      setFormError(e?.message ?? "Erro ao salvar plano");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id || !coachId) return;
    setDeleting(true);
    try {
      const { error: err } = await supabaseClient
        .from("coach_planos")
        .delete()
        .eq("id", deleteTarget.id);
      if (err) throw err;
      await load(coachId);
      setDeleteTarget(null);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao excluir plano");
    } finally {
      setDeleting(false);
    }
  };

  const fmtValor = (v: number | null | undefined) =>
    v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center lg:pl-28">
        <DumbbellLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-8 lg:p-10 lg:pl-28 pb-24 text-text-primary font-sans">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BackButton href="/admin/perfil" aria-label="Voltar ao perfil" />
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight text-text-primary">Planos de venda</h1>
              <p className="text-xs text-text-secondary">
                Crie modalidades próprias — ex.: mentoria de 2 meses. Só você enxerga seus planos.
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hover text-text-on-brand text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-md shadow-brand/10 shrink-0"
          >
            <Plus size={13} weight="bold" /> Novo Plano
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger-border px-4 py-3 text-xs text-danger">
            {error}
          </div>
        )}

        {/* Planos padrão */}
        <div className="bg-surface-1 border-0 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-tertiary mb-3">
            Planos padrão
          </p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_PLANS.map((p) => (
              <span
                key={p.slug}
                className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-secondary"
              >
                {p.nome}
                <span className="text-text-tertiary tabular-nums">
                  {p.duracao_meses} {p.duracao_meses === 1 ? "mês" : "meses"}
                </span>
              </span>
            ))}
          </div>
          <p className="text-[11px] text-text-tertiary mt-3">
            Os planos padrão são fixos e continuam disponíveis para todos os alunos.
          </p>
        </div>

        {/* Planos personalizados */}
        <div className="bg-surface-1 border-0 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-divider">
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-tertiary">
              Meus planos personalizados
            </p>
          </div>

          {customPlans.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-text-primary mb-1">Nenhum plano personalizado ainda</p>
              <p className="text-xs text-text-secondary mb-4">
                Venda do seu jeito: crie um plano com a duração e o valor que você pratica.
              </p>
              <button
                onClick={openCreate}
                className="text-xs font-semibold text-brand hover:underline"
              >
                + Criar meu primeiro plano
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[color:var(--list-row-divider)]">
              {customPlans.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{p.nome}</p>
                    <p className="text-[11px] text-text-secondary tabular-nums">
                      {p.duracao_meses} {p.duracao_meses === 1 ? "mês" : "meses"} · Valor sugerido: {fmtValor(p.valor_sugerido)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(p)}
                      aria-label={`Editar plano ${p.nome}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                    >
                      <PencilSimple size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      aria-label={`Excluir plano ${p.nome}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:text-danger hover:bg-danger-subtle transition-colors"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal criar/editar */}
      {formOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-backdrop-in"
            onClick={() => !saving && setFormOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="plano-modal-title"
            className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] animate-sheet-up sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
          >
            <div
              className="mx-auto w-full max-w-sm rounded-xl bg-surface-1 shadow-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-divider">
                <p id="plano-modal-title" className="text-sm font-bold text-text-primary">
                  {form.id ? "Editar plano" : "Novo plano personalizado"}
                </p>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  aria-label="Fechar"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-text-primary hover:bg-surface-2 active:scale-95"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-4 px-4 py-4">
                <Input
                  label="Nome do plano"
                  name="nomePlano"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
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
                  onChange={(e) => setForm((f) => ({ ...f, duracaoMeses: e.target.value }))}
                  placeholder="Ex: 2"
                  helperText="Usada para calcular vencimento e MRR."
                />
                <Input
                  label="Valor sugerido (R$) — opcional"
                  name="valorSugerido"
                  inputMode="decimal"
                  value={form.valorSugerido}
                  onChange={(e) => setForm((f) => ({ ...f, valorSugerido: e.target.value }))}
                  placeholder="Ex: 800"
                  helperText="Pré-preenche o valor ao cadastrar um aluno neste plano."
                />

                {formError && (
                  <p className="text-xs text-danger" role="alert">{formError}</p>
                )}

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    disabled={saving}
                    className="flex-1 h-11 rounded-[10px] bg-surface-2 text-[13px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={cn(
                      "flex-1 h-11 rounded-[10px] btn-primary !p-0 text-[13px] font-semibold",
                      saving && "opacity-60 pointer-events-none"
                    )}
                  >
                    {saving ? "Salvando..." : form.id ? "Salvar" : "Criar plano"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-backdrop-in"
            onClick={() => !deleting && setDeleteTarget(null)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <div
              className="w-full max-w-sm rounded-xl bg-surface-1 shadow-lg p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-bold text-text-primary mb-1.5">
                Excluir &quot;{deleteTarget.nome}&quot;?
              </h3>
              <p className="text-xs text-text-secondary mb-5">
                Alunos já cadastrados neste plano não são alterados — apenas o plano deixa de
                aparecer nas opções de novos cadastros.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 h-11 rounded-[10px] bg-surface-2 text-[13px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="flex-1 h-11 rounded-[10px] bg-danger text-[13px] font-semibold text-text-on-brand hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {deleting ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
