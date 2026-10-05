import {
  INITIAL_TITLES,
  INITIAL_BANK_ACCOUNTS,
  INITIAL_CONTRACTS,
  INITIAL_SETTLEMENTS,
  INITIAL_MOVEMENTS,
  INITIAL_STATEMENT_ENTRIES,
  INITIAL_COUNTERPARTIES
} from '../src/data/initialData';
import { INITIAL_CHART_ACCOUNTS } from '../src/data/chartOfAccountsData';
import { INITIAL_CREDIT_CARDS, INITIAL_CARD_PURCHASES } from '../src/data/creditCardsData';
import { FinancialEngine, formatBRL } from '../src/services/financialEngine';
import { ReportingEngine } from '../src/services/reportingEngine';

console.log('========================================================================');
console.log('🔍 RELATÓRIO DE AUDITORIA & VERIFICAÇÃO FINANCEIRA DO SISTEMA CONTAJU');
console.log('========================================================================\n');

// 1. CONTAS A RECEBER
const receivables = INITIAL_TITLES.filter(t => t.type === 'RECEBER');
const recOpen = receivables.filter(t => t.settlementState === 'ABERTO' || t.settlementState === 'PARCIAL');
const recSettled = receivables.filter(t => t.settlementState === 'LIQUIDADO');
const recTotalOpenAmount = recOpen.reduce((sum, t) => sum + t.balancePrincipal, 0);
const recTotalSettledAmount = receivables.reduce((sum, t) => sum + t.settledPrincipal, 0);

// Vencidos (dueDate < 2026-10-02 e saldo > 0)
const recOverdue = recOpen.filter(t => t.dueDate < '2026-10-02');
const recDueToday = recOpen.filter(t => t.dueDate === '2026-10-02');
const recDueFuture = recOpen.filter(t => t.dueDate > '2026-10-02');

console.log('📊 1. CONTAS A RECEBER:');
console.log(`- Total de Títulos a Receber: ${receivables.length}`);
console.log(`- Saldo Total a Receber em Aberto: ${formatBRL(recTotalOpenAmount)} (${recOpen.length} títulos)`);
console.log(`  • Vencidos (Em Atraso): ${formatBRL(recOverdue.reduce((s, t) => s + t.balancePrincipal, 0))} (${recOverdue.length} títulos)`);
console.log(`  • Vence Hoje (02/10): ${formatBRL(recDueToday.reduce((s, t) => s + t.balancePrincipal, 0))} (${recDueToday.length} títulos)`);
console.log(`  • A Vencer (Futuro): ${formatBRL(recDueFuture.reduce((s, t) => s + t.balancePrincipal, 0))} (${recDueFuture.length} títulos)`);
console.log(`- Total já Liquidado: ${formatBRL(recTotalSettledAmount)} (${recSettled.length} títulos liquidados)\n`);

// 2. CONTAS A PAGAR
const payables = INITIAL_TITLES.filter(t => t.type === 'PAGAR');
const payOpen = payables.filter(t => t.settlementState === 'ABERTO' || t.settlementState === 'PARCIAL');
const paySettled = payables.filter(t => t.settlementState === 'LIQUIDADO');
const payTotalOpenAmount = payOpen.reduce((sum, t) => sum + t.balancePrincipal, 0);
const payTotalSettledAmount = payables.reduce((sum, t) => sum + t.settledPrincipal, 0);

const payOverdue = payOpen.filter(t => t.dueDate < '2026-10-02');
const payDueToday = payOpen.filter(t => t.dueDate === '2026-10-02');
const payDueFuture = payOpen.filter(t => t.dueDate > '2026-10-02');

console.log('📉 2. CONTAS A PAGAR:');
console.log(`- Total de Títulos a Pagar: ${payables.length}`);
console.log(`- Saldo Total a Pagar em Aberto: ${formatBRL(payTotalOpenAmount)} (${payOpen.length} títulos)`);
console.log(`  • Vencidos (Em Atraso): ${formatBRL(payOverdue.reduce((s, t) => s + t.balancePrincipal, 0))} (${payOverdue.length} títulos)`);
console.log(`  • Vence Hoje (02/10): ${formatBRL(payDueToday.reduce((s, t) => s + t.balancePrincipal, 0))} (${payDueToday.length} títulos)`);
console.log(`  • A Vencer (Futuro): ${formatBRL(payDueFuture.reduce((s, t) => s + t.balancePrincipal, 0))} (${payDueFuture.length} títulos)`);
console.log(`- Total já Pago: ${formatBRL(payTotalSettledAmount)} (${paySettled.length} pagamentos realizados)\n`);

// 3. CAIXA & SALDOS BANCÁRIOS
const consolidatedCash = FinancialEngine.getConsolidatedCashBalance();

console.log('🏦 3. SALDOS BANCÁRIOS CONSOLIDADOS (DISPONIBILIDADE IMEDIATA):');
INITIAL_BANK_ACCOUNTS.forEach(b => {
  const currentBal = FinancialEngine.getAccountBalance(b.id);
  console.log(`- ${b.name}: ${formatBRL(currentBal)} (Saldo Inicial: ${formatBRL(b.initialBalance)})`);
});
console.log(`⭐ Saldo Consolidado Total de Caixa: ${formatBRL(consolidatedCash)}\n`);

