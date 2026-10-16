import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

import { storage } from '../src/services/storageService';
import { FinancialTitle } from '../src/types';

async function testStorageDirect() {
  console.log('Testing storage.saveTitles direct sync to Supabase...');

  const testId = 'tit-storage-test-' + Date.now();
  const newTitle: FinancialTitle = {
    id: testId,
    companyId: 'comp-1',
    type: 'RECEBER',
    titleNumber: 'REC-ST-001',
    description: 'Teste Salvo via storage.saveTitles',
    counterpartyId: 'cli-1',
    accountId: 'acc-1.1.01',
    launchDate: '2026-10-16',
    competence: '2026-10',
    issueDate: '2026-10-16',
    dueDate: '2026-10-25',
    expectedCashDate: '2026-10-25',
    originalAmount: 850.00,
    settledPrincipal: 0,
    balancePrincipal: 850.00,
    accruedInterest: 0,
    accruedFine: 0,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'MANUAL',
    createdAt: new Date().toISOString()
  };

  const currentTitles = storage.getTitles();
  // 1. Salva via storage.saveTitles
  storage.saveTitles([newTitle, ...currentTitles]);

  // Aguarda 1 segundo para a requisição de rede assíncrona persistir no Supabase
  await new Promise(r => setTimeout(r, 1200));

  // 2. Consulta diretamente no banco Supabase
  const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
  const { data: foundInDb, error } = await client.from('contaju_financial_titles').select('*').eq('id', testId);

  if (error) {
    console.error('❌ Erro no Supabase:', error);
  } else if (foundInDb && foundInDb.length === 1) {
    console.log('✅ SUCESSO! O título salvo via storage.saveTitles() foi gravado DIRETAMENTE no banco de dados Supabase!');
    console.log('Dados no banco:', foundInDb[0].title_number, foundInDb[0].description, foundInDb[0].original_amount);
  } else {
    console.error('❌ Título não foi encontrado no Supabase!');
  }

  // 3. Testa exclusão via storage.deleteTitle
  console.log('\nTesting storage.deleteTitle() direct delete on Supabase...');
  storage.deleteTitle(testId);

  // Aguarda 1 segundo para a requisição de deleção persistir no Supabase
  await new Promise(r => setTimeout(r, 1200));

  const { data: foundAfterDel } = await client.from('contaju_financial_titles').select('*').eq('id', testId);
  if (foundAfterDel && foundAfterDel.length === 0) {
    console.log('✅ SUCESSO! storage.deleteTitle() apagou o registro DIRETAMENTE do banco de dados Supabase!');
  } else {
    console.error('❌ Título ainda consta no Supabase após deleteTitle!');
  }
}

testStorageDirect().catch(console.error);
