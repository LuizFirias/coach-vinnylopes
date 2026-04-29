// lib/utils/pluralize.ts
// Utilitário para pluralizar contagens

/**
 * Pluraliza substantivo baseado em contagem
 * @example pluralize(1, 'atleta') → '1 atleta'
 * @example pluralize(5, 'atleta') → '5 atletas'
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const plural_form = plural || `${singular}s`;
  return count === 1 ? singular : plural_form;
}

/**
 * Formata contagem com pluralização
 * @example formatCount(1, 'atleta ativo') → '1 atleta ativo'
 * @example formatCount(5, 'atleta ativo') → '5 atletas ativos'
 */
export function formatCount(
  count: number,
  singularTemplate: string,
  pluralTemplate?: string
): string {
  const template = count === 1 ? singularTemplate : (pluralTemplate || `${singularTemplate}s`);
  return `${count} ${template}`;
}

// Variações comuns de pluralização em PT-BR
const pluralRules: Record<string, { singular: string; plural: string }> = {
  'atleta': { singular: 'atleta', plural: 'atletas' },
  'treino': { singular: 'treino', plural: 'treinos' },
  'série': { singular: 'série', plural: 'séries' },
  'exercício': { singular: 'exercício', plural: 'exercícios' },
  'medida': { singular: 'medida', plural: 'medidas' },
  'foto': { singular: 'foto', plural: 'fotos' },
  'recorde': { singular: 'recorde', plural: 'recordes' },
};

/**
 * Pluraliza usando regras pré-definidas
 * @example smartPluralize(1, 'atleta') → 'atleta'
 * @example smartPluralize(5, 'atleta') → 'atletas'
 */
export function smartPluralize(count: number, word: string): string {
  const rule = pluralRules[word.toLowerCase()];
  if (rule) {
    return count === 1 ? rule.singular : rule.plural;
  }
  // Fallback simples
  return count === 1 ? word : `${word}s`;
}
