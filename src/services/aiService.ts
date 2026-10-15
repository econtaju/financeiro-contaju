import { 
  AiProviderConfig, 
  AiChatMessage, 
  AiExecutionResult, 
  AiExecutionAttempt, 
  AiModelChainItem,
  AiReconciliationSuggestion,
  BankStatementEntry,
  FinancialTitle,
  ChartAccount,
  Counterparty,
  AgentRoleType
} from '../types';
import { storage } from './storageService';
import { AiModelCatalogService, DEFAULT_DYNAMIC_CATALOG } from './aiModelCatalogService';

export const KNOWN_OPENCODE_MODELS: AiModelChainItem[] = DEFAULT_DYNAMIC_CATALOG;

export class AiService {
  /**
   * Obtém a configuração salva ou padrão
   */
  public static getConfig(): AiProviderConfig {
    return storage.getAiConfig();
  }

  /**
   * Salva as configurações de IA e credenciais da OpenCode
   */
  public static saveConfig(config: AiProviderConfig): void {
    storage.saveAiConfig(config);
  }

  /**
   * Testa a conectividade direta com um modelo específico da OpenCode
   */
  public static async testModelConnection(
    modelId: string, 
    customApiKey?: string, 
    customEndpoint?: string
  ): Promise<{ success: boolean; latencyMs: number; message: string; statusCode?: number }> {
    const config = this.getConfig();
    const apiKey = customApiKey || config.apiKey;
    let endpoint = (customEndpoint || config.endpointUrl || 'https://opencode.ai/zen/go/v1').replace(/\/+$/, '');
    if (endpoint.includes('api.opencode.ai/v1')) {
      endpoint = 'https://opencode.ai/zen/go/v1';
    }

    if (!apiKey) {
      // Tenta testar via Serverless Gateway (usando credencial do servidor sem expor ao client)
      try {
        const startTime = Date.now();
        const serverlessRes = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentRole: 'CFO_EXECUTIVO',
            action: 'ping_test',
            messages: [{ role: 'user', content: 'Ping' }],
            preferredModel: modelId,
            temperature: 0.1,
            maxTokens: 5
          })
        });
        const latencyMs = Date.now() - startTime;
        if (serverlessRes.ok) {
          const data = await serverlessRes.json();
          return {
            success: true,
            latencyMs,
            statusCode: 200,
            message: `Conexão bem-sucedida via Gateway Seguro com ${data.modelUsed || modelId} (${latencyMs}ms)`
          };
        } else {
          return {
            success: false,
            latencyMs,
            statusCode: serverlessRes.status,
            message: `Gateway HTTP ${serverlessRes.status}. Configure OPENCODE_API_KEY no servidor ou informe uma chave.`
          };
        }
      } catch {
        return { success: false, latencyMs: 0, message: 'Chave de API não informada e Gateway offline.' };
      }
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'x-opencode-session': `contaju-test-${Date.now()}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'user', content: 'Responda com a palavra OK.' }
          ],
          temperature: 0.1,
          max_tokens: 10
        }),
        signal: controller.signal
      });

      const latencyMs = Date.now() - startTime;
      clearTimeout(timeout);

      if (!response.ok) {
        let errText = '';
        try {
          const errJson = await response.json();
          errText = errJson?.error?.message || response.statusText;
        } catch {
          errText = await response.text();
        }
        return {
          success: false,
          latencyMs,
          statusCode: response.status,
          message: `Erro HTTP ${response.status}: ${errText.substring(0, 150)}`
        };
      }

      return {
        success: true,
        latencyMs,
        statusCode: 200,
        message: `Conexão bem-sucedida com ${modelId} (${latencyMs}ms)`
      };
    } catch (err: any) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      if (err.name === 'AbortError') {
        return { success: false, latencyMs, message: 'Tempo limite esgotado (timeout de 10s).' };
      }
      return { success: false, latencyMs, message: `Falha de rede: ${err.message || 'Sem conexão com a OpenCode'}` };
    }
  }

  /**
   * Executa uma requisição de IA com Failover Automático em Cascata
   * Se o modelo primário falhar (HTTP 429 rate limit, 500, timeout, etc.), tenta o secundário, e assim sucessivamente
   */
  public static async executeWithFailover(
    messages: AiChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
      featureName?: string;
      agentRole?: AgentRoleType;
    } = {}
  ): Promise<AiExecutionResult> {
    const config = this.getConfig();
    const startTimeTotal = Date.now();
    const role: AgentRoleType = options.agentRole || 'CFO_EXECUTIVO';

    // 1. Tentar primeiro via Vercel Serverless Gateway (/api/agents) com chaves protegidas no servidor
    try {
      const serverlessRes = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentRole: role,
          action: options.featureName || 'general_query',
          messages,
          temperature: options.temperature ?? config.temperature ?? 0.2,
          maxTokens: options.maxTokens ?? config.maxTokens ?? 2000,
          jsonMode: options.jsonMode,
          preferredModel: config.primaryModel,
          fallbackModels: config.fallbackModels || [],
          customApiKey: config.apiKey || undefined
        })
      });

      if (serverlessRes.ok) {
        const data = await serverlessRes.json();
        const duration = Date.now() - startTimeTotal;

        // Registra a execução no histórico auditável da Central de Agentes
        storage.addAgentRun({
          id: `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          agentRole: role,
          taskType: options.featureName || 'Consulta IA',
          requestedBy: storage.getCurrentUser().name,
          companyId: 'comp-1',
          startedAt: new Date(startTimeTotal).toISOString(),
          completedAt: new Date().toISOString(),
          status: 'SUCESSO',
          modelUsed: data.modelUsed || config.primaryModel,
          latencyMs: duration,
          failoverOccurred: Boolean(data.failoverOccurred),
          inputSummary: messages[messages.length - 1]?.content?.substring(0, 100) || '',
          outputSummary: data.content?.substring(0, 150) || ''
        });

        return {
          success: true,
          content: data.content,
          modelUsed: data.modelUsed,
          failoverOccurred: Boolean(data.failoverOccurred),
          attempts: data.attempts || [{ model: data.modelUsed, durationMs: duration, success: true, statusCode: 200 }],
          totalDurationMs: duration,
          parsedJson: data.parsedJson
        };
      }
    } catch {
      // Falha de rede ou offline na rota serverless, tenta fallback
    }

    // 2. Fallback local direto se houver chave configurada
    let rawEndpoint = (config.endpointUrl || 'https://opencode.ai/zen/go/v1').replace(/\/+$/, '');
    if (rawEndpoint.includes('api.opencode.ai/v1')) {
      rawEndpoint = 'https://opencode.ai/zen/go/v1';
    }
    const endpoint = rawEndpoint;

    if (!config.apiKey) {
      return {
        success: false,
        content: '',
        modelUsed: 'NONE',
        failoverOccurred: false,
        attempts: [{
          model: 'NONE',
          durationMs: 0,
          success: false,
          errorMessage: 'Chave de API não informada. Conecte sua Chave OpenCode Go nas Configurações de IA.'
        }],
        totalDurationMs: 0
      };
    }

    // Monta a cadeia de contingência: Modelo Primário -> Modelos Secundários
    const modelsChain: string[] = [
      config.primaryModel || 'deepseek-v4-pro',
      ...(config.fallbackModels || []).filter(m => m !== config.primaryModel)
    ];

    const attempts: AiExecutionAttempt[] = [];
    let failoverOccurred = false;
    let successfulContent = '';
    let winningModel = '';

    for (let i = 0; i < modelsChain.length; i++) {
      const currentModel = modelsChain[i];
      const attemptStart = Date.now();
      const controller = new AbortController();
      const timeoutMs = config.timeoutMs || 14000;
      const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const payload: any = {
          model: currentModel,
          messages,
          temperature: options.temperature ?? config.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? config.maxTokens ?? 2000
        };

        if (options.jsonMode) {
          payload.response_format = { type: 'json_object' };
        }

        const res = await fetch(`${endpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
            'x-opencode-session': `contaju-${Date.now()}`
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutTimer);
        const duration = Date.now() - attemptStart;

        if (!res.ok) {
          let errDetail = '';
          try {
            const errBody = await res.json();
            errDetail = errBody?.error?.message || res.statusText;
          } catch {
            errDetail = await res.text();
          }

          attempts.push({
            model: currentModel,
            durationMs: duration,
            success: false,
            statusCode: res.status,
            errorMessage: `HTTP ${res.status}: ${errDetail.substring(0, 150)}`
          });

          // Registra o failover se houver um próximo modelo
          if (i + 1 < modelsChain.length) {
            failoverOccurred = true;
            config.lastFailoverEvent = {
              timestamp: new Date().toISOString(),
              fromModel: currentModel,
              toModel: modelsChain[i + 1],
              reason: `HTTP ${res.status} (${errDetail.substring(0, 50)})`,
              feature: options.featureName || 'IA Geral'
            };
            storage.saveAiConfig(config);
          }
          continue; // Pula para o próximo modelo da cadeia
        }

        const data = await res.json();
        successfulContent = data.choices?.[0]?.message?.content || '';
        winningModel = currentModel;

        attempts.push({
          model: currentModel,
          durationMs: duration,
          success: true,
          statusCode: 200
        });

        break; // Sucesso! Interrompe a cadeia de contingência
      } catch (err: any) {
        clearTimeout(timeoutTimer);
        const duration = Date.now() - attemptStart;
        const isTimeout = err.name === 'AbortError';
        const msg = isTimeout ? `Timeout esgotado (${timeoutMs}ms)` : (err.message || 'Falha de rede');

        attempts.push({
          model: currentModel,
          durationMs: duration,
          success: false,
          errorMessage: msg
        });

        if (i + 1 < modelsChain.length) {
          failoverOccurred = true;
          config.lastFailoverEvent = {
            timestamp: new Date().toISOString(),
            fromModel: currentModel,
            toModel: modelsChain[i + 1],
            reason: msg,
            feature: options.featureName || 'IA Geral'
          };
          storage.saveAiConfig(config);
        }
      }
    }

    const totalDurationMs = Date.now() - startTimeTotal;

    if (!winningModel) {
      return {
        success: false,
        content: '',
        modelUsed: 'FAILOVER_EXHAUSTED',
        failoverOccurred: true,
        attempts,
        totalDurationMs
      };
    }

    let parsedJson: any = undefined;
    if (options.jsonMode && successfulContent) {
      try {
        // Remove delimitadores de código markdown caso a IA responda com ```json
        const cleanJson = successfulContent
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();
        parsedJson = JSON.parse(cleanJson);
      } catch (jsonErr) {
        console.warn('Falha ao parsear JSON retornado pela IA:', jsonErr);
      }
    }

    return {
      success: true,
      content: successfulContent,
      modelUsed: winningModel,
      failoverOccurred,
      attempts,
      totalDurationMs,
      parsedJson
    };
  }

  /**
   * Assistente IA de Conciliação Bancária: Analisa uma transação do extrato e recomenda o matching contábil ideal
   */
  public static async analyzeReconciliationTransaction(
    statement: BankStatementEntry,
    candidateTitles: FinancialTitle[],
    chartAccounts: ChartAccount[],
    counterparties?: Counterparty[]
  ): Promise<AiReconciliationSuggestion & { success: boolean; error?: string }> {
    const parties = counterparties && counterparties.length > 0 ? counterparties : storage.getPersons();

    const prompt = `Você é o auditor e assistente contábil do sistema ERP financeiro Contaju.
Analise a seguinte transação bancária e recomende a conciliação exata com os lançamentos do sistema.

TRANSAÇÃO DO EXTRATO BANCÁRIO:
- Data: ${statement.date}
- Valor: R$ ${statement.amount.toFixed(2)} (${statement.amount < 0 ? 'DÉBITO / SAÍDA' : 'CRÉDITO / ENTRADA'})
- Descrição no Banco: "${statement.description}"
- Código FITID: ${statement.fitId}

TÍTULOS CANDIDATOS NO SISTEMA (Contas a Pagar/Receber):
${candidateTitles.slice(0, 15).map(t => {
  const party = parties.find(c => c.id === t.counterpartyId);
  return `- ID: ${t.id} | Tipo: ${t.type} | Nº: ${t.titleNumber} | Valor: R$ ${(t.balancePrincipal || t.originalAmount).toFixed(2)} | Venc: ${t.dueDate} | Desc: "${t.description}" | Cliente/Forn: "${party?.name || 'Não inf.'}"`;
}).join('\n')}

CATEGORIAS DO PLANO DE CONTAS (DRE):
${chartAccounts.slice(0, 25).map(a => `- ID: ${a.id} | Código: ${a.code} | Nome: ${a.name}`).join('\n')}

INSTRUÇÃO:
Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "statementId": "${statement.id}",
  "suggestedTitleId": "id-do-titulo-se-houver-correspondencia-ou-null",
  "suggestedAccountCategory": "id-da-categoria-contabil-mais-provavel",
  "suggestedCategory": "Nome da Categoria Contábil Sugerida",
  "suggestedCounterpartyName": "nome-do-cliente-ou-fornecedor-inferido",
  "confidenceScore": 85, // número de 0 a 100
  "action": "CONCILIAR_EXISTENTE", // "CONCILIAR_EXISTENTE" | "CRIAR_NOVO_TITULO" | "IGNORAR_TARIFA"
  "reasoning": "Justificativa clara e profissional da escolha contábil",
  "isNewTitleRecommended": false, // true se não encontrou título existente e recomenda criar novo lançamento
  "suggestedDescription": "Descrição limpa e padronizada sugerida para o título"
}`;

    const res = await this.executeWithFailover([
      { role: 'system', content: 'Você é um perito contábil e financeiro de conciliação. Responda estritamente em JSON válido.' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.1,
      jsonMode: true,
      featureName: 'Conciliação Bancária'
    });

    if (res.success && res.parsedJson) {
      const conf = Number(res.parsedJson.confidenceScore) || 75;
      const act = res.parsedJson.action || (res.parsedJson.suggestedTitleId ? 'CONCILIAR_EXISTENTE' : 'CRIAR_NOVO_TITULO');

      return {
        statementId: statement.id,
        suggestedTitleId: res.parsedJson.suggestedTitleId || undefined,
        suggestedAccountCategory: res.parsedJson.suggestedAccountCategory || undefined,
        suggestedCategory: res.parsedJson.suggestedCategory || res.parsedJson.suggestedAccountCategory || undefined,
        suggestedCounterpartyName: res.parsedJson.suggestedCounterpartyName || undefined,
        confidenceScore: conf,
        confidence: conf,
        reasoning: res.parsedJson.reasoning || `Sugerido via ${res.modelUsed}`,
        isNewTitleRecommended: Boolean(res.parsedJson.isNewTitleRecommended) || act === 'CRIAR_NOVO_TITULO',
        action: act,
        suggestedDescription: res.parsedJson.suggestedDescription || statement.description,
        modelUsed: res.modelUsed,
        attempts: res.attempts,
        hadFailover: res.failoverOccurred,
        success: true
      };
    }

    // Fallback heurístico inteligente se a IA estiver offline ou desabilitada
    return {
      statementId: statement.id,
      confidenceScore: 30,
      confidence: 30,
      reasoning: res.content ? `Não foi possível analisar detalhadamente: ${res.content}` : 'Análise preliminar (sem resposta da IA)',
      isNewTitleRecommended: true,
      action: 'CRIAR_NOVO_TITULO',
      suggestedDescription: statement.description,
      modelUsed: res.modelUsed,
      attempts: res.attempts,
      hadFailover: res.failoverOccurred,
      success: res.success,
      error: res.success ? undefined : 'Falha na comunicação com a API OpenCode'
    };
  }

  /**
   * Resumo Executivo Financeiro Diário para o Dashboard
   */
  public static async generateExecutiveBriefing(metrics: {
    totalReceivablesToday: number;
    totalPayablesToday: number;
    currentBankBalance: number;
    projectedCashFlow: number;
    delinquencyRate: number;
    overdueCount: number;
    companyName: string;
  }): Promise<{ briefingHtml: string; modelUsed: string; failoverOccurred: boolean }> {
    const prompt = `Gere um briefing executivo financeiro curto, elegante e direto ao ponto para a diretoria da empresa "${metrics.companyName}".

MÉTRICAS DO DIA:
- Saldo Bancário Consolidado: R$ ${metrics.currentBankBalance.toFixed(2)}
- A Receber Previsto Hoje: R$ ${metrics.totalReceivablesToday.toFixed(2)}
- A Pagar Previsto Hoje: R$ ${metrics.totalPayablesToday.toFixed(2)}
- Saldo Projetado de Caixa: R$ ${metrics.projectedCashFlow.toFixed(2)}
- Índice de Inadimplência: ${metrics.delinquencyRate.toFixed(2)}% (${metrics.overdueCount} títulos vencidos)

Estruture o texto em 3 parágrafos objetivos:
1. Panorama Geral de Liquidez e Caixa do Dia.
2. Ações Prioritárias Recomendadas (cobrança ou conciliação).
3. Conclusão estratégica para manter o fluxo positivo.
Destaque valores importantes em negrito.`;

    const res = await this.executeWithFailover([
      { role: 'system', content: 'Você é o CFO executivo da empresa. Escreva em português claro, profissional e inspirador.' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.3,
      featureName: 'Briefing Executivo'
    });

    if (res.success) {
      return {
        briefingHtml: res.content,
        modelUsed: res.modelUsed,
        failoverOccurred: res.failoverOccurred
      };
    }

    return {
      briefingHtml: `Hoje a empresa possui saldo de R$ ${metrics.currentBankBalance.toFixed(2)}, com R$ ${metrics.totalReceivablesToday.toFixed(2)} previstos para recebimento e R$ ${metrics.totalPayablesToday.toFixed(2)} para quitação. Inadimplência em ${metrics.delinquencyRate.toFixed(1)}%.`,
      modelUsed: 'LOCAL_RULE',
      failoverOccurred: false
    };
  }
}
