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
    <div className="min-h-screen bg-iron-black p-6 lg:p-12 lg:pl-28">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-iron-gray rounded-full shadow-sm mb-6 border border-white/5">
              <ShieldCheck className="w-4 h-4 text-iron-red" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Controle Master</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-3">GERENCIAR <span className="text-gradient-red">ACESSOS</span></h1>
            <p className="text-zinc-500 text-sm font-medium">Controle de permissões e expansão da plataforma premium</p>
        </header>

        <div className="bg-iron-gray rounded-[48px] p-10 lg:p-14 relative overflow-hidden shadow-2xl border border-white/5">
          {/* Decoração sutil de fundo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-iron-red/5 rounded-bl-[120px] pointer-events-none" />
          
          <div className="relative">
            <div className="mb-12 flex flex-col items-center sm:items-start">
              <div className="w-12 h-12 bg-iron-red/10 rounded-2xl flex items-center justify-center mb-6 shadow-neon-red">
                <UserPlus className="w-6 h-6 text-iron-red" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Configurar Novo Professor</h2>
              <p className="text-sm text-zinc-500 font-medium tracking-tight">Promova alunos existentes ou convide novos coaches externos</p>
            </div>
            
            <form onSubmit={handlePromote} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-3 ml-2">
                    Nome Completo do Profissional
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Dr. Ricardo Silva"
                      className="w-full px-7 py-5 bg-black/40 border border-white/5 rounded-3xl text-white font-medium text-sm focus:ring-2 focus:ring-iron-red focus:border-iron-red transition-all placeholder:text-zinc-800"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-3 ml-2">
                    E-mail de Acesso
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 group-focus-within:text-iron-red transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@consultoria.com"
                      required
                      className="w-full pl-16 pr-7 py-5 bg-black/40 border border-white/5 rounded-3xl text-white font-medium text-sm focus:ring-2 focus:ring-iron-red focus:border-iron-red transition-all placeholder:text-zinc-800"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-3 ml-2">
                    Nível de Autoridade
                  </label>
                  <div className="relative group">
                    <Shield className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 group-focus-within:text-iron-red transition-colors" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-16 pr-7 py-5 bg-black/40 border border-white/5 rounded-3xl text-white font-medium text-sm focus:ring-2 focus:ring-iron-red focus:border-iron-red transition-all appearance-none cursor-pointer"
                    >
                      <option value="coach">PERMISSÃO: PROFESSOR / COACH</option>
                      <option value="aluno">PERMISSÃO: USUÁRIO ALUNO</option>
                      <option value="super_admin">PERMISSÃO: ADMINISTRADOR MASTER</option>
                    </select>
                    <div className="absolute right-7 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>
              </div>

              {message && (
                <div className={`p-6 rounded-[24px] text-xs font-bold tracking-tight animate-in fade-in slide-in-from-bottom-4 flex items-center gap-4 ${
                  message.type === "success" 
                    ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" 
                    : "bg-iron-red/10 text-iron-red border border-iron-red/20"
                }`}>
                  <div className={`p-2 rounded-full ${message.type === "success" ? "bg-emerald-400/20" : "bg-iron-red/20"}`}>
                    {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  </div>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-iron-red text-white text-xs font-black uppercase tracking-[0.4em] rounded-[24px] shadow-neon-red hover:bg-red-600 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    APLICAR PERMISSÃO AGORA
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <footer className="mt-16 text-center space-y-6">
            <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.3em] max-w-sm mx-auto leading-loose">
              O sistema processará o convite via e-mail e configurará o perfil do usuário automaticamente.
            </p>
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
              <div className="w-12 h-2 rounded-full bg-zinc-800" />
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
            </div>
        </footer>
      </div>
    </div>
  );
}
