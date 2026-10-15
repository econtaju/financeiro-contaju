// ==============================================================================
// VERCEL SERVERLESS FUNCTION: GATEWAY DA CENTRAL DE AGENTES CONTAJU
// Rota: /api/agents
// Segurança: Secrets server-side, redator de PII, anti-injection e failover dinâmico
// Adaptadores: OpenAI Chat Completions, Anthropic Messages e OpenAI Responses
// ==============================================================================

// Redator de PII (Personally Identifiable Information) para proteção de dados fiscais/pessoais
function redactPII(text) {
  if (typeof text !== 'string') return text;
  // Mascara CPF (ex: 123.456.789-00 -> 123.***.***-00)
  let clean = text.replace(/(\d{3})\.\d{3}\.\d{3}-(\d{2})/g, '$1.***.***-$2');
  // Mascara números de cartão de crédito
  clean = clean.replace(/\b(?:\d[ -]*?){13,16}\b/g, '****-****-****-****');
  // Mascara telefones/celulares
  clean = clean.replace(/(\(?\d{2}\)?\s?)(\d{4,5})[-.\s]?(\d{4})/g, '$1****-$3');
  return clean;
}

/**
 * Detecta o protocolo exigido pelo modelo
 */
function resolveModelProtocol(modelId, customProtocol) {
  if (customProtocol) return customProtocol;
  const lower = (modelId || '').toLowerCase();
  if (lower.includes('responses') || lower.includes('realtime')) {
    return 'openai_responses';
  }
  if (lower.startsWith('claude-direct') || lower.includes('anthropic-native')) {
    return 'anthropic_messages';
  }
  return 'openai_chat'; // Padrão suportado pela OpenCode e OpenAI
}

/**
 * Adaptadores de protocolo para despacho HTTP resiliente
 */
const ProtocolAdapters = {
  // 1. OpenAI Chat Completions (padrão OpenCode / OpenAI / DeepSeek / Qwen / GLM / Minimax)
  openai_chat: {
    buildRequest: (endpoint, model, messages, options, apiKey) => {
      const url = `${endpoint}/chat/completions`;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      const body = {
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2000
      };
      if (options.jsonMode) {
        body.response_format = { type: 'json_object' };
      }
      return { url, headers, body: JSON.stringify(body) };
    },
    parseResponse: async (response) => {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }
  },

  // 2. Anthropic Messages (/v1/messages)
  anthropic_messages: {
    buildRequest: (endpoint, model, messages, options, apiKey) => {
      const url = `${endpoint}/v1/messages`;
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };

      // Separa prompt do sistema do histórico do usuário
      const systemMsg = messages.find(m => m.role === 'system');
      const nonSystemMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));

      const body = {
        model,
        messages: nonSystemMessages.length > 0 ? nonSystemMessages : [{ role: 'user', content: 'Executar consulta.' }],
        max_tokens: options.maxTokens ?? 2000,
        temperature: options.temperature ?? 0.2
      };

      if (systemMsg) {
        body.system = systemMsg.content;
      }

      return { url, headers, body: JSON.stringify(body) };
    },
    parseResponse: async (response) => {
      const data = await response.json();
      if (Array.isArray(data.content)) {
        return data.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');
      }
      return data.content || '';
    }
  },

  // 3. OpenAI Responses API (/v1/responses)
  openai_responses: {
    buildRequest: (endpoint, model, messages, options, apiKey) => {
      const url = `${endpoint}/responses`;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      const body = {
        model,
        input: messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n'),
        temperature: options.temperature ?? 0.2,
        max_output_tokens: options.maxTokens ?? 2000
      };
      return { url, headers, body: JSON.stringify(body) };
    },
    parseResponse: async (response) => {
      const data = await response.json();
      if (data.output && Array.isArray(data.output)) {
        return data.output.map(o => o.content?.[0]?.text || '').join('\n');
      }
      return data.output_text || data.text || '';
    }
  }
};

