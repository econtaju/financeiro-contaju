import { ChartAccount, FinancialTitle, FinancialMovement } from '../types';
import { storage } from './storageService';
import { FinancialEngine } from './financialEngine';

export interface DRELineItem {
  id: string;
  name: string;
  code?: string;
  type?: 'RECEITA' | 'DEDUCAO' | 'CUSTO' | 'DESPESA' | 'RESULTADO' | 'SUBTOTAL';
  isHeader?: boolean;
  isSummary?: boolean;
  level: number; // 0 for major group, 1 for subgroup, 2 for account
  groupId?: string; // Identifier of top group (e.g. 'h-1', 'h-2', 'h-3', 'h-4', 'h-5', 'h-6')
  parentHeaderId?: string; // Direct parent header id (e.g. 'h-4' or 'h-4.1')
  valuesByMonth: number[]; // 12 months: index 0 = Jan, ..., index 11 = Dec
  totalYear: number;
  matchedTitleIds?: string[];
  titles?: FinancialTitle[];
}

export type DREMatrix = {
  months: string[];
  lines: DRELineItem[];
  netResults: number[];
  totalNetResult: number;
};

export interface CashFlowLineItem {
  id: string;
  name: string;
  code?: string;
  type?: 'ENTRADA' | 'SAIDA' | 'SALDO';
  isHeader?: boolean;
  isSummary?: boolean;
  level: number;
  valuesByMonth: number[];
  totalYear: number;
}

export type CashFlowMatrix = {
  months: string[];
  lines: CashFlowLineItem[];
  openingBalances: number[];
  netMovements: number[];
  closingBalances: number[];
};

