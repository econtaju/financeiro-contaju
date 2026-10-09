import { storage } from '../src/services/storageService';
import { FinancialTitle, Contract } from '../src/types';
import { RecurringSeriesService } from '../src/services/recurringSeriesService';

console.log('=== INICIANDO TESTE AUTOMATIZADO DE ATUALIZAÇÃO DE SÉRIES RECORRENTES E PARCELADAS ===\n');

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

let allPassed = true;
function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    allPassed = false;
  }
}

// -------------------------------------------------------------
// TESTE 1: Contrato Recorrente com Meses Pagos e Meses em Aberto
// -------------------------------------------------------------
console.log('--- TESTE 1: Contrato Recorrente (Meses Quitados Preservados + Meses Futuros Atualizados) ---');

const contractId = 'ctr-test-01';
const mockContract: Contract = {
  id: contractId,
  companyId: 'comp-1',
  contractNumber: 'CTR-2026-001',
  clientId: 'cli-01',
  clientName: 'Cliente Teste Recorrência',
  status: 'ATIVO',
  contractType: 'RECORRENTE',
  serviceType: 'HONORARIOS_CONTABEIS',
  billingFrequency: 'MENSAL',
  monthlyTotal: 500,
  paymentDueDay: 10,
  chargeThirteenth: false,
  startDate: '2026-01-01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  items: [
    {
      id: 'item-1',
      serviceId: 'srv-1',
      description: 'Honorários Mensais',
      quantity: 1,
      unitPrice: 500,
      total: 500
    }
  ]
};

const titlesContract: FinancialTitle[] = [
  // Mês 1 - PAGO
  {
    id: 't-ctr-1',
    companyId: 'comp-1',
    contractId,
    type: 'RECEBER',
    titleNumber: 'FAT-2026-001 - 2026-01',
    counterpartyId: 'cli-01',
    description: 'Honorários Jan/2026',
    accountId: 'rec-01',
    launchDate: '2026-01-01',
    competence: '2026-01',
    dueDate: '2026-01-10',
    originalAmount: 500,
    settledPrincipal: 500,
    balancePrincipal: 0,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'LIQUIDADO',
    originType: 'CONTRATO',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  },
  // Mês 2 - PAGO
  {
    id: 't-ctr-2',
    companyId: 'comp-1',
    contractId,
    type: 'RECEBER',
    titleNumber: 'FAT-2026-001 - 2026-02',
    counterpartyId: 'cli-01',
    description: 'Honorários Fev/2026',
    accountId: 'rec-01',
    launchDate: '2026-02-01',
    competence: '2026-02',
    dueDate: '2026-02-10',
    originalAmount: 500,
    settledPrincipal: 500,
    balancePrincipal: 0,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'LIQUIDADO',
    originType: 'CONTRATO',
    createdAt: '2026-02-01',
    updatedAt: '2026-02-01'
  },
  // Mês 3 - EM ABERTO (Alvo da alteração)
  {
    id: 't-ctr-3',
    companyId: 'comp-1',
    contractId,
    type: 'RECEBER',
    titleNumber: 'FAT-2026-001 - 2026-03',
    counterpartyId: 'cli-01',
    description: 'Honorários Mar/2026',
    accountId: 'rec-01',
    launchDate: '2026-03-01',
    competence: '2026-03',
    dueDate: '2026-03-10',
    originalAmount: 500,
    settledPrincipal: 0,
    balancePrincipal: 500,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'CONTRATO',
    createdAt: '2026-03-01',
    updatedAt: '2026-03-01'
  },
  // Mês 4 - EM ABERTO (Futuro)
  {
    id: 't-ctr-4',
    companyId: 'comp-1',
    contractId,
    type: 'RECEBER',
    titleNumber: 'FAT-2026-001 - 2026-04',
    counterpartyId: 'cli-01',
    description: 'Honorários Abr/2026',
    accountId: 'rec-01',
    launchDate: '2026-04-01',
    competence: '2026-04',
    dueDate: '2026-04-10',
    originalAmount: 500,
    settledPrincipal: 0,
    balancePrincipal: 500,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'CONTRATO',
    createdAt: '2026-04-01',
    updatedAt: '2026-04-01'
  },
  // Mês 5 - EM ABERTO (Futuro)
  {
    id: 't-ctr-5',
    companyId: 'comp-1',
    contractId,
    type: 'RECEBER',
    titleNumber: 'FAT-2026-001 - 2026-05',
    counterpartyId: 'cli-01',
    description: 'Honorários Mai/2026',
    accountId: 'rec-01',
    launchDate: '2026-05-01',
    competence: '2026-05',
    dueDate: '2026-05-10',
    originalAmount: 500,
    settledPrincipal: 0,
    balancePrincipal: 500,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'CONTRATO',
    createdAt: '2026-05-01',
    updatedAt: '2026-05-01'
  }
];

