"use client";

import { useEffect, useState } from"react";
import { useRouter } from"next/navigation";
import { supabaseClient } from"@/lib/supabaseClient";
import { LogOut, Camera, Lock } from"lucide-react";
import ChangePasswordModal from"@/app/components/ChangePasswordModal";
import DumbbellLoader from"@/app/components/DumbbellLoader";

export default function CoachPerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      if (!authData?.user) {
        router.push("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);
      setFullName(profileData?.full_name ||"");
      setEmail(authData.user.email ||"");
      setAvatarUrl(profileData?.avatar_url || null);
    } catch (err: any) {
      setError(err.message ||"Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    try {
      await supabaseClient.auth.signOut();
      router.push("/login");
    } catch (err: any) {
      setError("Erro ao fazer logout");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      if (!authData?.user) throw new Error("Usuário não autenticado");

      let uploadedAvatarUrl = profile?.avatar_url;

      // Upload avatar if new file selected
      if (avatarFile) {
        setUploadingAvatar(true);
        const fileExt = avatarFile.name.split(".").pop();
        // Nome único com timestamp para evitar conflitos
        const fileName = `avatar_${authData.user.id}_${Date.now()}.${fileExt}`;

        // Deletar avatar antigo se existir
        if (profile?.avatar_url) {
          try {
            const oldFileName = profile.avatar_url.split('/avatars/').pop();
            if (oldFileName) {
              await supabaseClient.storage.from("avatars").remove([oldFileName]);
            }
          } catch (err) {
            console.log('Avatar antigo não encontrado ou já deletado');
          }
        }

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from("avatars")
          .upload(fileName, avatarFile, { cacheControl:"3600", upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseClient.storage
          .from("avatars")
          .getPublicUrl(fileName);

        uploadedAvatarUrl = publicUrlData.publicUrl;
        setUploadingAvatar(false);
      }

      // Update profile
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          full_name: fullName,
          avatar_url: uploadedAvatarUrl,
        })
        .eq("id", authData.user.id);

      if (updateError) throw updateError;

      setSuccess("Perfil atualizado com sucesso!");
      await loadProfile();
    } catch (err: any) {
      setError(err.message ||"Erro ao salvar perfil");
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 py-6 lg:pl-28">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-white tracking-tighter uppercase leading-none">
              Perfil do <span className="text-zinc-500">Coach</span>
            </h1>
            <p className="text-[8px] text-[#D4AF37] uppercase tracking-[0.4em] mt-1">Gerenciamento de Perifl</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
            >
              <LogOut size={14} />
              Sair
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2.5 bg-[#0F0F0F] border border-[#1a1a1a] text-zinc-400 text-[10px] uppercase tracking-widest rounded-xl hover:bg-white hover:text-black transition-all"
            >
              Voltar
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] uppercase tracking-widest flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[#D4AF37] text-[10px] uppercase tracking-widest flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span>{success}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-black border border-[#1a1a1a] relative shadow-2xl">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-900 text-3xl">
                      {fullName?.charAt(0) ||"C"}
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 p-2.5 bg-[#D4AF37] text-black rounded-xl cursor-pointer hover:bg-white transition-all shadow-xl hover:scale-110 active:scale-95">
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </label>
              </div>
              
              <div className="text-center sm:text-left">
                <h3 className="text-xl text-white uppercase tracking-tight">{fullName ||"Mestre Treinador"}</h3>
                <p className="text-[#D4AF37] text-[10px] tracking-[0.4em] uppercase mt-1">Autoridade Certificada</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 ml-1">NOME COMPLETO</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Prof. Ricardo Silva"
                  className="w-full bg-black border border-[#1a1a1a] text-white px-4 py-3 rounded-xl text-sm placeholder:text-zinc-900 focus:outline-none focus:border-[#D4AF37] transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 ml-1">CONTA DE E-MAIL</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-black/40 border border-[#1a1a1a] text-zinc-700 px-4 py-3 rounded-xl text-sm transition-all font-medium cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3 flex-col sm:flex-row">
              <button
                type="button"
                onClick={() => setChangePasswordModalOpen(true)}
                className="flex-1 py-3 bg-brand-purple/10 text-brand-purple text-[10px] uppercase tracking-[0.4em] rounded-xl hover:bg-brand-purple/20 border border-brand-purple/20 transition-all flex items-center justify-center gap-2"
              >
                <Lock size={14} />
                TROCAR SENHA
              </button>
              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="flex-1 py-3 bg-[#D4AF37] text-black text-[10px] uppercase tracking-[0.4em] rounded-xl hover:bg-white transition-all shadow-xl shadow-[#D4AF37]/5 disabled:opacity-50 active:scale-95"
              >
                {saving ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    SALVANDO PROTOCOLO...
                  </div>
                ) : ("ATUALIZAR CREDENCIAIS"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </div>
  );
}
