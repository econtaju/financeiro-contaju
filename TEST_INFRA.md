# E2E Test Infra: Contaju Gestão Financeira Mobile

## Test Philosophy
- Opaque-box, requirement-driven: Validar os critérios de aceitação de ORIGINAL_REQUEST.md sob diferentes viewports móveis (320px, 360px, 390px, 414px).
- Critérios centrais: ausência de scroll horizontal (`document.documentElement.scrollWidth <= window.innerWidth`), tap targets confortáveis (>= 40px), integridade dos fluxos operacionais, 0 erros em `npm run build` e `npx tsc --noEmit`.

## Feature Inventory & Test Coverage
| # | Feature | Requisito | Tier 1 (Funcional) | Tier 2 (Limites/Viewports) | Tier 3 (Cross-Feature) | Tier 4 (Cenários Reais) |
|---|---------|-----------|:------------------:|:--------------------------:|:----------------------:|:-----------------------:|
| 1 | Bottom Navigation Bar | R1 | 5 testes | 5 testes (320px, 360px, 390px, 414px, rotação) | ✓ | ✓ |
| 2 | Drawer Mobile Fluido | R1 | 5 testes | 5 testes | ✓ | ✓ |
| 3 | Layout & Header Mobile | R1 | 5 testes | 5 testes | ✓ | ✓ |
| 4 | Cards Pagar & Receber | R2 | 5 testes | 5 testes | ✓ | ✓ |
| 5 | Seleção em Lote Mobile | R2 | 5 testes | 5 testes | ✓ | ✓ |
| 6 | Modais Fullscreen Mobile | R3 | 5 testes | 5 testes | ✓ | ✓ |
| 7 | Teclado & `inputMode` | R3 | 5 testes | 5 testes | ✓ | ✓ |
| 8 | DRE & Fluxo de Caixa Mobile | R4 | 5 testes | 5 testes | ✓ | ✓ |

## Test Architecture
- Framework: Script automatizado de verificação de integridade estática e estrutural com validação de build e regras de conformidade CSS/DOM.
- Validação de Build: `npm run build` e `npx tsc --noEmit`.
- Inspeção de Layout: Garantir ausência de classes que quebrem largura e presença de classes de adaptação responsiva.

## Real-World Application Scenarios (Tier 4)
1. **Operação Matinal do Empresário:** Abrir o celular (360x640), visualizar Dashboard, tocar em "Pagar" na barra inferior, conferir contas vencidas nos cards fechados, abrir modal de baixa, quitar conta com teclado numérico.
2. **Cobrança Rápida em Trânsito:** Acessar "Receber" no iPhone (390x844), filtrar títulos atrasados, acionar cobrança via WhatsApp a partir do card touch compacto.
3. **Análise Contábil Executiva:** Abrir DRE Gerencial no celular (414x896), selecionar visão mensal, alternar para modo consolidado, rolar horizontalmente a tabela mantendo as contas congeladas na 1ª coluna sem perda de contexto.
