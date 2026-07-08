"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { getPublicStorageUrl, extractStoragePath } from "@/lib/storageUrls";
import { SignOut, Lock, Camera, CreditCard } from '@phosphor-icons/react';
import ChangePasswordModal from "@/app/components/ChangePasswordModal";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { SubscriptionBadge } from "@/app/components/SubscriptionBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { cn } from "@/lib/utils/cn";
import { isAccessGranted } from "@/lib/subscriptions/display";
import { hasActiveAccess } from "@/lib/access/hasActiveAccess";
import { formatStudentUsage, getPlanLabel } from "@/lib/subscriptions/plans";

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
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [planName, setPlanName] = useState("AuronFit");
  const [studentUsage, setStudentUsage] = useState<string | null>(null);

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

      if (profileData?.role === "super_admin") {
        setSubscriptionActive(true);
        setSubscriptionStatus("authorized");
        setPlanName("Super Admin");
        setStudentUsage(null);
      } else {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.access_token) {
          const res = await fetch("/api/subscriptions/status", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const subJson = await res.json();
            setSubscriptionActive(subJson.isActive);
            setSubscriptionStatus(subJson.subscription?.status ?? null);
            setPlanName(
              subJson.currentPlan?.label ??
                (subJson.planTier ? getPlanLabel(subJson.planTier) : "AuronFit")
            );
            if (subJson.studentLimit != null) {
              setStudentUsage(formatStudentUsage(subJson.activeStudentCount, subJson.studentLimit));
            }
          }
        } else {
          const { data: subData } = await supabaseClient
            .from("subscriptions")
            .select("status, current_period_end")
            .eq("user_id", authData.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const active = subData
            ? isAccessGranted(subData.status, subData.current_period_end)
            : hasActiveAccess(profileData ?? {});
          setSubscriptionActive(active);
          setSubscriptionStatus(subData?.status ?? null);
        }
      }
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
            // avatar antigo não encontrado
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
        title="Configurações da Conta"
        subtitle="Gerencie seus dados profissionais e de acesso"
        action={
          <button
            type="button"
            onClick={handleLogout}
            className="h-8 px-3 rounded-md text-xs font-bold transition-all border border-danger/30 text-danger bg-transparent hover:bg-danger/10 flex items-center gap-1.5 cursor-pointer"
          >
            <SignOut className="w-3.5 h-3.5" />
            Sair da conta
          </button>
        }
      />

      <div className="px-4 max-w-4xl mx-auto flex flex-col gap-4">

        {/* Feedback */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-danger-subtle border border-danger-border text-danger text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0 animate-pulse" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-success-subtle border border-success-border text-success text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Coluna 1: Avatar e resumo */}
          <div className="lg:col-span-1">
            <Card className="rounded-xl border border-border-subtle/80 p-5 flex flex-col items-center text-center shadow-sm">
              <div className="mb-3">
                <SubscriptionBadge
                  planName={planName}
                  status={subscriptionStatus}
                  isActive={subscriptionActive}
                  studentUsage={studentUsage}
                  size="sm"
                />
              </div>
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-3 border border-border-default flex items-center justify-center relative select-none">
                  {avatarUrl ? (
                    <img
                      src={getPublicStorageUrl("avatars", avatarUrl) || ""}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-tertiary text-2xl font-bold font-mono">
                      {fullName?.charAt(0)?.toUpperCase() || "C"}
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-surface-0/80 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-brand/35 border-t-brand rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <label className={cn(
                  "absolute -bottom-1 -right-1 w-7 h-7 rounded-lg cursor-pointer",
                  "bg-brand hover:bg-brand/90 active:scale-95 transition-all",
                  "flex items-center justify-center text-text-on-brand shadow-sm"
                )}>
                  <Camera className="w-3.5 h-3.5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              </div>

              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">{fullName || "Coach"}</h2>
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wide mt-1.5 px-2 py-0.5 rounded bg-surface-3 border border-border-subtle">
                Personal Trainer
              </span>

              <Link href="/admin/assinatura" className="mt-4 w-full">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 text-xs rounded-lg w-full"
                  leftIcon={<CreditCard className="w-4 h-4" />}
                >
                  Gerenciar assinatura
                </Button>
              </Link>
            </Card>
          </div>

          {/* Coluna 2: Dados e Segurança */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="rounded-xl border border-border-subtle/80 p-5 md:p-6 shadow-sm">
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
                
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-2">
                  Dados do Perfil
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nome completo"
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Prof. Ricardo Silva"
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-secondary">E-mail de acesso</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="h-12 w-full rounded-md px-4 bg-surface-2 border border-border-subtle text-text-primary opacity-60 pr-10 text-xs cursor-not-allowed"
                      />
                      <Lock className="w-4 h-4 text-text-disabled absolute right-4.5 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-xs text-text-tertiary">Somente leitura</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border-subtle/50 flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 text-sm rounded-lg flex-1"
                    leftIcon={<Lock className="w-4 h-4" />}
                    onClick={() => setChangePasswordModalOpen(true)}
                  >
                    Trocar senha de acesso
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="h-12 text-sm rounded-lg flex-1"
                    loading={saving || uploadingAvatar}
                  >
                    Salvar alterações
                  </Button>
                </div>
              </form>
            </Card>
          </div>

        </div>

      </div>

      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </div>
  );
}
