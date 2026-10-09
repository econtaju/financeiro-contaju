import { ChartAccount, FinancialTitle, FinancialMovement } from '../types';
import { storage } from './storageService';
import { FinancialEngine } from './financialEngine';

export type DRERegime = 'COMPETENCIA' | 'CAIXA' | 'COMPARATIVO';

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
  valuesByMonth: number[]; // 12 months: index 0 = Jan, ..., index 11 = Dec (regime ativo ou competência)
  totalYear: number;
  // Campos comparativos e regime de caixa
  cashValuesByMonth?: number[]; // Realizado financeiramente por caixa nos 12 meses
  cashTotalYear?: number;
  gapValuesByMonth?: number[]; // Variação mês a mês (Competência - Caixa)
  gapTotalYear?: number;
  realizationRates?: number[]; // Taxa % de realização financeira nos 12 meses
  totalRealizationRate?: number; // Taxa % anual de realização
  matchedTitleIds?: string[];
  titles?: FinancialTitle[];
}

export type DREMatrix = {
  months: string[];
  lines: DRELineItem[];
  netResults: number[];
  totalNetResult: number;
  regime?: DRERegime;
  cashNetResults?: number[];
  totalCashNetResult?: number;
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
   * GENERATE DRE GERENCIAL MULTI-REGIME (COMPETÊNCIA, CAIXA OU COMPARATIVO)
   * Apura os 12 meses do ano e total anual sob regime de competência econômica ou efetivação financeira em caixa.
   */
  public static generateDRE(
    year: number,
    regime: DRERegime = 'COMPETENCIA'
  ): DREMatrix {
    const titles = storage.getTitles().filter(t => t.documentState !== 'CANCELADO');
    const accounts = storage.getChartAccounts();
    const allSettlements = storage.getSettlements().filter(s => !s.isReversed);

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const allSales = storage.getSales().filter(s => s.status !== 'CANCELADA');

    // Helper para apurar competência e caixa de cada conta analítica
    const getValuesForAccount = (accId: string): {
      monthlyComp: number[];
      totalComp: number;
      monthlyCash: number[];
      totalCash: number;
      titleIds: string[];
    } => {
      const monthlyComp = new Array(12).fill(0);
      const monthlyCash = new Array(12).fill(0);
      const titleIds: string[] = [];

      const isTargetAccount = (title: FinancialTitle): boolean => {
        const tAccId = title.accountId || (title as any).chartAccountId;
        if (tAccId === accId) return true;
        // Compatibilidade com títulos a receber legados ou sem conta apontando para acc-1.1.01
        if (accId === 'acc-1.1.01' && title.type === 'RECEBER' && (!tAccId || tAccId === 'acc-rec-01' || tAccId === 'acc-srv-1')) {
          return true;
        }
        return false;
      };

      // 1. Competência (conforme competence YYYY-MM ou corte de mês)
      for (let m = 0; m < 12; m++) {
        const compStr = `${year}-${(m + 1).toString().padStart(2, '0')}`;
        const matchingTitles = titles.filter(t => {
          if (!isTargetAccount(t)) return false;
          const tComp = (t.competence ? t.competence.substring(0, 7) : (t.dueDate ? t.dueDate.substring(0, 7) : ''));
          return tComp === compStr;
        });

        for (const title of matchingTitles) {
          if (!titleIds.includes(title.id)) titleIds.push(title.id);
          monthlyComp[m] += title.originalAmount || 0;
        }

        // Conciliação de Vendas Confirmadas da competência:
        // Se uma venda confirmada existir para o mês, mas não tiver títulos no array de títulos somados, computar o faturamento
        for (const sale of allSales) {
          const saleComp = (sale.competence || sale.date || '').substring(0, 7);
          if (saleComp !== compStr) continue;

          const saleLinkedTitles = titles.filter(t => 
            t.saleId === sale.id || 
            (sale.titleIds && sale.titleIds.includes(t.id)) ||
            (sale.contractId && (t.originId === sale.contractId || t.contractId === sale.contractId) && (t.competence?.substring(0, 7) === compStr))
          );

          // Se nenhum título da venda estiver registrado em titles, computar pelos itens da venda
          if (saleLinkedTitles.length === 0) {
            const saleItems = sale.items && sale.items.length > 0 ? sale.items : [
              {
                id: `item-${sale.id}`,
                unitPrice: sale.netTotal || sale.grossTotal || 0,
                total: sale.netTotal || sale.grossTotal || 0,
                accountId: accId
              }
            ];

            for (const item of saleItems) {
              const itemAccId = item.accountId || 'acc-1.1.01';
              const matchesThisAcc = itemAccId === accId || (accId === 'acc-1.1.01' && (!itemAccId || itemAccId === 'acc-rec-01'));
              if (matchesThisAcc) {
                monthlyComp[m] += item.total || item.unitPrice || 0;
              }
            }
          }
        }

        monthlyComp[m] = Math.round(monthlyComp[m] * 100) / 100;
      }

      // 2. Caixa (conforme quitações financeiras efetivadas no mês do ano)
      for (let m = 0; m < 12; m++) {
        const monthStr = `${year}-${(m + 1).toString().padStart(2, '0')}`;

        for (const title of titles) {
          if (!isTargetAccount(title)) continue;

          let monthSettled = 0;
          const matchingSettlements = allSettlements.filter(s => s.titleId === title.id);

          if (matchingSettlements.length > 0) {
            for (const s of matchingSettlements) {
              const sDate = s.settlementDate || '';
              if (sDate.startsWith(monthStr)) {
                monthSettled += s.components?.principalSettled || s.components?.netFinancialAmount || 0;
                if (!titleIds.includes(title.id)) titleIds.push(title.id);
              }
            }
          } else {
            const payDate = (title as any).actualPaymentDate || (title as any).paymentDate || '';
            if (payDate && payDate.startsWith(monthStr) && (title.settledPrincipal || 0) > 0) {
              monthSettled += title.settledPrincipal;
              if (!titleIds.includes(title.id)) titleIds.push(title.id);
            } else if (!payDate && title.settlementState === 'LIQUIDADO' && (title.dueDate || '').startsWith(monthStr)) {
              monthSettled += title.settledPrincipal || title.originalAmount || 0;
              if (!titleIds.includes(title.id)) titleIds.push(title.id);
            }
          }

          monthlyCash[m] += monthSettled;
        }
        monthlyCash[m] = Math.round(monthlyCash[m] * 100) / 100;
      }

      const totalComp = Math.round(monthlyComp.reduce((a, b) => a + b, 0) * 100) / 100;
      const totalCash = Math.round(monthlyCash.reduce((a, b) => a + b, 0) * 100) / 100;

      return { monthlyComp, totalComp, monthlyCash, totalCash, titleIds };
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

    // Helper construtor de linha DRE com preenchimento completo de métricas comparativas
    const createDRELine = (
      id: string,
      name: string,
      code: string | undefined,
      level: number,
      groupId: string,
      parentHeaderId: string | undefined,
      compValues: number[],
      compTotal: number,
      cashValues: number[],
      cashTotal: number,
      titleIds?: string[],
      isHeader = false,
      isSummary = false
    ): DRELineItem => {
      const activeValues = regime === 'CAIXA' ? cashValues : compValues;
      const activeTotal = regime === 'CAIXA' ? cashTotal : compTotal;

      const gapValues = compValues.map((c, i) => Math.round((c - (cashValues[i] || 0)) * 100) / 100);
      const gapTotal = Math.round((compTotal - cashTotal) * 100) / 100;

      const realizationRates = compValues.map((c, i) => {
        const cashVal = cashValues[i] || 0;
        if (c <= 0 && cashVal <= 0) return 100;
        if (c <= 0 && cashVal > 0) return 100;
        return Math.round(Math.min((cashVal / c) * 100, 999) * 10) / 10;
      });

      const totalRealizationRate = compTotal > 0
        ? Math.round(Math.min((cashTotal / compTotal) * 100, 999) * 10) / 10
        : 100;

      return {
        id,
        name,
        code,
        level,
        groupId,
        parentHeaderId,
        isHeader,
        isSummary,
        valuesByMonth: activeValues,
        totalYear: activeTotal,
        cashValuesByMonth: cashValues,
        cashTotalYear: cashTotal,
        gapValuesByMonth: gapValues,
        gapTotalYear: gapTotal,
        realizationRates,
        totalRealizationRate,
        matchedTitleIds: titleIds
      };
    };

    // 1. Receita Bruta de Serviços (grp-1.1 ou nature/código correspondente)
    const grossRevenueAccs = accounts.filter(a => 
      (a.parentId === 'grp-1.1' || a.nature === 'RECEITA_SERVICO' || (a.code && a.code.startsWith('1.1'))) && 
      a.isAnalytical
    );
    const grossRevLines: DRELineItem[] = grossRevenueAccs.map(acc => {
      const { monthlyComp, totalComp, monthlyCash, totalCash, titleIds } = getValuesForAccount(acc.id);
      return createDRELine(acc.id, acc.name, acc.code, 2, 'h-1', 'h-1', monthlyComp, totalComp, monthlyCash, totalCash, titleIds);
    });
    const grossRevCompValues = sumArrays(grossRevLines.map(l => l.gapValuesByMonth ? l.valuesByMonth : l.valuesByMonth));
    const grossRevCompTotal = grossRevLines.reduce((acc, l) => acc + (regime === 'CAIXA' ? (l.cashTotalYear || 0) : l.totalYear), 0);
    const grossRevCashValues = sumArrays(grossRevLines.map(l => l.cashValuesByMonth || []));
    const grossRevCashTotal = grossRevLines.reduce((acc, l) => acc + (l.cashTotalYear || 0), 0);

    // 2. Deduções da Receita (grp-1.2)
    const deducAccs = accounts.filter(a => 
      (a.parentId === 'grp-1.2' || a.nature === 'DEDUCAO_RECEITA' || (a.code && a.code.startsWith('1.2'))) && 
      a.isAnalytical
    );
    const deducLines: DRELineItem[] = deducAccs.map(acc => {
      const { monthlyComp, totalComp, monthlyCash, totalCash, titleIds } = getValuesForAccount(acc.id);
      return createDRELine(acc.id, acc.name, acc.code, 2, 'h-2', 'h-2', monthlyComp, totalComp, monthlyCash, totalCash, titleIds);
    });
    const deducCompValues = sumArrays(deducLines.map(l => regime === 'CAIXA' ? (l.cashValuesByMonth || []) : l.valuesByMonth));
    const deducCompTotal = deducLines.reduce((acc, l) => acc + (regime === 'CAIXA' ? (l.cashTotalYear || 0) : l.totalYear), 0);
    const deducCashValues = sumArrays(deducLines.map(l => l.cashValuesByMonth || []));
    const deducCashTotal = deducLines.reduce((acc, l) => acc + (l.cashTotalYear || 0), 0);

    // (=) Receita Líquida
    const netRevCompValues = subtractArrays(grossRevCompValues, deducCompValues);
    const netRevCompTotal = Math.round((grossRevCompTotal - deducCompTotal) * 100) / 100;
    const netRevCashValues = subtractArrays(grossRevCashValues, deducCashValues);
    const netRevCashTotal = Math.round((grossRevCashTotal - deducCashTotal) * 100) / 100;

    // 3. Custos dos Serviços Prestados (grp-2 ou grp-2.1)
    const costAccs = accounts.filter(a => 
      (a.parentId === 'grp-2.1' || a.parentId === 'grp-2' || a.nature === 'CUSTO_SERVICO' || (a.code && a.code.startsWith('2'))) && 
      a.isAnalytical
    );
    const costLines: DRELineItem[] = costAccs.map(acc => {
      const { monthlyComp, totalComp, monthlyCash, totalCash, titleIds } = getValuesForAccount(acc.id);
      return createDRELine(acc.id, acc.name, acc.code, 2, 'h-3', 'h-3', monthlyComp, totalComp, monthlyCash, totalCash, titleIds);
    });
    const costCompValues = sumArrays(costLines.map(l => regime === 'CAIXA' ? (l.cashValuesByMonth || []) : l.valuesByMonth));
    const costCompTotal = costLines.reduce((acc, l) => acc + (regime === 'CAIXA' ? (l.cashTotalYear || 0) : l.totalYear), 0);
    const costCashValues = sumArrays(costLines.map(l => l.cashValuesByMonth || []));
    const costCashTotal = costLines.reduce((acc, l) => acc + (l.cashTotalYear || 0), 0);

    // (=) Lucro Bruto
    const grossProfitCompValues = subtractArrays(netRevCompValues, costCompValues);
    const grossProfitCompTotal = Math.round((netRevCompTotal - costCompTotal) * 100) / 100;
    const grossProfitCashValues = subtractArrays(netRevCashValues, costCashValues);
    const grossProfitCashTotal = Math.round((netRevCashTotal - costCashTotal) * 100) / 100;

    // 4. Despesas Operacionais
    // 4.1 Despesas com Pessoal (grp-3.1)
    const personalAccs = accounts.filter(a => 
      (a.parentId === 'grp-3.1' || a.nature === 'DESPESA_PESSOAL' || (a.code && a.code.startsWith('3.1'))) && 
      a.isAnalytical
    );
    const personalLines: DRELineItem[] = personalAccs.map(acc => {
      const { monthlyComp, totalComp, monthlyCash, totalCash, titleIds } = getValuesForAccount(acc.id);
      return createDRELine(acc.id, acc.name, acc.code, 2, 'h-4', 'h-4.1', monthlyComp, totalComp, monthlyCash, totalCash, titleIds);
    });
    const personalCompValues = sumArrays(personalLines.map(l => regime === 'CAIXA' ? (l.cashValuesByMonth || []) : l.valuesByMonth));
    const personalCompTotal = personalLines.reduce((acc, l) => acc + (regime === 'CAIXA' ? (l.cashTotalYear || 0) : l.totalYear), 0);
    const personalCashValues = sumArrays(personalLines.map(l => l.cashValuesByMonth || []));
    const personalCashTotal = personalLines.reduce((acc, l) => acc + (l.cashTotalYear || 0), 0);

    // 4.2 Despesas Administrativas (grp-3.2)
    const adminAccs = accounts.filter(a => 
      (a.parentId === 'grp-3.2' || a.nature === 'DESPESA_ADMINISTRATIVA' || (a.code && a.code.startsWith('3.2'))) && 
      a.isAnalytical
    );
    const adminLines: DRELineItem[] = adminAccs.map(acc => {
      const { monthlyComp, totalComp, monthlyCash, totalCash, titleIds } = getValuesForAccount(acc.id);
      return createDRELine(acc.id, acc.name, acc.code, 2, 'h-4', 'h-4.2', monthlyComp, totalComp, monthlyCash, totalCash, titleIds);
    });
    const adminCompValues = sumArrays(adminLines.map(l => regime === 'CAIXA' ? (l.cashValuesByMonth || []) : l.valuesByMonth));
    const adminCompTotal = adminLines.reduce((acc, l) => acc + (regime === 'CAIXA' ? (l.cashTotalYear || 0) : l.totalYear), 0);
    const adminCashValues = sumArrays(adminLines.map(l => l.cashValuesByMonth || []));
    const adminCashTotal = adminLines.reduce((acc, l) => acc + (l.cashTotalYear || 0), 0);

    // 4.3 Despesas Comerciais (grp-3.3)
    const commAccs = accounts.filter(a => 
      (a.parentId === 'grp-3.3' || a.nature === 'DESPESA_COMERCIAL' || (a.code && a.code.startsWith('3.3'))) && 
      a.isAnalytical
    );
    const commLines: DRELineItem[] = commAccs.map(acc => {
      const { monthlyComp, totalComp, monthlyCash, totalCash, titleIds } = getValuesForAccount(acc.id);
      return createDRELine(acc.id, acc.name, acc.code, 2, 'h-4', 'h-4.3', monthlyComp, totalComp, monthlyCash, totalCash, titleIds);
    });
    const commCompValues = sumArrays(commLines.map(l => regime === 'CAIXA' ? (l.cashValuesByMonth || []) : l.valuesByMonth));
    const commCompTotal = commLines.reduce((acc, l) => acc + (regime === 'CAIXA' ? (l.cashTotalYear || 0) : l.totalYear), 0);
    const commCashValues = sumArrays(commLines.map(l => l.cashValuesByMonth || []));
    const commCashTotal = commLines.reduce((acc, l) => acc + (l.cashTotalYear || 0), 0);

    // Total Despesas Operacionais
    const opExpCompValues = sumArrays([personalCompValues, adminCompValues, commCompValues]);
    const opExpCompTotal = Math.round((personalCompTotal + adminCompTotal + commCompTotal) * 100) / 100;
    const opExpCashValues = sumArrays([personalCashValues, adminCashValues, commCashValues]);
    const opExpCashTotal = Math.round((personalCashTotal + adminCashTotal + commCashTotal) * 100) / 100;

    // (=) Resultado Operacional (EBITDA/LAJIR)
    const opResultCompValues = subtractArrays(grossProfitCompValues, opExpCompValues);
    const opResultCompTotal = Math.round((grossProfitCompTotal - opExpCompTotal) * 100) / 100;
    const opResultCashValues = subtractArrays(grossProfitCashValues, opExpCashValues);
    const opResultCashTotal = Math.round((grossProfitCashTotal - opExpCashTotal) * 100) / 100;

    // 5. Resultado Financeiro
    const finRevAccs = accounts.filter(a => 
      (a.parentId === 'grp-4.1' || a.nature === 'RECEITA_FINANCEIRA' || (a.code && a.code.startsWith('4.1'))) && 
      a.isAnalytical
    );
    const finRevLines = finRevAccs.map(acc => {
      const { monthlyComp, totalComp, monthlyCash, totalCash, titleIds } = getValuesForAccount(acc.id);
      return createDRELine(acc.id, acc.name, acc.code, 2, 'h-5', 'h-5.1', monthlyComp, totalComp, monthlyCash, totalCash, titleIds);
    });
    const finRevCompValues = sumArrays(finRevLines.map(l => regime === 'CAIXA' ? (l.cashValuesByMonth || []) : l.valuesByMonth));
    const finRevCompTotal = finRevLines.reduce((acc, l) => acc + (regime === 'CAIXA' ? (l.cashTotalYear || 0) : l.totalYear), 0);
    const finRevCashValues = sumArrays(finRevLines.map(l => l.cashValuesByMonth || []));
    const finRevCashTotal = finRevLines.reduce((acc, l) => acc + (l.cashTotalYear || 0), 0);

    const finExpAccs = accounts.filter(a => 
      (a.parentId === 'grp-4.2' || a.nature === 'DESPESA_FINANCEIRA' || (a.code && a.code.startsWith('4.2'))) && 
      a.isAnalytical
    );
    const finExpLines = finExpAccs.map(acc => {
      const { monthlyComp, totalComp, monthlyCash, totalCash, titleIds } = getValuesForAccount(acc.id);
      return createDRELine(acc.id, acc.name, acc.code, 2, 'h-5', 'h-5.2', monthlyComp, totalComp, monthlyCash, totalCash, titleIds);
    });
    const finExpCompValues = sumArrays(finExpLines.map(l => regime === 'CAIXA' ? (l.cashValuesByMonth || []) : l.valuesByMonth));
    const finExpCompTotal = finExpLines.reduce((acc, l) => acc + (regime === 'CAIXA' ? (l.cashTotalYear || 0) : l.totalYear), 0);
    const finExpCashValues = sumArrays(finExpLines.map(l => l.cashValuesByMonth || []));
    const finExpCashTotal = finExpLines.reduce((acc, l) => acc + (l.cashTotalYear || 0), 0);

    const netFinCompValues = subtractArrays(finRevCompValues, finExpCompValues);
    const netFinCompTotal = Math.round((finRevCompTotal - finExpCompTotal) * 100) / 100;
    const netFinCashValues = subtractArrays(finRevCashValues, finExpCashValues);
    const netFinCashTotal = Math.round((finRevCashTotal - finExpCashTotal) * 100) / 100;

    // (=) Resultado Antes dos Tributos (LAIR)
    const resultBeforeTaxesComp = opResultCompValues.map((v, i) => Math.round((v + netFinCompValues[i]) * 100) / 100);
    const resultBeforeTaxesCompTotal = Math.round((opResultCompTotal + netFinCompTotal) * 100) / 100;
    const resultBeforeTaxesCash = opResultCashValues.map((v, i) => Math.round((v + netFinCashValues[i]) * 100) / 100);
    const resultBeforeTaxesCashTotal = Math.round((opResultCashTotal + netFinCashTotal) * 100) / 100;

    // 6. Tributos sobre o Lucro (grp-5)
    const taxAccs = accounts.filter(a => 
      (a.parentId === 'grp-5' || a.nature === 'TRIBUTO_LUCRO' || (a.code && a.code.startsWith('5'))) && 
      a.isAnalytical
    );
    const taxLines = taxAccs.map(acc => {
      const { monthlyComp, totalComp, monthlyCash, totalCash, titleIds } = getValuesForAccount(acc.id);
      return createDRELine(acc.id, acc.name, acc.code, 2, 'h-6', 'h-6', monthlyComp, totalComp, monthlyCash, totalCash, titleIds);
    });
    const taxCompValues = sumArrays(taxLines.map(l => regime === 'CAIXA' ? (l.cashValuesByMonth || []) : l.valuesByMonth));
    const taxCompTotal = taxLines.reduce((acc, l) => acc + (regime === 'CAIXA' ? (l.cashTotalYear || 0) : l.totalYear), 0);
    const taxCashValues = sumArrays(taxLines.map(l => l.cashValuesByMonth || []));
    const taxCashTotal = taxLines.reduce((acc, l) => acc + (l.cashTotalYear || 0), 0);

    // (=) Resultado Líquido Gerencial
    const netResultCompValues = subtractArrays(resultBeforeTaxesComp, taxCompValues);
    const netResultCompTotal = Math.round((resultBeforeTaxesCompTotal - taxCompTotal) * 100) / 100;
    const netResultCashValues = subtractArrays(resultBeforeTaxesCash, taxCashValues);
    const netResultCashTotal = Math.round((resultBeforeTaxesCashTotal - taxCashTotal) * 100) / 100;

    // Montagem hierárquica das linhas oficiais da DRE
    const lines: DRELineItem[] = [
      // 1. Receita Bruta
      createDRELine(
        'h-1',
        'RECEITA BRUTA DE SERVIÇOS',
        undefined,
        0,
        'h-1',
        undefined,
        grossRevCompValues,
        grossRevCompTotal,
        grossRevCashValues,
        grossRevCashTotal,
        grossRevLines.flatMap(l => l.matchedTitleIds || []),
        true
      ),
      ...grossRevLines,

      // 2. Deduções
      createDRELine(
        'h-2',
        '(-) Deduções e Tributos sobre Faturamento',
        undefined,
        0,
        'h-2',
        undefined,
        deducCompValues,
        deducCompTotal,
        deducCashValues,
        deducCashTotal,
        deducLines.flatMap(l => l.matchedTitleIds || []),
        true
      ),
      ...deducLines,

      // Summary Receita Líquida
      createDRELine(
        's-net-rev',
        '(=) RECEITA LÍQUIDA',
        undefined,
        0,
        'h-1',
        undefined,
        netRevCompValues,
        netRevCompTotal,
        netRevCashValues,
        netRevCashTotal,
        undefined,
        false,
        true
      ),

      // 3. Custos dos Serviços Prestados
      createDRELine(
        'h-3',
        '(-) Custos dos Serviços Prestados',
        undefined,
        0,
        'h-3',
        undefined,
        costCompValues,
        costCompTotal,
        costCashValues,
        costCashTotal,
        costLines.flatMap(l => l.matchedTitleIds || []),
        true
      ),
      ...costLines,

      // Summary Lucro Bruto
      createDRELine(
        's-gross-profit',
        '(=) LUCRO BRUTO',
        undefined,
        0,
        'h-3',
        undefined,
        grossProfitCompValues,
        grossProfitCompTotal,
        grossProfitCashValues,
        grossProfitCashTotal,
        undefined,
        false,
        true
      ),

      // 4. Despesas Operacionais
      createDRELine(
        'h-4',
        '(-) Despesas Operacionais',
        undefined,
        0,
        'h-4',
        undefined,
        opExpCompValues,
        opExpCompTotal,
        opExpCashValues,
        opExpCashTotal,
        [...personalLines, ...adminLines, ...commLines].flatMap(l => l.matchedTitleIds || []),
        true
      ),
      createDRELine(
        'h-4.1',
        'Despesas com Pessoal',
        undefined,
        1,
        'h-4',
        'h-4',
        personalCompValues,
        personalCompTotal,
        personalCashValues,
        personalCashTotal,
        personalLines.flatMap(l => l.matchedTitleIds || []),
        true
      ),
      ...personalLines,

      createDRELine(
        'h-4.2',
        'Despesas Administrativas',
        undefined,
        1,
        'h-4',
        'h-4',
        adminCompValues,
        adminCompTotal,
        adminCashValues,
        adminCashTotal,
        adminLines.flatMap(l => l.matchedTitleIds || []),
        true
      ),
      ...adminLines,

      createDRELine(
        'h-4.3',
        'Despesas Comerciais',
        undefined,
        1,
        'h-4',
        'h-4',
        commCompValues,
        commCompTotal,
        commCashValues,
        commCashTotal,
        commLines.flatMap(l => l.matchedTitleIds || []),
        true
      ),
      ...commLines,

      // Summary Resultado Operacional
      createDRELine(
        's-op-result',
        '(=) RESULTADO OPERACIONAL (EBITDA/LAJIDA)',
        undefined,
        0,
        'h-4',
        undefined,
        opResultCompValues,
        opResultCompTotal,
        opResultCashValues,
        opResultCashTotal,
        undefined,
        false,
        true
      ),

      // 5. Resultado Financeiro
      createDRELine(
        'h-5',
        '(+/-) Resultado Financeiro Líquido',
        undefined,
        0,
        'h-5',
        undefined,
        netFinCompValues,
        netFinCompTotal,
        netFinCashValues,
        netFinCashTotal,
        [...finRevLines, ...finExpLines].flatMap(l => l.matchedTitleIds || []),
        true
      ),
      createDRELine(
        'h-5.1',
        '(+) Receitas Financeiras',
        undefined,
        1,
        'h-5',
        'h-5',
        finRevCompValues,
        finRevCompTotal,
        finRevCashValues,
        finRevCashTotal,
        finRevLines.flatMap(l => l.matchedTitleIds || []),
        true
      ),
      ...finRevLines,

      createDRELine(
        'h-5.2',
        '(-) Despesas Financeiras',
        undefined,
        1,
        'h-5',
        'h-5',
        finExpCompValues,
        finExpCompTotal,
        finExpCashValues,
        finExpCashTotal,
        finExpLines.flatMap(l => l.matchedTitleIds || []),
        true
      ),
      ...finExpLines,

      // Summary LAIR
      createDRELine(
        's-lair',
        '(=) RESULTADO ANTES DOS TRIBUTOS (LAIR)',
        undefined,
        0,
        'h-5',
        undefined,
        resultBeforeTaxesComp,
        resultBeforeTaxesCompTotal,
        resultBeforeTaxesCash,
        resultBeforeTaxesCashTotal,
        undefined,
        false,
        true
      ),

      // 6. Tributos sobre Lucro
      createDRELine(
        'h-6',
        '(-) Tributos sobre o Lucro',
        undefined,
        0,
        'h-6',
        undefined,
        taxCompValues,
        taxCompTotal,
        taxCashValues,
        taxCashTotal,
        taxLines.flatMap(l => l.matchedTitleIds || []),
        true
      ),
      ...taxLines,

      // Final Summary
      createDRELine(
        's-final',
        '(=) RESULTADO LÍQUIDO GERENCIAL',
        undefined,
        0,
        's-final',
        undefined,
        netResultCompValues,
        netResultCompTotal,
        netResultCashValues,
        netResultCashTotal,
        undefined,
        false,
        true
      )
    ];

    const activeNetResults = regime === 'CAIXA' ? netResultCashValues : netResultCompValues;
    const activeTotalNetResult = regime === 'CAIXA' ? netResultCashTotal : netResultCompTotal;

    return {
      months,
      lines,
      netResults: activeNetResults,
      totalNetResult: activeTotalNetResult,
      regime,
      cashNetResults: netResultCashValues,
      totalCashNetResult: netResultCashTotal
    };
  }

  /**
   * Atalho para gerar a DRE gerencial pelo regime de Caixa (efetivação financeira)
   */
  public static generateDREByCash(year: number): DREMatrix {
    return this.generateDRE(year, 'CAIXA');
  }

  /**
   * Atalho para gerar a DRE gerencial comparativa (Caixa vs Competência lado a lado)
   */
  public static generateDREComparison(year: number): DREMatrix {
    return this.generateDRE(year, 'COMPARATIVO');
  }

  /**
   * Helper contábil para identificar se um item ou conta pertence à Distribuição de Lucros / Dividendos
   */
  public static isProfitDistribution(item: {
    accountId?: string;
    description?: string;
    notes?: string;
    categoryName?: string;
  }, accounts?: ChartAccount[]): boolean {
    if (item.accountId) {
      if (item.accountId === 'acc-7.1.04') return true;
      if (accounts) {
        const acc = accounts.find(a => a.id === item.accountId || a.code === item.accountId);
        if (acc) {
          if (acc.code === '7.1.04') return true;
          if (acc.nature === 'FINANCIAMENTO_SOCIO' && acc.name.toLowerCase().includes('lucro')) return true;
        }
      }
    }

    const text = `${item.description || ''} ${item.notes || ''} ${item.categoryName || ''}`.toLowerCase();
    const profitKeywords = [
      'distribuicao de lucro',
      'distribuição de lucro',
      'distribuicao de lucros',
      'distribuição de lucros',
      'distribuicao lucro',
      'distribuição lucro',
      'distrib. lucro',
      'distrib. lucros',
      'distrib lucros',
      'distrib lucro',
      'retirada de lucro',
      'retirada de lucros',
      'lucro distribuido',
      'lucros distribuidos',
      'dividendos',
      'dividendo'
    ];

    return profitKeywords.some(kw => text.includes(kw));
  }

  /**
   * GENERATE DIRECT CASH FLOW (FLUXO DE CAIXA DIRETO - CPC 03)
   * Segrega rigorosamente pagamentos de Atividades Reais da Empresa e Distribuição de Lucros aos Sócios.
   * Realized + Projected support across 12 months.
   */
  public static generateCashFlow(year: number, mode: 'REALIZADO' | 'PROJETADO' | 'CONSOLIDADO' = 'REALIZADO'): {
    months: string[];
    lines: CashFlowLineItem[];
    finalBalances: number[];
    summary: {
      totalInflows: number;
      totalOperationalOutflows: number;
      totalInvestmentOutflows: number;
      totalLoanOutflows: number;
      totalRealActivitiesOutflows: number;
      totalProfitDistribution: number;
      totalOutflows: number;
      netCashBeforeProfit: number;
      netCashFinal: number;
    };
  } {
    const movements = storage.getMovements().filter(m => !m.isReversed);
    const titles = storage.getTitles().filter(t => t.documentState === 'CONFIRMADO' && t.balancePrincipal > 0);
    const settlements = storage.getSettlements();
    const accounts = storage.getChartAccounts();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Map para lookup rápido de títulos por settlement
    const allTitles = storage.getTitles();
    const settlementToTitleMap = new Map<string, FinancialTitle>();
    for (const s of settlements) {
      const t = allTitles.find(title => title.id === s.titleId);
      if (t) settlementToTitleMap.set(s.id, t);
    }

    // Initial balance at Jan 1st of the year
    const initialBalanceJan = FinancialEngine.getConsolidatedCashBalance(`${year}-01-01`);

    const opInflows = new Array(12).fill(0);
    const opOutflows = new Array(12).fill(0);
    const invInflows = new Array(12).fill(0);
    const invOutflows = new Array(12).fill(0);
    const finInflows = new Array(12).fill(0);
    const finLoanOutflows = new Array(12).fill(0);   // Amortização de Empréstimos e Financiamentos
    const finProfitOutflows = new Array(12).fill(0); // Distribuição de Lucros aos Sócios

    // 1. Realized movements
    if (mode === 'REALIZADO' || mode === 'CONSOLIDADO') {
      for (const mov of movements) {
        if (!mov.date.startsWith(`${year}-`)) continue;
        if (mov.cashFlowCategory === 'TRANSFERENCIA_INTERNA') continue; // Transferência interna tem efeito nulo

        const monthIdx = parseInt(mov.date.substring(5, 7), 10) - 1;
        if (monthIdx < 0 || monthIdx > 11) continue;

        const linkedTitle = mov.originReferenceId ? settlementToTitleMap.get(mov.originReferenceId) : undefined;
        const isProfit = ReportingEngine.isProfitDistribution({
          accountId: mov.accountId || linkedTitle?.accountId,
          description: `${mov.description || ''} ${linkedTitle?.description || ''}`,
          categoryName: linkedTitle?.categoryName
        }, accounts);

        // Se for saída de distribuição de lucros, segregar independente da categoria original
        if (isProfit && mov.direction === 'SAIDA') {
          finProfitOutflows[monthIdx] += mov.amount;
        } else if (mov.cashFlowCategory === 'OPERACIONAL') {
          if (mov.direction === 'ENTRADA') opInflows[monthIdx] += mov.amount;
          else opOutflows[monthIdx] += mov.amount;
        } else if (mov.cashFlowCategory === 'INVESTIMENTO') {
          if (mov.direction === 'ENTRADA') invInflows[monthIdx] += mov.amount;
          else invOutflows[monthIdx] += mov.amount;
        } else if (mov.cashFlowCategory === 'FINANCIAMENTO') {
          if (mov.direction === 'ENTRADA') {
            finInflows[monthIdx] += mov.amount;
          } else {
            finLoanOutflows[monthIdx] += mov.amount;
          }
        }
      }
    }

    // 2. Projected (saldo em aberto dos títulos pela data prevista de caixa)
    if (mode === 'PROJETADO' || mode === 'CONSOLIDADO') {
      for (const title of titles) {
        const targetDate = title.expectedCashDate || title.dueDate;
        if (!targetDate.startsWith(`${year}-`)) continue;

        const monthIdx = parseInt(targetDate.substring(5, 7), 10) - 1;
        if (monthIdx < 0 || monthIdx > 11) continue;

        const acc = accounts.find(a => a.id === title.accountId);
        const cat = acc ? acc.cashFlowCategory : 'OPERACIONAL';

        const isProfit = ReportingEngine.isProfitDistribution({
          accountId: title.accountId,
          description: title.description,
          categoryName: title.categoryName
        }, accounts);

        if (isProfit && title.type === 'PAGAR') {
          finProfitOutflows[monthIdx] += title.balancePrincipal;
        } else if (cat === 'INVESTIMENTO') {
          if (title.type === 'RECEBER') invInflows[monthIdx] += title.balancePrincipal;
          else invOutflows[monthIdx] += title.balancePrincipal;
        } else if (cat === 'FINANCIAMENTO') {
          if (title.type === 'RECEBER') {
            finInflows[monthIdx] += title.balancePrincipal;
          } else {
            finLoanOutflows[monthIdx] += title.balancePrincipal;
          }
        } else {
          if (title.type === 'RECEBER') opInflows[monthIdx] += title.balancePrincipal;
          else opOutflows[monthIdx] += title.balancePrincipal;
        }
      }
    }

    // Soma das saídas de financiamento (Empréstimos + Lucros)
    const finTotalOutflows = finLoanOutflows.map((loan, i) => Math.round((loan + finProfitOutflows[i]) * 100) / 100);

    // Pagamentos Reais das Atividades da Empresa (Operacional + Investimentos + Amortização de Dívidas)
    const realActivitiesOutflows = opOutflows.map((op, i) => 
      Math.round((op + invOutflows[i] + finLoanOutflows[i]) * 100) / 100
    );

    // Resultados Líquidos por Atividade
    const netOp = opInflows.map((v, i) => Math.round((v - opOutflows[i]) * 100) / 100);
    const netInv = invInflows.map((v, i) => Math.round((v - invOutflows[i]) * 100) / 100);
    const netFin = finInflows.map((v, i) => Math.round((v - finTotalOutflows[i]) * 100) / 100);

    // Fluxo de Caixa Antes da Distribuição de Lucros
    const totalMonthlyInflows = opInflows.map((opIn, i) => Math.round((opIn + invInflows[i] + finInflows[i]) * 100) / 100);
    const netCashBeforeProfit = totalMonthlyInflows.map((inflow, i) => Math.round((inflow - realActivitiesOutflows[i]) * 100) / 100);

    // Variação Líquida Final de Caixa (Net Real - Lucros)
    const netVariations = netCashBeforeProfit.map((before, i) => Math.round((before - finProfitOutflows[i]) * 100) / 100);

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
        id: 'cf-fin-out-loans',
        name: '(-) Amortização de Empréstimos e Financiamentos',
        level: 1,
        valuesByMonth: finLoanOutflows,
        totalYear: finLoanOutflows.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-fin-out-profit',
        name: '(-) Distribuição de Lucros e Dividendos aos Sócios',
        level: 1,
        valuesByMonth: finProfitOutflows,
        totalYear: finProfitOutflows.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-fin-out',
        name: '(-) Total de Saídas de Financiamento',
        level: 1,
        valuesByMonth: finTotalOutflows,
        totalYear: finTotalOutflows.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-fin-net',
        name: '(=) Fluxo Líquido das Atividades de Financiamento',
        level: 0,
        isSummary: true,
        valuesByMonth: netFin,
        totalYear: netFin.reduce((a, b) => a + b, 0)
      },

      // 4. Subtotal Gerencial de Demonstração (Segregação de Atividades Reais vs Retiradas de Lucro)
      {
        id: 'cf-real-activities-outflows',
        name: '(-) Pagamentos Reais das Atividades (Operação + Investimentos + Empréstimos)',
        level: 0,
        isSummary: true,
        valuesByMonth: realActivitiesOutflows,
        totalYear: realActivitiesOutflows.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-cash-before-profit',
        name: '(=) FLUXO DE CAIXA ANTES DA DISTRIBUIÇÃO DE LUCROS',
        level: 0,
        isSummary: true,
        valuesByMonth: netCashBeforeProfit,
        totalYear: netCashBeforeProfit.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-profit-distribution',
        name: '(-) Distribuição de Lucros aos Sócios no Período',
        level: 0,
        isSummary: true,
        valuesByMonth: finProfitOutflows,
        totalYear: finProfitOutflows.reduce((a, b) => a + b, 0)
      },

      // 5. Variação Líquida e Saldo Final
      {
        id: 'cf-net-variation',
        name: '(=) VARIAÇÃO LÍQUIDA DE CAIXA NO PERÍODO',
        level: 0,
        isSummary: true,
        valuesByMonth: netVariations,
        totalYear: netVariations.reduce((a, b) => a + b, 0)
      },
      {
        id: 'cf-final',
        name: '(=) SALDO FINAL DE CAIXA E EQUIVALENTES',
        level: 0,
        isSummary: true,
        valuesByMonth: finalBalances,
        totalYear: finalBalances[11] // No fechamento anual, o saldo final é a posição de fechamento de Dezembro
      }
    ];

    const totalInflowsSum = opInflows.reduce((a, b) => a + b, 0) +
                            invInflows.reduce((a, b) => a + b, 0) +
                            finInflows.reduce((a, b) => a + b, 0);

    const totalOperationalOutflowsSum = opOutflows.reduce((a, b) => a + b, 0);
    const totalInvestmentOutflowsSum = invOutflows.reduce((a, b) => a + b, 0);
    const totalLoanOutflowsSum = finLoanOutflows.reduce((a, b) => a + b, 0);
    const totalRealActivitiesOutflowsSum = realActivitiesOutflows.reduce((a, b) => a + b, 0);
    const totalProfitDistributionSum = finProfitOutflows.reduce((a, b) => a + b, 0);
    const totalOutflowsSum = totalRealActivitiesOutflowsSum + totalProfitDistributionSum;
    const netCashBeforeProfitSum = netCashBeforeProfit.reduce((a, b) => a + b, 0);
    const netCashFinalSum = netVariations.reduce((a, b) => a + b, 0);

    return {
      months,
      lines,
      finalBalances,
      summary: {
        totalInflows: totalInflowsSum,
        totalOperationalOutflows: totalOperationalOutflowsSum,
        totalInvestmentOutflows: totalInvestmentOutflowsSum,
        totalLoanOutflows: totalLoanOutflowsSum,
        totalRealActivitiesOutflows: totalRealActivitiesOutflowsSum,
        totalProfitDistribution: totalProfitDistributionSum,
        totalOutflows: totalOutflowsSum,
        netCashBeforeProfit: netCashBeforeProfitSum,
        netCashFinal: netCashFinalSum
      }
    };
  }
}

