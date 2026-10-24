import { storage } from '../src/services/storageService';
import { ReportingEngine } from '../src/services/reportingEngine';
import { FinancialTitle } from '../src/types';

console.log('========================================================================');
console.log('🧪 VERIFICAÇÃO DE DRILL-DOWN: SOMA DOS TÍTULOS VS CÉLULA DA DRE (CAIXA)');
console.log('========================================================================\n');

const year = 2026;
const dreCash = ReportingEngine.generateDRE(year, 'CAIXA');
const allTitles = storage.getTitles().filter(t => t.documentState !== 'CANCELADO');
const allSettlements = storage.getSettlements().filter(s => !s.isReversed);

// Helper que calcula exatamente o impacto de caixa de um título em um período de meses
function getTitleCashInPeriod(title: FinancialTitle, targetMonths: string[]) {
  let settledInPeriod = 0;
  const matchingSettlements = allSettlements.filter(s => s.titleId === title.id);

  if (matchingSettlements.length > 0) {
    for (const s of matchingSettlements) {
      const sMonth = s.settlementDate?.substring(0, 7) || '';
      if (targetMonths.includes(sMonth)) {
        settledInPeriod += s.components?.principalSettled || s.components?.netFinancialAmount || 0;
      }
    }
  } else {
    const payDate = (title as any).actualPaymentDate || (title as any).paymentDate || (title as any).settlementDate || '';
    const pMonth = payDate.substring(0, 7);
    if (payDate && targetMonths.includes(pMonth) && (title.settledPrincipal || 0) > 0) {
      settledInPeriod += title.settledPrincipal;
    } else if (!payDate && title.settlementState === 'LIQUIDADO') {
      const dueMonth = (title.dueDate || '').substring(0, 7);
      if (targetMonths.includes(dueMonth)) {
        settledInPeriod += title.settledPrincipal || title.originalAmount || 0;
      }
    }
  }

  // Previsão de saldo em aberto no vencimento
  let openDueInPeriod = 0;
  const dueMonth = (title.dueDate || '').substring(0, 7);
  if (targetMonths.includes(dueMonth)) {
    const openBalance = typeof title.balancePrincipal === 'number'
      ? title.balancePrincipal
      : Math.max(0, (title.originalAmount || 0) - (title.settledPrincipal || 0));

    if (openBalance > 0.001) {
      openDueInPeriod = openBalance;
    }
  }

  const totalInPeriod = Math.round((settledInPeriod + openDueInPeriod) * 100) / 100;
  return {
    settledInPeriod: Math.round(settledInPeriod * 100) / 100,
    openDueInPeriod: Math.round(openDueInPeriod * 100) / 100,
    totalInPeriod
  };
}

let mismatches = 0;
let checks = 0;

for (const line of dreCash.lines) {
  // Pula sumários calculados de grupos inteiros (EBITDA, Lucro Bruto, etc.), testa linhas de contas analíticas e grupos com matchedTitleIds
  if (line.isSummary && !line.isHeader) continue;
  if (!line.matchedTitleIds || line.matchedTitleIds.length === 0) continue;

  const lineTitles = allTitles.filter(t => line.matchedTitleIds?.includes(t.id));

  // Testa cada um dos 12 meses
  for (let m = 0; m < 12; m++) {
    const targetMonth = `${year}-${(m + 1).toString().padStart(2, '0')}`;
    const expectedValue = line.valuesByMonth[m] || 0;

    // Títulos filtrados pelo helper
    const activeTitles = lineTitles.filter(t => {
      const cash = getTitleCashInPeriod(t, [targetMonth]);
      return cash.totalInPeriod > 0.001;
    });

    const sumTitles = Math.round(activeTitles.reduce((acc, t) => {
      const cash = getTitleCashInPeriod(t, [targetMonth]);
      // Linhas de despesa têm títulos a pagar com valor positivo.
      return acc + cash.totalInPeriod;
    }, 0) * 100) / 100;

    checks++;
    if (Math.abs(sumTitles - expectedValue) > 0.01) {
      console.error(`❌ Mismatch na rubrica "${line.name}" (${line.code}) no mês ${targetMonth}:`);
      console.error(`   Esperado na célula DRE: R$ ${expectedValue.toFixed(2)} | Soma dos títulos: R$ ${sumTitles.toFixed(2)} | Dif: ${(sumTitles - expectedValue).toFixed(2)}`);
      mismatches++;
    }
  }

  // Testa acumulado anual (12 meses)
  const all12Months = Array.from({ length: 12 }, (_, i) => `${year}-${(i + 1).toString().padStart(2, '0')}`);
  const expectedYear = line.totalYear || 0;

  const activeYearTitles = lineTitles.filter(t => {
    const cash = getTitleCashInPeriod(t, all12Months);
    return cash.totalInPeriod > 0.001;
  });

  const sumYearTitles = Math.round(activeYearTitles.reduce((acc, t) => {
    const cash = getTitleCashInPeriod(t, all12Months);
    return acc + cash.totalInPeriod;
  }, 0) * 100) / 100;

  checks++;
  if (Math.abs(sumYearTitles - expectedYear) > 0.01) {
    console.error(`❌ Mismatch Anual na rubrica "${line.name}" (${line.code}):`);
    console.error(`   Esperado na célula DRE: R$ ${expectedYear.toFixed(2)} | Soma dos títulos: R$ ${sumYearTitles.toFixed(2)} | Dif: ${(sumYearTitles - expectedYear).toFixed(2)}`);
    mismatches++;
  }
}

console.log(`\n📊 Verificações executadas: ${checks}`);
if (mismatches === 0) {
  console.log(`✅ PERFEITO! Todos os ${checks} cruzamentos bateram 100% centavo por centavo!`);
} else {
  console.error(`❌ Total de mismatches encontrados: ${mismatches}`);
}
