'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DeviceMobile, Download, ShareNetwork, X } from '@phosphor-icons/react';
import { toPng } from 'html-to-image';
import { useAlunoBodyGender } from '@/app/contexts/AlunoBodyGenderContext';
import { MuscleVolumeCard } from '@/app/components/workout/share/MuscleVolumeCard';
import { PrCard } from '@/app/components/workout/share/PrCard';
import { ReceiptCard } from '@/app/components/workout/share/ReceiptCard';
import { WorkoutExercisesCard } from '@/app/components/workout/share/WorkoutExercisesCard';
import { WorkoutMuscleListCard } from '@/app/components/workout/share/WorkoutMuscleListCard';
import { WorkoutPosterCard } from '@/app/components/workout/share/WorkoutPosterCard';
import { WorkoutSummaryCard } from '@/app/components/workout/share/WorkoutSummaryCard';
import { formatDuration } from '@/lib/utils/format';
import {
  type ShareExerciseInput,
  type ShareTheme,
  SHARE_THEME_LABELS,
  SHARE_TRANSPARENT_CHECKER,
  getShareExportOptions,
} from '@/lib/utils/workoutShare';
import { cn } from '@/lib/utils/cn';

export interface SharePrPrincipal {
  exercicioNome: string;
  cargaNova: number;
  cargaAnterior: number;
}

export interface CompletionShareScreenProps {
  nomeRotina: string;
  duracao: number;
  volume: number;
  sets: number;
  exercicios: ShareExerciseInput[];
  coachUsername: string;
  prsCount?: number;
  prPrincipal?: SharePrPrincipal | null;
  /**
   * Fecha a tela sem navegar — usada quando essa tela é aberta por cima de outra
   * (ex.: compartilhar um treino antigo a partir do perfil). Sem essa prop, o
   * comportamento é o de sempre: X/"Pular" navegam pra /aluno/treinos.
   */
  onClose?: () => void;
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
  prsCount = 0,
  prPrincipal = null,
  onClose,
}: CompletionShareScreenProps) {
  const [exporting, setExporting] = useState(false);
  const [temaAtivo, setTemaAtivo] = useState<ShareTheme>('escuro');
  const [cardAtivo, setCardAtivo] = useState(0);
  const [cardScale, setCardScale] = useState(1);
  const [supportsGallerySave, setSupportsGallerySave] = useState(false);
  const router = useRouter();
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const bodyGender = useAlunoBodyGender();
  const handleClose = onClose ?? (() => router.push('/aluno/treinos'));

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

  const receiptExercicios = exercicios
    .filter((ex) => ex.series.some((s) => s.completado))
    .map((ex) => {
      const done = ex.series.filter((s) => s.completado);
      const pesos = done.map((s) => s.peso_atual ?? 0).filter((p) => p > 0);
      return {
        nome: ex.nome,
        series: done.length,
        cargaMax: pesos.length > 0 ? Math.max(...pesos) : 0,
      };
    });

  const gruposMap: Record<string, number> = {};
  for (const ex of exercicios) {
    if (!ex.grupo_muscular) continue;
    const seriesCompletas = ex.series.filter((s) => s.completado).length;
    if (seriesCompletas === 0) continue;
    gruposMap[ex.grupo_muscular] = (gruposMap[ex.grupo_muscular] ?? 0) + seriesCompletas;
  }
  const gruposMusculares = Object.entries(gruposMap)
    .map(([musculo, series]) => ({ musculo, series }))
    .sort((a, b) => b.series - a.series)
    .slice(0, 6);

  const cards: Array<{ id: string; label: string; render: () => ReactNode }> = [];

  if (prsCount > 0 && prPrincipal) {
    cards.push({
      id: 'pr',
      label: 'PR',
      render: () => (
        <PrCard
          exercicioNome={prPrincipal.exercicioNome}
          cargaNova={prPrincipal.cargaNova}
          cargaAnterior={prPrincipal.cargaAnterior}
          prsCount={prsCount}
          coachHandle={coachUsername}
          theme={temaAtivo}
        />
      ),
    });
  }

  cards.push(
    {
      id: 'poster',
      label: 'Anatomia',
      render: () => <WorkoutPosterCard {...shareProps} exercicios={exercicios} />,
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
      render: () => <WorkoutSummaryCard {...shareProps} />,
    },
    {
      id: 'exercicios',
      label: 'Exercícios',
      render: () => <WorkoutExercisesCard {...shareProps} exercises={exerciseItems} />,
    },
    {
      id: 'receipt',
      label: 'Detalhes',
      render: () => (
        <ReceiptCard
          workoutName={workoutName}
          exercicios={receiptExercicios}
          volumeTotal={volume}
          duracaoSegundos={duracao}
          coachHandle={coachUsername}
          theme={temaAtivo}
        />
      ),
    },
  );

  if (gruposMusculares.length > 0) {
    cards.push({
      id: 'muscles',
      label: 'Músculos',
      render: () => (
        <MuscleVolumeCard
          workoutName={workoutName}
          grupos={gruposMusculares}
          totalSeries={sets}
          duracaoSegundos={duracao}
          coachHandle={coachUsername}
          theme={temaAtivo}
        />
      ),
    });
  }

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

  useEffect(() => {
    setCardAtivo((prev) => Math.min(prev, Math.max(0, cards.length - 1)));
    cardRefs.current = cardRefs.current.slice(0, cards.length);
  }, [cards.length]);

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

  return (
    <div className="relative flex min-h-screen flex-col bg-surface-0">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <button
          onClick={handleClose}
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
                : 'border-card bg-surface-1 text-text-secondary hover:text-text-primary',
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
              className="aspect-square w-[85vw] shrink-0 snap-center overflow-hidden rounded-xl"
              style={temaAtivo === 'transparente' ? SHARE_TRANSPARENT_CHECKER : undefined}
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
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-card bg-surface-1 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-50"
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
          onClick={handleClose}
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
