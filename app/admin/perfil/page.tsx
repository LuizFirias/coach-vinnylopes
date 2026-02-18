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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-[0.2em] uppercase">PERFIL</h1>
            <p className="text-[10px] text-brand-purple font-black uppercase tracking-[0.3em] mt-2">Gestão Coach</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 md:px-6 py-2 md:py-3 bg-white border border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            Voltar
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-3xl text-red-600 text-xs font-black uppercase tracking-wider animate-pulse flex items-center gap-3">
            <span className="text-lg">×</span> {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-3xl text-green-600 text-xs font-black uppercase tracking-wider flex items-center gap-3">
            <span className="text-lg">✓</span> {success}
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} className="bg-white p-6 md:p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-50">
          {/* Avatar Section */}
          <div className="mb-8 md:mb-10 flex flex-col items-center">
            <div className="relative mb-4 md:mb-6">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-8 border-slate-50 bg-slate-100 shadow-inner group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl font-black text-slate-300">
                    {fullName.charAt(0).toUpperCase() || "C"}
                  </div>
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-purple"></div>
                </div>
              )}
              <label className="absolute bottom-2 right-2 w-12 h-12 bg-brand-purple text-white rounded-full flex items-center justify-center border-4 border-white cursor-pointer shadow-lg hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Foto do Coach</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Name Field */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4 mb-2">
                Nome do Coach
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome profissional"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-slate-900 text-sm font-bold focus:outline-none focus:border-brand-purple/30 focus:bg-white transition-all duration-300"
                required
              />
            </div>

            {/* Email Field (Read-only) */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4 mb-2">
                Email de Acesso
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-6 py-4 bg-slate-100 border border-slate-200 rounded-3xl text-slate-400 text-sm font-bold cursor-not-allowed opacity-60"
              />
            </div>
          </div>

          <div className="mt-6 md:mt-10">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-3 py-4 md:py-5 bg-brand-purple text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-lg shadow-brand-purple/20 hover:shadow-xl hover:shadow-brand-purple/30 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                "ATUALIZAR DADOS"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
