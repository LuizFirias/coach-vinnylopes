"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSafeSession } from "@/lib/authErrorHandler";
import {
  ChatCircle,
  Calendar,
  Barbell,
  WarningCircle,
  CheckCircle,
  PaperPlaneRight,
  MagnifyingGlass,
  CircleNotch,
  Checks,
  SlidersHorizontal,
  X,
  Check,
} from "@phosphor-icons/react";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { StudentAvatar } from "@/app/components/profile/StudentAvatar";
import { cn } from "@/lib/utils/cn";
import { textIncludes } from "@/lib/utils/textNormalize";
import { selectListboxClassName, selectOptionClassName } from "@/components/ui/Select";
import {
  markAllFeedbacksRead,
  markFeedbackRead,
  markFeedbackUnread,
  notifyFeedbacksUnreadChanged,
} from "@/lib/feedbacks/unread";

type FeedbackFilterKey =
  | "nao_lidos"
  | "nao_respondidos"
  | "respondidos"
  | "pos_treino"
  | "dashboard"
  | "dor";

const FILTER_OPTIONS: { key: FeedbackFilterKey; label: string }[] = [
  { key: "nao_lidos", label: "Não lidos" },
  { key: "nao_respondidos", label: "Pendentes" },
  { key: "respondidos", label: "Respondidos" },
  { key: "pos_treino", label: "Pós-Treino" },
  { key: "dashboard", label: "Dashboard" },
  { key: "dor", label: "Dor" },
];

const FILTER_EXCLUSIVE: Partial<Record<FeedbackFilterKey, FeedbackFilterKey>> = {
  nao_respondidos: "respondidos",
  respondidos: "nao_respondidos",
  pos_treino: "dashboard",
  dashboard: "pos_treino",
};

interface Feedback {
  id: string;
  aluno_id: string;
  feedback: string;
  tipo: "treino_completo" | "treino_dia";
  created_at: string;
  ficha_id: string | null;
  lido_em: string | null;
  aluno_nome?: string;
  aluno_reference?: string;
  aluno_email?: string;
  aluno_avatar_url?: string | null;
  aluno_sexo?: string | null;
  ficha_nome?: string;
  texto_aluno: string;
  resposta_coach: string;
  respondido: boolean;
}

const DELIMITER = "\n\n---\nCOACH_REPLY:\n";

function parseFeedbackContent(rawText: string) {
  if (rawText.includes(DELIMITER)) {
    const parts = rawText.split(DELIMITER);
    return {
      texto_aluno: parts[0],
      resposta_coach: parts[1] || "",
      respondido: true,
    };
  }
  return {
    texto_aluno: rawText,
    resposta_coach: "",
    respondido: false,
  };
}

