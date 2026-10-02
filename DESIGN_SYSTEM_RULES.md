# REGRA UNIVERSAL DE DESIGN SYSTEM: SISTEMA FINANCEIRO CONTAJU

> **DOCUMENTO OFICIAL DE DIRETRIZES VISUAIS E ACESSIBILIDADE**
> Versão: 1.0.0
> Data: Outubro/2026
> Status: ATIVO E MANDATÓRIO PARA TODAS AS ABAS E COMPONENTES

---

## 1. PALETA DE CORES INSTITUCIONAL PERMITIDA

O sistema adota estritamente quatro cores base institucionais, complementadas exclusivamente por Verde e Vermelho para operações de natureza financeira:

| Cor Base | Uso Obrigatório | Aplicações |
| :--- | :--- | :--- |
| **PRETO / GRAFITE** | Superfícies estruturais escuras, fundos de cards no modo escuro, texto principal no modo claro. | Fundos (`#0B0E14`), Cards (`#121620`), Elevações (`#19202D`), Textos claros (`#0F172A`). |
| **CINZA (Escala Neutra)** | Bordas, divisores, textos de apoio e estruturas tabulares. | Bordas sutis (`#242D3D`), Bordas ativas (`#3A475C`), Textos secundários (`#CBD5E1` no dark, `#334155` no light). |
| **DOURADO / OURO (Leão)** | Ações primárias, foco, destaques da marca e estados ativos. | Botões principais (`#D4AF37`), Alertas (`#F59E0B`), Destaques luminosos (`#FDE68A`). |
| **BRANCO** | Fundos no modo claro e tipografia de alto contraste no modo escuro. | Cards no Light Mode (`#FFFFFF`), Textos no Dark Mode (`#F8FAFC` / `#FFFFFF`). |

### ⚠️ Cores Estritamente Proibidas na Interface Geral:
- **PROIBIDO:** Tons de Roxo (`indigo`, `purple`, `violet`) em botões, cabeçalhos ou badges genéricos.
- **PROIBIDO:** Tons de Azul (`blue`, `sky`, `cyan`) para ações ou cartões genéricos.
- Toda ação primária do sistema pertence à família **Dourado** ou **Preto/Grafite Nobre**.

---

## 2. EXCLUSIVIDADE FINANCEIRA: VERDE E VERMELHO

As cores Verde e Vermelho são **EXCLUSIVAS** para a semântica financeira de entrada e saída:

- **VERDE (`#10B981` / `#047857` / `#A7F3D0`):**
  - Contas a Receber
  - Entradas de Caixa
  - Faturamento e Receitas
  - Lucro Líquido Positivo / Superávit
  - Baixas Realizadas com Sucesso

- **VERMELHO (`#EF4444` / `#B91C1C` / `#FECDD3`):**
  - Contas a Pagar
  - Saídas de Caixa
  - Despesas e Custos
  - Títulos Vencidos / Em Atraso
  - Déficit / Prejuízo

---

## 3. REGRA ABSOLUTA DE CONTRASTE (WCAG AAA)

É estritamente proibido qualquer meio-tom que prejudique a leitura:

1. **FUNDO PRETO / ESCURO => LETRA CLARA OBRIGATÓRIA:**
   - Títulos e Números: Branco Puro (`#FFFFFF` / `#F8FAFC`) ou Dourado Luminoso (`#FDE68A`).
   - Textos de Apoio: Cinza Claro Nítido (`#E2E8F0` / `#CBD5E1`).
   - *Nunca utilizar tons escuros (`#334155`, `#1E293B`) sobre superfícies pretas.*

2. **FUNDO CLARO / BRANCO => LETRA ESCURA OBRIGATÓRIA:**
   - Títulos e Números: Preto / Chumbo Profundo (`#0F172A` / `#000000`).
   - Textos de Apoio: Chumbo Escuro Legível (`#334155` / `#475569`).
   - *Nunca utilizar tons pastéis ou cinza clarinho sobre superfícies brancas.*

3. **BOTÕES OU BADGES COM FUNDO DOURADO/AMARELO:**
   - Como o fundo dourado (`#D4AF37`, `#FBBF24`) é luminoso, o texto interno DEVE ser **PRETO/ESCURO (`#0B0E14`) com peso bold**.
   - Jamais colocar texto branco sobre fundo amarelo/ouro.
