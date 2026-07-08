'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  X, Lock, CheckCircle, WarningCircle, Eye, EyeSlash, CircleNotch, Check
} from '@phosphor-icons/react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function PasswordField({
  label, value, onChange, show, onToggle, placeholder, onClearMessage,
}: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; placeholder: string;
  onClearMessage?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => { onChange(e.target.value); onClearMessage?.(); }}
          placeholder={placeholder}
          className="w-full h-12 bg-surface-0 border border-border-subtle text-text-primary px-4 pr-12 rounded-xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
        />
        <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors">
          {show ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const req = {
    minLength: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[!@#$%&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(newPassword),
  };
  const isValid = Object.values(req).every(Boolean);
  const match = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!currentPassword) { setMessage({ type: 'error', text: 'Digite sua senha atual' }); return; }
    if (!isValid) { setMessage({ type: 'error', text: 'A senha não atende aos requisitos de segurança' }); return; }
    if (!match) { setMessage({ type: 'error', text: 'As senhas não coincidem' }); return; }

    setLoading(true);
    setMessage(null);

    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const email = authData?.user?.email;
      if (!email) throw new Error('Usuário não autenticado');

      const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password: currentPassword });
      if (signInError) throw new Error('Senha atual incorreta');

      const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => { onClose(); onSuccess?.(); }, 2000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar senha' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-surface-1 border border-border-subtle rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Trocar senha</h2>
              <p className="text-xs text-text-tertiary mt-0.5">Atualize sua credencial de acesso</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-2 rounded-xl transition-colors text-text-tertiary hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {message && (
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-medium ${
              message.type === 'success'
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-danger/10 text-danger border border-danger/20'
            }`}>
              {message.type === 'success' ? <CheckCircle size={15} weight="fill" /> : <WarningCircle size={15} weight="fill" />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField label="Senha Atual" value={currentPassword} onChange={setCurrentPassword} show={showCurrent} onToggle={() => setShowCurrent(v => !v)} placeholder="Digite sua senha atual" onClearMessage={() => setMessage(null)} />
            <PasswordField label="Nova Senha" value={newPassword} onChange={setNewPassword} show={showNew} onToggle={() => setShowNew(v => !v)} placeholder="Crie uma senha forte" onClearMessage={() => setMessage(null)} />

            {/* Requisitos */}
            {newPassword.length > 0 && (
              <div className="bg-surface-0 border border-border-subtle rounded-xl p-4 space-y-2">
                <p className="text-2xs font-bold uppercase tracking-caps text-brand mb-2">Requisitos de segurança</p>
                {[
                  [req.minLength, 'Mínimo 8 caracteres'],
                  [req.hasUpper, 'Letra maiúscula (A-Z)'],
                  [req.hasLower, 'Letra minúscula (a-z)'],
                  [req.hasNumber, 'Número (0-9)'],
                  [req.hasSpecial, 'Caractere especial (!@#$…)'],
                ].map(([ok, label]) => (
                  <div key={label as string} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${ok ? 'bg-brand/20 text-brand' : 'bg-surface-2 text-text-disabled'}`}>
                      {ok && <Check size={9} weight="bold" />}
                    </div>
                    <span className={`text-xs transition-colors ${ok ? 'text-brand' : 'text-text-tertiary'}`}>{label as string}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">Confirmar Nova Senha</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setMessage(null); }}
                  placeholder="Repita a nova senha"
                  className={`w-full h-12 bg-surface-0 border text-text-primary px-4 pr-20 rounded-xl text-sm placeholder:text-text-disabled focus:outline-none transition-colors ${
                    confirmPassword.length > 0
                      ? match ? 'border-success/40 focus:border-success/60' : 'border-danger/40 focus:border-danger/60'
                      : 'border-border-subtle focus:border-brand/40'
                  }`}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {confirmPassword && (
                    match
                      ? <Check className="text-success" size={15} />
                      : <WarningCircle className="text-danger" size={15} />
                  )}
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-text-tertiary hover:text-text-secondary transition-colors">
                    {showConfirm ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-5 border-t border-border-subtle flex-shrink-0">
          <button type="button" onClick={onClose} disabled={loading} className="flex-1 h-11 bg-surface-2 border border-border-subtle text-text-secondary text-xs font-semibold rounded-xl hover:bg-surface-3 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !isValid || !match || !currentPassword}
            className="flex-1 h-11 bg-brand hover:opacity-90 text-text-on-brand text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (<><CircleNotch className="w-4 h-4 animate-spin" />Atualizando…</>) : (<><Lock size={14} />Confirmar</>)}
          </button>
        </div>
      </div>
    </div>
  );
}