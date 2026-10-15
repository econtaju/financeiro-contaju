// ==============================================================================
// VERCEL SERVERLESS FUNCTION: GATEWAY DA CENTRAL DE AGENTES CONTAJU
// Rota: /api/agents
// Segurança: Secrets server-side, redator de PII, anti-injection e failover
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

export default async function handler(req, res) {
  // Configuração segura de cabeçalhos CORS
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
    temperature = 0.2,
    maxTokens = 2000,
    jsonMode = false,
    companyId = 'comp-1'
  } = req.body || {};

  // Chave do provedor server-side (prioridade absoluta para variável de ambiente)
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

  // Definição dos prompts de sistema e guardrails dos Especialistas
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

  // Cadeia de contingência com modelos da OpenCode / parceiros
  const modelsChain = [
    preferredModel || 'claude-3-5-sonnet',
    'gpt-4o',
    'deepseek-reasoner',
    'gemini-1.5-pro',
    'deepseek-chat'
  ].filter((m, idx, self) => self.indexOf(m) === idx);

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

    try {
      const requestPayload = {
        model: currentModel,
        messages: finalMessages,
        temperature,
        max_tokens: maxTokens
      };

      if (jsonMode) {
        requestPayload.response_format = { type: 'json_object' };
      }

      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serverApiKey}`
        },
        body: JSON.stringify(requestPayload),
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
          durationMs,
          success: false,
          statusCode: response.status,
          errorMessage: errMessage
        });

        if (i + 1 < modelsChain.length) {
          failoverOccurred = true;
        }
        continue; // Tenta o próximo modelo
      }

      const data = await response.json();
      successfulContent = data.choices?.[0]?.message?.content || '';
      winningModel = currentModel;

      attempts.push({
        model: currentModel,
        durationMs,
        success: true,
        statusCode: 200
      });

      break; // Concluído com sucesso
    } catch (err) {
      clearTimeout(timeout);
      const durationMs = Date.now() - attemptStart;
      const isTimeout = err.name === 'AbortError';

      attempts.push({
        model: currentModel,
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