storage.saveContracts([mockContract]);
storage.saveTitles(titlesContract);

// 1.1 Detectar série no título do mês 3
const detection = RecurringSeriesService.detectSeries(titlesContract[2]);
assert(detection.isSeries === true, 'Detectou série com sucesso');
assert(detection.seriesType === 'CONTRATO', 'Tipo de série identificado como CONTRATO');
assert(detection.totalSeriesCount === 5, 'Total da série é 5 títulos');
assert(detection.paidTitlesCount === 2, 'Contou exatamente 2 títulos quitados');
assert(detection.subsequentOpenTitles.length === 2, 'Encontrou exatamente 2 títulos subsequentes em aberto (Abril e Maio)');
assert(detection.subsequentOpenTitles.every(t => t.id === 't-ctr-4' || t.id === 't-ctr-5'), 'Títulos subsequentes são t-ctr-4 e t-ctr-5');

// 1.2 Executar atualização em lote alterando valor de 500 para 650
const resultUpdate = RecurringSeriesService.executeSeriesUpdate({
  targetTitleId: 't-ctr-3',
  newAmount: 650,
  updates: { description: 'Honorários Mar/2026 (Reajustado)' },
  applyToSubsequent: true,
  subsequentTitleIds: detection.subsequentOpenTitles.map(t => t.id),
  contractId: mockContract.id,
  currentUser: { name: 'Admin', role: 'ADMIN' }
});

assert(resultUpdate.success === true, 'Atualização executada com sucesso');
assert(resultUpdate.updatedCount === 3, 'Atualizou 3 títulos (Alvo Março + 2 Futuros Abril e Maio)');

const titlesAfter1 = storage.getTitles();
const tJan = titlesAfter1.find(t => t.id === 't-ctr-1')!;
const tFev = titlesAfter1.find(t => t.id === 't-ctr-2')!;
const tMar = titlesAfter1.find(t => t.id === 't-ctr-3')!;
const tAbr = titlesAfter1.find(t => t.id === 't-ctr-4')!;
const tMai = titlesAfter1.find(t => t.id === 't-ctr-5')!;

assert(tJan.originalAmount === 500 && tJan.settledPrincipal === 500, 'Mês 1 (Jan/Quitado) permaneceu intacto com R$ 500');
assert(tFev.originalAmount === 500 && tFev.settledPrincipal === 500, 'Mês 2 (Fev/Quitado) permaneceu intacto com R$ 500');
assert(tMar.originalAmount === 650 && tMar.balancePrincipal === 650, 'Mês 3 (Mar/Alvo) atualizado para R$ 650');
assert(tAbr.originalAmount === 650 && tAbr.balancePrincipal === 650, 'Mês 4 (Abr/Futuro) atualizado em lote para R$ 650');
assert(tMai.originalAmount === 650 && tMai.balancePrincipal === 650, 'Mês 5 (Mai/Futuro) atualizado em lote para R$ 650');

const contractsAfter1 = storage.getContracts();
const cUpdated = contractsAfter1.find(c => c.id === contractId)!;
assert(cUpdated.monthlyTotal === 650, 'Contrato mensal sincronizado para R$ 650');