export class ReportingEngine {
  /**
   * GENERATE DRE GERENCIAL BY COMPETENCE
   * Calculates 12 months + annual total based on economic competence (YYYY-MM).
   */
  public static generateDRE(year: number): {
    months: string[];
    lines: DRELineItem[];
    netResults: number[];
    totalNetResult: number;
  } {
    const titles = storage.getTitles().filter(t => t.documentState !== 'CANCELADO');
    const accounts = storage.getChartAccounts();

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Helper to sum for specific account codes or line
    const getValuesForAccount = (accId: string): { monthly: number[]; total: number; titleIds: string[] } => {
      const monthly = new Array(12).fill(0);
      const titleIds: string[] = [];

      for (let m = 0; m < 12; m++) {
        const compStr = `${year}-${(m + 1).toString().padStart(2, '0')}`;
        const matchingTitles = titles.filter(t => t.accountId === accId && t.competence === compStr);

        for (const title of matchingTitles) {
          titleIds.push(title.id);
          // For sales/receivables, originalAmount is revenue
          // For payables/costs, originalAmount is cost/expense
          monthly[m] += title.originalAmount;
        }
        monthly[m] = Math.round(monthly[m] * 100) / 100;
      }

      const total = monthly.reduce((a, b) => a + b, 0);
      return { monthly, total: Math.round(total * 100) / 100, titleIds };
    };

    const sumArrays = (arrays: number[][]): number[] => {
      const result = new Array(12).fill(0);
      for (const arr of arrays) {
        for (let i = 0; i < 12; i++) {
          result[i] += arr[i] || 0;
        }
      }
      return result.map(v => Math.round(v * 100) / 100);
    };

    const subtractArrays = (arr1: number[], arr2: number[]): number[] => {
      return arr1.map((v, i) => Math.round((v - (arr2[i] || 0)) * 100) / 100);
    };

    // 1. Receita Bruta de Serviços (Analytical accounts under grp-1.1)
    const grossRevenueAccs = accounts.filter(a => a.parentId === 'grp-1.1' && a.isAnalytical);
    const grossRevLines: DRELineItem[] = grossRevenueAccs.map(acc => {
      const { monthly, total, titleIds } = getValuesForAccount(acc.id);
      return {
        id: acc.id,
        name: acc.name,
        code: acc.code,
        level: 2,
        groupId: 'h-1',
        parentHeaderId: 'h-1',
        valuesByMonth: monthly,
        totalYear: total,
        matchedTitleIds: titleIds
      };
    });
    const grossRevValues = sumArrays(grossRevLines.map(l => l.valuesByMonth));
    const grossRevTotal = grossRevValues.reduce((a, b) => a + b, 0);

    // 2. Deduções da Receita e Tributos sobre Faturamento (grp-1.2)
    const deducAccs = accounts.filter(a => a.parentId === 'grp-1.2' && a.isAnalytical);
    const deducLines: DRELineItem[] = deducAccs.map(acc => {
      const { monthly, total, titleIds } = getValuesForAccount(acc.id);
      return {
        id: acc.id,
        name: acc.name,
        code: acc.code,
        level: 2,
        groupId: 'h-2',
        parentHeaderId: 'h-2',
        valuesByMonth: monthly,
        totalYear: total,
        matchedTitleIds: titleIds
      };
    });
    const deducValues = sumArrays(deducLines.map(l => l.valuesByMonth));
    const deducTotal = deducValues.reduce((a, b) => a + b, 0);

    // (=) Receita Líquida = Receita Bruta - Deduções
    const netRevValues = subtractArrays(grossRevValues, deducValues);
    const netRevTotal = netRevValues.reduce((a, b) => a + b, 0);

    // 3. Custos dos Serviços Prestados (grp-2.1)
    const costAccs = accounts.filter(a => a.parentId === 'grp-2.1' && a.isAnalytical);
    const costLines: DRELineItem[] = costAccs.map(acc => {
      const { monthly, total, titleIds } = getValuesForAccount(acc.id);
      return {
        id: acc.id,
        name: acc.name,
        code: acc.code,
        level: 2,
        groupId: 'h-3',
        parentHeaderId: 'h-3',
        valuesByMonth: monthly,
        totalYear: total,
        matchedTitleIds: titleIds
      };
    });
    const costValues = sumArrays(costLines.map(l => l.valuesByMonth));
    const costTotal = costValues.reduce((a, b) => a + b, 0);

    // (=) Lucro Bruto = Receita Líquida - Custos
    const grossProfitValues = subtractArrays(netRevValues, costValues);
    const grossProfitTotal = grossProfitValues.reduce((a, b) => a + b, 0);

    // 4. Despesas Operacionais
    // 4.1 Despesas com Pessoal (grp-3.1)
    const personalAccs = accounts.filter(a => a.parentId === 'grp-3.1' && a.isAnalytical);
    const personalLines: DRELineItem[] = personalAccs.map(acc => {
      const { monthly, total, titleIds } = getValuesForAccount(acc.id);
      return {
        id: acc.id,
        name: acc.name,
        code: acc.code,
        level: 2,
        groupId: 'h-4',
        parentHeaderId: 'h-4.1',
        valuesByMonth: monthly,
        totalYear: total,
        matchedTitleIds: titleIds
      };
    });
    const personalValues = sumArrays(personalLines.map(l => l.valuesByMonth));

    // 4.2 Despesas Administrativas (grp-3.2)
    const adminAccs = accounts.filter(a => a.parentId === 'grp-3.2' && a.isAnalytical);
    const adminLines: DRELineItem[] = adminAccs.map(acc => {
      const { monthly, total, titleIds } = getValuesForAccount(acc.id);
      return {
        id: acc.id,
        name: acc.name,
        code: acc.code,
        level: 2,
        groupId: 'h-4',
        parentHeaderId: 'h-4.2',
        valuesByMonth: monthly,
        totalYear: total,
        matchedTitleIds: titleIds
      };
    });
    const adminValues = sumArrays(adminLines.map(l => l.valuesByMonth));

    // 4.3 Despesas Comerciais (grp-3.3)
    const commAccs = accounts.filter(a => a.parentId === 'grp-3.3' && a.isAnalytical);
    const commLines: DRELineItem[] = commAccs.map(acc => {
      const { monthly, total, titleIds } = getValuesForAccount(acc.id);
      return {
        id: acc.id,
        name: acc.name,
        code: acc.code,
        level: 2,
        groupId: 'h-4',
        parentHeaderId: 'h-4.3',
        valuesByMonth: monthly,
        totalYear: total,
        matchedTitleIds: titleIds
      };
    });
    const commValues = sumArrays(commLines.map(l => l.valuesByMonth));

    // Total Despesas Operacionais
    const opExpValues = sumArrays([personalValues, adminValues, commValues]);
    const opExpTotal = opExpValues.reduce((a, b) => a + b, 0);

    // (=) Resultado Operacional (EBITDA/LAJIR) = Lucro Bruto - Despesas Operacionais
    const opResultValues = subtractArrays(grossProfitValues, opExpValues);
    const opResultTotal = opResultValues.reduce((a, b) => a + b, 0);

    // 5. Resultado Financeiro (grp-4.1 Receitas - grp-4.2 Despesas)
    const finRevAccs = accounts.filter(a => a.parentId === 'grp-4.1' && a.isAnalytical);
    const finRevLines = finRevAccs.map(acc => {
      const { monthly, total, titleIds } = getValuesForAccount(acc.id);
      return { id: acc.id, name: acc.name, code: acc.code, level: 2, groupId: 'h-5', parentHeaderId: 'h-5.1', valuesByMonth: monthly, totalYear: total, matchedTitleIds: titleIds };
    });
    const finRevValues = sumArrays(finRevLines.map(l => l.valuesByMonth));

    const finExpAccs = accounts.filter(a => a.parentId === 'grp-4.2' && a.isAnalytical);
    const finExpLines = finExpAccs.map(acc => {
      const { monthly, total, titleIds } = getValuesForAccount(acc.id);
      return { id: acc.id, name: acc.name, code: acc.code, level: 2, groupId: 'h-5', parentHeaderId: 'h-5.2', valuesByMonth: monthly, totalYear: total, matchedTitleIds: titleIds };
    });
    const finExpValues = sumArrays(finExpLines.map(l => l.valuesByMonth));

    const netFinValues = subtractArrays(finRevValues, finExpValues);
    const netFinTotal = netFinValues.reduce((a, b) => a + b, 0);

    // (=) Resultado Antes dos Tributos (LAIR)
    const resultBeforeTaxes = opResultValues.map((v, i) => Math.round((v + netFinValues[i]) * 100) / 100);
    const resultBeforeTaxesTotal = resultBeforeTaxes.reduce((a, b) => a + b, 0);

    // 6. Tributos sobre o Lucro (grp-5)
    const taxAccs = accounts.filter(a => a.parentId === 'grp-5' && a.isAnalytical);
    const taxLines = taxAccs.map(acc => {
      const { monthly, total, titleIds } = getValuesForAccount(acc.id);
      return { id: acc.id, name: acc.name, code: acc.code, level: 2, groupId: 'h-6', parentHeaderId: 'h-6', valuesByMonth: monthly, totalYear: total, matchedTitleIds: titleIds };
    });
    const taxValues = sumArrays(taxLines.map(l => l.valuesByMonth));
    const taxTotal = taxValues.reduce((a, b) => a + b, 0);

    // (=) Resultado Líquido Gerencial
    const netResultValues = subtractArrays(resultBeforeTaxes, taxValues);
    const netResultTotal = netResultValues.reduce((a, b) => a + b, 0);

    // Assemble hierarchical lines structure
    const lines: DRELineItem[] = [
      // 1. Receita Bruta
      { 
        id: 'h-1', 
        name: 'RECEITA BRUTA DE SERVIÇOS', 
        level: 0, 
        isHeader: true, 
        groupId: 'h-1', 
        valuesByMonth: grossRevValues, 
        totalYear: grossRevTotal,
        matchedTitleIds: grossRevLines.flatMap(l => l.matchedTitleIds || [])
      },
      ...grossRevLines,

      // 2. Deduções
      { 
        id: 'h-2', 
        name: '(-) Deduções e Tributos sobre Faturamento', 
        level: 0, 
        isHeader: true, 
        groupId: 'h-2', 
        valuesByMonth: deducValues, 
        totalYear: deducTotal,
        matchedTitleIds: deducLines.flatMap(l => l.matchedTitleIds || [])
      },
      ...deducLines,

      // Summary Receita Líquida
      { id: 's-net-rev', name: '(=) RECEITA LÍQUIDA', level: 0, isSummary: true, valuesByMonth: netRevValues, totalYear: netRevTotal },

      // 3. Custos
      { 
        id: 'h-3', 
        name: '(-) Custos dos Serviços Prestados', 
        level: 0, 
        isHeader: true, 
        groupId: 'h-3', 
        valuesByMonth: costValues, 
        totalYear: costTotal,
        matchedTitleIds: costLines.flatMap(l => l.matchedTitleIds || [])
      },
      ...costLines,

      // Summary Lucro Bruto
      { id: 's-gross-profit', name: '(=) LUCRO BRUTO', level: 0, isSummary: true, valuesByMonth: grossProfitValues, totalYear: grossProfitTotal },

      // 4. Despesas Operacionais
      { 
        id: 'h-4', 
        name: '(-) Despesas Operacionais', 
        level: 0, 
        isHeader: true, 
        groupId: 'h-4', 
        valuesByMonth: opExpValues, 
        totalYear: opExpTotal,
        matchedTitleIds: [...personalLines, ...adminLines, ...commLines].flatMap(l => l.matchedTitleIds || [])
      },
      { 
        id: 'h-4.1', 
        name: 'Despesas com Pessoal', 
        level: 1, 
        isHeader: true, 
        groupId: 'h-4', 
        parentHeaderId: 'h-4', 
        valuesByMonth: personalValues, 
        totalYear: personalValues.reduce((a, b) => a + b, 0),
        matchedTitleIds: personalLines.flatMap(l => l.matchedTitleIds || [])
      },
      ...personalLines,
      { 
        id: 'h-4.2', 
        name: 'Despesas Administrativas', 
        level: 1, 
        isHeader: true, 
        groupId: 'h-4', 
        parentHeaderId: 'h-4', 
        valuesByMonth: adminValues, 
        totalYear: adminValues.reduce((a, b) => a + b, 0),
        matchedTitleIds: adminLines.flatMap(l => l.matchedTitleIds || [])
      },
      ...adminLines,
      { 
        id: 'h-4.3', 
        name: 'Despesas Comerciais', 
        level: 1, 
        isHeader: true, 
        groupId: 'h-4', 
        parentHeaderId: 'h-4', 
        valuesByMonth: commValues, 
        totalYear: commValues.reduce((a, b) => a + b, 0),
        matchedTitleIds: commLines.flatMap(l => l.matchedTitleIds || [])
      },
      ...commLines,

      // Summary Resultado Operacional
      { id: 's-op-result', name: '(=) RESULTADO OPERACIONAL', level: 0, isSummary: true, valuesByMonth: opResultValues, totalYear: opResultTotal },

      // 5. Resultado Financeiro
      { 
        id: 'h-5', 
        name: '(+/-) Resultado Financeiro', 
        level: 0, 
        isHeader: true, 
        groupId: 'h-5', 
        valuesByMonth: netFinValues, 
        totalYear: netFinTotal,
        matchedTitleIds: [...finRevLines, ...finExpLines].flatMap(l => l.matchedTitleIds || [])
      },
      { 
        id: 'h-5.1', 
        name: '(+) Receitas Financeiras', 
        level: 1, 
        isHeader: true, 
        groupId: 'h-5', 
        parentHeaderId: 'h-5', 
        valuesByMonth: finRevValues, 
        totalYear: finRevValues.reduce((a, b) => a + b, 0),
        matchedTitleIds: finRevLines.flatMap(l => l.matchedTitleIds || [])
      },
      ...finRevLines,
      { 
        id: 'h-5.2', 
        name: '(-) Despesas Financeiras', 
        level: 1, 
        isHeader: true, 
        groupId: 'h-5', 
        parentHeaderId: 'h-5', 
        valuesByMonth: finExpValues, 
        totalYear: finExpValues.reduce((a, b) => a + b, 0),
        matchedTitleIds: finExpLines.flatMap(l => l.matchedTitleIds || [])
      },
      ...finExpLines,

      // Summary LAIR
      { id: 's-lair', name: '(=) RESULTADO ANTES DOS TRIBUTOS', level: 0, isSummary: true, valuesByMonth: resultBeforeTaxes, totalYear: resultBeforeTaxesTotal },

      // 6. Tributos sobre Lucro
      { 
        id: 'h-6', 
        name: '(-) Tributos sobre o Lucro', 
        level: 0, 
        isHeader: true, 
        groupId: 'h-6', 
        valuesByMonth: taxValues, 
        totalYear: taxTotal,
        matchedTitleIds: taxLines.flatMap(l => l.matchedTitleIds || [])
      },
      ...taxLines,

      // Final Summary
      { id: 's-final', name: '(=) RESULTADO LÍQUIDO GERENCIAL', level: 0, isSummary: true, valuesByMonth: netResultValues, totalYear: netResultTotal }
    ];

    return {
      months,
      lines,
      netResults: netResultValues,
      totalNetResult: netResultTotal
    };
  }

