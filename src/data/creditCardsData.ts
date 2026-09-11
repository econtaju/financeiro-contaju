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
    notes: 'Cartão corporativo para despesas recorrentes de TI e assinaturas.',
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
    notes: 'Cartão para viagens, eventos e aquisições de grande porte.',
    createdAt: '2026-01-01T00:00:00Z'
  }
];

export const INITIAL_CARD_PURCHASES: CreditCardPurchase[] = [
  {
    id: 'pur-1',
    cardId: 'card-1',
    purchaseDate: '2026-09-02',
    description: 'Assinatura Google Workspace & Servidores Cloud',
    counterpartyId: 'prov-2',
    counterpartyName: 'Google Cloud Brasil',
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
    counterpartyId: 'prov-1',
    counterpartyName: 'Dell Computadores',
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
