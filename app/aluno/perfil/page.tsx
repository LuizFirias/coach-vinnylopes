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
  ChevronRight
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

  if (loading) {
    return (
      <div className="min-h-screen bg-iron-black flex items-center justify-center p-6 gap-4">
        <Loader2 className="w-12 h-12 text-iron-red animate-spin" />
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-iron-black p-4 md:p-6 lg:p-10 lg:pl-28 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-iron-red font-black text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:ml-1 transition-all">
            <ArrowLeft size={12} /> Voltar ao Painel
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Configurações de <span className="text-gradient-red">Perfil</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
          
          {/* Avatar Card */}
          <div className="lg:col-span-1">
            <div className="bg-iron-gray rounded-2xl md:rounded-[40px] shadow-2xl p-6 md:p-10 border border-white/5 flex flex-col items-center">
               <div className="relative group mb-6 md:mb-8">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-[40px] md:rounded-[50px] overflow-hidden bg-white/5 border-4 md:border-8 border-iron-gray shadow-2xl shadow-black group-hover:scale-[1.02] transition-transform duration-500">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl md:text-5xl font-black text-iron-red bg-iron-red/5">
                        {fullName ? fullName.charAt(0).toUpperCase() : <User size={40} />}
                      </div>
                    )}
                  </div>
                  
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-2 -right-2 w-12 h-12 md:w-14 md:h-14 bg-iron-red text-white rounded-2xl md:rounded-3xl flex items-center justify-center cursor-pointer hover:bg-red-600 transition-all shadow-neon-red border-4 border-iron-gray group-active:scale-90"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Camera size={20} />
                    )}
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

               <h2 className="text-lg md:text-xl font-black text-white mb-1 text-center truncate w-full">{fullName || "Usuário"}</h2>
               <p className="text-[10px] font-black text-iron-gold uppercase tracking-[0.2em] mb-8 md:mb-10">Membro Premium</p>

               <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-4 bg-white/5 text-zinc-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-iron-red hover:text-white transition-all flex items-center justify-center gap-3 group"
                >
                  <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                  Sair da Conta
                </button>
            </div>
          </div>

          {/* Settings Side */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <div className="bg-iron-gray rounded-2xl md:rounded-[40px] shadow-2xl p-6 md:p-10 border border-white/5">
               <h3 className="text-lg md:text-xl font-black text-white mb-8 md:mb-10 flex items-center gap-3">
                  <UserCircle className="text-iron-red w-5 h-5 md:w-6 md:h-6" /> Informações Pessoais
               </h3>

               {message && (
                  <div
                    className={`mb-10 p-6 rounded-3xl flex items-center gap-4 text-xs font-bold uppercase tracking-widest ${
                      message.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-iron-red/10 text-iron-red border border-iron-red/20'
                    }`}
                  >
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                  </div>
                )}

               <form onSubmit={handleUpdateProfile} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">
                        Nome Completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ex: João da Silva"
                          required
                          className="w-full h-16 pl-14 pr-6 bg-white/5 rounded-2xl text-white font-bold placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-iron-red/20 border border-white/5 focus:border-iron-red transition-all"
                          disabled={updating}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 grayscale opacity-70">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">
                        Endereço de E-mail
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="w-full h-16 pl-14 pr-6 bg-white/5 rounded-2xl text-zinc-500 font-bold cursor-not-allowed border border-white/10"
                        />
                      </div>
                      <p className="mt-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">
                        O e-mail é usado como login e não pode ser alterado por aqui.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full h-16 bg-iron-red text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-neon-red hover:bg-red-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                  >
                    {updating ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <Save size={20} />
                        Salvar Alterações
                      </>
                    )}
                  </button>
               </form>
            </div>

            {/* Support Info */}
            <div className="p-10 rounded-[40px] bg-iron-gray border border-white/5 text-white shadow-2xl overflow-hidden relative group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-iron-gold/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
               <div className="relative z-10 flex items-center justify-between gap-6">
                  <div>
                     <h4 className="text-xl font-black mb-2 tracking-tight">Precisa de ajuda?</h4>
                     <p className="text-zinc-500 font-medium text-sm leading-relaxed max-w-sm">
                        Para alterações de plano ou problemas técnicos, nossa equipe está pronta para te atender.
                     </p>
                  </div>
                  <ChevronRight size={24} className="text-zinc-700 group-hover:text-iron-gold group-hover:translate-x-2 transition-all" />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
