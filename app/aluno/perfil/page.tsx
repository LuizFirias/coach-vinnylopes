'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabaseClient';
import { getPublicStorageUrl, extractStoragePath } from '@/lib/storageUrls';
import { getSafeSession } from '@/lib/authErrorHandler';
import { useRouter } from 'next/navigation';
import {
  Camera, SignOut, CaretRight, Lock, User, Envelope, Ruler, Scales,
  Bell, Trash, DownloadSimple, Warning, Check, X,
  TrendUp, Trophy, Target, EyeSlash, Barbell, UserCircle, Calendar, Pencil, Gear,
} from '@phosphor-icons/react';
import ChangePasswordModal from '@/app/components/ChangePasswordModal';
import DateOfBirthModal from '@/app/components/DateOfBirthModal';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { cn } from '@/lib/utils/cn';

// ─── Tipos ───────────────────────────────────────────────────────────────────

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

interface KpisAluno {
  volume_semana_kg: number;
  volume_delta_pct: number | null;
  peso_atual_kg: number | null;
  peso_delta_kg: number | null;
  treinos_mes: number;
  treinos_delta: number;
  streak_atual: number;
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

function formatDateOnlyToPtBR(dateText: string | null): string {
  if (!dateText) return 'Não informada';
  const dateOnly = dateText.slice(0, 10);
  const [year, month, day] = dateOnly.split('-');
  if (!year || !month || !day) return 'Não informada';
  return `${day}/${month}/${year}`;
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
        'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-border-subtle last:border-b-0',
        danger ? 'text-danger hover:text-danger/80' : 'hover:opacity-80'
      )}
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
    <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 bg-surface-2 border-b border-border-subtle">
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
  const [kpis, setKpis] = useState<KpisAluno | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dadosPessoaisOpen, setDadosPessoaisOpen] = useState(true);
  const [metricsOpen, setMetricsOpen] = useState(true);

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

      // Fetch KPIs
      try {
        const { data: kpiData } = await supabaseClient.rpc('get_kpis_aluno', { p_aluno_id: user.id });
        if (kpiData) setKpis(kpiData as KpisAluno);
      } catch (err) {
        console.warn('[Perfil] Erro ao buscar KPIs:', err);
      }
    } catch (err) {
      console.error('[Perfil] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Avatar ───────────────────────────────────────────────────────────────

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith('image/')) { showToast('err', 'Selecione uma imagem válida'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('err', 'Imagem muito grande. Máximo 5MB'); return; }

    setUploadingAvatar(true);
    try {
      if (profile.avatar_url) {
        const oldPath = extractStoragePath('avatars', profile.avatar_url);
        if (oldPath) await supabaseClient.storage.from('avatars').remove([oldPath]);
      }
      const ext = file.name.split('.').pop();
      const fileName = `avatar_${userId}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabaseClient.storage.from('avatars').upload(fileName, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: updateErr } = await supabaseClient.from('profiles').update({ avatar_url: fileName }).eq('id', userId);
      if (updateErr) throw updateErr;
      setProfile(p => ({ ...p, avatar_url: fileName }));
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
    const prevProfile = profile;
    const next = { ...profile, ...partial };
    setProfile(next);
    setSavingPrefs(true);
    try {
      const { error } = await supabaseClient.from('profiles').update(partial).eq('id', userId);
      if (error) throw error;
    } catch (err: any) {
      showToast('err', err.message);
      setProfile(prevProfile); // rollback
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSaveName = async () => {
    if (!userId) return;

    const normalizedName = nameInput
      .normalize('NFC')
      .replace(/\s+/g, ' ')
      .trim();

    if (normalizedName.length < 2) {
      showToast('err', 'Nome deve ter pelo menos 2 caracteres');
      return;
    }

    setSavingName(true);
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ full_name: normalizedName })
        .eq('id', userId);

      if (error) throw error;

      setProfile(prev => ({ ...prev, full_name: normalizedName }));
      setNameModalOpen(false);
      showToast('ok', 'Nome atualizado');
    } catch (err: any) {
      showToast('err', err.message || 'Erro ao atualizar nome');
    } finally {
      setSavingName(false);
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

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-28 text-text-primary">
      <div className="max-w-lg mx-auto flex flex-col gap-6">

        {/* ── Toast ── */}
        {toast && (
          <div className={cn(
            'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium transition-all duration-300',
            toast.type === 'ok' ? 'bg-success text-white' : 'bg-danger text-white'
          )}>
            {toast.type === 'ok' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.text}
          </div>
        )}

        {/* ── Header do Perfil com Engrenagem de Configurações ── */}
        <div className="flex items-center justify-between px-4 pt-4">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Meu Perfil</h1>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-10 h-10 bg-surface-1 border border-border-subtle rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all"
            title="Abrir Configurações"
          >
            <Gear className="w-5 h-5" />
          </button>
        </div>

        {/* ── Cabeçalho de identidade ── */}
        <div className="flex items-center gap-4 px-4 py-6 bg-surface-1/50 rounded-2xl border border-border-subtle">
          <div className="relative flex-shrink-0">
            <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-brand bg-surface-2 flex items-center justify-center text-brand text-xl font-bold">
              {uploadingAvatar ? (
                <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
              ) : avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                getInitials(profile.full_name)
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 w-6 h-6 bg-brand text-text-on-brand rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity shadow-md shadow-brand/20"
              title="Trocar Foto"
            >
              <Camera className="w-3.5 h-3.5 text-text-on-brand" weight="bold" />
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary leading-tight">{profile.full_name || 'Atleta'}</p>
            {profile.created_at ? (
              <p className="text-xs text-text-tertiary mt-1">Cliente desde {fmtMembro(profile.created_at)}</p>
            ) : (
              <p className="text-xs text-text-tertiary mt-1">Membro</p>
            )}
          </div>
        </div>

        {/* ── Minha jornada (Lista Vertical - Fase 6) ── */}
        <div className="flex flex-col gap-2">
          <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary px-1">
            Minha Jornada
          </p>
          <div className="bg-surface-1 border border-border-subtle rounded-2xl overflow-hidden divide-y divide-border-subtle/30 shadow-sm">
            <Link
              href="/aluno/medidas"
              className="flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
                  <TrendUp className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-text-primary">Progresso & Medidas</span>
              </div>
              <CaretRight className="w-4 h-4 text-text-tertiary group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/aluno/fotos"
              className="flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-text-primary">Fotos de Evolução</span>
              </div>
              <CaretRight className="w-4 h-4 text-text-tertiary group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/aluno/ranking"
              className="flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-text-primary">Ranking da Comunidade</span>
              </div>
              <CaretRight className="w-4 h-4 text-text-tertiary group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>

        {/* ── Estatísticas da Semana (Retrátil - Fase 6) ── */}
        {kpis && (
          <div className="bg-surface-1 border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setMetricsOpen(!metricsOpen)}
              className="w-full px-5 py-4 bg-surface-2/30 hover:bg-surface-2/60 flex items-center justify-between transition-colors text-left"
            >
              <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Estatísticas da Semana</span>
              <CaretRight className={cn("w-4 h-4 text-text-tertiary transition-transform duration-200", metricsOpen && "rotate-90")} />
            </button>
            {metricsOpen && (
              <div className="p-5 flex items-center justify-between border-t border-border-subtle/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                    <TrendUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Volume Semanal</p>
                    <p className="text-xs text-text-tertiary">Soma de cargas levantadas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-text-primary">
                    {kpis.volume_semana_kg >= 1000
                      ? `${(kpis.volume_semana_kg / 1000).toFixed(1)} ton`
                      : `${kpis.volume_semana_kg} kg`}
                  </p>
                  {kpis.volume_delta_pct != null && kpis.volume_delta_pct !== 0 && (
                    <p className={cn(
                      'text-xs font-bold mt-0.5',
                      kpis.volume_delta_pct > 0 ? 'text-success' : 'text-danger'
                    )}>
                      {kpis.volume_delta_pct > 0 ? '▲' : '▼'} {Math.abs(kpis.volume_delta_pct).toFixed(0)}%
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Dados pessoais (Retrátil - Fase 6) ── */}
        <div className="bg-surface-1 border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setDadosPessoaisOpen(!dadosPessoaisOpen)}
            className="w-full px-5 py-4 bg-surface-2/30 hover:bg-surface-2/60 flex items-center justify-between transition-colors text-left"
          >
            <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Dados Pessoais</span>
            <CaretRight className={cn("w-4 h-4 text-text-tertiary transition-transform duration-200", dadosPessoaisOpen && "rotate-90")} />
          </button>
          
          {dadosPessoaisOpen && (
            <div className="divide-y divide-border-subtle/30 border-t border-border-subtle/50">
              <SettingsRow
                icon={User}
                label="Nome"
                value={profile.full_name}
                onClick={() => {
                  setNameInput(profile.full_name || '');
                  setNameModalOpen(true);
                }}
              />
              <SettingsRow icon={Envelope} label="E-mail" value={email.length > 22 ? email.slice(0, 20) + '…' : email} />
              <SettingsRow
                icon={Calendar}
                label="Data de nascimento"
                value={formatDateOnlyToPtBR(profile.date_of_birth)}
                onClick={() => setDateOfBirthOpen(true)}
              />
              <SettingsRow
                icon={UserCircle}
                label="Sexo"
                value={profile.sexo ? labelSexo[profile.sexo] : 'Não informado'}
                onClick={() => {
                  const opts: Profile['sexo'][] = ['masculino', 'feminino', 'outro', null];
                  const idx = opts.indexOf(profile.sexo);
                  savePrefs({ sexo: opts[(idx + 1) % opts.length] });
                }}
              />
              <SettingsRow
                icon={Target}
                label="Objetivo"
                value={profile.objetivo ? labelObjetivo[profile.objetivo] : 'Não informado'}
                onClick={() => {
                  const opts: Profile['objetivo'][] = ['cutting', 'bulking', 'manutencao', 'recomposicao', null];
                  const idx = opts.indexOf(profile.objetivo);
                  savePrefs({ objetivo: opts[(idx + 1) % opts.length] });
                }}
              />
            </div>
          )}
        </div>

      </div>

      {/* ── Settings Drawer Overlay (Fase 6) ── */}
      {settingsOpen && (
        <div className="fixed inset-0 z-45 flex justify-end bg-black/60 backdrop-blur-sm">
          {/* Backdrop click closer */}
          <div className="absolute inset-0" onClick={() => setSettingsOpen(false)} />
          
          <div className="relative w-full max-w-sm bg-surface-1 h-full shadow-2xl border-l border-border-subtle flex flex-col z-50">
            {/* Settings Header */}
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-2/50">
              <div className="flex items-center gap-2">
                <Gear className="w-5 h-5 text-brand" />
                <h2 className="text-base font-bold text-text-primary">Configurações</h2>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-9 h-9 bg-surface-3/80 hover:bg-surface-3 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Settings Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* Treino */}
              <SectionCard title="Treino">
                <SettingsRow
                  icon={Scales}
                  label="Unidade de peso"
                  value={profile.unidade_peso.toUpperCase()}
                  onClick={() => savePrefs({ unidade_peso: profile.unidade_peso === 'kg' ? 'lb' : 'kg' })}
                />
                <SettingsRow
                  icon={Ruler}
                  label="Unidade de medida"
                  value={profile.unidade_medida.toUpperCase()}
                  onClick={() => savePrefs({ unidade_medida: profile.unidade_medida === 'cm' ? 'in' : 'cm' })}
                />
                <SettingsRow
                  icon={Barbell}
                  label="Incremento padrão de carga"
                  value={`${profile.incremento_peso_padrao} ${profile.unidade_peso}`}
                  onClick={() => {
                    const opts = [1, 1.25, 2.5, 5];
                    const idx = opts.indexOf(Number(profile.incremento_peso_padrao));
                    savePrefs({ incremento_peso_padrao: opts[(idx + 1) % opts.length] });
                  }}
                />
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle last:border-b-0">
                  <EyeSlash className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                  <span className="flex-1 text-sm text-text-primary">Oculto no ranking</span>
                  <button
                    onClick={() => savePrefs({ oculto_no_ranking: !profile.oculto_no_ranking })}
                    className={cn(
                      'relative w-10 h-6 rounded-full transition-colors flex-shrink-0',
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

              {/* Notificações */}
              <SectionCard title="Notificações">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <Bell className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                  <span className="flex-1 text-sm text-text-primary">Notificações ativas</span>
                  <button
                    onClick={() => savePrefs({ notificacoes_ativas: !profile.notificacoes_ativas })}
                    className={cn(
                      'relative w-10 h-6 rounded-full transition-colors flex-shrink-0',
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

              {/* Segurança */}
              <SectionCard title="Segurança">
                <SettingsRow icon={Lock} label="Trocar senha" onClick={() => setChangePasswordOpen(true)} />
              </SectionCard>

              {/* Meus dados */}
              <SectionCard title="Meus dados">
                <SettingsRow icon={DownloadSimple} label="Exportar meus dados" onClick={handleExport} />
              </SectionCard>

              {/* Conta */}
              <SectionCard title="Conta">
                <SettingsRow icon={Trash} label="Excluir minha conta" onClick={() => setDeleteConfirmOpen(true)} danger />
              </SectionCard>
            </div>
            
            {/* Settings Footer (Logout) */}
            <div className="p-4 border-t border-border-subtle bg-surface-2/50 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full h-12 border border-danger/30 rounded-xl text-danger text-sm font-semibold flex items-center justify-center gap-2 hover:bg-danger/5 transition-all"
              >
                <SignOut className="w-4 h-4" />
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modais ── */}

      <ChangePasswordModal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />

      <DateOfBirthModal
        isOpen={dateOfBirthOpen}
        onClose={() => setDateOfBirthOpen(false)}
        userId={userId || ''}
        currentDate={profile.date_of_birth || ''}
        onSuccess={(newDate) => setProfile(p => ({ ...p, date_of_birth: newDate }))}
      />

      {nameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface-2 border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
              <Pencil className="w-6 h-6 text-brand" />
            </div>
            <h3 className="text-base font-bold text-text-primary text-center mb-1">Alterar nome</h3>
            <p className="text-sm text-text-secondary text-center mb-4 leading-relaxed">
              Digite seu nome como você deseja exibir no app.
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Seu nome"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              maxLength={80}
              className="w-full bg-surface-3 border border-border-default rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNameModalOpen(false)}
                disabled={savingName}
                className="flex-1 py-2.5 rounded-xl bg-surface-3 border border-border-subtle text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveName}
                disabled={savingName || nameInput.trim().length < 2}
                className="flex-1 py-2.5 rounded-xl bg-brand text-text-on-brand text-sm font-semibold disabled:opacity-40 transition-opacity"
              >
                {savingName ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal excluir conta */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface-2 border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-xl">
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
                className="flex-1 py-2.5 rounded-xl bg-surface-3 border border-border-subtle text-sm text-text-secondary hover:text-text-primary transition-colors"
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
    </div>
  );
}
