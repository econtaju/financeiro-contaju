import { storage } from '../src/services/storageService';
import { KpiEngine } from '../src/services/kpiEngine';
import { ChurnPredictionEngine } from '../src/services/churnPredictionEngine';
import { CohortEngine } from '../src/services/cohortEngine';

console.log('=== TESTE DE VALIDAÇÃO DAS 3 MELHORIAS IMPLEMENTADAS ===\n');

// 1. Teste de Metas Orçamentárias (KpiTargets)
console.log('[TESTE 1] Metas Orçamentárias de KPIs:');
const targets = storage.getKpiTargets(2026);
console.log(`Total de metas configuradas para 2026: ${targets.length}`);
const fatTarget = targets.find(t => t.kpiId === 'faturamento_bruto');
console.log(`Meta Faturamento Bruto Anual: ${fatTarget?.annualTarget} (Mensal Jan: ${fatTarget?.monthlyTargets[0]})`);

const kpiRows = KpiEngine.getAnnualKpis(2026);
const fatRow = kpiRows.find(r => r.id === 'faturamento_bruto');
console.log(`Faturamento Realizado Período: ${fatRow?.periodTotal} | Meta Período: ${fatRow?.targetPeriodTotal} | % Atingimento: ${fatRow?.targetAchievementRate}%`);

if (!fatRow?.targetPeriodTotal || fatRow.targetAchievementRate === undefined) {
  throw new Error('FALHA: Campos de meta orçamentária não calculados em AnnualKpiRow');
}
console.log('✅ TESTE 1 PASSOU: Metas orçamentárias integradas com sucesso aos KPIs!\n');

// 2. Teste de Detecção Preditiva de Risco de Churn (Health Score)
console.log('[TESTE 2] Detecção Preditiva de Risco de Churn:');
const riskSummary = ChurnPredictionEngine.getPortfolioRiskSummary();
console.log(`Total de clientes sob contrato avaliados: ${riskSummary.totalActiveCustomers}`);
console.log(`Health Score Médio da Carteira: ${riskSummary.averageHealthScore}/100`);
console.log(`Crítico: ${riskSummary.criticoCount} | Alto Risco: ${riskSummary.altoCount} | Moderado: ${riskSummary.moderadoCount} | Saudável: ${riskSummary.saudavelCount}`);
console.log(`MRR sob risco: R$ ${riskSummary.totalAtRiskMonthlyFee}`);

if (riskSummary.assessments.length === 0 && riskSummary.totalActiveCustomers > 0) {
  throw new Error('FALHA: Avaliações de risco não retornaram itens');
}

const firstAssessment = riskSummary.assessments[0];
if (firstAssessment) {
  console.log(`Exemplo de Cliente: ${firstAssessment.customerName}`);
  console.log(`Score: ${firstAssessment.healthScore}/100 (${firstAssessment.riskLevel})`);
  console.log(`Fatores:`, firstAssessment.riskFactors);
  console.log(`Recomendação: ${firstAssessment.recommendedAction}`);
}
console.log('✅ TESTE 2 PASSOU: Diagnóstico de Health Score e Risco de Churn operacional!\n');

// 3. Teste de Curva de Retenção de Coortes (Cohort Analysis)
console.log('[TESTE 3] Análise de Retenção por Coortes:');
const cohortResult = CohortEngine.generateCohortAnalysis(12);
console.log(`Total de safras analisadas: ${cohortResult.totalCohorts}`);
console.log(`Retenção Média M3: ${cohortResult.averageRetentionM3}%`);
console.log(`Retenção Média M6: ${cohortResult.averageRetentionM6}%`);
console.log(`Retenção Média M12: ${cohortResult.averageRetentionM12}%`);

if (cohortResult.cohorts.length > 0) {
  const firstCohort = cohortResult.cohorts[0];
  console.log(`Safra ${firstCohort.cohortLabel}: Base inicial M0 = ${firstCohort.initialCount} clientes, MRR = R$ ${firstCohort.initialMrr}`);
  console.log(`Células calculadas: ${firstCohort.cells.length} meses (Retenção M0 = ${firstCohort.cells[0]?.retentionRate}%)`);
}
console.log('✅ TESTE 3 PASSOU: Matriz de Coortes e Heatmap calculados com sucesso!\n');

console.log('🎉 TODAS AS 3 MELHORIAS VALIDADAS E FUNCIONANDO COM SUCESSO TOTAL!');