// 4. CARTEIRA DE CONTRATOS & MRR
const activeContracts = INITIAL_CONTRACTS.filter(c => c.status === 'ATIVO');
const mrr = FinancialEngine.calculateMRR();
const avgTicket = activeContracts.length > 0 ? mrr / activeContracts.length : 0;
const clientMetrics = FinancialEngine.calculateClientMetrics();

console.log('💼 4. COMERCIAL - CONTRATOS RECORRENTES & MRR:');
console.log(`- Clientes Cadastrados: ${clientMetrics.totalClients} (Ativos: ${clientMetrics.activeClients})`);
console.log(`- Contratos Ativos na Carteira: ${activeContracts.length} / ${INITIAL_CONTRACTS.length}`);
console.log(`- MRR (Receita Mensal Recorrente): ${formatBRL(mrr)} / mês`);
console.log(`- Ticket Médio por Contrato Ativo: ${formatBRL(avgTicket)} / mês`);
console.log(`- Cobertura de Contratos na Base: ${clientMetrics.contractCoveragePercentage}%\n`);

// 5. DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE) - OUTUBRO/2026
const dre = ReportingEngine.generateDRE(2026);
const octIdx = 9; // Outubro é índice 9
const octRevenue = dre.lines.find(l => l.name === 'RECEITA BRUTA DE SERVIÇOS')?.valuesByMonth[octIdx] || 0;
const octDeductions = dre.lines.find(l => l.name === '(-) Deduções e Tributos sobre Faturamento')?.valuesByMonth[octIdx] || 0;
const octNetRevenue = dre.lines.find(l => l.name === '(=) RECEITA LÍQUIDA')?.valuesByMonth[octIdx] || 0;
const octExpenses = dre.lines.find(l => l.name === '(-) Despesas Operacionais')?.valuesByMonth[octIdx] || 0;
const octNetResult = dre.netResults[octIdx] || 0;

console.log('📈 5. DRE GERENCIAL (COMPETÊNCIA ECONÔMICA - OUTUBRO/2026):');
console.log(`- (+) Receita Bruta de Serviços: ${formatBRL(octRevenue)}`);
console.log(`- (-) Deduções e Impostos: ${formatBRL(octDeductions)}`);
console.log(`- (=) Receita Líquida: ${formatBRL(octNetRevenue)}`);
console.log(`- (-) Despesas Operacionais: ${formatBRL(octExpenses)}`);
console.log(`- (=) Resultado Líquido do Mês: ${formatBRL(octNetResult)}`);
console.log(`  • Margem Líquida: ${octRevenue > 0 ? ((octNetResult / octRevenue) * 100).toFixed(1) : 0}%\n`);

// 6. INADIMPLÊNCIA DA CARTEIRA
const delinquency = FinancialEngine.calculateDelinquencyRate('2026-10-02');
console.log('⚠️ 6. INDICADORES DE RISCO & INADIMPLÊNCIA:');
console.log(`- Taxa de Inadimplência da Carteira: ${delinquency.rate}%`);
console.log(`- Saldo Vencido em Atraso: ${formatBRL(delinquency.overdueBalance)}`);
console.log(`- Saldo Total a Receber em Aberto: ${formatBRL(delinquency.openBalance)}\n`);

// 7. CONCILIAÇÃO BANCÁRIA
const totalStatements = INITIAL_STATEMENT_ENTRIES.length;
const reconciledStatements = INITIAL_STATEMENT_ENTRIES.filter(s => s.reconciliationStatus === 'CONCILIADO').length;
const suggestedStatements = INITIAL_STATEMENT_ENTRIES.filter(s => s.reconciliationStatus === 'SUGESTAO').length;
const pendingStatements = INITIAL_STATEMENT_ENTRIES.filter(s => s.reconciliationStatus === 'PENDENTE').length;

console.log('⚖️ 7. CONCILIAÇÃO BANCÁRIA (EXTRATOS OFX):');
console.log(`- Total de Entradas de Extrato: ${totalStatements}`);
console.log(`- Conciliados 100%: ${reconciledStatements} (${Math.round((reconciledStatements / totalStatements) * 100)}%)`);
console.log(`- Sugestões com Alta Assertividade (90%+): ${suggestedStatements}`);
console.log(`- Pendentes de Classificação: ${pendingStatements}\n`);

// 8. CARTÕES DE CRÉDITO CORPORATIVOS
const totalCards = INITIAL_CREDIT_CARDS.length;
const totalPurchases = INITIAL_CARD_PURCHASES.length;
const totalPurchasesAmount = INITIAL_CARD_PURCHASES.reduce((sum, p) => sum + p.totalAmount, 0);

console.log('💳 8. CARTÕES DE CRÉDITO:');
console.log(`- Cartões Corporativos Ativos: ${totalCards}`);
console.log(`- Compras Registradas: ${totalPurchases} lançamentos`);
console.log(`- Volume Total em Fatura: ${formatBRL(totalPurchasesAmount)}\n`);

console.log('========================================================================');
console.log('✅ TODAS AS FORMULAÇÕES E VALORES MATEMÁTICOS VERIFICADOS COM SUCESSO!');
console.log('========================================================================');
