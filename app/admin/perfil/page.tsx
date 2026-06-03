"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getPublicStorageUrl, extractStoragePath } from "@/lib/storageUrls";
import { SignOut, Lock, Camera } from '@phosphor-icons/react';
import ChangePasswordModal from "@/app/components/ChangePasswordModal";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { cn } from "@/lib/utils/cn";

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
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      if (!authData?.user) throw new Error("Usuário não autenticado");

      let uploadedAvatarUrl = profile?.avatar_url;

      if (avatarFile) {
        setUploadingAvatar(true);
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `avatar_${authData.user.id}_${Date.now()}.${fileExt}`;

        if (profile?.avatar_url) {
          try {
            const oldPath = extractStoragePath("avatars", profile.avatar_url);
            if (oldPath) {
              await supabaseClient.storage.from("avatars").remove([oldPath]);
            }
          } catch {
            // avatar antigo não encontrado — ignorar
          }
        }

        const { error: uploadError } = await supabaseClient.storage
          .from("avatars")
          .upload(fileName, avatarFile, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        uploadedAvatarUrl = fileName;
        setUploadingAvatar(false);
      }

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
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <ScreenHeader
        title="Perfil"
        subtitle="Gerencie seus dados de acesso"
        action={
          <Button variant="danger" size="sm" leftIcon={<SignOut className="w-4 h-4" />} onClick={handleLogout}>
            Sair
          </Button>
        }
      />

      <div className="px-4 max-w-2xl">

        {/* Feedback */}
        {error && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
            <div className="w-2 h-2 rounded-full bg-danger flex-shrink-0 animate-pulse" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-success-subtle border border-success-border text-success text-sm">
            <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
            {success}
          </div>
        )}

        <Card className="rounded-2xl shadow-elev-1">
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">

            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-3 border border-border-default relative">
                  {avatarUrl ? (
                    <img
                      src={getPublicStorageUrl("avatars", avatarUrl) || ""}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-tertiary text-3xl font-bold">
                      {fullName?.charAt(0)?.toUpperCase() || "C"}
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-surface-0/80 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <label className={cn(
                  "absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl cursor-pointer",
                  "bg-brand hover:bg-brand-hover active:bg-brand-pressed transition-colors",
                  "flex items-center justify-center text-text-on-brand shadow-lg"
                )}>
                  <Camera className="w-3.5 h-3.5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              </div>

              <div>
                <p className="font-semibold text-text-primary">{fullName || "Coach"}</p>
                <p className="text-xs text-text-tertiary mt-0.5">Coach · Autoridade Certificada</p>
              </div>
            </div>

            {/* Campos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome completo"
                name="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Prof. Ricardo Silva"
              />
              <Input
                label="E-mail"
                name="email"
                type="email"
                value={email}
                disabled
                helperText="Apenas leitura"
              />
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
                loading={saving || uploadingAvatar}
                fullWidth
              >
                Salvar alterações
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </div>
  );
}
