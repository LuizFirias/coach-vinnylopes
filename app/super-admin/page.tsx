"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { ShieldCheck, UserPlus, Mail, Shield, ChevronDown, CheckCircle, AlertCircle } from "lucide-react";

export default function SuperAdminPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("coach");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/super-admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, full_name: fullName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao atualizar papel");
      }

      setMessage({ type: "success", text: data.message });
      setEmail("");
      setFullName("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-6 lg:p-12 lg:pl-28 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F0F0F] rounded-full shadow-2xl mb-8 border border-[#1a1a1a]">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Controle Executivo</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-3 uppercase">GERENCIAR <span className="text-[#D4AF37]">ACESSOS</span></h1>
            <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest italic">Controle de permissões e expansão da plataforma premium</p>
        </header>

        <div className="bg-[#0F0F0F] rounded-3xl p-10 lg:p-16 relative overflow-hidden shadow-2xl border border-[#1a1a1a]">
          <div className="relative">
            <div className="mb-14 flex flex-col items-center sm:items-start">
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-8 border border-[#1a1a1a] shadow-lg shadow-black/50">
                <UserPlus className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Novo Professor</h2>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-loose">Promova alunos existentes ou conceda credenciais de Coach</p>
            </div>
            
            <form onSubmit={handlePromote} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="md:col-span-2 space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 ml-1">
                    Nome Completo do Profissional
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Dr. Ricardo Silva"
                    className="w-full px-8 py-5 bg-black border border-[#1a1a1a] rounded-2xl text-white font-medium text-sm focus:border-[#D4AF37] transition-all placeholder:text-zinc-900 outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 ml-1">
                    E-mail de Cadastro
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-800 group-focus-within:text-[#D4AF37] transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@consultoria.com"
                      required
                      className="w-full pl-16 pr-8 py-5 bg-black border border-[#1a1a1a] rounded-2xl text-white font-medium text-sm focus:border-[#D4AF37] transition-all placeholder:text-zinc-900 outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 ml-1">
                    Nível de Autoridade
                  </label>
                  <div className="relative group">
                    <Shield className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-800 group-focus-within:text-[#D4AF37] transition-colors" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-16 pr-8 py-5 bg-black border border-[#1a1a1a] rounded-2xl text-white font-medium text-sm focus:border-[#D4AF37] transition-all appearance-none cursor-pointer outline-none uppercase tracking-widest"
                    >
                      <option value="coach">PROFESSOR / COACH</option>
                      <option value="aluno">USUÁRIO ALUNO</option>
                      <option value="super_admin">ADMINISTRADOR MASTER</option>
                    </select>
                    <div className="absolute right-7 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-800">
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>
              </div>

              {message && (
                <div className={`p-8 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-4 flex items-center gap-5 ${
                  message.type === "success" 
                    ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20" 
                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                }`}>
                  <div className={`p-2 rounded-lg ${message.type === "success" ? "bg-[#D4AF37]/20" : "bg-red-500/20"}`}>
                    {message.type === "success" ? <CheckCircle size={18} strokeWidth={3} /> : <AlertCircle size={18} strokeWidth={3} />}
                  </div>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-[#D4AF37] text-black text-[11px] font-black uppercase tracking-[0.4em] rounded-2xl shadow-xl hover:bg-white active:scale-[0.98] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    APLICAR PERMISSÕES AGORA
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <footer className="mt-20 text-center space-y-8">
            <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em] max-w-sm mx-auto leading-loose italic">
              O sistema processará o convite via e-mail e configurará o perfil do usuário automaticamente.
            </p>
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1a1a1a]" />
              <div className="w-16 h-2 rounded-full bg-[#D4AF37]/20" />
              <div className="w-2 h-2 rounded-full bg-[#1a1a1a]" />
            </div>
        </footer>
      </div>
    </div>
  );
}
