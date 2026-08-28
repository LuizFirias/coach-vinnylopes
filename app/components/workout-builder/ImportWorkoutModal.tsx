"use client";

import { useRef, useState } from "react";
import {
  X,
  Sparkle,
  FileArrowUp,
  TextAlignLeft,
  CircleNotch,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { BodyPortal, useLockBodyScroll } from "@/app/components/ui/BodyPortal";
import { supabaseClient } from "@/lib/supabaseClient";
import { matchExercicioNome } from "@/lib/utils/matchExercicioNome";

interface CatalogItem {
  id: string;
  nome: string;
  tipo_exercicio?: string;
  video_url?: string;
  gif_url?: string;
  gif_url_feminino?: string;
  imagem_url?: string;
  imagem_url_feminino?: string;
}

interface ImportedSerie {
  reps?: string;
  peso?: number;
  tempo?: string;
}

interface ImportedExercicio {
  nome: string;
  descanso?: string;
  observacoes?: string;
  series: ImportedSerie[];
}

export interface ImportMatchedExercicio<T extends CatalogItem> {
  exercicio: T;
  series: ImportedSerie[];
  descanso?: string;
  observacoes?: string;
}

interface ImportWorkoutModalProps<T extends CatalogItem> {
  open: boolean;
  onClose: () => void;
  catalog: T[];
  onImport: (matched: ImportMatchedExercicio<T>[]) => void;
}

type Tab = "texto" | "pdf";
type Step = "input" | "revisao";

export function ImportWorkoutModal<T extends CatalogItem>({
  open,
  onClose,
  catalog,
  onImport,
}: ImportWorkoutModalProps<T>) {
  const [tab, setTab] = useState<Tab>("texto");
  const [step, setStep] = useState<Step>("input");
  const [texto, setTexto] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resultado, setResultado] = useState<
    { nome: string; series: ImportedSerie[]; descanso?: string; observacoes?: string; match: T | null }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useLockBodyScroll(open);

  if (!open) return null;

  const reset = () => {
    setTab("texto");
    setStep("input");
    setTexto("");
    setFile(null);
    setError(null);
    setResultado([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Selecione um arquivo PDF.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleGerar = async () => {
    setError(null);
    if (tab === "texto" && !texto.trim()) {
      setError("Cole o texto do treino.");
      return;
    }
    if (tab === "pdf" && !file) {
      setError("Selecione um arquivo PDF.");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      let response: Response;
      if (tab === "pdf" && file) {
        const formData = new FormData();
        formData.append("file", file);
        response = await fetch("/api/admin/treinos/importar-ia", {
          method: "POST",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          body: formData,
        });
      } else {
        response = await fetch("/api/admin/treinos/importar-ia", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ texto }),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Erro ao importar treino.");
      }

      const exercicios = (data.exercicios || []) as ImportedExercicio[];
      const comMatch = exercicios.map((ex) => ({
        nome: ex.nome,
        series: ex.series,
        descanso: ex.descanso,
        observacoes: ex.observacoes,
        match: matchExercicioNome(ex.nome, catalog),
      }));

      setResultado(comMatch);
      setRemaining(typeof data.remaining === "number" ? data.remaining : null);
      setStep("revisao");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar treino.");
    } finally {
      setLoading(false);
    }
  };

  const matchedCount = resultado.filter((r) => r.match).length;

  const handleConfirmar = () => {
    const matched: ImportMatchedExercicio<T>[] = resultado
      .filter((r): r is typeof r & { match: T } => r.match !== null)
      .map((r) => ({
        exercicio: r.match,
        series: r.series,
        descanso: r.descanso,
        observacoes: r.observacoes,
      }));
    onImport(matched);
    handleClose();
  };

  return (
    <BodyPortal open={open}>
      <div
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        style={{
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          paddingTop: "max(1rem, env(safe-area-inset-top))",
        }}
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-label="Importar treino com IA"
      >
        <div
          className="w-full max-w-lg bg-surface-1 border-0 rounded-2xl shadow-elev-3 overflow-hidden animate-slide-up max-h-[min(88dvh,720px)] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-divider shrink-0">
            <div className="flex items-center gap-2">
              <Sparkle size={18} weight="fill" className="text-brand" />
              <h3 className="text-sm font-semibold text-text-primary">Importar treino com IA</h3>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-2 text-text-secondary"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {step === "input" ? (
            <>
              <div className="flex gap-1 p-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setTab("texto")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold transition-colors border-0",
                    tab === "texto" ? "bg-brand/15 text-brand" : "bg-transparent text-text-tertiary hover:text-text-primary",
                  )}
                >
                  <TextAlignLeft size={14} /> Colar texto
                </button>
                <button
                  type="button"
                  onClick={() => setTab("pdf")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold transition-colors border-0",
                    tab === "pdf" ? "bg-brand/15 text-brand" : "bg-transparent text-text-tertiary hover:text-text-primary",
                  )}
                >
                  <FileArrowUp size={14} /> Enviar PDF
                </button>
              </div>

              <div className="overflow-y-auto flex-1 min-h-0 px-4 pb-2">
                {tab === "texto" ? (
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder={"Cole o treino aqui, do jeito que estiver escrito. Ex.:\n\nSupino reto 3x10\nRosca direta 3x12 carga 15kg\nPrancha 3x30s"}
                    rows={10}
                    className="w-full bg-surface-2 border border-input text-text-primary px-3 py-2.5 rounded-lg text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors resize-none"
                  />
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {!file ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-1.5 h-32 rounded-xl border border-dashed border-border-subtle text-text-tertiary hover:border-brand/40 hover:text-brand transition-colors"
                      >
                        <FileArrowUp size={22} />
                        <span className="text-xs font-semibold">Clique para escolher um PDF</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between h-32 rounded-xl border border-input bg-surface-2 px-4">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate max-w-[280px]">{file.name}</p>
                          <p className="text-[10px] text-brand mt-0.5">PDF pronto para envio</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-text-disabled hover:text-danger p-1 shrink-0"
                          aria-label="Remover arquivo"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <p className="mt-2 text-xs text-danger flex items-center gap-1.5">
                    <WarningCircle size={14} /> {error}
                  </p>
                )}
              </div>

              <div className="shrink-0 p-3 border-t border-divider">
                <button
                  type="button"
                  onClick={handleGerar}
                  disabled={loading}
                  className="w-full h-10 bg-brand text-text-on-brand rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <CircleNotch size={16} className="animate-spin" /> Analisando com IA...
                    </>
                  ) : (
                    <>
                      <Sparkle size={14} weight="fill" /> Gerar exercícios
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="overflow-y-auto flex-1 min-h-0 px-4 py-3">
                <p className="text-xs text-text-secondary mb-3">
                  {matchedCount} de {resultado.length} exercício{resultado.length !== 1 ? "s" : ""} reconhecido
                  {resultado.length !== 1 ? "s" : ""} na biblioteca.
                  {remaining !== null && (
                    <> Restam {remaining} importaç{remaining === 1 ? "ão" : "ões"} essa semana.</>
                  )}
                </p>
                <div className="flex flex-col gap-2">
                  {resultado.map((r, i) => (
                    <div
                      key={`${r.nome}-${i}`}
                      className="flex items-start gap-2.5 rounded-xl border-0 bg-surface-2 px-3 py-2.5"
                    >
                      {r.match ? (
                        <CheckCircle size={18} weight="fill" className="text-success shrink-0 mt-0.5" />
                      ) : (
                        <WarningCircle size={18} weight="fill" className="text-warning shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-text-primary truncate">
                          {r.match ? r.match.nome : r.nome}
                        </p>
                        <p className="text-[10px] text-text-tertiary mt-0.5">
                          {r.series.length > 0
                            ? `${r.series.length} série${r.series.length !== 1 ? "s" : ""}`
                            : "sem séries identificadas"}
                          {!r.match && " · não encontrado na biblioteca — não será importado"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="shrink-0 p-3 border-t border-divider flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="h-10 px-4 rounded-xl text-xs font-semibold text-text-secondary hover:bg-surface-2 border-0"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmar}
                  disabled={matchedCount === 0}
                  className="flex-1 h-10 bg-brand text-text-on-brand rounded-xl text-xs font-semibold disabled:opacity-60"
                >
                  Adicionar {matchedCount} exercício{matchedCount !== 1 ? "s" : ""} à ficha
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </BodyPortal>
  );
}
