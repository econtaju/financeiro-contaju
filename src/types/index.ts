export type UserRole = 'ADMIN' | 'GESTOR_FINANCEIRO' | 'OPERADOR' | 'CONSULTA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status?: 'ATIVO' | 'INATIVO';
  createdAt?: string;
}

export type OperationNature = 
  | 'RECEITA_SERVICO'
  | 'DEDUCAO_RECEITA'
  | 'CUSTO_SERVICO'
  | 'DESPESA_PESSOAL'
  | 'DESPESA_ADMINISTRATIVA'
  | 'DESPESA_COMERCIAL'
  | 'DESPESA_OPERACIONAL'
  | 'RESULTADO_FINANCEIRO'
  | 'RECEITA_FINANCEIRA'
  | 'DESPESA_FINANCEIRA'
  | 'OUTRA_RECEITA'
  | 'TRIBUTO_LUCRO'
  | 'INVESTIMENTO_ATIVO'
  | 'FINANCIAMENTO_SOCIO'
  | 'CONTROLE_ESPECIFICO';

export type CashFlowCategory = 'OPERACIONAL' | 'INVESTIMENTO' | 'FINANCIAMENTO' | 'TRANSFERENCIA_INTERNA';

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  parentId?: string | null;
  nature: OperationNature;
  dremap: {
    include: boolean;
    line: string;
    multiplier: 1 | -1; // 1 adds, -1 subtracts
  };
  cashFlowCategory: CashFlowCategory;
  isAnalytical: boolean; // Only analytical accounts can receive entries
  isSynthetic?: boolean;
  isActive: boolean;
  status?: 'ATIVO' | 'INATIVO';
  dreLineMapping?: string;
  type?: string;
  externalCode?: string;
}

export type ChartOfAccount = ChartAccount;

export type EntityType = 'CLIENTE' | 'FORNECEDOR' | 'AMBOS';

export interface Counterparty {
  id: string;
  type: EntityType;
  name: string; // Razão Social / Nome
  tradeName?: string; // Nome Fantasia
  document: string; // CPF ou CNPJ
  email: string;
  phone: string;
  address?: string;
  status: 'ATIVO' | 'INATIVO';
  notes?: string;
  createdAt: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  defaultPrice: number;
  modality: 'RECORRENTE' | 'AVULSO';
  defaultAccountId: string;
  chartAccountId?: string;
  status: 'ATIVO' | 'INATIVO';
}

export type ContractStatus = 'RASCUNHO' | 'ATIVO' | 'SUSPENSO' | 'ENCERRADO' | 'CANCELADO';
export type DueDayRule = 'SAME_MONTH' | 'NEXT_MONTH';

export interface ContractItem {
  id: string;
  serviceId: string;
  description: string;
  unitPrice: number;
  quantity: number;
  accountId: string;
  total?: number;
}

export interface Contract {
  id: string;
  contractNumber: string;
  customerId: string;
  companyId?: string;
  description: string;
  items: ContractItem[];
  monthlyTotal: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // Optional
  periodicity: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  billingFrequency?: string;
  dueDay: number; // 1 to 31
  dueRule: DueDayRule; // SAME_MONTH or NEXT_MONTH of competence
  billingMethod: 'BOLETO' | 'PIX' | 'TRANSFERENCIA' | 'OUTRO';
  status: ContractStatus;
  notes?: string;
  adjustmentRule?: string; // e.g. 'IPCA anual'
  lastGeneratedCompetence?: string; // 'YYYY-MM'
  createdAt: string;
}

export interface SaleItem {
  id: string;
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  accountId: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  customerId: string;
  competence: string; // YYYY-MM
  date: string; // YYYY-MM-DD
  items: SaleItem[];
  grossTotal: number;
  discountTotal: number;
  netTotal: number;
  installmentsCount: number;
  notes?: string;
  createdAt: string;
}

export type TitleType = 'RECEBER' | 'PAGAR';
export type TitleDocumentState = 'RASCUNHO' | 'CONFIRMADO' | 'CANCELADO';
export type TitleSettlementState = 'ABERTO' | 'PARCIAL' | 'LIQUIDADO';

export interface FinancialTitle {
  id: string;
  companyId: string;
  type: TitleType;
  titleNumber: string;
  counterpartyId: string; // Cliente ou Fornecedor
  description: string;
  accountId: string; // Plano de contas analítico
  
  // Datas fundamentais
  launchDate: string; // Data de lançamento (hoje por padrão)
  competence: string; // YYYY-MM (mês econômico)
  issueDate: string; // Data de emissão do documento
  dueDate: string; // Vencimento original
  expectedCashDate: string; // Data prevista de caixa
  
  // Valores
  originalAmount: number; // Valor original do título (principal)
  settledPrincipal: number; // Soma dos principais baixados válidos
  balancePrincipal: number; // Saldo principal = originalAmount - settledPrincipal
  
  // Encargos reconhecidos pendentes
  accruedInterest: number;
  accruedFine: number;
  
