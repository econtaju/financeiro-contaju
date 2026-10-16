import { CreditCard, CreditCardPurchase, CashCountRecord } from '../types';

export const INITIAL_CREDIT_CARDS: CreditCard[] = [
  {
    id: 'card-1',
    name: 'Nubank PJ Mastercard',
    institution: 'Nubank',
    brand: 'MASTERCARD',
    lastFourDigits: '4821',
    creditLimit: 20000.00,
    closingDay: 25,
    dueDay: 5,
    color: '#820ad1',
    defaultPaymentBankAccountId: 'bank-1', // Itaú PJ
    status: 'ATIVO',
    notes: 'Cartão corporativo para despesas recorrentes de TI, infraestrutura e assinaturas.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'card-2',
    name: 'Itaú Corporate Visa',
    institution: 'Itaú Unibanco',
    brand: 'VISA',
    lastFourDigits: '9152',
    creditLimit: 35000.00,
    closingDay: 18,
    dueDay: 28,
    color: '#ec7000',
    defaultPaymentBankAccountId: 'bank-1',
    status: 'ATIVO',
    notes: 'Cartão para viagens, marketing, eventos e aquisições corporativas de grande porte.',
    createdAt: '2026-01-01T00:00:00Z'
  }
];

export const INITIAL_CARD_PURCHASES: CreditCardPurchase[] = [
  // ==========================================
  // CARD 1: NUBANK PJ MASTERCARD
  // ==========================================
  {
    id: 'pur-1',
    cardId: 'card-1',
    purchaseDate: '2026-09-02',
    description: 'Assinatura Google Workspace & Servidores Cloud',
    counterpartyId: 'forn-3',
    counterpartyName: 'Google Cloud Brasil Internet Ltda',
    chartAccountId: 'acc-desp-1',
    totalAmount: 480.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 480.00,
    invoiceMonth: '2026-09',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 480.00,
        competence: '2026-09',
        dueDate: '2026-10-05',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Despesa fixa mensal de infraestrutura',
    createdAt: '2026-09-02T10:30:00Z'
  },
  {
    id: 'pur-2',
    cardId: 'card-1',
    purchaseDate: '2026-08-15',
    description: 'Notebook Dell Vostro - 3x Parcelado',
    counterpartyId: 'forn-6',
    counterpartyName: 'Dell Computadores do Brasil Ltda',
    chartAccountId: 'acc-desp-3',
    totalAmount: 4500.00,
    installmentsCount: 3,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 1500.00,
    invoiceMonth: '2026-08',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 1500.00,
        competence: '2026-08',
        dueDate: '2026-09-05',
        invoiceMonth: '2026-08',
        settled: true,
        settledAt: '2026-09-05'
      },
      {
        installmentNumber: 2,
        totalInstallments: 3,
        amount: 1500.00,
        competence: '2026-09',
        dueDate: '2026-10-05',
        invoiceMonth: '2026-09',
        settled: false
      },
      {
        installmentNumber: 3,
        totalInstallments: 3,
        amount: 1500.00,
        competence: '2026-10',
        dueDate: '2026-11-05',
        invoiceMonth: '2026-10',
        settled: false
      }
    ],
    notes: 'Equipamento para novo colaborador de controladoria',
    createdAt: '2026-08-15T14:20:00Z'
  },
  {
    id: 'pur-3',
    cardId: 'card-1',
    purchaseDate: '2026-09-03',
    description: 'OpenAI ChatGPT Plus & API Corporativa',
    counterpartyName: 'OpenAI Inc',
    chartAccountId: 'acc-desp-1',
    totalAmount: 130.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 130.00,
    invoiceMonth: '2026-09',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 130.00,
        competence: '2026-09',
        dueDate: '2026-10-05',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Ferramenta de automação e inteligência analítica',
    createdAt: '2026-09-03T11:00:00Z'
  },
  {
    id: 'pur-4',
    cardId: 'card-1',
    purchaseDate: '2026-09-08',
    description: 'Posto Shell - Abastecimento Frota e Visitas',
    counterpartyName: 'Auto Posto Shell Central',
    chartAccountId: 'acc-desp-5',
    totalAmount: 220.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 220.00,
    invoiceMonth: '2026-09',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 220.00,
        competence: '2026-09',
        dueDate: '2026-10-05',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Combustível para visita a clientes no interior',
    createdAt: '2026-09-08T09:15:00Z'
  },
  {
    id: 'pur-5',
    cardId: 'card-1',
    purchaseDate: '2026-09-12',
    description: 'iFood Refeição Equipe Fechamento Trimestral',
    counterpartyName: 'iFood Brasil',
    chartAccountId: 'acc-desp-2',
    totalAmount: 195.50,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 195.50,
    invoiceMonth: '2026-09',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 195.50,
        competence: '2026-09',
        dueDate: '2026-10-05',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Alimentação para equipe em hora extra no fechamento',
    createdAt: '2026-09-12T19:30:00Z'
  },
  {
    id: 'pur-6',
    cardId: 'card-1',
    purchaseDate: '2026-09-15',
    description: 'Licença Adobe Creative Cloud Team',
    counterpartyName: 'Adobe Systems Brasil',
    chartAccountId: 'acc-desp-1',
    totalAmount: 380.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 380.00,
    invoiceMonth: '2026-09',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 380.00,
        competence: '2026-09',
        dueDate: '2026-10-05',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Softwares de design para marketing e relatórios',
    createdAt: '2026-09-15T14:00:00Z'
  },
  {
    id: 'pur-7',
    cardId: 'card-1',
    purchaseDate: '2026-09-18',
    description: 'Uber Viagens Corporativas - Atendimento a Clientes',
    counterpartyName: 'Uber do Brasil Tecnologia',
    chartAccountId: 'acc-desp-5',
    totalAmount: 145.20,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 145.20,
    invoiceMonth: '2026-09',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 145.20,
        competence: '2026-09',
        dueDate: '2026-10-05',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Deslocamentos urbanos em reuniões presenciais',
    createdAt: '2026-09-18T16:45:00Z'
  },
  {
    id: 'pur-8',
    cardId: 'card-1',
    purchaseDate: '2026-08-04',
    description: 'Amazon Web Services (AWS Cloud Hosting)',
    counterpartyName: 'Amazon AWS Serviços Brasil',
    chartAccountId: 'acc-desp-1',
    totalAmount: 680.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 680.00,
    invoiceMonth: '2026-08',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 680.00,
        competence: '2026-08',
        dueDate: '2026-09-05',
        invoiceMonth: '2026-08',
        settled: true,
        settledAt: '2026-09-05'
      }
    ],
    notes: 'Hospedagem e banco de dados em nuvem',
    createdAt: '2026-08-04T08:00:00Z'
  },
  {
    id: 'pur-9',
    cardId: 'card-1',
    purchaseDate: '2026-08-10',
    description: 'Certificado Digital e-CNPJ A1 Serasa',
    counterpartyName: 'Serasa Experian',
    chartAccountId: 'acc-desp-1',
    totalAmount: 210.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 210.00,
    invoiceMonth: '2026-08',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 210.00,
        competence: '2026-08',
        dueDate: '2026-09-05',
        invoiceMonth: '2026-08',
        settled: true,
        settledAt: '2026-09-05'
      }
    ],
    notes: 'Renovação do certificado digital da matriz',
    createdAt: '2026-08-10T11:20:00Z'
  },
  {
    id: 'pur-10',
    cardId: 'card-1',
    purchaseDate: '2026-07-15',
    description: 'Monitor Profissional Dell UltraSharp 27 4K',
    counterpartyId: 'forn-6',
    counterpartyName: 'Dell Computadores do Brasil Ltda',
    chartAccountId: 'acc-desp-3',
    totalAmount: 1800.00,
    installmentsCount: 3,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 600.00,
    invoiceMonth: '2026-07',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 600.00,
        competence: '2026-07',
        dueDate: '2026-08-05',
        invoiceMonth: '2026-07',
        settled: true,
        settledAt: '2026-08-05'
      },
      {
        installmentNumber: 2,
        totalInstallments: 3,
        amount: 600.00,
        competence: '2026-08',
        dueDate: '2026-09-05',
        invoiceMonth: '2026-08',
        settled: true,
        settledAt: '2026-09-05'
      },
      {
        installmentNumber: 3,
        totalInstallments: 3,
        amount: 600.00,
        competence: '2026-09',
        dueDate: '2026-10-05',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Monitor para estação de análise fiscal e contábil',
    createdAt: '2026-07-15T15:10:00Z'
  },
  {
    id: 'pur-11',
    cardId: 'card-1',
    purchaseDate: '2026-07-10',
    description: 'Assinatura Slack Enterprise Anual',
    counterpartyName: 'Slack Technologies',
    chartAccountId: 'acc-desp-1',
    totalAmount: 960.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 960.00,
    invoiceMonth: '2026-07',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 960.00,
        competence: '2026-07',
        dueDate: '2026-08-05',
        invoiceMonth: '2026-07',
        settled: true,
        settledAt: '2026-08-05'
      }
    ],
    notes: 'Comunicação interna e canais integrados',
    createdAt: '2026-07-10T10:00:00Z'
  },

  // ==========================================
  // CARD 2: ITAÚ CORPORATE VISA
  // ==========================================
  {
    id: 'pur-12',
    cardId: 'card-2',
    purchaseDate: '2026-08-10',
    description: 'Passagens Aéreas Latam - Congresso Nacional de Contabilidade',
    counterpartyName: 'Latam Airlines Brasil',
    chartAccountId: 'acc-desp-4',
    totalAmount: 2400.00,
    installmentsCount: 3,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 800.00,
    invoiceMonth: '2026-08',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 800.00,
        competence: '2026-08',
        dueDate: '2026-08-28',
        invoiceMonth: '2026-08',
        settled: true,
        settledAt: '2026-08-28'
      },
      {
        installmentNumber: 2,
        totalInstallments: 3,
        amount: 800.00,
        competence: '2026-09',
        dueDate: '2026-09-28',
        invoiceMonth: '2026-09',
        settled: false
      },
      {
        installmentNumber: 3,
        totalInstallments: 3,
        amount: 800.00,
        competence: '2026-10',
        dueDate: '2026-10-28',
        invoiceMonth: '2026-10',
        settled: false
      }
    ],
    notes: 'Passagens aéreas para sócios no CONVECON',
    createdAt: '2026-08-10T14:30:00Z'
  },
  {
    id: 'pur-13',
    cardId: 'card-2',
    purchaseDate: '2026-09-05',
    description: 'Hospedagem Hotel Ibis São Paulo Paulista',
    counterpartyName: 'Accor Hotéis Brasil',
    chartAccountId: 'acc-desp-4',
    totalAmount: 890.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 890.00,
    invoiceMonth: '2026-09',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 890.00,
        competence: '2026-09',
        dueDate: '2026-09-28',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Hospedagem de consultor tributário parceiro',
    createdAt: '2026-09-05T18:00:00Z'
  },
  {
    id: 'pur-14',
    cardId: 'card-2',
    purchaseDate: '2026-09-08',
    description: 'Campanha de Tráfego Google Ads - Captação PJ',
    counterpartyId: 'forn-3',
    counterpartyName: 'Google Cloud Brasil Internet Ltda',
    chartAccountId: 'acc-desp-7',
    totalAmount: 1200.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 1200.00,
    invoiceMonth: '2026-09',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 1200.00,
        competence: '2026-09',
        dueDate: '2026-09-28',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Aquisição de clientes corporativos via pesquisa Google',
    createdAt: '2026-09-08T09:00:00Z'
  },
  {
    id: 'pur-15',
    cardId: 'card-2',
    purchaseDate: '2026-09-11',
    description: 'Campanha Meta Ads - Redes Sociais e LinkedIn',
    counterpartyName: 'Meta Platforms Brasil Ltda',
    chartAccountId: 'acc-desp-7',
    totalAmount: 850.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 850.00,
    invoiceMonth: '2026-09',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 850.00,
        competence: '2026-09',
        dueDate: '2026-09-28',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Geração de leads qualificados para BPO Financeiro',
    createdAt: '2026-09-11T15:40:00Z'
  },
  {
    id: 'pur-16',
    cardId: 'card-2',
    purchaseDate: '2026-09-14',
    description: 'Outback Steakhouse - Confraternização de Metas',
    counterpartyName: 'Outback Brasil',
    chartAccountId: 'acc-desp-2',
    totalAmount: 640.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 640.00,
    invoiceMonth: '2026-09',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 640.00,
        competence: '2026-09',
        dueDate: '2026-09-28',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Jantar de premiação por batimento de metas do mês',
    createdAt: '2026-09-14T21:15:00Z'
  },
  {
    id: 'pur-17',
    cardId: 'card-2',
    purchaseDate: '2026-09-16',
    description: 'Sem Parar - Pedágios e Estacionamentos Corporativos',
    counterpartyName: 'Sem Parar Instituição de Pagamento',
    chartAccountId: 'acc-desp-5',
    totalAmount: 185.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 185.00,
    invoiceMonth: '2026-09',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 185.00,
        competence: '2026-09',
        dueDate: '2026-09-28',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Fatura de tags de pedágio dos veículos da empresa',
    createdAt: '2026-09-16T12:00:00Z'
  },
  {
    id: 'pur-18',
    cardId: 'card-2',
    purchaseDate: '2026-08-05',
    description: 'Microsoft 365 Copilot & Licenças Corporativas',
    counterpartyName: 'Microsoft do Brasil Ltda',
    chartAccountId: 'acc-desp-1',
    totalAmount: 550.00,
    installmentsCount: 1,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 550.00,
    invoiceMonth: '2026-08',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 550.00,
        competence: '2026-08',
        dueDate: '2026-08-28',
        invoiceMonth: '2026-08',
        settled: true,
        settledAt: '2026-08-28'
      }
    ],
    notes: 'Planilhas avançadas, Excel com IA e Teams',
    createdAt: '2026-08-05T09:30:00Z'
  },
  {
    id: 'pur-19',
    cardId: 'card-2',
    purchaseDate: '2026-07-02',
    description: 'Estações de Trabalho Ergonômicas e Cadeiras - 6x',
    counterpartyName: 'Móveis Corporativos Flexform',
    chartAccountId: 'acc-desp-3',
    totalAmount: 3600.00,
    installmentsCount: 6,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 600.00,
    invoiceMonth: '2026-07',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 6,
        amount: 600.00,
        competence: '2026-07',
        dueDate: '2026-07-28',
        invoiceMonth: '2026-07',
        settled: true,
        settledAt: '2026-07-28'
      },
      {
        installmentNumber: 2,
        totalInstallments: 6,
        amount: 600.00,
        competence: '2026-08',
        dueDate: '2026-08-28',
        invoiceMonth: '2026-08',
        settled: true,
        settledAt: '2026-08-28'
      },
      {
        installmentNumber: 3,
        totalInstallments: 6,
        amount: 600.00,
        competence: '2026-09',
        dueDate: '2026-09-28',
        invoiceMonth: '2026-09',
        settled: false
      },
      {
        installmentNumber: 4,
        totalInstallments: 6,
        amount: 600.00,
        competence: '2026-10',
        dueDate: '2026-10-28',
        invoiceMonth: '2026-10',
        settled: false
      },
      {
        installmentNumber: 5,
        totalInstallments: 6,
        amount: 600.00,
        competence: '2026-11',
        dueDate: '2026-11-28',
        invoiceMonth: '2026-11',
        settled: false
      },
      {
        installmentNumber: 6,
        totalInstallments: 6,
        amount: 600.00,
        competence: '2026-12',
        dueDate: '2026-12-28',
        invoiceMonth: '2026-12',
        settled: false
      }
    ],
    notes: 'Reformulação ergonômica da sala de operações',
    createdAt: '2026-07-02T16:00:00Z'
  },
  {
    id: 'pur-20',
    cardId: 'card-2',
    purchaseDate: '2026-07-14',
    description: 'Impressora Multifuncional HP LaserJet Managed',
    counterpartyName: 'HP Brasil Soluções',
    chartAccountId: 'acc-desp-3',
    totalAmount: 2100.00,
    installmentsCount: 3,
    calculationMode: 'TOTAL_DIVIDED',
    installmentValue: 700.00,
    invoiceMonth: '2026-07',
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 700.00,
        competence: '2026-07',
        dueDate: '2026-07-28',
        invoiceMonth: '2026-07',
        settled: true,
        settledAt: '2026-07-28'
      },
      {
        installmentNumber: 2,
        totalInstallments: 3,
        amount: 700.00,
        competence: '2026-08',
        dueDate: '2026-08-28',
        invoiceMonth: '2026-08',
        settled: true,
        settledAt: '2026-08-28'
      },
      {
        installmentNumber: 3,
        totalInstallments: 3,
        amount: 700.00,
        competence: '2026-09',
        dueDate: '2026-09-28',
        invoiceMonth: '2026-09',
        settled: false
      }
    ],
    notes: 'Equipamento de impressão segura e digitalização de notas',
    createdAt: '2026-07-14T11:45:00Z'
  }
];

export const INITIAL_CASH_COUNTS: CashCountRecord[] = [
  {
    id: 'cnt-1',
    bankAccountId: 'bank-3', // Caixa Pequeno Escritório
    date: '2026-09-10',
    time: '18:00',
    countedBy: 'Leonardo Ricardo',
    bills: {
      '200': 2, // 400
      '100': 5, // 500
      '50': 4,  // 200
      '20': 3,  // 60
      '10': 2,  // 20
      '5': 2,   // 10
      '2': 3    // 6
    },
    coins: {
      '1': 3,    // 3.00
      '0.50': 2, // 1.00
      '0.25': 0,
      '0.10': 0,
      '0.05': 0,
      '0.01': 0
    },
    totalBills: 1196.00,
    totalCoins: 4.00,
    totalPhysical: 1200.00,
    systemBalance: 1200.00,
    difference: 0,
    status: 'EQUILIBRADO',
    notes: 'Fechamento físico regular do expediente. Caixa sem divergências.',
    adjustedInSystem: true,
    createdAt: '2026-09-10T18:05:00Z'
  }
];
