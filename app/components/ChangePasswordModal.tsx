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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 md:p-10 overflow-hidden">
        <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center">
              <Lock className="text-brand-purple" size={24} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900">Trocar <span className="text-brand-purple">Senha</span></h2>
              <p className="text-slate-400 font-medium text-sm">Atualize sua senha de acesso</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-100'
              : 'bg-red-50 border border-red-100'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
            ) : (
              <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
            )}
            <p className={`text-sm font-medium ${
              message.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-6">
          {/* Senha Atual */}
          <div className="space-y-3">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Senha Atual</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400 font-medium">Nova Senha</span>
            </div>
          </div>

          {/* Nova Senha */}
          <div className="space-y-3">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Nova Senha</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Crie uma nova senha forte"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          {newPassword && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Requisitos de Segurança</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    passwordReq.minLength ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {passwordReq.minLength && <Check size={12} className="text-green-600" />}
                  </div>
                  <span className={`text-[10px] font-semibold ${
                    passwordReq.minLength ? 'text-green-600' : 'text-slate-500'
                  }`}>Mínimo 8 caracteres</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    passwordReq.hasUpperCase ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {passwordReq.hasUpperCase && <Check size={12} className="text-green-600" />}
                  </div>
                  <span className={`text-[10px] font-semibold ${
                    passwordReq.hasUpperCase ? 'text-green-600' : 'text-slate-500'
                  }`}>Letra maiúscula (A-Z)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    passwordReq.hasLowerCase ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {passwordReq.hasLowerCase && <Check size={12} className="text-green-600" />}
                  </div>
                  <span className={`text-[10px] font-semibold ${
                    passwordReq.hasLowerCase ? 'text-green-600' : 'text-slate-500'
                  }`}>Letra minúscula (a-z)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    passwordReq.hasNumber ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {passwordReq.hasNumber && <Check size={12} className="text-green-600" />}
                  </div>
                  <span className={`text-[10px] font-semibold ${
                    passwordReq.hasNumber ? 'text-green-600' : 'text-slate-500'
                  }`}>Número (0-9)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    passwordReq.hasSpecialChar ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    {passwordReq.hasSpecialChar && <Check size={12} className="text-green-600" />}
                  </div>
                  <span className={`text-[10px] font-semibold ${
                    passwordReq.hasSpecialChar ? 'text-green-600' : 'text-slate-500'
                  }`}>Caractere especial (!@#$%^&...)</span>
                </div>
              </div>
            </div>
          )}

          {/* Confirmar Nova Senha */}
          <div className="space-y-3">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Confirmar Nova Senha</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {confirmPassword && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  {passwordsMatch ? (
                    <Check className="text-green-600" size={20} />
                  ) : (
                    <AlertCircle className="text-red-600" size={20} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Esqueci Minha Senha */}
          <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <HelpCircle size={16} className="text-blue-600 flex-shrink-0" />
            <p className="text-[10px] text-blue-600 font-medium">
              Esqueceu a senha?{' '}
              <Link 
                href="/forgot-password" 
                className="font-black underline hover:text-blue-700"
              >
                Recuperar Acesso
              </Link>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch || !currentPassword}
              className="flex-1 px-6 py-3 bg-brand-purple text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  ATUALIZANDO...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  ALTERAR SENHA
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
