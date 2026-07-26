'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { getPublicStorageUrl, extractStoragePath } from '@/lib/storageUrls';
import { getSafeSession } from '@/lib/authErrorHandler';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import {
  Camera, SignOut, CaretRight, Lock, User, Envelope, Ruler, Scales,
  Bell, Trash, DownloadSimple, Warning, Check, X,
  Trophy, Target, EyeSlash, Barbell, UserCircle, Calendar,
  CaretLeft
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import ChangePasswordModal from '@/app/components/ChangePasswordModal';
import DateOfBirthModal from '@/app/components/DateOfBirthModal';
import ChangeNameModal from '@/app/components/ChangeNameModal';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { ProfileHeader } from '@/app/components/profile/ProfileHeader';
import { AvatarCropModal } from '@/app/components/profile/AvatarCropModal';
import { ProfileNavButtons } from '@/app/components/profile/ProfileNavButtons';
import { ProfileWorkoutHistory } from '@/app/components/profile/ProfileWorkoutHistory';
import { getAvatarGradient } from '@/lib/utils/avatarColor';

interface Profile {
  full_name: string;
  date_of_birth: string | null;
  avatar_url: string | null;
  created_at: string | null;
  unidade_peso: 'kg' | 'lb';
  unidade_medida: 'cm' | 'in';
  incremento_peso_padrao: number;
  sexo: 'masculino' | 'feminino' | 'outro' | null;
  objetivo: 'cutting' | 'bulking' | 'manutencao' | 'recomposicao' | null;
  oculto_no_ranking: boolean;
  notificacoes_ativas: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function fmtMembro(created_at: string | null): string {
  if (!created_at) return '';
  return new Date(created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
  danger,
}: {
  icon?: React.FC<any>;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-divider last:border-b-0',
        danger ? 'text-danger hover:text-danger/80' : 'hover:opacity-80'
      )}
      style={{ borderColor: 'rgba(41,48,61,0.5)' }}
    >
      {Icon && <Icon className={cn('w-4 h-4 flex-shrink-0', danger ? 'text-danger' : 'text-text-tertiary')} />}
      <span className={cn('flex-1 text-sm', danger ? 'text-danger font-medium' : 'text-text-primary')}>
        {label}
      </span>
      {value && <span className="text-xs text-text-tertiary mr-1">{value}</span>}
      {!danger && <CaretRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="border shadow-elev-1 rounded-2xl overflow-hidden"
      style={{ background: 'var(--mobile-card-bg)', borderColor: 'var(--mobile-card-border)' }}
    >
      <div
        className="px-4 py-2.5 border-b"
        style={{ background: '#0D1829', borderColor: 'rgba(41,48,61,0.8)' }}
      >
        <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AlunoPerfil() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    date_of_birth: null,
    avatar_url: null,
    created_at: null,
    unidade_peso: 'kg',
    unidade_medida: 'cm',
    incremento_peso_padrao: 2.5,
    sexo: null,
    objetivo: null,
    oculto_no_ranking: false,
    notificacoes_ativas: true,
  });

  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false);
  const [changeNameOpen, setChangeNameOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Modais de edição de campos selecionáveis
  const [editingSexo, setEditingSexo] = useState(false);
  const [editingObjetivo, setEditingObjetivo] = useState(false);
  const [editingUnidadePeso, setEditingUnidadePeso] = useState(false);
  const [editingUnidadeMedida, setEditingUnidadeMedida] = useState(false);
  const [editingIncrementoPeso, setEditingIncrementoPeso] = useState(false);

  // Hevy Dashboard States
  const [showSettings, setShowSettings] = useState(false);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [lastWorkout, setLastWorkout] = useState<any | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // ── Carregar ─────────────────────────────────────────────────────────────

  const fetchProfile = useCallback(async () => {
    try {
      const session = await getSafeSession();
      const user = session?.user;
      if (!user) { router.push('/login'); return; }

      setUserId(user.id);
      setEmail(user.email || '');

      const { data } = await supabaseClient
        .from('profiles')
        .select(
          'full_name, date_of_birth, avatar_url, created_at, unidade_peso, unidade_medida, incremento_peso_padrao, sexo, objetivo, oculto_no_ranking, notificacoes_ativas'
        )
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          date_of_birth: data.date_of_birth || null,
          avatar_url: data.avatar_url || null,
          created_at: data.created_at || null,
          unidade_peso: data.unidade_peso || 'kg',
          unidade_medida: data.unidade_medida || 'cm',
          incremento_peso_padrao: data.incremento_peso_padrao ?? 2.5,
          sexo: data.sexo || null,
          objetivo: data.objetivo || null,
          oculto_no_ranking: data.oculto_no_ranking ?? false,
          notificacoes_ativas: data.notificacoes_ativas ?? true,
        });
      }
    } catch (err) {
      console.error('[Perfil] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Buscar Histórico de Treinos do Aluno ──────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const fetchHistory = async () => {
      setLoadingWorkouts(true);
      try {
        const { data: historicoData } = await supabaseClient
          .from("historico_treinos")
          .select("id, data_conclusao, dados_sessao, exercicio_id")
          .eq("aluno_id", userId)
          .order("data_conclusao", { ascending: false });

        if (historicoData && historicoData.length > 0) {
          // Agrupar por data_conclusao
          const sessoesPorData = new Map<string, any[]>();
          historicoData.forEach(h => {
            const key = h.data_conclusao;
            if (!sessoesPorData.has(key)) sessoesPorData.set(key, []);
            sessoesPorData.get(key)!.push(h);
          });

          const sessoesList = Array.from(sessoesPorData.entries()).map(([data, exerciciosSessao]) => {
            const firstEx = exerciciosSessao[0];
            const nome_rotina = firstEx?.dados_sessao?.nome_rotina || "Treino";
            
            // Calcular volume total e quantidade de séries/reps
            let volumeTotal = 0;
            let totalSets = 0;
            const parsedExercises = exerciciosSessao.map(ex => {
              const ds = ex.dados_sessao || {};
              const series = ds.series || [];
              const completedSeries = series.filter((s: any) => s.completado);
              totalSets += completedSeries.length;
              
              completedSeries.forEach((s: any) => {
                const peso = Number(s.peso_atual) || 0;
                const reps = Number(s.reps) || 0;
                volumeTotal += peso * reps;
              });

              return {
                nome: ds.nome_exercicio || "Exercício",
                sets: series.length,
                completedSets: completedSeries.length,
              };
            });

            return {
              data_conclusao: data,
              nome_rotina,
              volumeTotal,
              totalSets,
              exercises: parsedExercises,
            };
          });

          setRecentWorkouts(sessoesList.slice(0, 10));
          setLastWorkout(sessoesList[0] || null);
        }
      } catch (err) {
        console.error("Erro ao buscar histórico de treinos:", err);
      } finally {
        setLoadingWorkouts(false);
      }
    };
    fetchHistory();
  }, [userId]);

  // ── Avatar ───────────────────────────────────────────────────────────────

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userId) return;
    if (!file.type.startsWith('image/')) { showToast('err', 'Selecione uma imagem válida'); return; }
    if (file.size > 8 * 1024 * 1024) { showToast('err', 'Imagem muito grande. Máximo 8MB'); return; }

    const reader = new FileReader();
    reader.onloadend = () => setCropSrc(reader.result as string);
    reader.onerror = () => showToast('err', 'Não foi possível ler a imagem');
    reader.readAsDataURL(file);
  };

  const closeCropModal = () => {
    if (uploadingAvatar) return;
    setCropSrc(null);
  };

  const handleAvatarCropConfirm = async (blob: Blob) => {
    if (!userId) return;
    setUploadingAvatar(true);
    try {
      if (profile.avatar_url) {
        const oldPath = extractStoragePath('avatars', profile.avatar_url);
        if (oldPath) {
          try {
            await supabaseClient.storage.from('avatars').remove([oldPath]);
          } catch {
            // ignore — upload novo segue mesmo se o delete falhar
          }
        }
      }
      const fileName = `avatar_${userId}_${Date.now()}.jpg`;
      const { error: upErr } = await supabaseClient.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      await supabaseClient.from('profiles').update({ avatar_url: fileName }).eq('id', userId);
      setProfile(p => ({ ...p, avatar_url: fileName }));
      setCropSrc(null);
      showToast('ok', 'Foto atualizada');
    } catch (err: any) {
      showToast('err', err.message || 'Erro no upload');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Preferências ─────────────────────────────────────────────────────────

  const savePrefs = async (partial: Partial<Profile>) => {
    if (!userId) return;
    const next = { ...profile, ...partial };
    setProfile(next);
    setSavingPrefs(true);
    try {
      await supabaseClient.from('profiles').update(partial).eq('id', userId);
    } catch (err: any) {
      showToast('err', err.message);
      setProfile(profile); // rollback
    } finally {
      setSavingPrefs(false);
    }
  };

  // ── Sign out ──────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    try {
      await supabaseClient.auth.signOut({ scope: 'local' });
    } catch {}
    localStorage.clear();
    try { await fetch('/api/session', { method: 'DELETE' }); } catch {}
    window.location.href = '/login';
  };

  // ── Excluir conta ─────────────────────────────────────────────────────────

  const handleDeleteAccount = async () => {
    if (deleteInput.toLowerCase() !== 'excluir') return;
    setDeleting(true);
    try {
      const { error } = await supabaseClient.rpc('delete_user_account');
      if (error) throw error;
      localStorage.clear();
      window.location.href = '/login';
    } catch (err: any) {
      showToast('err', err.message || 'Erro ao excluir conta');
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  // ── Exportar dados ────────────────────────────────────────────────────────

  const handleExport = async () => {
    try {
      const { data, error } = await supabaseClient.rpc('export_user_data');
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast('err', err.message || 'Erro ao exportar');
    }
  };

  // ── Toast ─────────────────────────────────────────────────────────────────

  function showToast(type: 'ok' | 'err', text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Labels ────────────────────────────────────────────────────────────────

  const labelObjetivo = { cutting: 'Definição', bulking: 'Ganho de massa', manutencao: 'Manutenção', recomposicao: 'Recomposição' };
  const labelSexo = { masculino: 'Masculino', feminino: 'Feminino', outro: 'Outro' };

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando perfil..." />
      </div>
    );
  }

  const avatarSrc = profile.avatar_url ? getPublicStorageUrl('avatars', profile.avatar_url) : null;

  if (showSettings) {
    return (
      <div
        className="min-h-screen p-4 md:p-6 lg:p-10 lg:pl-28 pb-28 mobile-page-bg"
      >
        <div className="max-w-lg mx-auto flex flex-col gap-6">
          {/* Header de Voltar */}
          <div className="flex items-center justify-between border-b border-divider pb-4" style={{ borderColor: 'rgba(41,48,61,0.5)' }}>
            <button
              onClick={() => setShowSettings(false)}
              className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            >
              <CaretLeft size={16} /> Voltar para Perfil
            </button>
            <h1 className="text-xs font-bold text-text-primary uppercase tracking-wider font-display">Ajustes</h1>
            <div className="w-10" />
          </div>

          {/* ── Toast ── */}
          {toast && (
            <div className={cn(
              'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium',
              toast.type === 'ok' ? 'bg-success text-white' : 'bg-danger text-white'
            )}>
              {toast.type === 'ok' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {toast.text}
            </div>
          )}

          {/* ── Foto no settings ── */}
          <div
            className="flex items-center gap-4 px-4 py-6 border rounded-2xl shadow-sm"
            style={{ background: 'var(--mobile-card-bg)', borderColor: 'var(--mobile-card-border)' }}
          >
            <div className="relative flex-shrink-0">
              <div
                className={cn(
                  'w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br',
                  !avatarSrc && userId && getAvatarGradient(userId),
                  !avatarSrc && !userId && 'bg-surface-2'
                )}
              >
                {uploadingAvatar ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitials(profile.full_name)
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] bg-surface-1 border border-surface-0 rounded-full flex items-center justify-center text-text-secondary cursor-pointer hover:text-text-primary transition-colors"
              >
                <Camera size={10} weight="bold" />
              </label>
              <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
            </div>
            <div>
              <p className="text-base font-bold text-text-primary">{profile.full_name || 'Atleta'}</p>
              <p className="text-xs text-text-tertiary">Foto de perfil</p>
            </div>
          </div>

          {/* ── Dados pessoais ── */}
          <SectionCard title="Dados pessoais">
            <SettingsRow icon={User} label="Nome" value={profile.full_name} onClick={() => setChangeNameOpen(true)} />
            <SettingsRow icon={Calendar} label="Data de nascimento" value={profile.date_of_birth ? new Date(profile.date_of_birth + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'} onClick={() => setDateOfBirthOpen(true)} />
            <SettingsRow icon={Envelope} label="E-mail" value={email.length > 22 ? email.slice(0, 20) + '…' : email} />
            <SettingsRow icon={UserCircle} label="Sexo" value={profile.sexo ? labelSexo[profile.sexo] : 'Não informado'} onClick={() => setEditingSexo(true)} />
            <SettingsRow icon={Target} label="Objetivo" value={profile.objetivo ? labelObjetivo[profile.objetivo] : 'Não informado'} onClick={() => setEditingObjetivo(true)} />
          </SectionCard>

          {/* ── Treino ── */}
          <SectionCard title="Treino">
            <SettingsRow icon={Scales} label="Unidade de peso" value={profile.unidade_peso.toUpperCase()} onClick={() => setEditingUnidadePeso(true)} />
            <SettingsRow icon={Ruler} label="Unidade de medida" value={profile.unidade_medida.toUpperCase()} onClick={() => setEditingUnidadeMedida(true)} />
            <SettingsRow icon={Barbell} label="Incremento padrão de carga" value={`${profile.incremento_peso_padrao} ${profile.unidade_peso}`} onClick={() => setEditingIncrementoPeso(true)} />
            <div
              className="flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0"
              style={{ borderColor: 'rgba(41,48,61,0.5)' }}
            >
              <EyeSlash className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <span className="flex-1 text-sm text-text-primary">Oculto no ranking</span>
              <button
                onClick={() => savePrefs({ oculto_no_ranking: !profile.oculto_no_ranking })}
                className={cn(
                  'relative w-10 h-6 rounded-full transition-colors',
                  profile.oculto_no_ranking ? 'bg-brand' : 'bg-surface-3 border border-border-default'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
                  profile.oculto_no_ranking ? 'left-[18px]' : 'left-0.5'
                )} />
              </button>
            </div>
          </SectionCard>

          {/* ── Notificações ── */}
          <SectionCard title="Notificações">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Bell className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <span className="flex-1 text-sm text-text-primary">Notificações ativas</span>
              <button
                onClick={() => savePrefs({ notificacoes_ativas: !profile.notificacoes_ativas })}
                className={cn(
                  'relative w-10 h-6 rounded-full transition-colors',
                  profile.notificacoes_ativas ? 'bg-brand' : 'bg-surface-3 border border-border-default'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
                  profile.notificacoes_ativas ? 'left-[18px]' : 'left-0.5'
                )} />
              </button>
            </div>
          </SectionCard>

          {/* ── Segurança ── */}
          <SectionCard title="Segurança">
            <SettingsRow icon={Lock} label="Trocar senha" onClick={() => setChangePasswordOpen(true)} />
          </SectionCard>

          {/* ── Meus dados ── */}
          <SectionCard title="Meus dados">
            <SettingsRow icon={DownloadSimple} label="Exportar meus dados" onClick={handleExport} />
          </SectionCard>

          {/* ── Conta ── */}
          <SectionCard title="Conta">
            <SettingsRow icon={Trash} label="Excluir minha conta" onClick={() => setDeleteConfirmOpen(true)} danger />
          </SectionCard>

          {/* ── Logout ── */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full h-12 border border-danger/30 rounded-xl text-danger text-sm font-medium flex items-center justify-center gap-2 hover:bg-danger/5 transition-colors cursor-pointer"
          >
            <SignOut className="w-4 h-4" />
            Sair da conta
          </button>
        </div>

        {/* Modais */}
        <ChangePasswordModal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
        <DateOfBirthModal
          isOpen={dateOfBirthOpen}
          onClose={() => setDateOfBirthOpen(false)}
          userId={userId || ''}
          currentDate={profile.date_of_birth || ''}
          onSuccess={(newDate) => setProfile(p => ({ ...p, date_of_birth: newDate }))}
        />
        <ChangeNameModal
          isOpen={changeNameOpen}
          onClose={() => setChangeNameOpen(false)}
          userId={userId || ''}
          currentName={profile.full_name || ''}
          onSuccess={(newName) => setProfile(p => ({ ...p, full_name: newName }))}
        />
        
        {/* Modal de Sexo */}
        {editingSexo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-xl mobile-card-surface">
              <h3 className="text-base font-bold text-text-primary mb-4">Selecione seu sexo</h3>
              <div className="flex flex-col gap-3 mb-4">
                {[
                  { value: 'masculino', label: 'Masculino' },
                  { value: 'feminino', label: 'Feminino' },
                  { value: 'outro', label: 'Outro' },
                  { value: null, label: 'Não informado' },
                ].map((opt) => (
                  <button
                    key={opt.value || 'null'}
                    onClick={() => {
                      savePrefs({ sexo: opt.value as Profile['sexo'] || null });
                      setEditingSexo(false);
                    }}
                    className={cn(
                      'px-4 py-3 rounded-xl text-sm font-medium transition-all border',
                      profile.sexo === opt.value ? 'bg-brand text-text-on-brand border-brand' : 'text-text-primary border-border-default hover:border-brand'
                    )}
                    style={profile.sexo === opt.value ? undefined : { background: '#0D1829' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setEditingSexo(false)}
                className="w-full h-10 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        
        {/* Modal de Objetivo */}
        {editingObjetivo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-xl mobile-card-surface">
              <h3 className="text-base font-bold text-text-primary mb-4">Selecione seu objetivo</h3>
              <div className="flex flex-col gap-3 mb-4">
                {[
                  { value: 'cutting', label: 'Definição (Cutting)' },
                  { value: 'bulking', label: 'Ganho de massa (Bulking)' },
                  { value: 'manutencao', label: 'Manutenção' },
                  { value: 'recomposicao', label: 'Recomposição' },
                  { value: null, label: 'Não informado' },
                ].map((opt) => (
                  <button
                    key={opt.value || 'null'}
                    onClick={() => {
                      savePrefs({ objetivo: opt.value as Profile['objetivo'] || null });
                      setEditingObjetivo(false);
                    }}
                    className={cn(
                      'px-4 py-3 rounded-xl text-sm font-medium transition-all border',
                      profile.objetivo === opt.value ? 'bg-brand text-text-on-brand border-brand' : 'text-text-primary border-border-default hover:border-brand'
                    )}
                    style={profile.objetivo === opt.value ? undefined : { background: '#0D1829' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setEditingObjetivo(false)}
                className="w-full h-10 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        
        {/* Modal de Unidade de Peso */}
        {editingUnidadePeso && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-xl mobile-card-surface">
              <h3 className="text-base font-bold text-text-primary mb-4">Selecione a unidade de peso</h3>
              <div className="flex flex-col gap-3 mb-4">
                {[
                  { value: 'kg', label: 'Quilogramas (kg)' },
                  { value: 'lb', label: 'Libras (lb)' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      savePrefs({ unidade_peso: opt.value as 'kg' | 'lb' });
                      setEditingUnidadePeso(false);
                    }}
                    className={cn(
                      'px-4 py-3 rounded-xl text-sm font-medium transition-all border',
                      profile.unidade_peso === opt.value ? 'bg-brand text-text-on-brand border-brand' : 'text-text-primary border-border-default hover:border-brand'
                    )}
                    style={profile.unidade_peso === opt.value ? undefined : { background: '#0D1829' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setEditingUnidadePeso(false)}
                className="w-full h-10 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        
        {/* Modal de Unidade de Medida */}
        {editingUnidadeMedida && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-xl mobile-card-surface">
              <h3 className="text-base font-bold text-text-primary mb-4">Selecione a unidade de medida</h3>
              <div className="flex flex-col gap-3 mb-4">
                {[
                  { value: 'cm', label: 'Centímetros (cm)' },
                  { value: 'in', label: 'Polegadas (in)' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      savePrefs({ unidade_medida: opt.value as 'cm' | 'in' });
                      setEditingUnidadeMedida(false);
                    }}
                    className={cn(
                      'px-4 py-3 rounded-xl text-sm font-medium transition-all border',
                      profile.unidade_medida === opt.value ? 'bg-brand text-text-on-brand border-brand' : 'text-text-primary border-border-default hover:border-brand'
                    )}
                    style={profile.unidade_medida === opt.value ? undefined : { background: '#0D1829' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setEditingUnidadeMedida(false)}
                className="w-full h-10 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        
        {/* Modal de Incremento de Peso */}
        {editingIncrementoPeso && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-xl mobile-card-surface">
              <h3 className="text-base font-bold text-text-primary mb-4">Incremento padrão de carga</h3>
              <div className="flex flex-col gap-3 mb-4">
                {[1, 1.25, 2.5, 5].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      savePrefs({ incremento_peso_padrao: opt });
                      setEditingIncrementoPeso(false);
                    }}
                    className={cn(
                      'px-4 py-3 rounded-xl text-sm font-medium transition-all border',
                      profile.incremento_peso_padrao === opt ? 'bg-brand text-text-on-brand border-brand' : 'text-text-primary border-border-default hover:border-brand'
                    )}
                    style={profile.incremento_peso_padrao === opt ? undefined : { background: '#0D1829' }}
                  >
                    {opt} {profile.unidade_peso}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setEditingIncrementoPeso(false)}
                className="w-full h-10 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        
        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-xl" style={{ background: '#0D1829' }}>
              <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
                <Warning className="w-6 h-6 text-danger" />
              </div>
              <h3 className="text-base font-bold text-text-primary text-center mb-1">Excluir conta</h3>
              <p className="text-sm text-text-secondary text-center mb-4 leading-relaxed">
                Todos os seus dados serão removidos permanentemente. Esta ação <span className="font-semibold text-text-primary">não pode ser desfeita</span>.
              </p>
              <p className="text-xs text-text-tertiary mb-2">
                Digite <span className="font-semibold text-text-primary">excluir</span> para confirmar:
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="excluir"
                className="w-full bg-surface-3 border border-border-default rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-danger mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setDeleteConfirmOpen(false); setDeleteInput(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-surface-3 border border-card text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteInput.toLowerCase() !== 'excluir' || deleting}
                  className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
                >
                  {deleting ? 'Excluindo…' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}

        <AvatarCropModal
          open={Boolean(cropSrc)}
          imageSrc={cropSrc || ''}
          confirming={uploadingAvatar}
          onCancel={closeCropModal}
          onConfirm={handleAvatarCropConfirm}
        />
      </div>
    );
  }

  // RENDER THE NEW HEVY-STYLE PROFILE DASHBOARD
  return (
    <div className="min-h-screen bg-surface-0 px-4 lg:px-8 lg:pl-28 pb-36 lg:pb-12">
      <div className="max-w-[640px] mx-auto flex flex-col gap-5 lg:gap-6 lg:pt-10">

        {/* ── Toast ── */}
        {toast && (
          <div className={cn(
            'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium',
            toast.type === 'ok' ? 'bg-success text-white' : 'bg-danger text-white'
          )}>
            {toast.type === 'ok' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.text}
          </div>
        )}

        <ProfileHeader
          userId={userId}
          fullName={profile.full_name}
          memberSince={profile.created_at ? fmtMembro(profile.created_at) : ''}
          avatarSrc={avatarSrc}
          initials={getInitials(profile.full_name)}
          uploadingAvatar={uploadingAvatar}
          isDesktop={isDesktop}
          onSettingsClick={() => setShowSettings(true)}
          onAvatarUpload={handleAvatarSelect}
        />

        <AvatarCropModal
          open={Boolean(cropSrc)}
          imageSrc={cropSrc || ''}
          confirming={uploadingAvatar}
          onCancel={closeCropModal}
          onConfirm={handleAvatarCropConfirm}
        />

        <ProfileNavButtons />

        <div className="border-t border-surface-2" aria-hidden />

        <ProfileWorkoutHistory
          workouts={recentWorkouts}
          loading={loadingWorkouts}
          isDesktop={isDesktop}
        />
      </div>
    </div>
  );
}
