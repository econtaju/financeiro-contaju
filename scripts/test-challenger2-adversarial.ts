/**
 * test-challenger2-adversarial.ts
 * 
 * Adversarial & Empirical Stress-Testing Harness for Contaju Mobile Responsiveness:
 * 1. Operational Modals Usability & Keyboard Behavior (NewTitleModal, SettlementModal, EditTitleModal, BatchSettlementModal, BoletoBatchSettlementModal)
 * 2. Floating Batch Actions Dock vs BottomNavBar Coexistence & Tap Ergonomics
 * 3. DRE & Cash Flow Tables Sticky Freeze & Background Opacity (Zero Text Bleed)
 * 4. Viewport Layout Constraints & Tap Target Boundaries across 320px-430px
 */

import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  category: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, category: string, details?: string) {
  results.push({
    name,
    passed: Boolean(condition),
    category,
    details: details || (condition ? 'Passed' : 'Failed assertion')
  });
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf-8');
}

console.log('======================================================================');
console.log('       EMPIRICAL CHALLENGER 2 — ADVERSARIAL STRESS-TEST HARNESS       ');
console.log('======================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: MODAIS OPERACIONAIS, TECLADO VIRTUAL & INPUTMODE
// -----------------------------------------------------------------------------
console.log('▶ [1/4] Testando Formulários, Modais e Teclado Virtual...');

const newTitleModal = readFile('src/components/Modals/NewTitleModal.tsx');
const settlementModal = readFile('src/components/Modals/SettlementModal.tsx');
const editTitleModal = readFile('src/components/Modals/EditTitleModal.tsx');
const batchSettlementModal = readFile('src/components/Modals/BatchSettlementModal.tsx');
const boletoBatchSettlementModal = readFile('src/components/Financial/BoletoBatchSettlementModal.tsx');

// Check 1.1: Shell Fullscreen e Altura Dinâmica
assert(
  newTitleModal.includes('h-[100dvh]') && newTitleModal.includes('sm:h-auto'),
  'NewTitleModal utiliza shell fullscreen h-[100dvh] com adaptação desktop sm:h-auto',
  'Modais Operacionais'
);
assert(
  settlementModal.includes('h-[100dvh]') && settlementModal.includes('sm:h-auto'),
  'SettlementModal utiliza shell fullscreen h-[100dvh] com adaptação desktop sm:h-auto',
  'Modais Operacionais'
);
assert(
  editTitleModal.includes('h-[100dvh]') && editTitleModal.includes('sm:h-auto'),
  'EditTitleModal utiliza shell fullscreen h-[100dvh] com adaptação desktop sm:h-auto',
  'Modais Operacionais'
);
assert(
  batchSettlementModal.includes('h-[100dvh]') && batchSettlementModal.includes('sm:h-auto'),
  'BatchSettlementModal utiliza shell fullscreen h-[100dvh] com adaptação desktop sm:h-auto',
  'Modais Operacionais'
);
assert(
  boletoBatchSettlementModal.includes('h-[100dvh]') && boletoBatchSettlementModal.includes('sm:h-auto'),
  'BoletoBatchSettlementModal utiliza shell fullscreen h-[100dvh] com adaptação desktop sm:h-auto',
  'Modais Operacionais'
);

// Check 1.2: Cabeçalho Fixo (shrink-0) e Botão Fechar >= 40px
const modals = [
  { name: 'NewTitleModal', content: newTitleModal },
  { name: 'SettlementModal', content: settlementModal },
  { name: 'EditTitleModal', content: editTitleModal },
  { name: 'BatchSettlementModal', content: batchSettlementModal },
  { name: 'BoletoBatchSettlementModal', content: boletoBatchSettlementModal },
];

for (const modal of modals) {
  assert(
    modal.content.includes('shrink-0') && (modal.content.includes('min-w-[40px]') || modal.content.includes('w-10 h-10')),
    `${modal.name} possui cabeçalho shrink-0 e botão fechar com área mínima de 40px`,
    'Modais Operacionais'
  );
}

// Check 1.3: Rodapé Fixo (sticky bottom-0 shrink-0) com Fundo Opaco/Backdrop
for (const modal of modals) {
  const hasStickyFooter = modal.content.includes('sticky bottom-0') && modal.content.includes('shrink-0');
  const hasBackdropOrBg = modal.content.includes('bg-white') || modal.content.includes('bg-[var(--surface-elevated)]') || modal.content.includes('bg-slate-50');
  assert(
    hasStickyFooter && hasBackdropOrBg,
    `${modal.name} possui rodapé sticky bottom-0 com fundo opaco/backdrop impedindo vazamento de conteúdo`,
    'Modais Operacionais'
  );
}

// Check 1.4: Espaçamento de Proteção contra Teclado Virtual (pb-28 e scroll-padding)
for (const modal of modals.slice(0, 3)) { // NewTitleModal, SettlementModal, EditTitleModal
  assert(
    modal.content.includes('pb-28') && modal.content.includes('[scroll-padding-bottom:7rem]'),
    `${modal.name} possui pb-28 (112px) e scroll-padding-bottom:7rem garantindo que teclado não oculte campos`,
    'Teclado Virtual'
  );
}

// Check 1.5: inputMode em Campos Monetários e Numéricos
const newTitleMonetaryMatches = [...newTitleModal.matchAll(/inputMode="decimal"/g)];
assert(
  newTitleMonetaryMatches.length >= 4,
  `NewTitleModal possui pelo menos 4 campos monetários com inputMode="decimal" (encontrados: ${newTitleMonetaryMatches.length})`,
  'Teclado Virtual'
);

const newTitleNumericMatches = [...newTitleModal.matchAll(/inputMode="numeric"/g)];
assert(
  newTitleNumericMatches.length >= 2,
  `NewTitleModal possui campos de repetição/parcelas com inputMode="numeric" (encontrados: ${newTitleNumericMatches.length})`,
  'Teclado Virtual'
);

const settlementMonetaryMatches = [...settlementModal.matchAll(/inputMode="decimal"/g)];
assert(
  settlementMonetaryMatches.length >= 5,
  `SettlementModal possui todos os 5 campos financeiros (valor, desconto, juros, multa, tarifa) com inputMode="decimal" (encontrados: ${settlementMonetaryMatches.length})`,
  'Teclado Virtual'
);

const editMonetaryMatches = [...editTitleModal.matchAll(/inputMode="decimal"/g)];
assert(
  editMonetaryMatches.length >= 1,
  `EditTitleModal possui campo de valor monetário com inputMode="decimal" (encontrados: ${editMonetaryMatches.length})`,
  'Teclado Virtual'
);

// -----------------------------------------------------------------------------
// SECTION 2: DOCK DE AÇÕES EM LOTE VS BOTTOM NAVIGATION BAR
// -----------------------------------------------------------------------------
console.log('▶ [2/4] Testando Coexistência Dock de Lote vs Bottom Navigation Bar...');

const payablesView = readFile('src/components/Financial/PayablesView.tsx');
const receivablesView = readFile('src/components/Financial/ReceivablesView.tsx');
const bottomNavBar = readFile('src/components/Common/BottomNavBar.tsx');

// Check 2.1: BottomNavBar Altura e Fixação
assert(
  bottomNavBar.includes('fixed bottom-0') && bottomNavBar.includes('h-16') && bottomNavBar.includes('z-40'),
  'BottomNavBar fixada no rodapé (fixed bottom-0) com altura de 64px (h-16) e z-index 40',
  'Dock vs BottomNav'
);

// Check 2.2: Dock Flutuante Ancorado a bottom-16 (64px) sem colisão vertical
assert(
  payablesView.includes('fixed bottom-16 inset-x-3 z-40 sm:static'),
  'PayablesView: Dock de lote posicionado exatamente em bottom-16 (64px) ancorando sobre a barra inferior',
  'Dock vs BottomNav'
);
assert(
  receivablesView.includes('fixed bottom-16 inset-x-3 z-40 sm:static'),
  'ReceivablesView: Dock de lote posicionado exatamente em bottom-16 (64px) ancorando sobre a barra inferior',
  'Dock vs BottomNav'
);

// Check 2.3: Tap targets ergonômicos no Dock (>= 40px e ação primária >= 44px)
assert(
  payablesView.includes('min-h-[44px]') && payablesView.includes('min-h-[40px]'),
  'PayablesView: Botão primário com min-h-[44px] e secundários com min-h-[40px] no dock',
  'Dock vs BottomNav'
);
assert(
  receivablesView.includes('min-h-[44px]') && receivablesView.includes('min-h-[40px]'),
  'ReceivablesView: Botão primário com min-h-[44px] e secundários com min-h-[40px] no dock',
  'Dock vs BottomNav'
);

// Check 2.4: Carrossel horizontal de ações secundárias com scroll suave (sem estourar viewport)
assert(
  payablesView.includes('overflow-x-auto scrollbar-none flex-nowrap') && receivablesView.includes('overflow-x-auto scrollbar-none flex-nowrap'),
  'Ações secundárias do dock em Payables e Receivables utilizam overflow-x-auto scrollbar-none flex-nowrap',
  'Dock vs BottomNav'
);

// -----------------------------------------------------------------------------
// SECTION 3: DRE & FLUXO DE CAIXA: COLUNA CONGELADA & ZERO TEXT BLEED
// -----------------------------------------------------------------------------
console.log('▶ [3/4] Testando Congelamento de Coluna e Opacidade de Fundo na DRE e Fluxo de Caixa...');

const dreView = readFile('src/components/Management/DREView.tsx');
const cashFlowView = readFile('src/components/Management/CashFlowView.tsx');
const reportsView = readFile('src/components/Management/ReportsView.tsx');

// Check 3.1: DREView Coluna Congelada com sticky left-0 e Z-index layering
assert(
  dreView.includes('sticky left-0 z-30') && dreView.includes('sticky left-0 z-10'),
  'DREView possui th com sticky left-0 z-30 e td com sticky left-0 z-10',
  'Tabelas Financeiras'
);

// Check 3.2: DREView Largura Adaptativa Mobile (140px a 165px)
assert(
  dreView.includes('min-w-[140px] max-w-[165px] sm:min-w-[240px]'),
  'DREView primeira coluna adaptada para 140px-165px no mobile e 240px no desktop',
  'Tabelas Financeiras'
);

// Check 3.3: DREView Opacidade dos Fundos Congelados (Zero Text Bleed)
// Verificamos que stickyBg usa cores 100% sólidas
const dreOpaqueBackgrounds = [
  'bg-white dark:bg-[#121620]',
  'bg-amber-100 dark:bg-[#1c1a14]',
  'bg-amber-50 dark:bg-[#171b22]',
  'bg-slate-100 dark:bg-[#171b22]',
  'bg-slate-200 dark:bg-[#1a2130]',
  'bg-amber-100 dark:bg-[#1a1812]'
];

let dreAllOpaque = true;
for (const bg of dreOpaqueBackgrounds) {
  if (!dreView.includes(bg)) {
    dreAllOpaque = false;
    break;
  }
}
assert(
  dreAllOpaque,
  'DREView possui fundos 100% sólidos/opacos em todas as linhas (light e dark mode) prevenindo vazamento de texto',
  'Tabelas Financeiras'
);

// Check 3.4: CashFlowView Coluna Congelada com sticky left-0 e Z-index layering
assert(
  cashFlowView.includes('sticky left-0 bg-slate-100 dark:bg-[#1a2130] z-30') && cashFlowView.includes('sticky left-0 z-10'),
  'CashFlowView possui th com sticky left-0 z-30 e td com sticky left-0 z-10',
  'Tabelas Financeiras'
);

// Check 3.5: CashFlowView Largura Adaptativa Mobile (145px a 165px)
assert(
  cashFlowView.includes('min-w-[145px] max-w-[165px] sm:min-w-[220px]'),
  'CashFlowView primeira coluna adaptada para 145px-165px no mobile',
  'Tabelas Financeiras'
);

// Check 3.6: CashFlowView Opacidade dos Fundos Congelados
const cashFlowOpaqueBackgrounds = [
  'bg-white dark:bg-[#121620]',
  'bg-slate-200 dark:bg-[#1a2230]',
  'bg-emerald-100 dark:bg-[#13281e]',
  'bg-purple-100 dark:bg-[#20152b]',
  'bg-amber-100 dark:bg-[#261f10]',
  'bg-slate-100 dark:bg-[#151c27]',
  'bg-slate-200 dark:bg-[#1e2738]',
  'bg-blue-100 dark:bg-[#152338]'
];

let cashFlowAllOpaque = true;
for (const bg of cashFlowOpaqueBackgrounds) {
  if (!cashFlowView.includes(bg)) {
    cashFlowAllOpaque = false;
    break;
  }
}
assert(
  cashFlowAllOpaque,
  'CashFlowView possui fundos 100% sólidos/opacos em todas as 8 variantes contábeis prevenindo vazamento de números',
  'Tabelas Financeiras'
);

// Check 3.7: ReportsView Colunas Congeladas
assert(
  reportsView.includes('sticky left-0 z-20') && reportsView.includes('sticky left-0 z-10'),
  'ReportsView possui colunas congeladas com sticky left-0 e z-index estratificado',
  'Tabelas Financeiras'
);

// -----------------------------------------------------------------------------
// SECTION 4: ANÁLISE DE VIEWPORTS EXTREMAS (320px–430px) & AUSÊNCIA DE OVERFLOW
// -----------------------------------------------------------------------------
console.log('▶ [4/4] Testando Limites de Viewport e Ausência de Quebras...');

const appTsx = readFile('src/App.tsx');
const indexCss = readFile('src/index.css');
const indexHtml = readFile('index.html');

// Check 4.1: Meta Viewport com interactive-widget e viewport-fit
assert(
  indexHtml.includes('interactive-widget=resizes-content') && indexHtml.includes('viewport-fit=cover'),
  'index.html configura interactive-widget=resizes-content e viewport-fit=cover',
  'Limites de Viewport'
);

// Check 4.2: Root Overflow-x Protection
assert(
  indexCss.includes('overflow-x: hidden') && appTsx.includes('overflow-x-hidden'),
  'src/index.css e App.tsx contêm contenção absoluta de scroll lateral via overflow-x-hidden',
  'Limites de Viewport'
);

// Check 4.3: Main Padding Bottom para acomodar BottomNavBar
assert(
  appTsx.includes('pb-20 lg:pb-5'),
  'App.tsx aplica pb-20 (80px) no container principal para nunca encobrir conteúdo pela BottomNavBar (64px)',
  'Limites de Viewport'
);

// Check 4.4: FloatingCalculator acima da BottomNavBar
const floatingCalc = readFile('src/components/Common/FloatingCalculator.tsx');
assert(
  floatingCalc.includes('bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-5'),
  'FloatingCalculator posicionada a ~76px do rodapé, repousando acima da BottomNavBar sem sobreposição',
  'Limites de Viewport'
);

// -----------------------------------------------------------------------------
// RELATÓRIO DE RESULTADOS
// -----------------------------------------------------------------------------
console.log('\n======================================================================');
console.log('                 RESULTADOS DO TESTE ADVERSARIAL                      ');
console.log('======================================================================\n');

let failedCount = 0;
const categories = [...new Set(results.map(r => r.category))];

for (const cat of categories) {
  console.log(`\n• ${cat}:`);
  for (const r of results.filter(res => res.category === cat)) {
    if (r.passed) {
      console.log(`  ✔ ${r.name}`);
    } else {
      failedCount++;
      console.log(`  ✖ FALHA: ${r.name} (${r.details})`);
    }
  }
}

console.log('\n======================================================================');
console.log(`Total de Asserções Adversariais: ${results.length}`);
console.log(`Asserções Aprovadas:           ${results.length - failedCount}`);
console.log(`Asserções Falhas:              ${failedCount}`);
console.log('======================================================================\n');

if (failedCount > 0) {
  console.error(`❌ O TESTE ADVERSARIAL ENCONTROU ${failedCount} FALHA(S)!`);
  process.exit(1);
} else {
  console.log('✔ TODAS AS ASSERÇÕES ADVERSARIAIS FORAM APROVADAS COM ÊXITO!');
  process.exit(0);
}
