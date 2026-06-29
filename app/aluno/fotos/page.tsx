'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { extractStoragePath, getSignedStorageUrl } from '@/lib/storageUrls';
import { getSafeSession } from '@/lib/authErrorHandler';
import {
  Camera, UploadSimple, Trash, ArrowLeft, CircleNotch, Image as ImageIcon, Lock,
} from '@phosphor-icons/react';
import Link from 'next/link';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { cn } from '@/lib/utils/cn';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Foto {
  id: string;
  posicao: 'frente' | 'lado' | 'costas';
  url_foto: string;         // signed URL (resolução em runtime)
  original_path: string;   // path real no storage
  data_upload: string;
}

type Sessao = { data: string; fotos: Foto[] };
type Posicao = 'frente' | 'lado' | 'costas';

const LABEL: Record<Posicao, string> = { frente: 'Frente', lado: 'Lado', costas: 'Costas' };

// ─── Ícone de pose (substitui glyph quebrado do "Lado") ──────────────────────

function PoseIcon({ tipo }: { tipo: Posicao }) {
  if (tipo === 'frente') {
    return (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="5" r="2" />
        <path d="M12 8v6M8 10h8M10 20l2-6 2 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tipo === 'lado') {
    return (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="5" r="2" />
        <path d="M12 8v6M12 10h4M11 20l1-6 2 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 8v6M8 10h8M10 20l2-6 2 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11l-2 1M15 11l2 1" strokeLinecap="round" />
    </svg>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FotosPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [uploading, setUploading] = useState<Set<Posicao>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessao, setSelectedSessao] = useState<string | null>(null); // data da sessão timeline ativa
  const [lightbox, setLightbox] = useState<Foto | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<Foto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // ── Carregar ─────────────────────────────────────────────────────────────

  const fetchFotos = useCallback(async () => {
    const session = await getSafeSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data, error: fetchErr } = await supabaseClient
      .from('fotos_evolucao')
      .select('*')
      .eq('aluno_id', user.id)
      .order('data_upload', { ascending: false });

    if (fetchErr) { setError('Erro ao carregar fotos'); setLoading(false); return; }

    const assinadas = await Promise.all((data || []).map(async (f: any) => {
      const signed = await getSignedStorageUrl('evolucao-fotos', f.url_foto, 3600);
      return {
        ...f,
        original_path: extractStoragePath('evolucao-fotos', f.url_foto) || f.url_foto,
        url_foto: signed || f.url_foto,
      };
    }));

    setFotos(assinadas);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFotos(); }, [fetchFotos]);

  // Selecionar sessão mais recente por padrão
  useEffect(() => {
    if (fotos.length > 0 && !selectedSessao) {
      setSelectedSessao(fmtDataKey(fotos[0].data_upload));
    }
  }, [fotos]);

  // ── Upload ───────────────────────────────────────────────────────────────

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, posicao: Posicao) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) { setError('Selecione uma imagem válida'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Imagem muito grande. Máximo 10MB'); return; }

    setUploading(prev => new Set(prev).add(posicao));
    setError(null);

    try {
      const fileName = `${userId}_${posicao}_${Date.now()}_${file.name}`;
      const { error: upErr } = await supabaseClient.storage.from('evolucao-fotos').upload(fileName, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabaseClient.from('fotos_evolucao').insert({
        aluno_id: userId, posicao, url_foto: fileName, data_upload: new Date().toISOString(),
      });
      if (dbErr) throw dbErr;

      await fetchFotos();
    } catch (err: any) {
      setError(err.message || 'Erro no upload');
    } finally {
      setUploading(prev => { const n = new Set(prev); n.delete(posicao); return n; });
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!photoToDelete) return;
    setDeleting(true);
    try {
      await supabaseClient.storage.from('evolucao-fotos').remove([photoToDelete.original_path]);
      await supabaseClient.from('fotos_evolucao').delete().eq('id', photoToDelete.id);
      setFotos(prev => prev.filter(f => f.id !== photoToDelete.id));
      setPhotoToDelete(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  function fmtDataKey(d: string): string {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function fmtDataLabel(d: string): string {
    return new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  }

  const sessoes: Sessao[] = [];
  fotos.forEach(f => {
    const key = fmtDataKey(f.data_upload);
    const s = sessoes.find(s => s.data === key);
    if (s) s.fotos.push(f);
    else sessoes.push({ data: key, fotos: [f] });
  });

  const sessaoAtiva = sessoes.find(s => s.data === selectedSessao) ?? sessoes[0] ?? null;
  const diasSdeUltima = fotos.length > 0
    ? Math.floor((Date.now() - new Date(fotos[0].data_upload).getTime()) / 86400000)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando fotos..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* ── Header ── */}
        <div>
          <Link href="/aluno/dashboard" className="inline-flex items-center gap-1.5 text-brand text-2xs uppercase tracking-caps mb-4">
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Fotos</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Acompanhe sua transformação</p>
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* ── Aviso dias atrasados ── */}
        {diasSdeUltima !== null && diasSdeUltima > 15 && (
          <div className="flex items-center gap-3 bg-surface-2 border border-border-default rounded-2xl px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-brand animate-pulse flex-shrink-0" />
            <p className="text-xs text-text-secondary">
              Faz <span className="font-semibold text-text-primary">{diasSdeUltima} dias</span> desde sua última sessão de fotos. Que tal registrar hoje?
            </p>
          </div>
        )}

        {/* ── Upload das 3 poses ── */}
        <section>
          <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3">Nova sessão</p>
          <div className="grid grid-cols-3 gap-3">
            {(['frente', 'lado', 'costas'] as const).map(tipo => (
              <label key={tipo} className="cursor-pointer group block">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => handleUpload(e, tipo)}
                  disabled={uploading.has(tipo)}
                />
                <div 
                  className={cn(
                    'aspect-[3/4] rounded-2xl border transition-all duration-120 flex flex-col items-center justify-center gap-2 relative overflow-hidden',
                    'border-white/8 active:scale-97 hover:scale-[0.99] hover:border-brand/40',
                    uploading.has(tipo) ? 'bg-brand/5' : ''
                  )}
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.4) 100%)',
                    boxShadow: '0px 10px 30px rgba(0,0,0,0.35)'
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,122,255,0.25)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.boxShadow = '0px 10px 30px rgba(0,0,0,0.35)';
                  }}
                >
                  {uploading.has(tipo) ? (
                    <CircleNotch className="w-5 h-5 text-brand animate-spin" />
                  ) : (
                    <>
                      <div className="text-text-tertiary group-hover:text-brand group-hover:scale-105 transition-all">
                        <PoseIcon tipo={tipo} />
                      </div>
                      <span className="text-xs font-semibold text-text-secondary group-hover:text-text-primary transition-colors">{LABEL[tipo]}</span>
                      <div className="w-6 h-6 rounded-full bg-surface-3 border border-border-subtle flex items-center justify-center text-text-tertiary group-hover:bg-brand/10 group-hover:border-brand/30 group-hover:text-brand transition-all">
                        <UploadSimple className="w-3 h-3" />
                      </div>
                    </>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Dica educativa */}
          <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-surface-2 rounded-xl border border-border-subtle">
            <span className="text-base leading-none mt-0.5">💡</span>
            <p className="text-xs text-text-tertiary leading-relaxed">
              Mesma roupa, mesma luz, mesmo horário. Manhã em jejum é o ideal para comparações consistentes.
            </p>
          </div>
        </section>

        {/* ── Privacidade ── */}
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 rounded-xl border border-border-subtle">
          <Lock className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
          <p className="text-xs text-text-tertiary">Suas fotos são privadas e visíveis apenas pelo seu coach.</p>
        </div>

        {/* ── Timeline + galeria ── */}
        {sessoes.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-tertiary">
              <ImageIcon className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-text-primary">Nenhuma foto ainda</p>
            <p className="text-xs text-text-tertiary max-w-xs">
              Envie suas fotos de frente, lado e costas para acompanhar sua transformação ao longo do tempo.
            </p>
          </div>
        ) : (
          <section>
            <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3">Histórico</p>

            {/* Timeline horizontal scrollável */}
            <div
              ref={timelineRef}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
              style={{ scrollbarWidth: 'none' }}
            >
              {sessoes.map(s => {
                const thumb = s.fotos[0]?.url_foto;
                const ativa = s.data === (sessaoAtiva?.data ?? null);
                return (
                  <button
                    key={s.data}
                    onClick={() => setSelectedSessao(s.data)}
                    className={cn(
                      'flex-shrink-0 flex flex-col items-center gap-1 transition-opacity',
                      !ativa && 'opacity-50 hover:opacity-75'
                    )}
                  >
                    <div className={cn(
                      'w-14 h-18 rounded-xl overflow-hidden border-2 transition-colors',
                      ativa ? 'border-brand' : 'border-transparent'
                    )}
                      style={{ height: '4.5rem' }}
                    >
                      {thumb ? (
                        <img src={thumb} alt={s.data} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-surface-3 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-text-tertiary" />
                        </div>
                      )}
                    </div>
                    <span className="text-2xs text-text-tertiary whitespace-nowrap">{fmtDataLabel(s.fotos[0].data_upload)}</span>
                  </button>
                );
              })}
            </div>

            {/* Grid da sessão ativa */}
            {sessaoAtiva && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {(['frente', 'lado', 'costas'] as const).map(tipo => {
                  const foto = sessaoAtiva.fotos.find(f => f.posicao === tipo);
                  return (
                    <div key={tipo} className="relative group">
                      <div
                        className={cn(
                          'aspect-[3/4] rounded-2xl overflow-hidden border border-white/8 relative bg-surface-2 transition-all duration-120 active:scale-97 hover:scale-[0.99]',
                          foto && 'cursor-pointer'
                        )}
                        style={{
                          boxShadow: '0px 10px 30px rgba(0,0,0,0.35)'
                        }}
                        onClick={() => foto && setLightbox(foto)}
                      >
                        {foto ? (
                          <>
                            <img src={foto.url_foto} alt={LABEL[tipo]} className="w-full h-full object-cover" />
                            {/* Overlay inferior com gradient fade */}
                            <div 
                              className="absolute inset-0 pointer-events-none" 
                              style={{
                                background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)'
                              }}
                            />
                            {/* Texto absoluto sobre a imagem */}
                            <div className="absolute bottom-3 left-3 right-3 flex flex-col pointer-events-none">
                              <span className="text-xs font-bold text-white tracking-wide">{LABEL[tipo]}</span>
                              <span className="text-[10px] text-text-secondary mt-0.5 font-mono">
                                {new Date(foto.data_upload).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            </div>
                            
                            {/* Indicador de progresso (badge canto superior esquerdo) */}
                            <div className="absolute top-2 left-2 bg-brand/80 backdrop-blur-xs px-2 py-0.5 rounded-full border border-brand/20 shadow-sm pointer-events-none">
                              <span className="text-[9px] font-bold text-white uppercase tracking-wider">Atualizado</span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-text-tertiary">
                            <PoseIcon tipo={tipo} />
                            <span className="text-2xs font-medium">{LABEL[tipo]}</span>
                          </div>
                        )}
                      </div>
                      {foto && (
                        <button
                          onClick={() => setPhotoToDelete(foto)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 backdrop-blur-xs flex items-center justify-center text-danger hover:bg-danger hover:text-white border border-white/5 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.url_foto}
            alt={LABEL[lightbox.posicao]}
            className="max-w-full max-h-full rounded-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Modal confirmar exclusão ── */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-surface-2 border border-border-default rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <Trash className="w-6 h-6 text-danger" />
            </div>
            <h3 className="text-base font-bold text-text-primary text-center mb-1">Excluir foto</h3>
            <p className="text-sm text-text-secondary text-center mb-5">
              Foto de <span className="font-semibold text-text-primary">{LABEL[photoToDelete.posicao]}</span> será removida permanentemente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPhotoToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-surface-3 border border-border-subtle text-sm text-text-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <CircleNotch className="w-4 h-4 animate-spin" /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
