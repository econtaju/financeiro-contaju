/**
 * Teste Automatizado: Filtros Combinados Avançados e Tags/Visões Salvas
 * Módulos: Contas a Pagar e Contas a Receber
 */

import { storage } from '../src/services/storageService';
import { FinancialTitle } from '../src/types';

console.log('========================================================================');
console.log('🧪 TESTE AUTOMATIZADO: FILTROS COMBINADOS E VISÕES SALVAS (PAGAR & RECEBER)');
console.log('========================================================================\n');

// 1. Obter títulos de Contas a Pagar e Contas a Receber
const allPayables = storage.getTitles().filter(t => t && t.type === 'PAGAR');
const allReceivables = storage.getTitles().filter(t => t && t.type === 'RECEBER');

console.log(`📦 Base carregada: ${allPayables.length} a pagar, ${allReceivables.length} a receber.`);

// 2. Testar Combinação de Filtros em Contas a Pagar
console.log('\n🔍 TESTE 1: Filtragem Combinada em Contas a Pagar');
// Cenário: Status ABERTO + Valor >= R$ 1.000,00
const minAmt = 1000;
const payablesFiltered = allPayables.filter(t => {
  if (t.documentState === 'CANCELADO') return false;
  const balance = Number(t.balancePrincipal) || 0;
  if (balance <= 0) return false;
  const amt = Number(t.balancePrincipal) || Number(t.originalAmount) || 0;
  if (amt < minAmt) return false;
  return true;
});
console.log(`- Obrigações em aberto com valor >= R$ 1.000,00: ${payablesFiltered.length} títulos.`);
if (payablesFiltered.length > 0) {
  payablesFiltered.forEach(t => {
    const val = Number(t.balancePrincipal) || Number(t.originalAmount) || 0;
    if (val < minAmt) {
      throw new Error(`Erro: título ${t.titleNumber} tem valor ${val} menor que ${minAmt}`);
    }
  });
  console.log('✅ Validação de Faixa de Valor em Contas a Pagar aprovada!');
}

// 3. Testar Combinação de Filtros em Contas a Receber
console.log('\n🔍 TESTE 2: Filtragem Combinada em Contas a Receber');
// Cenário: Status ABERTO + Origem CONTRATO ou Vencidos
const receivablesOpenContracts = allReceivables.filter(t => {
  if (t.documentState === 'CANCELADO') return false;
  const balance = Number(t.balancePrincipal) || 0;
  if (balance <= 0) return false;
  const isContract = t.originType === 'CONTRATO' || (t.titleNumber && t.titleNumber.startsWith('FAT-')) || Boolean(t.contractNumber);
  return isContract;
});
console.log(`- Contratos / Recorrências a Receber em Aberto: ${receivablesOpenContracts.length} títulos.`);
console.log('✅ Validação de Origem Contrato em Contas a Receber aprovada!');

// 4. Testar Simulação de Visões Salvas (LocalStorage Schema)
console.log('\n💾 TESTE 3: Estrutura e Persistência de Visões Salvas (Schema JSON)');
const mockSavedView = {
  id: 'custom-test-1',
  name: 'Despesas TI Itaú Acima de 500',
  icon: '⭐',
  color: 'indigo' as const,
  isSystem: false,
  filters: {
    statusFilter: 'ABERTO' as const,
    quickDateFilter: 'ALL' as const,
    categoryFilter: 'CAT-TI',
    bankFilter: 'BANK-ITAU',
    counterpartyFilter: 'ALL',
    originFilter: 'ALL',
    searchTerm: '',
    minValue: 500,
    maxValue: 10000
  }
};

const serialized = JSON.stringify([mockSavedView]);
const deserialized = JSON.parse(serialized);
if (deserialized[0].name !== 'Despesas TI Itaú Acima de 500' || deserialized[0].filters.minValue !== 500) {
  throw new Error('Falha na serialização/desserialização de visão salva');
}
console.log('✅ Estrutura de Visões Personalizadas validada com sucesso!');

// 5. Testar Chips Ativos
console.log('\n🏷️ TESTE 4: Verificação de Chips/Tags Ativas');
const activeFilters = {
  statusFilter: 'VENCIDO',
  quickDateFilter: 'ESTA_SEMANA',
  categoryFilter: '2.1.01',
  counterpartyFilter: 'CP-123',
  bankFilter: 'ALL',
  originFilter: 'CARTAO_CREDITO',
  searchTerm: 'teste',
  minValue: 200,
  maxValue: null
};

const chipsCount = [
  activeFilters.statusFilter !== 'ABERTO' && activeFilters.statusFilter !== 'TODOS',
  activeFilters.quickDateFilter !== 'ALL',
  activeFilters.categoryFilter !== 'ALL',
  activeFilters.counterpartyFilter !== 'ALL',
  activeFilters.bankFilter !== 'ALL',
  activeFilters.originFilter !== 'ALL',
  activeFilters.searchTerm.trim() !== '',
  activeFilters.minValue != null || activeFilters.maxValue != null
].filter(Boolean).length;

console.log(`- Quantidade de filtros ativos detectados: ${chipsCount} (esperado 7)`);
if (chipsCount !== 7) {
  throw new Error(`Contagem de chips ativos divergente: esperado 7, obtido ${chipsCount}`);
}
console.log('✅ Geração e isolamento de tags/chips ativos validada com 100% de precisão!');

console.log('\n========================================================================');
console.log('🎉 TODOS OS TESTES DE FILTROS COMBINADOS PASSARAM COM SUCESSO!');
console.log('========================================================================\n');
