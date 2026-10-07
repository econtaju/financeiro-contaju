// Mock de LocalStorage e Window para execução em ambiente Node.js / CLI
class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

(global as any).localStorage = new LocalStorageMock();
(global as any).window = global;

import { FinancialEngine } from '../src/services/financialEngine';
import { storage } from '../src/services/storageService';
import { FinancialTitle, BankAccount } from '../src/types';

function runTests() {
  console.log('--- TESTE AUTOMATIZADO: REABERTURA DE TÍTULOS (VOLTAR PARA EM ABERTO) ---');

  // Inicializar storage
  storage.initIfEmpty(true);

  // Setup inicial de conta bancária para teste
  const testAccount: BankAccount = {
    id: 'acc-test-' + Date.now(),
    name: 'Conta Corrente Teste',
    bankName: 'Banco Teste',
    accountType: 'CORRENTE',
    initialBalance: 10000,
    currentBalance: 10000,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  const accounts = storage.getBankAccounts();
  storage.saveBankAccounts([...accounts, testAccount]);

  // TESTE 1: TÍTULO A PAGAR (INDIVIDUAL)
  console.log('\n[TESTE 1] Reabertura Individual de Título a Pagar');
  const payableTitle: FinancialTitle = {
    id: 'pay-test-' + Date.now(),
    titleNumber: 'PAG-001',
    type: 'PAGAR',
    counterpartyId: 'forn-1',
    description: 'Fornecedor de TI',
    chartAccountId: 'cat-desp',
    issueDate: '2026-10-01',
    dueDate: '2026-10-05', // Data vencida
    originalAmount: 1500,
    balancePrincipal: 1500,
    settledPrincipal: 0,
    settlementState: 'ABERTO',
    documentState: 'EMITIDO',
    competence: '2026-10',
    createdAt: new Date().toISOString()
  };

  const allTitles = storage.getTitles();
  storage.saveTitles([...allTitles, payableTitle]);

  // Liquidar o título a pagar
  const settlePayRes = FinancialEngine.postSettlement({
    titleId: payableTitle.id,
    principalSettled: 1500,
    settlementDate: '2026-10-05',
    bankAccountId: testAccount.id,
    notes: 'Pagamento teste'
  });

  if (!settlePayRes.success) {
    throw new Error('Falha ao liquidar título a pagar: ' + settlePayRes.message);
  }

  // Verificar se o saldo diminuiu
  const accAfterPay = storage.getBankAccounts().find(a => a.id === testAccount.id)!;
  console.log(`✓ Saldo após quitação de R$ 1.500: R$ ${accAfterPay.currentBalance} (Esperado: 8500)`);
  if (accAfterPay.currentBalance !== 8500) {
    throw new Error('Saldo incorreto após quitação');
  }

  // Executar a Reabertura Individual
  const reopenPayRes = FinancialEngine.reopenTitleToOpen(payableTitle.id, 'Cancelamento de liquidação indevida');
  console.log('✓ Resultado da reabertura a pagar:', reopenPayRes.message);
  if (!reopenPayRes.success) {
    throw new Error('Falha ao reabrir título a pagar: ' + reopenPayRes.message);
  }

  // Verificar título após reabertura
  const reloadedPayTitle = storage.getTitles().find(t => t.id === payableTitle.id)!;
  console.log(`✓ Título Estado: ${reloadedPayTitle.settlementState} (Esperado: ABERTO)`);
  console.log(`✓ Título Saldo Principal: R$ ${reloadedPayTitle.balancePrincipal} (Esperado: 1500)`);
  console.log(`✓ Título Baixado: R$ ${reloadedPayTitle.settledPrincipal} (Esperado: 0)`);
  if (reloadedPayTitle.settlementState !== 'ABERTO' || reloadedPayTitle.balancePrincipal !== 1500 || reloadedPayTitle.settledPrincipal !== 0) {
    throw new Error('Estado do título não foi restaurado para ABERTO');
  }

  // Verificar saldo bancário restaurado
  const accAfterReopenPay = storage.getBankAccounts().find(a => a.id === testAccount.id)!;
  console.log(`✓ Saldo bancário após reabertura: R$ ${accAfterReopenPay.currentBalance} (Esperado: 10000)`);
  if (accAfterReopenPay.currentBalance !== 10000) {
    throw new Error('Saldo bancário não foi estornado corretamente para 10000');
  }

  // TESTE 2: TÍTULOS A RECEBER (EM LOTE)
  console.log('\n[TESTE 2] Reabertura em Lote de Títulos a Receber');
  const recTitle1: FinancialTitle = {
    id: 'rec-test-1-' + Date.now(),
    titleNumber: 'REC-001',
    type: 'RECEBER',
    counterpartyId: 'cli-1',
    description: 'Consultoria Contábil',
    chartAccountId: 'cat-rec',
    issueDate: '2026-10-01',
    dueDate: '2026-10-10',
    originalAmount: 800,
    balancePrincipal: 800,
    settledPrincipal: 0,
    settlementState: 'ABERTO',
    documentState: 'EMITIDO',
    competence: '2026-10',
    createdAt: new Date().toISOString()
  };

  const recTitle2: FinancialTitle = {
    id: 'rec-test-2-' + Date.now(),
    titleNumber: 'REC-002',
    type: 'RECEBER',
    counterpartyId: 'cli-2',
    description: 'Auditoria Mensal',
    chartAccountId: 'cat-rec',
    issueDate: '2026-10-01',
    dueDate: '2026-10-15',
    originalAmount: 1200,
    balancePrincipal: 1200,
    settledPrincipal: 0,
    settlementState: 'ABERTO',
    documentState: 'EMITIDO',
    competence: '2026-10',
    createdAt: new Date().toISOString()
  };

  storage.saveTitles([...storage.getTitles(), recTitle1, recTitle2]);

  // Liquidar ambos
  const settleRec1 = FinancialEngine.postSettlement({
    titleId: recTitle1.id,
    principalSettled: 800,
    settlementDate: '2026-10-07',
    bankAccountId: testAccount.id
  });
  if (!settleRec1.success) throw new Error('Falha baixa rec 1: ' + settleRec1.message);

  const settleRec2 = FinancialEngine.postSettlement({
    titleId: recTitle2.id,
    principalSettled: 1200,
    settlementDate: '2026-10-07',
    bankAccountId: testAccount.id
  });
  if (!settleRec2.success) throw new Error('Falha baixa rec 2: ' + settleRec2.message);

  const accAfterRec = storage.getBankAccounts().find(a => a.id === testAccount.id)!;
  console.log(`✓ Saldo após receber 800 + 1200: R$ ${accAfterRec.currentBalance} (Esperado: 12000)`);
  if (accAfterRec.currentBalance !== 12000) {
    throw new Error('Saldo incorreto após recebimento');
  }

  // Reabrir em Lote
  const reopenBatchRes = FinancialEngine.reopenTitlesToOpenBatch([recTitle1.id, recTitle2.id], 'Estorno em lote de recebimentos');
  console.log('✓ Resultado da reabertura em lote:', reopenBatchRes.message);
  if (!reopenBatchRes.success || reopenBatchRes.reopenedCount !== 2) {
    throw new Error('Falha na reabertura em lote');
  }

  // Verificar ambos os títulos a receber
  const titlesReloaded = storage.getTitles();
  const reloadedRec1 = titlesReloaded.find(t => t.id === recTitle1.id)!;
  const reloadedRec2 = titlesReloaded.find(t => t.id === recTitle2.id)!;

  console.log(`✓ Rec 1: Estado=${reloadedRec1.settlementState}, Saldo=R$ ${reloadedRec1.balancePrincipal}, Baixado=R$ ${reloadedRec1.settledPrincipal}`);
  console.log(`✓ Rec 2: Estado=${reloadedRec2.settlementState}, Saldo=R$ ${reloadedRec2.balancePrincipal}, Baixado=R$ ${reloadedRec2.settledPrincipal}`);

  if (reloadedRec1.settlementState !== 'ABERTO' || reloadedRec1.balancePrincipal !== 800 || reloadedRec1.settledPrincipal !== 0 ||
      reloadedRec2.settlementState !== 'ABERTO' || reloadedRec2.balancePrincipal !== 1200 || reloadedRec2.settledPrincipal !== 0) {
    throw new Error('Títulos a receber não foram restaurados integralmente');
  }

  // Saldo bancário após estorno do recebimento deve ter voltado para 10000
  const accFinal = storage.getBankAccounts().find(a => a.id === testAccount.id)!;
  console.log(`✓ Saldo bancário final: R$ ${accFinal.currentBalance} (Esperado: 10000)`);
  if (accFinal.currentBalance !== 10000) {
    throw new Error('Saldo bancário não retornou a 10000 após estorno em lote');
  }

  // TESTE 3: AUDITORIA E MOVIMENTAÇÕES BANCÁRIAS
  console.log('\n[TESTE 3] Auditoria e Integridade das Movimentações');
  const movements = storage.getMovements();
  const payMovements = movements.filter(m => m.documentRef === payableTitle.titleNumber);
  console.log(`✓ Movimentações associadas a PAG-001: ${payMovements.length}, todas com isReversed=${payMovements.every(m => m.isReversed)}`);
  if (!payMovements.every(m => m.isReversed)) {
    throw new Error('Movimentações bancárias não foram marcadas como isReversed=true');
  }

  const auditLogs = storage.getAuditLogs();
  const reopenLogs = auditLogs.filter(a => a.action === 'REABERTURA_TITULO_EM_ABERTO');
  console.log(`✓ Logs de auditoria de reabertura registrados: ${reopenLogs.length}`);
  if (reopenLogs.length < 3) {
    throw new Error('Faltam logs de auditoria para os títulos reabertos');
  }

  console.log('\n================================================================');
  console.log('✓ TODOS OS TESTES PASSARAM COM 100% DE SUCESSO E INTEGRIDADE!');
  console.log('================================================================');
}

runTests();
