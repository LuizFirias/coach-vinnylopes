'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  User, 
  Mail, 
  Camera, 
  LogOut, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  UserCircle,
  ChevronRight,
  ShieldCheck,
  Lock
} from 'lucide-react';
import Link from 'next/link';

export default function AlunoPerfil() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const isFirstAccess = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('firstAccess') === 'true';

  // Password validation requirements
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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !authData.user) {
          router.push('/login');
          return;
        }

        const user = authData.user;
        setUserId(user.id);
        setEmail(user.email || '');

        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (!profileError && profileData) {
          setFullName(profileData.full_name || '');
          setAvatarUrl(prev => profileData.avatar_url);
        }

        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);

    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          full_name: fullName.trim(),
        })
        .eq('id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar perfil' });
    } finally {
      setUpdating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Por favor, selecione uma imagem válida' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Imagem muito grande. Máximo 5MB' });
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const fileName = `avatar_${userId}_${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(avatarUrl);
      setMessage({ type: 'success', text: 'Foto atualizada com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao fazer upload' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabaseClient.auth.signOut();
      await fetch('/api/session', { method: 'DELETE' });
      router.push('/login');
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    if (!isPasswordValid) {
      setMessage({ type: 'error', text: 'A senha não atende aos requisitos de segurança' });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ 
        password: newPassword,
        data: { first_login: false } 
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
      if (isFirstAccess) {
        setTimeout(() => router.push('/aluno/dashboard'), 2000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-6 h-6 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-6 py-10 lg:pl-28">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Perfil do <span className="text-zinc-500">Atleta</span>
            </h1>
            <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.4em] mt-2 italic">Configurações de Identidade & Acesso</p>
          </div>
          <Link href="/aluno/dashboard" className="px-6 py-3 bg-[#0F0F0F] border border-[#1a1a1a] text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white hover:text-black transition-all shadow-2xl">
            Voltar
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Avatar Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-3xl p-10 flex flex-col items-center shadow-2xl">
               <div className="relative group mb-8">
                  <div className="w-40 h-40 rounded-3xl overflow-hidden bg-black border border-[#1a1a1a] relative shadow-2xl">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-5xl text-zinc-900">
                        {fullName ? fullName.charAt(0).toUpperCase() : "A"}
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-2 -right-2 p-4 bg-[#D4AF37] text-black rounded-2xl cursor-pointer hover:bg-white transition-all shadow-xl hover:scale-110 active:scale-95"
                  >
                    <Camera size={18} strokeWidth={3} />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
               </div>

               <h2 className="text-xl font-black text-white mb-1 text-center truncate w-full uppercase tracking-tight">{fullName || "Atleta Master"}</h2>
               <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-12 italic">Performance Elite</p>

               <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-5 bg-black text-zinc-700 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-red-500/10 hover:text-red-500 border border-[#1a1a1a] transition-all flex items-center justify-center gap-4"
                >
                  <LogOut size={16} />
                  Encerrar Sessão
                </button>
            </div>
          </div>

          {/* Settings Side */}
          <div className="lg:col-span-2 space-y-10">
            <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-3xl p-10 shadow-2xl">
               <h3 className="text-[11px] font-black text-white mb-10 flex items-center gap-4 uppercase tracking-[0.3em]">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37] flex items-center justify-center text-black">
                    <UserCircle size={16} strokeWidth={3} />
                  </div>
                  Credenciais de Atleta
               </h3>

               {message && (
                  <div
                    className={`mb-10 p-6 rounded-2xl flex items-center gap-4 text-[10px] font-black uppercase tracking-widest ${
                      message.type === 'success'
                        ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}
                  >
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                  </div>
                )}

               <form onSubmit={handleUpdateProfile} className="space-y-8">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 font-black ml-1">NOME DE GUERRA / COMPLETO</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-black border border-[#1a1a1a] text-white px-8 py-5 rounded-2xl text-sm focus:outline-none focus:border-[#D4AF37] transition-all font-medium placeholder:text-zinc-900"
                        required
                        placeholder="Ex: João Vitor Performance"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 font-black ml-1">E-MAIL DE ACESSO CRITICO</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="w-full bg-black/40 border border-[#1a1a1a] text-zinc-700 px-8 py-5 rounded-2xl text-sm font-medium cursor-not-allowed italic"
                        />
                        <Mail size={18} className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-900" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={updating}
                      className="w-full md:w-auto px-12 py-5 bg-[#D4AF37] text-black font-black text-[11px] uppercase tracking-[0.3em] rounded-2xl hover:bg-white transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap3 active:scale-95"
                    >
                      {updating ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} strokeWidth={3} />}
                      Salvar Protocolo
                    </button>
                  </div>
               </form>
            </div>

            {/* Password Change Section */}
            <div className={`bg-[#0F0F0F] border ${isFirstAccess ? 'border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.15)]' : 'border-[#1a1a1a]'} rounded-3xl p-10 shadow-2xl`}>
               <h3 className="text-[11px] font-black text-white mb-10 flex items-center gap-4 uppercase tracking-[0.3em]">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37] flex items-center justify-center text-black">
                    <ShieldCheck size={16} strokeWidth={3} />
                  </div>
                  Segurança da Conta
               </h3>

               {isFirstAccess && (
                  <div className="mb-8 p-6 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl">
                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest leading-relaxed">
                      ⚠️ Atenção: Detectamos que este é seu primeiro acesso. 
                      Para sua segurança, é obrigatório alterar sua senha temporária agora.
                    </p>
                  </div>
               )}

               <form onSubmit={handleChangePassword} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 font-black ml-1">NOVA SENHA</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-black border border-[#1a1a1a] text-white px-8 py-5 rounded-2xl text-sm focus:outline-none focus:border-[#D4AF37] transition-all font-medium placeholder:text-zinc-900"
                          placeholder="••••••••"
                        />
                        <Lock size={18} className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-900" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 font-black ml-1">CONFIRMAR SENHA</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-black border border-[#1a1a1a] text-white px-8 py-5 rounded-2xl text-sm focus:outline-none focus:border-[#D4AF37] transition-all font-medium placeholder:text-zinc-900"
                          placeholder="••••••••"
                        />
                        <Lock size={18} className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-900" />
                      </div>
                    </div>
                  </div>

                  {newPassword && (
                    <div className="mt-6 p-6 bg-black/40 border border-[#1a1a1a] rounded-2xl space-y-3">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Requisitos de Segurança:</p>
                      
                      <div className="space-y-2">
                        <div className={`flex items-center gap-3 p-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          passwordReq.minLength ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            passwordReq.minLength ? 'border-green-400 bg-green-400' : 'border-red-400'
                          }`}>
                            {passwordReq.minLength && <span className="text-black text-[8px]">✓</span>}
                          </div>
                          Mínimo 8 caracteres
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          passwordReq.hasUpperCase ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            passwordReq.hasUpperCase ? 'border-green-400 bg-green-400' : 'border-red-400'
                          }`}>
                            {passwordReq.hasUpperCase && <span className="text-black text-[8px]">✓</span>}
                          </div>
                          Pelo menos 1 LETRA MAIÚSCULA (A-Z)
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          passwordReq.hasLowerCase ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            passwordReq.hasLowerCase ? 'border-green-400 bg-green-400' : 'border-red-400'
                          }`}>
                            {passwordReq.hasLowerCase && <span className="text-black text-[8px]">✓</span>}
                          </div>
                          Pelo menos 1 letra minúscula (a-z)
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          passwordReq.hasNumber ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            passwordReq.hasNumber ? 'border-green-400 bg-green-400' : 'border-red-400'
                          }`}>
                            {passwordReq.hasNumber && <span className="text-black text-[8px]">✓</span>}
                          </div>
                          Pelo menos 1 NÚMERO (0-9)
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          passwordReq.hasSpecialChar ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            passwordReq.hasSpecialChar ? 'border-green-400 bg-green-400' : 'border-red-400'
                          }`}>
                            {passwordReq.hasSpecialChar && <span className="text-black text-[8px]">✓</span>}
                          </div>
                          Pelo menos 1 CARACTERE ESPECIAL (!@#$%^&*, etc)
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={changingPassword || !isPasswordValid || !newPassword || !confirmPassword}
                      className="w-full md:w-auto px-12 py-5 bg-gradient-to-b from-[#F9E29B] via-[#D4AF37] to-[#B8860B] text-black font-black text-[11px] uppercase tracking-[0.3em] rounded-2xl hover:brightness-110 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-95 antialiased"
                    >
                      {changingPassword ? <Loader2 className="animate-spin w-4 h-4" /> : <Lock size={16} strokeWidth={3} />}
                      Atualizar Senha
                    </button>
                  </div>
               </form>
            </div>

            <div className="p-10 rounded-3xl bg-[#0F0F0F] border border-[#1a1a1a] text-white backdrop-blur-sm relative group cursor-pointer hover:border-[#D4AF37]/30 transition-all shadow-2xl">
               <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/5 flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/10 shadow-lg">
                      <AlertCircle size={22} />
                    </div>
                    <div>
                       <h4 className="text-lg font-black tracking-tight uppercase">Suporte Técnico</h4>
                       <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-1">Acionar equipe de desenvolvimento</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-zinc-800 group-hover:text-iron-gold group-hover:translate-x-1 transition-all" />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
