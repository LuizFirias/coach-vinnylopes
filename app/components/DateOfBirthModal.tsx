'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  X,
  Calendar,
  CheckCircle,
  WarningCircle,
  CircleNotch
} from '@phosphor-icons/react';

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
  onSuccess 
}: DateOfBirthModalProps) {
  const [dateOfBirth, setDateOfBirth] = useState(currentDate);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const toDateOnly = (value: string) => value?.slice(0, 10) || '';

  useEffect(() => {
    if (isOpen) {
      setDateOfBirth(toDateOnly(currentDate || ''));
      setMessage(null);
    }
  }, [isOpen, currentDate]);

  const parseInputDate = (dateText: string) => {
    const [year, month, day] = dateText.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
  };

  const handleUpdateDate = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedDateOfBirth = toDateOnly(dateOfBirth);
    
    if (!normalizedDateOfBirth) {
      setMessage({ type: 'error', text: 'Selecione uma data de nascimento' });
      return;
    }

    // Validate date is not in the future
    const selectedDate = parseInputDate(normalizedDateOfBirth);
    const today = new Date();
    if (selectedDate > today) {
      setMessage({ type: 'error', text: 'A data de nascimento não pode ser no futuro' });
      return;
    }

    // Validate minimum age of 18 years using exact birthdate threshold.
    const minBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate(), 23, 59, 59, 999);
    if (selectedDate > minBirthDate) {
      setMessage({ type: 'error', text: 'Você deve ter no mínimo 18 anos' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ date_of_birth: normalizedDateOfBirth })
        .eq('id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Data de nascimento atualizada com sucesso!' });
      setTimeout(() => {
        onSuccess?.(normalizedDateOfBirth);
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative bg-[#0F0F0F] rounded-3xl border border-[#D4AF37]/20 shadow-2xl max-w-md w-full p-10 overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-all"
          title="Fechar"
        >
          <X size={20} className="text-zinc-400 hover:text-white" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-xl text-white uppercase tracking-tight">
              Data de Nascimento
            </h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
              Atualize sua informação pessoal
            </p>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-8 p-4 rounded-2xl flex items-center gap-4 text-[10px] uppercase tracking-widest ${
              message.type === 'success'
                ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle size={16} />
            ) : (
              <WarningCircle size={16} />
            )}
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleUpdateDate} className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 ml-1">
              Data
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full bg-black border border-[#1a1a1a] text-white px-4 py-4 rounded-2xl text-sm focus:outline-none focus:border-[#D4AF37] transition-all font-medium"
              disabled={loading}
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[#0F0F0F] border border-[#1a1a1a] text-zinc-500 text-[10px] uppercase tracking-[0.3em] rounded-xl hover:bg-white/5 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !dateOfBirth}
              className="flex-1 px-6 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <CircleNotch className="w-4 h-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Confirmar'
              )}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
          <p className="text-[9px] text-blue-400 leading-relaxed">
            💡 Sua data de nascimento é uma informação pessoal importante para o programa de treinamento personalizado.
          </p>
        </div>
      </div>
    </div>
  );
}
