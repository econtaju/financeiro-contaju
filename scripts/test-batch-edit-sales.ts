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

import { storage } from '../src/services/storageService';
import { Sale, FinancialTitle } from '../src/types';

console.log('=== TESTE DE EDIÇÃO EM LOTE DO MÓDULO DE VENDAS ===\n');

// 1. Setup inicial de dados de simulação
const initialSales: Sale[] = [
  {
    id: 'sale-batch-01',
    saleNumber: 'VND-2026-001',
    customerId: 'client-alpha',
    competence: '2026-10',
    date: '2026-10-01',
    items: [
      {
        id: 'item-01',
        serviceId: 'srv-01',
        description: 'Serviço de BPO Financeiro',
        quantity: 1,
        unitPrice: 2500,
        discount: 0,
        total: 2500,
        accountId: 'acc-receita-bpo'
      }
    ],
    grossTotal: 2500,
    discountTotal: 0,
    netTotal: 2500,
    installmentsCount: 1,
    originType: 'AVULSO',
    status: 'CONFIRMADA',
    createdAt: '2026-10-01T10:00:00.000Z'
  },
  {
    id: 'sale-batch-02',
    saleNumber: 'VND-2026-002',
    customerId: 'client-beta',
    competence: '2026-10',
    date: '2026-10-02',
    items: [
      {
        id: 'item-02',
        serviceId: 'srv-02',
        description: 'Consultoria Contábil Básica',
        quantity: 1,
        unitPrice: 3800,
        discount: 0,
        total: 3800,
        accountId: 'acc-receita-consultoria'
      }
    ],
    grossTotal: 3800,
    discountTotal: 0,
    netTotal: 3800,
    installmentsCount: 1,
    originType: 'AVULSO',
    status: 'CONFIRMADA',
    createdAt: '2026-10-02T10:00:00.000Z'
  }
];

const linkedTitles: FinancialTitle[] = [
  {
    id: 'title-sale-01',
    companyId: 'company-01',
    type: 'RECEBER',
    titleNumber: 'REC-2026-001',
    counterpartyId: 'client-alpha',
    description: 'Serviço de BPO Financeiro',
    accountId: 'acc-receita-bpo',
    launchDate: '2026-10-01',
    competence: '2026-10',
    issueDate: '2026-10-01',
    dueDate: '2026-10-20',
    expectedCashDate: '2026-10-20',
    originalAmount: 2500,
    settledPrincipal: 0,
    balancePrincipal: 2500,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'VENDA',
    saleId: 'sale-batch-01',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z'
  },
  {
    id: 'title-sale-02',
    companyId: 'company-01',
    type: 'RECEBER',
    titleNumber: 'REC-2026-002',
    counterpartyId: 'client-beta',
    description: 'Consultoria Contábil Básica',
    accountId: 'acc-receita-consultoria',
    launchDate: '2026-10-02',
    competence: '2026-10',
    issueDate: '2026-10-02',
    dueDate: '2026-10-25',
    expectedCashDate: '2026-10-25',
    originalAmount: 3800,
    settledPrincipal: 0,
    balancePrincipal: 3800,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'VENDA',
    saleId: 'sale-batch-02',
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z'
  }
];

// Salva no storage inicial
storage.saveSales(initialSales);
storage.saveTitles(linkedTitles);

console.log('--- Teste 1: Execução de Edição em Lote ---');
// Simulando a ação do BatchEditSalesModal:
// Alterar Cliente para 'client-gamma', Categoria para 'acc-receita-premium',
// Data de Emissão para '2026-10-15', e Descrição para 'Assessoria Especial de Gestão'
const newCustomer = 'client-gamma';
const newAccount = 'acc-receita-premium';
const newDate = '2026-10-15';
const newCompetence = '2026-11';
const newDescription = 'Assessoria Especial de Gestão';

const currentSales = storage.getSales();
const selectedIds = ['sale-batch-01', 'sale-batch-02'];

for (const sale of currentSales.filter(s => selectedIds.includes(s.id))) {
  const updatedSale: Sale = {
    ...sale,
    customerId: newCustomer,
    date: newDate,
    competence: newCompetence,
    items: sale.items.map(item => ({
      ...item,
      description: newDescription,
      accountId: newAccount
    }))
  };
  storage.updateSale(updatedSale, true);
}

// 2. Verificação das vendas atualizadas
const updatedSales = storage.getSales();
const s1 = updatedSales.find(s => s.id === 'sale-batch-01')!;
const s2 = updatedSales.find(s => s.id === 'sale-batch-02')!;

console.log(`Venda 1 cliente: ${s1.customerId} (esperado: ${newCustomer})`);
console.log(`Venda 1 data: ${s1.date} (esperado: ${newDate})`);
console.log(`Venda 1 competência: ${s1.competence} (esperado: ${newCompetence})`);
console.log(`Venda 1 serviço: ${s1.items[0].description} (esperado: ${newDescription})`);
console.log(`Venda 1 conta analítica: ${s1.items[0].accountId} (esperado: ${newAccount})`);
console.log(`Venda 1 valor preservado: R$ ${s1.netTotal} (esperado: 2500)`);

if (s1.customerId !== newCustomer || s2.customerId !== newCustomer) {
  throw new Error('Falha: Clientes não foram atualizados em lote.');
}
if (s1.date !== newDate || s2.date !== newDate) {
  throw new Error('Falha: Data de emissão não foi atualizada em lote.');
}
if (s1.competence !== newCompetence || s2.competence !== newCompetence) {
  throw new Error('Falha: Competência não foi atualizada em lote.');
}
if (s1.items[0].accountId !== newAccount || s2.items[0].accountId !== newAccount) {
  throw new Error('Falha: Conta/categoria de serviço não foi atualizada em lote.');
}
if (s1.netTotal !== 2500 || s2.netTotal !== 3800) {
  throw new Error('Falha: Valores individuais das vendas foram corrompidos.');
}
console.log('✓ Vendas atualizadas em lote com 100% de integridade!\n');

// 3. Verificação da sincronização com os títulos a receber vinculados
console.log('--- Teste 2: Sincronização com Parcelas a Receber Vinculadas ---');
const updatedTitles = storage.getTitles();
const t1 = updatedTitles.find(t => t.saleId === 'sale-batch-01')!;
const t2 = updatedTitles.find(t => t.saleId === 'sale-batch-02')!;

console.log(`Título 1 cliente sincronizado: ${t1.counterpartyId} (esperado: ${newCustomer})`);
console.log(`Título 1 categoria contábil sincronizada: ${t1.accountId} (esperado: ${newAccount})`);
console.log(`Título 1 competência sincronizada: ${t1.competence} (esperado: ${newCompetence})`);
console.log(`Título 1 saldo a receber preservado: R$ ${t1.balancePrincipal} (esperado: 2500)`);

if (t1.counterpartyId !== newCustomer || t2.counterpartyId !== newCustomer) {
  throw new Error('Falha: Cliente não sincronizou com os títulos a receber.');
}
if (t1.accountId !== newAccount || t2.accountId !== newAccount) {
  throw new Error('Falha: Categoria do serviço não sincronizou com os títulos a receber.');
}
if (t1.competence !== newCompetence || t2.competence !== newCompetence) {
  throw new Error('Falha: Competência econômica não sincronizou com os títulos a receber.');
}
console.log('✓ Parcelas a receber sincronizadas perfeitamente sem quebra de saldos!\n');

console.log('=== TODOS OS TESTES DE EDIÇÃO EM LOTE DE VENDAS PASSARAM COM SUCESSO! ===');
