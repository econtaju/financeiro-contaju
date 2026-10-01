/**
 * Utilitário de busca textual flexível, tolerante a acentos, pontuações,
 * caixa alta/baixa, espaços extras e pequenas variações ortográficas (fuzzy).
 */

/**
 * Remove acentuação e diacríticos (ex: "Água", "açúcar", "São Paulo" -> "agua", "acucar", "sao paulo")
 */
export function removeDiacritics(str: string): string {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza um texto para fins de busca:
 * 1. Converte para minúsculas
 * 2. Remove acentos e diacríticos
 * 3. Substitui pontuações, hífens, traços e símbolos por espaços
 * 4. Colapsa espaços múltiplos em um único espaço
 */
export function normalizeForSearch(text: unknown): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return removeDiacritics(str)
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]"'?+@|\\<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distância de Levenshtein simples para medir similaridade entre dois termos pequenos
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Verifica se um termo de busca bate com alguma palavra de um alvo,
 * permitindo prefixos, substrings e similaridade fonética/digitação básica.
 */
function tokenMatchesWords(queryToken: string, targetWords: string[], targetClean: string): boolean {
  if (!queryToken) return true;

  // 1. O token está contido diretamente na string limpa? (substring match)
  if (targetClean.includes(queryToken)) {
    return true;
  }

  // 2. O token é prefixo ou está contido em alguma palavra individual?
  for (const word of targetWords) {
    if (word.startsWith(queryToken) || word.includes(queryToken)) {
      return true;
    }

    // 3. Tolerância a pequenos erros de digitação para palavras com 4+ caracteres
    if (queryToken.length >= 4 && word.length >= 4) {
      const maxDistance = queryToken.length >= 7 ? 2 : 1;
      const distance = levenshteinDistance(queryToken, word);
      if (distance <= maxDistance) {
        return true;
      }
      // Se a palavra for mais longa que o token, verificar similaridade com o prefixo
      if (word.length > queryToken.length) {
        const wordPrefix = word.slice(0, queryToken.length);
        if (levenshteinDistance(queryToken, wordPrefix) <= 1) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Realiza correspondência de busca inteligente entre campos e um texto de pesquisa.
 * - Aceita múltiplos campos (ex: nome, documento, categoria, código)
 * - Divide a pesquisa em termos (tokens)
 * - Todos os termos digitados precisam encontrar correspondência no conjunto de campos
 * - Totalmente tolerante a acentos e pontuação
 */
export function matchesSearch(
  fields: unknown | unknown[],
  searchQuery: string
): boolean {
  if (!searchQuery || !searchQuery.trim()) return true;

  const normalizedQuery = normalizeForSearch(searchQuery);
  if (!normalizedQuery) return true;

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return true;

  // Monta uma lista consolidada de textos alvo
  const fieldList = Array.isArray(fields) ? fields : [fields];
  const combinedRaw = fieldList.map(f => (f !== null && f !== undefined ? String(f) : '')).join(' ');
  const normalizedTarget = normalizeForSearch(combinedRaw);

  if (!normalizedTarget) return false;

  // Correspondência exata rápida da query inteira
  if (normalizedTarget.includes(normalizedQuery)) {
    return true;
  }

  const targetWords = normalizedTarget.split(' ').filter(Boolean);

  // Todos os tokens da busca precisam ser encontrados no alvo
  for (const token of queryTokens) {
    if (!tokenMatchesWords(token, targetWords, normalizedTarget)) {
      return false;
    }
  }

  return true;
}

/**
 * Destaca trechos encontrados em um texto para visualização agradável (opcional)
 */
export function highlightMatch(text: string, query: string): { before: string; match: string; after: string } | null {
  if (!text || !query) return null;
  const normText = normalizeForSearch(text);
  const normQuery = normalizeForSearch(query);

  const idx = normText.indexOf(normQuery);
  if (idx === -1) return null;

  return {
    before: text.slice(0, idx),
    match: text.slice(idx, idx + query.length),
    after: text.slice(idx + query.length)
  };
}
