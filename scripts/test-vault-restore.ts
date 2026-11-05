import { storage } from '../src/services/storageService';
import { FinancialTitle } from '../src/types';

async function runVaultRestoreTest() {
  console.log('========================================================================');
  console.log('🗄️ TESTE AUTOMATIZADO: COFRE DE SEGURANÇA & RESTAURAÇÃO EM 1 CLIQUE');
  console.log('========================================================================\n');

  // 1. Criar um título de teste
  const testId = `tit-vault-test-${Date.now()}`;
  const mockTitle: FinancialTitle = {
    id: testId,
    type: 'PAGAR',
    titleNumber: 'PAG-VAULT-001',
    description: 'Serviço de Segurança e Auditoria Teste',
    originalAmount: 1850.50,
    settledPrincipal: 0,
    balancePrincipal: 1850.50,
    launchDate: '2026-11-04',
    issueDate: '2026-11-04',
    dueDate: '2026-11-20',
    expectedCashDate: '2026-11-20',
    competence: '2026-11',
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'MANUAL'
  };

  const initialTitles = storage.getTitles();
  storage.saveTitles([mockTitle, ...initialTitles]);
  console.log(`1. Título de teste criado: "${mockTitle.description}" (ID: ${mockTitle.id})`);

  // 2. Simular a exclusão do título (que aciona o cofre de segurança)
  console.log('2. Executando exclusão com arquivamento no cofre...');
  storage.batchDeleteTitles([testId], 'Teste de exclusão acidental para validação da Lixeira');

  // Verifica se saiu da lista de títulos
  const titlesAfterDelete = storage.getTitles();
  const titleExists = titlesAfterDelete.some(t => t.id === testId);
  if (titleExists) {
    throw new Error('Falha: O título não deveria estar mais na lista de títulos ativos.');
  }
  console.log('✅ Título removido com sucesso da base ativa.');

  // 3. Verificar o cofre de segurança
  const vault = storage.getDeletedVault();
  const vaultEntry = vault.find(e => e.recordId === testId);
  if (!vaultEntry) {
    throw new Error('Falha: Registro não foi encontrado no cofre de segurança.');
  }
  console.log(`✅ Registro encontrado no cofre: ID=${vaultEntry.id}, Excluído por=${vaultEntry.deletedBy}, Motivo="${vaultEntry.reason}"`);

  // 4. Executar a restauração em 1 clique
  console.log('3. Executando restauração em 1 clique (restoreFromDeletedVault)...');
  const restoreResult = storage.restoreFromDeletedVault(vaultEntry.id);
  console.log(`- Resultado: Sucesso=${restoreResult.success}, Mensagem="${restoreResult.message}"`);
  if (!restoreResult.success) {
    throw new Error(`Falha ao restaurar: ${restoreResult.message}`);
  }

  // 5. Verificar se voltou para os títulos ativos
  const titlesAfterRestore = storage.getTitles();
  const restoredTitle = titlesAfterRestore.find(t => t.id === testId);
  if (!restoredTitle) {
    throw new Error('Falha: Título restaurado não apareceu na lista ativa de títulos.');
  }
  console.log(`✅ Título recuperado na base ativa: "${restoredTitle.description}", Valor=R$ ${restoredTitle.originalAmount}`);

  // 6. Verificar status no cofre (marcado como restaurado)
  const updatedVault = storage.getDeletedVault();
  const updatedEntry = updatedVault.find(e => e.id === vaultEntry.id);
  if (!updatedEntry?.restoredAt) {
    throw new Error('Falha: Registro no cofre deveria estar carimbado com restoredAt.');
  }
  console.log(`✅ Status no cofre atualizado: Restaurado em=${updatedEntry.restoredAt}, Por=${updatedEntry.restoredBy}`);

  // 7. Teste de Snapshot de Emergência
  console.log('4. Testando criação e restauração de Snapshot de Emergência...');
  const snap = storage.createSafetySnapshot('Ponto de Teste Pré-Operação');
  console.log(`- Snapshot criado: ${snap.label} em ${snap.timestamp}`);
  const snapData = storage.getSafetySnapshot();
  if (!snapData) {
    throw new Error('Falha: Snapshot de emergência não encontrado.');
  }
  console.log('✅ Snapshot de emergência recuperado e verificado com sucesso.');

  // Limpeza do título de teste
  storage.saveTitles(titlesAfterRestore.filter(t => t.id !== testId));
  storage.deleteVaultEntry(vaultEntry.id);
  console.log('5. Limpeza de registros de teste concluída.');

  console.log('\n========================================================================');
  console.log('🎉 TESTE DO COFRE E RESTAURAÇÃO EM 1 CLIQUE APROVADO COM SUCESSO TOTAL!');
  console.log('========================================================================\n');
}

runVaultRestoreTest().catch(err => {
  console.error('❌ ERRO NO TESTE:', err);
  process.exit(1);
});
