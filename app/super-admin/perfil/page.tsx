"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { 
  User, 
  Mail, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  ShieldCheck,
  Save
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function SuperAdminPerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setEmail(profile.email || "");
        setAvatarUrl(profile.avatar_url);
      }
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabaseClient
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) throw error;

      setMessage({ type: "success", text: "Perfil Master atualizado!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Arquivo muito grande. Máximo 2MB." });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error("Usuário não autenticado");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseClient.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrlData.publicUrl);
      setMessage({ type: "success", text: "Identidade visual atualizada!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro ao fazer upload" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-12 h-12 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin"></div>
          <span className="font-bold uppercase tracking-widest text-[10px]">Autenticando Master...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-12 font-sans">
      <div className="max-w-3xl mx-auto pb-20">
        
        {/* Header Section */}
        <header className="mb-12">
            <Link href="/super-admin" className="inline-flex items-center gap-2 text-brand-purple font-black text-[10px] uppercase tracking-widest mb-6 hover:ml-1 transition-all">
              <ArrowLeft size={14} /> Painel de Controle
            </Link>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">
                  Configurações <span className="text-brand-purple tracking-tighter">Master</span>
                </h1>
                <p className="text-slate-500 font-medium">Gestão da identidade administrativa da plataforma.</p>
              </div>
              <div className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/10">
                 <ShieldCheck size={16} className="text-brand-purple" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Nível: Super Admin</span>
              </div>
            </div>
        </header>

        <div className="bg-white rounded-[50px] border border-white shadow-2xl shadow-slate-200/40 overflow-hidden">
          
          <div className="p-10 lg:p-16">
            {message && (
              <div className={`mb-12 p-6 rounded-[30px] border flex items-center gap-4 animate-in fade-in slide-in-from-top-4 ${
                message.type === "success" 
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                  : "bg-red-50 text-red-600 border-red-100"
              }`}>
                {message.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <p className="font-black text-[11px] uppercase tracking-widest leading-none">{message.text}</p>
              </div>
            )}

            {/* Avatar Central Unit */}
            <div className="mb-16 flex flex-col items-center text-center">
              <div className="relative group">
                <div className="w-40 h-40 rounded-[60px] bg-slate-100 border-8 border-white overflow-hidden shadow-2xl shadow-slate-200 relative transform transition-transform duration-500 group-hover:scale-[1.02] group-hover:rotate-2">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar Master" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-200">
                      <User size={64} />
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-4 -right-4 w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center cursor-pointer hover:bg-brand-purple hover:scale-110 transition-all shadow-xl border-4 border-white group-hover:rotate-12"
                >
                  <Camera size={20} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="hidden"
                    id="avatar-upload"
                  />
                </label>
              </div>
              <div className="mt-8">
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Avatar Master</h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sua representação no sistema</p>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSave} className="space-y-10 max-w-xl mx-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Identidade Administrativa</label>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-purple transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome master"
                    className="w-full pl-16 pr-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-3xl text-slate-900 font-bold focus:bg-white focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/5 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">E-mail Master (Apenas Leitura)</label>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full pl-16 pr-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-3xl text-slate-400 font-bold cursor-not-allowed opacity-60"
                  />
                </div>
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest ml-2">O e-mail master é configurado via terminal de segurança</p>
              </div>

              <div className="pt-8 flex justify-center">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-16 py-6 bg-slate-900 text-white rounded-[28px] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-slate-900/20 hover:bg-brand-purple hover:shadow-brand-purple/30 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-4 active:scale-95 group"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Salvar Alterações
                      <Save size={16} className="group-hover:rotate-12 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-16 flex justify-center pb-20">
           <div className="px-6 py-3 bg-white rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-purple animate-ping" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nível de segurança master ativo</span>
           </div>
        </div>
      </div>
    </div>
  );
}
