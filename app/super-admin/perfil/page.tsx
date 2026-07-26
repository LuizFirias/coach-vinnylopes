"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import {
  User,
  Camera,
  ShieldCheck,
  Lock,
  SignOut,
} from "@phosphor-icons/react";
import Link from "next/link";
import Image from "next/image";
import ChangePasswordModal from "@/app/components/ChangePasswordModal";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

export default function SuperAdminPerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

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

      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabaseClient.auth.signOut({ scope: "local" });
    } catch (err) {
      console.warn("signOut error (ignorado):", err);
    } finally {
      localStorage.clear();
      window.location.href = "/login";
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

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ avatar_url: fileName })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(fileName);
      setMessage({ type: "success", text: "Foto atualizada!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro ao fazer upload" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-36 lg:pl-28">

      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <Link
          href="/super-admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors mb-4"
        >
          ← Painel Executivo
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Perfil Master</h1>
            <p className="text-sm text-text-secondary mt-1">Gestão da autoridade máxima da plataforma</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-subtle border border-brand-border rounded-xl">
            <ShieldCheck className="w-4 h-4 text-brand" />
            <span className="text-xs font-semibold text-brand">Super Admin</span>
          </div>
        </div>
      </header>

      <div className="px-4 max-w-2xl flex flex-col gap-4">

        {/* Feedback */}
        {message && (
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
            message.type === "success"
              ? "bg-success-subtle border-success-border text-success"
              : "bg-danger-subtle border-danger-border text-danger"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              message.type === "success" ? "bg-success" : "bg-danger animate-pulse"
            )} />
            {message.text}
          </div>
        )}

        {/* Avatar card */}
        <Card className="rounded-2xl shadow-elev-1">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-surface-3 border border-card relative">
                {avatarUrl ? (
                  <Image
                    src={getPublicStorageUrl("avatars", avatarUrl) || ""}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-disabled">
                    <User className="w-10 h-10" />
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-surface-0/80 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <label className={cn(
                "absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-xl cursor-pointer",
                "bg-brand hover:bg-brand-hover active:bg-brand-pressed transition-colors",
                "flex items-center justify-center text-text-on-brand shadow-lg"
              )}>
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
            <div className="text-center">
              <p className="font-semibold text-text-primary">{fullName || "Super Admin"}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{email}</p>
            </div>
          </div>
        </Card>

        {/* Form card */}
        <Card className="rounded-2xl shadow-elev-1">
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome completo"
                name="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
              />
              <Input
                label="E-mail"
                name="email"
                type="email"
                value={email}
                disabled
                helperText="Somente leitura"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                leftIcon={<Lock className="w-4 h-4" />}
                onClick={() => setChangePasswordModalOpen(true)}
                fullWidth
              >
                Trocar senha
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                fullWidth
              >
                Salvar alterações
              </Button>
            </div>
          </form>
        </Card>

        <Card className="rounded-2xl shadow-elev-1">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-divider pb-2 mb-4">
            Sessão
          </h3>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-12 border border-danger/30 rounded-xl text-danger text-sm font-medium flex items-center justify-center gap-2 hover:bg-danger/5 active:scale-[0.99] transition-all cursor-pointer"
          >
            <SignOut className="w-4 h-4" />
            Sair da conta
          </button>
        </Card>
      </div>

      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </div>
  );
}
