import { AnnualBudgetPlan } from '../types';

export const INITIAL_BUDGET_PLANS: AnnualBudgetPlan[] = [
  {
    id: 'budget-2026',
    year: 2026,
    name: 'Orçamento Anual Operacional 2026',
    updatedAt: '2026-01-15T10:00:00.000Z',
    notes: 'Plano orçamentário aprovado para expansão da carteira de clientes BPO e consultoria tributária.',
    items: [
      // 1. Receitas de Serviços
      {
        accountId: 'acc-1.1.01', // Honorários Contábeis
        monthlyPlanned: [82000, 84000, 85000, 87000, 88000, 90000, 91000, 93000, 95000, 96000, 98000, 100000]
      },
      {
        accountId: 'acc-1.1.02', // Departamento Pessoal
        monthlyPlanned: [12000, 12000, 12500, 12500, 13000, 13000, 13500, 13500, 14000, 14000, 14500, 15000]
      },
      {
        accountId: 'acc-1.1.03', // BPO Financeiro
        monthlyPlanned: [16000, 17000, 18000, 19000, 20000, 21000, 22000, 23000, 24000, 25000, 26000, 27000]
      },
      {
        accountId: 'acc-1.1.04', // Consultoria
        monthlyPlanned: [6000, 7000, 8000, 8000, 9000, 9000, 10000, 10000, 11000, 11000, 12000, 12000]
      },
      {
        accountId: 'acc-1.1.05', // Abertura de Empresa
        monthlyPlanned: [4000, 4000, 5000, 5000, 4500, 4500, 5000, 5000, 5500, 5500, 6000, 6000]
      },
      {
        accountId: 'acc-1.1.06', // Alteração Contratual
        monthlyPlanned: [2500, 2500, 3000, 3000, 2500, 2500, 3000, 3000, 3500, 3500, 3500, 3500]
      },
      {
        accountId: 'acc-1.1.07', // Certificado Digital
        monthlyPlanned: [1800, 1800, 2000, 2000, 2200, 2200, 2200, 2200, 2500, 2500, 2500, 2500]
      },
      {
        accountId: 'acc-1.1.08', // Imposto de Renda
        monthlyPlanned: [0, 0, 12000, 28000, 15000, 0, 0, 0, 0, 0, 0, 0]
      },

      // 2. Deduções da Receita
      {
        accountId: 'acc-1.2.01', // Simples Nacional
        monthlyPlanned: [7500, 7800, 8200, 8800, 8600, 8900, 9100, 9400, 9700, 9900, 10200, 10500]
      },
      {
        accountId: 'acc-1.2.02', // ISSQN
        monthlyPlanned: [2200, 2300, 2400, 2600, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200]
      },

      // 3. Custos dos Serviços Prestados
      {
        accountId: 'acc-2.1.01', // Folha Operacional Contábil
        monthlyPlanned: [32000, 32000, 34000, 34000, 34000, 35000, 35000, 36000, 36000, 37000, 38000, 42000]
      },
      {
        accountId: 'acc-2.1.02', // Encargos Folha FGTS/INSS
        monthlyPlanned: [8800, 8800, 9400, 9400, 9400, 9700, 9700, 10000, 10000, 10200, 10500, 11800]
      },
      {
        accountId: 'acc-2.1.03', // Benefícios VR/VT/Plano
        monthlyPlanned: [5800, 5800, 6000, 6000, 6000, 6200, 6200, 6400, 6400, 6500, 6600, 6800]
      },
      {
        accountId: 'acc-2.1.05', // Sistemas e Softwares Contábeis
        monthlyPlanned: [4200, 4200, 4200, 4400, 4400, 4400, 4500, 4500, 4500, 4800, 4800, 4800]
      },

      // 4. Despesas Operacionais
      {
        accountId: 'acc-3.1.01', // Pró-Labore Sócios
        monthlyPlanned: [15000, 15000, 15000, 15000, 15000, 16000, 16000, 16000, 16000, 16000, 18000, 20000]
      },
      {
        accountId: 'acc-3.2.01', // Aluguel e Condomínio
        monthlyPlanned: [5500, 5500, 5500, 5500, 5500, 5500, 5800, 5800, 5800, 5800, 5800, 5800]
      },
      {
        accountId: 'acc-3.2.02', // Energia Elétrica e Água
        monthlyPlanned: [950, 950, 900, 850, 800, 800, 850, 900, 950, 1000, 1050, 1100]
      },
      {
        accountId: 'acc-3.2.03', // Internet e Telefonia
        monthlyPlanned: [650, 650, 650, 650, 650, 680, 680, 680, 680, 680, 680, 680]
      },
      {
        accountId: 'acc-3.2.04', // Material de Escritório e Copa
        monthlyPlanned: [450, 450, 500, 500, 450, 450, 500, 500, 550, 550, 600, 600]
      },
      {
        accountId: 'acc-3.2.06', // Softwares de Gestão e Nuvem
        monthlyPlanned: [1400, 1400, 1400, 1500, 1500, 1500, 1600, 1600, 1600, 1600, 1700, 1700]
      },
      {
        accountId: 'acc-3.3.01', // Marketing Digital e Tráfego
        monthlyPlanned: [3000, 3200, 3500, 3500, 3800, 4000, 4000, 4200, 4500, 4500, 5000, 5000]
      },

      // 5. Resultado Financeiro
      {
        accountId: 'acc-4.1.01', // Rendimento de Aplicações
        monthlyPlanned: [1200, 1250, 1300, 1350, 1400, 1450, 1500, 1550, 1600, 1650, 1700, 1800]
      },
      {
        accountId: 'acc-4.2.01', // Tarifas Bancárias e Boletos
        monthlyPlanned: [750, 750, 800, 800, 820, 850, 850, 880, 900, 900, 920, 950]
      },

      // 6. Tributos sobre Lucro
      {
        accountId: 'acc-5.1.01', // IRPJ / CSLL (se aplicável)
        monthlyPlanned: [2500, 2500, 2800, 3000, 3000, 3200, 3200, 3400, 3400, 3500, 3600, 3800]
      }
    ]
  },
  {
    id: 'budget-2025',
    year: 2025,
    name: 'Orçamento Consolidado 2025',
    updatedAt: '2025-01-10T10:00:00.000Z',
    notes: 'Orçamento do exercício anterior para comparação histórica.',
    items: [
      {
        accountId: 'acc-1.1.01',
        monthlyPlanned: new Array(12).fill(72000)
      },
      {
        accountId: 'acc-1.1.02',
        monthlyPlanned: new Array(12).fill(10500)
      },
      {
        accountId: 'acc-1.1.03',
        monthlyPlanned: new Array(12).fill(13000)
      },
      {
        accountId: 'acc-2.1.01',
        monthlyPlanned: new Array(12).fill(28000)
      },
      {
        accountId: 'acc-3.1.01',
        monthlyPlanned: new Array(12).fill(14000)
      }
    ]
  }
];
