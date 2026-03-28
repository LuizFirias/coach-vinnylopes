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
  Lock
} from 'lucide-react';
import Link from 'next/link';
import ChangePasswordModal from '@/app/components/ChangePasswordModal';
import DateOfBirthModal from '@/app/components/DateOfBirthModal';
import DumbbellLoader from '@/app/components/DumbbellLoader';

export default function AlunoPerfil() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [dateOfBirthModalOpen, setDateOfBirthModalOpen] = useState(false);


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
          .select('full_name, avatar_url, date_of_birth')
          .eq('id', user.id)
          .single();

        if (!profileError && profileData) {
          setFullName(profileData.full_name || '');
          setAvatarUrl(prev => profileData.avatar_url);
          if (profileData.date_of_birth) {
            setDateOfBirth(profileData.date_of_birth);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);

    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          date_of_birth: dateOfBirth || null,
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
      // Nome único com timestamp para evitar conflitos
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${userId}_${Date.now()}.${fileExt}`;

      // Deletar avatar antigo se existir
      if (avatarUrl) {
        try {
          const oldFileName = avatarUrl.split('/avatars/').pop();
          if (oldFileName) {
            await supabaseClient.storage.from('avatars').remove([oldFileName]);
          }
        } catch (err) {
          console.log('Avatar antigo não encontrado ou já deletado');
        }
      }

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

      const newAvatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
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
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <DumbbellLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-6 py-10 lg:pl-28">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-4xl text-white tracking-tighter uppercase leading-none">
              Perfil do <span className="text-zinc-500">Atleta</span>
            </h1>
            <p className="text-[10px] text-[#D4AF37] uppercase tracking-[0.4em] mt-2">Configurações de Identidade & Acesso</p>
          </div>
          <Link href="/aluno/dashboard" className="px-6 py-3 bg-[#0F0F0F] border border-[#1a1a1a] text-zinc-400 text-[10px] uppercase tracking-widest rounded-xl hover:bg-white hover:text-black transition-all shadow-2xl">
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
                      <div className="w-full h-full flex items-center justify-center text-5xl text-zinc-900">
                        {fullName ? fullName.charAt(0).toUpperCase() :"A"}
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

               <h2 className="text-xl text-white mb-1 text-center truncate w-full uppercase tracking-tight">{fullName ||"Atleta Master"}</h2>
               <p className="text-[10px] text-[#D4AF37] uppercase tracking-[0.3em] mb-12">Alta Performance</p>

               <button
                  type="button"
                  onClick={() => setChangePasswordModalOpen(true)}
                  className="w-full py-5 bg-brand-purple/10 text-brand-purple rounded-2xl text-[10px] uppercase tracking-[0.3em] hover:bg-brand-purple/20 border border-brand-purple/20 transition-all flex items-center justify-center gap-3 mb-3"
                >
                  <Lock size={16} />
                  Trocar Senha
                </button>

               <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-5 bg-black text-zinc-700 rounded-2xl text-[10px] uppercase tracking-[0.3em] hover:bg-red-500/10 hover:text-red-500 border border-[#1a1a1a] transition-all flex items-center justify-center gap-4"
                >
                  <LogOut size={16} />
                  Encerrar Sessão
                </button>
            </div>
          </div>

          {/* Settings Side */}
          <div className="lg:col-span-2 space-y-10">
            <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-3xl p-10 shadow-2xl">
               <h3 className="text-[11px] text-white mb-10 flex items-center gap-4 uppercase tracking-[0.3em]">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37] flex items-center justify-center text-black">
                    <UserCircle size={16} strokeWidth={3} />
                  </div>
                  Credenciais de Atleta
               </h3>

               {message && (
                  <div
                    className={`mb-10 p-6 rounded-2xl flex items-center gap-4 text-[10px] uppercase tracking-widest ${
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
                      <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 ml-1">NOME</label>
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
                      <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 ml-1">E-MAIL DE ACESSO</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="w-full bg-black/40 border border-[#1a1a1a] text-zinc-700 px-8 py-5 rounded-2xl text-sm font-medium cursor-not-allowed"
                        />
                        <Mail size={18} className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-900" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={updating}
                      className="w-full md:w-auto px-10 py-3 bg-[#D4AF37] text-black text-[11px] uppercase tracking-[0.3em] rounded-2xl hover:bg-white transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap3 active:scale-95"
                    >
                      {updating ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} strokeWidth={3} />}
                      Salvar
                    </button>
                  </div>
               </form>
            </div>

            {/* Password Change Button */}
            <button
              onClick={() => setChangePasswordModalOpen(true)}
              className="w-full bg-[#0F0F0F] border border-[#1a1a1a] hover:border-[#D4AF37]/30 rounded-3xl p-10 shadow-2xl transition-all group"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
                  <Lock size={16} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-[11px] text-white uppercase tracking-[0.3em]">Trocar Senha</h3>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">Atualize sua senha de acesso</p>
                </div>
              </div>
            </button>

            {/* Update Date of Birth Button */}
            <button
              onClick={() => setDateOfBirthModalOpen(true)}
              className="w-full bg-[#0F0F0F] border border-[#1a1a1a] hover:border-[#D4AF37]/30 rounded-3xl p-10 shadow-2xl transition-all group"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
                  <User size={16} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-[11px] text-white uppercase tracking-[0.3em]">Atualizar Perfil</h3>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">Sua data de nascimento e informações pessoais</p>
                </div>
              </div>
            </button>

            {/* Technical Support Card */}
            <div className="p-10 rounded-3xl bg-[#0F0F0F] border border-[#1a1a1a] text-white backdrop-blur-sm relative group cursor-pointer hover:border-[#D4AF37]/30 transition-all shadow-2xl">
               <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/5 flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/10 shadow-lg">
                      <AlertCircle size={22} />
                    </div>
                    <div>
                       <h4 className="text-lg tracking-tight uppercase">Suporte Técnico</h4>
                       <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-1">Acionar equipe de desenvolvimento</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-zinc-800 group-hover:text-iron-gold group-hover:translate-x-1 transition-all" />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />

      {/* Date of Birth Modal */}
      <DateOfBirthModal
        isOpen={dateOfBirthModalOpen}
        onClose={() => setDateOfBirthModalOpen(false)}
        userId={userId || ''}
        currentDate={dateOfBirth}
        onSuccess={(newDate) => setDateOfBirth(newDate)}
      />
    </div>
  );
}

