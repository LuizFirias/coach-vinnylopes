"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { 
  ChatCircle, Calendar, Barbell, WarningCircle, 
  CheckCircle, ArrowLeft, PaperPlaneRight, User, MagnifyingGlass,
  CircleNotch
} from "@phosphor-icons/react";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { textIncludes } from "@/lib/utils/textNormalize";

interface Feedback {
  id: string;
  aluno_id: string;
  feedback: string;
  tipo: 'treino_completo' | 'treino_dia';
  created_at: string;
  ficha_id: string | null;
  aluno_nome?: string;
  aluno_reference?: string;
  aluno_email?: string;
  ficha_nome?: string;
  
  // parsed fields
  texto_aluno: string;
  resposta_coach: string;
  respondido: boolean;
}

const AVATAR_COLORS = [
  "from-amber-500/50 to-amber-700/30",
  "from-orange-500/50 to-orange-700/30",
  "from-yellow-500/50 to-yellow-700/30",
  "from-brand/50 to-brand/20",
];

function avatarGrad(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

const DELIMITER = "\n\n---\nCOACH_REPLY:\n";

function parseFeedbackContent(rawText: string) {
  if (rawText.includes(DELIMITER)) {
    const parts = rawText.split(DELIMITER);
    return {
      texto_aluno: parts[0],
      resposta_coach: parts[1] || "",
      respondido: true
    };
  }
  return {
    texto_aluno: rawText,
    resposta_coach: "",
    respondido: false
  };
}

export default function FeedbacksCoachPage() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter and search
  const [filtro, setFiltro] = useState<'todos' | 'nao_respondidos' | 'pos_treino' | 'dashboard' | 'dor' | 'respondidos'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Replying state
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  useEffect(() => { loadFeedbacks(); }, []);

  const loadFeedbacks = async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) { router.push("/login"); return; }

      const { data: profile } = await supabaseClient
        .from("profiles").select("role").eq("id", coachId).single();

      if (profile?.role !== "coach" && profile?.role !== "super_admin") {
        router.push("/aluno/dashboard"); return;
      }

      const { data: feedbacksData, error } = await supabaseClient
        .from("feedbacks_treinos")
        .select("id, aluno_id, feedback, tipo, created_at, ficha_id")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });

      if (error) { setLoading(false); return; }

      const alunoIds = [...new Set(feedbacksData?.map(f => f.aluno_id) || [])];
      const { data: alunosData } = await supabaseClient
        .from("profiles").select("id, full_name, coaching_reference, email").in("id", alunoIds);

      const fichaIds = [...new Set(feedbacksData?.filter(f => f.ficha_id).map(f => f.ficha_id!) || [])];
      const { data: fichasData } = await supabaseClient
        .from("fichas_treino").select("id, nome_rotina").in("id", fichaIds);

      const feedbacksCompletos = feedbacksData?.map(fb => {
        const parsed = parseFeedbackContent(fb.feedback);
        const aluno = alunosData?.find(a => a.id === fb.aluno_id);
        return {
          ...fb,
          aluno_nome: aluno?.full_name || "Atleta",
          aluno_reference: aluno?.coaching_reference || undefined,
          aluno_email: aluno?.email || undefined,
          ficha_nome: fichasData?.find(f => f.id === fb.ficha_id)?.nome_rotina || undefined,
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
          updated_at: new Date().toISOString()
        })
        .eq("id", feedbackId);

      if (error) throw error;

      // Update local state
      setFeedbacks(prev => prev.map(f => {
        if (f.id === feedbackId) {
          return {
            ...f,
            feedback: newFeedbackText,
            resposta_coach: replyText,
            respondido: true
          };
        }
        return f;
      }));

      // Clear input state
      setReplyTextMap(prev => {
        const next = { ...prev };
        delete next[feedbackId];
        return next;
      });
    } catch (err: any) {
      alert("Erro ao enviar resposta: " + err.message);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  // KPIs
  const totalCount = feedbacks.length;
  const unansweredCount = feedbacks.filter(f => !f.respondido).length;
  const answeredCount = feedbacks.filter(f => f.respondido).length;
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const weeklyCheckinsCount = feedbacks.filter(f => new Date(f.created_at) >= sevenDaysAgo).length;
  const postWorkoutCount = feedbacks.filter(f => f.tipo === 'treino_completo').length;
  
  const dorPalavras = ["dor", "lesão", "machucou", "joelho", "costas", "desconforto", "ombro", "pulso", "tornozelo", "fisgada", "travou", "músculo"];
  const isPainFeedback = (f: Feedback) => {
    const txt = f.texto_aluno.toLowerCase();
    return dorPalavras.some(p => txt.includes(p));
  };
  const painCount = feedbacks.filter(isPainFeedback).length;

  // Filter list
  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesSearch =
      textIncludes(f.aluno_nome, searchQuery) ||
      textIncludes(f.aluno_reference, searchQuery) ||
      textIncludes(f.texto_aluno, searchQuery) ||
      textIncludes(f.resposta_coach, searchQuery) ||
      textIncludes(f.ficha_nome, searchQuery);

    if (!matchesSearch) return false;

    if (filtro === 'nao_respondidos') return !f.respondido;
    if (filtro === 'respondidos') return f.respondido;
    if (filtro === 'pos_treino') return f.tipo === 'treino_completo';
    if (filtro === 'dashboard') return f.tipo === 'treino_dia';
    if (filtro === 'dor') return isPainFeedback(f);
    
    return true;
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
        
        {/* Header */}
        <div className="py-6 border-b border-border-subtle">
          <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight font-display">Feedbacks</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Acompanhe retornos, check-ins e sinais de atenção dos alunos
          </p>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-surface-1 border border-border-subtle shadow-sm rounded-lg flex flex-col justify-center h-20">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-warning" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">Não respondidos</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-xl font-bold text-warning font-mono tabular-nums leading-none">{unansweredCount}</span>
              <span className="text-[10px] text-text-secondary">pendente{unansweredCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="p-4 bg-surface-1 border border-border-subtle shadow-sm rounded-lg flex flex-col justify-center h-20">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-danger" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">Dor / Desconforto</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-xl font-bold text-danger font-mono tabular-nums leading-none">{painCount}</span>
              <span className="text-[10px] text-text-secondary">registro{painCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="p-4 bg-surface-1 border border-border-subtle shadow-sm rounded-lg flex flex-col justify-center h-20">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-text-disabled" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">Pós-treino</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-xl font-bold text-text-primary font-mono tabular-nums leading-none">{postWorkoutCount}</span>
              <span className="text-[10px] text-text-secondary">envio{postWorkoutCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="p-4 bg-surface-1 border border-border-subtle shadow-sm rounded-lg flex flex-col justify-center h-20">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-success" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-text-tertiary">Check-ins (7d)</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-xl font-bold text-text-primary font-mono tabular-nums leading-none">{weeklyCheckinsCount}</span>
              <span className="text-[10px] text-text-secondary">novo{weeklyCheckinsCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Filters bar + Search query input */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
          {/* Tabs filters */}
          <div className="flex gap-1 p-0.5 bg-surface-2 border border-border-subtle rounded-md h-8.5 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] items-center">
            {([
              { key: 'todos', label: 'Todos', count: totalCount },
              { key: 'nao_respondidos', label: 'Pendentes', count: unansweredCount },
              { key: 'pos_treino', label: 'Pós-Treino', count: postWorkoutCount },
              { key: 'dashboard', label: 'Dashboard', count: totalCount - postWorkoutCount },
              { key: 'dor', label: 'Dor', count: painCount },
              { key: 'respondidos', label: 'Respondidos', count: answeredCount },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={cn(
                  "shrink-0 px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all h-6.5 flex items-center justify-center",
                  filtro === key
                    ? "bg-surface-0 border border-border-subtle/50 text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {label} <span className="opacity-60 font-mono text-[9px] ml-1">({count})</span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-[280px] shrink-0">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
              <MagnifyingGlass size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar por aluno..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-7.5 bg-surface-2 border border-border-subtle rounded-md text-2xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
            />
          </div>
        </div>

        {/* Feedbacks cards grid */}
        {filteredFeedbacks.length === 0 ? (
          <div className="text-center py-10 bg-surface-1 border border-dashed border-border-subtle rounded-md mt-6">
            <ChatCircle size={24} className="text-text-disabled mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-text-secondary">
              Nenhum feedback
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-6">
            {filteredFeedbacks.map((feedback) => {
              const name = feedback.aluno_nome || "Aluno";
              const initial = name[0].toUpperCase();
              const hasPain = isPainFeedback(feedback);

              return (
                <div 
                  key={feedback.id}
                  className={cn(
                    "p-4 flex flex-col gap-3.5 transition-all border rounded-xl shadow-sm bg-surface-1",
                    hasPain 
                      ? "border-danger-border bg-danger-subtle/5" 
                      : "border-border-subtle hover:border-brand/20"
                  )}
                >
                  <div>
                    {/* Header: User avatar + name + date */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded bg-gradient-to-br shrink-0 flex items-center justify-center font-bold text-xs text-white",
                          avatarGrad(name)
                        )}>
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">
                            {feedback.aluno_reference || name}
                          </p>
                          <p className="text-[9px] text-text-tertiary truncate leading-none mt-0.5">{feedback.aluno_email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                          "text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                          feedback.tipo === 'treino_completo'
                            ? "bg-brand/10 text-brand"
                            : "bg-surface-3 text-text-secondary border border-border-subtle"
                        )}>
                          {feedback.tipo === 'treino_completo' ? 'Pós-Treino' : 'Dashboard'}
                        </span>
                        
                        <span className={cn(
                          "text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-0.5",
                          feedback.respondido
                            ? "bg-success-subtle text-success border border-success-border/10"
                            : "bg-warning-subtle text-warning border border-warning-border/10"
                        )}>
                          {feedback.respondido ? <CheckCircle size={9} /> : <WarningCircle size={9} />}
                          {feedback.respondido ? 'Respondido' : 'Pendente'}
                        </span>
                      </div>
                    </div>

                    {/* Ficha connection if exists */}
                    {feedback.ficha_nome && (
                      <div className="flex items-center gap-1.5 mb-2 text-[10px] text-text-tertiary">
                        <Barbell size={12} className="text-brand shrink-0" />
                        <span className="truncate">Rotina: <span className="font-semibold text-text-secondary">{feedback.ficha_nome}</span></span>
                      </div>
                    )}

                    {/* Feedback content text */}
                    <div className="bg-surface-2 border border-border-subtle/50 rounded-lg px-3 py-2 text-xs text-text-primary leading-relaxed whitespace-pre-wrap font-medium">
                      {feedback.texto_aluno}
                      {hasPain && (
                        <div className="mt-1 text-[9px] text-danger font-bold flex items-center gap-1">
                          <WarningCircle size={10} /> Alerta de desconforto/dor
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1 text-[9px] text-text-disabled mt-2">
                      <Calendar size={10} />
                      <span>
                        {new Date(feedback.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Coach response area */}
                  <div className="pt-3 border-t border-border-subtle/50 flex flex-col gap-2">
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

                    {/* Reply Form */}
                    <div className="flex items-stretch gap-1.5">
                      <input
                        type="text"
                        placeholder={feedback.resposta_coach ? "Editar sua resposta..." : "Responder feedback..."}
                        value={replyTextMap[feedback.id] ?? ""}
                        onChange={(e) => setReplyTextMap(prev => ({ ...prev, [feedback.id]: e.target.value }))}
                        disabled={submittingReplyId === feedback.id}
                        className="flex-1 px-3 py-1.5 bg-surface-2 border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                      />
                      <button
                        onClick={() => handleSendReply(feedback.id, feedback.feedback)}
                        disabled={submittingReplyId === feedback.id || !(replyTextMap[feedback.id]?.trim())}
                        className="w-9 h-9 rounded-lg bg-brand text-text-on-brand flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shrink-0 disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
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
