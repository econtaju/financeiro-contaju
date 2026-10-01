import { FinancialTitle, FinancialMovement } from '../types';
import { storage } from './storageService';
import { formatBRL } from './financialEngine';

export interface MonthlyReconciliation {
  monthIdx: number;
  monthName: string;
  competenceRevenue: number;
  realizedRevenue: number;
  revenueRealizationRate: number; // %
  pendingRevenue: number;
  competenceExpenses: number;
  realizedExpenses: number;
  expenseRealizationRate: number; // %
  pendingExpenses: number;
  accountingNetProfit: number;
  netOperatingCash: number;
  cashGap: number; // accountingNetProfit - netOperatingCash
}

export interface DRECashReconciliationSummary {
  year: number;
  totalCompetenceRevenue: number;
  totalRealizedRevenue: number;
  overallRevenueRealizationRate: number; // %
  totalPendingRevenue: number;
  openReceivableTitlesCount: number;

  totalCompetenceExpenses: number;
  totalRealizedExpenses: number;
  overallExpenseRealizationRate: number; // %
  totalPendingExpenses: number;
  openPayableTitlesCount: number;

  accountingNetProfit: number;
  netOperatingCashGenerated: number;
  cashGap: number; // accountingNetProfit - netOperatingCashGenerated

  riskLevel: 'CRITICO' | 'ALERTA' | 'SAUDAVEL' | 'SUPERAVIT';
  riskTitle: string;
  riskDescription: string;
  recommendedAction: string;

  monthly: MonthlyReconciliation[];
}