  // Status
  documentState: TitleDocumentState;
  settlementState: TitleSettlementState;
  
  // Origem
  originType: 'CONTRATO' | 'VENDA' | 'DESPESA_DIRETA' | 'RECORRENCIA_PAGAR' | 'MANUAL' | 'CARTAO_CREDITO';
  originId?: string;
  installmentIndex?: number;
  totalInstallments?: number;
  
  // Cartão de Crédito (quando originType === 'CARTAO_CREDITO')
  creditCardId?: string;
  creditCardInvoiceMonth?: string; // YYYY-MM
  isCreditCardPurchase?: boolean;

  expectedBankAccountId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementComponent {
  principalSettled: number; // principal baixado
  discount: number; // desconto financeiro concedido/obtido
  interest: number; // juros recebidos/pagos
  fine: number; // multa recebida/paga
  bankFee: number; // tarifa bancária retida (ex: R$ 30,00)
  netFinancialAmount: number; // Dinheiro movimentado no banco = principal - desconto + juros + multa (- bankFee para receber)
}

export interface Settlement {
  id: string;
  titleId: string;
  settlementNumber: string;
  settlementDate: string; // Data efetiva (YYYY-MM-DD)
  bankAccountId: string;
  components: SettlementComponent;
  notes?: string;
  voucherRef?: string;
  isReversed: boolean;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  createdAt: string;
  createdBy: string;
}

export type BankAccountType = 'CORRENTE' | 'POUPANCA' | 'CARTEIRA' | 'CAIXA_FISICO' | 'APLICACAO' | 'OUTRO';

export interface BankAccount {
  id: string;
  institution: string; // Itaú, Bradesco, etc.
  name: string;
  bankCode?: string;
  agency?: string;
  accountNumber?: string;
  type: BankAccountType;
  currency: 'BRL';
  initialBalance: number;
  currentBalance?: number;
  baseDate: string; // Data-base de abertura
  includeInCashFlow: boolean; // Se faz parte do caixa consolidado
  status: 'ATIVO' | 'INATIVO';
  color?: string;
}

export type MovementDirection = 'ENTRADA' | 'SAIDA';
export type MovementOrigin = 'BAIXA_TITULO' | 'TRANSFERENCIA' | 'OPERACAO_DIRETA' | 'ESTORNO' | 'AJUSTE_CAIXA' | 'FATURA_CARTAO';

// ==========================================
// CAIXA FÍSICO / CALCULADORA DE CÉDULAS & MOEDAS
// ==========================================
export interface CashDenominations {
  bills: {
    '200': number;
    '100': number;
    '50': number;
    '20': number;
    '10': number;
    '5': number;
    '2': number;
  };
  coins: {
    '1': number;
    '0.50': number;
    '0.25': number;
    '0.10': number;
    '0.05': number;
    '0.01': number;
  };
}

export interface CashCountRecord {
  id: string;
  bankAccountId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  countedBy: string;
  bills: Record<string, number>;
  coins: Record<string, number>;
  totalBills: number;
  totalCoins: number;
  totalPhysical: number;
  systemBalance: number;
  difference: number; // totalPhysical - systemBalance
  status: 'EQUILIBRADO' | 'SOBRA' | 'FALTA';
  notes?: string;
  adjustedInSystem: boolean;
  createdAt: string;
}

// ==========================================
// CARTÕES DE CRÉDITO CORPORATIVOS & FATURAS
// ==========================================
export type CreditCardBrand = 'MASTERCARD' | 'VISA' | 'ELO' | 'AMEX' | 'HIPERCARD' | 'OUTRO';

export interface CreditCard {
  id: string;
  name: string; // ex: "Nubank PJ Mastercard", "Itaú Corporate Visa"
  institution: string; // ex: "Nubank", "Itaú"
  brand: CreditCardBrand;
  lastFourDigits: string; // ex: "4821"
  creditLimit: number; // ex: 25000.00
  closingDay: number; // 1 a 31
  dueDay: number; // 1 a 31
  color: string; // ex: "#7c3aed"
  defaultPaymentBankAccountId?: string; // Conta bancária PJ padrão para pagamento
  status: 'ATIVO' | 'INATIVO';
  notes?: string;
  createdAt: string;
}

export interface CreditCardInstallment {
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  competence: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD da fatura correspondente
  invoiceMonth: string; // YYYY-MM da fatura que receberá esta parcela
  titleId?: string; // ID do título gerado no Contas a Pagar
  settled: boolean;
  settledAt?: string;
  settlementId?: string;
}

export interface CreditCardPurchase {
  id: string;
  cardId: string;
  purchaseDate: string; // YYYY-MM-DD
  description: string;
  counterpartyId?: string; // Fornecedor/Estabelecimento
  counterpartyName?: string;
  chartAccountId: string; // Categoria de Despesa do Plano de Contas
  totalAmount: number;
  installmentsCount: number; // 1 para à vista, > 1 para parcelado
  calculationMode: 'TOTAL_DIVIDED' | 'PER_INSTALLMENT';
  installmentValue: number;
  installments: CreditCardInstallment[];
  invoiceMonth: string; // YYYY-MM da 1ª parcela / fatura inicial
  notes?: string;
  createdAt: string;
}

export interface CreditCardInvoicePayment {
  id: string;
  cardId: string;
  invoiceMonth: string; // YYYY-MM
  paymentDate: string; // YYYY-MM-DD
  bankAccountId: string; // Conta bancária PJ que pagou a fatura
  amountPaid: number;
  notes?: string;
  movementId?: string;
  settlementIds: string[];
  createdAt: string;
  createdBy: string;
}

export interface FinancialMovement {
  id: string;
  bankAccountId: string;
  date: string; // Data efetiva
  direction: MovementDirection;
  amount: number; // Valor líquido creditado/debitado
  originType: MovementOrigin;
  originReferenceId?: string; // settlementId, transferId, etc.
  description: string;
  counterpartyId?: string;
  accountId?: string;
  cashFlowCategory: CashFlowCategory;
  isReversed?: boolean;
  createdAt: string;
}

export interface BankTransfer {
  id: string;
  originAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: string;
  feeAmount?: number;
  feeAccountId?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface StatementEntry {
  id: string;
  importBatchId: string;
  bankAccountId: string;
  fitId?: string; // External bank ID
  date: string;
  description: string;
  documentNumber?: string;
  amount: number; // positive = credit, negative = debit
  reconciliationStatus: 'PENDENTE' | 'SUGESTAO' | 'CONCILIADO' | 'IGNORADO';
  suggestedTitleId?: string;
  ruleApplied?: string;
  matchedMovementId?: string;
  matchedTitleId?: string;
  reconciliationNote?: string;
}

export type BankStatementEntry = StatementEntry;

export interface StatementImportBatch {
  id: string;
  bankAccountId: string;
  filename: string;
  fileFormat: 'OFX' | 'CSV' | 'XLSX';
  importedAt: string;
  totalEntries: number;
  importedCount: number;
  duplicateCount: number;
  status: 'SUCESSO' | 'PARCIAL' | 'FALHA';
}

export interface PeriodClosure {
  id: string;
  yearMonth: string; // YYYY-MM
  competence?: string; // Alias for yearMonth
  closedAt: string;
  closedBy: string;
  notes?: string;
  isClosed: boolean;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenReason?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  recordId: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface ModuleConfig {
  id: string;
  key: string;
  name: string;
  description: string;
  isCore: boolean; // Core modules cannot be disabled
  isEnabled: boolean;
  status: 'ATIVO' | 'PLANEJADO' | 'CONFIGURACAO_PENDENTE';
  dependencies?: string[];
  docUrl?: string;
}

export interface ImprovementRequest {
  id: string;
  title: string;
  problem?: string;
  expectedBenefit?: string;
  module?: string;
  category?: 'RELATORIOS' | 'USABILIDADE' | 'FISCAL_CONTABIL' | 'PERFORMANCE' | string;
  description?: string;
  votes?: number;
  requestedBy?: string;
  priority?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  status: 'IDEIA' | 'ANALISE' | 'PLANEJADA' | 'DESENVOLVIMENTO' | 'TESTE' | 'CONCLUIDA' | 'EM_ANALISE';
  createdAt: string;
  createdBy?: string;
}

export interface CompanyProfile {
  id: string;
  companyName: string;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  currency: 'BRL';
  timezone: string; // 'America/Sao_Paulo'
  fiscalRegime: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
}

export type Company = CompanyProfile;
export type CompanyInfo = CompanyProfile;

export interface BudgetItem {
  accountId: string;
  monthlyPlanned: number[]; // 12 numbers for Jan..Dec
}

export interface AnnualBudgetPlan {
  id: string;
  year: number;
  name: string;
  updatedAt: string;
  notes?: string;
  items: BudgetItem[];
}

export interface BudgetComparisonLine {
  id: string;
  code?: string;
  name: string;
  level: number;
  isHeader?: boolean;
  isSummary?: boolean;
  nature?: OperationNature;
  plannedMonthly: number[];
  plannedTotal: number;
  realizedMonthly: number[];
  realizedTotal: number;
  varianceTotal: number; // Realized - Planned
  variancePercent: number; // %
  executionRate: number; // (Realized / Planned) * 100
  status: 'FAVORAVEL' | 'ATENCAO' | 'DESFAVORAVEL' | 'NEUTRO';
}

export interface GlobalPeriodFilter {
  active: boolean;
  year: number;
  month: number; // 1 to 12 (or 0 for whole year)
}

export interface DashboardConfig {
  visibleKpis: string[];
  visibleWidgets: string[];
}

export interface BatchEditOptions {
  competence?: string;
  dueDate?: string;
  postponeDays?: number;
  accountId?: string;
  expectedBankAccountId?: string;
}
