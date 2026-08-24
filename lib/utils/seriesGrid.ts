/**
 * Templates de grid das linhas de série na execução do treino (cards e bi-set).
 * Compartilhado entre `executar/page.tsx` e `BiSetGroupPreviewCard`.
 *
 * Layout: SET | ANT | PESO | REPS | [spacer 1fr] | TÉC | ✓
 * - PESO/REPS ficam à esquerda (junto do SET/ANT)
 * - SET mostra o número da série, ou a técnica principal (WS/FS/TS/BS/PR) quando prescrita
 * - TÉC/check ficam ancorados à direita
 * - O spacer isola os dois grupos (ex.: reps cluster "8x2" não colidem com TÉC)
 */

// Com ANT: SET ANT PESO REPS ·spacer· TÉC CHECK
const GRID_COLS_SERIES_WITH_ANT_MOBILE = '28px minmax(48px, 84px) 40px minmax(48px, 72px) minmax(0, 1fr) 30px 30px';
const GRID_COLS_SERIES_WITH_ANT_DESKTOP = '36px minmax(64px, 110px) 48px minmax(52px, 80px) minmax(0, 1fr) 44px 36px';
// Sem ANT: SET PESO REPS ·spacer· TÉC CHECK
const GRID_COLS_SERIES_NO_ANT_MOBILE = '28px 40px minmax(48px, 76px) minmax(0, 1fr) 32px 32px';
const GRID_COLS_SERIES_NO_ANT_DESKTOP = '36px 48px minmax(52px, 84px) minmax(0, 1fr) 44px 36px';
// Sem PESO + com ANT
const GRID_COLS_SERIES_WITH_ANT_MOBILE_NO_PESO = '28px minmax(48px, 84px) minmax(48px, 76px) minmax(0, 1fr) 30px 30px';
const GRID_COLS_SERIES_WITH_ANT_DESKTOP_NO_PESO = '36px minmax(64px, 110px) minmax(52px, 84px) minmax(0, 1fr) 44px 36px';
// Sem PESO + sem ANT
const GRID_COLS_SERIES_NO_ANT_MOBILE_NO_PESO = '28px minmax(48px, 84px) minmax(0, 1fr) 32px 32px';
const GRID_COLS_SERIES_NO_ANT_DESKTOP_NO_PESO = '36px minmax(52px, 92px) minmax(0, 1fr) 44px 36px';

// Variantes sem a coluna TÉC (bi-set: a técnica extra some, pois bi-set já é a técnica) — SET [ANT] [PESO] REPS ·spacer· CHECK
const GRID_COLS_SERIES_WITH_ANT_MOBILE_NO_EXTRA = '28px minmax(48px, 84px) 40px minmax(48px, 84px) minmax(0, 1fr) 30px';
const GRID_COLS_SERIES_WITH_ANT_DESKTOP_NO_EXTRA = '36px minmax(64px, 110px) 48px minmax(52px, 92px) minmax(0, 1fr) 36px';
const GRID_COLS_SERIES_NO_ANT_MOBILE_NO_EXTRA = '28px 40px minmax(48px, 88px) minmax(0, 1fr) 32px';
const GRID_COLS_SERIES_NO_ANT_DESKTOP_NO_EXTRA = '36px 48px minmax(52px, 96px) minmax(0, 1fr) 36px';
const GRID_COLS_SERIES_WITH_ANT_MOBILE_NO_PESO_NO_EXTRA = '28px minmax(48px, 84px) minmax(48px, 88px) minmax(0, 1fr) 30px';
const GRID_COLS_SERIES_WITH_ANT_DESKTOP_NO_PESO_NO_EXTRA = '36px minmax(64px, 110px) minmax(52px, 96px) minmax(0, 1fr) 36px';
const GRID_COLS_SERIES_NO_ANT_MOBILE_NO_PESO_NO_EXTRA = '28px minmax(48px, 96px) minmax(0, 1fr) 32px';
const GRID_COLS_SERIES_NO_ANT_DESKTOP_NO_PESO_NO_EXTRA = '36px minmax(52px, 104px) minmax(0, 1fr) 36px';

// Histórico: SET ANT PESO REPS ·spacer· TÉC CHECK
export const GRID_COLS_HISTORICO = '28px minmax(48px, 88px) minmax(44px, 60px) minmax(44px, 72px) minmax(0, 1fr) 64px 28px';
export const GRID_COLS_HISTORICO_NO_PESO = '28px minmax(48px, 88px) minmax(44px, 72px) minmax(0, 1fr) 64px 28px';

export function getSeriesGridCols(showAnterior: boolean, isDesktop: boolean, showPeso = true, showExtra = true): string {
  if (showAnterior) {
    if (isDesktop) {
      if (!showExtra) return showPeso ? GRID_COLS_SERIES_WITH_ANT_DESKTOP_NO_EXTRA : GRID_COLS_SERIES_WITH_ANT_DESKTOP_NO_PESO_NO_EXTRA;
      return showPeso ? GRID_COLS_SERIES_WITH_ANT_DESKTOP : GRID_COLS_SERIES_WITH_ANT_DESKTOP_NO_PESO;
    }
    if (!showExtra) return showPeso ? GRID_COLS_SERIES_WITH_ANT_MOBILE_NO_EXTRA : GRID_COLS_SERIES_WITH_ANT_MOBILE_NO_PESO_NO_EXTRA;
    return showPeso ? GRID_COLS_SERIES_WITH_ANT_MOBILE : GRID_COLS_SERIES_WITH_ANT_MOBILE_NO_PESO;
  }
  if (isDesktop) {
    if (!showExtra) return showPeso ? GRID_COLS_SERIES_NO_ANT_DESKTOP_NO_EXTRA : GRID_COLS_SERIES_NO_ANT_DESKTOP_NO_PESO_NO_EXTRA;
    return showPeso ? GRID_COLS_SERIES_NO_ANT_DESKTOP : GRID_COLS_SERIES_NO_ANT_DESKTOP_NO_PESO;
  }
  if (!showExtra) return showPeso ? GRID_COLS_SERIES_NO_ANT_MOBILE_NO_EXTRA : GRID_COLS_SERIES_NO_ANT_MOBILE_NO_PESO_NO_EXTRA;
  return showPeso ? GRID_COLS_SERIES_NO_ANT_MOBILE : GRID_COLS_SERIES_NO_ANT_MOBILE_NO_PESO;
}
