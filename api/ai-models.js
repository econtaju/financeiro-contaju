// ==============================================================================
// VERCEL SERVERLESS FUNCTION: CATÁLOGO DINÂMICO DE MODELOS DE IA
// Rota: /api/ai-models
// Objetivo: Descoberta resiliente com enriquecimento de metadados, detecção
// de protocolo, categorização para finanças vs dev e cache com fallback.
// ==============================================================================

// Cache server-side em memória durante o ciclo de vida do worker
let cachedCatalog = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de cache no servidor

/**
 * Normaliza o nome legível e metadados de qualquer modelo descoberto
 */
function enrichModelMetadata(rawModel) {
  const id = typeof rawModel === 'string' ? rawModel : rawModel.id;
  if (!id) return null;

  const lower = id.toLowerCase();

  let provider = 'custom';
  let displayName = id;
  let category = 'geral';
  let recommendedForApp = true;
  let isDevAgentOnly = false;
  let protocol = 'openai_chat'; // Padrão mais comum
  let description = 'Modelo compatível para processamento analítico.';

  // 1. Identificação do Provedor
  if (lower.includes('claude')) {
    provider = 'anthropic';
    protocol = lower.includes('anthropic.direct') ? 'anthropic_messages' : 'openai_chat';
  } else if (lower.includes('gpt') || lower.includes('o1') || lower.includes('o3') || lower.includes('luna')) {
    provider = 'openai';
  } else if (lower.includes('deepseek')) {
    provider = 'deepseek';
  } else if (lower.includes('gemini')) {
    provider = 'google';
  } else if (lower.includes('qwen')) {
    provider = 'qwen';
  } else if (lower.includes('glm') || lower.includes('chatglm') || lower.includes('zhipu')) {
    provider = 'glm';
  } else if (lower.includes('grok')) {
    provider = 'grok';
  } else if (lower.includes('kimi') || lower.includes('moonshot')) {
    provider = 'kimi';
  } else if (lower.includes('minimax')) {
    provider = 'minimax';
  } else if (lower.includes('mimo')) {
    provider = 'mimo';
  } else if (lower.includes('llama')) {
    provider = 'meta';
  }

  // 2. Classificação de Protocolo (Responses vs Messages vs Chat Completions)
  if (lower.includes('responses') || lower.includes('realtime')) {
    protocol = 'openai_responses';
  } else if (lower.startsWith('claude-direct-') || lower.includes('anthropic-native')) {
    protocol = 'anthropic_messages';
  } else {
    protocol = 'openai_chat';
  }

  // 3. Detecção de Modelos Exclusivos de Dev/Código vs Aplicação Financeira
  if (lower.includes('code') || lower.includes('coder') || lower.includes('contributor') || lower.includes('dev')) {
    category = 'codigo';
    isDevAgentOnly = true;
    recommendedForApp = false;
    description = 'Otimizado para geração, auditoria e revisão de código-fonte (OpenCode Subagents).';
  } else if (lower.includes('reasoner') || lower.includes('pro') || lower.includes('max') || lower.includes('luna') || lower.includes('r1')) {
    category = 'raciocinio';
    recommendedForApp = true;
    description = 'Alta capacidade analítica e raciocínio lógico profundo para conciliação contábil e projeções.';
  } else if (lower.includes('flash') || lower.includes('mini') || lower.includes('haiku') || lower.includes('spark')) {
    category = 'rapido';
    recommendedForApp = true;
    description = 'Execução ultra-rápida e econômica para classificações rotineiras de despesas.';
  } else {
    category = 'financeiro';
    recommendedForApp = true;
    description = 'Equilíbrio ideal entre precisão financeira, latência e aderência estruturada.';
  }

  // 4. Mapeamento de Nomes Legíveis
  if (lower === 'deepseek-v4-pro') {
    displayName = 'DeepSeek V4 Pro';
    description = 'Especialista em cálculos avançados, análise de balanço e conciliação bancária.';
  } else if (lower === 'deepseek-v4.1-flash') {
    displayName = 'DeepSeek V4.1 Flash';
    description = 'Resposta em sub-segundo para categorização veloz de lançamentos e extratos.';
  } else if (lower === 'gpt-5.6-luna') {
    displayName = 'OpenAI GPT-5.6 Luna';
    description = 'Capacidade de topo para relatórios gerenciais e projeções de fluxo de caixa.';
  } else if (lower === 'gpt-6-luna') {
    displayName = 'OpenAI GPT-6 Luna Flagship';
    description = 'Modelo ultra-avançado para análises financeiras corporativas complexas.';
  } else if (lower === 'claude-haiku-5-5') {
    displayName = 'Anthropic Claude Haiku 5.5';
    description = 'Alta precisão com baixa latência para conciliações e conferência de títulos.';
  } else if (lower === 'qwen3.8-max') {
    displayName = 'Alibaba Qwen 3.8 Max';
    description = 'Potência máxima em raciocínio quantitativo e tratamento de planilhas/extratos.';
  } else if (lower === 'qwen3.8-flash') {
    displayName = 'Alibaba Qwen 3.8 Flash';
    description = 'Modelo veloz e leve para classificação de regras contábeis.';
  } else if (lower === 'minimax-m3') {
    displayName = 'MiniMax M3 Analytical';
    description = 'Excelente capacidade analítica e sumarização de demonstrativos financeiros.';
  } else if (lower === 'glm-5.3') {
    displayName = 'Zhipu GLM-5.3';
    description = 'Alta aderência a esquemas JSON e instruções determinísticas.';
  } else if (lower === 'grok-4.7') {
    displayName = 'xAI Grok 4.7';
    description = 'Janela de contexto expansiva e raciocínio financeiro abrangente.';
  } else if (lower === 'claude-3-5-sonnet') {
    displayName = 'Anthropic Claude 3.5 Sonnet';
    description = 'Máxima precisão contábil, raciocínio lógico e auditoria de demonstrativos.';
  } else if (lower === 'gpt-4o') {
    displayName = 'OpenAI GPT-4o (Omni)';
    description = 'Flagship multimodal de alta performance e rapidez.';
  } else if (lower === 'gpt-4o-mini') {
    displayName = 'OpenAI GPT-4o Mini';
    description = 'Ultra-rápido e econômico para classificações rotineiras.';
  } else if (lower === 'deepseek-chat') {
    displayName = 'DeepSeek-V3 Chat';
    description = 'Excelente custo-benefício e alta capacidade analítica.';
  } else if (lower === 'deepseek-reasoner') {
    displayName = 'DeepSeek-R1 (Reasoner)';
    description = 'Especialista em cálculos e validações matemáticas complexas.';
  } else if (lower === 'gemini-1.5-pro') {
    displayName = 'Google Gemini 1.5 Pro';
    description = 'Janela de contexto expansiva para análise de múltiplos períodos.';
  } else {
    // Formatação genérica caso seja um modelo novo ainda não mapeado
    const formatted = id
      .split(/[-_.]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    displayName = `${provider.toUpperCase()} ${formatted}`;
  }

  return {
    id,
    name: displayName,
    provider,
    category,
    protocol,
    recommendedForApp,
    isDevAgentOnly,
    description,
    status: 'active',
    isEnabled: true
  };
}

// Catálogo de contingência robusto (fallback garantido caso a rede externa esteja inativa)
const FALLBACK_CATALOG = [
  'deepseek-v4-pro',
  'deepseek-v4.1-flash',
  'gpt-5.6-luna',
  'claude-haiku-5-5',
  'qwen3.8-max',
  'qwen3.8-flash',
  'minimax-m3',
  'glm-5.3',
  'grok-4.7',
  'claude-3-5-sonnet',
  'gpt-4o',
  'gpt-4o-mini',
  'deepseek-chat',
  'deepseek-reasoner',
  'gemini-1.5-pro',
  'kimi-k2.7-code'
].map(id => enrichModelMetadata(id)).filter(Boolean);

export default async function handler(req, res) {
  // CORS Seguro
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  // Cache HTTP controlado para Vercel Edge / CDN
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Utilize GET.' });
  }

  const forceRefresh = req.query.refresh === 'true' || req.query.force === 'true';
  const now = Date.now();

  // Se houver cache válido e não foi solicitado forceRefresh, retorna imediatamente
  if (!forceRefresh && cachedCatalog && (now - lastFetchTimestamp < CACHE_TTL_MS)) {
    return res.status(200).json({
      success: true,
      source: 'cache_server',
      lastUpdated: new Date(lastFetchTimestamp).toISOString(),
      modelsCount: cachedCatalog.length,
      models: cachedCatalog
    });
  }

  const endpointUrl = process.env.OPENCODE_MODELS_URL || 'https://opencode.ai/zen/go/v1/models';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout

    const fetchRes = await fetch(endpointUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!fetchRes.ok) {
      throw new Error(`Falha HTTP ${fetchRes.status} ao consultar ${endpointUrl}`);
    }

    const json = await fetchRes.json();

    if (!json || (!Array.isArray(json.data) && !Array.isArray(json.models) && !Array.isArray(json))) {
      throw new Error('Formato de resposta inesperado do catálogo oficial.');
    }

    const rawList = Array.isArray(json.data) ? json.data : (Array.isArray(json.models) ? json.models : json);

    // Mapeamento, enriquecimento e deduplicação
    const seenIds = new Set();
    const discovered = [];

    for (const item of rawList) {
      const enriched = enrichModelMetadata(item);
      if (enriched && !seenIds.has(enriched.id)) {
        seenIds.add(enriched.id);
        discovered.push(enriched);
      }
    }

    // Inclui modelos base conhecidos que o sistema suporta se não tiverem sido retornados
    for (const fallbackItem of FALLBACK_CATALOG) {
      if (!seenIds.has(fallbackItem.id)) {
        seenIds.add(fallbackItem.id);
        discovered.push(fallbackItem);
      }
    }

    cachedCatalog = discovered;
    lastFetchTimestamp = now;

    return res.status(200).json({
      success: true,
      source: 'live_fetch',
      lastUpdated: new Date(lastFetchTimestamp).toISOString(),
      modelsCount: discovered.length,
      models: discovered
    });
  } catch (err) {
    console.warn('[AI Catalog] Erro na consulta do catálogo oficial:', err.message);

    // Se temos um catálogo em cache anterior, preservamos mesmo expirado
    const returnModels = cachedCatalog && cachedCatalog.length > 0 ? cachedCatalog : FALLBACK_CATALOG;
    const timestamp = lastFetchTimestamp ? new Date(lastFetchTimestamp).toISOString() : new Date().toISOString();

    return res.status(200).json({
      success: true,
      source: cachedCatalog ? 'stale_cache_fallback' : 'static_resilient_fallback',
      warning: `Consulta ao endpoint externo falhou (${err.message}). Utilizando catálogo resiliente.`,
      lastUpdated: timestamp,
      modelsCount: returnModels.length,
      models: returnModels
    });
  }
}
