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
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-zinc-800">
          <div className="w-12 h-12 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
          <span className="font-black uppercase tracking-widest text-[10px] italic">Autenticando Master...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 lg:p-12 lg:pl-28 font-sans">
      <div className="max-w-4xl mx-auto pb-20">
        
        {/* Header Section */}
        <header className="mb-12">
            <Link href="/super-admin" className="inline-flex items-center gap-2 text-[#D4AF37] font-black text-[10px] uppercase tracking-widest mb-6 hover:ml-1 transition-all">
              <ArrowLeft size={14} /> Painel Executivo
            </Link>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-5xl font-black text-white tracking-tighter leading-none mb-2 uppercase">
                  Identidade <span className="text-zinc-500 tracking-tighter">Master</span>
                </h1>
                <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-black italic">Gestão da autoridade máxima da plataforma.</p>
              </div>
              <div className="hidden md:flex items-center gap-3 px-6 py-3 bg-[#0F0F0F] text-white rounded-2xl shadow-xl border border-[#1a1a1a]">
                 <ShieldCheck size={18} className="text-[#D4AF37]" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Acesso de Nível 50</span>
              </div>
            </div>
        </header>

        <div className="bg-[#0F0F0F] rounded-[48px] border border-[#1a1a1a] shadow-2xl overflow-hidden relative">
          
          <div className="p-12 lg:p-20 relative z-10">
            {message && (
              <div className={`mb-12 p-8 rounded-3xl border flex items-center gap-5 animate-in fade-in slide-in-from-top-4 ${
                message.type === "success" 
                  ? "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20" 
                  : "bg-red-500/10 text-red-500 border-red-500/20"
              }`}>
                {message.type === "success" ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                <p className="font-black text-[10px] uppercase tracking-widest italic">{message.text}</p>
              </div>
            )}

            {/* Avatar Central Unit */}
            <div className="mb-20 flex flex-col items-center text-center">
              <div className="relative group">
                <div className="w-48 h-48 rounded-[64px] bg-black border-4 border-[#1a1a1a] overflow-hidden shadow-2xl relative transform transition-transform duration-700 group-hover:scale-[1.05] group-hover:border-[#D4AF37]/50">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar Master" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black text-zinc-900">
                      <User size={80} strokeWidth={1} />
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-4 -right-4 w-16 h-16 bg-[#D4AF37] text-black rounded-3xl flex items-center justify-center cursor-pointer hover:bg-white hover:scale-110 transition-all shadow-2xl border-8 border-[#0F0F0F] group-hover:rotate-12"
                >
                  <Camera size={24} strokeWidth={2.5} />
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
              <div className="mt-10">
                 <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Avatar Executivo</h2>
                 <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] mt-2 italic shadow-inner">Indexado na Nuvem Criptografada</p>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSave} className="space-y-12 max-w-xl mx-auto">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.4em] ml-2">Assinatura Digital Master</label>
                <div className="relative group">
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-[#D4AF37] transition-colors">
                    <User size={20} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome master"
                    className="w-full pl-20 pr-10 py-6 bg-black border-2 border-[#1a1a1a] rounded-[28px] text-white font-bold focus:border-[#D4AF37] transition-all outline-none placeholder:text-zinc-900"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.4em] ml-2">E-mail de Autoridade Máxima</label>
                <div className="relative">
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 text-zinc-800">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full pl-20 pr-10 py-6 bg-black border-2 border-[#1a1a1a] rounded-[28px] text-zinc-800 font-bold cursor-not-allowed italic"
                  />
                </div>
                <p className="text-[9px] font-black text-zinc-900 uppercase tracking-[0.3em] ml-2 italic">Apenas leitura por protocolos de segurança avançados</p>
              </div>

              <div className="pt-10 flex justify-center">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-20 py-7 bg-[#D4AF37] text-black rounded-[32px] font-black text-[12px] uppercase tracking-[0.5em] shadow-2xl hover:bg-white hover:-translate-y-1 transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-5 active:scale-95 group"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-3 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      AUTORIZAR MUDANÇA
                      <Save size={20} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-bl-[120px] pointer-events-none blur-3xl" />
        </div>

        <div className="mt-20 flex justify-center pb-20">
           <div className="px-10 py-4 bg-[#0F0F0F] rounded-full border border-[#1a1a1a] flex items-center gap-4 shadow-2xl">
              <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] shadow-[0_0_15px_#D4AF37] animate-pulse" />
              <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em]">Firewall Master Nível Ativo</span>
           </div>
        </div>
      </div>
    </div>
  );
}