// -------------------------------------------------------------
// TESTE 2: Parcelamento (Escolhendo apenas este mês)
// -------------------------------------------------------------
console.log('\n--- TESTE 2: Despesa Parcelada (Opção: Alterar Apenas Este Mês) ---');

const titlesInstallments: FinancialTitle[] = [
  {
    id: 't-parc-1',
    companyId: 'comp-1',
    type: 'PAGAR',
    titleNumber: 'PAG-2026-900 - 1/3',
    counterpartyId: 'forn-01',
    description: 'Equipamento TI (1/3)',
    accountId: 'desp-01',
    launchDate: '2026-03-01',
    competence: '2026-03',
    dueDate: '2026-03-15',
    originalAmount: 1000,
    settledPrincipal: 1000,
    balancePrincipal: 0,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'LIQUIDADO',
    originType: 'DESPESA_DIRETA',
    installmentIndex: 1,
    totalInstallments: 3,
    createdAt: '2026-03-01',
    updatedAt: '2026-03-01'
  },
  {
    id: 't-parc-2',
    companyId: 'comp-1',
    type: 'PAGAR',
    titleNumber: 'PAG-2026-900 - 2/3',
    counterpartyId: 'forn-01',
    description: 'Equipamento TI (2/3)',
    accountId: 'desp-01',
    launchDate: '2026-03-01',
    competence: '2026-04',
    dueDate: '2026-04-15',
    originalAmount: 1000,
    settledPrincipal: 0,
    balancePrincipal: 1000,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'DESPESA_DIRETA',
    installmentIndex: 2,
    totalInstallments: 3,
    createdAt: '2026-03-01',
    updatedAt: '2026-03-01'
  },
  {
    id: 't-parc-3',
    companyId: 'comp-1',
    type: 'PAGAR',
    titleNumber: 'PAG-2026-900 - 3/3',
    counterpartyId: 'forn-01',
    description: 'Equipamento TI (3/3)',
    accountId: 'desp-01',
    launchDate: '2026-03-01',
    competence: '2026-05',
    dueDate: '2026-05-15',
    originalAmount: 1000,
    settledPrincipal: 0,
    balancePrincipal: 1000,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'DESPESA_DIRETA',
    installmentIndex: 3,
    totalInstallments: 3,
    createdAt: '2026-03-01',
    updatedAt: '2026-03-01'
  }
];

storage.saveTitles(titlesInstallments);

const detectionParc = RecurringSeriesService.detectSeries(titlesInstallments[1]);
assert(detectionParc.isSeries === true, 'Detectou série de parcelas');
assert(detectionParc.seriesType === 'PARCELAMENTO', 'Tipo identificado como PARCELAMENTO');
assert(detectionParc.subsequentOpenTitles.length === 1, '1 parcela subsequente em aberto (3/3)');

// Usuário opta por alterar APENAS o mês pontual (applyToSubsequent = false)
const resultUpdateSingle = RecurringSeriesService.executeSeriesUpdate({
  targetTitleId: 't-parc-2',
  newAmount: 1200,
  updates: { description: 'Equipamento TI (2/3 - Ajustado)' },
  applyToSubsequent: false,
  subsequentTitleIds: detectionParc.subsequentOpenTitles.map(t => t.id),
  currentUser: { name: 'Admin', role: 'ADMIN' }
});

assert(resultUpdateSingle.updatedCount === 1, 'Atualizou apenas 1 título conforme opção do usuário');
const titlesAfter2 = storage.getTitles();
const p1 = titlesAfter2.find(t => t.id === 't-parc-1')!;
const p2 = titlesAfter2.find(t => t.id === 't-parc-2')!;
const p3 = titlesAfter2.find(t => t.id === 't-parc-3')!;

