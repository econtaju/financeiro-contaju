# Project: Contaju Gestão Financeira — Mobile Responsiveness (320px–430px)

## Architecture
- **Framework & Ferramentas:** React 19, TypeScript 5.8, Tailwind CSS v4 (@tailwindcss/vite), Vite 6.4, Lucide React.
- **Topologia de Layout:** 
  - Desktop: Sidebar lateral colapsável + Header superior + Main content + FloatingCalculator.
  - Mobile (< 1024px / < 640px): Header compacto + Drawer fluido com backdrop + Main content com padding inferior (`pb-20`) + Bottom Navigation Bar fixa (`fixed bottom-0 left-0 right-0 z-40`) + FloatingCalculator ajustada (`bottom-[calc(4.75rem+env(safe-area-inset-bottom))]`).
- **Padrão de Modais Mobile:** Modais Fullscreen Mobile (`h-[100dvh] w-full sm:h-auto sm:max-h-[92vh] sm:rounded-2xl rounded-none flex flex-col`) com cabeçalho fixo (`shrink-0`), corpo rolável (`flex-1 overflow-y-auto pb-28 sm:pb-6`) e rodapé de ações fixo (`sticky bottom-0 z-10 shrink-0`).
- **Padrão de Tabelas Contábeis Mobile:** Tabelas de DRE e Fluxo de Caixa com suporte a visão mensal (`timeHorizon: 'MES'`), modo compacto Consolidado vs Analítico, primeira coluna congelada (`sticky left-0 z-30` no `th` e `z-10` no `td`) com fundo 100% opaco e largura adaptativa (`min-w-[140px] max-w-[165px] sm:min-w-[240px]`).

---

## Feature Inventory
Todas as features identificadas no Survey com seus respectivos milestones:

| # | Feature | Descrição Técnica | Milestone | Source |
|---|---------|-------------------|-----------|--------|
| F1 | Bottom Navigation Bar | Barra inferior fixa no mobile com 5 rotas (Dashboard, Pagar, Receber, DRE, Mais/Menu). | M1 | Survey 1 (R1) |
| F2 | Drawer Mobile Fluido | Desacoplar `isMinimized` desktop do drawer mobile; travar scroll do body com `isOpenMobile`; fechar ao tocar no backdrop/Escape. | M1 | Survey 1 (R1) |
| F3 | Layout Raiz & Header Mobile | Padding inferior no `<main>` (`pb-20 lg:pb-5`); ajustar densidade do Header em 320px–390px; reposicionar FloatingCalculator. | M1 | Survey 1 (R1) |
| F4 | Utilitários Globais CSS & Viewport | Declarar `@utility scrollbar-none`; tap targets globais >= 40px; meta viewport com `interactive-widget=resizes-content, viewport-fit=cover`. | M1 | Survey 1 & 2 (R1) |
| F5 | Cards Touch Compactos Contas a Pagar | Cards fechados com status temporal imediato (Vencido, Vence Hoje, Em dia), fornecedor em destaque, vencimento e valor; tap targets >= 40px em checkboxes e botões de ação. | M2 | Survey 2 (R2) |
| F6 | Cards Touch Compactos Contas a Receber | Cards fechados com status temporal imediato, cliente em destaque, vencimento e valor; tap targets >= 40px em checkboxes, botões de ação e WhatsApp; widget preditivo colapsável. | M2 | Survey 2 (R2) |
| F7 | Filtros Rápidos com Scroll Suave | Abas de status e chips rápidos de data (`quickDateFilter`) com rolagem suave horizontal `scrollbar-none`. | M2 | Survey 2 (R2) |
| F8 | Dock Flutuante de Seleção em Lote | Barra de ações em lote flutuante fixa no rodapé mobile (`fixed bottom-16 inset-x-3 z-40 sm:static`), com ação principal destacada e ações secundárias em carrossel horizontal. | M2 | Survey 2 (R2) |
| F9 | Cards Compactos de Movimentações | Adaptação alternativa em cards para extrato em telas < 640px em `MovementsView.tsx`. | M2 | Survey 2 (R2) |
| F10 | Shell Fullscreen Mobile para Modais | `NewTitleModal`, `SettlementModal`, `EditTitleModal`, `BoletoBatchSettlementModal`, `BatchSettlementModal` com tela cheia no mobile, cabeçalho fixo, botão X >= 40px e rodapé fixo. | M3 | Survey 2 (R3) |
| F11 | Prevenção de Teclado & `inputMode` | `inputMode="decimal"` em campos monetários/decimais; `inputMode="numeric"` em contadores inteiros; `pb-28` e `scroll-padding-bottom` contra teclado virtual; inputs com fonte >= 14px/16px. | M3 | Survey 2 (R3) |
| F12 | DRE Gerencial Otimizada para Celular | Seleção de período mensal (`timeHorizon: 'MES'`); alternador Consolidado vs Analítico; primeira coluna `sticky left-0` incondicional com fundo 100% opaco e largura adaptativa. | M4 | Survey 3 (R4) |
| F13 | Fluxo de Caixa Otimizado para Celular | Primeira coluna adaptada (`min-w-[145px] max-w-[165px]`); fundos `stickyBg` 100% opacos sem vazamento de números; alternador de visão Consolidada vs Analítica. | M4 | Survey 3 (R4) |
| F14 | Colunas Congeladas em Relatórios | Adicionar `sticky left-0` com background opaco nas tabelas de pré-visualização contábil de `ReportsView.tsx`. | M4 | Survey 3 (R4) |
| F15 | Suíte de Testes E2E Opaque-Box | Testes automatizados das 4 camadas (Tiers 1-4) validando layout mobile, ausência de overflow-x, tap targets >= 40px, formulários e relatórios. | M5 | E2E Track |
| F16 | Integridade & Validação de Build | 0 erros em `npm run build` e `npx tsc --noEmit`; validação de integridade por Forensic Auditor. | M5 | Acceptance Criteria |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Navegação & Layout Global | BottomNavBar, Sidebar drawer responsivo, Header mobile, FloatingCalculator, CSS utilitários (`scrollbar-none`, tap targets >= 40px, viewport). | none | DONE |
| M2 | Lançamentos & Ações Rápidas | Cards touch compactos e tap targets >= 40px em Pagar, Receber e Movimentações; filtros horizontais; dock flutuante de lote. | M1 | DONE |
| M3 | Modais Fullscreen & Teclado | Shell Fullscreen Mobile com cabeçalho e rodapé fixos em NewTitleModal, SettlementModal, EditTitleModal, modais em lote; `inputMode="decimal"`. | M1 | DONE |
| M4 | DRE & Relatórios Gerenciais | DREView com timeHorizon 'MES' e Consolidado/Analítico; CashFlowView com coluna adaptada e fundos opacos; ReportsView com sticky left-0. | M1 | DONE |
| M5 | Testes E2E, Auditoria & Final | Execução de testes E2E mobile, validação rigorosa com Reviewers, Challengers, Forensic Auditor e build com 0 erros. | M1, M2, M3, M4 | DONE |

