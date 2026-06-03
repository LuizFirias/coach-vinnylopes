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
  TrendUp, Trophy, Target, EyeSlash, Barbell, UserCircle, Calendar,
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

  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

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
      await supabaseClient.from('profiles').update({ avatar_url: fileName }).eq('id', userId);
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

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-28">
      <div className="max-w-lg mx-auto flex flex-col gap-6">

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

        {/* ── Cabeçalho de identidade ── */}
        <div className="flex items-center gap-4 px-4 py-6">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-brand/20 flex items-center justify-center text-brand text-2xl font-bold border-2 border-brand">
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
              className="absolute bottom-0 right-0 w-7 h-7 bg-brand rounded-full flex items-center justify-center text-text-on-brand cursor-pointer hover:opacity-90 transition-opacity shadow-sm shadow-brand/40"
            >
              <Camera className="w-3.5 h-3.5" />
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="text-xl font-bold text-text-primary">{profile.full_name || 'Atleta'}</p>
            {profile.created_at ? (
              <p className="text-xs text-text-tertiary">Cliente desde {fmtMembro(profile.created_at)}</p>
            ) : (
              <p className="text-xs text-text-tertiary">Membro</p>
            )}
          </div>
        </div>

        {/* ── Minha jornada ── */}
        <div>
          <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3">
            Minha jornada
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/aluno/medidas"
              className="bg-surface-2 rounded-xl p-4 flex items-center gap-3 active:opacity-70 transition-opacity"
            >
              <TrendUp className="w-5 h-5 text-brand flex-shrink-0" />
              <span className="text-sm font-medium text-text-primary">Progresso</span>
            </Link>
            <Link
              href="/aluno/ranking"
              className="bg-surface-2 rounded-xl p-4 flex items-center gap-3 active:opacity-70 transition-opacity"
            >
              <Trophy className="w-5 h-5 text-brand flex-shrink-0" />
              <span className="text-sm font-medium text-text-primary">Ranking</span>
            </Link>
            <Link
              href="/aluno/dashboard"
              className="bg-surface-2 rounded-xl p-4 flex items-center gap-3 active:opacity-70 transition-opacity"
            >
              <Calendar className="w-5 h-5 text-brand flex-shrink-0" />
              <span className="text-sm font-medium text-text-primary">Calendário</span>
            </Link>
            <Link
              href="/aluno/fotos"
              className="bg-surface-2 rounded-xl p-4 flex items-center gap-3 active:opacity-70 transition-opacity"
            >
              <Camera className="w-5 h-5 text-brand flex-shrink-0" />
              <span className="text-sm font-medium text-text-primary">Fotos</span>
            </Link>
          </div>
        </div>

        {/* ── Dados pessoais ── */}
        <SectionCard title="Dados pessoais">
          <SettingsRow icon={User} label="Nome" value={profile.full_name} onClick={() => setDateOfBirthOpen(true)} />
          <SettingsRow icon={Envelope} label="E-mail" value={email.length > 22 ? email.slice(0, 20) + '…' : email} />
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
        </SectionCard>

        {/* ── Treino ── */}
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
          className="w-full h-12 border border-danger/30 rounded-xl text-danger text-sm font-medium flex items-center justify-center gap-2"
        >
          <SignOut className="w-4 h-4" />
          Sair da conta
        </button>

      </div>

      {/* ── Modais ── */}

      <ChangePasswordModal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />

      <DateOfBirthModal
        isOpen={dateOfBirthOpen}
        onClose={() => setDateOfBirthOpen(false)}
        userId={userId || ''}
        currentDate={profile.date_of_birth || ''}
        onSuccess={(newDate) => setProfile(p => ({ ...p, date_of_birth: newDate }))}
      />

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
