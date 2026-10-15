import { ReconciliationRule } from '../types';

export const INITIAL_RECONCILIATION_RULES: ReconciliationRule[] = [
  {
    id: 'rule-unimed',
    name: 'Unimed - Plano de Saúde',
    pattern: 'UNIMED',
    matchType: 'CONTAINS',
    transactionType: 'DEBIT',
    chartAccountId: 'acc-3.1.04', // Benefícios
    action: 'AUTO_SUGGEST',
    active: true,
    priority: 1,
    descriptionTemplate: 'Pagamento de Convênio Médico Unimed',
    tags: ['Saúde', 'Benefícios'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  },
  {
    id: 'rule-vr-beneficios',
    name: 'VR Benefícios - Vale Alimentação/Refeição',
    pattern: 'VR BENEFICIOS',
    matchType: 'CONTAINS',
    transactionType: 'DEBIT',
    chartAccountId: 'acc-3.1.04', // Benefícios
    action: 'AUTO_SUGGEST',
    active: true,
    priority: 2,
    descriptionTemplate: 'Recarga Vale Alimentação / Refeição VR',
    tags: ['Benefícios', 'Alimentação'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  },
  {
    id: 'rule-thomson-reuters',
    name: 'Thomson Reuters - Sistemas e Softwares',
    pattern: 'THOMSON REUTERS',
    matchType: 'CONTAINS',
    transactionType: 'DEBIT',
    chartAccountId: 'acc-3.2.06', // Sistemas e Softwares
    action: 'AUTO_SUGGEST',
    active: true,
    priority: 3,
    descriptionTemplate: 'Licença de Software Thomson Reuters Domínio',
    tags: ['TI', 'Softwares'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  },
  {
    id: 'rule-a10-tech',
    name: 'A10 Tecnologia - Soluções em Nuvem',
    pattern: 'A10 TECNOLOGIA',
    matchType: 'CONTAINS',
    transactionType: 'DEBIT',
    chartAccountId: 'acc-3.2.06', // Sistemas e Softwares
    action: 'AUTO_SUGGEST',
    active: true,
    priority: 4,
    descriptionTemplate: 'Serviços de Tecnologia e Nuvem A10',
    tags: ['TI', 'Sistemas'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  },
  {
    id: 'rule-gob-solucoes',
    name: 'GOB Soluções - Tecnologia e Suporte',
    pattern: 'GOB SOLUCOES',
    matchType: 'CONTAINS',
    transactionType: 'DEBIT',
    chartAccountId: 'acc-3.2.06', // Sistemas e Softwares
    action: 'AUTO_SUGGEST',
    active: true,
    priority: 5,
    descriptionTemplate: 'Manutenção e Suporte TI GOB Soluções',
    tags: ['TI', 'Softwares'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  },
  {
    id: 'rule-iturama-limpeza',
    name: 'Iturama Limpeza - Conservação do Escritório',
    pattern: 'ITURAMA LIMPEZA',
    matchType: 'CONTAINS',
    transactionType: 'DEBIT',
    chartAccountId: 'acc-3.4.01', // Limpeza e Conservação
    action: 'AUTO_SUGGEST',
    active: true,
    priority: 6,
    descriptionTemplate: 'Materiais e Produtos de Limpeza e Conservação',
    tags: ['Limpeza', 'Escritório'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  },
  {
    id: 'rule-prefeitura',
    name: 'Prefeitura Municipal - Taxas e Tributos',
    pattern: 'PREFEITURA MUNICIPAL',
    matchType: 'CONTAINS',
    transactionType: 'DEBIT',
    chartAccountId: 'acc-3.4.02', // Taxas e Despesas Diversas
    action: 'AUTO_SUGGEST',
    active: true,
    priority: 7,
    descriptionTemplate: 'Taxas e Licenças Municipais',
    tags: ['Tributos', 'Prefeitura'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  },
  {
    id: 'rule-contaju-rec',
    name: 'Escritório ContaJu - Receita de Serviços',
    pattern: 'ESCRITORIO CONTAJU',
    matchType: 'CONTAINS',
    transactionType: 'CREDIT',
    chartAccountId: 'acc-1.1.01', // Honorários Contábeis
    action: 'AUTO_SUGGEST',
    active: true,
    priority: 8,
    descriptionTemplate: 'Recebimento de Honorários Contábeis ContaJu',
    tags: ['Receita', 'Honorários'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  },
  {
    id: 'rule-bom-bife-rec',
    name: 'Bom Bife - Gestão BPO Financeiro',
    pattern: 'BOM BIFE',
    matchType: 'CONTAINS',
    transactionType: 'CREDIT',
    chartAccountId: 'acc-1.1.03', // BPO Financeiro
    action: 'AUTO_SUGGEST',
    active: true,
    priority: 9,
    descriptionTemplate: 'Recebimento de Serviços BPO Financeiro Bom Bife',
    tags: ['Receita', 'BPO'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  },
  {
    id: 'rule-top-car-rec',
    name: 'Top Car Iturama - Serviços Contábeis',
    pattern: 'TOP CAR',
    matchType: 'CONTAINS',
    transactionType: 'CREDIT',
    chartAccountId: 'acc-1.1.01', // Honorários Contábeis
    action: 'AUTO_SUGGEST',
    active: true,
    priority: 10,
    descriptionTemplate: 'Recebimento de Serviços Contábeis Top Car',
    tags: ['Receita', 'Serviços'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  },
  {
    id: 'rule-triaminas-rec',
    name: 'Triaminas Seguros - Assessoria Contábil',
    pattern: 'TRIAMINAS',
    matchType: 'CONTAINS',
    transactionType: 'CREDIT',
    chartAccountId: 'acc-1.1.01', // Honorários Contábeis
    action: 'AUTO_SUGGEST',
    active: true,
    priority: 11,
    descriptionTemplate: 'Recebimento de Serviços Contábeis Triaminas',
    tags: ['Receita', 'Serviços'],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z'
  }
];
