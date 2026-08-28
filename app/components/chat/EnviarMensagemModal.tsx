"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, PaperPlaneTilt } from "@phosphor-icons/react";
import { StudentAvatar } from "@/app/components/profile/StudentAvatar";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { getSafeSession } from "@/lib/authErrorHandler";
import { getOuCriarConversa } from "@/lib/chat/queries";
import { enviarMensagem } from "@/lib/chat/actions";
import type { ChatListItem } from "@/lib/chat/queries";

interface EnviarMensagemModalProps {
  alunos: ChatListItem[];
  onClose: () => void;
  /** Chamado com o id da conversa depois de enviar — a tela decide se navega. */
  onSent: (conversaId: string) => void;
}

/**
 * Compõe e envia a primeira mensagem pra um aluno — igual ao Nutrium, mas
 * sem "Categoria"/"Assunto"/"Arquivar"/"Notificar por email": nosso chat é
 * uma conversa única por aluno, sem esse conceito de thread com categoria.
 */
export function EnviarMensagemModal({ alunos, onClose, onSent }: EnviarMensagemModalProps) {
  const [alunoId, setAlunoId] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const alunoOptions = [...alunos]
    .sort((a, b) => (a.outro.full_name ?? "").localeCompare(b.outro.full_name ?? "", "pt-BR"))
    .map((a) => ({ value: a.alunoId, label: a.outro.full_name ?? "Aluno" }));

  const alunoSelecionado = alunos.find((a) => a.alunoId === alunoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoId) {
      setError("Selecione o aluno.");
      return;
    }
    if (!texto.trim()) {
      setError("Escreva a mensagem.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const session = await getSafeSession();
      if (!session?.user?.id || !session.access_token) {
        setError("Sessão inválida. Faça login novamente.");
        return;
      }
      const conversaId = await getOuCriarConversa(alunoId, session.user.id);
      const result = await enviarMensagem(session.access_token, conversaId, texto.trim());
      if (!result.success) {
        setError("Não foi possível enviar a mensagem.");
        return;
      }
      onSent(conversaId);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao enviar mensagem");
    } finally {
      setEnviando(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface-1"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
          <h2 className="text-sm font-bold text-text-primary">Enviar mensagem</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-text-tertiary hover:text-text-primary"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-5">
          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
              Enviar para
            </label>
            <Select
              value={alunoId}
              onChange={setAlunoId}
              options={alunoOptions}
              placeholder="Selecionar aluno…"
              leftIcon={
                alunoSelecionado ? (
                  <StudentAvatar
                    name={alunoSelecionado.outro.full_name ?? "Aluno"}
                    avatarUrl={alunoSelecionado.outro.avatar_url}
                    sexo={alunoSelecionado.outro.sexo}
                    sizeClassName="h-5 w-5"
                  />
                ) : undefined
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="enviar-mensagem-texto"
              className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary"
            >
              Mensagem
            </label>
            <textarea
              id="enviar-mensagem-texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva aqui…"
              rows={5}
              maxLength={4000}
              className="w-full appearance-none resize-none rounded-[10px] border border-[#e4e4e7] bg-white px-3.5 py-3 text-[16px] text-text-primary placeholder:text-[12px] placeholder:text-text-disabled focus:border-brand focus:shadow-[0_0_0_3px_rgba(147,51,234,0.15)] focus:outline-none dark:border-[#2d3748] dark:bg-[#0d1117] dark:text-[#D8DCE6]"
            />
          </div>

          <div className="mt-2 flex items-center gap-3">
            <Button type="button" variant="secondary" fullWidth onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={enviando}
              rightIcon={<PaperPlaneTilt size={15} weight="fill" />}
            >
              Enviar mensagem
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
