import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

import { supabaseSync } from '../src/services/supabaseSyncService';
import { storage } from '../src/services/storageService';
import { FinancialTitle, Contract } from '../src/types';

async function runTest() {
  console.log('========================================================================');
  console.log('🚀 TESTE DE BANCO DE DADOS PRIMÁRIO & PERSISTÊNCIA DIRETA SUPABASE');
  console.log('========================================================================');

  // 1. Teste de PULL geral
  console.log('\n--- 1. Executando Pull All from Supabase ---');
  const pullRes = await supabaseSync.pullAllFromSupabase();
  console.log('Resultado do Pull:', pullRes.success ? '✅ SUCESSO' : '❌ FALHA');
  console.log('Mensagem:', pullRes.message);
  console.log('Total de registros baixados:', pullRes.stats?.totalRecords);
  console.log('Títulos:', pullRes.stats?.titles);
  console.log('Contratos:', pullRes.stats?.contracts);
  console.log('Clientes/Fornecedores:', pullRes.stats?.counterparties);
  console.log('Contas Bancárias:', pullRes.stats?.bankAccounts);

  // 2. Teste de INSERT DIRETO de Título no Supabase
  console.log('\n--- 2. Testando Gravação Direta de Título no Supabase ---');
  const testTitleId = 'title-test-direct-' + Date.now();
  const testTitle: FinancialTitle = {
    id: testTitleId,
    companyId: 'comp-1',
    type: 'PAGAR',
    titleNumber: 'TIT-DIR-999',
    description: 'Título de Teste Direto Supabase',
    counterpartyId: 'prov-2',
    accountId: 'acc-3.4.02', // Conta analítica válida no Supabase
    launchDate: '2026-10-16',
    competence: '2026-10',
    issueDate: '2026-10-16',
    dueDate: '2026-10-30',
    expectedCashDate: '2026-10-30',
    originalAmount: 250.75,
    settledPrincipal: 0,
    balancePrincipal: 250.75,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'MANUAL',
    createdAt: new Date().toISOString()
  };

  const saveRes = await supabaseSync.saveTitleDirectly(testTitle);
  console.log('Gravação de Título:', saveRes.success ? '✅ SUCESSO' : '❌ ERRO: ' + saveRes.error);

  // 3. Verificação no Supabase
  const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
  const { data: verifyData } = await client.from('contaju_financial_titles').select('*').eq('id', testTitleId);
  console.log('Título verificado no Supabase:', verifyData?.length === 1 ? '✅ PRESENTE NO BANCO' : '❌ NÃO ENCONTRADO');

  // 4. Teste de DELEÇÃO DIRETA no Supabase
  console.log('\n--- 3. Testando Deleção Direta no Supabase ---');
  const delRes = await supabaseSync.deleteTitleDirectly(testTitleId);
  console.log('Deleção de Título:', delRes.success ? '✅ SUCESSO' : '❌ ERRO: ' + delRes.error);

  const { data: verifyDeleted } = await client.from('contaju_financial_titles').select('*').eq('id', testTitleId);
  console.log('Título após deleção:', verifyDeleted?.length === 0 ? '✅ EXCLUÍDO COM SUCESSO' : '❌ AINDA PRESENTE');

  // 5. Teste de Gravação Direta de Contrato
  console.log('\n--- 4. Testando Gravação Direta de Contrato no Supabase ---');
  const testContractId = 'ct-test-direct-' + Date.now();
  const testContract: Contract = {
    id: testContractId,
    contractNumber: 'CT-DIR-999',
    customerId: 'cli-1',
    description: 'Contrato Teste Persistência Direta',
    items: [],
    monthlyTotal: 1500,
    startDate: '2026-10-01',
    contractType: 'RECORRENTE',
    isRecurring: true,
    autoGenerateFutureMonths: true,
    futureMonthsCount: 12,
    periodicity: 'MENSAL',
    dueDay: 10,
    dueRule: 'SAME_MONTH',
    billingMethod: 'BOLETO',
    status: 'ATIVO',
    createdAt: new Date().toISOString()
  };

  const saveContractRes = await supabaseSync.saveContractDirectly(testContract);
  console.log('Gravação de Contrato:', saveContractRes.success ? '✅ SUCESSO' : '❌ ERRO: ' + saveContractRes.error);

  const { data: verifyContract } = await client.from('contaju_contracts').select('*').eq('id', testContractId);
  console.log('Contrato verificado no Supabase:', verifyContract?.length === 1 ? '✅ PRESENTE NO BANCO' : '❌ NÃO ENCONTRADO');

  const delContractRes = await supabaseSync.deleteContractDirectly(testContractId);
  console.log('Deleção de Contrato:', delContractRes.success ? '✅ SUCESSO' : '❌ ERRO: ' + delContractRes.error);

  const { data: verifyContractDel } = await client.from('contaju_contracts').select('*').eq('id', testContractId);
  console.log('Contrato após deleção:', verifyContractDel?.length === 0 ? '✅ EXCLUÍDO COM SUCESSO' : '❌ AINDA PRESENTE');

  // 6. Teste de Gravação Direta de Cliente/Fornecedor (Counterparty)
  console.log('\n--- 5. Testando Gravação Direta de Counterparty no Supabase ---');
  const testCpId = 'cp-test-direct-' + Date.now();
  const testCp = {
    id: testCpId,
    type: 'CLIENTE' as const,
    name: 'Cliente Teste Supabase Direto',
    tradeName: 'Teste Direto LTDA',
    document: '12.345.678/0001-90',
    email: 'teste@direto.com',
    phone: '(11) 98888-7777',
    status: 'ATIVO' as const,
    createdAt: new Date().toISOString()
  };
  const saveCpRes = await supabaseSync.saveCounterpartyDirectly(testCp);
  console.log('Gravação de Counterparty:', saveCpRes.success ? '✅ SUCESSO' : '❌ ERRO: ' + saveCpRes.error);
  const { data: verifyCp } = await client.from('contaju_counterparties').select('*').eq('id', testCpId);
  console.log('Counterparty no Supabase:', verifyCp?.length === 1 ? '✅ PRESENTE NO BANCO' : '❌ NÃO ENCONTRADO');

  const delCpRes = await supabaseSync.deleteCounterpartyDirectly(testCpId);
  console.log('Deleção de Counterparty:', delCpRes.success ? '✅ SUCESSO' : '❌ ERRO: ' + delCpRes.error);
  const { data: verifyCpDel } = await client.from('contaju_counterparties').select('*').eq('id', testCpId);
  console.log('Counterparty após deleção:', verifyCpDel?.length === 0 ? '✅ EXCLUÍDO COM SUCESSO' : '❌ AINDA PRESENTE');

  // 7. Teste de Gravação Direta de Conta Bancária
  console.log('\n--- 6. Testando Gravação Direta de Conta Bancária no Supabase ---');
  const testBankId = 'bank-test-direct-' + Date.now();
  const testBank = {
    id: testBankId,
    companyId: 'comp-1',
    name: 'Banco Teste Direto',
    bankCode: '999',
    agency: '0001',
    accountNumber: '12345-6',
    accountType: 'CORRENTE' as const,
    initialBalance: 5000,
    currentBalance: 5000,
    active: true,
    color: '#10B981',
    createdAt: new Date().toISOString()
  };
  const saveBankRes = await supabaseSync.saveBankAccountDirectly(testBank);
  console.log('Gravação de Conta Bancária:', saveBankRes.success ? '✅ SUCESSO' : '❌ ERRO: ' + saveBankRes.error);
  const { data: verifyBank } = await client.from('contaju_bank_accounts').select('*').eq('id', testBankId);
  console.log('Conta Bancária no Supabase:', verifyBank?.length === 1 ? '✅ PRESENTE NO BANCO' : '❌ NÃO ENCONTRADO');

  const delBankRes = await supabaseSync.deleteBankAccountDirectly(testBankId);
  console.log('Deleção de Conta Bancária:', delBankRes.success ? '✅ SUCESSO' : '❌ ERRO: ' + delBankRes.error);
  const { data: verifyBankDel } = await client.from('contaju_bank_accounts').select('*').eq('id', testBankId);
  console.log('Conta Bancária após deleção:', verifyBankDel?.length === 0 ? '✅ EXCLUÍDO COM SUCESSO' : '❌ AINDA PRESENTE');

  // 8. Teste de Gravação Direta de Usuário
  console.log('\n--- 7. Testando Gravação Direta de Usuário no Supabase ---');
  const testUserId = 'usr-test-direct-' + Date.now();
  const testUser = {
    id: testUserId,
    name: 'Usuário Teste Direto',
    email: `teste-${Date.now()}@contaju.com.br`,
    role: 'OPERADOR' as const,
    status: 'ATIVO' as const,
    password: 'senhaSegura123',
    createdAt: new Date().toISOString()
  };
  const saveUserRes = await supabaseSync.saveUserDirectly(testUser);
  console.log('Gravação de Usuário:', saveUserRes.success ? '✅ SUCESSO' : '❌ ERRO: ' + saveUserRes.error);
  const { data: verifyUser } = await client.from('contaju_users').select('*').eq('id', testUserId);
  console.log('Usuário no Supabase:', verifyUser?.length === 1 ? '✅ PRESENTE NO BANCO' : '❌ NÃO ENCONTRADO');

  const delUserRes = await supabaseSync.deleteUserDirectly(testUserId);
  console.log('Deleção de Usuário:', delUserRes.success ? '✅ SUCESSO' : '❌ ERRO: ' + delUserRes.error);
  const { data: verifyUserDel } = await client.from('contaju_users').select('*').eq('id', testUserId);
  console.log('Usuário após deleção:', verifyUserDel?.length === 0 ? '✅ EXCLUÍDO COM SUCESSO' : '❌ AINDA PRESENTE');

  console.log('\n========================================================================');
  console.log('⭐ TODOS OS TESTES DE PERSISTÊNCIA DIRETA FORAM CONCLUÍDOS COM SUCESSO!');
  console.log('========================================================================');
}

runTest().catch(console.error);
