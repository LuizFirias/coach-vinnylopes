"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { getPublicStorageUrl, extractStoragePath } from "@/lib/storageUrls";
import {
  SignOut,
  Lock,
  Camera,
  CreditCard,
  FloppyDisk,
  CircleNotch,
  Plus,
  X,
  Gear,
  CaretLeft,
  CaretRight,
  Envelope,
  Tag,
} from "@phosphor-icons/react";
import ChangePasswordModal from "@/app/components/ChangePasswordModal";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { PlanUsageCard } from "@/app/components/profile/PlanUsageCard";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import { isAccessGranted } from "@/lib/subscriptions/display";
import { hasActiveAccess } from "@/lib/access/hasActiveAccess";
import { formatStudentUsage, getPlanLabel } from "@/lib/subscriptions/plans";
import { fetchSubscriptionStatusCached } from "@/lib/subscriptions/statusClientCache";
import { invalidateBootstrapProfile } from "@/lib/auth/bootstrapProfile";
import {
  COACH_COVER_SPECS,
  EMPTY_PUBLIC_PROFILE,
  PRICE_PRESETS,
  COACH_MODALITIES,
  formatCrefInput,
  formToRow,
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
    "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors touch-manipulation",
    danger ? "text-danger hover:text-danger/80" : "hover:bg-surface-2/40",
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

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-surface-1 overflow-hidden">
      <div className="px-4 py-2.5">
        <span className="perfil-section-title text-[10px] font-semibold uppercase tracking-[1.5px]">
          {title}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function CoachPerfilPage() {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [storedAvatarPath, setStoredAvatarPath] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mercadoNotice, setMercadoNotice] = useState<string | null>(null);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [planName, setPlanName] = useState("AuronFit");
  const [studentUsage, setStudentUsage] = useState<string | null>(null);
  const [activeStudents, setActiveStudents] = useState<number | null>(null);
  const [studentLimit, setStudentLimit] = useState<number | null>(null);
  const [coachSinceYear, setCoachSinceYear] = useState<number | null>(null);
  const [publicForm, setPublicForm] = useState<CoachPublicProfileForm>(EMPTY_PUBLIC_PROFILE);
  const [certDraft, setCertDraft] = useState("");
  const baselineRef = useRef("");

  const snapshot = useCallback(
    (name: string, avatar: string | null, form: CoachPublicProfileForm) =>
      JSON.stringify({ name, avatar, form }),
    [],
  );

  const isDirty = useMemo(
    () => snapshot(fullName, storedAvatarPath, publicForm) !== baselineRef.current,
    [fullName, storedAvatarPath, publicForm, snapshot],
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

      const [profileResult, publicResult, statusJson] = await Promise.all([
        supabaseClient
          .from("profiles")
          .select(
            "id, full_name, email, avatar_url, role, subscription_active, plan_tier, student_limit, account_type, created_at",
          )
          .eq("id", userId)
          .single(),
        supabaseClient
          .from("coach_public_profiles")
          .select("*")
          .eq("coach_id", userId)
          .maybeSingle(),
        session.access_token
          ? fetchSubscriptionStatusCached(session.access_token)
          : Promise.resolve(null),
      ]);

      if (profileResult.error) throw profileResult.error;
      const profileData = profileResult.data;

      const name = profileData?.full_name || "";
      const avatarPath = profileData?.avatar_url || null;
      const form = rowToForm(publicResult.data as Record<string, unknown> | null);

      setFullName(name);
      setEmail(session.user.email || profileData?.email || "");
      setAvatarUrl(avatarPath);
      setStoredAvatarPath(avatarPath);
      setPublicForm(form);
      baselineRef.current = snapshot(name, avatarPath, form);

      if (profileData?.created_at) {
        setCoachSinceYear(new Date(profileData.created_at).getFullYear());
      }

      if (profileData?.role === "super_admin") {
        setSubscriptionActive(true);
        setPlanName("Super Admin");
        setStudentUsage(null);
        setStudentLimit(null);
        setActiveStudents(statusJson?.activeStudentCount ?? null);
      } else if (statusJson) {
        setSubscriptionActive(statusJson.isActive);
        setPlanName(
          statusJson.currentPlan?.label ??
            (statusJson.planTier ? getPlanLabel(statusJson.planTier) : "AuronFit"),
        );
        setActiveStudents(statusJson.activeStudentCount ?? null);
        const limit = statusJson.studentLimit ?? null;
        const accountType = statusJson.accountType as string | undefined;
        const hidePlan =
          statusJson.isSuperAdmin ||
          accountType === "teste" ||
          accountType === "parceiro" ||
          limit == null;
        setStudentLimit(hidePlan ? null : limit);
        if (limit != null) {
          setStudentUsage(
            formatStudentUsage(
              statusJson.activeStudentCount,
              limit,
            ),
          );
        } else {
          setStudentUsage(null);
        }
      } else {
        const { data: subData } = await supabaseClient
          .from("subscriptions")
          .select("status, current_period_end, grace_period_end")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const active = subData
          ? isAccessGranted(
              subData.status,
              subData.current_period_end,
              subData.grace_period_end,
            )
          : hasActiveAccess(profileData ?? {});
        setSubscriptionActive(active);
      }
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
      baselineRef.current = snapshot(fullName.trim(), fileName, publicForm);
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
      setShowSettings(false);
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
        })
        .eq("id", profileId);
      if (updateError) throw updateError;

      invalidateBootstrapProfile();

      const row = formToRow(publicForm, profileId);
      const { error: publicError } = await supabaseClient
        .from("coach_public_profiles")
        .upsert(row, { onConflict: "coach_id" });
      if (publicError) {
        if (publicError.code === "23505") {
          throw new Error("Este handle já está em uso. Escolha outro.");
        }
        throw publicError;
      }

      baselineRef.current = snapshot(fullName.trim(), storedAvatarPath, publicForm);
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

  const primeiroNome =
    (fullName ?? "").trim().split(/\s+/).filter(Boolean)[0] || "Coach";
  const saveDisabled = saving || uploadingAvatar || !isDirty;

  const headerActions = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        className="w-11 h-11 shrink-0 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors active:scale-95 cursor-pointer touch-manipulation"
        title="Configurações da conta"
        aria-label="Abrir configurações da conta"
      >
        <Gear size={20} />
      </button>
    </div>
  );

  if (showSettings) {
    const emailDisplay =
      email.length > 22 ? `${email.slice(0, 20)}…` : email;

    return (
      <div className="perfil-page min-h-screen bg-surface-0 pb-28 lg:pb-12 lg:pl-28">
        <div className="sticky top-0 z-10 bg-surface-0/95 backdrop-blur-md">
          <div className="px-4 max-w-2xl mx-auto pt-4 pb-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="inline-flex items-center gap-1.5 min-h-11 text-xs text-text-tertiary hover:text-text-primary transition-colors touch-manipulation"
            >
              <CaretLeft size={16} />
              Voltar
            </button>
            <h1 className="perfil-page-heading flex-1 text-lg font-bold tracking-tight">
              Configurações
            </h1>
          </div>
        </div>

        <div className="px-4 max-w-2xl mx-auto flex flex-col gap-4 pt-4">
          <SettingsSection title="Assinatura">
            {studentLimit != null ? (
              <div className="px-3 pb-3">
                <PlanUsageCard
                  planLabel={planName}
                  studentCount={activeStudents ?? 0}
                  studentLimit={studentLimit}
                  isActive={subscriptionActive}
                />
              </div>
            ) : (
              <div className="px-4 py-3 text-xs text-text-secondary">
                {planName}
                {studentUsage ? ` · ${studentUsage}` : null}
              </div>
            )}
            <SettingsRow
              icon={CreditCard}
              label="Gerenciar assinatura"
              href="/admin/assinatura"
            />
          </SettingsSection>

          <SettingsSection title="Negócio">
            <SettingsRow
              icon={Tag}
              label="Planos de venda"
              value="Personalize suas modalidades"
              href="/admin/planos"
            />
          </SettingsSection>

          <SettingsSection title="Acesso">
            <SettingsRow icon={Envelope} label="E-mail" value={emailDisplay} />
            <SettingsRow
              icon={Lock}
              label="Trocar senha"
              onClick={() => setChangePasswordModalOpen(true)}
            />
          </SettingsSection>

          <SettingsSection title="Sessão">
            <SettingsRow
              icon={SignOut}
              label="Sair da conta"
              onClick={() => void handleLogout()}
              danger
            />
          </SettingsSection>
        </div>

        <ChangePasswordModal
          isOpen={changePasswordModalOpen}
          onClose={() => setChangePasswordModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="perfil-page min-h-screen bg-surface-0 pb-24 lg:pb-12 lg:pl-28">
      <div className="sticky top-0 z-10 bg-surface-0/95 backdrop-blur-md">
        <div className="px-4 max-w-[min(1200px,96vw)] mx-auto pt-3 pb-4 flex items-center justify-between gap-3">
          <h1 className="perfil-page-heading min-w-0 text-xl md:text-2xl font-extrabold tracking-tight font-display">
            Olá, <span className="text-brand">{primeiroNome}</span>
          </h1>
          {headerActions}
        </div>
      </div>

      <div className="px-4 max-w-[min(1200px,96vw)] mx-auto flex flex-col gap-4 pt-4">
        {error && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-danger-subtle text-danger text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0 animate-pulse" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-success-subtle text-success text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
            {success}
          </div>
        )}
        {mercadoNotice && (
          <div className="px-4 py-2.5 rounded-lg bg-brand/5 text-xs text-text-secondary">
            {mercadoNotice}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
            {/* Desktop: mesma linha do topo que Identidade */}
            <aside className="hidden lg:block lg:sticky lg:top-16 self-start space-y-3">
              <PublicProfilePreviewCard
                form={publicForm}
                fullName={fullName}
                avatarUrl={avatarUrl}
                activeStudents={activeStudents}
                coachSinceYear={coachSinceYear}
              />
              <p className="text-[10px] text-text-tertiary px-1">
                Preview ao vivo do card público no Mercado
              </p>
            </aside>

            <form
              onSubmit={(e) => void handleSave(e)}
              className="flex flex-col gap-5 min-w-0"
            >
              {/* Mobile: imediatamente acima de Identidade */}
              <div className="lg:hidden">
                <PublicProfilePreviewCard
                  form={publicForm}
                  fullName={fullName}
                  avatarUrl={avatarUrl}
                  activeStudents={activeStudents}
                  coachSinceYear={coachSinceYear}
                  compact
                />
              </div>

              {/* Identidade */}
              <Card className="perfil-form-card rounded-xl border-0 p-5 space-y-4">
                <h3 className="perfil-section-title text-[10px] font-semibold uppercase tracking-[1.5px]">
                  Identidade
                </h3>
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-3 border-0 flex items-center justify-center">
                      {uploadingAvatar ? (
                        <CircleNotch size={22} className="animate-spin text-brand" />
                      ) : avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            avatarUrl.startsWith("data:")
                              ? avatarUrl
                              : getPublicStorageUrl("avatars", avatarUrl) || ""
                          }
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-text-tertiary">
                          {fullName?.charAt(0)?.toUpperCase() || "C"}
                        </span>
                      )}
                    </div>
                    <label
                      className={cn(
                        "absolute -bottom-1 -right-1 w-7 h-7 rounded-lg cursor-pointer",
                        "bg-brand hover:bg-brand/90 active:scale-95 transition-all",
                        "flex items-center justify-center text-text-on-brand",
                        uploadingAvatar && "pointer-events-none opacity-50",
                      )}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        disabled={uploadingAvatar}
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>
                  <div className="flex-1 grid gap-3">
                    <Input
                      label="Nome de exibição"
                      name="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Prof. Ricardo Silva"
                    />
                    <Input
                      label="@ do Instagram"
                      name="handle"
                      value={publicForm.handle}
                      onChange={(e) =>
                        patchPublic("handle", normalizeHandle(e.target.value))
                      }
                      placeholder="seu_usuario"
                      helperText="Mesmo @ da sua conta. Aparece no rodapé das imagens compartilháveis no fim do treino do aluno."
                    />
                  </div>
                </div>
              </Card>

              {/* Profissional */}
              <Card className="perfil-form-card rounded-xl border-0 p-5 space-y-4">
                <h3 className="perfil-section-title text-[10px] font-semibold uppercase tracking-[1.5px]">
                  Perfil profissional
                </h3>
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
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary"
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
                  <p id="bio-helper" className="text-[12px] text-text-tertiary leading-tight">
                    {publicForm.bio.length}/500
                  </p>
                </div>
                <Input
                  label="CREF"
                  name="cref"
                  value={publicForm.cref}
                  onChange={(e) =>
                    patchPublic("cref", formatCrefInput(e.target.value))
                  }
                  placeholder="000000-G/SP"
                  helperText="Opcional, mas reforça confiança"
                />
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2">
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
              </Card>

              {/* Especialidades */}
              <Card className="perfil-form-card rounded-xl border-0 p-5 space-y-3">
                <h3 className="perfil-section-title text-[10px] font-semibold uppercase tracking-[1.5px]">
                  Especialidades
                </h3>
                <SpecialtyTagSelector
                  value={publicForm.specialties}
                  onChange={(next) => patchPublic("specialties", next)}
                />
              </Card>

              {/* Atendimento */}
              <Card className="perfil-form-card rounded-xl border-0 p-5 space-y-4">
                <h3 className="perfil-section-title text-[10px] font-semibold uppercase tracking-[1.5px]">
                  Atendimento
                </h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                    Modalidade
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COACH_MODALITIES.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => patchPublic("modality", m.value)}
                        className={cn(
                          "min-h-11 px-3 rounded-lg text-xs font-semibold touch-manipulation",
                          publicForm.modality === m.value
                            ? "bg-brand/15 text-brand"
                            : "bg-surface-2 text-text-secondary",
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <CityAutocomplete
                  city={publicForm.city}
                  state={publicForm.state}
                  onCityChange={(city) => patchPublic("city", city)}
                  onStateChange={(state) => patchPublic("state", state)}
                />
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
              </Card>

              {/* Galeria */}
              <Card className="perfil-form-card rounded-xl border-0 p-5 space-y-3">
                <h3 className="perfil-section-title text-[10px] font-semibold uppercase tracking-[1.5px]">
                  Galeria e capa
                </h3>
                <div className="rounded-lg border-0 bg-surface-1 px-3 py-2.5 text-[11px] text-text-secondary leading-relaxed">
                  <p className="font-semibold text-text-primary mb-0.5">
                    Capa sugerida: {COACH_COVER_SPECS.displayLabel} ({COACH_COVER_SPECS.ratioLabel})
                  </p>
                  <p>{COACH_COVER_SPECS.tip}</p>
                  <p className="mt-1 text-text-tertiary">
                    A 1ª foto vira a capa do card. No desktop o preview lateral usa ~360×144; no mobile do Mercado a mesma proporção evita corte estranho.
                  </p>
                </div>
                {profileId && (
                  <PhotoGalleryUploader
                    paths={publicForm.galleryPaths}
                    onChange={(paths) => patchPublic("galleryPaths", paths)}
                    coachId={profileId}
                    onUploadError={(msg) => setError(msg)}
                  />
                )}
              </Card>

              {/* Redes */}
              <Card className="perfil-form-card rounded-xl border-0 p-5 space-y-3">
                <h3 className="perfil-section-title text-[10px] font-semibold uppercase tracking-[1.5px]">
                  Redes
                </h3>
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
                  helperText="Cole o link completo. Quando o aluno tocar, abre direto o perfil no Instagram."
                />
              </Card>

              {/* Mercado */}
              <Card className="perfil-form-card rounded-xl border-0 p-5 space-y-3">
                <h3 className="perfil-section-title text-[10px] font-semibold uppercase tracking-[1.5px]">
                  Mercado
                </h3>
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
              </Card>
            </form>
          </div>
      </div>

      {(isDirty || saving) && (
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saveDisabled}
          aria-label={saving ? "Salvando alterações" : "Salvar alterações"}
          className={cn(
            "fixed z-50 right-4 lg:right-8",
            "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:bottom-8",
            "w-14 h-14 rounded-full bg-brand text-text-on-brand",
            "flex items-center justify-center touch-manipulation overflow-hidden",
            "shadow-[0_8px_28px_rgba(117, 27, 180,0.45)]",
            "transition-all duration-200 active:scale-95",
            "disabled:opacity-60",
          )}
        >
          {/* Brilho interno */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.08)_38%,transparent_62%)]"
          />
          <span className="relative z-10">
            {saving ? (
              <CircleNotch size={22} weight="bold" className="animate-spin" />
            ) : (
              <FloppyDisk size={22} weight="bold" />
            )}
          </span>
        </button>
      )}

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
