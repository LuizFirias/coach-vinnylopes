import html2canvas from 'html2canvas';

type CardTheme = 'dark' | 'light' | 'transparent';

interface ExportOptions {
  nomeRotina: string;
  duracao: number;
  volume: number;
  sets: number;
  exercicios: Array<{ nome: string }>;
  prsCount: number;
  coachUsername: string;
}

export function useExportWorkoutCard() {
  const exportCard = async (theme: CardTheme, options: ExportOptions) => {
    try {
      const element = document.getElementById(`card-${theme}`);
      if (!element) {
        console.error(`Card element with id card-${theme} not found`);
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: theme === 'transparent' ? null : undefined,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      const filename = `${options.nomeRotina.toLowerCase().replace(/\s+/g, '-')}-${theme}.png`;

      // Try Web Share API first (mobile native save)
      if (navigator.share && canvas.toBlob) {
        try {
          canvas.toBlob(async (blob) => {
            if (!blob) {
              alert('Erro ao processar imagem');
              return;
            }

            const file = new File([blob], filename, { type: 'image/png' });

            // Check if device can share images
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  files: [file],
                  title: options.nomeRotina,
                  text: `Meu treino ${options.nomeRotina}`,
                });
                return;
              } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                  console.warn('Web Share failed, falling back to download:', err);
                }
              }
            }
          }, 'image/png', 1.0);
        } catch (err) {
          console.warn('Web Share not available, using download:', err);
        }
      }

      // Fallback: Download as blob (for desktop and unsupported browsers)
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Erro ao processar imagem');
          return;
        }

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
      alert(`Erro ao exportar card. Tente novamente.`);
    }
  };

  const exportAllCards = async (options: ExportOptions) => {
    const themes: CardTheme[] = ['dark', 'light', 'transparent'];

    for (const theme of themes) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await exportCard(theme, options);
    }
  };

  const getPreviewUrl = async (theme: CardTheme): Promise<string | null> => {
    try {
      const element = document.getElementById(`card-preview-${theme}`);
      if (!element) return null;

      const canvas = await html2canvas(element, {
        scale: 1,
        backgroundColor: theme === 'transparent' ? null : undefined,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error(`Erro ao gerar preview ${theme}:`, error);
      return null;
    }
  };

  const shareToGallery = async (theme: CardTheme, options: ExportOptions) => {
    try {
      const element = document.getElementById(`card-${theme}`);
      if (!element) {
        console.error(`Card element with id card-${theme} not found`);
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: theme === 'transparent' ? null : undefined,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      const filename = `${options.nomeRotina.toLowerCase().replace(/\s+/g, '-')}-${theme}.png`;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Erro ao processar imagem');
          return;
        }

        try {
          const file = new File([blob], filename, { type: 'image/png' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: options.nomeRotina,
              text: `Meu treino ${options.nomeRotina}`,
            });
          } else {
            // Fallback to download if Web Share not available
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
      alert(`Erro ao compartilhar. Tente novamente.`);
    }
  };

  return { exportCard, exportAllCards, getPreviewUrl, shareToGallery };
}

