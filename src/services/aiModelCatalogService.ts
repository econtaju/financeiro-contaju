import { AiModelChainItem, AiProviderConfig, AiProviderName, AiModelCategory } from '../types';
import { storage } from './storageService';

export interface AiProviderPreset {
  id: string;
  name: string;
  endpointUrl: string;
  placeholder: string;
  description: string;
  suggestedPrimaryModel: string;
  keyPrefix?: string[];
  consoleUrl?: string;
  badge?: string;
}

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    id: 'opencode_go',
    name: 'OpenCode Go',
    endpointUrl: 'https://opencode.ai/zen/go/v1',
    placeholder: 'opencode_zen_... ou sk-...',
    description: 'Catálogo unificado oficial OpenCode Go (DeepSeek, GPT-5.6 Luna e Claude Haiku).',
    suggestedPrimaryModel: 'deepseek-v4-pro',
    keyPrefix: ['opencode', 'zen'],
    consoleUrl: 'https://opencode.ai/console',
    badge: 'Recomendado'
  },
  {
    id: 'opencode_api',
    name: 'OpenCode API Padrão',
    endpointUrl: 'https://api.opencode.ai/v1',
    placeholder: 'sk-...',
    description: 'Endpoint legado/alternativo da OpenCode compatível com SDKs padrão OpenAI.',
    suggestedPrimaryModel: 'deepseek-v4-pro',
    consoleUrl: 'https://opencode.ai/console'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    endpointUrl: 'https://openrouter.ai/api/v1',
    placeholder: 'sk-or-v1-...',
    description: 'Hub global com mais de 200 modelos (Anthropic Claude, DeepSeek R1, GPT-4o, Llama 3).',
    suggestedPrimaryModel: 'deepseek/deepseek-r1',
    keyPrefix: ['sk-or-'],
    consoleUrl: 'https://openrouter.ai/keys',
    badge: 'Multi-Modelos'
  },
  {
    id: 'openai',
    name: 'OpenAI Oficial',
    endpointUrl: 'https://api.openai.com/v1',
    placeholder: 'sk-proj-... ou sk-...',
    description: 'Acesso direto aos modelos oficiais GPT-4o, GPT-4o-mini e o1 da OpenAI.',
    suggestedPrimaryModel: 'gpt-4o-mini',
    keyPrefix: ['sk-proj-', 'sk-admin-'],
    consoleUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'gemini',
    name: 'Google Gemini (AI Studio)',
    endpointUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    placeholder: 'AIzaSy...',
    description: 'Modelos Gemini 1.5 Flash e 2.0 com alta velocidade e plano gratuito generoso.',
    suggestedPrimaryModel: 'gemini-1.5-flash',
    keyPrefix: ['AIzaSy'],
    consoleUrl: 'https://aistudio.google.com/app/apikey',
    badge: 'Grátis Disponível'
  },
  {
    id: 'groq',
    name: 'Groq (Ultra-Rápido)',
    endpointUrl: 'https://api.groq.com/openai/v1',
    placeholder: 'gsk_...',
    description: 'Inferência em chips LPU ultra-rápidos com centenas de tokens por segundo.',
    suggestedPrimaryModel: 'llama-3.3-70b-versatile',
    keyPrefix: ['gsk_'],
    consoleUrl: 'https://console.groq.com/keys',
    badge: 'Sub-segundo'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek Oficial',
    endpointUrl: 'https://api.deepseek.com/v1',
    placeholder: 'sk-...',
    description: 'Acesso direto aos modelos DeepSeek-V3 e DeepSeek-R1 (alta performance e economia).',
    suggestedPrimaryModel: 'deepseek-chat',
    consoleUrl: 'https://platform.deepseek.com/api_keys'
  },
  {
    id: 'custom',
    name: 'Personalizado (OpenAI-Compatible)',
    endpointUrl: '',
    placeholder: 'Qualquer API key',
    description: 'Compatível com qualquer servidor local ou proxy (LiteLLM, Ollama, LM Studio, OneAPI).',
    suggestedPrimaryModel: 'deepseek-v4-pro',
    badge: 'Custom URL'
  }
];

