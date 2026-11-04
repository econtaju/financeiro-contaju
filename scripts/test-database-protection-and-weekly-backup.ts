/**
 * Teste Automatizado de Proteção do Banco de Dados e Rotina de Exportação Semanal
 */

import dotenv from 'dotenv';
dotenv.config();

import { storage } from '../src/services/storageService';
import { automaticBackupService } from '../src/services/automaticBackupService';
import { FinancialTitle, PeriodClosure } from '../src/types';

console.log('========================================================================');
console.log('🛡️ AUDITORIA & TESTE DE PROTEÇÃO DO BANCO DE DADOS E BACKUP SEMANAL');
console.log('========================================================================\n');

async function runAudit() {
  // 1. Inicializar dados
  console.log('📦 1. Verificando integridade da base de dados...');
  await storage.initializeDatabaseFirst();

  const titles = storage.getTitles();
  const contracts = storage.getContracts();
  const counterparties = storage.getCounterparties();
  const closures = storage.getPeriodClosures();
  console.log(`- Títulos ativos: ${titles.length}`);
  console.log(`- Contratos ativos: ${contracts.length}`);
  console.log(`- Clientes/Fornecedores: ${counterparties.length}`);
  console.log(`- Fechamentos contábeis registrados: ${closures.length}`);

  // -------------------------------------------------------------------------
  // TESTE 1: Proteção de Títulos em Períodos Encerrados
  // -------------------------------------------------------------------------
  console.log('\n🔒 TESTE 1: Proteção de Títulos em Períodos Encerrados');
  const testMonth = '2026-01';
  let currentClosures = storage.getPeriodClosures();
  if (!currentClosures.some(c => c.yearMonth === testMonth && c.isClosed)) {
    const newClosure: PeriodClosure = {
      id: `closure-${testMonth}`,
      yearMonth: testMonth,
      isClosed: true,
      closedAt: new Date().toISOString(),
      closedBy: 'Auditoria de Segurança',
      notes: 'Fechamento de teste'
    };
    storage.savePeriodClosures([...currentClosures, newClosure]);
  }

  // Tentar criar um título nesse mês fechado e tentar deletar
  const closedPeriodTitle: FinancialTitle = {
    id: `tit-test-closed-${Date.now()}`,
    titleNumber: 'TEST-CLOSED-001',
    description: 'Título em Mês Fechado',
    type: 'PAGAR',
    originalAmount: 150,
    settledPrincipal: 0,
    balancePrincipal: 150,
    accruedInterest: 0,
    accruedFine: 0,
    competence: testMonth,
    issueDate: `${testMonth}-05`,
    dueDate: `${testMonth}-20`,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    reconciliationStatus: 'NAO_CONCILIADO',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  storage.saveTitles([closedPeriodTitle, ...storage.getTitles()]);
  console.log(`- Título de teste criado na competência encerrada (${testMonth}): ID ${closedPeriodTitle.id}`);

  // Tentar excluir com batchDeleteTitles
  const deleteAttempt = storage.batchDeleteTitles([closedPeriodTitle.id]);
  console.log(`- Tentativa de exclusão em período fechado: Deletados = ${deleteAttempt.deletedCount}`);
  if (deleteAttempt.deletedCount !== 0) {
    throw new Error('FALHA DE SEGURANÇA: Título em período contábil fechado foi excluído!');
  }
  console.log('✅ TRAVA CONTÁBIL APROVADA: Títulos de meses encerrados não podem ser excluídos!');

  // Limpar título de teste do storage
  storage.saveTitles(storage.getTitles().filter(t => t.id !== closedPeriodTitle.id));

  // -------------------------------------------------------------------------
  // TESTE 2: Cofre de Registros Excluídos (Soft Delete Vault)
  // -------------------------------------------------------------------------
  console.log('\n🗄️ TESTE 2: Cofre de Registros Excluídos (Soft Delete Vault)');
  const dummyTitle: FinancialTitle = {
    id: `tit-vault-test-${Date.now()}`,
    titleNumber: 'TEST-VAULT-001',
    description: 'Título para Teste de Cofre de Exclusão',
    type: 'PAGAR',
    originalAmount: 250,
    settledPrincipal: 0,
    balancePrincipal: 250,
    accruedInterest: 0,
    accruedFine: 0,
    competence: '2026-11',
    issueDate: '2026-11-01',
    dueDate: '2026-11-15',
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    reconciliationStatus: 'NAO_CONCILIADO',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  storage.saveTitles([dummyTitle, ...storage.getTitles()]);
  storage.batchDeleteTitles([dummyTitle.id]);

  const vaultEntries = storage.getDeletedVault();
  const archived = vaultEntries.find(e => e.recordId === dummyTitle.id);

  if (!archived) {
    throw new Error('FALHA NO COFRE: Título excluído não foi arquivado no cofre de segurança!');
  }
  console.log(`- Registro arquivado com sucesso no cofre: ID ${archived.id}, Deletado por: ${archived.deletedBy}, Em: ${archived.deletedAt}`);
  console.log('✅ COFRE DE SEGURANÇA APROVADO: Dados excluídos são preservados para auditoria/recuperação!');

  // -------------------------------------------------------------------------
  // TESTE 3: Snapshot de Emergência Pré-Operação
  // -------------------------------------------------------------------------
  console.log('\n⚡ TESTE 3: Snapshot de Emergência da Base de Dados');
  const snapResult = storage.createSafetySnapshot('Auditoria de Segurança Automatizada');
  console.log(`- Snapshot criado com carimbo: ${snapResult.timestamp}, Rótulo: ${snapResult.label}`);

  const retrievedSnap = storage.getSafetySnapshot();
  if (!retrievedSnap || !retrievedSnap.data || !retrievedSnap.data.includes('Sistema')) {
    throw new Error('FALHA NO SNAPSHOT: Snapshot de segurança não pôde ser recuperado!');
  }
  console.log(`- Snapshot recuperado com sucesso (${(retrievedSnap.data.length / 1024).toFixed(1)} KB de dados serializados).`);
  console.log('✅ SNAPSHOT DE EMERGÊNCIA APROVADO!');

  // -------------------------------------------------------------------------
  // TESTE 4: Rotina Semanal de Exportação Automática
  // -------------------------------------------------------------------------
  console.log('\n📅 TESTE 4: Rotina Semanal de Exportação de Dados');
  const config = automaticBackupService.getConfig();
  console.log('- Configuração Semanal:', {
    Ativado: config.enabled ? 'SIM' : 'NÃO',
    Frequência: config.frequency,
    DiaDaSemana: `${config.dayOfWeek} (1=Segunda-feira)`,
    Horário: config.timeOfDay,
    Destinatários: config.recipients
  });

  if (!config.enabled || config.frequency !== 'WEEKLY') {
    throw new Error('FALHA NA ROTINA SEMANAL: O backup automático semanal não está devidamente ativado!');
  }

  // Executar exportação semanal agora
  console.log('- Executando disparo da rotina de exportação semanal...');
  const execResult = await automaticBackupService.executeBackupNow('AUTOMATICO_SEMANAL');
  console.log(`- Resultado: Sucesso = ${execResult.success ? 'SIM' : 'NÃO'}, Arquivo = ${execResult.filename}, Tamanho = ${execResult.sizeKb} KB`);

  // Verificar se o snapshot semanal foi gravado no cofre local
  const weeklySnapshots = automaticBackupService.getWeeklyLocalSnapshots();
  console.log(`- Snapshots semanais arquivados localmente: ${weeklySnapshots.length}`);
  const latestLocalSnap = weeklySnapshots.find(s => s.filename === execResult.filename);

  if (!latestLocalSnap) {
    throw new Error('FALHA NA RETENÇÃO LOCAL: O snapshot semanal não foi arquivado localmente!');
  }
  console.log(`- Snapshot local verificado: ${latestLocalSnap.filename} (${latestLocalSnap.sizeKb} KB), Títulos: ${latestLocalSnap.stats.totalTitles}, Contratos: ${latestLocalSnap.stats.totalContracts}`);
  console.log('✅ ROTINA SEMANAL COM RETENÇÃO LOCAL APROVADA: Dados 100% salvos e exportáveis!');

  console.log('\n========================================================================');
  console.log('🎉 TODAS AS PROTEÇÕES DO BANCO E A ROTINA SEMANAL FORAM APROVADAS COM 100% DE SUCESSO!');
  console.log('========================================================================\n');
}

runAudit().catch(err => {
  console.error('❌ Erro durante o teste:', err);
  process.exit(1);
});
