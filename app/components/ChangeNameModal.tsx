'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  X,
  User,
  CheckCircle,
  WarningCircle,
  CircleNotch
} from '@phosphor-icons/react';

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
  onSuccess 
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
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
            <User size={24} />
          </div>
          <div>
            <h2 className="text-xl text-white uppercase tracking-tight">
              Alterar Nome
            </h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
              Atualize sua assinatura de atleta
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
        <form onSubmit={handleUpdateName} className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 ml-1">
              Nome Completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Digite seu nome e sobrenome"
              className="w-full bg-black border border-[#1a1a1a] text-white px-4 py-4 rounded-2xl text-sm focus:outline-none focus:border-[#D4AF37] transition-all font-medium placeholder:text-zinc-700"
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
              disabled={loading || !fullName.trim()}
              className="flex-1 px-6 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <CircleNotch className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}