export class DRECashReconciliationEngine {
  private static MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  /**
   * Apura o confronto analítico e executivo entre Competência Econômica (DRE) e Efetivação Financeira em Caixa (DFC)
   */
  public static generateReconciliation(year: number): DRECashReconciliationSummary {
    const titles = storage.getTitles().filter(t => t.documentState !== 'CANCELADO');
    const movements = storage.getMovements().filter(m => !m.isReversed);

    const monthly: MonthlyReconciliation[] = [];

    let totalCompetenceRevenue = 0;
    let totalRealizedRevenue = 0;
    let totalPendingRevenue = 0;
    let openReceivableTitlesCount = 0;

    let totalCompetenceExpenses = 0;
    let totalRealizedExpenses = 0;
    let totalPendingExpenses = 0;
    let openPayableTitlesCount = 0;

    let totalAccountingNet = 0;
    let totalOperatingCash = 0;

    for (let m = 0; m < 12; m++) {
      const compStr = `${year}-${(m + 1).toString().padStart(2, '0')}`;
      const monthTitles = titles.filter(t => t.competence === compStr);

      const recTitles = monthTitles.filter(t => t.type === 'RECEBER');
      const payTitles = monthTitles.filter(t => t.type === 'PAGAR');

      // Receitas da competência
      const compRev = recTitles.reduce((acc, t) => acc + (t.originalAmount || 0), 0);
      const realRev = recTitles.reduce((acc, t) => acc + (t.settledPrincipal || 0), 0);
      const pendRev = recTitles.reduce((acc, t) => acc + (t.balancePrincipal || 0), 0);
      const revRate = compRev > 0 ? Math.min((realRev / compRev) * 100, 100) : 100;

      // Despesas da competência
      const compExp = payTitles.reduce((acc, t) => acc + (t.originalAmount || 0), 0);
      const realExp = payTitles.reduce((acc, t) => acc + (t.settledPrincipal || 0), 0);
      const pendExp = payTitles.reduce((acc, t) => acc + (t.balancePrincipal || 0), 0);
      const expRate = compExp > 0 ? Math.min((realExp / compExp) * 100, 100) : 100;

      // Lucro contábil simples vs Caixa efetivado
      const acctNet = compRev - compExp;
      const opCash = realRev - realExp;
      const gap = acctNet - opCash;

      monthly.push({
        monthIdx: m,
        monthName: this.MONTH_NAMES[m],
        competenceRevenue: compRev,
        realizedRevenue: realRev,
        revenueRealizationRate: Math.round(revRate * 10) / 10,
        pendingRevenue: pendRev,
        competenceExpenses: compExp,
        realizedExpenses: realExp,
        expenseRealizationRate: Math.round(expRate * 10) / 10,
        pendingExpenses: pendExp,
        accountingNetProfit: acctNet,
        netOperatingCash: opCash,
        cashGap: gap
      });

      totalCompetenceRevenue += compRev;
      totalRealizedRevenue += realRev;
      totalPendingRevenue += pendRev;

      totalCompetenceExpenses += compExp;
      totalRealizedExpenses += realExp;
      totalPendingExpenses += pendExp;

      totalAccountingNet += acctNet;
      totalOperatingCash += opCash;

      openReceivableTitlesCount += recTitles.filter(t => t.settlementState !== 'LIQUIDADO').length;
      openPayableTitlesCount += payTitles.filter(t => t.settlementState !== 'LIQUIDADO').length;
    }

    const overallRevenueRealizationRate = totalCompetenceRevenue > 0 
      ? Math.min((totalRealizedRevenue / totalCompetenceRevenue) * 100, 100) 
      : 100;

    const overallExpenseRealizationRate = totalCompetenceExpenses > 0 
      ? Math.min((totalRealizedExpenses / totalCompetenceExpenses) * 100, 100) 
      : 100;

    const totalCashGap = totalAccountingNet - totalOperatingCash;

    // Diagnóstico de Risco
    let riskLevel: 'CRITICO' | 'ALERTA' | 'SAUDAVEL' | 'SUPERAVIT' = 'SAUDAVEL';
    let riskTitle = 'Equilíbrio Financeiro Operacional';
    let riskDescription = 'A taxa de realização de receitas e pagamentos está alinhada, mantendo o caixa em sincronia com o resultado contábil.';
    let recommendedAction = 'Manter rotina padrão de cobrança e conciliação bancária periódica.';

    if (totalAccountingNet > 0 && totalOperatingCash < 0) {
      riskLevel = 'CRITICO';
      riskTitle = 'Lucro Contábil com Sangria de Caixa';
      riskDescription = `A empresa apresenta lucro apurado por competência de ${formatBRL(totalAccountingNet)}, mas gerou um déficit operacional de caixa de ${formatBRL(Math.abs(totalOperatingCash))}. Há ${formatBRL(totalPendingRevenue)} em vendas retidas que ainda não entraram no banco.`;
      recommendedAction = 'Priorizar força-tarefa de cobrança ativa e renegociação de prazos com fornecedores antes de novas contratações ou retiradas.';
    } else if (overallRevenueRealizationRate < 75 && totalPendingRevenue > 1000) {
      riskLevel = 'ALERTA';
      riskTitle = 'Alta Retenção de Vendas em Aberto';
      riskDescription = `Apenas ${overallRevenueRealizationRate.toFixed(1)}% das receitas faturadas foram efetivamente liquidadas em caixa. Restam ${formatBRL(totalPendingRevenue)} pendentes de recebimento distribuídos em ${openReceivableTitlesCount} títulos.`;
      recommendedAction = 'Acionar régua de cobrança preventiva via WhatsApp/E-mail e auditar títulos vencidos há mais de 15 dias.';
    } else if (totalOperatingCash > totalAccountingNet * 1.15 && totalRealizedRevenue > 0) {
      riskLevel = 'SUPERAVIT';
      riskTitle = 'Alta Eficiência de Liquidação de Caixa';
      riskDescription = `A entrada líquida de caixa (${formatBRL(totalOperatingCash)}) superou o lucro contábil do exercício (${formatBRL(totalAccountingNet)}), indicando recuperação eficiente de recebíveis anteriores.`;
      recommendedAction = 'Aproveitar folga de caixa para constituir reserva de contingência e obter descontos por antecipação a fornecedores.';
    }

    return {
      year,
      totalCompetenceRevenue,
      totalRealizedRevenue,
      overallRevenueRealizationRate: Math.round(overallRevenueRealizationRate * 10) / 10,
      totalPendingRevenue,
      openReceivableTitlesCount,

      totalCompetenceExpenses,
      totalRealizedExpenses,
      overallExpenseRealizationRate: Math.round(overallExpenseRealizationRate * 10) / 10,
      totalPendingExpenses,
      openPayableTitlesCount,

      accountingNetProfit: totalAccountingNet,
      netOperatingCashGenerated: totalOperatingCash,
      cashGap: totalCashGap,

      riskLevel,
      riskTitle,
      riskDescription,
      recommendedAction,

      monthly
    };
  }

  /**
   * Retorna a taxa de efetivação em caixa para uma linha específica do DRE
   */
  public static getLineCashRealization(
    matchedTitleIds: string[] | undefined,
    allTitles: FinancialTitle[]
  ): { competence: number; settled: number; pending: number; rate: number } {
    if (!matchedTitleIds || matchedTitleIds.length === 0) {
      return { competence: 0, settled: 0, pending: 0, rate: 100 };
    }

    const set = new Set(matchedTitleIds);
    const related = allTitles.filter(t => set.has(t.id));

    const competence = related.reduce((a, b) => a + (b.originalAmount || 0), 0);
    const settled = related.reduce((a, b) => a + (b.settledPrincipal || 0), 0);
    const pending = related.reduce((a, b) => a + (b.balancePrincipal || 0), 0);
    const rate = competence > 0 ? Math.min((settled / competence) * 100, 100) : 100;

    return {
      competence,
      settled,
      pending,
      rate: Math.round(rate * 10) / 10
    };
  }
}
