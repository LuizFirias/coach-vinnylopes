'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, ShareNetwork, Download, X } from '@phosphor-icons/react';
import { formatDuration, formatVolume } from '@/lib/utils/format';
import CompletionCard from '../[id]/executar/completion-card';
import { useExportWorkoutCard } from '../[id]/executar/use-export-card';


type CardTheme = 'dark' | 'light' | 'transparent' | 'muscle-dark' | 'muscle-light' | 'muscle-transparent';

interface CompletionScreenProps {
  nomeRotina: string;
  duracao: number;
  volume: number;
  sets: number;
  exercicios: Array<{
    nome: string;
    grupo_muscular?: string;
    series: Array<{ completado: boolean }>;
  }>;
  prsCount: number;
  coachUsername: string;
}

const THEMES: { theme: CardTheme; label: string; subtitle: string; preview: React.CSSProperties }[] = [
  {
    theme: 'dark',
    label: 'Tema Escuro',
    subtitle: 'Fundo preto, letras brancas',
    preview: { backgroundColor: '#0F1419', borderRadius: '8px' },
  },
  {
    theme: 'light',
    label: 'Tema Claro',
    subtitle: 'Fundo branco, letras pretas',
    preview: { backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #e5e7eb' },
  },
  {
    theme: 'transparent',
    label: 'Tema Transparente',
    subtitle: 'Fundo transparente, letras brancas',
    preview: {
      background: 'repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(180,180,180,0.15) 6px,rgba(180,180,180,0.15) 12px)',
      borderRadius: '8px',
      border: '1px dashed #555',
    },
  },
  {
    theme: 'muscle-dark',
    label: 'Muscular Escuro',
    subtitle: 'Com mapa muscular, fundo preto',
    preview: { background: 'linear-gradient(135deg,#0F1419 60%,#1a2535)', borderRadius: '8px' },
  },
  {
    theme: 'muscle-light',
    label: 'Muscular Claro',
    subtitle: 'Com mapa muscular, fundo claro',
    preview: { background: 'linear-gradient(135deg,#F3F4F6 60%,#e2e8f0)', borderRadius: '8px', border: '1px solid #d1d5db' },
  },
  {
    theme: 'muscle-transparent',
    label: 'Muscular Transparente',
    subtitle: 'Com mapa muscular, fundo transparente',
    preview: {
      background: 'repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(180,180,180,0.15) 6px,rgba(180,180,180,0.15) 12px)',
      borderRadius: '8px',
      border: '1px dashed #555',
    },
  },
];

export function CompletionScreenWithExport({
  nomeRotina,
  duracao,
  volume,
  sets,
  exercicios,
  prsCount,
  coachUsername,
}: CompletionScreenProps) {
  const [exporting, setExporting] = useState(false);
  const [exportingTheme, setExportingTheme] = useState<CardTheme | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string | null>>({});
  const { exportCard, exportAllCards, shareToGallery, getPreviewUrl } = useExportWorkoutCard();
  const router = useRouter();

  const exportOptions = {
    nomeRotina,
    duracao,
    volume,
    sets,
    exercicios,
    prsCount,
    coachUsername,
  };

  // Gerar previews quando modal abre — usa getPreviewUrl que já cuida do delay p/ muscle
  useEffect(() => {
    if (!showPreview) return;
    let cancelled = false;

    const loadPreviews = async () => {
      const newPreviews: Record<string, string | null> = {};
      for (const { theme } of THEMES) {
        if (cancelled) break;
        newPreviews[theme] = await getPreviewUrl(theme);
        if (!cancelled) setPreviews((p) => ({ ...p, [theme]: newPreviews[theme] }));
      }
    };

    // Limpar previews anteriores ao abrir
    setPreviews({});
    loadPreviews();
    return () => { cancelled = true; };
  }, [showPreview]);

  const handleExport = async (theme: CardTheme) => {
    setExporting(true);
    setExportingTheme(theme);
    await exportCard(theme, exportOptions);
    setExporting(false);
    setExportingTheme(null);
  };

  const handleShare = async (theme: CardTheme) => {
    setExporting(true);
    setExportingTheme(theme);
    await shareToGallery(theme, exportOptions);
    setExporting(false);
    setExportingTheme(null);
  };

  const handleExportAll = async () => {
    setExporting(true);
    await exportAllCards(exportOptions);
    setExporting(false);
  };

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4 pb-24">
      {/* Cards offscreen para html2canvas — left negativo garante render real mas fora da tela */}
      <div
        id="offscreen-cards-container"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          pointerEvents: 'none',
        }}
      >
        {THEMES.map(({ theme }) => (
          <div key={theme} id={`card-${theme}`}>
            <CompletionCard
              theme={theme}
              nomeRotina={nomeRotina}
              duracao={duracao}
              volume={volume}
              sets={sets}
              exercicios={exercicios}
              prsCount={prsCount}
              coachUsername={coachUsername}
            />
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-success-subtle border-2 border-success flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-1">Treino concluído!</h2>
          <p className="text-text-secondary text-sm">
            {formatVolume(volume)} · {formatDuration(duracao)} · {sets} sets
            {prsCount > 0 && ` · 🏆 ${prsCount} PR${prsCount > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Lista de temas */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
            Exportar para redes sociais
          </h3>
          <div className="space-y-2">
            {THEMES.map(({ theme, label, subtitle, preview }) => {
              const isThisExporting = exportingTheme === theme && exporting;
              return (
                <div
                  key={theme}
                  className="bg-surface-1 border border-border-subtle rounded-xl p-3 flex items-center gap-3"
                >
                  {/* Miniatura do tema */}
                  <div
                    style={{ ...preview, width: '40px', height: '40px', flexShrink: 0 }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary leading-tight">{label}</p>
                    <p className="text-xs text-text-tertiary leading-tight mt-0.5">{subtitle}</p>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleShare(theme)}
                      disabled={exporting}
                      title="Compartilhar"
                      className="w-9 h-9 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-brand hover:border-brand transition-colors disabled:opacity-40"
                    >
                      {isThisExporting ? (
                        <span className="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ShareNetwork className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleExport(theme)}
                      disabled={exporting}
                      title="Baixar PNG"
                      className="w-9 h-9 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-brand hover:border-brand transition-colors disabled:opacity-40"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => setShowPreview(true)}
            disabled={exporting}
            className="w-full h-11 rounded-xl bg-surface-2 border border-border-subtle text-text-primary text-sm font-semibold flex items-center justify-center gap-2 hover:bg-surface-3 transition-colors disabled:opacity-50"
          >
            👁️ Ver preview de todos os estilos
          </button>
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="w-full h-11 rounded-xl bg-brand text-text-on-brand text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {exporting && !exportingTheme ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Baixar todos os 6 estilos
          </button>
          <button
            onClick={() => router.push('/aluno/treinos')}
            disabled={exporting}
            className="w-full h-11 rounded-xl bg-surface-1 border border-border-subtle text-text-primary text-sm font-semibold hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            Ir para treinos
          </button>
        </div>
      </div>

      {/* Modal de Preview */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-surface-0 rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface-0 border-b border-border-subtle px-4 py-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-text-primary">Preview dos 6 estilos</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {THEMES.map(({ theme, label }) => (
                <div key={theme}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">{label}</p>
                  {previews[theme] ? (
                    <img
                      src={previews[theme]!}
                      alt={`Preview ${label}`}
                      className="w-full rounded-xl border border-border-subtle"
                      style={{ maxHeight: '400px', objectFit: 'contain' }}
                    />
                  ) : (
                    <div className="w-full h-40 rounded-xl bg-surface-1 border border-border-subtle flex items-center justify-center">
                      <p className="text-text-tertiary text-xs">Gerando preview...</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
