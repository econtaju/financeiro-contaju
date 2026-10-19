import { storage } from './storageService';
import { FinancialEngine } from './financialEngine';

export interface StressTestParams {
  churnRatePct: number; // Taxa de churn mensal acumulativa (ex: 5%, 10%, 20%)
  delayDays: number; // Dias adicionais de mora/atraso médio (ex: 0, 15, 30 dias)
  expenseInflationPct: number; // Variação de custos/despesas fixas (ex: 0%, 5%, 10%)
  scenarioPreset?: 'BASE' | 'MODERADO' | 'SEVERO' | 'PIOR_CASO' | 'PERSONALIZADO';
}

export interface StressTestMonthProjection {
  monthIndex: number; // 1 a 6
  monthLabel: string; // Ex: "Nov/2026"
  yearMonth: string; // Ex: "2026-11"
  
  // Cenário Base (Sem estresse)
  baseRevenue: number;
  baseExpenses: number;
  baseNetCash: number;
  baseEndBalance: number;

  // Cenário Estressado
  stressedRevenue: number;
  revenueLostToChurn: number;
  revenueDelayed: number;
  revenueRealizedInMonth: number;
  stressedExpenses: number;
  stressedNetCash: number;
  stressedEndBalance: number;

  // Alertas
  isDeficit: boolean;
  isNegativeBalance: boolean;
}

export interface StressTestResult {
  params: StressTestParams;
  startingCashBalance: number;
  projections: StressTestMonthProjection[];
  minimumStressedCash: number;
  minimumBaseCash: number;
  workingCapitalNeeded: number;
  totalRevenueLostToChurn: number;
  cashRunwayMonths: number | null; // null = caixa saudável além de 6 meses
  isCriticalSolvencyRisk: boolean;
  summaryText: string;
}

