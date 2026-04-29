/**
 * Utilitários para manipulação de datas no fuso horário do Brasil
 * Timezone: America/Sao_Paulo (GMT-3)
 */

/**
 * Retorna a data atual no formato YYYY-MM-DD considerando o fuso horário do Brasil
 * @returns string no formato YYYY-MM-DD
 */
export function getTodayBrazil(): string {
  const now = new Date();
  // Converter para horário de São Paulo (GMT-3)
  const brazilDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  
  const year = brazilDate.getFullYear();
  const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
  const day = String(brazilDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Retorna um objeto Date ajustado para o início do dia no fuso horário do Brasil
 * @returns Date object
 */
export function getTodayBrazilDate(): Date {
  const now = new Date();
  const brazilDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  brazilDate.setHours(0, 0, 0, 0);
  return brazilDate;
}

/**
 * Converte uma string de data para o formato YYYY-MM-DD no fuso horário do Brasil
 * @param date - Date object ou string de data
 * @returns string no formato YYYY-MM-DD
 */
export function toBrazilDateString(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const brazilDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  
  const year = brazilDate.getFullYear();
  const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
  const day = String(brazilDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Formata uma data para exibição no padrão brasileiro
 * @param dateString - string de data no formato ISO ou Date object
 * @param options - opções de formatação do Intl.DateTimeFormat
 * @returns string formatada
 */
export function formatBrazilDate(
  dateString: string | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return '—';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
    ...options
  };
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('pt-BR', defaultOptions);
}

/**
 * Retorna o timestamp atual no fuso horário do Brasil
 * @returns number - timestamp em milissegundos
 */
export function getBrazilTimestamp(): number {
  const now = new Date();
  const brazilDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return brazilDate.getTime();
}

/**
 * Calcula a diferença em dias entre duas datas no fuso horário do Brasil
 * @param date1 - primeira data
 * @param date2 - segunda data (padrão: hoje)
 * @returns number - diferença em dias
 */
export function getDaysDifference(date1: Date | string, date2?: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = date2 
    ? (typeof date2 === 'string' ? new Date(date2) : date2)
    : getTodayBrazilDate();
  
  const brazil1 = new Date(d1.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const brazil2 = new Date(d2.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  
  brazil1.setHours(0, 0, 0, 0);
  brazil2.setHours(0, 0, 0, 0);
  
  const diff = brazil2.getTime() - brazil1.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