export default async function handler(req, res) {
  // Configuração de cabeçalhos CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  const {
    agentRole = 'CFO_EXECUTIVO',
    action = 'direct_chat',
    messages = [],
    payload = {},
    customApiKey,
    preferredModel,
    fallbackModels = [],
    temperature = 0.2,
    maxTokens = 2000,
    jsonMode = false,
    companyId = 'comp-1'
  } = req.body || {};

  // Chave do provedor server-side
  const serverApiKey = process.env.OPENCODE_API_KEY || 
                       process.env.AI_GATEWAY_KEY || 
                       process.env.GEMINI_API_KEY || 
                       customApiKey;

  const endpoint = (process.env.AI_ENDPOINT_URL || 'https://api.opencode.ai/v1').replace(/\/+$/, '');

  if (!serverApiKey) {
    return res.status(503).json({
      success: false,
      error: 'Provedor de IA não configurado nas variáveis de ambiente do servidor (OPENCODE_API_KEY ou AI_GATEWAY_KEY).',
      code: 'AI_PROVIDER_NOT_CONFIGURED'
    });
  }

  // Definição dos prompts de sistema e guardrails dos Especialistas Financeiros
  const ROLE_SYSTEM_PROMPTS = {
    CFO_EXECUTIVO: `Você é o CFO Executivo Virtual do sistema de gestão financeira Contaju.
Sua missão é projetar liquidez de caixa, apontar descasamentos entre Contas a Pagar e Receber e sugerir medidas preventivas com precisão matemática.
REGRAS INEGOCIÁVEIS:
1. Seja determinístico, direto e use formatação limpa em Markdown.
2. Destaque valores monetários formatados em R$.
3. Nunca invente dados não fornecidos no contexto.
4. Jamais gere comandos destrutivos ou SQL.`,

    AUDITOR_CONCILIACAO: `Você é o Auditor Contábil Especialista em Conciliação Bancária do Contaju.
Sua missão é correlacionar extratos bancários com os títulos cadastrados no ERP, calculando nível de confiança e aderência às normas contábeis de partidas dobradas.
REGRAS INEGOCIÁVEIS:
1. Sempre responda no schema JSON estruturado solicitado.
2. Não realize mutações financeiras diretas; apresente sempre sua recomendação como PROPOSTA para aprovação humana.`,

    ANALISTA_INADIMPLENCIA: `Você é o Analista de Cobrança e Inadimplência do Financeiro Contaju.
Sua missão é classificar risco de atrasos, sugerir contatos preventivos e redigir notificações de cobrança profissionais e empáticas.`,

    GUARDIAO_CONTABIL: `Você é o Guardião Contábil e Compliance do sistema Contaju.
Sua função é verificar consistência entre Regime de Competência e Regime de Caixa, alertar sobre períodos fechados e garantir conformidade fiscal.`
  };

  const systemPrompt = ROLE_SYSTEM_PROMPTS[agentRole] || ROLE_SYSTEM_PROMPTS.CFO_EXECUTIVO;

  // Sanitização e redação de PII nos dados recebidos
  const sanitizedMessages = messages.map(m => ({
    role: m.role,
    content: redactPII(m.content)
  }));

  // Se não houver mensagens diretas, constrói a partir da ação e payload
  const finalMessages = sanitizedMessages.length > 0 
    ? [{ role: 'system', content: systemPrompt }, ...sanitizedMessages]
    : [{ role: 'system', content: systemPrompt }, { role: 'user', content: redactPII(JSON.stringify(payload)) }];

  // Monta cadeia dinâmica respeitando o modelo preferido e os modelos secundários configurados
  const userChain = [
    preferredModel,
    ...(Array.isArray(fallbackModels) ? fallbackModels : [])
  ].filter(Boolean);

  const defaultChain = [
    'deepseek-v4-pro',
    'gpt-5.6-luna',
    'claude-haiku-5-5',
    'qwen3.8-max',
    'deepseek-chat',
    'gpt-4o'
  ];

  const modelsChain = [...userChain, ...defaultChain]
    .filter((m, idx, self) => self.indexOf(m) === idx);

  const attempts = [];
  let successfulContent = '';
  let winningModel = '';
  let failoverOccurred = false;
  const startTimeTotal = Date.now();

  for (let i = 0; i < modelsChain.length; i++) {
    const currentModel = modelsChain[i];
    const attemptStart = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);

    const protocolType = resolveModelProtocol(currentModel);
    const adapter = ProtocolAdapters[protocolType] || ProtocolAdapters.openai_chat;

    try {
      const { url, headers, body } = adapter.buildRequest(
        endpoint,
        currentModel,
        finalMessages,
        { temperature, maxTokens, jsonMode },
        serverApiKey
      );

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      });

      clearTimeout(timeout);
      const durationMs = Date.now() - attemptStart;

      if (!response.ok) {
        let errMessage = response.statusText;
        try {
          const errData = await response.json();
          errMessage = errData?.error?.message || errMessage;
        } catch {
          // ignore
        }

        attempts.push({
          model: currentModel,
          protocol: protocolType,
          durationMs,
          success: false,
          statusCode: response.status,
          errorMessage: errMessage
        });

        if (i + 1 < modelsChain.length) {
          failoverOccurred = true;
          // Pequena pausa protetiva em caso de Rate Limit (HTTP 429)
          if (response.status === 429) {
            await new Promise(r => setTimeout(r, 400));
          }
        }
        continue;
      }

      successfulContent = await adapter.parseResponse(response);
      winningModel = currentModel;

      attempts.push({
        model: currentModel,
        protocol: protocolType,
        durationMs,
        success: true,
        statusCode: 200
      });

      break; // Sucesso obtido! Interrompe a cadeia de failover
    } catch (err) {
      clearTimeout(timeout);
      const durationMs = Date.now() - attemptStart;
      const isTimeout = err.name === 'AbortError';

      attempts.push({
        model: currentModel,
        protocol: protocolType,
        durationMs,
        success: false,
        errorMessage: isTimeout ? 'Tempo limite esgotado (timeout 14s)' : (err.message || 'Falha de comunicação')
      });

      if (i + 1 < modelsChain.length) {
        failoverOccurred = true;
      }
    }
  }

  const totalDurationMs = Date.now() - startTimeTotal;

  if (!winningModel) {
    return res.status(502).json({
      success: false,
      error: 'Todos os modelos da cadeia de contingência falharam ou estão sobrecarregados.',
      modelUsed: 'NONE',
      attempts,
      totalDurationMs
    });
  }

  let parsedJson = null;
  if (jsonMode && successfulContent) {
    try {
      const clean = successfulContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      parsedJson = JSON.parse(clean);
    } catch (e) {
      console.warn('Falha no parse de JSON retornado pelo modelo:', e.message);
    }
  }

  return res.status(200).json({
    success: true,
    agentRole,
    action,
    companyId,
    content: successfulContent,
    parsedJson,
    modelUsed: winningModel,
    failoverOccurred,
    attempts,
    totalDurationMs
  });
}
