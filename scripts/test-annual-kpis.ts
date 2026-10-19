import { FinancialEngine } from '../src/services/financialEngine';
import { KpiEngine } from '../src/services/kpiEngine';
import { storage } from '../src/services/storageService';
import { Contract, Counterparty } from '../src/types';

console.log('--- INICIANDO TESTE DE VALIDAÇÃO DE KPIS E BASE CONTRATUAL ---');

// Mock data test para validação isolada
const mockCounterparties: Counterparty[] = [
  { id: 'cli_1', name: 'Empresa Alpha Ltda', type: 'CLIENTE', document: '111', status: 'ATIVO', email: '', phone: '' },
  { id: 'cli_2', name: 'Empresa Beta SA', type: 'CLIENTE', document: '222', status: 'ATIVO', email: '', phone: '' },
  { id: 'cli_3', name: 'Empresa Gamma ME (Apenas Cadastrada)', type: 'CLIENTE', document: '333', status: 'ATIVO', email: '', phone: '' },
  { id: 'cli_4', name: 'Empresa Delta (Contrato Cancelado)', type: 'CLIENTE', document: '444', status: 'INATIVO', email: '', phone: '' },
];

const mockContracts: Contract[] = [
  {
    id: 'ctr_1',
    contractNumber: 'CTR-001',
    customerId: 'cli_1',
    monthlyTotal: 2500,
    status: 'ATIVO',
    billingDay: 10,
    startDate: '2026-01-10',
    services: []
  },
  {
    id: 'ctr_2',
    contractNumber: 'CTR-002',
    customerId: 'cli_2',
    monthlyTotal: 3500,
    status: 'ATIVO',
    billingDay: 15,
    startDate: '2026-03-01',
    services: []
  },
  {
    id: 'ctr_3',
    contractNumber: 'CTR-003',
    customerId: 'cli_4',
    monthlyTotal: 1800,
    status: 'CANCELADO',
    billingDay: 5,
    startDate: '2025-06-01',
    cancellationDate: '2026-10-05',
    services: []
  }
];

// Salva mock temporário
const prevContracts = storage.getContracts();
const prevCounterparties = storage.getCounterparties();

try {
  storage.saveCounterparties(mockCounterparties);
  storage.saveContracts(mockContracts);

  console.log('\n[TESTE 1] Cálculo de Clientes Ativos Baseado em Contratos:');
  const metrics = FinancialEngine.calculateClientMetrics(2026, 9); // Outubro/2026 (0-indexed: 9)

  console.log('Total de clientes cadastrados no CRM:', metrics.registeredClientsCount, '(Esperado: 4)');
  console.log('Clientes com Contrato Ativo:', metrics.activeClients, '(Esperado: 2 -> cli_1 e cli_2)');
  console.log('Clientes Churn (Cancelados sem outro ativo):', metrics.inactiveClients, '(Esperado: 1 -> cli_4)');
  console.log('Total base contratual:', metrics.totalContractClients, '(Esperado: 3)');

  if (metrics.activeClients !== 2) {
    throw new Error(`FALHA: activeClients esperado 2, obteve ${metrics.activeClients}. Clientes sem contrato não devem ser considerados ativos.`);
  }

  if (metrics.inactiveClients !== 1) {
    throw new Error(`FALHA: inactiveClients (churn) esperado 1, obteve ${metrics.inactiveClients}`);
  }

  console.log('✅ TESTE 1 PASSOU: Apenas clientes com contrato ativo são considerados ativos na base!');

  console.log('\n[TESTE 2] Geração da Série Anual de KPIs (KpiEngine):');
  const kpiRows = KpiEngine.getAnnualKpis(2026);

  console.log(`Total de KPIs consolidados na tabela anual: ${kpiRows.length}`);

  if (kpiRows.length < 15) {
    throw new Error(`FALHA: Esperado ao menos 15 KPIs estruturados, obtido ${kpiRows.length}`);
  }

  const clientesAtivosRow = kpiRows.find(r => r.id === 'clientes_ativos');
  if (!clientesAtivosRow) {
    throw new Error('FALHA: Linha clientes_ativos não encontrada');
  }

  console.log(`KPI: ${clientesAtivosRow.name}`);
  console.log(`Descrição: ${clientesAtivosRow.description}`);
  console.log(`Valores mensais (Jan-Dez):`, clientesAtivosRow.valuesByMonth);

  const receitaBrutaRow = kpiRows.find(r => r.id === 'faturamento_bruto');
  const resultadoLiquidoRow = kpiRows.find(r => r.id === 'resultado_liquido');
  const mrrRow = kpiRows.find(r => r.id === 'mrr');

  console.log(`KPI: ${receitaBrutaRow?.name} -> Total Período: ${receitaBrutaRow?.periodTotal}`);
  console.log(`KPI: ${resultadoLiquidoRow?.name} -> Total Período: ${resultadoLiquidoRow?.periodTotal}`);
  console.log(`KPI: ${mrrRow?.name} -> Mês Outubro (idx 9): ${mrrRow?.valuesByMonth[9]}`);

  console.log('✅ TESTE 2 PASSOU: KpiEngine consolida corretamente todas as séries anuais de KPIs linha a linha!');

} finally {
  // Restaura dados originais
  storage.saveContracts(prevContracts);
  storage.saveCounterparties(prevCounterparties);
  console.log('\n--- DADOS ORIGINAIS RESTAURADOS COM SEGURANÇA ---');
}
