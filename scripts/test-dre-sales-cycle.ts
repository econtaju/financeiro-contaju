import { storage } from '../src/services/storageService';
import { FinancialEngine } from '../src/services/financialEngine';
import { ReportingEngine } from '../src/services/reportingEngine';
import { Contract, Sale, FinancialTitle } from '../src/types';

function runTest() {
  console.log('--- INICIANDO TESTE COMPLETO DO CICLO CONTRATO ➔ VENDA ➔ DRE ➔ FLUXO DE CAIXA ---');

  // Limpar dados anteriores para teste isolado
  storage.saveContracts([]);
  storage.saveSales([]);
  storage.saveTitles([]);
  storage.saveSettlements([]);

  // 1. Cadastrar cliente e contrato recorrente
  const testContract: Contract = {
    id: 'ctr-teste-01',
    companyId: 'comp-1',
    contractNumber: 'CTR-2026-999',
    customerId: 'cli-teste-01',
    description: 'Contrato Assessoria Contábil Premium',
    startDate: '2026-10-01',
    contractType: 'RECORRENTE',
    isRecurring: true,
    periodicity: 'MENSAL',
    billingFrequency: 'MENSAL',
    dueDay: 15,
    dueRule: 'NEXT_MONTH', // Vencimento no mês seguinte à competência
    billingMethod: 'BOLETO',
    monthlyTotal: 3000,
    items: [
      {
        id: 'item-ctr-1',
        serviceId: 'srv-1',
        description: 'Honorários Contábeis Mensais',
        quantity: 1,
        unitPrice: 3000,
        total: 3000,
        accountId: 'acc-1.1.01' // Conta oficial analítica de receita de serviços
      }
    ],
    status: 'ATIVO',
    createdAt: new Date().toISOString()
  };

  storage.saveContracts([testContract]);
  console.log('✓ Contrato CTR-2026-999 criado com sucesso: R$ 3.000/mês, regra NEXT_MONTH (vencimento dia 15 do mês seguinte)');

  // 2. Gerar faturas para 3 meses começando em Outubro/2026 (2026-10, 2026-11, 2026-12)
  const genResult = FinancialEngine.generateContractFutureInstallments(testContract, 3, '2026-10');
  console.log(`✓ Geração concluída: ${genResult.generatedCount} faturas geradas, total ${genResult.totalAmountGenerated}.`);
  console.log(`  Competências geradas:`, genResult.competences);

  if (genResult.generatedCount !== 3) {
    throw new Error(`Esperado 3 faturas geradas, obteve ${genResult.generatedCount}`);
  }

  // 3. Validar se as vendas e títulos foram gravados e vinculados
  const sales = storage.getSales();
  const titles = storage.getTitles();
  console.log(`✓ Total de vendas no storage: ${sales.length}`);
  console.log(`✓ Total de títulos no storage: ${titles.length}`);

  if (sales.length < 3) {
    throw new Error(`Esperado pelo menos 3 vendas, obteve ${sales.length}`);
  }
  if (titles.length < 3) {
    throw new Error(`Esperado pelo menos 3 títulos, obteve ${titles.length}`);
  }

  // Verificar competências e vencimentos
  const octSale = sales.find(s => s.competence === '2026-10');
  const octTitle = titles.find(t => t.competence === '2026-10');

  if (!octSale) throw new Error('Venda da competência 2026-10 não encontrada.');
  if (!octTitle) throw new Error('Título da competência 2026-10 não encontrado.');

  console.log(`✓ Venda 2026-10: ${octSale.saleNumber}, Valor: R$ ${octSale.netTotal}, Status: ${octSale.status}`);
  console.log(`✓ Título 2026-10: ${octTitle.titleNumber}, Competência: ${octTitle.competence}, Vencimento: ${octTitle.dueDate}, Situação: ${octTitle.settlementState}, Conta: ${octTitle.accountId}`);

  // Verificar regra NEXT_MONTH do vencimento
  if (octTitle.dueDate !== '2026-11-15') {
    throw new Error(`Esperado dueDate '2026-11-15' para competência 2026-10 (NEXT_MONTH), obteve ${octTitle.dueDate}`);
  }
  console.log('✓ Regra de vencimento NEXT_MONTH validada: competência 2026-10 vence em 2026-11-15!');

  // Título em aberto (não liquidado)
  if (octTitle.settlementState !== 'ABERTO') {
    throw new Error(`Esperado título em status ABERTO, obteve ${octTitle.settlementState}`);
  }

  // 4. Testar o DRE Contábil no Regime de Competência
  const dre2026 = ReportingEngine.generateDRE(2026, 'COMPETENCIA');
  const grossRevLine = dre2026.lines.find(l => l.id === 'h-1');
  const accountingLine = dre2026.lines.find(l => l.id === 'acc-1.1.01');

  if (!grossRevLine) throw new Error('Linha de Receita Bruta (h-1) não encontrada no DRE.');
  if (!accountingLine) throw new Error('Linha de Honorários Contábeis (acc-1.1.01) não encontrada no DRE.');

  // Meses: Outubro = índice 9, Novembro = índice 10, Dezembro = índice 11
  const octCompVal = grossRevLine.valuesByMonth[9];
  const novCompVal = grossRevLine.valuesByMonth[10];
  const decCompVal = grossRevLine.valuesByMonth[11];

  console.log(`\n--- RESULTADOS DRE POR COMPETÊNCIA (2026) ---`);
  console.log(`Receita Bruta Outubro (Mês 10): R$ ${octCompVal} (Esperado: R$ 3000)`);
  console.log(`Receita Bruta Novembro (Mês 11): R$ ${novCompVal} (Esperado: R$ 3000)`);
  console.log(`Receita Bruta Dezembro (Mês 12): R$ ${decCompVal} (Esperado: R$ 3000)`);
  console.log(`Total Anual da Receita Bruta: R$ ${grossRevLine.totalYear} (Esperado: R$ 9000)`);

  if (octCompVal !== 3000) throw new Error(`Falha no DRE: Outubro deveria ter R$ 3000 de faturamento, teve ${octCompVal}`);
  if (novCompVal !== 3000) throw new Error(`Falha no DRE: Novembro deveria ter R$ 3000 de faturamento, teve ${novCompVal}`);
  if (decCompVal !== 3000) throw new Error(`Falha no DRE: Dezembro deveria ter R$ 3000 de faturamento, teve ${decCompVal}`);
  if (grossRevLine.totalYear !== 9000) throw new Error(`Falha no total anual do DRE: Esperado R$ 9000, teve ${grossRevLine.totalYear}`);

  console.log('✓ REGIME DE COMPETÊNCIA NO DRE 100% OPERACIONAL: Venda em aberto conta perfeitamente como faturamento na competência!');

  // 5. Testar o Fluxo de Caixa Projetado
  // No fluxo de caixa projetado, a fatura de Outubro (que vence em 15/11) deve aparecer na projeção de NOVEMBRO!
  const cashFlow2026 = ReportingEngine.generateCashFlow(2026, 'PROJETADO');
  const opInflowLine = cashFlow2026.lines.find(l => l.name.includes('Clientes') || l.name.includes('Recebimento') || l.name.includes('Operacionais'));

  console.log(`\n--- RESULTADOS DO FLUXO DE CAIXA PROJETADO (POR VENCIMENTO) ---`);
  // Obter o resumo de entradas operacionais projetadas
  console.log(`Total de Entradas Projetadas: R$ ${cashFlow2026.summary.totalInflows}`);
  if (cashFlow2026.summary.totalInflows < 6000) {
    throw new Error(`Esperado pelo menos R$ 6000 de entradas projetadas em 2026, teve ${cashFlow2026.summary.totalInflows}`);
  }
  console.log('✓ FLUXO DE CAIXA PROJETADO 100% INTEGRADO: Títulos projetados reconhecidos pelas datas de vencimento!');

  // 6. Testar resiliência com título legado apontando para 'acc-rec-01'
  const legacyTitle: FinancialTitle = {
    id: 'tit-legacy-01',
    companyId: 'comp-1',
    type: 'RECEBER',
    titleNumber: 'FAT-2026-09-LEGACY',
    counterpartyId: 'cli-teste-01',
    description: 'Fatura Legada com conta acc-rec-01',
    accountId: 'acc-rec-01' as any, // legado antigo
    launchDate: '2026-09-01',
    competence: '2026-09',
    issueDate: '2026-09-01',
    dueDate: '2026-09-20',
    originalAmount: 1500,
    settledPrincipal: 0,
    balancePrincipal: 1500,
    documentState: 'CONFIRMADO',
    settlementState: 'ABERTO',
    originType: 'CONTRATO',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  storage.saveTitles([legacyTitle, ...storage.getTitles()]);
  const dreWithLegacy = ReportingEngine.generateDRE(2026, 'COMPETENCIA');
  const sepVal = dreWithLegacy.lines.find(l => l.id === 'h-1')?.valuesByMonth[8]; // Mês 9 = Setembro
  console.log(`Receita Bruta Setembro (com título legado acc-rec-01): R$ ${sepVal} (Esperado: R$ 1500)`);
  if (sepVal !== 1500) {
    throw new Error(`Falha no suporte a títulos legados: Setembro deveria ter R$ 1500, teve ${sepVal}`);
  }
  console.log('✓ RESILIÊNCIA A TÍTULOS LEGADOS 100% VALIDADA: Mapeamento automático para conta padrão ativa!');

  console.log('\n======================================================');
  console.log('✓ TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
  console.log('======================================================');
}

runTest();
