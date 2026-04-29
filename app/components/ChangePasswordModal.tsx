'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { 
  X, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2,
  Check,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation
  const validatePassword = (password: string) => {
    return {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
  };

  const passwordReq = validatePassword(newPassword);
  const isPasswordValid = Object.values(passwordReq).every(req => req);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleChangePassword = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    
    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Digite sua senha atual' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    if (!isPasswordValid) {
      setMessage({ type: 'error', text: 'A senha não atende aos requisitos de segurança' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Verificar senha atual
      const { data: authData } = await supabaseClient.auth.getUser();
      const email = authData?.user?.email;

      if (!email) {
        throw new Error('Usuário não autenticado');
      }

      // Tentar fazer login com senha atual para validar
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Senha atual incorreta');
      }

      // Atualizar para nova senha
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar senha' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-purple/10 flex items-center justify-center">
              <Lock className="text-brand-purple" size={18} />
            </div>
            <div>
              <h2 className="text-base md:text-lg text-slate-900">Trocar <span className="text-brand-purple">Senha</span></h2>
              <p className="text-slate-400 font-medium text-xs">Atualize sua senha de acesso</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          {message && (
            <div className={`mb-3 p-3 rounded-xl flex items-start gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-100'
                : 'bg-red-50 border border-red-100'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="text-green-600 mt-0.5 shrink-0" size={16} />
              ) : (
                <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={16} />
              )}
              <p className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {message.text}
              </p>
            </div>
          )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          {/* Senha Atual */}
          <div className="space-y-1.5">
            <label className="text-[8px] uppercase tracking-[0.3em] text-slate-400 ml-1">Senha Atual</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-100 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all pr-9"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Nova Senha */}
          <div className="space-y-1.5">
            <label className="text-[8px] uppercase tracking-[0.3em] text-slate-400 ml-1">Nova Senha</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Crie uma nova senha forte"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-100 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          {newPassword && (
            <div className="bg-slate-50 rounded-lg p-2 space-y-1 border border-slate-100">
              <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400">Requisitos de Segurança</p>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    passwordReq.minLength ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {passwordReq.minLength && <Check size={10} className="text-green-600" />}
                  </div>
                  <span className={`text-[9px] font-semibold ${
                    passwordReq.minLength ? 'text-green-600' : 'text-slate-500'
                  }`}>Mínimo 8 caracteres</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    passwordReq.hasUpperCase ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {passwordReq.hasUpperCase && <Check size={10} className="text-green-600" />}
                  </div>
                  <span className={`text-[9px] font-semibold ${
                    passwordReq.hasUpperCase ? 'text-green-600' : 'text-slate-500'
                  }`}>Letra maiúscula (A-Z)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    passwordReq.hasLowerCase ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {passwordReq.hasLowerCase && <Check size={10} className="text-green-600" />}
                  </div>
                  <span className={`text-[9px] font-semibold ${
                    passwordReq.hasLowerCase ? 'text-green-600' : 'text-slate-500'
                  }`}>Letra minúscula (a-z)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    passwordReq.hasNumber ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {passwordReq.hasNumber && <Check size={10} className="text-green-600" />}
                  </div>
                  <span className={`text-[9px] font-semibold ${
                    passwordReq.hasNumber ? 'text-green-600' : 'text-slate-500'
                  }`}>Número (0-9)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    passwordReq.hasSpecialChar ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {passwordReq.hasSpecialChar && <Check size={10} className="text-green-600" />}
                  </div>
                  <span className={`text-[9px] font-semibold ${
                    passwordReq.hasSpecialChar ? 'text-green-600' : 'text-slate-500'
                  }`}>Caractere especial (!@#$%^&...)</span>
                </div>
              </div>
            </div>
          )}

          {/* Confirmar Nova Senha */}
          <div className="space-y-1.5">
            <label className="text-[8px] uppercase tracking-[0.3em] text-slate-400 ml-1">Confirmar Nova Senha</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-100 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all pr-9"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {confirmPassword && (
                <div className="absolute right-9 top-1/2 -translate-y-1/2">
                  {passwordsMatch ? (
                    <Check className="text-green-600" size={16} />
                  ) : (
                    <AlertCircle className="text-red-600" size={16} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Esqueci Minha Senha */}
          <div className="flex items-center justify-center gap-1.5 p-2 bg-blue-50 rounded-lg border border-blue-100">
            <HelpCircle size={14} className="text-blue-600 shrink-0" />
            <p className="text-[9px] text-blue-600 font-medium">
              Esqueceu a senha?{' '}
              <Link 
                href="/forgot-password" 
                className="underline hover:text-blue-700"
              >
                Recuperar Acesso
              </Link>
            </p>
          </div>
        </form>
        </div>

        {/* Buttons - Fixed at bottom */}
        <div className="flex gap-2 p-4 md:px-6 border-t border-slate-50 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-900 rounded-lg text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={loading || !isPasswordValid || !passwordsMatch || !currentPassword}
            className="flex-1 px-4 py-2.5 bg-brand-purple text-white rounded-lg text-[9px] uppercase tracking-widest hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                ATUALIZANDO...
              </>
            ) : (
              <>
                <Lock size={14} />
                ALTERAR SENHA
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
