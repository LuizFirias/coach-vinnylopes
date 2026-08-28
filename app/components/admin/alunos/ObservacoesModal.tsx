'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PencilSimple, Plus, Trash, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import {
  criarObservacao,
  excluirObservacao,
  type AlunoObservacao,
  type ObservacaoTipo,
} from '@/lib/observacoes/queries';
import { supabaseClient } from '@/lib/supabaseClient';

interface ObservacoesModalProps {
  alunoId: string;
  coachId: string | null;
  tipo: ObservacaoTipo;
  title: string;
  itens: AlunoObservacao[];
  onClose: () => void;
  /** Sincroniza a lista com o card por trás do modal */
  onItensChange: (itens: AlunoObservacao[]) => void;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Modal "ver todas" — lista à esquerda (busca + itens), detalhe à direita.
 * Igual ao padrão Notes do Everfit, adaptado sem o dropdown de ordenação
 * (só temos uma ordem: mais recentes primeiro — não fabricamos um seletor
 * que não muda nada).
 */
export function ObservacoesModal({
  alunoId,
  coachId,
  tipo,
  title,
  itens,
  onClose,
  onItensChange,
}: ObservacoesModalProps) {
  const [mounted, setMounted] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(itens[0]?.id ?? null);
  const [novo, setNovo] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter((o) => o.conteudo.toLowerCase().includes(q));
  }, [itens, busca]);

  const selecionado = itens.find((o) => o.id === selecionadoId) ?? filtrados[0] ?? null;

  async function handleCriar() {
    if (!coachId || !draft.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await criarObservacao(alunoId, coachId, draft, tipo);
      if (created) {
        const next = [created, ...itens];
        onItensChange(next);
        setSelecionadoId(created.id);
        setDraft('');
        setNovo(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir(id: string) {
    if (!window.confirm('Excluir este registro?')) return;
    try {
      await excluirObservacao(id);
      const next = itens.filter((o) => o.id !== id);
      onItensChange(next);
      if (selecionadoId === id) setSelecionadoId(next[0]?.id ?? null);
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir');
    }
  }

  async function handleEditar(obs: AlunoObservacao, novoConteudo: string) {
    const texto = novoConteudo.trim();
    if (!texto || texto === obs.conteudo) return;
    const { data, error: err } = await supabaseClient
      .from('aluno_observacoes')
      .update({ conteudo: texto })
      .eq('id', obs.id)
      .select('id, aluno_id, coach_id, conteudo, criada_em, visualizada_em, finalizada_em, tipo')
      .single();
    if (!err && data) {
      onItensChange(itens.map((o) => (o.id === obs.id ? (data as AlunoObservacao) : o)));
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative flex h-[min(680px,88vh)] w-full max-w-3xl overflow-hidden rounded-2xl bg-surface-1"
        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}
      >
        {/* Coluna esquerda — busca + lista */}
        <div className="flex w-[280px] shrink-0 flex-col border-r border-border-subtle">
          <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-border-subtle">
            <h2 className="text-sm font-bold text-text-primary">
              {title} ({itens.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                setNovo(true);
                setDraft('');
              }}
              className="inline-flex items-center gap-1 bg-transparent border-0 text-[12px] font-semibold text-brand hover:text-brand-hover"
            >
              <Plus size={13} weight="bold" />
              Novo
            </button>
          </div>

          <div className="px-3 py-2.5 border-b border-border-subtle">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar…"
              className="w-full rounded-lg bg-surface-2/60 border-0 px-2.5 py-1.5 text-[12px] text-text-primary placeholder:text-text-tertiary outline-none"
            />
          </div>

          <ul className="flex-1 overflow-y-auto scrollbar-brand-thin">
            {filtrados.length === 0 ? (
              <li className="px-4 py-6 text-center text-[11px] text-text-tertiary">Nada encontrado.</li>
            ) : (
              filtrados.map((obs) => (
                <li key={obs.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelecionadoId(obs.id);
                      setNovo(false);
                    }}
                    className={cn(
                      'w-full border-0 border-b border-border-subtle/60 px-4 py-3 text-left transition-colors',
                      selecionado?.id === obs.id && !novo ? 'bg-brand/10' : 'bg-transparent hover:bg-surface-2/50',
                    )}
                  >
                    <p className="text-[12.5px] font-semibold text-text-primary line-clamp-2 leading-snug">
                      {obs.conteudo}
                    </p>
                    <p className="mt-1 text-[10.5px] text-text-tertiary">{formatDateTime(obs.criada_em)}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Coluna direita — detalhe */}
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-b border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-text-tertiary hover:text-text-primary"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {novo ? (
              <div className="flex flex-col gap-3">
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escreva aqui…"
                  rows={8}
                  className="w-full resize-none rounded-lg border border-border-subtle bg-transparent px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand"
                />
                {error && <p className="text-[11px] text-danger">{error}</p>}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setNovo(false)}
                    className="bg-transparent border-0 text-[12px] font-medium text-text-tertiary hover:text-text-primary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={saving || !draft.trim()}
                    onClick={() => void handleCriar()}
                    className="bg-transparent border-0 text-[12px] font-semibold text-brand disabled:opacity-40"
                  >
                    {saving ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </div>
            ) : selecionado ? (
              <DetalheObservacao
                key={selecionado.id}
                obs={selecionado}
                onExcluir={() => void handleExcluir(selecionado.id)}
                onEditar={(texto) => void handleEditar(selecionado, texto)}
              />
            ) : (
              <p className="text-[12px] text-text-tertiary text-center py-8">
                Nenhum registro ainda. Clique em &ldquo;Novo&rdquo; para adicionar.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DetalheObservacao({
  obs,
  onExcluir,
  onEditar,
}: {
  obs: AlunoObservacao;
  onExcluir: () => void;
  onEditar: (texto: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(obs.conteudo);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 text-[11px] text-text-tertiary">
          <span>Criada em: {formatDateTime(obs.criada_em)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onExcluir}
            aria-label="Excluir"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/5 bg-transparent border-0"
          >
            <Trash size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              setTexto(obs.conteudo);
              setEditando((v) => !v);
            }}
            aria-label="Editar"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg bg-transparent border-0',
              editando ? 'text-brand bg-brand/10' : 'text-text-tertiary hover:text-text-primary hover:bg-surface-2',
            )}
          >
            <PencilSimple size={15} />
          </button>
        </div>
      </div>

      {editando ? (
        <div className="flex flex-col gap-2">
          <textarea
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
            className="w-full resize-none rounded-lg border border-border-subtle bg-transparent px-3 py-2.5 text-[13px] text-text-primary outline-none focus:border-brand"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="bg-transparent border-0 text-[12px] font-medium text-text-tertiary hover:text-text-primary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onEditar(texto);
                setEditando(false);
              }}
              className="bg-transparent border-0 text-[12px] font-semibold text-brand"
            >
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap">{obs.conteudo}</p>
      )}
    </div>
  );
}
