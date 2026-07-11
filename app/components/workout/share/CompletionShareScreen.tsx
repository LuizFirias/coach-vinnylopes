'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DeviceMobile, Download, ShareNetwork, Trophy, X } from '@phosphor-icons/react';
import { toPng } from 'html-to-image';
import { useAlunoBodyGender } from '@/app/contexts/AlunoBodyGenderContext';
import { WorkoutExercisesCard } from '@/app/components/workout/share/WorkoutExercisesCard';
import { WorkoutMuscleListCard } from '@/app/components/workout/share/WorkoutMuscleListCard';
import { WorkoutPosterCard } from '@/app/components/workout/share/WorkoutPosterCard';
import { WorkoutSummaryCard } from '@/app/components/workout/share/WorkoutSummaryCard';
import { formatDuration } from '@/lib/utils/format';
import {
  type ShareExerciseInput,
  type ShareTheme,
  SHARE_THEME_LABELS,
  getShareExportOptions,
} from '@/lib/utils/workoutShare';
import { cn } from '@/lib/utils/cn';

export interface CompletionShareScreenProps {
  nomeRotina: string;
  duracao: number;
  volume: number;
  sets: number;
  exercicios: ShareExerciseInput[];
  coachUsername: string;
}

const SHARE_THEMES: ShareTheme[] = ['escuro', 'claro', 'transparente'];

