// Mock window e localStorage para Node.js
const store: Record<string, string> = {};
const mockStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => { store[key] = String(val); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
(global as any).window = global;
(global as any).localStorage = mockStorage;
(global as any).window.localStorage = mockStorage;

import { storage } from '../src/services/storageService';
import { FinancialEngine } from '../src/services/financialEngine';
import { Contract, FinancialTitle } from '../src/types';

console.log('🧪 Iniciando Teste de Validação da Geração de Meses e Faturas do Contrato...');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

// Limpar ambiente de teste
const originalContracts = storage.getContracts();
const originalTitles = storage.getTitles();

try {
  // Teste 1: Contrato Ativo Novo - Geração de 12 meses futuros
  console.log('\n--- Teste 1: Contrato Ativo gerando 12 meses futuros ---');
  const contract1: Contract = {
    id: 'ctr-test-01',
    contractNumber: 'CTR-TEST-01',
    customerId: 'cp-client-1',
    description: 'Honorários de Consultoria Fiscal',
    startDate: '2026-01-01',
    contractType: 'RECORRENTE',
    isRecurring: true,
    dueDay: 15,
    dueRule: 'SAME_MONTH',
    billingMethod: 'BOLETO',
    monthlyTotal: 3000,
    periodicity: 'MENSAL',
    status: 'ATIVO',
    createdAt: new Date().toISOString(),
    items: []
  };
  storage.saveContracts([contract1, ...originalContracts]);

  const res1 = FinancialEngine.generateContractFutureInstallments(contract1, 12, '2026-01');
  assert(res1.generatedCount === 12, `Deve gerar 12 faturas (gerou ${res1.generatedCount})`);
  assert(res1.totalAmountGenerated === 36000, `Valor total deve ser R$ 36.000 (deu ${res1.totalAmountGenerated})`);

  // Teste 2: Idempotência - Tentar gerar novamente sem overwrite
  console.log('\n--- Teste 2: Proteção contra Duplicidade (Idempotência) ---');
  const res2 = FinancialEngine.generateContractFutureInstallments(contract1, 12, '2026-01');
  assert(res2.generatedCount === 0, `Não deve gerar duplicidades (gerou ${res2.generatedCount})`);
  assert(res2.alreadyExistingCount === 12, `Deve identificar 12 competências existentes (identificou ${res2.alreadyExistingCount})`);

  // Teste 3: Sincronização / Atualização de Parcelas em Aberto com novo valor do contrato
  console.log('\n--- Teste 3: Sincronização/Atualização de Parcelas em Aberto ---');
  // Alterar valor mensal do contrato para 3500
  contract1.monthlyTotal = 3500;
  storage.saveContracts([contract1, ...originalContracts]);

  // Simular quitação de uma das parcelas (2026-01)
  const allTitles = storage.getTitles();
  const titleJan = allTitles.find(t => t.originId === contract1.id && t.competence === '2026-01')!;
  titleJan.settlementState = 'LIQUIDADO';
  titleJan.settledPrincipal = 3000;
  titleJan.balancePrincipal = 0;
  storage.saveTitles(allTitles);

  const res3 = FinancialEngine.generateContractFutureInstallments(contract1, 12, '2026-01', {
    updateExistingOpen: true
  });

  assert(res3.updatedCount === 11, `Deve atualizar 11 parcelas em aberto (atualizou ${res3.updatedCount})`);
  assert(res3.alreadyExistingCount === 1, `A parcela liquidada (2026-01) deve ser preservada intacta (preservou ${res3.alreadyExistingCount})`);

  const updatedTitles = storage.getTitles();
  const titleFeb = updatedTitles.find(t => t.originId === contract1.id && t.competence === '2026-02')!;
  assert(titleFeb.originalAmount === 3500, `Parcela de fevereiro deve ter sido atualizada para 3500 (está ${titleFeb.originalAmount})`);
  const titleJanAfter = updatedTitles.find(t => t.originId === contract1.id && t.competence === '2026-01')!;
  assert(titleJanAfter.originalAmount === 3000, `Parcela liquidada de janeiro deve manter 3000 (está ${titleJanAfter.originalAmount})`);

  // Teste 4: Contrato com cancellationDate residual (reativado) NÃO pode travar geração
  console.log('\n--- Teste 4: Contrato com cancellationDate residual (Reativado) ---');
  const contractResidual: Contract = {
    id: 'ctr-test-residual',
    contractNumber: 'CTR-TEST-RESIDUAL',
    customerId: 'cp-client-1',
    description: 'Honorários Reativados',
    startDate: '2026-01-01',
    contractType: 'RECORRENTE',
    isRecurring: true,
    dueDay: 10,
    dueRule: 'NEXT_MONTH',
    billingMethod: 'BOLETO',
    monthlyTotal: 2000,
    periodicity: 'MENSAL',
    status: 'ATIVO',
    cancellationDate: '2026-03-01', // Data residual de quando foi cancelado anteriormente
    createdAt: new Date().toISOString(),
    items: []
  };
  storage.saveContracts([contractResidual, ...storage.getContracts()]);

  const res4 = FinancialEngine.generateContractFutureInstallments(contractResidual, 6, '2026-04');
  assert(res4.generatedCount === 6, `Deve gerar 6 faturas ignorando cancellationDate residual em contrato ativo (gerou ${res4.generatedCount})`);

  // Teste 5: Contrato Recorrente com endDate antigo NÃO pode travar faturamento futuro
  console.log('\n--- Teste 5: Contrato Recorrente com endDate anterior ao período ---');
  const contractOldEnd: Contract = {
    id: 'ctr-test-old-end',
    contractNumber: 'CTR-TEST-OLD-END',
    customerId: 'cp-client-1',
    description: 'Honorários Contínuos com EndDate antiga',
    startDate: '2025-01-01',
    endDate: '2025-12-31', // End date do ano passado
    contractType: 'RECORRENTE',
    isRecurring: true,
    dueDay: 10,
    dueRule: 'NEXT_MONTH',
    billingMethod: 'BOLETO',
    monthlyTotal: 1800,
    periodicity: 'MENSAL',
    status: 'ATIVO',
    createdAt: new Date().toISOString(),
    items: []
  };
  storage.saveContracts([contractOldEnd, ...storage.getContracts()]);

  const res5 = FinancialEngine.generateContractFutureInstallments(contractOldEnd, 6, '2026-10');
  assert(res5.generatedCount === 6, `Deve gerar 6 faturas estendendo/ignorando endDate antiga para contrato recorrente (gerou ${res5.generatedCount})`);

  console.log(`\n========================================`);
  console.log(`RESULTADO FINAL: ${passed} passaram, ${failed} falharam.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
} finally {
  // Restaurar dados originais
  storage.saveContracts(originalContracts);
  storage.saveTitles(originalTitles);
}
