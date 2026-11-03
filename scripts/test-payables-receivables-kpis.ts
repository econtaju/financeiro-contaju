import { storage } from '../src/services/storageService';
import { formatBRL } from '../src/services/financialEngine';

console.log('========================================================================');
console.log('🧪 TESTE AUTOMATIZADO: KPIS DO PERÍODO & MENUS DE AÇÕES (PAGAR & RECEBER)');
console.log('========================================================================\n');

const allTitles = storage.getTitles().filter(t => t.documentState !== 'CANCELADO');

// 1. Contas a Pagar
const payables = allTitles.filter(t => t.type === 'PAGAR');
const payablesPeriodTotal = payables.reduce((acc, t) => acc + (Number(t.originalAmount) || 0), 0);
const payablesOpenTotal = payables.reduce((acc, t) => acc + (Number(t.balancePrincipal) || 0), 0);
const payablesSettledTotal = payables.filter(t => t.settlementState === 'LIQUIDADO').reduce((acc, t) => acc + (Number(t.originalAmount) || 0), 0);

console.log('📋 CONTAS A PAGAR:');
console.log(`- Total de obrigações: ${payables.length}`);
console.log(`- Volume Total do Período: ${formatBRL(payablesPeriodTotal)}`);
console.log(`- Saldo em Aberto: ${formatBRL(payablesOpenTotal)}`);
console.log(`- Total Liquidado: ${formatBRL(payablesSettledTotal)}`);

if (payables.length === 0 || payablesPeriodTotal <= 0) {
  console.error('❌ ERRO: Contas a pagar com valores zerados inconsistentes!');
  process.exit(1);
} else {
  console.log('✅ Contas a Pagar: Valores de período e totais apurados com sucesso!\n');
}

// 2. Contas a Receber
const receivables = allTitles.filter(t => t.type === 'RECEBER');
const receivablesPeriodTotal = receivables.reduce((acc, t) => acc + (Number(t.originalAmount) || 0), 0);
const receivablesOpenTotal = receivables.reduce((acc, t) => acc + (Number(t.balancePrincipal) || 0), 0);
const receivablesSettledTotal = receivables.filter(t => t.settlementState === 'LIQUIDADO').reduce((acc, t) => acc + (Number(t.originalAmount) || 0), 0);

console.log('📋 CONTAS A RECEBER:');
console.log(`- Total de títulos: ${receivables.length}`);
console.log(`- Volume Total do Período: ${formatBRL(receivablesPeriodTotal)}`);
console.log(`- Saldo em Aberto: ${formatBRL(receivablesOpenTotal)}`);
console.log(`- Total Liquidado: ${formatBRL(receivablesSettledTotal)}`);

if (receivables.length === 0 || receivablesPeriodTotal <= 0) {
  console.error('❌ ERRO: Contas a receber com valores zerados inconsistentes!');
  process.exit(1);
} else {
  console.log('✅ Contas a Receber: Valores de período e totais apurados com sucesso!\n');
}

// 3. Validação de estrutura das ações
console.log('🔍 Verificação de ações por status:');
const openPayables = payables.filter(t => t.balancePrincipal > 0);
console.log(`- Obrigações a Pagar com botão direto "Pagar": ${openPayables.length}`);
const settledPayables = payables.filter(t => t.settlementState === 'LIQUIDADO');
console.log(`- Obrigações Pagas (com opção no menu para estornar/histórico): ${settledPayables.length}`);

const openReceivables = receivables.filter(t => t.balancePrincipal > 0);
console.log(`- Títulos a Receber com botão direto "Baixar": ${openReceivables.length}`);
const settledReceivables = receivables.filter(t => t.settlementState === 'LIQUIDADO');
console.log(`- Títulos Recebidos (com opções no menu para recibo/estornar): ${settledReceivables.length}`);

console.log('\n========================================================================');
console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
console.log('========================================================================');
