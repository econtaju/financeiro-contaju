import { CreditCard, CreditCardPurchase, CashCountRecord } from '../types';

export const INITIAL_CREDIT_CARDS: CreditCard[] = [];

export const INITIAL_CARD_PURCHASES: CreditCardPurchase[] = [];

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
