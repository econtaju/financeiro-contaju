import dotenv from 'dotenv';
dotenv.config();

import { automaticBackupService } from '../src/services/automaticBackupService';
import { storage } from '../src/services/storageService';

async function testAutomaticBackup() {
  console.log('========================================================================');
  console.log('📦 TESTANDO ROTINA AUTOMÁTICA DE EXPORTAÇÃO DE BACKUPS .JSON VIA E-MAIL');
  console.log('========================================================================\n');

  // 1. Carrega dados e hidrata se necessário
  console.log('1. Carregando dados do sistema...');
  await storage.initializeDatabaseFirst();

  const titles = storage.getTitles();
  const contracts = storage.getContracts();
  const counterparties = storage.getCounterparties();
  console.log(`- Títulos carregados: ${titles.length}`);
  console.log(`- Contratos carregados: ${contracts.length}`);
  console.log(`- Clientes/Fornecedores: ${counterparties.length}`);

  // 2. Configurações atuais
  const config = automaticBackupService.getConfig();
  console.log('\n2. Configurações da Rotina Semanal:', config);

  // 3. Execução da Rotina de Backup via E-mail
  console.log('\n3. Executando envio do backup .JSON por e-mail via Resend...');
  const result = await automaticBackupService.executeBackupNow('AUTOMATICO_SEMANAL');

  console.log('\n--- RESULTADO DO ENVIO ---');
  console.log('Sucesso:', result.success ? '✅ SIM' : '❌ NÃO');
  console.log('Mensagem:', result.message);
  console.log('Nome do arquivo gerado:', result.filename);
  console.log('Tamanho do arquivo:', result.sizeKb ? `${result.sizeKb} KB` : 'N/A');
  console.log('Destinatários:', result.sentTo?.join(', '));

  // 4. Verificação dos Logs de Auditoria
  const auditLogs = storage.getAuditLogs();
  const lastLog = auditLogs[0];
  console.log('\n4. Último Registro na Auditoria do Sistema:');
  console.log(`- Ação: ${lastLog?.action}`);
  console.log(`- Usuário: ${lastLog?.userName}`);
  console.log(`- Detalhes: ${lastLog?.details}`);

  if (result.success) {
    console.log('\n========================================================================');
    console.log('⭐ ROTINA DE EXPORTAÇÃO DE BACKUP SEMANAL TESTADA E APROVADA COM SUCESSO!');
    console.log('========================================================================');
  } else {
    console.error('\n❌ Falha no envio do backup:', result.error);
    process.exit(1);
  }
}

testAutomaticBackup().catch((err) => {
  console.error('Erro no teste de backup automático:', err);
  process.exit(1);
});
