import { FinancialTitle, ChartAccount, TitleType } from '../types';
import { normalizeText } from './contaAzulMappingEngine';

export interface CategoryLearningEntry {
  id: string;
  term: string; // Termo normalizado (fornecedor, cliente ou palavras-chave)
  counterpartyNormalized: string;
  type: TitleType; // 'PAGAR' | 'RECEBER'
  chartAccountId: string;
  chartAccountName: string;
  confidence: number;
  timesApplied: number;
  lastUsedAt: string;
  source: 'MANUAL_OVERRIDE' | 'HISTORICAL_TITLE' | 'IMPORT_CONFIRMED';
}

export interface PredictionResult {
  chartAccountId: string;
  chartAccountName: string;
  confidence: number;
  isFromMemory: boolean;
  source: string;
  matchedRuleId?: string;
  reason: string;
}

const STORAGE_KEY = 'contaju_category_learning_rules';

class CategoryLearningService {
  private rulesCache: CategoryLearningEntry[] | null = null;

  public getLearnedRules(): CategoryLearningEntry[] {
    if (this.rulesCache) return this.rulesCache;
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.rulesCache = JSON.parse(stored);
        return this.rulesCache || [];
      }
    } catch {
      // fallback
    }
    this.rulesCache = [];
    return [];
  }

  private saveRules(rules: CategoryLearningEntry[]): void {
    this.rulesCache = rules;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
      } catch {
        // storage quota fallback
      }
    }
  }

  /**
   * Registra ou reforça o aprendizado de uma categoria para um fornecedor/descrição
   */
  public learnCategory(
    counterparty: string,
    description: string,
    type: TitleType,
    chartAccountId: string,
    chartAccountName: string,
    source: 'MANUAL_OVERRIDE' | 'HISTORICAL_TITLE' | 'IMPORT_CONFIRMED' = 'IMPORT_CONFIRMED'
  ): void {
    if (!chartAccountId || !chartAccountName) return;

    const normParty = normalizeText(counterparty);
    const normDesc = normalizeText(description);
    const currentRules = this.getLearnedRules();

    // 1. Regra baseada na Contraparte (mais forte)
    if (normParty && normParty.length >= 3) {
      const existingIdx = currentRules.findIndex(
        r => r.counterpartyNormalized === normParty && r.type === type
      );

      if (existingIdx >= 0) {
        const existing = currentRules[existingIdx];
        currentRules[existingIdx] = {
          ...existing,
          chartAccountId,
          chartAccountName,
          timesApplied: existing.timesApplied + 1,
          lastUsedAt: new Date().toISOString(),
          confidence: Math.min(0.99, existing.confidence + 0.05),
          source
        };
      } else {
        currentRules.push({
          id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          term: normParty,
          counterpartyNormalized: normParty,
          type,
          chartAccountId,
          chartAccountName,
          confidence: 0.95,
          timesApplied: 1,
          lastUsedAt: new Date().toISOString(),
          source
        });
      }
    }

    // 2. Regra baseada na Descrição Completa (se for recorrente/específica)
    if (normDesc && normDesc.length >= 4) {
      const existingDescIdx = currentRules.findIndex(
        r => r.term === normDesc && r.type === type
      );

      if (existingDescIdx >= 0) {
        const existing = currentRules[existingDescIdx];
        currentRules[existingDescIdx] = {
          ...existing,
          chartAccountId,
          chartAccountName,
          timesApplied: existing.timesApplied + 1,
          lastUsedAt: new Date().toISOString(),
          confidence: Math.min(0.99, existing.confidence + 0.05),
          source
        };
      } else {
        currentRules.push({
          id: `rule-desc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          term: normDesc,
          counterpartyNormalized: normParty || '',
          type,
          chartAccountId,
          chartAccountName,
          confidence: 0.96,
          timesApplied: 1,
          lastUsedAt: new Date().toISOString(),
          source
        });
      }
    }

    // 3. Palavras-chave relevantes da descrição
    if (normDesc && normDesc.length >= 4) {
      const keywords = this.extractKeywords(normDesc);
      for (const kw of keywords) {
        if (kw.length < 4 || kw === normDesc) continue;
        const kwIdx = currentRules.findIndex(
          r => r.term === kw && r.type === type
        );
        if (kwIdx >= 0) {
          const rule = currentRules[kwIdx];
          currentRules[kwIdx] = {
            ...rule,
            chartAccountId,
            chartAccountName,
            timesApplied: rule.timesApplied + 1,
            lastUsedAt: new Date().toISOString()
          };
        } else {
          currentRules.push({
            id: `rule-kw-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            term: kw,
            counterpartyNormalized: '',
            type,
            chartAccountId,
            chartAccountName,
            confidence: 0.88,
            timesApplied: 1,
            lastUsedAt: new Date().toISOString(),
            source
          });
        }
      }
    }

    this.saveRules(currentRules);
  }

  /**
   * Extrai palavras-chave relevantes da descrição
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem',
      'sob', 'sobre', 'ref', 'referente', 'mes', 'ano', 'pagamento', 'recebimento', 'nf', 'nota', 'fiscal',
      'fatura', 'boleto', 'parcela', 'valor', 'empresa', 'ltda', 'eireli', 'me', 'sa', 's/a', 'epp'
    ]);

    const words = text
      .split(/[^a-z0-9]/)
      .map(w => w.trim())
      .filter(w => w.length > 3 && !stopWords.has(w) && isNaN(Number(w)));

    return Array.from(new Set(words)).slice(0, 3);
  }

  /**
   * Prediz a melhor categoria para um lançamento analisando:
   * 1. Regras aprendidas salvas em memória
   * 2. Histórico de títulos anteriores já cadastrados no sistema
   */
  public predictCategory(
    counterparty: string,
    description: string,
    type: TitleType,
    chartAccounts: ChartAccount[],
    existingTitles: FinancialTitle[] = []
  ): PredictionResult | null {
    const normParty = normalizeText(counterparty || '');
    const normDesc = normalizeText(description || '');
    const rawRules = this.getLearnedRules();
    const rules = Array.isArray(rawRules) ? rawRules : [];
    const safeAccounts = (Array.isArray(chartAccounts) ? chartAccounts : []).filter(Boolean);
    const safeTitles = (Array.isArray(existingTitles) ? existingTitles : []).filter(Boolean);

    // 0. Prioridade Máxima: Regra aprendida por Descrição Completa Exata
    if (normDesc) {
      const matchByDesc = rules.find(
        r => r && r.type === type && r.term === normDesc
      );
      if (matchByDesc) {
        const account = safeAccounts.find(a => a.id === matchByDesc.chartAccountId);
        if (account) {
          return {
            chartAccountId: account.id,
            chartAccountName: account.name,
            confidence: matchByDesc.confidence || 0.98,
            isFromMemory: true,
            source: 'MEMORIA_DESCRICAO',
            matchedRuleId: matchByDesc.id,
            reason: `Enquadrado por memória da descrição "${description}"`
          };
        }
      }
    }

    // 1. Busca nas regras explícitas aprendidas por Contraparte
    if (normParty) {
      const matchByParty = rules.find(
        r => r && r.type === type && r.counterpartyNormalized === normParty
      );
      if (matchByParty) {
        const account = safeAccounts.find(a => a.id === matchByParty.chartAccountId);
        if (account) {
          return {
            chartAccountId: account.id,
            chartAccountName: account.name,
            confidence: matchByParty.confidence,
            isFromMemory: true,
            source: 'MEMORIA_APRENDIDA',
            matchedRuleId: matchByParty.id,
            reason: `Enquadrado pela memória do sistema para "${counterparty}"`
          };
        }
      }

      // Busca por similaridade parcial na contraparte
      const partialMatch = rules.find(
        r => r && r.type === type && r.counterpartyNormalized && (
          normParty.includes(r.counterpartyNormalized) || r.counterpartyNormalized.includes(normParty)
        )
      );
      if (partialMatch) {
        const account = safeAccounts.find(a => a.id === partialMatch.chartAccountId);
        if (account) {
          return {
            chartAccountId: account.id,
            chartAccountName: account.name,
            confidence: 0.88,
            isFromMemory: true,
            source: 'MEMORIA_SIMILAR',
            matchedRuleId: partialMatch.id,
            reason: `Memória similar associada a "${partialMatch.counterpartyNormalized}"`
          };
        }
      }
    }

    // 2. Busca no histórico de títulos anteriores do sistema
    if (safeTitles.length > 0 && normParty) {
      const matchingTitles = safeTitles.filter(t => {
        if (!t || t.type !== type || !t.accountId) return false;
        // Verifica se a contraparte ou o título bate
        const tParty = normalizeText(t.counterpartyId || '');
        const tDesc = normalizeText(t.description || '');
        return (tParty && (tParty.includes(normParty) || normParty.includes(tParty))) || (normDesc && tDesc && tDesc.includes(normDesc));
      });

      if (matchingTitles.length > 0) {
        // Conta a categoria mais frequente entre os títulos encontrados
        const countMap: Record<string, number> = {};
        for (const mt of matchingTitles) {
          if (mt.accountId) {
            countMap[mt.accountId] = (countMap[mt.accountId] || 0) + 1;
          }
        }

        let bestAccountId = '';
        let maxCount = 0;
        for (const [accId, count] of Object.entries(countMap)) {
          if (count > maxCount) {
            maxCount = count;
            bestAccountId = accId;
          }
        }

        const account = safeAccounts.find(a => a.id === bestAccountId);
        if (account) {
          return {
            chartAccountId: account.id,
            chartAccountName: account.name,
            confidence: Math.min(0.96, 0.75 + (maxCount * 0.05)),
            isFromMemory: true,
            source: 'HISTORICO_TITULOS',
            reason: `Identificado em ${maxCount} lançamento(s) anterior(es) no sistema`
          };
        }
      }
    }

    // 3. Busca nas regras aprendidas por palavras-chave na descrição
    if (normDesc) {
      const keywords = this.extractKeywords(normDesc);
      for (const kw of keywords) {
        const kwRule = rules.find(r => r.type === type && r.term === kw);
        if (kwRule) {
          const account = safeAccounts.find(a => a.id === kwRule.chartAccountId);
          if (account) {
            return {
              chartAccountId: account.id,
              chartAccountName: account.name,
              confidence: kwRule.confidence * 0.9,
              isFromMemory: true,
              source: 'MEMORIA_PALAVRA_CHAVE',
              matchedRuleId: kwRule.id,
              reason: `Enquadrado pelo termo histórico "${kw}"`
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Salva o aprendizado de um lote de linhas importadas
   */
  public learnBatch(
    rows: Array<{
      fornecedor: string;
      descricao: string;
      tipo: TitleType;
      chartAccountId: string;
      chartAccountName: string;
    }>
  ): void {
    for (const r of rows) {
      if (r.chartAccountId && r.chartAccountName) {
        this.learnCategory(
          r.fornecedor,
          r.descricao,
          r.tipo,
          r.chartAccountId,
          r.chartAccountName,
          'IMPORT_CONFIRMED'
        );
      }
    }
  }
}

export const categoryLearningService = new CategoryLearningService();
