// Mock de localStorage para ambiente Node puro
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear()
  };
  (globalThis as any).window = globalThis;
}

import { ConflictResolutionEngine } from '../src/services/conflictResolutionEngine';
import { FinancialTitle, Settlement } from '../src/types';
import { storage } from '../src/services/storageService';

console.log('=== TESTE DE DETECÇÃO E RESOLUÇÃO AUTOMÁTICA DE CONFLITOS MULTI-DISPOSITIVO ===\n');

// 1. Setup inicial de dados de simulação
const baseTitle: FinancialTitle = {
  id: 'title-conflict-test-01',
  companyId: 'company-01',
  type: 'PAGAR',
  titleNumber: 'DUP-2026-999',
  counterpartyId: 'prov-01',
  description: 'Licença Software de Design',
  accountId: 'conta-software',
  launchDate: '2026-10-01',
  competence: '2026-10',
  issueDate: '2026-10-01',
  dueDate: '2026-10-15',
  expectedCashDate: '2026-10-15',
  originalAmount: 1000.0,
  settledPrincipal: 0.0,
  balancePrincipal: 1000.0,
  accruedInterest: 0,
  accruedFine: 0,
  documentState: 'CONFIRMADO',
  settlementState: 'ABERTO',
  originType: 'MANUAL',
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z'
};

// Cenário 1: Edição concorrente de texto e vencimento com Last-Write-Wins (LWW)
console.log('--- Teste 1: Conflito de Edição de Metadados (LWW) ---');
const localTitleEdit: FinancialTitle = {
  ...baseTitle,
  description: 'Licença Software de Design Anual (Editado no Celular)',
  dueDate: '2026-10-20',
  updatedAt: '2026-10-06T10:00:00.000Z' // Modificado às 10:00
};

const remoteTitleEdit: FinancialTitle = {
  ...baseTitle,
  description: 'Licença Software de Design Figma Pro (Editado no Desktop)',
  dueDate: '2026-10-25',
  categoryName: 'TI e Software',
  updatedAt: '2026-10-06T11:30:00.000Z' // Modificado às 11:30 (Vencedor LWW)
};

const comparison1 = ConflictResolutionEngine.compareTitles(localTitleEdit, remoteTitleEdit);
console.log(`Divergências detectadas: ${comparison1.hasConflict ? 'SIM' : 'NÃO'}`);
console.log(`Campos divergentes: ${comparison1.diffFields.join(', ')}`);

const result1 = ConflictResolutionEngine.resolveTitle(localTitleEdit, remoteTitleEdit, []);
console.log(`Vencedor determinado: ${result1.conflictReport?.winner}`);
console.log(`Descrição consolidada: ${result1.resolved.description}`);
console.log(`Data de vencimento consolidada: ${result1.resolved.dueDate}`);

if (result1.conflictReport?.winner !== 'REMOTE') {
  throw new Error('Falha no Teste 1: Remote deveria ter vencido pelo timestamp mais recente.');
}
if (result1.resolved.dueDate !== '2026-10-25') {
  throw new Error('Falha no Teste 1: Vencimento deveria ser 2026-10-25.');
}
console.log('✓ Teste 1 passou com sucesso!\n');

// Cenário 2: Quitações parciais concorrentes em múltiplos dispositivos
console.log('--- Teste 2: Fusão de Quitações Parciais Concorrentes ---');
const localSettlement: Settlement = {
  id: 'settlement-local-celular-01',
  titleId: baseTitle.id,
  settlementNumber: 'LIQ-CEL-01',
  settlementDate: '2026-10-06',
  bankAccountId: 'bank-01',
  components: {
    principalSettled: 400.0,
    discount: 0,
    interest: 0,
    fine: 0,
    bankFee: 0,
    netFinancialAmount: 400.0
  },
  isReversed: false,
  createdAt: '2026-10-06T12:00:00.000Z',
  createdBy: 'Operador Celular'
};

