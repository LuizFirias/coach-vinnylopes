"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

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
      setFullName(profileData?.full_name || "");
      setEmail(authData.user.email || "");
      setAvatarUrl(profileData?.avatar_url || null);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar perfil");
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
        const fileName = `${authData.user.id}_${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from("avatars")
          .upload(fileName, avatarFile, { cacheControl: "3600", upsert: true });

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
      setError(err.message || "Erro ao salvar perfil");
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
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
              Configurações do <span className="text-zinc-500">Coach</span>
            </h1>
            <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.4em] mt-2 italic">Gerenciamento de Identidade Profissional</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-[#0F0F0F] border border-[#1a1a1a] text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white hover:text-black transition-all shadow-2xl"
          >
            Voltar
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-8 p-6 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl text-[#D4AF37] text-[10px] font-black uppercase tracking-widest flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span>{success}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-3xl p-10 shadow-2xl">
          <form onSubmit={handleSaveProfile} className="space-y-10">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-10">
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl overflow-hidden bg-black border border-[#1a1a1a] relative shadow-2xl">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-900 font-black text-4xl">
                      {fullName?.charAt(0) || "C"}
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-3.5 bg-[#D4AF37] text-black rounded-2xl cursor-pointer hover:bg-white transition-all shadow-xl hover:scale-110 active:scale-95">
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </label>
              </div>
              
              <div className="text-center sm:text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{fullName || "Mestre Treinador"}</h3>
                <p className="text-[#D4AF37] text-[10px] font-black tracking-[0.4em] uppercase mt-2 italic">Autoridade Certificada</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 font-black ml-1">NOME COMPLETO</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Prof. Ricardo Silva"
                  className="w-full bg-black border border-[#1a1a1a] text-white px-8 py-5 rounded-2xl text-sm placeholder:text-zinc-900 focus:outline-none focus:border-[#D4AF37] transition-all font-medium"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 font-black ml-1">CONTA DE E-MAIL</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-black/40 border border-[#1a1a1a] text-zinc-700 px-8 py-5 rounded-2xl text-sm transition-all font-medium cursor-not-allowed italic"
                />
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="w-full py-5 bg-[#D4AF37] text-black font-black text-[11px] uppercase tracking-[0.4em] rounded-2xl hover:bg-white transition-all shadow-xl shadow-[#D4AF37]/5 disabled:opacity-50 active:scale-95"
              >
                {saving ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    SALVANDO PROTOCOLO...
                  </div>
                ) : (
                  "ATUALIZAR CREDENCIAIS"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