  /**
   * GENERATE DIRECT CASH FLOW (FLUXO DE CAIXA DIRETO - CPC 03)
   * Realized + Projected support across 12 months
   */
  public static generateCashFlow(year: number, mode: 'REALIZADO' | 'PROJETADO' | 'CONSOLIDADO' = 'REALIZADO'): {
    months: string[];
    lines: CashFlowLineItem[];
    finalBalances: number[];
  } {
    const movements = storage.getMovements().filter(m => !m.isReversed);
    const titles = storage.getTitles().filter(t => t.documentState === 'CONFIRMADO' && t.balancePrincipal > 0);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Initial balance at Jan 1st of the year
    const initialBalanceJan = FinancialEngine.getConsolidatedCashBalance(`${year}-01-01`);

    const opInflows = new Array(12).fill(0);
    const opOutflows = new Array(12).fill(0);
    const invInflows = new Array(12).fill(0);
    const invOutflows = new Array(12).fill(0);
    const finInflows = new Array(12).fill(0);
    const finOutflows = new Array(12).fill(0);

    // 1. Realized movements
    if (mode === 'REALIZADO' || mode === 'CONSOLIDADO') {
      for (const mov of movements) {
        if (!mov.date.startsWith(`${year}-`)) continue;
        if (mov.cashFlowCategory === 'TRANSFERENCIA_INTERNA') continue; // Internal transfer has zero consolidated cash effect

        const monthIdx = parseInt(mov.date.substring(5, 7), 10) - 1;
        if (monthIdx < 0 || monthIdx > 11) continue;

        if (mov.cashFlowCategory === 'OPERACIONAL') {
          if (mov.direction === 'ENTRADA') opInflows[monthIdx] += mov.amount;
          else opOutflows[monthIdx] += mov.amount;
        } else if (mov.cashFlowCategory === 'INVESTIMENTO') {
          if (mov.direction === 'ENTRADA') invInflows[monthIdx] += mov.amount;
          else invOutflows[monthIdx] += mov.amount;
        } else if (mov.cashFlowCategory === 'FINANCIAMENTO') {
          if (mov.direction === 'ENTRADA') finInflows[monthIdx] += mov.amount;
          else finOutflows[monthIdx] += mov.amount;
        }
      }
    }

    // 2. Projected (remaining balance of open titles based on expectedCashDate)
    if (mode === 'PROJETADO' || mode === 'CONSOLIDADO') {
      for (const title of titles) {
        const targetDate = title.expectedCashDate || title.dueDate;
        if (!targetDate.startsWith(`${year}-`)) continue;

        const monthIdx = parseInt(targetDate.substring(5, 7), 10) - 1;
        if (monthIdx < 0 || monthIdx > 11) continue;

        // Determine category: default is OPERACIONAL, unless account is Investment/Financing
        const accounts = storage.getChartAccounts();
        const acc = accounts.find(a => a.id === title.accountId);
        const cat = acc ? acc.cashFlowCategory : 'OPERACIONAL';

        if (cat === 'INVESTIMENTO') {
          if (title.type === 'RECEBER') invInflows[monthIdx] += title.balancePrincipal;
          else invOutflows[monthIdx] += title.balancePrincipal;
        } else if (cat === 'FINANCIAMENTO') {
          if (title.type === 'RECEBER') finInflows[monthIdx] += title.balancePrincipal;
          else finOutflows[monthIdx] += title.balancePrincipal;
        } else {
          if (title.type === 'RECEBER') opInflows[monthIdx] += title.balancePrincipal;
          else opOutflows[monthIdx] += title.balancePrincipal;
        }
      }
    }

    // Calculations
    const netOp = opInflows.map((v, i) => Math.round((v - opOutflows[i]) * 100) / 100);
    const netInv = invInflows.map((v, i) => Math.round((v - invOutflows[i]) * 100) / 100);
    const netFin = finInflows.map((v, i) => Math.round((v - finOutflows[i]) * 100) / 100);

    const netVariations = netOp.map((v, i) => Math.round((v + netInv[i] + netFin[i]) * 100) / 100);

    // Initial balances roll-over month by month
    const initialBalances = new Array(12).fill(0);
    const finalBalances = new Array(12).fill(0);

    let currentBalance = initialBalanceJan;
    for (let m = 0; m < 12; m++) {
      initialBalances[m] = currentBalance;
      currentBalance = Math.round((currentBalance + netVariations[m]) * 100) / 100;
      finalBalances[m] = currentBalance;
    }

    const lines: CashFlowLineItem[] = [
      {
        id: 'cf-initial',
        name: '(=) SALDO INICIAL DE CAIXA',
        level: 0,
        isSummary: true,
        valuesByMonth: initialBalances,
        totalYear: initialBalanceJan
      },
      // 1. Operacional
      {
        id: 'cf-op-header',
        name: 'ATIVIDADES OPERACIONAIS',
        level: 0,
        isHeader: true,
        valuesByMonth: netOp,
        totalYear: netOp.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-op-in',
        name: '(+) Recebimentos Operacionais de Clientes',
        level: 1,
        valuesByMonth: opInflows,
        totalYear: opInflows.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-op-out',
        name: '(-) Pagamentos Operacionais (Custos e Despesas)',
        level: 1,
        valuesByMonth: opOutflows,
        totalYear: opOutflows.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-op-net',
        name: '(=) Caixa Gerado / (Consumido) pela Operação',
        level: 0,
        isSummary: true,
        valuesByMonth: netOp,
        totalYear: netOp.reduce((a, b) => a + b, 0)
      },

      // 2. Investimentos
      {
        id: 'cf-inv-header',
        name: 'ATIVIDADES DE INVESTIMENTO',
        level: 0,
        isHeader: true,
        valuesByMonth: netInv,
        totalYear: netInv.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-inv-in',
        name: '(+) Entradas de Investimentos / Resgate de Aplicações',
        level: 1,
        valuesByMonth: invInflows,
        totalYear: invInflows.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-inv-out',
        name: '(-) Aquisição de Ativos e Aplicações Financeiras',
        level: 1,
        valuesByMonth: invOutflows,
        totalYear: invOutflows.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-inv-net',
        name: '(=) Fluxo Líquido das Atividades de Investimento',
        level: 0,
        isSummary: true,
        valuesByMonth: netInv,
        totalYear: netInv.reduce((a, b) => a + b, 0)
      },

      // 3. Financiamento
      {
        id: 'cf-fin-header',
        name: 'ATIVIDADES DE FINANCIAMENTO',
        level: 0,
        isHeader: true,
        valuesByMonth: netFin,
        totalYear: netFin.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-fin-in',
        name: '(+) Aportes de Capital / Empréstimos Recebidos',
        level: 1,
        valuesByMonth: finInflows,
        totalYear: finInflows.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-fin-out',
        name: '(-) Amortização de Empréstimos / Distribuição de Lucros',
        level: 1,
        valuesByMonth: finOutflows,
        totalYear: finOutflows.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-fin-net',
        name: '(=) Fluxo Líquido das Atividades de Financiamento',
        level: 0,
        isSummary: true,
        valuesByMonth: netFin,
        totalYear: netFin.reduce((a, b) => a + b, 0)
      },

      // 4. Variação Líquida e Saldo Final
      {
        id: 'cf-net-variation',
        name: '(=) VARIAÇÃO LÍQUIDA DE CAIXA NO PERÍODO',
        level: 0,
        isSummary: true,
        valuesByMonth: netVariations,
        totalYear: netVariations.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-final-balance',
        name: '(=) SALDO FINAL DE CAIXA E EQUIVALENTES',
        level: 0,
        isSummary: true,
        valuesByMonth: finalBalances,
        totalYear: finalBalances[11] // In year-end, final balance is the closing balance, not a sum!
      }
    ];

    return {
      months,
      lines,
      finalBalances
    };
  }
}