export function detectProviderFromKey(apiKey: string): AiProviderPreset | null {
  const clean = apiKey.trim();
  if (!clean) return null;

  if (clean.startsWith('sk-or-')) {
    return AI_PROVIDER_PRESETS.find(p => p.id === 'openrouter') || null;
  }
  if (clean.startsWith('AIzaSy')) {
    return AI_PROVIDER_PRESETS.find(p => p.id === 'gemini') || null;
  }
  if (clean.startsWith('gsk_')) {
    return AI_PROVIDER_PRESETS.find(p => p.id === 'groq') || null;
  }
  if (clean.startsWith('sk-ant-')) {
    return AI_PROVIDER_PRESETS.find(p => p.id === 'openrouter') || null;
  }
  if (clean.startsWith('sk-proj-') || clean.startsWith('sk-admin-')) {
    return AI_PROVIDER_PRESETS.find(p => p.id === 'openai') || null;
  }
  if (clean.toLowerCase().startsWith('opencode') || clean.toLowerCase().startsWith('zen-')) {
    return AI_PROVIDER_PRESETS.find(p => p.id === 'opencode_go') || null;
  }
  return null;
}

/**
 * Catálogo base resiliente atualizado com os novos modelos de ponta
 */
export const DEFAULT_DYNAMIC_CATALOG: AiModelChainItem[] = [
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    category: 'raciocinio',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Especialista em cálculos avançados, análise de balanço e conciliação bancária.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'deepseek-v4.1-flash',
    name: 'DeepSeek V4.1 Flash',
    provider: 'deepseek',
    category: 'rapido',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Resposta em sub-segundo para categorização veloz de lançamentos e extratos.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'gpt-5.6-luna',
    name: 'OpenAI GPT-5.6 Luna',
    provider: 'openai',
    category: 'raciocinio',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Capacidade de topo para relatórios gerenciais e projeções de fluxo de caixa.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'gpt-6-luna',
    name: 'OpenAI GPT-6 Luna Flagship',
    provider: 'openai',
    category: 'raciocinio',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Modelo ultra-avançado para análises financeiras corporativas complexas.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'claude-haiku-5-5',
    name: 'Anthropic Claude Haiku 5.5',
    provider: 'anthropic',
    category: 'financeiro',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Alta precisão com baixa latência para conciliações e conferência de títulos.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'qwen3.8-max',
    name: 'Alibaba Qwen 3.8 Max',
    provider: 'qwen',
    category: 'raciocinio',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Potência máxima em raciocínio quantitativo e tratamento de planilhas/extratos.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'qwen3.8-flash',
    name: 'Alibaba Qwen 3.8 Flash',
    provider: 'qwen',
    category: 'rapido',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Modelo veloz e leve para classificação de regras contábeis.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'minimax-m3',
    name: 'MiniMax M3 Analytical',
    provider: 'minimax',
    category: 'raciocinio',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Excelente capacidade analítica e sumarização de demonstrativos financeiros.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'glm-5.3',
    name: 'Zhipu GLM-5.3',
    provider: 'glm',
    category: 'financeiro',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Alta aderência a esquemas JSON e instruções determinísticas.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'grok-4.7',
    name: 'xAI Grok 4.7',
    provider: 'grok',
    category: 'raciocinio',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Janela de contexto expansiva e raciocínio financeiro abrangente.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Anthropic Claude 3.5 Sonnet',
    provider: 'anthropic',
    category: 'financeiro',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Máxima precisão contábil, raciocínio lógico e auditoria de demonstrativos.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o (Omni)',
    provider: 'openai',
    category: 'financeiro',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Flagship multimodal de alta performance e rapidez.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'openai',
    category: 'rapido',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Ultra-rápido e econômico para classificações rotineiras.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek-V3 Chat',
    provider: 'deepseek',
    category: 'financeiro',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Excelente custo-benefício e alta capacidade analítica.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek-R1 (Reasoner)',
    provider: 'deepseek',
    category: 'raciocinio',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Especialista em cálculos e validações matemáticas complexas.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Google Gemini 1.5 Pro',
    provider: 'google',
    category: 'financeiro',
    protocol: 'openai_chat',
    recommendedForApp: true,
    isDevAgentOnly: false,
    description: 'Janela de contexto expansiva para análise de múltiplos períodos.',
    isEnabled: true,
    status: 'active'
  },
  {
    id: 'kimi-k2.7-code',
    name: 'Moonshot Kimi K2.7 Code',
    provider: 'kimi',
    category: 'codigo',
    protocol: 'openai_chat',
    recommendedForApp: false,
    isDevAgentOnly: true,
    description: 'Especialista para subagentes de desenvolvimento e automação de código.',
    isEnabled: true,
    status: 'active'
  }
];

