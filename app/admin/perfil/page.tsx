"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { getPublicStorageUrl, extractStoragePath } from "@/lib/storageUrls";
import {
  SignOut,
  Lock,
  Camera,
  Plus,
  X,
  CaretRight,
  Envelope,
  Tag,
  Bell,
  CaretDown,
  User,
  Briefcase,
  IdentificationCard,
  Phone,
  CreditCard,
  GearSix,
} from "@phosphor-icons/react";
import ChangePasswordModal from "@/app/components/ChangePasswordModal";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { PlanUsageCard } from "@/app/components/profile/PlanUsageCard";
import { CoachPlanosManager } from "@/app/components/coach-profile/CoachPlanosManager";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { isAccessGranted } from "@/lib/subscriptions/display";
import { hasActiveAccess } from "@/lib/access/hasActiveAccess";
import { formatStudentUsage, getPlanLabel } from "@/lib/subscriptions/plans";
import { fetchSubscriptionStatusCached } from "@/lib/subscriptions/statusClientCache";
import { invalidateBootstrapProfile } from "@/lib/auth/bootstrapProfile";
import {
  getPushPermission,
  isSubscribedToPush,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";
import {
  COACH_COVER_SPECS,
  EMPTY_PUBLIC_PROFILE,
  PRICE_PRESETS,
  COACH_MODALITIES,
  formatCrefInput,
  isValidCref,
  isValidHandle,
  isValidInstagramUrl,
  normalizeHandle,
  normalizeInstagramUrl,
  rowToForm,
  type CoachPublicProfileForm,
} from "@/lib/coach/publicProfile";
import { SpecialtyTagSelector } from "@/app/components/coach-profile/SpecialtyTagSelector";
import { AvailabilityToggle } from "@/app/components/coach-profile/AvailabilityToggle";
import { PhotoGalleryUploader } from "@/app/components/coach-profile/PhotoGalleryUploader";
import { PublicProfilePreviewCard } from "@/app/components/coach-profile/PublicProfilePreviewCard";
import { CityAutocomplete } from "@/app/components/coach-profile/CityAutocomplete";
import { AvatarCropModal } from "@/app/components/profile/AvatarCropModal";
import { StudentAvatar } from "@/app/components/profile/StudentAvatar";

function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
  href,
  danger,
}: {
  icon?: React.FC<{ className?: string; size?: number }>;
  label: string;
  value?: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const className = cn(
    "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors touch-manipulation border-b border-border-divider last:border-b-0",
    danger ? "text-danger hover:text-danger/80" : "hover:bg-white/[0.04]",
  );

  const content = (
    <>
      {Icon && (
        <Icon
          className={cn(
            "w-4 h-4 flex-shrink-0",
            danger ? "text-danger" : "text-text-tertiary",
          )}
        />
      )}
      <span
        className={cn(
          "flex-1 text-sm",
          danger ? "text-danger font-medium" : "text-text-primary",
        )}
      >
        {label}
      </span>
      {value && (
        <span className="text-xs text-text-tertiary mr-1 truncate max-w-[45%]">
          {value}
        </span>
      )}
      {!danger && onClick == null && !href ? null : !danger ? (
        <CaretRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function SettingsAccordionRow({
  icon: Icon,
  label,
  value,
  open,
  onToggle,
  children,
}: {
  icon?: React.FC<{ className?: string; size?: number }>;
  label: string;
  value?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border-divider last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] touch-manipulation border-0 bg-transparent"
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-text-tertiary" />}
        <span className="flex-1 text-sm text-text-primary">{label}</span>
        {value && !open ? (
          <span className="mr-1 max-w-[45%] truncate text-xs text-text-tertiary">
            {value}
          </span>
        ) : null}
        <CaretDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border-divider px-4 pb-4 pt-3">{children}</div>
      ) : null}
    </div>
  );
}

function SettingsSection({
  title,
  children,
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.FC<{ className?: string; size?: number }>;
}) {
  return (
    <section className="perfil-section-card">
      <div className="mb-6 flex items-center gap-2 border-b border-border-subtle pb-4">
        {Icon && <Icon size={16} className="shrink-0 text-text-tertiary" />}
        <h2 className="perfil-section-title m-0">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  footer,
}: {
  title: string;
  icon?: React.FC<{ className?: string; size?: number }>;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="perfil-section-card">
      <div className="mb-6 flex items-center gap-2 border-b border-border-subtle pb-4">
        {Icon && <Icon size={16} className="shrink-0 text-text-tertiary" />}
        <h2 className="perfil-section-title m-0">{title}</h2>
      </div>
      {children}
      {footer ? <div className="mt-6 flex justify-end">{footer}</div> : null}
    </section>
  );
}

export default function CoachPerfilPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-0">
          <DumbbellLoader />
        </div>
      }
    >
      <CoachPerfilPageInner />
    </Suspense>
  );
}

function CoachPerfilPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSec =
    searchParams.get("sec") === "config" ? "config" : "perfil";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sexo, setSexo] = useState<string | null>(null);
  const [storedAvatarPath, setStoredAvatarPath] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mercadoNotice, setMercadoNotice] = useState<string | null>(null);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<"loading" | "unsupported" | "on" | "off" | "denied">("loading");
  const [pushBusy, setPushBusy] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [planName, setPlanName] = useState("Coach Vinny");
  const [studentUsage, setStudentUsage] = useState<string | null>(null);
  const [activeStudents, setActiveStudents] = useState<number | null>(null);
  const [studentLimit, setStudentLimit] = useState<number | null>(null);
  const [coachSinceYear, setCoachSinceYear] = useState<number | null>(null);
  const [publicForm, setPublicForm] = useState<CoachPublicProfileForm>(EMPTY_PUBLIC_PROFILE);
  const [certDraft, setCertDraft] = useState("");
  const [painelOpen, setPainelOpen] = useState(false);
  const [planosOpen, setPlanosOpen] = useState(false);
  const baselineRef = useRef("");

  const snapshot = useCallback(
    (
      name: string,
      avatar: string | null,
      phone: string,
      form: CoachPublicProfileForm,
    ) => JSON.stringify({ name, avatar, phone, form }),
    [],
  );

  const isDirty = useMemo(
    () =>
      snapshot(fullName, storedAvatarPath, telefone, publicForm) !==
      baselineRef.current,
    [fullName, storedAvatarPath, telefone, publicForm, snapshot],
  );

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const patchPublic = <K extends keyof CoachPublicProfileForm>(
    key: K,
    value: CoachPublicProfileForm[K],
  ) => {
    setPublicForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadProfile = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }

      const userId = session.user.id;
      setProfileId(userId);

      const [profileResult, publicResult] = await Promise.all([
        supabaseClient
          .from("profiles")
          .select(
            "id, full_name, email, avatar_url, telefone, sexo, role, created_at",
          )
          .eq("id", userId)
          .single(),
        supabaseClient
          .from("coach_public_profiles")
          .select("*")
          .eq("coach_id", userId)
          .maybeSingle(),
      ]);

      if (profileResult.error) throw profileResult.error;
      const profileData = profileResult.data;

      const name = profileData?.full_name || "";
      const phone = String(profileData?.telefone ?? "");
      const avatarPath = profileData?.avatar_url || null;
      const form = rowToForm(publicResult.data as Record<string, unknown> | null);

      setFullName(name);
      setTelefone(phone);
      setEmail(session.user.email || profileData?.email || "");
      setAvatarUrl(avatarPath);
      setSexo(profileData?.sexo ?? null);
      setStoredAvatarPath(avatarPath);
      setPublicForm(form);
      baselineRef.current = snapshot(name, avatarPath, phone, form);

      if (profileData?.created_at) {
        setCoachSinceYear(new Date(profileData.created_at).getFullYear());
      }

      // Coach Vinny não tem assinatura/plano/limite de alunos (treinador
      // único) — os campos abaixo existem só porque o card "Meu plano" da
      // tela ainda os lê; sempre "liberado", sem consultar tabelas de
      // assinatura que não existem neste banco.
      setSubscriptionActive(true);
      setPlanName("Coach Vinny");
      setStudentUsage(null);
      setStudentLimit(null);
      setActiveStudents(null);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  }, [router, snapshot]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem válida");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Imagem muito grande. Máximo 8MB");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => setCropSrc(reader.result as string);
    reader.onerror = () => setError("Não foi possível ler a imagem");
    reader.readAsDataURL(file);
  };

  const closeCropModal = () => {
    if (uploadingAvatar) return;
    setCropSrc(null);
  };

  const handleAvatarCropConfirm = async (blob: Blob) => {
    if (!profileId) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      if (storedAvatarPath) {
        try {
          const oldPath = extractStoragePath("avatars", storedAvatarPath);
          if (oldPath) {
            await supabaseClient.storage.from("avatars").remove([oldPath]);
          }
        } catch {
          // ignore
        }
      }

      const fileName = `avatar_${profileId}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabaseClient.storage
        .from("avatars")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ avatar_url: fileName })
        .eq("id", profileId);
      if (updateError) throw updateError;

      setStoredAvatarPath(fileName);
      setAvatarUrl(fileName);
      setCropSrc(null);
      baselineRef.current = snapshot(
        fullName.trim(),
        fileName,
        telefone,
        publicForm,
      );
      setSuccess("Foto atualizada");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro no upload da foto";
      setError(message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    if (isDirty && !window.confirm("Há alterações não salvas. Sair mesmo assim?")) {
      return;
    }
    try {
      await supabaseClient.auth.signOut({ scope: "local" });
    } catch (err) {
      console.warn("signOut error (ignorado):", err);
    } finally {
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  const refreshPushStatus = useCallback(async () => {
    const permission = getPushPermission();
    if (permission === "unsupported") {
      setPushStatus("unsupported");
      return;
    }
    if (permission === "denied") {
      setPushStatus("denied");
      return;
    }
    const subscribed = await isSubscribedToPush();
    setPushStatus(subscribed ? "on" : "off");
  }, []);

  useEffect(() => {
    void refreshPushStatus();
  }, [refreshPushStatus]);

  const handleTogglePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (pushStatus === "on") {
        await unsubscribeFromPush();
        setPushStatus("off");
      } else {
        const result = await subscribeToPush();
        if (result.ok) {
          setPushStatus("on");
        } else {
          setError(result.error);
          await refreshPushStatus();
        }
      }
    } finally {
      setPushBusy(false);
    }
  };

  const validateProfessional = (): string | null => {
    if (publicForm.handle && !isValidHandle(normalizeHandle(publicForm.handle))) {
      return "Instagram @ inválido (3–30 caracteres: letras, números, . e _)";
    }
    if (publicForm.instagram && !isValidInstagramUrl(publicForm.instagram)) {
      return "Link do Instagram inválido. Use https://instagram.com/seu_usuario";
    }
    if (publicForm.headline.length > 60) {
      return "Headline: máximo 60 caracteres";
    }
    if (publicForm.bio.length > 500) {
      return "Bio: máximo 500 caracteres";
    }
    if (!isValidCref(publicForm.cref)) {
      return "CREF inválido. Use o formato 000000-G/UF";
    }
    if (publicForm.disponivelNoMercado) {
      if (!fullName.trim()) return "Nome é obrigatório para o Mercado";
      if (!publicForm.handle) return "Seu @ do Instagram é obrigatório para o Mercado";
      if (!publicForm.headline.trim()) return "Headline é obrigatória para o Mercado";
      if (publicForm.specialties.length === 0) {
        return "Selecione ao menos uma especialidade para o Mercado";
      }
      if (!publicForm.modality) return "Modalidade é obrigatória para o Mercado";
      if (!publicForm.city.trim() || !publicForm.state) {
        return "Cidade e UF são obrigatórios para o Mercado";
      }
    }
    return null;
  };

  const handleSave = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!profileId || !isDirty) return;

    const validationError = validateProfessional();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          avatar_url: storedAvatarPath,
          telefone: telefone.trim() || null,
        })
        .eq("id", profileId);
      if (updateError) throw updateError;

      invalidateBootstrapProfile();

      // Coach Vinny não tem o diretório público de coaches do AURON
      // (tabela coach_public_profiles não existe aqui) — os campos de
      // perfil público (handle/instagram/bio) não são persistidos.

      baselineRef.current = snapshot(
        fullName.trim(),
        storedAvatarPath,
        telefone,
        publicForm,
      );
      setSuccess("Perfil atualizado com sucesso!");
    } catch (err: any) {
      setError(err.message || "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const onMercadoToggle = (next: boolean) => {
    patchPublic("disponivelNoMercado", next);
    if (next) {
      setMercadoNotice(
        "Seu perfil ficará visível para alunos buscando coach quando você salvar.",
      );
    } else {
      setMercadoNotice(null);
    }
  };

  const addCertification = () => {
    const text = certDraft.trim();
    if (!text) return;
    patchPublic("certifications", [...publicForm.certifications, text]);
    setCertDraft("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  const saveDisabled = saving || uploadingAvatar || !isDirty;
  const emailDisplay =
    email.length > 28 ? `${email.slice(0, 26)}…` : email;

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-2 border-0 border-b-2 bg-transparent px-1 pb-2.5 pt-1 text-sm touch-manipulation cursor-pointer transition-colors no-underline -mb-px",
      active
        ? "border-brand text-brand font-semibold"
        : "border-transparent text-text-secondary font-normal hover:text-text-primary",
    );

  return (
    <div className="perfil-page relative z-0 min-h-screen min-w-0 max-w-full overflow-x-clip px-4 py-8 pb-28 md:px-8 lg:px-10 lg:pb-12">
      <div className="mx-auto flex w-full min-w-0 max-w-[min(1200px,100%)] flex-col gap-6">
        <div>
          <h1 className="perfil-page-heading m-0 tracking-tight font-display">
            Perfil do profissional
          </h1>
          <div className="mb-2 mt-6 flex items-center gap-6 border-b border-border-subtle">
            <Link
              href="/admin/perfil"
              className={tabClass(activeSec === "perfil")}
              scroll={false}
            >
              <User size={16} weight={activeSec === "perfil" ? "fill" : "regular"} />
              O seu perfil
            </Link>
            <Link
              href="/admin/perfil?sec=config"
              className={tabClass(activeSec === "config")}
              scroll={false}
            >
              <GearSix size={16} weight={activeSec === "config" ? "fill" : "regular"} />
              Configurações
            </Link>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg bg-danger-subtle px-4 py-2.5 text-xs font-semibold text-danger">
            <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-danger" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 rounded-lg bg-success-subtle px-4 py-2.5 text-xs font-semibold text-success">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
            {success}
          </div>
        )}
        {mercadoNotice && (
          <div className="rounded-lg bg-brand/5 px-4 py-2.5 text-xs text-text-secondary">
            {mercadoNotice}
          </div>
        )}

        {activeSec === "perfil" && (
        <form
          onSubmit={(e) => void handleSave(e)}
          className="flex min-w-0 flex-col gap-6"
        >
          <SectionCard title="Informações profissionais" icon={IdentificationCard}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="relative mx-auto shrink-0 sm:mx-0">
                <StudentAvatar
                  name={fullName || "Coach"}
                  avatarUrl={avatarUrl}
                  sexo={sexo}
                  sizeClassName="h-[88px] w-[88px]"
                  uploading={uploadingAvatar}
                />
                <label
                  className={cn(
                    "perfil-camera-btn absolute bottom-1 right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg",
                    "bg-brand text-text-on-brand transition-all hover:bg-brand/90 active:scale-95",
                    uploadingAvatar && "pointer-events-none opacity-50",
                  )}
                >
                  <Camera className="h-4 w-4" weight="bold" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    disabled={uploadingAvatar}
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>

              <div className="min-w-0 flex-1 space-y-3.5">
                <Input
                  label="Nome"
                  name="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  leftIcon={<User size={16} />}
                />
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <Select
                    label="Modalidade"
                    value={publicForm.modality}
                    onChange={(v) =>
                      patchPublic(
                        "modality",
                        v as CoachPublicProfileForm["modality"],
                      )
                    }
                    placeholder="Selecione"
                    options={[
                      { value: "", label: "Selecione" },
                      ...COACH_MODALITIES.map((m) => ({
                        value: m.value,
                        label: m.label,
                      })),
                    ]}
                  />
                  <Input
                    label="CREF"
                    name="cref"
                    value={publicForm.cref}
                    onChange={(e) =>
                      patchPublic("cref", formatCrefInput(e.target.value))
                    }
                    placeholder="000000-G/SP"
                    leftIcon={<Briefcase size={16} />}
                  />
                </div>
                <CityAutocomplete
                  city={publicForm.city}
                  state={publicForm.state}
                  onCityChange={(city) => patchPublic("city", city)}
                  onStateChange={(state) => patchPublic("state", state)}
                />
                <Input
                  label="Instagram @"
                  name="handle"
                  value={publicForm.handle}
                  onChange={(e) =>
                    patchPublic("handle", normalizeHandle(e.target.value))
                  }
                  placeholder="seuusuario"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Informações pessoais" icon={User}>
            <div className="space-y-3.5">
              <Input
                label="E-mail"
                name="email"
                value={email}
                readOnly
                leftIcon={<Envelope size={16} />}
              />
              <Input
                label="Celular"
                name="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="+55 11 99999 0000"
                leftIcon={<Phone size={16} />}
              />
              <button
                type="button"
                onClick={() => setChangePasswordModalOpen(true)}
                className="perfil-senha-btn flex w-full touch-manipulation items-center justify-center gap-2 rounded-[10px] border border-border-subtle bg-transparent px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2/40 dark:border-[#2d3748] dark:text-[#D8DCE6] dark:hover:border-[#9333ea] dark:hover:bg-[rgba(147,51,234,0.06)]"
              >
                <Lock size={16} className="text-text-tertiary" />
                Alterar senha
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Gestão de assinatura" icon={CreditCard}>
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
                  Plano atual
                </p>
                <p className="m-0 text-base font-semibold text-brand">
                  {planName}
                  {studentUsage ? (
                    <span className="ml-2 text-sm font-medium text-text-secondary">
                      · {studentUsage}
                    </span>
                  ) : null}
                </p>
              </div>
              <PlanUsageCard
                planLabel={planName}
                studentCount={activeStudents ?? 0}
                studentLimit={studentLimit}
                isActive={subscriptionActive}
                className="!bg-surface-2"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => router.push("/admin/assinatura")}
                >
                  Gerenciar assinatura
                </Button>
              </div>
            </div>
          </SectionCard>

          <section className="perfil-section-card overflow-hidden !p-0">
            <button
              type="button"
              onClick={() => setPainelOpen((v) => !v)}
              aria-expanded={painelOpen}
              className="w-full cursor-pointer touch-manipulation border-0 bg-transparent p-7 text-left"
            >
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-border-subtle pb-4">
                <span className="perfil-section-title">
                  Painel profissional
                </span>
                <CaretDown
                  size={14}
                  weight="bold"
                  className={cn(
                    "shrink-0 text-text-tertiary transition-transform duration-200",
                    painelOpen && "rotate-180",
                  )}
                />
              </div>
              <div className="pointer-events-none">
                <PublicProfilePreviewCard
                  form={publicForm}
                  fullName={fullName}
                  avatarUrl={avatarUrl}
                  sexo={sexo}
                  activeStudents={activeStudents}
                  coachSinceYear={coachSinceYear}
                  compact
                />
                <p className="mt-2 px-1 text-[10px] text-text-tertiary">
                  {painelOpen
                    ? "Preview do card público no Mercado — edite os campos abaixo"
                    : "Preview do card público no Mercado — toque para editar"}
                </p>
              </div>
            </button>

            {painelOpen && (
            <div className="space-y-5 border-t border-border-divider px-7 pb-7 pt-4">
              <Input
                label="Headline"
                name="headline"
                value={publicForm.headline}
                maxLength={60}
                onChange={(e) => patchPublic("headline", e.target.value)}
                placeholder="Especialista em Hipertrofia e Emagrecimento"
                helperText={`${publicForm.headline.length}/60`}
              />
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="bio"
                  className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary"
                >
                  Bio / Sobre mim
                </label>
                <textarea
                  id="bio"
                  value={publicForm.bio}
                  maxLength={500}
                  rows={4}
                  onChange={(e) => patchPublic("bio", e.target.value)}
                  placeholder="Conte sua abordagem, experiência e para quem você trabalha…"
                  className="w-full min-h-[96px] resize-y rounded-[10px] bg-surface-2 border-0 px-3.5 pt-3.5 pb-3 text-[16px] font-medium text-text-primary placeholder:text-text-disabled placeholder:font-normal placeholder:text-[12px] focus:outline-none focus:ring-1 focus:ring-brand/30"
                />
                <p className="text-[12px] text-text-tertiary leading-tight">
                  {publicForm.bio.length}/500
                </p>
              </div>
              <Input
                label="Anos de experiência"
                name="years"
                type="number"
                min={0}
                max={60}
                value={publicForm.yearsExperience}
                onChange={(e) => patchPublic("yearsExperience", e.target.value)}
                placeholder="Ex: 8"
              />
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
                  Certificações / formação
                </p>
                <div className="flex gap-2">
                  <input
                    value={certDraft}
                    onChange={(e) => setCertDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCertification();
                      }
                    }}
                    placeholder="Ex: Pós em Fisiologia — USP"
                    className="flex-1 h-11 rounded-[10px] px-3.5 text-sm bg-surface-2 border-0 text-text-primary placeholder:text-text-disabled"
                  />
                  <button
                    type="button"
                    onClick={addCertification}
                    className="h-11 w-11 rounded-lg border-0 text-brand flex items-center justify-center touch-manipulation"
                    aria-label="Adicionar"
                  >
                    <Plus size={16} weight="bold" />
                  </button>
                </div>
                {publicForm.certifications.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {publicForm.certifications.map((c, i) => (
                      <li
                        key={`${c}-${i}`}
                        className="flex items-center gap-2 text-xs text-text-primary bg-surface-2 border-0 rounded-lg px-3 py-2"
                      >
                        <span className="flex-1 min-w-0">{c}</span>
                        <button
                          type="button"
                          onClick={() =>
                            patchPublic(
                              "certifications",
                              publicForm.certifications.filter((_, idx) => idx !== i),
                            )
                          }
                          className="text-text-tertiary hover:text-danger"
                          aria-label="Remover"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="perfil-section-title mb-3">
                  Especialidades
                </p>
                <SpecialtyTagSelector
                  value={publicForm.specialties}
                  onChange={(next) => patchPublic("specialties", next)}
                />
              </div>

              <div className="space-y-4">
                <Select
                  label="Faixa de preço (opcional)"
                  value={publicForm.priceDisplay}
                  onChange={(v) => patchPublic("priceDisplay", v)}
                  placeholder="Não exibir"
                  options={[
                    { value: "", label: "Não exibir" },
                    ...PRICE_PRESETS.map((p) => ({ value: p, label: p })),
                  ]}
                />
              </div>

              <div className="space-y-3">
                <p className="perfil-section-title">
                  Galeria e capa
                </p>
                <div className="rounded-lg border-0 bg-surface-2/60 px-3 py-2.5 text-[11px] text-text-secondary leading-relaxed">
                  <p className="font-semibold text-text-primary mb-0.5">
                    Capa sugerida: {COACH_COVER_SPECS.displayLabel} ({COACH_COVER_SPECS.ratioLabel})
                  </p>
                  <p>{COACH_COVER_SPECS.tip}</p>
                </div>
                {profileId && (
                  <PhotoGalleryUploader
                    paths={publicForm.galleryPaths}
                    onChange={(paths) => patchPublic("galleryPaths", paths)}
                    coachId={profileId}
                    onUploadError={(msg) => setError(msg)}
                  />
                )}
              </div>

              <Input
                label="Link do Instagram"
                name="instagram"
                value={publicForm.instagram}
                onChange={(e) => patchPublic("instagram", e.target.value)}
                onBlur={() => {
                  const normalized = normalizeInstagramUrl(
                    publicForm.instagram,
                    publicForm.handle,
                  );
                  if (normalized && normalized !== publicForm.instagram) {
                    patchPublic("instagram", normalized);
                  }
                }}
                placeholder="https://instagram.com/seu_usuario"
                helperText="Link completo — abre o perfil no Instagram."
              />

              <div className="space-y-3">
                <p className="perfil-section-title">
                  Mercado
                </p>
                <AvailabilityToggle
                  emphasized
                  checked={publicForm.disponivelNoMercado}
                  onChange={onMercadoToggle}
                  label="Disponível no Mercado"
                  description="Opt-in explícito. Desligado por padrão — seu perfil só aparece para alunos sem coach quando você ativar."
                />
                <AvailabilityToggle
                  checked={publicForm.aceitandoNovosAlunos}
                  onChange={(v) => patchPublic("aceitandoNovosAlunos", v)}
                  label="Aceitando novos alunos"
                  description="Pode ficar visível com vagas fechadas (badge no card)."
                />
                <AvailabilityToggle
                  checked={publicForm.showStudentCount}
                  onChange={(v) => patchPublic("showStudentCount", v)}
                  label="Exibir nº de alunos ativos"
                  description="Selo social no card público."
                />
              </div>
            </div>
            )}
          </section>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={saveDisabled}
              loading={saving}
              className={cn(!isDirty && !saving && "opacity-40")}
            >
              Salvar alterações
            </Button>
          </div>
        </form>
        )}

        <div
          className={cn(
            "flex flex-col gap-6",
            activeSec !== "config" && "hidden",
          )}
        >
          <SettingsSection title="Configurações e preferências" icon={GearSix}>
            <div className="-mx-1 overflow-hidden rounded-xl">
              <div className="md:hidden">
                <SettingsRow
                  icon={Tag}
                  label="Planos de venda"
                  value="Personalize suas modalidades"
                  href="/admin/planos"
                />
              </div>
              <div className="hidden md:block">
                <SettingsAccordionRow
                  icon={Tag}
                  label="Planos de venda"
                  value="Personalize suas modalidades"
                  open={planosOpen}
                  onToggle={() => setPlanosOpen((v) => !v)}
                >
                  {profileId ? (
                    <CoachPlanosManager coachId={profileId} embedded />
                  ) : null}
                </SettingsAccordionRow>
              </div>
              {pushStatus !== "unsupported" && (
                <SettingsRow
                  icon={Bell}
                  label="Avisos no celular"
                  value={
                    pushBusy
                      ? "Aguarde…"
                      : pushStatus === "on"
                        ? "Ativado"
                        : pushStatus === "denied"
                          ? "Bloqueado no navegador"
                          : "Desativado — toque pra ativar"
                  }
                  onClick={
                    pushStatus === "denied"
                      ? undefined
                      : () => void handleTogglePush()
                  }
                />
              )}
              <SettingsRow icon={Envelope} label="E-mail" value={emailDisplay} />
              <SettingsRow
                icon={Lock}
                label="Trocar senha"
                onClick={() => setChangePasswordModalOpen(true)}
              />
            </div>
          </SettingsSection>

          <SettingsSection title="Sessão" icon={SignOut}>
            <div className="-mx-1 overflow-hidden rounded-xl">
              <SettingsRow
                icon={SignOut}
                label="Sair da conta"
                onClick={() => void handleLogout()}
                danger
              />
            </div>
          </SettingsSection>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />

      <AvatarCropModal
        open={Boolean(cropSrc)}
        imageSrc={cropSrc || ""}
        confirming={uploadingAvatar}
        onCancel={closeCropModal}
        onConfirm={handleAvatarCropConfirm}
      />
    </div>
  );
}