assert(p1.originalAmount === 1000, 'Parcela 1/3 (paga) intocada');
assert(p2.originalAmount === 1200, 'Parcela 2/3 atualizada para R$ 1200');
assert(p3.originalAmount === 1000, 'Parcela 3/3 (futura) mantida em R$ 1000');


// -------------------------------------------------------------
// TESTE 3: Despesa Recorrente de Contas a Pagar (RECORRENCIA_PAGAR)
// -------------------------------------------------------------
console.log('\n--- TESTE 3: Despesa Recorrente (RECORRENCIA_PAGAR) com Meses Futuros ---');

const titlesRecPagar: FinancialTitle[] = [
  {
    id: 't-recp-1',
    companyId: 'comp-1',
    type: 'PAGAR',
    titleNumber: 'PAG-ALUGUEL - 2026-01',
    counterpartyId: 'forn-imob',
    description: 'Aluguel Escritório [Recorrente 2026-01]',
    accountId: 'desp-aluguel',
    launchDate: '2026-01-01',
    competence: '2026-01',
    dueDate: '2026-01-05',
    originalAmount: 2000,
    settledPrincipal: 2000,
    balancePrincipal: 0,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'LIQUIDADO',
    originType: 'RECORRENCIA_PAGAR',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  },
  {
    id: 't-recp-2',
    companyId: 'comp-1',
    type: 'PAGAR',
    titleNumber: 'PAG-ALUGUEL - 2026-02',
    counterpartyId: 'forn-imob',
    description: 'Aluguel Escritório [Recorrente 2026-02]',
    accountId: 'desp-aluguel',
    launchDate: '2026-01-01',
    competence: '2026-02',
    dueDate: '2026-02-05',
    originalAmount: 2000,
    settledPrincipal: 0,
    balancePrincipal: 2000,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'RECORRENCIA_PAGAR',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  },
  {
    id: 't-recp-3',
    companyId: 'comp-1',
    type: 'PAGAR',
    titleNumber: 'PAG-ALUGUEL - 2026-03',
    counterpartyId: 'forn-imob',
    description: 'Aluguel Escritório [Recorrente 2026-03]',
    accountId: 'desp-aluguel',
    launchDate: '2026-01-01',
    competence: '2026-03',
    dueDate: '2026-03-05',
    originalAmount: 2000,
    settledPrincipal: 0,
    balancePrincipal: 2000,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'RECORRENCIA_PAGAR',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  }
];

storage.saveTitles(titlesRecPagar);

const detectionRecp = RecurringSeriesService.detectSeries(titlesRecPagar[1]);
assert(detectionRecp.isSeries === true, 'Detectou recorrência a pagar');
assert(detectionRecp.subsequentOpenTitles.length === 1, 'Detectou 1 mês seguinte em aberto (Março)');

const resultRecpUpdate = RecurringSeriesService.executeSeriesUpdate({
  targetTitleId: 't-recp-2',
  newAmount: 2300,
  updates: {},
  applyToSubsequent: true,
  subsequentTitleIds: detectionRecp.subsequentOpenTitles.map(t => t.id),
  currentUser: { name: 'Admin', role: 'ADMIN' }
});

assert(resultRecpUpdate.updatedCount === 2, 'Atualizou Fevereiro e Março para R$ 2300');
const titlesAfter3 = storage.getTitles();
const r1 = titlesAfter3.find(t => t.id === 't-recp-1')!;
const r2 = titlesAfter3.find(t => t.id === 't-recp-2')!;
const r3 = titlesAfter3.find(t => t.id === 't-recp-3')!;

assert(r1.originalAmount === 2000, 'Janeiro (pago) mantido em R$ 2000');
assert(r2.originalAmount === 2300, 'Fevereiro atualizado para R$ 2300');
assert(r3.originalAmount === 2300, 'Março atualizado para R$ 2300');

console.log('\n======================================================');
if (allPassed) {
  console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
} else {
  console.error('⚠️ ALGUNS TESTES FALHARAM. REVISAR IMPLEMENTAÇÃO.');
  process.exit(1);
}
console.log('======================================================');