---

## Interface Contracts

### M1 ↔ M2, M3, M4
- **CSS Utility:** `.scrollbar-none` definido em `src/index.css` utilizável livremente por todas as views.
- **Layout Margins:** `<main>` com classe `pb-20 lg:pb-5` garante espaço para `BottomNavBar` (`h-16 fixed bottom-0 z-40`).
- **Tap Target Contract:** Todo elemento interativo deve possuir área mínima de toque de 40x40px (`min-h-[40px] min-w-[40px]`).

### M2 ↔ M3
- **Modal Triggering:** Os cards touch em `PayablesView` e `ReceivablesView` disparam os modais `SettlementModal`, `EditTitleModal`, `NewTitleModal` passando as props existentes intactas sem alteração de tipos ou contratos de dados.

### M4 ↔ Motores de Cálculo
- **Cálculo Intacto:** Nenhuma função de `reportingEngine.ts`, `financialEngine.ts` ou `reconciliationEngine.ts` é modificada. Apenas a camada visual (`DREView.tsx`, `CashFlowView.tsx`, `ReportsView.tsx`) é adaptada.

---

## Code Layout
- `src/components/Common/BottomNavBar.tsx` (Novo componente de navegação inferior mobile)
- `src/components/Sidebar.tsx` (Menu gaveta / drawer)
- `src/components/Header.tsx` (Cabeçalho da aplicação)
- `src/App.tsx` (Casca raiz da aplicação)
- `src/index.css` (Estilos globais e utilitários Tailwind)
- `index.html` (Viewport meta tag)
- `src/components/Common/FloatingCalculator.tsx` (Calculadora flutuante)
- `src/components/Financial/PayablesView.tsx` (Contas a Pagar)
- `src/components/Financial/ReceivablesView.tsx` (Contas a Receber)
- `src/components/Financial/MovementsView.tsx` (Movimentações Financeiras)
- `src/components/Modals/NewTitleModal.tsx` (Modal de Novo Título)
- `src/components/Modals/SettlementModal.tsx` (Modal de Quitação/Baixa)
- `src/components/Modals/EditTitleModal.tsx` (Modal de Edição)
- `src/components/Modals/BatchSettlementModal.tsx` (Baixa em Lote)
- `src/components/Financial/BoletoBatchSettlementModal.tsx` (Leitor de Boletos em Lote)
- `src/components/Management/DREView.tsx` (DRE Gerencial)
- `src/components/Management/CashFlowView.tsx` (Fluxo de Caixa)
- `src/components/Management/ReportsView.tsx` (Relatórios Contábeis)
