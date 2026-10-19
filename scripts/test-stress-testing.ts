import { StressTestingEngine } from '../src/services/stressTestingEngine';

console.log('🧪 Iniciando Teste de Validação do Simulador de Estresse (180 Dias)...');

// 1. Testa Presets
const presets = ['BASE', 'MODERADO', 'SEVERO', 'PIOR_CASO'] as const;
for (const p of presets) {
  const params = StressTestingEngine.getScenarioPreset(p);
  console.log(`✓ Preset ${p}: Churn=${params.churnRatePct}%, Mora=${params.delayDays}d, Inflação=${params.expenseInflationPct}%`);
  if (typeof params.churnRatePct !== 'number' || typeof params.delayDays !== 'number' || typeof params.expenseInflationPct !== 'number') {
    throw new Error(`Preset ${p} inválido!`);
  }
}

// 2. Testa Execução do Cenário Moderado
console.log('\n--- Executando Cenário MODERADO ---');
const modResult = StressTestingEngine.runStressTest({
  churnRatePct: 5,
  delayDays: 10,
  expenseInflationPct: 5,
  scenarioPreset: 'MODERADO'
});

console.log(`Saldo Atual de Partida: R$ ${modResult.startingCashBalance.toFixed(2)}`);
console.log(`Total de Meses Projetados: ${modResult.projections.length}`);
console.log(`Saldo Mínimo Projetado: R$ ${modResult.minimumStressedCash.toFixed(2)}`);
console.log(`Necessidade Capital de Giro (NCG): R$ ${modResult.workingCapitalNeeded.toFixed(2)}`);
console.log(`Perda Acumulada Churn: R$ ${modResult.totalRevenueLostToChurn.toFixed(2)}`);
console.log(`Cash Runway: ${modResult.cashRunwayMonths ? `${modResult.cashRunwayMonths}º mês` : '> 6 meses'}`);

if (modResult.projections.length !== 6) {
  throw new Error(`Esperado 6 meses de projeção, obtido ${modResult.projections.length}`);
}

for (const proj of modResult.projections) {
  if (isNaN(proj.stressedEndBalance) || isNaN(proj.stressedRevenue) || isNaN(proj.stressedExpenses)) {
    throw new Error(`Valor NaN detectado na projeção do mês ${proj.monthIndex}!`);
  }
  console.log(`  Mês ${proj.monthIndex} (${proj.monthLabel}): Rec.Realizada=R$ ${proj.revenueRealizedInMonth.toFixed(2)} | Desp=R$ ${proj.stressedExpenses.toFixed(2)} | SaldoFinal=R$ ${proj.stressedEndBalance.toFixed(2)} | Déficit=${proj.isDeficit}`);
}

// 3. Testa Execução do Pior Caso
console.log('\n--- Executando Cenário PIOR CASO ---');
const worstResult = StressTestingEngine.runStressTest({
  churnRatePct: 25,
  delayDays: 35,
  expenseInflationPct: 15,
  scenarioPreset: 'PIOR_CASO'
});

console.log(`Perda Acumulada Churn Pior Caso: R$ ${worstResult.totalRevenueLostToChurn.toFixed(2)}`);
console.log(`Saldo Mínimo Pior Caso: R$ ${worstResult.minimumStressedCash.toFixed(2)}`);
console.log(`NCG Pior Caso: R$ ${worstResult.workingCapitalNeeded.toFixed(2)}`);

if (worstResult.totalRevenueLostToChurn <= modResult.totalRevenueLostToChurn) {
  throw new Error('A perda acumulada por churn no pior caso deveria ser maior que no moderado!');
}

console.log('\n✅ Todos os testes do Simulador de Estresse passaram com sucesso!');
