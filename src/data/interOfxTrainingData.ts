import { BankStatementEntry, BankAccount } from '../types';

export const BANCO_INTER_ACCOUNT: BankAccount = {
  id: 'bank-077-inter',
  institution: 'Banco Inter',
  name: 'Banco Inter (Cta 437267326)',
  bankCode: '077',
  agency: '0001-9',
  accountNumber: '437267326',
  type: 'CORRENTE',
  currency: 'BRL',
  initialBalance: 8522.51,
  currentBalance: 8522.51,
  baseDate: '2026-10-01',
  includeInCashFlow: true,
  status: 'ATIVO',
  color: '#f59e0b'
};

export const BANCO_INTER_OFX_TRANSACTIONS: Omit<BankStatementEntry, 'importBatchId' | 'bankAccountId'>[] = [
  {
    id: 'stmt-inter-001',
    fitId: '202610140771',
    date: '2026-10-14',
    amount: -638.32,
    description: 'Pagamento de Titulo: "UNIMED PONTAL DO TRIANGULO - COOPERATIVA DE TRABAL"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-002',
    fitId: '202610140772',
    date: '2026-10-14',
    amount: -504.32,
    description: 'Pagamento de Titulo: "UNIMED PONTAL DO TRIANGULO - COOPERATIVA DE TRABAL"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-003',
    fitId: '202610140773',
    date: '2026-10-14',
    amount: -60.00,
    description: 'Pix enviado: "Cp :03412878-Marli do Nascimento 19144274831"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-004',
    fitId: '202610130771',
    date: '2026-10-13',
    amount: 2626.57,
    description: 'Pix recebido: "Cp :47381104-ESCRITORIO CONTAJU"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-005',
    fitId: '202610130772',
    date: '2026-10-13',
    amount: 700.00,
    description: 'Pix recebido: "Cp :03412878-BOM BIFE CASA DE CARNES LTDA"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-006',
    fitId: '202610090771',
    date: '2026-10-09',
    amount: -124.66,
    description: 'Pix enviado: "Cp :00000000-PREFEITURA MUNICIPAL"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-007',
    fitId: '202610090772',
    date: '2026-10-09',
    amount: -206.68,
    description: 'Pix enviado: "Cp :89990501-ANPROCAR"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-008',
    fitId: '202610090773',
    date: '2026-10-09',
    amount: -850.00,
    description: 'Pagamento de Titulo: "A10 TECNOLOGIA E INOVACAO LTDA"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-009',
    fitId: '202610090774',
    date: '2026-10-09',
    amount: -1668.60,
    description: 'Pagamento de Titulo: "THOMSON REUTERS BRAS"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-010',
    fitId: '202610090775',
    date: '2026-10-09',
    amount: -423.93,
    description: 'Pagamento de Titulo: "GOB SOLUCOES LTDA"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-011',
    fitId: '202610090776',
    date: '2026-10-09',
    amount: -358.32,
    description: 'Pagamento de Titulo: "LUIZA CRED FINANC"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-012',
    fitId: '202610090777',
    date: '2026-10-09',
    amount: -371.80,
    description: 'Pix enviado: "00019 16662121 LEONARDO ARANTES" - Leonardo Ricardo Arantes',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-013',
    fitId: '202610090778',
    date: '2026-10-09',
    amount: -1042.54,
    description: 'Pix enviado: "Cp :18236120-Leonardo Ricardo Arantes" - Leonardo Ricardo Arantes',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-014',
    fitId: '202610090779',
    date: '2026-10-09',
    amount: -918.41,
    description: 'Pix enviado: "00019 13349210 PRISCILA LIMA" - Priscila Souza Lima',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-015',
    fitId: '202610080771',
    date: '2026-10-08',
    amount: -2350.00,
    description: 'Pix enviado: "Cp :78626983-VR BENEFICIOS E SERVICOS DE PROCESSAMENTO SA"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-016',
    fitId: '202610080772',
    date: '2026-10-08',
    amount: -3200.00,
    description: 'Pix enviado: "00019 16662121 LEONARDO ARANTES" - Leonardo Ricardo Arantes',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-017',
    fitId: '202610060771',
    date: '2026-10-06',
    amount: 330.00,
    description: 'Pix recebido: "Cp :00000000-IVAIR SILVA AMARAL"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-018',
    fitId: '202610050771',
    date: '2026-10-05',
    amount: 15.00,
    description: 'Pix recebido: "Cp :60746948-WILLIAN MORAES FERREIRA"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-019',
    fitId: '202610020771',
    date: '2026-10-02',
    amount: 405.00,
    description: 'Pix recebido: "Cp :03412878-TOP CAR ITURAMA LTDA"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-020',
    fitId: '202610020772',
    date: '2026-10-02',
    amount: -42.69,
    description: 'Pix enviado: "Cp :03412878-ITURAMA LIMPEZA E COMERCIO"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-021',
    fitId: '202610020773',
    date: '2026-10-02',
    amount: -1709.63,
    description: 'Pix enviado: "Cp :10573521-Leonardo Ricardo Arantes" - Leonardo Ricardo Arantes',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-022',
    fitId: '202610020774',
    date: '2026-10-02',
    amount: -2500.00,
    description: 'Pix enviado: "00019 16662121 LEONARDO ARANTES" - Leonardo Ricardo Arantes',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-023',
    fitId: '202610020775',
    date: '2026-10-02',
    amount: -750.00,
    description: 'Pix enviado: "Cp :18236120-Leonardo Ricardo Arantes" - Leonardo Ricardo Arantes',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-024',
    fitId: '202610020776',
    date: '2026-10-02',
    amount: -3000.00,
    description: 'Pix enviado: "Cp :10573521-Priscila Souza Lima" - Priscila Souza Lima',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-025',
    fitId: '202610020777',
    date: '2026-10-02',
    amount: -1521.00,
    description: 'Pix enviado: "Cp :60701190-Sandra Regina Souza Lima" - Sandra Regina Souza Lima',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-026',
    fitId: '202610020778',
    date: '2026-10-02',
    amount: -600.00,
    description: 'Pix enviado: "Cp :60701190-Sandra Regina Souza Lima" - Sandra Regina Souza Lima',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-027',
    fitId: '202610020779',
    date: '2026-10-02',
    amount: -2300.00,
    description: 'Pix enviado: "00019 84652489 DANIEL ARANTES" - Daniel Ricardo Arantes',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-028',
    fitId: '202610020780',
    date: '2026-10-02',
    amount: -2500.00,
    description: 'Pix enviado: "Cp :31872495-Priscila Souza Lima" - Priscila Souza Lima',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-029',
    fitId: '202610020781',
    date: '2026-10-02',
    amount: -844.32,
    description: 'Pix enviado: "Cp :18236120-Nayara Souza Ferreira" - Nayara Souza Ferreira',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-030',
    fitId: '202610020782',
    date: '2026-10-02',
    amount: -1662.32,
    description: 'Pix enviado: "Cp :18236120-Ana Caroline Freitas Arantes" - Ana Caroline Freitas Arantes',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-031',
    fitId: '202610020783',
    date: '2026-10-02',
    amount: 1000.00,
    description: 'Pix recebido: "Cp :00360305-CHARRIRA CRISTINA RAHAL"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-032',
    fitId: '202610020784',
    date: '2026-10-02',
    amount: -1377.66,
    description: 'Pix enviado: "Cp :18236120-Handrel Rodrigues Moreira" - Handrel Rodrigues Moreira',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-033',
    fitId: '202610020785',
    date: '2026-10-02',
    amount: -1344.32,
    description: 'Pix enviado: "Cp :08561701-Jander de Faria" - Jander De Faria',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-034',
    fitId: '202610020786',
    date: '2026-10-02',
    amount: -1000.00,
    description: 'Pix enviado: "Cp :10573521-Leonardo Ricardo Arantes" - Leonardo Ricardo Arantes',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-035',
    fitId: '202610010771',
    date: '2026-10-01',
    amount: 900.00,
    description: 'Pix recebido: "Cp :00000000-LOC MUNKS GUIND CABRAL"',
    reconciliationStatus: 'PENDENTE'
  },
  {
    id: 'stmt-inter-036',
    fitId: '202610010772',
    date: '2026-10-01',
    amount: 945.00,
    description: 'Pix recebido: "Cp :44469161-TRIAMINAS ADMINISTRADORA E CORRETORA DE SEGUROS LT"',
    reconciliationStatus: 'PENDENTE'
  }
];
