'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { X, User, CheckCircle, WarningCircle, CircleNotch } from '@phosphor-icons/react';

interface ChangeNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentName?: string;
  onSuccess?: (newName: string) => void;
}

export default function ChangeNameModal({
  isOpen,
  onClose,
  userId,
  currentName = '',
  onSuccess,
}: ChangeNameModalProps) {
  const [fullName, setFullName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setMessage({ type: 'error', text: 'Insira seu nome completo' });
      return;
    }
    if (trimmedName.split(' ').filter(Boolean).length < 2) {
      setMessage({ type: 'error', text: 'Por favor, insira sobrenome também' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ full_name: trimmedName })
        .eq('id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Nome atualizado com sucesso!' });
      setTimeout(() => {
        onSuccess?.(trimmedName);
        onClose();
      }, 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar nome' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-surface-1 border border-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-divider">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
              <User size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Alterar nome</h2>
              <p className="text-xs text-text-tertiary mt-0.5">Atualize sua assinatura de atleta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-2 rounded-xl transition-colors text-text-tertiary hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleUpdateName} className="px-6 py-5 space-y-4">
          {message && (
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-medium ${
              message.type === 'success'
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-danger/10 text-danger border border-danger/20'
            }`}>
              {message.type === 'success'
                ? <CheckCircle size={15} weight="fill" />
                : <WarningCircle size={15} weight="fill" />}
              {message.text}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">
              Nome Completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setMessage(null); }}
              placeholder="Digite seu nome e sobrenome"
              disabled={loading}
              required
              className="w-full h-12 bg-surface-0 border border-input text-text-primary px-4 rounded-xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-11 bg-surface-2 border border-card text-text-secondary text-xs font-semibold rounded-xl hover:bg-surface-3 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !fullName.trim()}
              className="flex-1 h-11 bg-brand hover:opacity-90 text-text-on-brand text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <CircleNotch className="w-4 h-4 animate-spin" />
                  Salvando…
                </>
              ) : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}