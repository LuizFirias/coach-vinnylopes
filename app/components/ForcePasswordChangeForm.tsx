'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { Lock, Eye, EyeSlash, CheckCircle, WarningCircle, CircleNotch, Check } from '@phosphor-icons/react';
import { getPostLoginPath } from '@/lib/auth/getPostLoginPath';

interface ForcePasswordChangeFormProps {
  redirectPath?: string;
}

export default function ForcePasswordChangeForm({ redirectPath }: ForcePasswordChangeFormProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setMessage({ type: 'error', text: 'A senha não atende aos requisitos de segurança' });
      return;
    }
    if (!match) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Sessão expirada. Faça login novamente.');

      const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user.id)
        .select('role, first_access_completed')
        .single();

      if (profileError) throw profileError;

      setMessage({ type: 'success', text: 'Senha criada com sucesso!' });

      const destination = redirectPath ?? getPostLoginPath({
        role: profile?.role ?? 'aluno',
        must_change_password: false,
        first_access_completed: profile?.first_access_completed,
      });

      setTimeout(() => router.replace(destination), 1500);
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : 'Erro ao atualizar senha';
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 flex flex-col items-center justify-center antialiased">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-brand/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-brand/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-brand-subtle border border-brand-border rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-brand" />
          </div>
          <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-1">Primeiro acesso</p>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Crie sua senha</h1>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            Por segurança, defina uma nova senha antes de continuar.
          </p>
        </div>

        <div className="bg-surface-1 border border-card shadow-elev-1 rounded-2xl p-6">
          {message && (
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-medium mb-4 ${
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">
                Nova senha
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setMessage(null); }}
                  placeholder="Crie uma senha forte"
                  autoFocus
                  className="w-full h-12 bg-surface-0 border border-input text-text-primary px-4 pr-12 rounded-xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showNew ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {newPassword.length > 0 && (
              <div className="bg-surface-0 border border-card rounded-xl p-4 space-y-2">
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
              <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setMessage(null); }}
                  placeholder="Repita a nova senha"
                  className={`w-full h-12 bg-surface-0 border text-text-primary px-4 pr-20 rounded-xl text-sm placeholder:text-text-disabled focus:outline-none transition-colors ${
                    confirmPassword.length > 0
                      ? match ? 'border-success/40 focus:border-success/60' : 'border-danger/40 focus:border-danger/60'
                      : 'border-card focus:border-brand/40'
                  }`}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {confirmPassword && (
                    match
                      ? <Check className="text-success" size={15} />
                      : <WarningCircle className="text-danger" size={15} />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    {showConfirm ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isValid || !match}
              className="w-full h-13 bg-brand text-text-on-brand rounded-2xl text-xs font-semibold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading
                ? (<><CircleNotch className="w-4 h-4 animate-spin" />Salvando…</>)
                : (<><Lock size={14} />Criar senha e continuar</>)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