const remoteSettlement: Settlement = {
  id: 'settlement-remote-desktop-02',
  titleId: baseTitle.id,
  settlementNumber: 'LIQ-DSK-02',
  settlementDate: '2026-10-06',
  bankAccountId: 'bank-02',
  components: {
    principalSettled: 350.0,
    discount: 0,
    interest: 0,
    fine: 0,
    bankFee: 0,
    netFinancialAmount: 350.0
  },
  isReversed: false,
  createdAt: '2026-10-06T12:15:00.000Z',
  createdBy: 'Operador Escritório'
};

// Mescla settlements
const settlementMerge = ConflictResolutionEngine.mergeSettlements([localSettlement], [remoteSettlement]);
console.log(`Liquidações unificadas: ${settlementMerge.mergedSettlements.length}`);
console.log(`Preservadas do local: ${settlementMerge.preservedFromLocalCount}`);
console.log(`Adicionadas do remoto: ${settlementMerge.newFromRemoteCount}`);

if (settlementMerge.mergedSettlements.length !== 2) {
  throw new Error('Falha no Teste 2: Ambas as baixas deveriam ter sido consolidadas.');
}

// Resolve título com as quitações consolidadas
const result2 = ConflictResolutionEngine.resolveTitle(localTitleEdit, remoteTitleEdit, settlementMerge.mergedSettlements);
console.log(`Principal baixado consolidado: R$ ${result2.resolved.settledPrincipal}`);
console.log(`Saldo devedor recalculado: R$ ${result2.resolved.balancePrincipal}`);
console.log(`Estado de liquidação: ${result2.resolved.settlementState}`);

if (result2.resolved.settledPrincipal !== 750.0) {
  throw new Error(`Falha no Teste 2: Principal baixado deveria ser 750.0, obteve ${result2.resolved.settledPrincipal}`);
}
if (result2.resolved.balancePrincipal !== 250.0) {
  throw new Error(`Falha no Teste 2: Saldo devedor deveria ser 250.0, obteve ${result2.resolved.balancePrincipal}`);
}
if (result2.resolved.settlementState !== 'PARCIAL') {
  throw new Error(`Falha no Teste 2: Estado deveria ser PARCIAL, obteve ${result2.resolved.settlementState}`);
}
console.log('✓ Teste 2 passou com sucesso!\n');

// Cenário 3: Mesclagem completa de coleções com auditoria
console.log('--- Teste 3: Mesclagem de Coleções de Títulos e Verificação de Auditoria ---');
const localTitles = [localTitleEdit];
const remoteTitles = [remoteTitleEdit];

const mergeCollectionResult = ConflictResolutionEngine.mergeTitleCollections(
  localTitles,
  remoteTitles,
  settlementMerge.mergedSettlements
);

console.log(`Títulos consolidados: ${mergeCollectionResult.mergedTitles.length}`);
console.log(`Conflitos detectados e mitigados: ${mergeCollectionResult.conflictsResolvedCount}`);

if (mergeCollectionResult.conflictsResolvedCount !== 1) {
  throw new Error('Falha no Teste 3: Esperado 1 conflito resolvido.');
}

// Verifica se relatório foi gerado e registrado no histórico
const history = ConflictResolutionEngine.getConflictHistory();
console.log(`Relatórios no histórico: ${history.length}`);
const latestReport = history[0];
console.log(`Detalhes do último relatório: Título #${latestReport.titleNumber}, Vencedor: ${latestReport.winner}`);
console.log(`Motivo: ${latestReport.reason}`);

// Verifica log de auditoria
const auditLogs = storage.getAuditLogs();
const conflictAudit = auditLogs.find(a => a.action === 'RESOLUÇÃO_CONFLITO_MULTIDISPOSITIVO');
console.log(`Log de auditoria registrado: ${conflictAudit ? 'SIM' : 'NÃO'}`);
if (conflictAudit) {
  console.log(`Ação: ${conflictAudit.action}`);
  console.log(`Módulo: ${conflictAudit.module}`);
  console.log(`Detalhes: ${conflictAudit.details}`);
}

console.log('\n=== TODOS OS TESTES DE RESOLUÇÃO DE CONFLITO PASSARAM COM 100% DE SUCESSO! ===');
