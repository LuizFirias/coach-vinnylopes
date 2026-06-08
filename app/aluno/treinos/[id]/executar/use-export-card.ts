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

      // Converter canvas para blob e fazer download
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Erro ao processar imagem');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${options.nomeRotina.toLowerCase().replace(/\s+/g, '-')}-${theme}.png`;
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

  return { exportCard, exportAllCards, getPreviewUrl };
}
