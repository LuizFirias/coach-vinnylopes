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

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${options.nomeRotina.toLowerCase().replace(/\s+/g, '-')}-${theme}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(`Erro ao exportar card ${theme}:`, error);
      alert(`Erro ao exportar card. Tente novamente.`);
    }
  };

  const exportAllCards = async (options: ExportOptions) => {
    const themes: CardTheme[] = ['dark', 'light', 'transparent'];

    for (const theme of themes) {
      await new Promise(resolve => setTimeout(resolve, 300));
      await exportCard(theme, options);
    }
  };

  return { exportCard, exportAllCards };
}
