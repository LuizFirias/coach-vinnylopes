import html2canvas from 'html2canvas';

type CardTheme =
  | 'dark'
  | 'light'
  | 'transparent'
  | 'muscle-dark'
  | 'muscle-light'
  | 'muscle-transparent';

const isTransparentTheme = (theme: CardTheme) => theme.includes('transparent');
const isMuscleTheme = (theme: CardTheme) => theme.startsWith('muscle-');

interface ExportOptions {
  nomeRotina: string;
  duracao: number;
  volume: number;
  sets: number;
  exercicios: Array<{ nome: string }>;
  prsCount: number;
  coachUsername: string;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useExportWorkoutCard() {
  const captureCard = async (theme: CardTheme): Promise<HTMLCanvasElement | null> => {
    const element = document.getElementById(`card-${theme}`);
    if (!element) {
      console.error(`Card element with id card-${theme} not found`);
      return null;
    }

    // Dar tempo ao BodyChart (muscle themes) para renderizar o SVG sem transições
    if (isMuscleTheme(theme)) {
      await delay(300);
    }

    return html2canvas(element, {
      scale: 2,
      backgroundColor: isTransparentTheme(theme) ? null : undefined,
      logging: false,
      useCORS: true,
      allowTaint: true,
      // Garante captura de elementos com visibility:hidden no pai
      ignoreElements: () => false,
      onclone: (clonedDoc) => {
        const container = clonedDoc.getElementById('offscreen-cards-container');
        if (container) {
          container.style.position = 'absolute';
          container.style.left = '0px';
          container.style.top = '0px';
        }
      },
    });
  };

  const exportCard = async (theme: CardTheme, options: ExportOptions) => {
    try {
      const canvas = await captureCard(theme);
      if (!canvas) return;

      const filename = `${options.nomeRotina.toLowerCase().replace(/\s+/g, '-')}-${theme}.png`;

      // Tentar Web Share API (mobile)
      if (navigator.share && canvas.toBlob) {
        try {
          await new Promise<void>((resolve) => {
            canvas.toBlob(async (blob) => {
              if (!blob) { resolve(); return; }
              const file = new File([blob], filename, { type: 'image/png' });
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                  await navigator.share({ files: [file], title: options.nomeRotina, text: `Meu treino ${options.nomeRotina}` });
                  resolve();
                  return;
                } catch (err) {
                  if ((err as Error).name !== 'AbortError') {
                    console.warn('Web Share failed, using download:', err);
                  }
                }
              }
              resolve();
            }, 'image/png', 1.0);
          });
        } catch (err) {
          console.warn('Web Share not available:', err);
        }
      }

      // Fallback: download direto
      canvas.toBlob((blob) => {
        if (!blob) { alert('Erro ao processar imagem'); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error(`Erro ao exportar card ${theme}:`, error);
      alert('Erro ao exportar card. Tente novamente.');
    }
  };

  const exportAllCards = async (options: ExportOptions) => {
    const themes: CardTheme[] = ['dark', 'light', 'transparent', 'muscle-dark', 'muscle-light', 'muscle-transparent'];
    for (const theme of themes) {
      await delay(400);
      await exportCard(theme, options);
    }
  };

  const getPreviewUrl = async (theme: CardTheme): Promise<string | null> => {
    try {
      const element = document.getElementById(`card-${theme}`);
      if (!element) return null;

      if (isMuscleTheme(theme)) await delay(300);

      const canvas = await html2canvas(element, {
        scale: 0.5,
        backgroundColor: isTransparentTheme(theme) ? null : undefined,
        logging: false,
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc) => {
          const container = clonedDoc.getElementById('offscreen-cards-container');
          if (container) {
            container.style.position = 'absolute';
            container.style.left = '0px';
            container.style.top = '0px';
          }
        },
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error(`Erro ao gerar preview ${theme}:`, error);
      return null;
    }
  };

  const shareToGallery = async (theme: CardTheme, options: ExportOptions) => {
    try {
      const canvas = await captureCard(theme);
      if (!canvas) return;

      const filename = `${options.nomeRotina.toLowerCase().replace(/\s+/g, '-')}-${theme}.png`;

      canvas.toBlob(async (blob) => {
        if (!blob) { alert('Erro ao processar imagem'); return; }
        try {
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: options.nomeRotina, text: `Meu treino ${options.nomeRotina}` });
          } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.error('Error sharing:', err);
            alert('Erro ao salvar imagem. Tente novamente.');
          }
        }
      }, 'image/png', 1.0);
    } catch (error) {
      console.error(`Erro ao compartilhar card ${theme}:`, error);
      alert('Erro ao compartilhar. Tente novamente.');
    }
  };

  return { exportCard, exportAllCards, getPreviewUrl, shareToGallery };
}
