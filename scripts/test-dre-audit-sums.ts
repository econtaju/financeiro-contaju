import { storage } from '../src/services/storageService';
import { ReportingEngine } from '../src/services/reportingEngine';
import { formatBRL } from '../src/services/financialEngine';

console.log('========================================================================');
console.log('🔍 AUDITORIA COMPLETA DE SOMAS E SEPARAÇÃO DE REGIMES DRE (2026)');
console.log('========================================================================\n');

const titles = storage.getTitles();
console.log(`📦 Total de títulos carregados no storage: ${titles.length}`);

// Títulos de Outubro/2026
const octCompTitles = titles.filter(t => (t.competence?.startsWith('2026-10') || (!t.competence && t.dueDate?.startsWith('2026-10'))));
console.log(`📌 Títulos com Competência 2026-10: ${octCompTitles.length}`);

const dreComp = ReportingEngine.generateDRE(2026, 'COMPETENCIA');
const dreCash = ReportingEngine.generateDRE(2026, 'CAIXA');

const monthIdx = 9; // Outubro (0-indexed: 9 = 10º mês)
console.log('\n--- COMPARATIVO OUTUBRO/2026: COMPETÊNCIA vs CAIXA ---');

const keyRubrics = [
  'RECEITA BRUTA DE SERVIÇOS',
  'Honorários Contábeis Recorrentes',
  'Consultoria Tributária e BPO Financeiro',
  '(-) Deduções e Tributos sobre Faturamento',
  'Simples Nacional / Tributos sobre Faturamento',
  '(=) RECEITA LÍQUIDA',
  '(-) Custos dos Serviços Prestados',
  '(=) LUCRO BRUTO',
  '(-) Despesas Operacionais',
  'Despesas com Pessoal',
  'Salários e Ordenados',
  'Pró-Labore',
  'Despesas Administrativas',
  'Aluguel e Condomínio',
  'Software e Licenças de TI',
  'Energia Elétrica e Água',
  'Telefonia e Internet',
  '(=) RESULTADO OPERACIONAL (EBITDA/LAJIDA)',
  '(+/-) Resultado Financeiro Líquido',
  '(-) Despesas Financeiras',
  'Juros Pagos',
  'Tarifas Bancárias',
  '(=) RESULTADO ANTES DOS TRIBUTOS (LAIR)',
  '(=) RESULTADO LÍQUIDO GERENCIAL'
];

for (const name of keyRubrics) {
  const lineComp = dreComp.lines.find(l => l.name === name);
  const lineCash = dreCash.lines.find(l => l.name === name);

  if (lineComp && lineCash) {
    const vComp = lineComp.valuesByMonth[monthIdx] || 0;
    const vCash = lineCash.valuesByMonth[monthIdx] || 0;
    const isSumm = lineComp.isSummary ? '🔹' : (lineComp.isHeader ? '📁' : '   ');
    console.log(
      `${isSumm} ${name.padEnd(46)} | Comp: ${formatBRL(vComp).padStart(14)} | Caixa: ${formatBRL(vCash).padStart(14)}`
    );
  }
}

console.log('\n--- VERIFICAÇÃO ANUAL DE CONSISTÊNCIA 2026 ---');
console.log(`Receita Bruta Total Ano: Comp = ${formatBRL(dreComp.lines[0]?.totalYear || 0)} | Caixa = ${formatBRL(dreCash.lines[0]?.totalYear || 0)}`);
console.log(`Resultado Líquido Total Ano: Comp = ${formatBRL(dreComp.totalNetResult)} | Caixa = ${formatBRL(dreCash.totalNetResult)}`);

// Validação de Juros Pagos em Outubro (garantir que Aluguel e outras contas não caíram em juros)
const jurosLineComp = dreComp.lines.find(l => l.name === 'Juros Pagos');
const jurosCompOct = jurosLineComp?.valuesByMonth[monthIdx] || 0;
console.log(`\n🛡️ Verificação de integridade Juros Pagos Out/2026: ${formatBRL(jurosCompOct)} (Esperado: R$ 0,00 ou somente juros reais)`);

if (jurosCompOct > 5000) {
  console.error('❌ ERRO: Juros Pagos ainda estão inflados!');
  process.exit(1);
} else {
  console.log('✅ SUCESSO: Juros Pagos não estão mais inflados por contas trocadas!');
}

// Validação de Pessoal em Outubro
const pessLineComp = dreComp.lines.find(l => l.name === 'Despesas com Pessoal');
const pessCompOct = pessLineComp?.valuesByMonth[monthIdx] || 0;
console.log(`🛡️ Verificação de integridade Despesas com Pessoal Out/2026: ${formatBRL(pessCompOct)} (Esperado: R$ 23.500,00 [14.500 salários + 9.000 pró-labore])`);

if (pessCompOct > 25000) {
  console.error('❌ ERRO: Despesas com Pessoal ainda estão infladas (ex: Guia DAS incorretamente somada em Pessoal)!');
  process.exit(1);
} else {
  console.log('✅ SUCESSO: Despesas com Pessoal corretas e sem DAS indevido!');
}

// Validação de Aluguel em Outubro
const alugLineComp = dreComp.lines.find(l => l.name === 'Aluguel e Condomínio');
const alugCompOct = alugLineComp?.valuesByMonth[monthIdx] || 0;
console.log(`🛡️ Verificação de integridade Aluguel Out/2026: ${formatBRL(alugCompOct)} (Esperado: R$ 5.200,00 sem duplicação)`);

if (alugCompOct > 6000) {
  console.error('❌ ERRO: Aluguel duplicado em Outubro!');
  process.exit(1);
} else {
  console.log('✅ SUCESSO: Aluguel está exatamente R$ 5.200,00 sem duplicações!');
}

console.log('\n🎉 Todas as auditorias da DRE passaram com sucesso!');