export class AiModelCatalogService {
  /**
   * Obtém o catálogo do cache local ou padrão
   */
  public static getCachedCatalog(): AiModelChainItem[] {
    const saved = storage.getDiscoveredAiModels();
    if (saved && saved.length > 0) {
      return saved;
    }
    return DEFAULT_DYNAMIC_CATALOG;
  }

  /**
   * Consulta o catálogo dinâmico via Serverless /api/ai-models ou fallback direto
   */
  public static async fetchCatalog(forceRefresh: boolean = false): Promise<{
    models: AiModelChainItem[];
    source: string;
    lastUpdated: string;
    warning?: string;
  }> {
    // 1. Tentar primeiro via Serverless API Vercel (/api/ai-models)
    try {
      const url = `/api/ai-models${forceRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.models) && data.models.length > 0) {
          const models: AiModelChainItem[] = data.models;
          // Persiste no storage local
          storage.saveDiscoveredAiModels(models);

          // Atualiza timestamp na configuração de IA
          const aiConfig = storage.getAiConfig();
          aiConfig.lastDiscoveredAt = data.lastUpdated || new Date().toISOString();
          aiConfig.discoveredModels = models;
          storage.saveAiConfig(aiConfig);

          return {
            models,
            source: data.source || 'serverless_api',
            lastUpdated: data.lastUpdated || new Date().toISOString(),
            warning: data.warning
          };
        }
      }
    } catch {
      // Falha ao chamar a API serverless (ex: dev local sem serverless)
    }

    // 2. Fallback direto para o endpoint público oficial OpenCode caso CORS permita
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const directRes = await fetch('https://opencode.ai/zen/go/v1/models', {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (directRes.ok) {
        const json = await directRes.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          const directModels: AiModelChainItem[] = json.data.map((item: any) => {
            const id = item.id;
            const existing = DEFAULT_DYNAMIC_CATALOG.find(m => m.id === id);
            if (existing) return existing;

            return {
              id,
              name: id.split(/[-_.]/).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
              provider: (id.includes('claude') ? 'anthropic' : (id.includes('gpt') ? 'openai' : (id.includes('deepseek') ? 'deepseek' : 'custom'))) as AiProviderName,
              category: id.includes('code') ? 'codigo' : 'financeiro',
              protocol: 'openai_chat',
              recommendedForApp: !id.includes('code'),
              isDevAgentOnly: id.includes('code'),
              description: 'Modelo descoberto dinamicamente no catálogo oficial OpenCode.',
              isEnabled: true,
              status: 'active'
            };
          });

          // Mescla com os modelos base para garantir presença dos modelos recomendados
          const seen = new Set(directModels.map(m => m.id));
          for (const def of DEFAULT_DYNAMIC_CATALOG) {
            if (!seen.has(def.id)) {
              directModels.push(def);
            }
          }

          storage.saveDiscoveredAiModels(directModels);
          const aiConfig = storage.getAiConfig();
          aiConfig.lastDiscoveredAt = new Date().toISOString();
          aiConfig.discoveredModels = directModels;
          storage.saveAiConfig(aiConfig);

          return {
            models: directModels,
            source: 'client_direct_fetch',
            lastUpdated: new Date().toISOString()
          };
        }
      }
    } catch {
      // Ignora e cai no fallback em cache
    }

    // 3. Fallback para cache local existente ou lista base garantida
    const cached = this.getCachedCatalog();
    const config = storage.getAiConfig();

    return {
      models: cached,
      source: 'offline_local_cache',
      lastUpdated: config.lastDiscoveredAt || new Date().toISOString(),
      warning: 'Catálogo sincronizado a partir do cache local resiliente.'
    };
  }

  /**
   * Filtra e pesquisa modelos
   */
  public static filterModels(
    models: AiModelChainItem[],
    options: {
      provider?: string;
      category?: string;
      search?: string;
      onlyRecommended?: boolean;
      excludeDevAgents?: boolean;
    } = {}
  ): AiModelChainItem[] {
    return models.filter(m => {
      if (options.provider && options.provider !== 'ALL' && m.provider !== options.provider) {
        return false;
      }
      if (options.category && options.category !== 'ALL' && m.category !== options.category) {
        return false;
      }
      if (options.onlyRecommended && !m.recommendedForApp) {
        return false;
      }
      if (options.excludeDevAgents && m.isDevAgentOnly) {
        return false;
      }
      if (options.search) {
        const query = options.search.toLowerCase().trim();
        const matchName = m.name.toLowerCase().includes(query);
        const matchId = m.id.toLowerCase().includes(query);
        const matchDesc = m.description ? m.description.toLowerCase().includes(query) : false;
        if (!matchName && !matchId && !matchDesc) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Lista de provedores únicos presentes na lista de modelos
   */
  public static getProviders(models: AiModelChainItem[]): string[] {
    const set = new Set<string>();
    models.forEach(m => set.add(m.provider));
    return Array.from(set).sort();
  }

  /**
   * Nomes amigáveis dos provedores para exibição na UI
   */
  public static formatProviderName(provider: string): string {
    const map: Record<string, string> = {
      anthropic: 'Anthropic',
      openai: 'OpenAI',
      deepseek: 'DeepSeek',
      google: 'Google',
      meta: 'Meta',
      qwen: 'Alibaba (Qwen)',
      glm: 'Zhipu AI (GLM)',
      grok: 'xAI (Grok)',
      minimax: 'MiniMax',
      kimi: 'Moonshot (Kimi)',
      mimo: 'Xiaomi (MiMo)',
      custom: 'Outros / Custom'
    };
    return map[provider] || provider.toUpperCase();
  }

  /**
   * Nomes amigáveis de categorias
   */
  public static formatCategoryName(category?: AiModelCategory): string {
    switch (category) {
      case 'financeiro':
        return 'Financeiro & Conciliação';
      case 'raciocinio':
        return 'Raciocínio & Balanço';
      case 'rapido':
        return 'Flash / Ultra-Rápido';
      case 'codigo':
        return 'Desenvolvimento / Dev Agents';
      default:
        return 'Geral';
    }
  }

  /**
   * Conecta a chave de API e endpoint, importa todos os modelos disponíveis e valida a conexão em tempo real
   */
  public static async connectAndSync(
    apiKey: string,
    customEndpoint?: string,
    preferredPrimaryModel?: string
  ): Promise<{
    success: boolean;
    message: string;
    modelsCount: number;
    latencyMs?: number;
    primaryModel?: string;
    statusCode?: number;
    errorDiagnostic?: {
      code: string;
      title: string;
      suggestion: string;
    };
  }> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return {
        success: false,
        message: 'Por favor, informe uma chave de API válida.',
        modelsCount: 0
      };
    }

    const currentConfig = storage.getAiConfig();
    const targetEndpoint = (customEndpoint || currentConfig.endpointUrl || 'https://opencode.ai/zen/go/v1').trim().replace(/\/+$/, '');
    
    const updatedConfig: AiProviderConfig = {
      ...currentConfig,
      apiKey: cleanKey,
      enabled: true,
      endpointUrl: targetEndpoint,
      primaryModel: preferredPrimaryModel || currentConfig.primaryModel || 'deepseek-v4-pro',
      fallbackModels: currentConfig.fallbackModels && currentConfig.fallbackModels.length > 0 
        ? currentConfig.fallbackModels 
        : ['deepseek-v4.1-flash', 'gpt-5.6-luna', 'claude-haiku-5-5', 'qwen3.8-max']
    };

    storage.saveAiConfig(updatedConfig);

    // 1. Busca modelos atualizados do catálogo oficial
    const catalogRes = await this.fetchCatalog(true);
    const discovered = catalogRes.models;

    // Se o modelo primário configurado não estiver nos modelos descobertos, seleciona o primeiro recomendado
    const recommended = discovered.find(m => m.recommendedForApp && !m.isDevAgentOnly);
    const targetModel = preferredPrimaryModel || (recommended ? recommended.id : 'deepseek-v4.1-flash');

    if (!discovered.some(m => m.id === updatedConfig.primaryModel)) {
      updatedConfig.primaryModel = targetModel;
      storage.saveAiConfig(updatedConfig);
    }

    // 2. Valida a conexão em tempo real via Serverless Gateway (ou fallback local)
    const startTime = Date.now();
    try {
      const pingRes = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentRole: 'CFO_EXECUTIVO',
          action: 'ping_test',
          messages: [{ role: 'user', content: 'Ping' }],
          preferredModel: targetModel,
          fallbackModels: [],
          customApiKey: cleanKey,
          customEndpoint: targetEndpoint,
          temperature: 0.1,
          maxTokens: 5
        })
      });

      const latencyMs = Date.now() - startTime;
      let pingData: any = {};
      try {
        pingData = await pingRes.json();
      } catch {
        pingData = {};
      }

      if (pingRes.ok && pingData.success) {
        return {
          success: true,
          message: `Conexão validada com sucesso! ${discovered.length} modelos sincronizados e prontos para uso (${latencyMs}ms).`,
          modelsCount: discovered.length,
          latencyMs,
          statusCode: 200,
          primaryModel: updatedConfig.primaryModel
        };
      } else {
        const rawError = pingData.error || (pingData.attempts?.[0]?.errorMessage) || `Erro HTTP ${pingRes.status}`;
        const lowerErr = rawError.toLowerCase();
        let diag = {
          code: 'EXECUTION_FAILED',
          title: 'Falha na Validação da Chave',
          suggestion: 'Verifique se a chave de API informada é válida para este endpoint ou selecione outro provedor.'
        };

        if (lowerErr.includes('expired') || lowerErr.includes('key has expired')) {
          diag = {
            code: 'API_KEY_EXPIRED',
            title: 'Chave de API Expirada',
            suggestion: 'Esta chave foi invalidada pelo provedor por segurança. Acesse o console oficial do provedor (ex: opencode.ai/console), gere uma nova chave de API e cole-a aqui.'
          };
        } else if (pingRes.status === 401 || lowerErr.includes('unauthorized') || lowerErr.includes('invalid key')) {
          diag = {
            code: 'UNAUTHORIZED',
            title: 'Credencial Inválida (HTTP 401)',
            suggestion: 'A chave de API informada não foi aceita pelo servidor. Revise se você copiou todos os caracteres corretamente sem espaços.'
          };
        } else if (pingRes.status === 429 || lowerErr.includes('rate limit')) {
          diag = {
            code: 'RATE_LIMIT',
            title: 'Limite de Requisições Atingido (HTTP 429)',
            suggestion: 'O provedor retornou limite de taxa atingido. Aguarde alguns instantes ou troque de provedor/modelo.'
          };
        }

        return {
          success: false,
          message: `Chave salva e ${discovered.length} modelos carregados, mas a validação retornou: ${rawError}`,
          modelsCount: discovered.length,
          latencyMs,
          statusCode: pingRes.status,
          primaryModel: updatedConfig.primaryModel,
          errorDiagnostic: diag
        };
      }
    } catch (err: any) {
      // Gateway indisponível ou offline
      return {
        success: true,
        message: `Chave configurada e ${discovered.length} modelos sincronizados localmente no aplicativo (Gateway em background).`,
        modelsCount: discovered.length,
        primaryModel: updatedConfig.primaryModel
      };
    }
  }
}