export default function FeedbacksCoachPage() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [coachId, setCoachId] = useState<string | null>(null);

  const [activeFilters, setActiveFilters] = useState<FeedbackFilterKey[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const filtersRef = useRef<HTMLDivElement>(null);

  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const [togglingReadId, setTogglingReadId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    void loadFeedbacks();
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (filtersRef.current && !filtersRef.current.contains(target)) {
        setFiltersOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [filtersOpen]);

  const toggleFilter = (key: FeedbackFilterKey) => {
    setActiveFilters((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      const exclusive = FILTER_EXCLUSIVE[key];
      const withoutExclusive = exclusive ? prev.filter((k) => k !== exclusive) : prev;
      return [...withoutExclusive, key];
    });
  };

  const removeFilter = (key: FeedbackFilterKey) => {
    setActiveFilters((prev) => prev.filter((k) => k !== key));
  };

  const loadFeedbacks = async () => {
    try {
      const session = await getSafeSession();
      const uid = session?.user?.id;
      if (!uid) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();

      if (profile?.role !== "coach" && profile?.role !== "super_admin") {
        router.push("/aluno/dashboard");
        return;
      }

      setCoachId(uid);

      const { data: feedbacksData, error } = await supabaseClient
        .from("feedbacks_treinos")
        .select("id, aluno_id, feedback, tipo, created_at, ficha_id, lido_em")
        .eq("coach_id", uid)
        .order("created_at", { ascending: false });

      if (error) {
        setLoading(false);
        return;
      }

      const alunoIds = [...new Set(feedbacksData?.map((f) => f.aluno_id) || [])];
      const { data: alunosData } = await supabaseClient
        .from("profiles")
        .select("id, full_name, coaching_reference, email, avatar_url, sexo")
        .in("id", alunoIds);

      const fichaIds = [
        ...new Set(feedbacksData?.filter((f) => f.ficha_id).map((f) => f.ficha_id!) || []),
      ];
      const { data: fichasData } = await supabaseClient
        .from("fichas_treino")
        .select("id, nome_rotina")
        .in("id", fichaIds);

      const feedbacksCompletos =
        feedbacksData?.map((fb) => {
          const parsed = parseFeedbackContent(fb.feedback);
          const aluno = alunosData?.find((a) => a.id === fb.aluno_id);
          return {
            ...fb,
            lido_em: fb.lido_em ?? null,
            aluno_nome: aluno?.full_name || "Atleta",
            aluno_reference: aluno?.coaching_reference || undefined,
            aluno_email: aluno?.email || undefined,
            aluno_avatar_url: aluno?.avatar_url ?? null,
            aluno_sexo: aluno?.sexo ?? null,
            ficha_nome: fichasData?.find((f) => f.id === fb.ficha_id)?.nome_rotina || undefined,
            texto_aluno: parsed.texto_aluno,
            resposta_coach: parsed.resposta_coach,
            respondido: parsed.respondido,
          };
        }) || [];

      setFeedbacks(feedbacksCompletos);
    } catch (err) {
      console.error("Erro ao carregar feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRead = async (feedback: Feedback) => {
    setTogglingReadId(feedback.id);
    try {
      if (feedback.lido_em) {
        const { error } = await markFeedbackUnread(feedback.id);
        if (error) throw new Error(error);
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === feedback.id ? { ...f, lido_em: null } : f)),
        );
      } else {
        const { error } = await markFeedbackRead(feedback.id);
        if (error) throw new Error(error);
        setFeedbacks((prev) =>
          prev.map((f) =>
            f.id === feedback.id ? { ...f, lido_em: new Date().toISOString() } : f,
          ),
        );
      }
    } catch (err: unknown) {
      alert("Erro ao atualizar leitura: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTogglingReadId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!coachId) return;
    setMarkingAll(true);
    try {
      const { error } = await markAllFeedbacksRead(coachId);
      if (error) throw new Error(error);
      const now = new Date().toISOString();
      setFeedbacks((prev) =>
        prev.map((f) => (f.lido_em ? f : { ...f, lido_em: now })),
      );
    } catch (err: unknown) {
      alert("Erro ao marcar tudo: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleSendReply = async (feedbackId: string, currentRawText: string) => {
    const replyText = replyTextMap[feedbackId]?.trim();
    if (!replyText) return;

    setSubmittingReplyId(feedbackId);
    try {
      const parsed = parseFeedbackContent(currentRawText);
      const newFeedbackText = `${parsed.texto_aluno}${DELIMITER}${replyText}`;

      const { error } = await supabaseClient
        .from("feedbacks_treinos")
        .update({
          feedback: newFeedbackText,
          updated_at: new Date().toISOString(),
          lido_em: new Date().toISOString(),
        })
        .eq("id", feedbackId);

      if (error) throw error;

      notifyFeedbacksUnreadChanged();

      setFeedbacks((prev) =>
        prev.map((f) => {
          if (f.id !== feedbackId) return f;
          return {
            ...f,
            feedback: newFeedbackText,
            resposta_coach: replyText,
            respondido: true,
            lido_em: f.lido_em || new Date().toISOString(),
          };
        }),
      );

      setReplyTextMap((prev) => {
        const next = { ...prev };
        delete next[feedbackId];
        return next;
      });
    } catch (err: unknown) {
      alert("Erro ao enviar resposta: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const unreadCount = feedbacks.filter((f) => !f.lido_em).length;
  const unansweredCount = feedbacks.filter((f) => !f.respondido).length;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weeklyCheckinsCount = feedbacks.filter(
    (f) => new Date(f.created_at) >= sevenDaysAgo,
  ).length;

  const dorPalavras = [
    "dor",
    "lesão",
    "machucou",
    "joelho",
    "costas",
    "desconforto",
    "ombro",
    "pulso",
    "tornozelo",
    "fisgada",
    "travou",
    "músculo",
  ];
  const isPainFeedback = (f: Feedback) => {
    const txt = f.texto_aluno.toLowerCase();
    return dorPalavras.some((p) => txt.includes(p));
  };
  const painCount = feedbacks.filter(isPainFeedback).length;

  const filteredFeedbacks = feedbacks.filter((f) => {
    const matchesSearch =
      textIncludes(f.aluno_nome, searchQuery) ||
      textIncludes(f.aluno_reference, searchQuery) ||
      textIncludes(f.texto_aluno, searchQuery) ||
      textIncludes(f.resposta_coach, searchQuery) ||
      textIncludes(f.ficha_nome, searchQuery);

    if (!matchesSearch) return false;

    return activeFilters.every((key) => {
      if (key === "nao_lidos") return !f.lido_em;
      if (key === "nao_respondidos") return !f.respondido;
      if (key === "respondidos") return f.respondido;
      if (key === "pos_treino") return f.tipo === "treino_completo";
      if (key === "dashboard") return f.tipo === "treino_dia";
      if (key === "dor") return isPainFeedback(f);
      return true;
    });
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center lg:pl-28">
        <DumbbellLoader text="Carregando feedbacks..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <div className="w-full max-w-[min(1600px,96vw)] mx-auto px-4 md:px-6">
        <div className="py-6 border-b border-divider flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight font-display">
              Feedbacks
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Acompanhe retornos, check-ins e sinais de atenção dos alunos
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={markingAll}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-border-subtle bg-transparent hover:bg-brand/5 text-[12px] font-semibold text-text-secondary hover:text-brand transition-colors cursor-pointer disabled:opacity-50"
            >
              {markingAll ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                <Checks size={14} />
              )}
              Marcar tudo como lido
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-surface-1 border-0 shadow-sm rounded-lg flex flex-col justify-center h-20">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-brand" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">
                Não lidos
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-xl font-bold text-brand font-mono tabular-nums lining-nums leading-none">
                {unreadCount}
              </span>
              <span className="text-[10px] text-text-secondary">
                novo{unreadCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="p-4 bg-surface-1 border-0 shadow-sm rounded-lg flex flex-col justify-center h-20">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-warning" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">
                Não respondidos
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-xl font-bold text-warning font-mono tabular-nums lining-nums leading-none">
                {unansweredCount}
              </span>
              <span className="text-[10px] text-text-secondary">
                pendente{unansweredCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="p-4 bg-surface-1 border-0 shadow-sm rounded-lg flex flex-col justify-center h-20">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-danger" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">
                Dor / Desconforto
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-xl font-bold text-danger font-mono tabular-nums lining-nums leading-none">
                {painCount}
              </span>
              <span className="text-[10px] text-text-secondary">
                registro{painCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="p-4 bg-surface-1 border-0 shadow-sm rounded-lg flex flex-col justify-center h-20">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-success" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">
                Check-ins (7d)
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-xl font-bold text-text-primary font-mono tabular-nums lining-nums leading-none">
                {weeklyCheckinsCount}
              </span>
              <span className="text-[10px] text-text-secondary">
                novo{weeklyCheckinsCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Busca + filtros compactos */}
        <div
          ref={filtersRef}
          className="relative field-flat-input bg-surface-1 border border-border-subtle rounded-2xl mt-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
            <div className="relative w-full sm:flex-1 sm:max-w-sm pl-6 shrink-0">
              <MagnifyingGlass
                size={14}
                className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2 text-text-disabled"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Localizar por aluno ou texto..."
                aria-label="Buscar feedbacks"
                style={{ touchAction: "manipulation" }}
                className="w-full bg-transparent border-0 outline-none shadow-none text-sm text-text-primary placeholder:text-text-disabled"
              />
            </div>

            <div className="hidden sm:block w-px h-7 bg-border-divider shrink-0" />

            <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto min-w-0">
              {activeFilters.map((key) => {
                const label = FILTER_OPTIONS.find((o) => o.key === key)?.label ?? key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => removeFilter(key)}
                    style={{ touchAction: "manipulation" }}
                    className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-md bg-brand/10 text-brand text-[11px] font-semibold border-0 cursor-pointer hover:bg-brand/15 transition-colors"
                    aria-label={`Remover filtro ${label}`}
                  >
                    {label}
                    <X size={12} weight="bold" className="opacity-70" />
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                style={{ touchAction: "manipulation" }}
                aria-haspopup="listbox"
                aria-expanded={filtersOpen}
                className={cn(
                  "relative flex h-9 items-center gap-1.5 rounded-lg border border-border-subtle bg-transparent hover:bg-brand/5 px-3 text-[12px] font-semibold text-text-secondary hover:text-brand transition-colors cursor-pointer",
                  filtersOpen && "text-brand border-brand/30 bg-brand/5",
                )}
              >
                <SlidersHorizontal size={14} />
                Filtros
                {activeFilters.length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-text-on-brand tabular-nums">
                    {activeFilters.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {filtersOpen && (
            <ul
              role="listbox"
              aria-multiselectable
              className={cn(
                selectListboxClassName,
                // Ancorado no card (largura total no mobile) para não sair da tela
                "left-3 right-3 w-auto max-w-none sm:left-auto sm:right-3 sm:w-52",
              )}
            >
              {FILTER_OPTIONS.map(({ key, label }) => {
                const selected = activeFilters.includes(key);
                const count =
                  key === "nao_lidos"
                    ? unreadCount
                    : key === "nao_respondidos"
                      ? unansweredCount
                      : key === "respondidos"
                        ? feedbacks.filter((f) => f.respondido).length
                        : key === "pos_treino"
                          ? feedbacks.filter((f) => f.tipo === "treino_completo").length
                          : key === "dashboard"
                            ? feedbacks.filter((f) => f.tipo === "treino_dia").length
                            : painCount;

                return (
                  <li key={key} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => toggleFilter(key)}
                      style={{ touchAction: "manipulation" }}
                      className={cn(
                        selectOptionClassName(selected),
                        "justify-between border-0 bg-transparent cursor-pointer",
                      )}
                    >
                      <span>
                        {label}
                        <span className="ml-1.5 text-[11px] font-mono text-text-tertiary tabular-nums">
                          ({count})
                        </span>
                      </span>
                      {selected && (
                        <Check size={14} weight="bold" className="shrink-0 text-brand" />
                      )}
                    </button>
                  </li>
                );
              })}

              {activeFilters.length > 0 && (
                <li className="border-t border-border-divider mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveFilters([])}
                    style={{ touchAction: "manipulation" }}
                    className="w-full px-3 py-2 text-left text-[12px] font-semibold text-text-tertiary hover:text-text-primary hover:bg-surface-1 transition-colors border-0 bg-transparent cursor-pointer"
                  >
                    Limpar filtros
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {filteredFeedbacks.length === 0 ? (
          <div className="text-center py-10 bg-surface-1 border border-dashed border-divider rounded-md mt-6">
            <ChatCircle size={24} className="text-text-disabled mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-text-secondary">Nenhum feedback</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-6">
            {filteredFeedbacks.map((feedback) => {
              const name = feedback.aluno_nome || "Aluno";
              const hasPain = isPainFeedback(feedback);
              const isUnread = !feedback.lido_em;

              return (
                <div
                  key={feedback.id}
                  className={cn(
                    "p-4 flex flex-col gap-3.5 transition-all border rounded-xl shadow-sm bg-surface-1",
                    hasPain
                      ? "border-danger-border bg-danger-subtle/5"
                      : isUnread
                        ? "border-brand/25"
                        : "border-transparent hover:border-brand/20",
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <StudentAvatar
                            name={name}
                            avatarUrl={feedback.aluno_avatar_url}
                            sexo={feedback.aluno_sexo}
                            sizeClassName="w-8 h-8"
                          />
                          {isUnread && (
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-brand ring-2 ring-surface-1" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">
                            {feedback.aluno_reference || name}
                          </p>
                          <p className="text-[9px] text-text-tertiary truncate leading-none mt-0.5">
                            {feedback.aluno_email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <label
                          className={cn(
                            "flex items-center gap-1.5 cursor-pointer select-none rounded-md px-1.5 py-1 transition-colors",
                            isUnread ? "hover:bg-brand/10" : "hover:bg-surface-2",
                          )}
                          title={isUnread ? "Marcar como lido" : "Marcar como não lido"}
                        >
                          <input
                            type="checkbox"
                            checked={!isUnread}
                            disabled={togglingReadId === feedback.id}
                            onChange={() => void handleToggleRead(feedback)}
                            className="h-3.5 w-3.5 rounded border-border-subtle accent-brand cursor-pointer disabled:opacity-50"
                            aria-label={isUnread ? "Marcar como lido" : "Marcar como não lido"}
                          />
                          <span
                            className={cn(
                              "text-[8px] font-bold uppercase tracking-wide",
                              isUnread ? "text-brand" : "text-text-tertiary",
                            )}
                          >
                            {togglingReadId === feedback.id
                              ? "..."
                              : isUnread
                                ? "Não lido"
                                : "Lido"}
                          </span>
                        </label>

                        <span
                          className={cn(
                            "text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                            feedback.tipo === "treino_completo"
                              ? "bg-brand/10 text-brand"
                              : "bg-surface-3 text-text-secondary border-0",
                          )}
                        >
                          {feedback.tipo === "treino_completo" ? "Pós-Treino" : "Dashboard"}
                        </span>

                        <span
                          className={cn(
                            "text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-0.5",
                            feedback.respondido
                              ? "bg-success-subtle text-success border border-success-border/10"
                              : "bg-warning-subtle text-warning border border-warning-border/10",
                          )}
                        >
                          {feedback.respondido ? (
                            <CheckCircle size={9} />
                          ) : (
                            <WarningCircle size={9} />
                          )}
                          {feedback.respondido ? "Respondido" : "Pendente"}
                        </span>
                      </div>
                    </div>

                    {feedback.ficha_nome && (
                      <div className="flex items-center gap-1.5 mb-2 text-[10px] text-text-tertiary">
                        <Barbell size={12} className="text-brand shrink-0" />
                        <span className="truncate">
                          Rotina:{" "}
                          <span className="font-semibold text-text-secondary">
                            {feedback.ficha_nome}
                          </span>
                        </span>
                      </div>
                    )}

                    <div className="bg-surface-1 border-0 rounded-lg px-3 py-2 text-xs text-text-primary leading-relaxed whitespace-pre-wrap font-medium">
                      {feedback.texto_aluno}
                      {hasPain && (
                        <div className="mt-1 text-[9px] text-danger font-bold flex items-center gap-1">
                          <WarningCircle size={10} /> Alerta de desconforto/dor
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[9px] text-text-disabled mt-2">
                      <Calendar size={10} />
                      <span>
                        {new Date(feedback.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-divider/50 flex flex-col gap-2">
                    {feedback.resposta_coach ? (
                      <div className="bg-brand-subtle/20 border border-brand-border/40 rounded-lg p-2.5 text-xs">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-brand mb-0.5">
                          Sua Resposta:
                        </p>
                        <p className="text-text-secondary leading-relaxed font-medium">
                          {feedback.resposta_coach}
                        </p>
                      </div>
                    ) : null}

                    <div className="field-flat-input flex items-center gap-2 bg-surface-1 border border-border-subtle rounded-xl overflow-hidden px-3 py-1.5">
                      <input
                        type="text"
                        placeholder={
                          feedback.resposta_coach
                            ? "Editar sua resposta..."
                            : "Responder feedback..."
                        }
                        value={replyTextMap[feedback.id] ?? ""}
                        onChange={(e) =>
                          setReplyTextMap((prev) => ({
                            ...prev,
                            [feedback.id]: e.target.value,
                          }))
                        }
                        disabled={submittingReplyId === feedback.id}
                        className="flex-1 min-w-0 bg-transparent border-0 outline-none shadow-none text-sm text-text-primary placeholder:text-text-disabled"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendReply(feedback.id, feedback.feedback)}
                        disabled={
                          submittingReplyId === feedback.id ||
                          !(replyTextMap[feedback.id]?.trim())
                        }
                        className="w-8 h-8 rounded-lg bg-brand text-text-on-brand flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shrink-0 disabled:opacity-40 disabled:scale-100 border-0 cursor-pointer"
                        title="Enviar resposta"
                      >
                        {submittingReplyId === feedback.id ? (
                          <CircleNotch size={13} className="animate-spin" />
                        ) : (
                          <PaperPlaneRight size={13} weight="fill" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
