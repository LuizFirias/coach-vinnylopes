'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { X, Calendar, CheckCircle, WarningCircle, CircleNotch } from '@phosphor-icons/react';

interface DateOfBirthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentDate?: string;
  onSuccess?: (newDate: string) => void;
}

export default function DateOfBirthModal({
  isOpen,
  onClose,
  userId,
  currentDate = '',
  onSuccess,
}: DateOfBirthModalProps) {
  const [dateOfBirth, setDateOfBirth] = useState(currentDate);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateDate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateOfBirth) {
      setMessage({ type: 'error', text: 'Selecione uma data de nascimento' });
      return;
    }

    const selected = new Date(dateOfBirth);
    const today = new Date();
    if (selected > today) {
      setMessage({ type: 'error', text: 'A data de nascimento não pode ser no futuro' });
      return;
    }

    const age = today.getFullYear() - selected.getFullYear();
    const monthDiff = today.getMonth() - selected.getMonth();
    const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < selected.getDate()) ? age - 1 : age;
    if (adjustedAge < 18) {
      setMessage({ type: 'error', text: 'Você deve ter no mínimo 18 anos' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ date_of_birth: dateOfBirth })
        .eq('id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Data de nascimento atualizada!' });
      setTimeout(() => {
        onSuccess?.(dateOfBirth);
        onClose();
      }, 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar data' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-surface-1 border border-border-subtle rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Data de nascimento</h2>
              <p className="text-xs text-text-tertiary mt-0.5">Atualize sua informação pessoal</p>
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
        <form onSubmit={handleUpdateDate} className="px-6 py-5 space-y-4">
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
              Data
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => { setDateOfBirth(e.target.value); setMessage(null); }}
              disabled={loading}
              required
              className="w-full min-w-0 h-12 bg-surface-0 border border-border-subtle text-text-primary px-4 rounded-xl text-base focus:outline-none focus:border-brand/40 transition-colors [color-scheme:dark]"
            />
          </div>

          <div className="flex items-start gap-2 px-3 py-2.5 bg-brand/5 border border-brand/15 rounded-xl">
            <span className="text-xs text-text-tertiary leading-relaxed">
              Sua data de nascimento é usada para personalizar seu programa de treinamento.
            </span>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-11 bg-surface-2 border border-border-subtle text-text-secondary text-xs font-semibold rounded-xl hover:bg-surface-3 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !dateOfBirth}
              className="flex-1 h-11 bg-brand hover:opacity-90 text-text-on-brand text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <CircleNotch className="w-4 h-4 animate-spin" />
                  Salvando…
                </>
              ) : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
