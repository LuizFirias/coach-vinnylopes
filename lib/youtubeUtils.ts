/**
 * Extrai o ID de vídeo do YouTube de diferentes formatos de URL
 * Suporta: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
 */
export function extractYouTubeVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;

  // Se já é um ID (apenas letras, números, hífens e underscores, 11 caracteres)
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId;
  }

  // URL do YouTube Shorts
  const matchShorts = urlOrId.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  );
  if (matchShorts) return matchShorts[1];

  // URL do YouTube com watch?v=ID
  const match1 = urlOrId.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/
  );
  if (match1) return match1[1];

  // URL curta youtu.be/ID
  const match2 = urlOrId.match(
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/
  );
  if (match2) return match2[1];

  // URL de embed
  const match3 = urlOrId.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  );
  if (match3) return match3[1];

  // URL com ?t= ou &t= (timestamp)
  const match4 = urlOrId.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/
  );
  if (match4) return match4[1];

  return null;
}

/**
 * Valida se uma string é uma URL de YouTube ou um ID válido
 */
export function isValidYouTubeUrl(urlOrId: string): boolean {
  return extractYouTubeVideoId(urlOrId) !== null;
}

/**
 * Normalizador: converte qualquer URL do YouTube para ID padrão
 */
export function normalizeYouTubeUrl(urlOrId: string): string | null {
  return extractYouTubeVideoId(urlOrId);
}

/**
 * Verifica se a URL é de um YouTube Short
 * Por padrão, considera como Short a menos que seja explicitamente um vídeo normal (watch?v=)
 */
export function isYouTubeShort(urlOrId: string): boolean {
  if (!urlOrId) return false;
  
  // Se for uma URL explícita de /shorts/, é Short
  if (/(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/.test(urlOrId)) {
    return true;
  }
  
  // Se for uma URL explícita de /watch?v=, NÃO é Short
  if (/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/.test(urlOrId)) {
    return false;
  }
  
  // Se for apenas um ID ou qualquer outra coisa, assume Short por padrão
  // (já que o coach está usando principalmente Shorts)
  return true;
}
