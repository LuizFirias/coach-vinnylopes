'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  X,
  Lock,
  CheckCircle,
  WarningCircle,
  Eye,
  EyeSlash,
  CircleNotch,
  Check,
  Question
} from '@phosphor-icons/react';
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
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative bg-[#0F0F0F] rounded-3xl border border-[#D4AF37]/25 shadow-2xl max-w-md w-full p-10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-all"
          title="Fechar"
        >
          <X size={20} className="text-zinc-400 hover:text-white" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
            <Lock size={24} />
          </div>
          <div>
            <h2 className="text-xl text-white uppercase tracking-tight">
              Trocar Senha
            </h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
              Atualize sua credencial de acesso
            </p>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-4 text-[10px] uppercase tracking-widest ${
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

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Senha Atual */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 ml-1">Senha Atual</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="w-full bg-black border border-[#1a1a1a] text-white px-4 py-4 rounded-2xl text-sm focus:outline-none focus:border-[#D4AF37] transition-all font-medium placeholder:text-zinc-700 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  {showCurrentPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Nova Senha */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 ml-1">Nova Senha</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Crie uma nova senha forte"
                  className="w-full bg-black border border-[#1a1a1a] text-white px-4 py-4 rounded-2xl text-sm focus:outline-none focus:border-[#D4AF37] transition-all font-medium placeholder:text-zinc-700 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  {showNewPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {newPassword && (
              <div className="bg-black border border-[#1a1a1a] rounded-2xl p-4 space-y-2">
                <p className="text-[9px] uppercase tracking-[0.25em] text-[#D4AF37] font-bold mb-2">Requisitos de Segurança</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      passwordReq.minLength ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-zinc-900 text-zinc-700'
                    }`}>
                      {passwordReq.minLength && <Check size={10} />}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                      passwordReq.minLength ? 'text-[#D4AF37]' : 'text-zinc-500'
                    }`}>Mínimo 8 caracteres</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      passwordReq.hasUpperCase ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-zinc-900 text-zinc-700'
                    }`}>
                      {passwordReq.hasUpperCase && <Check size={10} />}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                      passwordReq.hasUpperCase ? 'text-[#D4AF37]' : 'text-zinc-500'
                    }`}>Letra maiúscula (A-Z)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      passwordReq.hasLowerCase ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-zinc-900 text-zinc-700'
                    }`}>
                      {passwordReq.hasLowerCase && <Check size={10} />}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                      passwordReq.hasLowerCase ? 'text-[#D4AF37]' : 'text-zinc-500'
                    }`}>Letra minúscula (a-z)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      passwordReq.hasNumber ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-zinc-900 text-zinc-700'
                    }`}>
                      {passwordReq.hasNumber && <Check size={10} />}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                      passwordReq.hasNumber ? 'text-[#D4AF37]' : 'text-zinc-500'
                    }`}>Número (0-9)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      passwordReq.hasSpecialChar ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-zinc-900 text-zinc-700'
                    }`}>
                      {passwordReq.hasSpecialChar && <Check size={10} />}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                      passwordReq.hasSpecialChar ? 'text-[#D4AF37]' : 'text-zinc-500'
                    }`}>Caractere especial (!@#$...)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmar Nova Senha */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 ml-1">Confirmar Nova Senha</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full bg-black border border-[#1a1a1a] text-white px-4 py-4 rounded-2xl text-sm focus:outline-none focus:border-[#D4AF37] transition-all font-medium placeholder:text-zinc-700 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  {showConfirmPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
                {confirmPassword && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? (
                      <Check className="text-green-500" size={16} />
                    ) : (
                      <WarningCircle className="text-red-500" size={16} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-6 mt-2 border-t border-[#1a1a1a]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-[#0F0F0F] border border-[#1a1a1a] text-zinc-500 text-[10px] uppercase tracking-[0.3em] rounded-xl hover:bg-white/5 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={loading || !isPasswordValid || !passwordsMatch || !currentPassword}
            className="flex-1 px-6 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <CircleNotch className="w-4 h-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <Lock size={14} />
                Confirmar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}