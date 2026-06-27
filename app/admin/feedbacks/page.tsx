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
      (f.aluno_nome?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (f.aluno_reference?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (f.texto_aluno?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (f.resposta_coach?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (f.ficha_nome?.toLowerCase() || '').includes(searchQuery.toLowerCase());

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
    <div className="min-h-screen bg-surface-0 pb-28 lg:pl-28">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* Header */}
        <div className="py-6 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Feedbacks</h1>
            <p className="text-xs md:text-sm text-text-tertiary mt-1">
              Acompanhe retornos, check-ins e sinais de atenção dos alunos
            </p>
          </div>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Card className="p-4 bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Não respondidos</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-mono text-3xl font-bold text-warning leading-none">{unansweredCount}</span>
              <span className="text-xs text-text-secondary">pendente{unansweredCount !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-[10px] text-text-tertiary mt-2">Aguardando resposta do coach</p>
          </Card>

          <Card className="p-4 bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Dor / Desconforto</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-mono text-3xl font-bold text-danger leading-none">{painCount}</span>
              <span className="text-xs text-text-secondary">registro{painCount !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-[10px] text-danger mt-2 font-medium flex items-center gap-1">
              <WarningCircle size={12} className="shrink-0" /> Sinais de atenção
            </p>
          </Card>

          <Card className="p-4 bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Pós-treino</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-mono text-3xl font-bold text-text-primary leading-none">{postWorkoutCount}</span>
              <span className="text-xs text-text-secondary">envio{postWorkoutCount !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-[10px] text-text-tertiary mt-2">Feedbacks pós-execução</p>
          </Card>

          <Card className="p-4 bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Check-ins da semana</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-mono text-3xl font-bold text-text-primary leading-none">{weeklyCheckinsCount}</span>
              <span className="text-xs text-text-secondary">novo{weeklyCheckinsCount !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-[10px] text-success mt-2 font-medium">Últimos 7 dias</p>
          </Card>
        </div>

        {/* Filters bar + Search query input */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
          {/* Tabs filters */}
          <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-hide">
            {([
              { key: 'todos', label: 'Todos', count: totalCount },
              { key: 'nao_respondidos', label: 'Não Respondidos', count: unansweredCount },
              { key: 'pos_treino', label: 'Pós-Treino', count: postWorkoutCount },
              { key: 'dashboard', label: 'Dashboard', count: totalCount - postWorkoutCount },
              { key: 'dor', label: 'Dor/Desconforto', count: painCount },
              { key: 'respondidos', label: 'Respondidos', count: answeredCount },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={cn(
                  "shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border",
                  filtro === key
                    ? "bg-brand text-text-on-brand border-brand shadow-glow-brand"
                    : "bg-surface-1 border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default"
                )}
              >
                {label} <span className="opacity-70 font-mono text-[10px]">({count})</span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64 shrink-0">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
              <MagnifyingGlass size={16} />
            </span>
            <input
              type="text"
              placeholder="Buscar por aluno ou mensagem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface-1 border border-border-default rounded-xl text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors shadow-elev-1"
            />
          </div>
        </div>

        {/* Feedbacks cards grid */}
        {filteredFeedbacks.length === 0 ? (
          <div className="text-center py-20 bg-surface-1 border border-dashed border-border-subtle rounded-2xl mt-6 shadow-elev-1">
            <ChatCircle size={36} className="text-text-disabled mx-auto mb-2" />
            <p className="text-xs font-bold text-text-secondary uppercase tracking-caps">
              Nenhum feedback encontrado
            </p>
            <p className="text-[11px] text-text-tertiary mt-1 max-w-xs mx-auto">
              Quando os alunos enviarem retornos, check-ins ou registrarem desconforto, os dados serão listados aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {filteredFeedbacks.map((feedback) => {
              const name = feedback.aluno_nome || "Aluno";
              const initial = name[0].toUpperCase();
              const hasPain = isPainFeedback(feedback);

              return (
                <Card 
                  key={feedback.id}
                  className={cn(
                    "p-5 flex flex-col justify-between transition-all border rounded-2xl shadow-elev-1",
                    hasPain 
                      ? "border-danger-border bg-danger-subtle/5" 
                      : "border-border-subtle hover:border-brand/20"
                  )}
                >
                  <div>
                    {/* Header: User avatar + name + date */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-9 h-9 rounded-lg bg-gradient-to-br shrink-0 flex items-center justify-center font-bold text-xs text-white",
                          avatarGrad(name)
                        )}>
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">
                            {feedback.aluno_reference || name}
                          </p>
                          <p className="text-[10px] text-text-tertiary truncate">{feedback.aluno_email}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-caps px-2 py-0.5 rounded-md",
                          feedback.tipo === 'treino_completo'
                            ? "bg-brand/10 text-brand"
                            : "bg-surface-3 text-text-secondary"
                        )}>
                          {feedback.tipo === 'treino_completo' ? 'Pós-Treino' : 'Dashboard'}
                        </span>
                        
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-caps px-2 py-0.5 rounded-md flex items-center gap-1",
                          feedback.respondido
                            ? "bg-success-subtle text-success"
                            : "bg-warning-subtle text-warning"
                        )}>
                          {feedback.respondido ? <CheckCircle size={10} /> : <WarningCircle size={10} />}
                          {feedback.respondido ? 'Respondido' : 'Pendente'}
                        </span>
                      </div>
                    </div>

                    {/* Ficha connection if exists */}
                    {feedback.ficha_nome && (
                      <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 bg-surface-2 rounded-xl border border-border-subtle text-[11px] text-text-secondary font-medium">
                        <Barbell size={13} className="text-brand shrink-0" />
                        <span className="truncate">{feedback.ficha_nome}</span>
                      </div>
                    )}

                    {/* Feedback content text */}
                    <div className="bg-surface-2/60 border border-border-subtle/50 rounded-xl px-4 py-3 text-xs text-text-primary leading-relaxed whitespace-pre-wrap font-medium">
                      {feedback.texto_aluno}
                      {hasPain && (
                        <div className="mt-2 text-[10px] text-danger font-semibold flex items-center gap-1">
                          <WarningCircle size={12} /> Alerta de desconforto/dor
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1 text-[10px] text-text-tertiary mt-3">
                      <Calendar size={12} />
                      <span>
                        {new Date(feedback.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Coach response area */}
                  <div className="mt-5 pt-4 border-t border-border-subtle flex flex-col gap-3">
                    {feedback.resposta_coach ? (
                      <div className="bg-brand-subtle/20 border border-brand-border/40 rounded-xl p-3 text-xs">
                        <p className="text-[10px] font-bold uppercase tracking-caps text-brand mb-1">
                          Sua Resposta:
                        </p>
                        <p className="text-text-secondary leading-relaxed font-medium">
                          {feedback.resposta_coach}
                        </p>
                      </div>
                    ) : null}

                    {/* Reply Form */}
                    <div className="flex items-stretch gap-2">
                      <input
                        type="text"
                        placeholder={feedback.resposta_coach ? "Editar sua resposta..." : "Responder feedback..."}
                        value={replyTextMap[feedback.id] ?? ""}
                        onChange={(e) => setReplyTextMap(prev => ({ ...prev, [feedback.id]: e.target.value }))}
                        disabled={submittingReplyId === feedback.id}
                        className="flex-1 px-3 py-2 bg-surface-2 border border-border-default rounded-xl text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                      />
                      <button
                        onClick={() => handleSendReply(feedback.id, feedback.feedback)}
                        disabled={submittingReplyId === feedback.id || !(replyTextMap[feedback.id]?.trim())}
                        className="w-10 rounded-xl bg-brand text-text-on-brand flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shrink-0 shadow-glow-brand disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
                        title="Enviar resposta"
                      >
                        {submittingReplyId === feedback.id ? (
                          <CircleNotch size={14} className="animate-spin" />
                        ) : (
                          <PaperPlaneRight size={14} weight="fill" />
                        )}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