function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    const probe = new File([''], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function CompletionShareScreen({
  nomeRotina,
  duracao,
  volume,
  sets,
  exercicios,
  coachUsername,
}: CompletionShareScreenProps) {
  const [exporting, setExporting] = useState(false);
  const [shareMode, setShareMode] = useState(false);
  const [feedbackNota, setFeedbackNota] = useState('');
  const [temaAtivo, setTemaAtivo] = useState<ShareTheme>('escuro');
  const [cardAtivo, setCardAtivo] = useState(0);
  const [cardScale, setCardScale] = useState(1);
  const [supportsGallerySave, setSupportsGallerySave] = useState(false);
  const router = useRouter();
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const bodyGender = useAlunoBodyGender();

  const durationFormatted = formatDuration(duracao);
  const workoutName = nomeRotina.toUpperCase();
  const exerciseItems = exercicios.map((ex) => ({
    name: ex.nome,
    sets: ex.series.length,
  }));

  const shareProps = {
    workoutName,
    durationFormatted,
    volumeKg: volume,
    totalSets: sets,
    coachHandle: coachUsername,
    theme: temaAtivo,
    gender: bodyGender,
  };

  const cards = [
    {
      id: 'poster',
      label: 'Anatomia',
      render: () => (
        <WorkoutPosterCard
          {...shareProps}
          exercicios={exercicios}
        />
      ),
    },
    {
      id: 'pull',
      label: 'Treino + anatomia',
      render: () => (
        <WorkoutMuscleListCard
          workoutName={workoutName}
          exercises={exerciseItems}
          exercicios={exercicios}
          coachHandle={coachUsername}
          theme={temaAtivo}
          gender={bodyGender}
        />
      ),
    },
    {
      id: 'metricas',
      label: 'Métricas',
      render: () => (
        <WorkoutSummaryCard
          {...shareProps}
        />
      ),
    },
    {
      id: 'exercicios',
      label: 'Exercícios',
      render: () => (
        <WorkoutExercisesCard
          {...shareProps}
          exercises={exerciseItems}
        />
      ),
    },
  ];

  useEffect(() => {
    setSupportsGallerySave(canShareFiles());
  }, []);

  useEffect(() => {
    const calcScale = () => {
      const previewWidth = window.innerWidth * 0.85;
      setCardScale(previewWidth / 1080);
    };
    calcScale();
    window.addEventListener('resize', calcScale);
    return () => window.removeEventListener('resize', calcScale);
  }, []);

  const renderCardBlob = async (index: number): Promise<Blob> => {
    const cardEl = cardRefs.current[index];
    if (!cardEl) throw new Error('Card não encontrado');

    const dataUrl = await toPng(cardEl, getShareExportOptions(temaAtivo));
    return (await fetch(dataUrl)).blob();
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCardAt = async (index: number) => {
    try {
      setExporting(true);
      const blob = await renderCardBlob(index);
      const fileName = `auron-${cards[index].id}-${temaAtivo}-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Treino ${nomeRotina}`,
          text: `Treino concluído — ${durationFormatted} · ${volume.toLocaleString('pt-BR')} kg`,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: `Treino ${nomeRotina}`,
          text: `Treino concluído — ${durationFormatted} · ${volume.toLocaleString('pt-BR')} kg · Auronfit`,
        });
      } else {
        downloadBlob(blob, fileName);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Erro ao exportar card:', error);
        alert('Não foi possível gerar o card agora. Tente novamente.');
      }
    } finally {
      setExporting(false);
    }
  };

  const saveToGallery = async (index: number) => {
    try {
      setExporting(true);
      const blob = await renderCardBlob(index);
      const fileName = `auron-treino-${cards[index].id}-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Salvar na galeria' });
        return;
      }

      downloadBlob(blob, fileName);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Erro ao salvar card:', error);
        alert('Não foi possível salvar o card agora. Tente novamente.');
      }
    } finally {
      setExporting(false);
    }
  };

  if (!shareMode) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-0 px-4 pb-8">
        <div className="flex flex-col items-center pb-6 pt-12">
          <Trophy className="mb-3 h-10 w-10 text-success" weight="duotone" />
          <h1 className="text-xl font-bold text-text-primary">Treino concluído!</h1>
          <p className="mt-1 font-mono text-xs tabular-nums text-text-muted">
            {volume.toLocaleString('pt-BR')} kg · {durationFormatted} · {sets} séries
          </p>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1 rounded-lg border border-border-subtle bg-surface-1 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted">Duração</span>
            <span className="font-mono text-lg font-bold tabular-nums text-text-primary">{durationFormatted}</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg border border-border-subtle bg-surface-1 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted">Volume</span>
            <span className="font-mono text-lg font-bold tabular-nums text-text-primary">
              {volume.toLocaleString('pt-BR')}
              <span className="ml-0.5 text-xs font-normal text-text-muted">kg</span>
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg border border-border-subtle bg-surface-1 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted">Séries</span>
            <span className="font-mono text-lg font-bold tabular-nums text-text-primary">{sets}</span>
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Como foi o treino? (opcional)
          </label>
          <textarea
            value={feedbackNota}
            onChange={(e) => setFeedbackNota(e.target.value.slice(0, 300))}
            placeholder="Deixe uma nota sobre essa sessão..."
            className="max-h-[140px] min-h-[80px] w-full resize-none rounded-lg border border-border-subtle bg-surface-1 p-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            maxLength={300}
          />
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={() => setShareMode(true)}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-semibold text-white transition-colors duration-120 hover:bg-brand-hover"
          >
            <ShareNetwork className="h-4 w-4" />
            Compartilhar treino
          </button>
          <button
            onClick={() => router.push('/aluno/treinos')}
            className="h-11 w-full rounded-lg text-sm font-medium text-text-muted transition-colors duration-120 hover:text-text-primary"
          >
            Ir para treinos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-surface-0">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <button
          onClick={() => setShareMode(false)}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-1"
        >
          <X className="h-4 w-4 text-text-secondary" />
        </button>
        <h2 className="text-sm font-semibold text-text-primary">Compartilhar treino</h2>
        <div className="w-8" />
      </div>

      <div className="mb-3 flex gap-2 px-4">
        {SHARE_THEMES.map((tema) => (
          <button
            key={tema}
            onClick={() => setTemaAtivo(tema)}
            className={cn(
              'flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors',
              temaAtivo === tema
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-border-subtle bg-surface-1 text-text-secondary hover:text-text-primary',
            )}
          >
            {SHARE_THEME_LABELS[tema]}
          </button>
        ))}
      </div>

      <div className="relative">
        <div
          className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-3"
          onScroll={(e) => {
            const el = e.currentTarget;
            const cardWidth = el.clientWidth * 0.85 + 12;
            const nextIndex = Math.max(0, Math.min(cards.length - 1, Math.round(el.scrollLeft / cardWidth)));
            setCardAtivo(nextIndex);
          }}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              className={cn(
                'aspect-square w-[85vw] shrink-0 snap-center overflow-hidden rounded-xl',
                temaAtivo === 'transparente' && 'bg-[#0a0f1e]',
              )}
            >
              <div
                style={{
                  width: '85vw',
                  aspectRatio: '1/1',
                  overflow: 'hidden',
                  borderRadius: 12,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 1080,
                    height: 1080,
                    transform: `scale(${cardScale})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                >
                  {card.render()}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-1 flex justify-center gap-1.5">
          {cards.map((card, i) => (
            <div
              key={card.id}
              className={cn(
                'rounded-full transition-all duration-200',
                i === cardAtivo ? 'h-1.5 w-4 bg-brand' : 'h-1.5 w-1.5 bg-border-default',
              )}
            />
          ))}
        </div>

        <p className="mt-2 text-center text-xs text-text-muted">{cards[cardAtivo]?.label}</p>
      </div>

      <div className="mt-5 flex flex-col gap-2 px-4 pb-8">
        <button
          onClick={() => exportCardAt(cardAtivo)}
          disabled={exporting}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          <ShareNetwork className="h-4 w-4" />
          Compartilhar este card
        </button>
        <button
          onClick={() => saveToGallery(cardAtivo)}
          disabled={exporting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-1 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-50"
        >
          {supportsGallerySave ? (
            <>
              <DeviceMobile className="h-4 w-4 text-text-secondary" />
              Salvar na galeria
            </>
          ) : (
            <>
              <Download className="h-4 w-4 text-text-secondary" />
              Baixar imagem
            </>
          )}
        </button>
        <button
          onClick={() => router.push('/aluno/treinos')}
          className="h-10 w-full text-sm text-text-muted transition-colors hover:text-text-secondary"
        >
          Pular
        </button>
      </div>

      <div className="pointer-events-none absolute -left-[9999px] -top-[9999px]">
        {cards.map((card, i) => (
          <div
            key={`export-${card.id}-${temaAtivo}`}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            style={{ width: 1080, height: 1080 }}
          >
            {card.render()}
          </div>
        ))}
      </div>
    </div>
  );
}

