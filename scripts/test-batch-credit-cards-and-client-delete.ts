import { storage } from '../src/services/storageService';
import { CreditCardPurchase } from '../src/types';

async function runTests() {
  console.log('🧪 Iniciando testes de Exclusão de Clientes, Recorrência e Operações em Lote no Cartão de Crédito...');

  // ==========================================
  // Teste 1: Exclusão e Restauração de Cliente
  // ==========================================
  console.log('\n--- Teste 1: Exclusão e Restauração de Cliente no Cofre ---');
  const dummyClient = {
    id: `cli-test-${Date.now()}`,
    name: 'Cliente Teste Exclusão Segura Ltda',
    tradeName: 'Cliente Teste',
    document: '12.345.678/0001-99',
    type: 'PJ' as const,
    active: true,
    roles: ['CLIENTE' as const],
    email: 'teste@exclusao.com',
    phone: '11999998888',
    createdAt: new Date().toISOString()
  };

  storage.saveCounterparties([dummyClient, ...storage.getCounterparties()]);
  console.log('✅ Cliente temporário criado:', dummyClient.id);

  // Excluir cliente
  const deleteResult = storage.deleteCounterparty(dummyClient.id, { reason: 'Teste unitário automatizado' });
  if (!deleteResult.success) {
    throw new Error(`Falha ao excluir cliente: ${deleteResult.error}`);
  }
  console.log('✅ Cliente excluído com sucesso');

  // Verificar se o cliente foi salvo no cofre
  const vault = storage.getDeletedVault();
  const vaultEntry = vault.find(e => e.recordId === dummyClient.id && e.recordType === 'CLIENT');
  if (!vaultEntry) {
    throw new Error('Falha: Cliente excluído não foi encontrado no Cofre de Segurança!');
  }
  console.log('✅ Cliente verificado no Cofre de Segurança:', vaultEntry.id);

  // Restaurar cliente do cofre
  const restoreResult = storage.restoreFromDeletedVault(vaultEntry.id);
  if (!restoreResult.success) {
    throw new Error(`Falha ao restaurar cliente do cofre: ${restoreResult.message}`);
  }
  const clientRestored = storage.getCounterparties().find(c => c.id === dummyClient.id);
  if (!clientRestored) {
    throw new Error('Falha: Cliente restaurado não consta na lista de clientes ativos!');
  }
  console.log('✅ Cliente restaurado com sucesso do Cofre');

  // Limpar cliente de teste
  storage.deleteCounterparty(dummyClient.id, { skipVault: true });

  // ==========================================
  // Teste 2: Compra com Recorrência e Sincronização no Contas a Pagar
  // ==========================================
  console.log('\n--- Teste 2: Compra Parcelada/Recorrente e Títulos no Contas a Pagar ---');
  const testCardId = `card-test-emp-${Date.now()}`;
  storage.saveCreditCards([
    {
      id: testCardId,
      name: 'Cartão Visa Platinum Corporativo',
      lastFourDigits: '9876',
      brand: 'VISA',
      creditLimit: 50000,
      closingDay: 10,
      dueDay: 20,
      color: 'blue',
      active: true,
      createdAt: new Date().toISOString()
    },
    ...storage.getCreditCards()
  ]);

  const testPurchaseId = `cp-rec-test-${Date.now()}`;
  
  const testPurchase: CreditCardPurchase = {
    id: testPurchaseId,
    cardId: testCardId,
    transactionType: 'DESPESA',
    purchaseDate: '2026-11-05',
    description: 'Assinatura Software Cloud Teste',
    counterpartyName: 'Cloud Provider Test',
    chartAccountId: 'acc-desp-1',
    totalAmount: 300,
    installmentsCount: 3,
    calculationMode: 'PER_INSTALLMENT',
    installmentValue: 100,
    invoiceMonth: '2026-11',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 100,
        competence: '2026-11',
        dueDate: '2026-11-20',
        invoiceMonth: '2026-11',
        settled: false
      },
      {
        installmentNumber: 2,
        totalInstallments: 3,
        amount: 100,
        competence: '2026-12',
        dueDate: '2026-12-20',
        invoiceMonth: '2026-12',
        settled: false
      },
      {
        installmentNumber: 3,
        totalInstallments: 3,
        amount: 100,
        competence: '2027-01',
        dueDate: '2027-01-20',
        invoiceMonth: '2027-01',
        settled: false
      }
    ],
    createdAt: new Date().toISOString()
  };

  storage.addCardPurchaseAndSyncTitles(testPurchase);
  const titlesAfterAdd = storage.getTitles().filter(t => t.originId === testPurchaseId);
  if (titlesAfterAdd.length !== 3) {
    throw new Error(`Esperado 3 títulos no Contas a Pagar, encontrado: ${titlesAfterAdd.length}`);
  }
  console.log('✅ Compra recorrente de 3 faturas criada com 3 títulos sincronizados no Contas a Pagar');

  // ==========================================
  // Teste 3: Edição em Lote com Atualização de Faturas Futuras
  // ==========================================
  console.log('\n--- Teste 3: Edição em Lote (troca de categoria e descrição com applyToFuture: true) ---');
  const batchEditResult = storage.updateCardPurchasesBatch({
    items: [{ purchaseId: testPurchaseId, installmentNumber: 1 }],
    applyToFuture: true,
    changes: {
      chartAccountId: 'acc-desp-2',
      description: 'Assinatura Cloud Pro Atualizada'
    }
  });

  if (!batchEditResult.success || batchEditResult.affectedCount === 0) {
    throw new Error('Falha na edição em lote de compras de cartão');
  }

  const updatedPurchase = storage.getCardPurchases().find(p => p.id === testPurchaseId);
  if (updatedPurchase?.description !== 'Assinatura Cloud Pro Atualizada' || updatedPurchase?.chartAccountId !== 'acc-desp-2') {
    throw new Error('Falha: Os campos da compra não foram atualizados na edição em lote!');
  }

  const updatedTitles = storage.getTitles().filter(t => t.originId === testPurchaseId);
  if (updatedTitles.some(t => t.accountId !== 'acc-desp-2')) {
    throw new Error('Falha: Os títulos no Contas a Pagar não herdaram a nova categoria!');
  }
  console.log('✅ Edição em lote aplicada com sucesso na compra e em todos os títulos do Contas a Pagar');

  // ==========================================
  // Teste 4: Exclusão com Pergunta de Futuros (Modo CURRENT_AND_ALL_FUTURE a partir da parcela 2)
  // ==========================================
  console.log('\n--- Teste 4: Exclusão a partir da Parcela 2 e Futuros (CURRENT_AND_ALL_FUTURE) ---');
  const deleteBatchResult = storage.deleteCardPurchasesBatch({
    items: [{ purchaseId: testPurchaseId, installmentNumber: 2 }],
    mode: 'CURRENT_AND_ALL_FUTURE',
    reason: 'Cancelamento das parcelas futuras pelo usuário'
  });

  if (!deleteBatchResult.success || deleteBatchResult.affectedCount === 0) {
    throw new Error('Falha na exclusão em lote modo CURRENT_AND_ALL_FUTURE');
  }

  const purchaseAfterFutureDelete = storage.getCardPurchases().find(p => p.id === testPurchaseId);
  if (!purchaseAfterFutureDelete || purchaseAfterFutureDelete.installments.length !== 1) {
    throw new Error(`Esperado que restasse apenas a parcela 1 (passada), encontrado: ${purchaseAfterFutureDelete?.installments.length}`);
  }

  const titlesAfterFutureDelete = storage.getTitles().filter(t => t.originId === testPurchaseId);
  if (titlesAfterFutureDelete.length !== 1 || titlesAfterFutureDelete[0].installmentIndex !== 1) {
    throw new Error(`Esperado 1 título restante no Contas a Pagar (parcela 1), encontrado: ${titlesAfterFutureDelete.length}`);
  }
  console.log('✅ Parcelas 2 e 3 foram canceladas e removidas do Contas a Pagar mantendo a parcela 1 intacta');

  // Limpeza final do teste
  storage.deleteCardPurchase(testPurchaseId, { skipVault: true });
  storage.deleteCreditCard(testCardId);
  console.log('✅ Limpeza dos dados de teste realizada');

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!\n');
}

runTests().catch(err => {
  console.error('❌ Erro no teste:', err);
  process.exit(1);
});
