/**
 * Templates de grid das linhas de série na execução do treino (cards e bi-set).
 * Compartilhado entre `executar/page.tsx` e `BiSetGroupPreviewCard` para que cada
 * metade do bi-set calcule sua própria coluna (uma pode ter peso, a outra não).
 */

const GRID_COLS_SERIES_WITH_ANT_MOBILE = '28px minmax(96px, 1.6fr) 40px 34px 30px 30px 30px';
const GRID_COLS_SERIES_NO_ANT_MOBILE = '28px 40px 40px 32px 32px 32px';
const GRID_COLS_SERIES_WITH_ANT_DESKTOP = '36px minmax(110px, 1.5fr) 48px 48px 44px 44px 36px';
const GRID_COLS_SERIES_NO_ANT_DESKTOP = '36px 48px 48px 44px 44px 36px';
// Variantes sem a coluna PESO (exercícios de peso do corpo)
const GRID_COLS_SERIES_WITH_ANT_MOBILE_NO_PESO = '28px minmax(96px, 1.6fr) 34px 30px 30px 30px';
const GRID_COLS_SERIES_NO_ANT_MOBILE_NO_PESO = '28px 40px 32px 32px 32px';
const GRID_COLS_SERIES_WITH_ANT_DESKTOP_NO_PESO = '36px minmax(110px, 1.5fr) 48px 44px 44px 36px';
const GRID_COLS_SERIES_NO_ANT_DESKTOP_NO_PESO = '36px 48px 44px 44px 36px';

// ANT flexível (evita truncar o "anterior") — PESO/REPS/TÉC ficam com largura fixa,
// encostados à direita da linha (mesmo padrão de coluna flexível da lista).
export const GRID_COLS_HISTORICO = '28px minmax(70px, 1fr) 52px 36px 64px';
export const GRID_COLS_HISTORICO_NO_PESO = '28px minmax(70px, 1fr) 36px 64px';

export function getSeriesGridCols(showAnterior: boolean, isDesktop: boolean, showPeso = true): string {
  if (showAnterior) {
    if (isDesktop) return showPeso ? GRID_COLS_SERIES_WITH_ANT_DESKTOP : GRID_COLS_SERIES_WITH_ANT_DESKTOP_NO_PESO;
    return showPeso ? GRID_COLS_SERIES_WITH_ANT_MOBILE : GRID_COLS_SERIES_WITH_ANT_MOBILE_NO_PESO;
  }
  if (isDesktop) return showPeso ? GRID_COLS_SERIES_NO_ANT_DESKTOP : GRID_COLS_SERIES_NO_ANT_DESKTOP_NO_PESO;
  return showPeso ? GRID_COLS_SERIES_NO_ANT_MOBILE : GRID_COLS_SERIES_NO_ANT_MOBILE_NO_PESO;
}
