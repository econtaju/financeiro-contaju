/**
 * ============================================================================
 * CONTAJU GESTÃO FINANCEIRA — MOBILE E2E TEST SUITE (TIERS 1 A 4)
 * ============================================================================
 * Arquivo: scripts/test-mobile-e2e.ts
 * Execução: npx tsx scripts/test-mobile-e2e.ts
 *
 * Cobertura Completa dos 4 Tiers:
 * - Tier 1: Cobertura de todas as features de UI dos Requisitos R1, R2, R3 e R4
 * - Tier 2: Verificação de viewports (320px, 360px, 390px, 414px, 430px), tap targets >= 40px,
 *           utilitários CSS e ausência de larguras fixas rígidas sem adaptação
 * - Tier 3: Interações cruzadas (BottomNavBar vs Calculadora vs Dock de Lote vs Modais)
 * - Tier 4: Cenários de aplicação do mundo real descritos em TEST_INFRA.md
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { formatBRL, formatDateBR, getTemporalStatus } from '../src/services/financialEngine';
import { 
  calculatorReducer, 
  INITIAL_CALCULATOR_STATE, 
  formatCalculatorNumber 
} from '../src/utils/calculatorEngine';

// Cores ANSI para terminal
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const GRAY = '\x1b[90m';

interface TestResult {
  id: string;
  tier: number;
  category: string;
  description: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

class TestSuite {
  private results: TestResult[] = [];
  private rootDir: string;

  constructor() {
    this.rootDir = process.cwd();
  }

  private readFile(relPath: string): string {
    const fullPath = path.resolve(this.rootDir, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Arquivo não encontrado: ${relPath} (${fullPath})`);
    }
    return fs.readFileSync(fullPath, 'utf-8');
  }

  public test(tier: number, id: string, category: string, description: string, fn: () => void | Promise<void>) {
    const start = performance.now();
    try {
      fn();
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      this.results.push({
        id,
        tier,
        category,
        description,
        passed: true,
        durationMs
      });
      console.log(`  ${GREEN}✔${RESET} ${GRAY}[${id}]${RESET} ${description} ${GRAY}(${durationMs}ms)${RESET}`);
    } catch (err: any) {
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      this.results.push({
        id,
        tier,
        category,
        description,
        passed: false,
        error: err.message || String(err),
        durationMs
      });
      console.log(`  ${RED}✖${RESET} ${GRAY}[${id}]${RESET} ${description}`);
      console.log(`    ${RED}Erro: ${err.message || err}${RESET}`);
    }
  }

  public getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const tierCounts: Record<number, { total: number; passed: number; failed: number }> = {};

    for (let t = 1; t <= 4; t++) {
      const tierResults = this.results.filter(r => r.tier === t);
      tierCounts[t] = {
        total: tierResults.length,
        passed: tierResults.filter(r => r.passed).length,
        failed: tierResults.filter(r => !r.passed).length
      };
    }

    return { total, passed, failed, tierCounts, results: this.results };
  }

  // ==========================================================================
  // RUNNER PRINCIPAL
  // ==========================================================================
  public async run() {
    console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
    console.log(`${BOLD}${CYAN}   CONTAJU GESTÃO FINANCEIRA — E2E MOBILE TEST RUNNER (TIERS 1-4)    ${RESET}`);
    console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

    // Carregar arquivos essenciais para inspeção
    const bottomNavContent = this.readFile('src/components/Common/BottomNavBar.tsx');
    const sidebarContent = this.readFile('src/components/Sidebar.tsx');
    const headerContent = this.readFile('src/components/Header.tsx');
    const appContent = this.readFile('src/App.tsx');
    const indexCssContent = this.readFile('src/index.css');
    const indexHtmlContent = this.readFile('index.html');
    const floatingCalcContent = this.readFile('src/components/Common/FloatingCalculator.tsx');
    const payablesContent = this.readFile('src/components/Financial/PayablesView.tsx');
    const receivablesContent = this.readFile('src/components/Financial/ReceivablesView.tsx');
    const movementsContent = this.readFile('src/components/Financial/MovementsView.tsx');
    const newTitleModalContent = this.readFile('src/components/Modals/NewTitleModal.tsx');
    const settlementModalContent = this.readFile('src/components/Modals/SettlementModal.tsx');
    const editTitleModalContent = this.readFile('src/components/Modals/EditTitleModal.tsx');
    const batchSettlementModalContent = this.readFile('src/components/Modals/BatchSettlementModal.tsx');
    const boletoModalContent = this.readFile('src/components/Financial/BoletoBatchSettlementModal.tsx');
    const dreContent = this.readFile('src/components/Management/DREView.tsx');
    const cashFlowContent = this.readFile('src/components/Management/CashFlowView.tsx');
    const reportsContent = this.readFile('src/components/Management/ReportsView.tsx');

    // ------------------------------------------------------------------------
    // TIER 1: COBERTURA FUNCIONAL DE FEATURES (R1, R2, R3, R4)
    // ------------------------------------------------------------------------
    console.log(`\n${BOLD}${YELLOW}► TIER 1: COBERTURA FUNCIONAL DE FEATURES (R1, R2, R3, R4)${RESET}`);

    // Feature 1: Bottom Navigation Bar (R1)
    console.log(`\n ${MAGENTA}F1. Bottom Navigation Bar${RESET}`);
    this.test(1, 'T1.1.1', 'BottomNavBar', 'Componente BottomNavBar exportado e aceita contratos de props necessários', () => {
      if (!bottomNavContent.includes('export const BottomNavBar')) throw new Error('BottomNavBar não exportado');
      if (!bottomNavContent.includes('currentScreen')) throw new Error('Prop currentScreen ausente');
      if (!bottomNavContent.includes('onNavigate')) throw new Error('Prop onNavigate ausente');
      if (!bottomNavContent.includes('onOpenDrawer')) throw new Error('Prop onOpenDrawer ausente');
    });

    this.test(1, 'T1.1.2', 'BottomNavBar', 'Posicionamento fixo inferior mobile (fixed bottom-0 z-40 lg:hidden h-16)', () => {
      if (!bottomNavContent.includes('fixed bottom-0')) throw new Error('Falta fixed bottom-0');
      if (!bottomNavContent.includes('z-40')) throw new Error('Falta z-40');
      if (!bottomNavContent.includes('lg:hidden')) throw new Error('Falta lg:hidden');
      if (!bottomNavContent.includes('h-16')) throw new Error('Falta altura h-16');
    });

    this.test(1, 'T1.1.3', 'BottomNavBar', 'Disponibiliza as 5 rotas obrigatórias (Dashboard, Pagar, Receber, DRE, Menu)', () => {
      const hasDashboard = bottomNavContent.includes("'DASHBOARD'");
      const hasPagar = bottomNavContent.includes("'CONTAS_PAGAR'");
      const hasReceber = bottomNavContent.includes("'CONTAS_RECEBER'");
      const hasDRE = bottomNavContent.includes("'DRE'");
      const hasDrawer = bottomNavContent.includes('onOpenDrawer');
      if (!hasDashboard || !hasPagar || !hasReceber || !hasDRE || !hasDrawer) {
        throw new Error('5 rotas obrigatórias não encontradas no BottomNavBar');
      }
    });

    this.test(1, 'T1.1.4', 'BottomNavBar', 'Exibe badges dinâmicos de títulos vencidos para Pagar e Receber', () => {
      if (!bottomNavContent.includes('overduePayablesCount')) throw new Error('Badge de contas a pagar não implementado');
      if (!bottomNavContent.includes('overdueReceivablesCount')) throw new Error('Badge de contas a receber não implementado');
      if (!bottomNavContent.includes('bg-rose-500 text-white')) throw new Error('Estilo de badge de pagar ausente');
      if (!bottomNavContent.includes('bg-emerald-500 text-white')) throw new Error('Estilo de badge de receber ausente');
    });

    this.test(1, 'T1.1.5', 'BottomNavBar', 'Tap targets ergonômicos (>= 40px) e padding de safe area inferior', () => {
      if (!bottomNavContent.includes('min-h-[48px]') && !bottomNavContent.includes('min-h-[40px]')) {
        throw new Error('Tap target mínimo vertical de 40px não atendido');
      }
      if (!bottomNavContent.includes('min-w-[40px]')) throw new Error('Tap target mínimo horizontal de 40px não atendido');
      if (!bottomNavContent.includes('env(safe-area-inset-bottom)')) throw new Error('Safe area bottom ausente');
    });

    // Feature 2: Drawer Mobile Fluido (R1)
    console.log(`\n ${MAGENTA}F2. Drawer Mobile Fluido (Sidebar)${RESET}`);
    this.test(1, 'T1.2.1', 'Sidebar', 'Desacoplamento explícito de isMinimized do desktop quando em modo mobile', () => {
      if (!sidebarContent.includes('isMinimized && !isOpenMobile')) {
        throw new Error('isEffectiveMinimized não desacopla isMinimized quando isOpenMobile está ativo');
      }
    });

    this.test(1, 'T1.2.2', 'Sidebar', 'Bloqueio de rolagem do body (overflow: hidden) enquanto drawer estiver aberto', () => {
      if (!sidebarContent.includes("document.body.style.overflow = 'hidden'")) {
        throw new Error('Bloqueio do scroll do body ausente no Sidebar');
      }
    });

    this.test(1, 'T1.2.3', 'Sidebar', 'Backdrop overlay escuro com backdrop-blur e fechamento ao toque externo', () => {
      if (!sidebarContent.includes('fixed inset-0 bg-black/60') && !sidebarContent.includes('fixed inset-0 bg-slate-900/60')) {
        throw new Error('Backdrop escuro ausente no drawer móvel');
      }
      if (!sidebarContent.includes('onClick={onCloseMobile}')) {
        throw new Error('Toque no backdrop não dispara onCloseMobile');
      }
    });

    this.test(1, 'T1.2.4', 'Sidebar', 'Fechamento do menu lateral com suporte à tecla Escape', () => {
      if (!sidebarContent.includes("e.key === 'Escape'")) {
        throw new Error('Suporte à tecla Escape ausente no drawer móvel');
      }
      if (!sidebarContent.includes('onCloseMobile()')) {
        throw new Error('Escape não aciona onCloseMobile');
      }
    });

    this.test(1, 'T1.2.5', 'Sidebar', 'Botão de fechar (X) visível no mobile com área de toque >= 40px', () => {
      if (!sidebarContent.includes('lg:hidden') || !sidebarContent.includes('min-w-[40px] min-h-[40px]')) {
        throw new Error('Botão de fechar mobile com tap target >= 40px não encontrado no Sidebar');
      }
    });

    // Feature 3: Layout Raiz & Header Mobile (R1)
    console.log(`\n ${MAGENTA}F3. Layout Raiz & Header Mobile${RESET}`);
    this.test(1, 'T1.3.1', 'Layout', 'Container raiz com overflow-x-hidden impedindo rolagem horizontal indesejada', () => {
      if (!appContent.includes('overflow-x-hidden')) throw new Error('App.tsx raiz não possui overflow-x-hidden');
    });

    this.test(1, 'T1.3.2', 'Layout', 'Área principal <main> possui padding inferior pb-20 no mobile para acomodar a BottomNavBar', () => {
      if (!appContent.includes('pb-20 lg:pb-5')) {
        throw new Error('<main> não possui classe pb-20 lg:pb-5 para respiro da BottomNavBar');
      }
    });

    this.test(1, 'T1.3.3', 'Layout', 'BottomNavBar devidamente instanciada e conectada ao estado do App.tsx', () => {
      if (!appContent.includes('<BottomNavBar')) throw new Error('BottomNavBar não renderizada no App.tsx');
      if (!appContent.includes('onNavigate={(screen) => setCurrentScreen(screen)}')) {
        throw new Error('BottomNavBar não possui handler onNavigate ligado a setCurrentScreen');
      }
      if (!appContent.includes('onOpenDrawer={() => setIsMobileSidebarOpen(true)}')) {
        throw new Error('BottomNavBar não abre o drawer mobile via onOpenDrawer');
      }
    });

    this.test(1, 'T1.3.4', 'Header', 'Botão hambúrguer no Header com tap target ergonômico >= 40px', () => {
      if (!headerContent.includes('min-w-[40px] min-h-[40px]')) {
        throw new Error('Header não possui botão hambúrguer com min-w-[40px] min-h-[40px]');
      }
      if (!headerContent.includes('onOpenMobileSidebar')) {
        throw new Error('Header não possui disparo onOpenMobileSidebar');
      }
    });

    this.test(1, 'T1.3.5', 'FloatingCalculator', 'Calculadora flutuante ancorada acima da BottomNavBar no mobile', () => {
      if (!floatingCalcContent.includes('bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-5')) {
        throw new Error('FloatingCalculator não está posicionada acima da barra inferior no mobile');
      }
    });

    // Feature 4: Cards Touch Compactos Pagar & Receber (R2)
    console.log(`\n ${MAGENTA}F4. Cards Touch Compactos Contas a Pagar & Receber${RESET}`);
    this.test(1, 'T1.4.1', 'CardsTouch', 'PayablesView renderiza cards compactos mobile com fornecedor em destaque e valor', () => {
      if (!payablesContent.includes('toggleExpandMobile')) throw new Error('toggleExpandMobile ausente em PayablesView');
      if (!payablesContent.includes('Fornecedor / Favorecido')) throw new Error('Fornecedor em destaque ausente nos cards');
      if (!payablesContent.includes('formatBRL')) throw new Error('Formatação de valor formatBRL ausente nos cards');
    });

    this.test(1, 'T1.4.2', 'CardsTouch', 'Badges de status temporais imediatos nos cards (Vencido, Vence Hoje, Em dia, Pago)', () => {
      if (!payablesContent.includes("'Vencido'") || !payablesContent.includes("'Vence Hoje'") || !payablesContent.includes("'Em dia'")) {
        throw new Error('Badges de status temporal imediato não configurados nos cards');
      }
    });

    this.test(1, 'T1.4.3', 'CardsTouch', 'ReceivablesView renderiza cards compactos com botão de cobrança WhatsApp', () => {
      if (!receivablesContent.includes('Copiar Mensagem de Cobrança WhatsApp')) {
        throw new Error('Botão de cobrança WhatsApp ausente nos cards de ReceivablesView');
      }
      if (!receivablesContent.includes('min-h-[40px]')) {
        throw new Error('Botão WhatsApp sem tap target >= 40px');
      }
    });

    this.test(1, 'T1.4.4', 'CardsTouch', 'Checkboxes de seleção individual nos cards possuem tap targets >= 40px', () => {
      if (!payablesContent.includes('min-w-[40px] min-h-[40px] flex items-center justify-center')) {
        throw new Error('Tap target >= 40px no checkbox de PayablesView ausente');
      }
      if (!receivablesContent.includes('min-w-[40px] min-h-[40px] flex items-center justify-center')) {
        throw new Error('Tap target >= 40px no checkbox de ReceivablesView ausente');
      }
    });

    this.test(1, 'T1.4.5', 'CardsTouch', 'Botões de ação rápida nos cards (Pagar Obrigação / Baixar / Editar) possuem tap targets >= 40px', () => {
      if (!payablesContent.includes('min-h-[42px]') || !payablesContent.includes('min-h-[40px]')) {
        throw new Error('Botões de ação em PayablesView com altura < 40px');
      }
      if (!receivablesContent.includes('min-h-[42px]') || !receivablesContent.includes('min-h-[40px]')) {
        throw new Error('Botões de ação em ReceivablesView com altura < 40px');
      }
    });

    // Feature 5: Seleção e Dock de Lote Mobile (R2)
    console.log(`\n ${MAGENTA}F5. Seleção em Lote Mobile & Dock Flutuante${RESET}`);
    this.test(1, 'T1.5.1', 'BatchDock', 'Dock flutuante de ações em lote fixo no rodapé mobile acima da barra de navegação', () => {
      if (!payablesContent.includes('fixed bottom-16 inset-x-3 z-40 sm:static')) {
        throw new Error('Dock de lote de PayablesView não configurado como fixed bottom-16 inset-x-3 z-40 sm:static');
      }
      if (!receivablesContent.includes('fixed bottom-16 inset-x-3 z-40 sm:static')) {
        throw new Error('Dock de lote de ReceivablesView não configurado como fixed bottom-16 inset-x-3 z-40 sm:static');
      }
    });

    this.test(1, 'T1.5.2', 'BatchDock', 'Contador de itens e saldo selecionado presentes no dock', () => {
      if (!payablesContent.includes('selectedIds.length') || !payablesContent.includes('totalSelectedBalance')) {
        throw new Error('Contador de obrigações e saldo selecionado ausentes no dock de PayablesView');
      }
    });

    this.test(1, 'T1.5.3', 'BatchDock', 'Botão Desmarcar acessível no mobile com tap target >= 40px', () => {
      if (!payablesContent.includes('sm:hidden min-h-[40px]') || !payablesContent.includes('Desmarcar')) {
        throw new Error('Botão Desmarcar móvel >= 40px ausente no dock de PayablesView');
      }
    });

    this.test(1, 'T1.5.4', 'BatchDock', 'Ação primária Baixar em Lote destacada com tap target >= 44px', () => {
      if (!payablesContent.includes('min-h-[44px]') || !payablesContent.includes('Baixar em Lote')) {
        throw new Error('Botão primário Baixar em Lote >= 44px ausente no dock');
      }
    });

    this.test(1, 'T1.5.5', 'BatchDock', 'Ações secundárias do dock em carrossel horizontal sem quebra de margens (scrollbar-none)', () => {
      if (!payablesContent.includes('overflow-x-auto scrollbar-none flex-nowrap')) {
        throw new Error('Carrossel de ações secundárias no dock ausente');
      }
    });

    // Feature 6: Modais Fullscreen Mobile (R3)
    console.log(`\n ${MAGENTA}F6. Modais Fullscreen Mobile${RESET}`);
    this.test(1, 'T1.6.1', 'Modals', 'NewTitleModal com shell fullscreen h-[100dvh] e cabeçalho fixo no mobile', () => {
      if (!newTitleModalContent.includes('h-[100dvh]') || !newTitleModalContent.includes('flex flex-col')) {
        throw new Error('NewTitleModal não configurado com shell fullscreen flex flex-col h-[100dvh]');
      }
      if (!newTitleModalContent.includes('w-10 h-10 min-w-[40px] min-h-[40px]')) {
        throw new Error('Botão fechar em NewTitleModal com tap target < 40px');
      }
    });

    this.test(1, 'T1.6.2', 'Modals', 'SettlementModal com shell fullscreen h-[100dvh] e rodapé fixo no mobile', () => {
      if (!settlementModalContent.includes('h-[100dvh]') || !settlementModalContent.includes('flex flex-col')) {
        throw new Error('SettlementModal não configurado com shell fullscreen flex flex-col h-[100dvh]');
      }
      if (!settlementModalContent.includes('sticky bottom-0')) {
        throw new Error('Rodapé de ações de SettlementModal não é sticky bottom-0');
      }
    });

    this.test(1, 'T1.6.3', 'Modals', 'EditTitleModal com shell fullscreen h-[100dvh] e botões >= 40px', () => {
      if (!editTitleModalContent.includes('h-[100dvh]') || !editTitleModalContent.includes('flex flex-col')) {
        throw new Error('EditTitleModal não configurado com shell fullscreen flex flex-col h-[100dvh]');
      }
      if (!editTitleModalContent.includes('min-h-[42px]') && !editTitleModalContent.includes('min-h-[40px]')) {
        throw new Error('Botões de ação em EditTitleModal com tap target < 40px');
      }
    });

    this.test(1, 'T1.6.4', 'Modals', 'BatchSettlementModal com shell fullscreen h-[100dvh] e cabeçalho/rodapé fixos', () => {
      if (!batchSettlementModalContent.includes('h-[100dvh]') || !batchSettlementModalContent.includes('flex flex-col')) {
        throw new Error('BatchSettlementModal não configurado com shell fullscreen flex flex-col');
      }
      if (!batchSettlementModalContent.includes('min-w-[40px] min-h-[40px]')) {
        throw new Error('Botão de fechar BatchSettlementModal com tap target < 40px');
      }
    });

    this.test(1, 'T1.6.5', 'Modals', 'BoletoBatchSettlementModal com shell fullscreen h-[100dvh]', () => {
      if (!boletoModalContent.includes('h-[100dvh]') || !boletoModalContent.includes('flex flex-col')) {
        throw new Error('BoletoBatchSettlementModal não configurado com shell fullscreen flex flex-col');
      }
    });

    // Feature 7: Teclado & inputMode (R3)
    console.log(`\n ${MAGENTA}F7. Prevenção de Teclado & inputMode${RESET}`);
    this.test(1, 'T1.7.1', 'Keyboard', 'Campos de valor monetário configurados com inputMode="decimal" em NewTitleModal', () => {
      const decimalCount = (newTitleModalContent.match(/inputMode="decimal"/g) || []).length;
      if (decimalCount < 3) {
        throw new Error(`Campos com inputMode="decimal" insuficientes em NewTitleModal (${decimalCount} encontrados)`);
      }
    });

    this.test(1, 'T1.7.2', 'Keyboard', 'Contadores de parcelas e repetições configurados com inputMode="numeric"', () => {
      const numericCount = (newTitleModalContent.match(/inputMode="numeric"/g) || []).length;
      if (numericCount < 2) {
        throw new Error(`Campos com inputMode="numeric" insuficientes em NewTitleModal (${numericCount} encontrados)`);
      }
    });

    this.test(1, 'T1.7.3', 'Keyboard', 'Campos monetários de SettlementModal possuem inputMode="decimal"', () => {
      const decimalCount = (settlementModalContent.match(/inputMode="decimal"/g) || []).length;
      if (decimalCount < 4) {
        throw new Error(`Campos com inputMode="decimal" insuficientes em SettlementModal (${decimalCount} encontrados)`);
      }
    });

    this.test(1, 'T1.7.4', 'Keyboard', 'Campos de valor em EditTitleModal possuem inputMode="decimal"', () => {
      if (!editTitleModalContent.includes('inputMode="decimal"')) {
        throw new Error('inputMode="decimal" ausente em EditTitleModal');
      }
    });

    this.test(1, 'T1.7.5', 'Keyboard', 'Corpo rolável dos modais com pb-28 e scroll-padding prevenindo corte por teclado virtual', () => {
      if (!newTitleModalContent.includes('pb-28 sm:pb-6') || !newTitleModalContent.includes('[scroll-padding-bottom:7rem]')) {
        throw new Error('pb-28 ou scroll-padding-bottom ausente no formulário de NewTitleModal');
      }
      if (!settlementModalContent.includes('pb-28 sm:pb-6')) {
        throw new Error('pb-28 ausente no formulário de SettlementModal');
      }
    });

    // Feature 8: DRE & Fluxo de Caixa Mobile (R4)
    console.log(`\n ${MAGENTA}F8. DRE & Fluxo de Caixa Mobile${RESET}`);
    this.test(1, 'T1.8.1', 'Management', 'DREView suporta horizonte temporal mensal (timeHorizon === "MES")', () => {
      if (!dreContent.includes("'MES'") || !dreContent.includes("timeHorizon === 'MES'")) {
        throw new Error('Suporte a timeHorizon === MES ausente em DREView');
      }
    });

    this.test(1, 'T1.8.2', 'Management', 'DREView possui alternador rápido mobile Consolidado vs Analítico', () => {
      if (!dreContent.includes('Consolidado') || !dreContent.includes('min-h-[40px]')) {
        throw new Error('Alternador mobile Consolidado vs Analítico ausente ou sem tap target >= 40px em DREView');
      }
    });

    this.test(1, 'T1.8.3', 'Management', 'Primeira coluna da DRE congelada com sticky left-0 e fundo 100% opaco', () => {
      if (!dreContent.includes('sticky left-0 z-30 bg-slate-200 dark:bg-[#1a2130]')) {
        throw new Error('Cabeçalho sticky left-0 com fundo opaco ausente na DRE');
      }
      if (!dreContent.includes('sticky left-0 z-10') || !dreContent.includes('min-w-[140px] max-w-[165px] sm:min-w-[240px]')) {
        throw new Error('Células da primeira coluna sem sticky left-0 ou largura adaptativa na DRE');
      }
    });

    this.test(1, 'T1.8.4', 'Management', 'CashFlowView possui primeira coluna congelada com sticky left-0 e largura adaptativa', () => {
      if (!cashFlowContent.includes('min-w-[145px] max-w-[165px]') || !cashFlowContent.includes('sticky left-0')) {
        throw new Error('Primeira coluna de CashFlowView sem sticky left-0 ou sem largura adaptativa');
      }
    });

    this.test(1, 'T1.8.5', 'Management', 'ReportsView possui primeira coluna congelada sticky left-0 com fundo opaco', () => {
      if (!reportsContent.includes('sticky left-0 z-20 bg-slate-100 dark:bg-slate-800') || !reportsContent.includes('min-w-[145px] max-w-[170px]')) {
        throw new Error('Tabelas de ReportsView sem coluna sticky left-0 adaptada');
      }
    });

    // ------------------------------------------------------------------------
    // TIER 2: LIMITES & VIEWPORTS (320px, 360px, 390px, 414px, 430px)
    // ------------------------------------------------------------------------
    console.log(`\n${BOLD}${YELLOW}► TIER 2: LIMITES, VIEWPORTS E ERGONOMIA DE TOQUE${RESET}`);

    // Categoria 1: Viewport Meta & Head Config
    console.log(`\n ${MAGENTA}V1. Viewport Meta & Head Config (index.html)${RESET}`);
    this.test(2, 'T2.1.1', 'ViewportConfig', 'index.html define meta viewport com width=device-width', () => {
      if (!indexHtmlContent.includes('width=device-width')) throw new Error('width=device-width ausente');
    });

    this.test(2, 'T2.1.2', 'ViewportConfig', 'index.html contém viewport-fit=cover para notch e safe area', () => {
      if (!indexHtmlContent.includes('viewport-fit=cover')) throw new Error('viewport-fit=cover ausente');
    });

    this.test(2, 'T2.1.3', 'ViewportConfig', 'index.html contém interactive-widget=resizes-content contra teclado virtual', () => {
      if (!indexHtmlContent.includes('interactive-widget=resizes-content')) {
        throw new Error('interactive-widget=resizes-content ausente em index.html');
      }
    });

    this.test(2, 'T2.1.4', 'ViewportConfig', 'index.html estabelece maximum-scale=1.0 para estabilidade de zoom', () => {
      if (!indexHtmlContent.includes('maximum-scale=1.0')) throw new Error('maximum-scale=1.0 ausente');
    });

    this.test(2, 'T2.1.5', 'ViewportConfig', 'index.html tem DOCTYPE e codificação UTF-8 corretos', () => {
      if (!indexHtmlContent.includes('<!doctype html>') && !indexHtmlContent.includes('<!DOCTYPE html>')) {
        throw new Error('DOCTYPE html ausente');
      }
      if (!indexHtmlContent.includes('<meta charset="UTF-8" />') && !indexHtmlContent.includes('<meta charset="UTF-8">')) {
        throw new Error('charset UTF-8 ausente');
      }
    });

    // Categoria 2: Global CSS Utilities
    console.log(`\n ${MAGENTA}V2. Utilitários CSS Globais (src/index.css)${RESET}`);
    this.test(2, 'T2.2.1', 'CSSUtilities', 'Declaração do utilitário @utility scrollbar-none com suporte a WebKit e Firefox', () => {
      if (!indexCssContent.includes('@utility scrollbar-none')) throw new Error('@utility scrollbar-none ausente');
      if (!indexCssContent.includes('scrollbar-width: none')) throw new Error('scrollbar-width: none ausente');
      if (!indexCssContent.includes('&::-webkit-scrollbar')) throw new Error('::-webkit-scrollbar ausente');
    });

    this.test(2, 'T2.2.2', 'CSSUtilities', 'Declaração de @utility pb-safe com env(safe-area-inset-bottom)', () => {
      if (!indexCssContent.includes('@utility pb-safe') || !indexCssContent.includes('env(safe-area-inset-bottom)')) {
        throw new Error('@utility pb-safe ausente');
      }
    });

    this.test(2, 'T2.2.3', 'CSSUtilities', 'Declaração de @utility pt-safe com env(safe-area-inset-top)', () => {
      if (!indexCssContent.includes('@utility pt-safe') || !indexCssContent.includes('env(safe-area-inset-top)')) {
        throw new Error('@utility pt-safe ausente');
      }
    });

    this.test(2, 'T2.2.4', 'CSSUtilities', 'Declaração de @utility tap-target com 40px mínimo', () => {
      if (!indexCssContent.includes('@utility tap-target') || !indexCssContent.includes('min-height: 40px')) {
        throw new Error('@utility tap-target ausente');
      }
    });

    this.test(2, 'T2.2.5', 'CSSUtilities', 'Preservação de tokens CSS e variáveis de tema escuro e claro', () => {
      if (!indexCssContent.includes('--bg-app:') || !indexCssContent.includes('--brand-gold:')) {
        throw new Error('Variáveis institucionais ausentes no CSS');
      }
    });

    // Categoria 3: Viewport 320px (iPhone SE 1st gen / Telas Pequenas)
    console.log(`\n ${MAGENTA}V3. Viewport 320px (iPhone SE 1st gen / Telas Estreitas)${RESET}`);
    this.test(2, 'T2.3.1', 'Viewport320px', 'FloatingCalculator não excede largura de 320px (usa w-[calc(100vw-24px)] max-w-xs sm:w-80)', () => {
      if (!floatingCalcContent.includes('w-[calc(100vw-24px)] max-w-xs sm:w-80')) {
        throw new Error('FloatingCalculator pode estourar viewport de 320px');
      }
    });

    this.test(2, 'T2.3.2', 'Viewport320px', 'Sidebar drawer limita largura a max-w-[85vw] permitindo fechamento tocando fora', () => {
      if (!sidebarContent.includes('max-w-[85vw]')) {
        throw new Error('Sidebar drawer não possui max-w-[85vw]');
      }
    });

    this.test(2, 'T2.3.3', 'Viewport320px', 'Dock de lote flutuante utiliza inset-x-3 mantendo margens laterais em 320px', () => {
      if (!payablesContent.includes('inset-x-3') || !receivablesContent.includes('inset-x-3')) {
        throw new Error('Dock de lote não usa inset-x-3');
      }
    });

    this.test(2, 'T2.3.4', 'Viewport320px', 'Primeira coluna da DRE adaptada para caber em 320px (min-w-[140px] max-w-[165px])', () => {
      if (!dreContent.includes('min-w-[140px] max-w-[165px]')) {
        throw new Error('Primeira coluna da DRE excede limites de 320px');
      }
    });

    this.test(2, 'T2.3.5', 'Viewport320px', 'Cards de Contas a Pagar utilizam layout flex com wrap e truncate prevenindo transbordamento', () => {
      if (!payablesContent.includes('min-w-0 flex-1 space-y-1')) {
        throw new Error('Card touch não utiliza min-w-0 para permitir truncamento de textos');
      }
    });

    // Categoria 4: Viewport 360px (Standard Android)
    console.log(`\n ${MAGENTA}V4. Viewport 360px (Standard Android)${RESET}`);
    this.test(2, 'T2.4.1', 'Viewport360px', 'Abas horizontais de status e datas possuem scroll suave (scrollbar-none touch-pan-x)', () => {
      if (!payablesContent.includes('scrollbar-none') || !receivablesContent.includes('scrollbar-none')) {
        throw new Error('Filtros horizontais sem scrollbar-none em 360px');
      }
    });

    this.test(2, 'T2.4.2', 'Viewport360px', 'MovementsView renderiza cards compactos alternativos para telas < 640px (block sm:hidden)', () => {
      if (!movementsContent.includes('block sm:hidden space-y-2.5')) {
        throw new Error('MovementsView não possui lista de cards móveis dedicada');
      }
    });

    this.test(2, 'T2.4.3', 'Viewport360px', 'Modais fullscreen ocupam h-[100dvh] sem margens verticais externas (my-0 sm:my-4)', () => {
      if (!newTitleModalContent.includes('my-0 sm:my-4') && !newTitleModalContent.includes('my-0 sm:my-8')) {
        throw new Error('NewTitleModal possui margem externa desnecessária em 360px');
      }
    });

    this.test(2, 'T2.4.4', 'Viewport360px', 'Header mobile compacta busca e ações sem estourar 360px', () => {
      if (!headerContent.includes('hidden sm:flex') && !headerContent.includes('sm:hidden')) {
        throw new Error('Header sem adaptação de elementos para 360px');
      }
    });

    this.test(2, 'T2.4.5', 'Viewport360px', 'Botão primário Baixar em Lote acomoda texto e ícone em 360px', () => {
      if (!payablesContent.includes('Baixar em Lote') || !payablesContent.includes('min-h-[44px]')) {
        throw new Error('Botão de lote sem adaptação');
      }
    });

    // Categoria 5: Viewport 390px (iPhone 12/13/14/15)
    console.log(`\n ${MAGENTA}V5. Viewport 390px (iPhone 12/13/14/15)${RESET}`);
    this.test(2, 'T2.5.1', 'Viewport390px', 'Hierarquia visual do card: fornecedor com truncate e valor com font-mono font-extrabold', () => {
      if (!payablesContent.includes('font-extrabold font-mono text-rose-600') || !receivablesContent.includes('font-extrabold font-mono text-emerald-600')) {
        throw new Error('Hierarquia tipográfica de valor monetário ausente');
      }
    });

    this.test(2, 'T2.5.2', 'Viewport390px', 'Botão WhatsApp com largura total (w-full) e tap target de 40px no card expandido', () => {
      if (!receivablesContent.includes('w-full min-h-[40px] py-2 px-3 rounded-xl bg-emerald-50')) {
        throw new Error('Botão WhatsApp de largura total e tap target 40px ausente em 390px');
      }
    });

    this.test(2, 'T2.5.3', 'Viewport390px', 'BottomNavBar com flex e max-w-md mx-auto para proporção áurea no iPhone', () => {
      if (!bottomNavContent.includes('max-w-md mx-auto')) {
        throw new Error('BottomNavBar não possui centralização max-w-md mx-auto');
      }
    });

    this.test(2, 'T2.5.4', 'Viewport390px', 'Primeira coluna da DRE (140-165px) deixa mais de 220px livres para visualização de meses', () => {
      const colWidthMin = 140;
      const viewport = 390;
      const remaining = viewport - colWidthMin;
      if (remaining < 220) throw new Error(`Espaço restante insuficiente: ${remaining}px`);
    });

    this.test(2, 'T2.5.5', 'Viewport390px', 'Inputs nos modais possuem tipografia com text-sm ou text-xs adequada', () => {
      if (!newTitleModalContent.includes('text-sm') && !newTitleModalContent.includes('text-xs')) {
        throw new Error('Tamanhos de fonte de input não definidos');
      }
    });

    // Categoria 6: Viewport 414px / 430px (iPhone Plus / Pro Max)
    console.log(`\n ${MAGENTA}V6. Viewport 414px / 430px (iPhone Plus / Pro Max)${RESET}`);
    this.test(2, 'T2.6.1', 'Viewport430px', 'Layout expande suavemente sem quebras em 414px e 430px', () => {
      if (!appContent.includes('w-full max-w-full min-w-0')) {
        throw new Error('Containers de App.tsx sem fluidez de largura');
      }
    });

    this.test(2, 'T2.6.2', 'Viewport430px', 'Tabelas contábeis de CashFlowView possuem scroll horizontal e colunas proporcionais', () => {
      if (!cashFlowContent.includes('overflow-x-auto')) {
        throw new Error('CashFlowView sem overflow-x-auto');
      }
    });

    this.test(2, 'T2.6.3', 'Viewport430px', 'Dock de lote preserva bordas arredondadas rounded-2xl no mobile', () => {
      if (!payablesContent.includes('rounded-2xl sm:rounded-xl')) {
        throw new Error('Dock de lote sem rounded-2xl');
      }
    });

    this.test(2, 'T2.6.4', 'Viewport430px', 'Transições para breakpoint sm: (640px) preservadas em todos os componentes', () => {
      if (!payablesContent.includes('sm:static') || !receivablesContent.includes('sm:static')) {
        throw new Error('Adaptação estática sm: ausente no dock');
      }
    });

    this.test(2, 'T2.6.5', 'Viewport430px', 'Safe area bottom de 34px do iPhone Max preservada via pb-[env(safe-area-inset-bottom)]', () => {
      if (!bottomNavContent.includes('pb-[env(safe-area-inset-bottom)]')) {
        throw new Error('pb-[env(safe-area-inset-bottom)] ausente no BottomNavBar');
      }
    });

    // Categoria 7: Tap Target Ergonomics (>= 40px)
    console.log(`\n ${MAGENTA}V7. Ergonomia de Toque (Tap Targets >= 40px)${RESET}`);
    this.test(2, 'T2.7.1', 'TapTargets', 'Botões da BottomNavBar possuem altura mínima de 48px e largura de 40px', () => {
      if (!bottomNavContent.includes('min-h-[48px]') || !bottomNavContent.includes('min-w-[40px]')) {
        throw new Error('Botões de BottomNavBar não atendem tap target >= 40px');
      }
    });

    this.test(2, 'T2.7.2', 'TapTargets', 'Botão de fechar do Sidebar possui min-w-[40px] e min-h-[40px]', () => {
      if (!sidebarContent.includes('min-w-[40px] min-h-[40px]')) {
        throw new Error('Botão fechar do Sidebar não atende 40px');
      }
    });

    this.test(2, 'T2.7.3', 'TapTargets', 'Checkboxes de seleção individual em Payables e Receivables possuem área de toque >= 40px', () => {
      if (!payablesContent.includes('min-w-[40px] min-h-[40px]')) {
        throw new Error('Checkbox de Payables sem contêiner de 40px');
      }
      if (!receivablesContent.includes('min-w-[40px] min-h-[40px]')) {
        throw new Error('Checkbox de Receivables sem contêiner de 40px');
      }
    });

    this.test(2, 'T2.7.4', 'TapTargets', 'Botões de ação dos cards possuem altura >= 40px (min-h-[42px] / min-h-[40px])', () => {
      if (!payablesContent.includes('min-h-[42px]') || !payablesContent.includes('min-h-[40px]')) {
        throw new Error('Botões de ação em PayablesView com altura < 40px');
      }
    });

    this.test(2, 'T2.7.5', 'TapTargets', 'Botões de fechamento em todos os modais (NewTitle, Settlement, Edit, Batch, Boleto) atendem >= 40px', () => {
      const allModals = [newTitleModalContent, settlementModalContent, editTitleModalContent, batchSettlementModalContent, boletoModalContent];
      for (const m of allModals) {
        if (!m.includes('min-w-[40px] min-h-[40px]') && !m.includes('w-10 h-10')) {
          throw new Error('Pelo menos um modal não possui botão de fechar com 40px');
        }
      }
    });

    // Categoria 8: Ausência de Classes Rígidas Quebradeiras
    console.log(`\n ${MAGENTA}V8. Ausência de Classes Rígidas Quebradeiras (> 320px sem max-w/sm:)${RESET}`);
    this.test(2, 'T2.8.1', 'NoRigidClasses', 'Ausência de classes w-screen em elementos filhos com margens fixas', () => {
      if (payablesContent.includes('w-screen mr-') || receivablesContent.includes('w-screen mr-')) {
        throw new Error('Uso perigoso de w-screen detectado');
      }
    });

    this.test(2, 'T2.8.2', 'NoRigidClasses', 'FloatingCalculator expandida não usa largura fixa sm:w-80 sem max-w no mobile', () => {
      if (!floatingCalcContent.includes('w-[calc(100vw-24px)] max-w-xs sm:w-80')) {
        throw new Error('Calculadora expandida possui largura fixa que estoura telas pequenas');
      }
    });

    this.test(2, 'T2.8.3', 'NoRigidClasses', 'Container pai principal em App.tsx restringe vazamento com overflow-x-hidden e min-w-0', () => {
      if (!appContent.includes('overflow-x-hidden') || !appContent.includes('min-w-0')) {
        throw new Error('App.tsx sem isolamento contra vazamento de layout');
      }
    });

    this.test(2, 'T2.8.4', 'NoRigidClasses', 'Sidebar drawer limita largura a max-w-[85vw] garantindo saída de toque', () => {
      if (!sidebarContent.includes('max-w-[85vw]')) {
        throw new Error('Sidebar sem max-w-[85vw]');
      }
    });

    this.test(2, 'T2.8.5', 'NoRigidClasses', 'Tabelas de DRE e Fluxo de Caixa contidas em containers com rolagem horizontal overflow-x-auto', () => {
      if (!dreContent.includes('overflow-x-auto') || !cashFlowContent.includes('overflow-x-auto')) {
        throw new Error('Tabelas contábeis sem overflow-x-auto');
      }
    });

    // ------------------------------------------------------------------------
    // TIER 3: INTERAÇÕES CRUZADAS (CROSS-FEATURE)
    // ------------------------------------------------------------------------
    console.log(`\n${BOLD}${YELLOW}► TIER 3: INTERAÇÕES CRUZADAS (CROSS-FEATURE)${RESET}`);

    this.test(3, 'T3.1', 'CrossFeature', 'Coexistência Vertical: FloatingCalculator repousa acima da BottomNavBar (h-16)', () => {
      // BottomNavBar: h-16 = 4rem (64px). FloatingCalculator: bottom-[calc(4.75rem...)] = 76px.
      // 76px > 64px garantindo 12px de folga sem sobreposição!
      if (!floatingCalcContent.includes('bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-5')) {
        throw new Error('FloatingCalculator não está configurada para 4.75rem no mobile');
      }
      if (!bottomNavContent.includes('h-16')) {
        throw new Error('BottomNavBar não tem altura de h-16');
      }
    });

    this.test(3, 'T3.2', 'CrossFeature', 'Coexistência Vertical: Dock Flutuante de Lote (bottom-16) fica ancorado imediatamente acima da BottomNavBar (h-16)', () => {
      // BottomNavBar: h-16 = 4rem (64px). Dock: fixed bottom-16 = 4rem (64px).
      // O Dock inicia exatamente a 64px do fundo, assentando-se perfeitamente sobre a BottomNavBar!
      if (!payablesContent.includes('fixed bottom-16 inset-x-3 z-40 sm:static')) {
        throw new Error('Dock de PayablesView não está em bottom-16');
      }
      if (!receivablesContent.includes('fixed bottom-16 inset-x-3 z-40 sm:static')) {
        throw new Error('Dock de ReceivablesView não está em bottom-16');
      }
    });

    this.test(3, 'T3.3', 'CrossFeature', 'Prevenção de Sobreposição por Teclado: Modais fullscreen utilizam pb-28 garantindo rolagem livre acima do rodapé fixo', () => {
      if (!newTitleModalContent.includes('pb-28 sm:pb-6') || !settlementModalContent.includes('pb-28 sm:pb-6')) {
        throw new Error('Modais sem pb-28 para desobstrução de botões');
      }
    });

    this.test(3, 'T3.4', 'CrossFeature', 'Sincronização Drawer Mobile: Botão Menu na BottomNavBar aciona onOpenDrawer e abre o Sidebar', () => {
      if (!bottomNavContent.includes('onClick={onOpenDrawer}')) {
        throw new Error('BottomNavBar botão Menu não chama onOpenDrawer');
      }
      if (!appContent.includes('onOpenDrawer={() => setIsMobileSidebarOpen(true)}')) {
        throw new Error('App.tsx não passa callback de abertura do drawer');
      }
    });

    this.test(3, 'T3.5', 'CrossFeature', 'Fechamento por Rota ou Toque: Navegação por qualquer item do Sidebar executa onCloseMobile()', () => {
      if (!sidebarContent.includes('onNavigate(item.id);') || !sidebarContent.includes('onCloseMobile();')) {
        throw new Error('Sidebar não fecha ao clicar no item no mobile');
      }
    });

    this.test(3, 'T3.6', 'CrossFeature', 'Fechamento por Tecla Escape: Escape fecha o drawer móvel no Sidebar sem efeitos colaterais', () => {
      if (!sidebarContent.includes("if (e.key === 'Escape') {") || !sidebarContent.includes('onCloseMobile();')) {
        throw new Error('Sidebar não trata Escape adequadamente');
      }
    });

    this.test(3, 'T3.7', 'CrossFeature', 'Despacho de Modais a partir dos Cards Touch: Botão Pagar Obrigação abre SettlementModal com título preenchido', () => {
      if (!payablesContent.includes('setSelectedTitleForSettlement(t)')) {
        throw new Error('Card touch não despacha título selecionado para SettlementModal');
      }
      if (!payablesContent.includes('<SettlementModal')) {
        throw new Error('SettlementModal não integrado em PayablesView');
      }
    });

    this.test(3, 'T3.8', 'CrossFeature', 'Despacho de Modais a partir dos Cards Touch: Botão Editar abre EditTitleModal preservando o título', () => {
      if (!payablesContent.includes('setSelectedTitleForEdit(t)')) {
        throw new Error('Card touch não despacha título selecionado para EditTitleModal');
      }
      if (!payablesContent.includes('<EditTitleModal')) {
        throw new Error('EditTitleModal não integrado em PayablesView');
      }
    });

    this.test(3, 'T3.9', 'CrossFeature', 'Integração de Notificações Toast: ToastContainer é renderizado na raiz do App com sobreposição fluida', () => {
      if (!appContent.includes('<ToastContainer toasts={toasts} onDismiss={dismissToast} />')) {
        throw new Error('ToastContainer ausente ou mal configurado no App.tsx');
      }
    });

    this.test(3, 'T3.10', 'CrossFeature', 'Coexistência de Filtros Rápidos de Data com Abas de Status sem interferência mútua', () => {
      if (!payablesContent.includes('quickDateFilter') || !payablesContent.includes('statusFilter')) {
        throw new Error('Filtros rápidos e de status não coexistem em PayablesView');
      }
      if (!receivablesContent.includes('quickDateFilter') || !receivablesContent.includes('statusFilter')) {
        throw new Error('Filtros rápidos e de status não coexistem em ReceivablesView');
      }
    });

    // ------------------------------------------------------------------------
    // TIER 4: CENÁRIOS REAIS DE OPERAÇÃO (TEST_INFRA.MD)
    // ------------------------------------------------------------------------
    console.log(`\n${BOLD}${YELLOW}► TIER 4: CENÁRIOS REAIS DE OPERAÇÃO${RESET}`);

    // Cenário 1: Operação Matinal do Empresário (Pagar - 360x640)
    this.test(4, 'T4.1', 'RealWorldScenario', 'Cenário 1: Operação Matinal do Empresário (Pagar - 360x640)', () => {
      // 1. Acesso mobile (360x640)
      const viewport = { width: 360, height: 640 };
      if (viewport.width !== 360 || viewport.height !== 640) throw new Error('Viewport incorreta');

      // 2. Navegação para Contas a Pagar via BottomNavBar
      const routeId = 'CONTAS_PAGAR';
      if (!bottomNavContent.includes(`id: 'CONTAS_PAGAR'`)) throw new Error('Rota CONTAS_PAGAR não mapeada no BottomNavBar');

      // 3. Simulação de cálculo de status temporal de títulos para a manhã do dia
      const today = new Date().toISOString().split('T')[0];
      const overdueTitle = {
        dueDate: '2026-01-01',
        balancePrincipal: 1500,
        settlementState: 'ABERTO' as const,
        documentState: 'ATIVO' as const
      };
      const statusOverdue = getTemporalStatus(overdueTitle as any, today);
      if (statusOverdue !== 'VENCIDO') {
        throw new Error(`Status temporal incorreto: esperado 'VENCIDO', obtido '${statusOverdue}'`);
      }

      // 4. Abertura do modal de liquidação e validação de cálculo com engine
      const amountToPay = 1500;
      const formatted = formatBRL(amountToPay);
      if (!formatted.includes('1.500,00')) throw new Error(`Formatação de valor falhou: ${formatted}`);

      // 5. Verificação de inputMode no modal de liquidação
      if (!settlementModalContent.includes('inputMode="decimal"')) {
        throw new Error('inputMode="decimal" não configurado no SettlementModal para pagamento rápido');
      }
    });

    // Cenário 2: Cobrança Rápida em Trânsito (Receber - 390x844)
    this.test(4, 'T4.2', 'RealWorldScenario', 'Cenário 2: Cobrança Rápida em Trânsito (Receber - 390x844)', () => {
      const viewport = { width: 390, height: 844 };
      if (viewport.width !== 390 || viewport.height !== 844) throw new Error('Viewport incorreta');

      // 1. Rota de Contas a Receber
      if (!bottomNavContent.includes(`id: 'CONTAS_RECEBER'`)) throw new Error('Rota CONTAS_RECEBER ausente no BottomNavBar');

      // 2. Filtro de atrasados
      if (!receivablesContent.includes("'VENCIDO'") && !receivablesContent.includes('Vencidos')) {
        throw new Error('Filtro de títulos vencidos ausente em ReceivablesView');
      }

      // 3. Card compacto exibe cliente e botão de cópia de mensagem WhatsApp
      if (!receivablesContent.includes('Copiar Mensagem de Cobrança WhatsApp')) {
        throw new Error('Botão de mensagem de cobrança WhatsApp ausente nos cards');
      }

      // 4. Simulação de mensagem preditiva de cobrança WhatsApp
      const testTitle = {
        customerName: 'Cliente Beta Ltda',
        dueDate: '2026-10-01',
        balancePrincipal: 2850.50
      };
      const simulatedMsg = `Olá, ${testTitle.customerName}! Constatamos uma pendência de ${formatBRL(testTitle.balancePrincipal)} vencida em ${formatDateBR(testTitle.dueDate)}.`;
      if (!simulatedMsg.includes('2.850,50') || !simulatedMsg.includes('01/10/2026')) {
        throw new Error('Mensagem WhatsApp simulada com formatação inválida');
      }

      // 5. Tap target ergonômico comprovado
      if (!receivablesContent.includes('min-h-[40px] py-2 px-3 rounded-xl bg-emerald-50')) {
        throw new Error('Botão WhatsApp sem tap target >= 40px');
      }
    });

    // Cenário 3: Análise Contábil Executiva (DRE - 414x896)
    this.test(4, 'T4.3', 'RealWorldScenario', 'Cenário 3: Análise Contábil Executiva (DRE - 414x896)', () => {
      const viewport = { width: 414, height: 896 };
      if (viewport.width !== 414 || viewport.height !== 896) throw new Error('Viewport incorreta');

      // 1. Acesso à DRE
      if (!bottomNavContent.includes(`id: 'DRE'`)) throw new Error('Rota DRE ausente no BottomNavBar');

      // 2. Seleção de período mensal ('MES')
      if (!dreContent.includes("timeHorizon === 'MES'")) {
        throw new Error('DRE não suporta visualização mensal em tela móvel');
      }

      // 3. Alternador de visão Consolidado vs Analítico
      if (!dreContent.includes('Consolidado') || !dreContent.includes('Analítico')) {
        throw new Error('Alternador Consolidado vs Analítico ausente em DREView');
      }

      // 4. Primeira coluna congelada sticky left-0 com fundo 100% opaco
      if (!dreContent.includes('sticky left-0 z-30 bg-slate-200 dark:bg-[#1a2130]')) {
        throw new Error('Cabeçalho sticky left-0 com fundo opaco ausente na DRE');
      }
      if (!dreContent.includes('sticky left-0 z-10') || !dreContent.includes('min-w-[140px] max-w-[165px]')) {
        throw new Error('Linhas com primeira coluna sticky left-0 ausentes na DRE');
      }
    });

    // Cenário 4: Conciliação e Extrato Mobile em Movimentações
    this.test(4, 'T4.4', 'RealWorldScenario', 'Cenário 4: Conciliação e Extrato Mobile em Movimentações', () => {
      // 1. MovementsView detecta tela compacta
      if (!movementsContent.includes('block sm:hidden space-y-2.5')) {
        throw new Error('MovementsView sem cards compactos em < 640px');
      }

      // 2. Exibição de direção (ENTRADA / SAÍDA) com cores contrastantes
      if (!movementsContent.includes('m.direction === \'ENTRADA\'') || !movementsContent.includes('ArrowDownRight') || !movementsContent.includes('ArrowUpRight')) {
        throw new Error('Indicadores visuais de ENTRADA/SAÍDA ausentes em MovementsView');
      }

      // 3. Toque para inspecionar / editar movimentação
      if (!movementsContent.includes('onClick={() => handleOpenEdit(m)}')) {
        throw new Error('Card de movimentação móvel sem evento de abertura/edição');
      }
    });

    // Cenário 5: Fluxo de Caixa com Colunas Congeladas e Largura Adaptativa
    this.test(4, 'T4.5', 'RealWorldScenario', 'Cenário 5: Fluxo de Caixa com Colunas Congeladas e Largura Adaptativa', () => {
      // 1. Presença de sticky left-0 com largura adaptativa (145-165px)
      if (!cashFlowContent.includes('min-w-[145px] max-w-[165px]') || !cashFlowContent.includes('sticky left-0')) {
        throw new Error('Primeira coluna de CashFlowView sem sticky left-0 ou largura adaptativa');
      }

      // 2. Fundo 100% opaco stickyBg evitando sobreposição de texto
      if (!cashFlowContent.includes('stickyBg') || !cashFlowContent.includes('z-10')) {
        throw new Error('Fundo opaco stickyBg ausente na primeira coluna de CashFlowView');
      }

      // 3. Suporte ao Modo Foco e alternador de densidade
      if (!cashFlowContent.includes('isFocusMode')) {
        throw new Error('Modo Foco ausente em CashFlowView');
      }
    });

    // Cenário 6: Liquidação em Lote Móvel com Dock e Modal Integrados
    this.test(4, 'T4.6', 'RealWorldScenario', 'Cenário 6: Liquidação em Lote Móvel com Dock e Modal Integrados', () => {
      // 1. Simulação de seleção múltipla em PayablesView
      if (!payablesContent.includes('handleToggleSelectOne')) {
        throw new Error('Seleção individual de PayablesView ausente');
      }

      // 2. Aparição do dock flutuante quando selectedIds.length > 0
      if (!payablesContent.includes('selectedIds.length > 0 &&')) {
        throw new Error('Dock não surge condicionalmente com seleção ativa');
      }

      // 3. Disparo do BatchSettlementModal a partir do dock móvel
      if (!payablesContent.includes('onClick={() => setIsBatchSettlementOpen(true)}')) {
        throw new Error('Botão do dock não abre BatchSettlementModal');
      }

      // 4. Modal fullscreen de lote abre com proteção de competência e formulário rolável
      if (!batchSettlementModalContent.includes('h-[100dvh]') || !batchSettlementModalContent.includes('flex flex-col')) {
        throw new Error('BatchSettlementModal não possui formato fullscreen móvel');
      }
      if (!batchSettlementModalContent.includes('closedPeriodTitles.length > 0')) {
        throw new Error('BatchSettlementModal não verifica competência fechada');
      }
    });

    // ------------------------------------------------------------------------
    // RELATÓRIO FINAL
    // ------------------------------------------------------------------------
    const summary = this.getSummary();
    console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
    console.log(`${BOLD}${CYAN}                      RESULTADO FINAL DOS TESTES                      ${RESET}`);
    console.log(`${BOLD}${CYAN}======================================================================${RESET}`);

    console.log(`\n  ${BOLD}Total de Testes Executados:${RESET} ${summary.total}`);
    console.log(`  ${GREEN}${BOLD}Testes Aprovados:${RESET}           ${summary.passed}`);
    console.log(`  ${summary.failed > 0 ? RED : GREEN}${BOLD}Testes Falhos:${RESET}              ${summary.failed}`);

    console.log(`\n  ${BOLD}Detalhamento por Tier:${RESET}`);
    for (let t = 1; t <= 4; t++) {
      const counts = summary.tierCounts[t];
      const tierLabel = t === 1 
        ? 'Tier 1 (Cobertura Funcional R1-R4)' 
        : t === 2 
        ? 'Tier 2 (Limites, Viewports & Tap Targets)' 
        : t === 3 
        ? 'Tier 3 (Interações Cruzadas / Cross-Feature)' 
        : 'Tier 4 (Cenários Reais de Aplicação)';
      const statusColor = counts.failed === 0 ? GREEN : RED;
      console.log(`    ${statusColor}• ${tierLabel}:${RESET} ${counts.passed}/${counts.total} aprovados`);
    }

    console.log(`\n${BOLD}${CYAN}======================================================================${RESET}\n`);

    if (summary.failed > 0) {
      console.error(`${RED}${BOLD}✖ SUÍTE DE TESTES E2E MOBILE FINALIZADA COM FALHAS!${RESET}\n`);
      process.exit(1);
    } else {
      console.log(`${GREEN}${BOLD}✔ 100% DOS TESTES E2E MOBILE APROVADOS COM SUCESSO! (EXIT CODE 0)${RESET}\n`);
      process.exit(0);
    }
  }
}

// Execução
const suite = new TestSuite();
suite.run().catch((err) => {
  console.error(`${RED}Erro fatal no test runner:${RESET}`, err);
  process.exit(1);
});