export class StressTestingEngine {
  /**
   * Executa a simulação de estresse financeiro para os próximos 6 meses (180 dias)
   */
  public static runStressTest(params: StressTestParams): StressTestResult {
    const contracts = storage.getContracts().filter(c => c.status === 'ATIVO');
    const titles = storage.getTitles().filter(t => t.documentState === 'CONFIRMADO');
    const startingCash = FinancialEngine.getConsolidatedCashBalance();

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1; // 1-12

    // 1. Apuração da Receita Base Mensal (MRR atual da carteira)
    const baseMrr = contracts.reduce((acc, c) => acc + (c.monthlyTotal || 0), 0);

    // 2. Apuração da Média de Despesas Mensais
    // Considera despesas recentes ou contas a pagar programadas
    const pastPayables = titles.filter(t => t.type === 'PAGAR' && (t.settlementState === 'LIQUIDADO' || t.balancePrincipal > 0));
    let baseMonthlyExpense = 0;
    if (pastPayables.length > 0) {
      const totalPastPay = pastPayables.reduce((acc, t) => acc + (t.originalAmount || t.balancePrincipal || 0), 0);
      baseMonthlyExpense = Math.max(12000, Math.round(totalPastPay / 3));
    } else {
      baseMonthlyExpense = Math.max(15000, baseMrr * 0.7);
    }

    const projections: StressTestMonthProjection[] = [];
    let runningBaseBalance = startingCash;
    let runningStressedBalance = startingCash;
    let delayedRevenueCarryover = 0;
    let totalRevenueLostToChurn = 0;
    let firstNegativeMonthIndex: number | null = null;

    // Fator de atraso mensal: proporção da receita que atrasa e transborda para o próximo mês
    const delayRatio = Math.min(0.9, Math.max(0, params.delayDays / 30));

    // Simula cada um dos 6 meses futuros (180 dias)
    for (let m = 1; m <= 6; m++) {
      let fYear = curYear + Math.floor((curMonth - 1 + m) / 12);
      let fMonth = ((curMonth - 1 + m) % 12) + 1;
      const yearMonth = `${fYear}-${String(fMonth).padStart(2, '0')}`;
      const dateObj = new Date(fYear, fMonth - 1, 1);
      const monthLabel = `${dateObj.toLocaleDateString('pt-BR', { month: 'short' })}/${fYear}`;

      // A. Cenário Base (Sem Estresse)
      const baseRev = baseMrr;
      const baseExp = baseMonthlyExpense;
      const baseNet = baseRev - baseExp;
      runningBaseBalance += baseNet;

      // B. Cenário Estressado
      // 1. Churn acumulado até o mês m:
      // Cada mês perde churnRatePct da base remanescente
      const churnRetentionFactor = Math.pow(1 - (params.churnRatePct / 100), m);
      const stressedRevNominal = baseMrr * churnRetentionFactor;
      const churnLossThisMonth = baseMrr - stressedRevNominal;
      totalRevenueLostToChurn += churnLossThisMonth;

      // 2. Atraso de recebimento:
      // Uma parte da receita nominal deste mês é represada por mora,
      // e o carryover do mês anterior entra agora.
      const currentMonthDelayed = stressedRevNominal * delayRatio;
      const stressedRevRealized = (stressedRevNominal - currentMonthDelayed) + delayedRevenueCarryover;
      delayedRevenueCarryover = currentMonthDelayed;

      // 3. Despesas sob estresse (inflação de custos):
      const expenseInflationFactor = 1 + (params.expenseInflationPct / 100);
      const stressedExp = baseMonthlyExpense * expenseInflationFactor;

      // 4. Saldo líquido do mês e saldo acumulado de caixa:
      const stressedNet = stressedRevRealized - stressedExp;
      runningStressedBalance += stressedNet;

      const isDeficit = stressedNet < 0;
      const isNegativeBalance = runningStressedBalance < 0;

      if (isNegativeBalance && firstNegativeMonthIndex === null) {
        firstNegativeMonthIndex = m;
      }

      projections.push({
        monthIndex: m,
        monthLabel,
        yearMonth,
        baseRevenue: Math.round(baseRev * 100) / 100,
        baseExpenses: Math.round(baseExp * 100) / 100,
        baseNetCash: Math.round(baseNet * 100) / 100,
        baseEndBalance: Math.round(runningBaseBalance * 100) / 100,
        stressedRevenue: Math.round(stressedRevNominal * 100) / 100,
        revenueLostToChurn: Math.round(churnLossThisMonth * 100) / 100,
        revenueDelayed: Math.round(currentMonthDelayed * 100) / 100,
        revenueRealizedInMonth: Math.round(stressedRevRealized * 100) / 100,
        stressedExpenses: Math.round(stressedExp * 100) / 100,
        stressedNetCash: Math.round(stressedNet * 100) / 100,
        stressedEndBalance: Math.round(runningStressedBalance * 100) / 100,
        isDeficit,
        isNegativeBalance
      });
    }

    const minStressedCash = Math.min(...projections.map(p => p.stressedEndBalance));
    const minBaseCash = Math.min(...projections.map(p => p.baseEndBalance));
    const workingCapitalNeeded = minStressedCash < 0 ? Math.abs(minStressedCash) : 0;
    const isCritical = minStressedCash < 0 || (firstNegativeMonthIndex !== null && firstNegativeMonthIndex <= 3);

    let summaryText = 'Sob este cenário, a empresa mantém liquidez positiva nos próximos 180 dias com reservas suficientes.';
    if (minStressedCash < 0) {
      summaryText = `ALERTA DE LIQUIDEZ: O caixa entra em déficit no ${firstNegativeMonthIndex}º mês (${projections[firstNegativeMonthIndex! - 1]?.monthLabel}), exigindo um aporte de capital de giro de pelo menos R$ ${workingCapitalNeeded.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para evitar inadimplência das obrigações.`;
    } else if (minStressedCash < startingCash * 0.3) {
      summaryText = `ATENÇÃO: As reservas de caixa sofrem erosão de mais de 70%, atingindo o piso de R$ ${minStressedCash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, exigindo contenção preventiva de custos.`;
    }

    return {
      params,
      startingCashBalance: startingCash,
      projections,
      minimumStressedCash: minStressedCash,
      minimumBaseCash: minBaseCash,
      workingCapitalNeeded,
      totalRevenueLostToChurn: Math.round(totalRevenueLostToChurn * 100) / 100,
      cashRunwayMonths: firstNegativeMonthIndex,
      isCriticalSolvencyRisk: isCritical,
      summaryText
    };
  }

  /**
   * Retorna os parâmetros pré-configurados de cenários padrão
   */
  public static getScenarioPreset(preset: 'BASE' | 'MODERADO' | 'SEVERO' | 'PIOR_CASO'): StressTestParams {
    switch (preset) {
      case 'BASE':
        return {
          churnRatePct: 1,
          delayDays: 0,
          expenseInflationPct: 0,
          scenarioPreset: 'BASE'
        };
      case 'MODERADO':
        return {
          churnRatePct: 5,
          delayDays: 10,
          expenseInflationPct: 5,
          scenarioPreset: 'MODERADO'
        };
      case 'SEVERO':
        return {
          churnRatePct: 15,
          delayDays: 20,
          expenseInflationPct: 10,
          scenarioPreset: 'SEVERO'
        };
      case 'PIOR_CASO':
        return {
          churnRatePct: 25,
          delayDays: 35,
          expenseInflationPct: 15,
          scenarioPreset: 'PIOR_CASO'
        };
    }
  }
}
