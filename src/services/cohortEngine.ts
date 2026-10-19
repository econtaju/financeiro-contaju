import { storage } from './storageService';
import { CohortAnalysisResult, CohortRow, CohortMonthCell, Contract } from '../types';

export class CohortEngine {
  /**
   * Gera a matriz de análise de coortes com base nas safras contratuais dos clientes
   * @param maxCohorts Número máximo de safras passadas a avaliar (padrão: 12)
   */
  public static generateCohortAnalysis(maxCohorts: number = 12): CohortAnalysisResult {
    const contracts = storage.getContracts();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentCompStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    // 1. Identificar a data do primeiro contrato de cada cliente (mês de entrada / Safra)
    const customerFirstDateMap = new Map<string, { cohortKey: string; initialFee: number }>();

    for (const c of contracts) {
      const cDate = c.startDate || c.entryDate || c.createdAt || '';
      if (!cDate) continue;
      const cohortKey = cDate.substring(0, 7); // "YYYY-MM"
      const cur = customerFirstDateMap.get(c.customerId);
      const fee = c.monthlyTotal || 0;

      if (!cur || cohortKey < cur.cohortKey) {
        customerFirstDateMap.set(c.customerId, { cohortKey, initialFee: fee });
      }
    }

    // 2. Coletar safras únicas ordenadas cronologicamente
    const allCohorts = Array.from(new Set(Array.from(customerFirstDateMap.values()).map(v => v.cohortKey)))
      .sort((a, b) => a.localeCompare(b));

    // Pega as últimas maxCohorts safras
    const targetCohorts = allCohorts.slice(-maxCohorts);

    const MONTH_LABELS = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'];
    const cohortRows: CohortRow[] = [];

    for (const cohortKey of targetCohorts) {
      // Clientes desta safra
      const cohortCustomers = Array.from(customerFirstDateMap.entries())
        .filter(([_, info]) => info.cohortKey === cohortKey);

      const initialCount = cohortCustomers.length;
      if (initialCount === 0) continue;

      const customerIdsInCohort = new Set(cohortCustomers.map(([id]) => id));
      const initialMrr = cohortCustomers.reduce((acc, [_, info]) => acc + info.initialFee, 0);

      const [cYear, cMonth] = cohortKey.split('-').map(Number);
      const cohortDate = new Date(cYear, cMonth - 1, 1);
      const cohortLabel = `${cohortDate.toLocaleDateString('pt-BR', { month: 'short' })}/${cYear}`;

      const cells: CohortMonthCell[] = [];

      for (let mIdx = 0; mIdx < 12; mIdx++) {
        // Mês cronológico de avaliação para o índice mIdx
        const evalYear = cYear + Math.floor((cMonth - 1 + mIdx) / 12);
        const evalMonth = ((cMonth - 1 + mIdx) % 12) + 1;
        const evalCompStr = `${evalYear}-${String(evalMonth).padStart(2, '0')}`;

        // Se o mês for futuro em relação ao mês atual do sistema, encerra as colunas futuras
        if (evalCompStr > currentCompStr) {
          break;
        }

        // Quantos clientes da safra continuavam com contrato ativo em evalCompStr
        const activeContractsInMonth = contracts.filter(c => {
          if (!customerIdsInCohort.has(c.customerId)) return false;
          const start = (c.startDate || c.entryDate || c.createdAt || '').substring(0, 7);
          if (!start || start > evalCompStr) return false;
          const cancel = c.cancellationDate || c.inactivatedAt || '';
          if (cancel && cancel.substring(0, 7) < evalCompStr) return false;
          return c.status === 'ATIVO' || (cancel && cancel.substring(0, 7) >= evalCompStr);
        });

        const activeCustomerIds = new Set(activeContractsInMonth.map(c => c.customerId));
        const activeCount = activeCustomerIds.size;
        const retentionRate = Math.round((activeCount / initialCount) * 1000) / 10;

        const retainedMrr = activeContractsInMonth.reduce((acc, c) => acc + (c.monthlyTotal || 0), 0);
        const mrrRetentionRate = initialMrr > 0 ? Math.round((retainedMrr / initialMrr) * 1000) / 10 : 100;

        cells.push({
          monthIndex: mIdx,
          monthLabel: MONTH_LABELS[mIdx] || `M${mIdx}`,
          activeCount,
          retentionRate,
          retainedMrr,
          mrrRetentionRate
        });
      }

      cohortRows.push({
        cohortKey,
        cohortLabel,
        initialCount,
        initialMrr,
        cells
      });
    }

    // 3. Cálculo das médias de retenção aos 3 meses, 6 meses e 12 meses
    const m3Rates = cohortRows.map(r => r.cells[3]?.retentionRate).filter((v): v is number => typeof v === 'number');
    const m6Rates = cohortRows.map(r => r.cells[6]?.retentionRate).filter((v): v is number => typeof v === 'number');
    const m12Rates = cohortRows.map(r => r.cells[11]?.retentionRate).filter((v): v is number => typeof v === 'number');

    const avgM3 = m3Rates.length > 0 ? Math.round((m3Rates.reduce((a, b) => a + b, 0) / m3Rates.length) * 10) / 10 : 100;
    const avgM6 = m6Rates.length > 0 ? Math.round((m6Rates.reduce((a, b) => a + b, 0) / m6Rates.length) * 10) / 10 : 100;
    const avgM12 = m12Rates.length > 0 ? Math.round((m12Rates.reduce((a, b) => a + b, 0) / m12Rates.length) * 10) / 10 : 100;

    return {
      cohorts: cohortRows,
      averageRetentionM3: avgM3,
      averageRetentionM6: avgM6,
      averageRetentionM12: avgM12,
      totalCohorts: cohortRows.length
    };
  }
}
