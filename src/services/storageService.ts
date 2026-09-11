import { 
  CompanyProfile, 
  User, 
  Counterparty, 
  ServiceItem, 
  Contract, 
  FinancialTitle, 
  Settlement, 
  BankAccount, 
  FinancialMovement, 
  PeriodClosure, 
  AuditLogEntry, 
  ModuleConfig, 
  ImprovementRequest,
  StatementEntry,
  ChartAccount,
  AnnualBudgetPlan,
  GlobalPeriodFilter,
  DashboardConfig,
  BatchEditOptions,
  CreditCard,
  CreditCardPurchase,
  CreditCardInvoicePayment,
  CashCountRecord
} from '../types';
import { 
  INITIAL_COMPANY, 
  INITIAL_USERS, 
  INITIAL_BANK_ACCOUNTS, 
  INITIAL_COUNTERPARTIES, 
  INITIAL_SERVICES, 
  INITIAL_CONTRACTS, 
  INITIAL_TITLES, 
  INITIAL_SETTLEMENTS, 
  INITIAL_MOVEMENTS, 
  INITIAL_STATEMENT_ENTRIES, 
  INITIAL_PERIOD_CLOSURES, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_MODULES, 
  INITIAL_IMPROVEMENTS 
} from '../data/initialData';
import { INITIAL_CHART_ACCOUNTS } from '../data/chartOfAccountsData';
import { INITIAL_BUDGET_PLANS } from '../data/initialBudgetData';
import { 
  INITIAL_CREDIT_CARDS, 
  INITIAL_CARD_PURCHASES, 
  INITIAL_CASH_COUNTS 
} from '../data/creditCardsData';

const STORAGE_KEYS = {
  COMPANY: 'contaju_company_profile',
  USERS: 'contaju_users',
  CURRENT_USER_ID: 'contaju_current_user_id',
  CHART_ACCOUNTS: 'contaju_chart_accounts',
  BANK_ACCOUNTS: 'contaju_bank_accounts',
  COUNTERPARTIES: 'contaju_counterparties',
  SERVICES: 'contaju_services',
  CONTRACTS: 'contaju_contracts',
  TITLES: 'contaju_titles',
  SETTLEMENTS: 'contaju_settlements',
  MOVEMENTS: 'contaju_movements',
  STATEMENT_ENTRIES: 'contaju_statements',
  PERIOD_CLOSURES: 'contaju_period_closures',
  AUDIT_LOGS: 'contaju_audit_logs',
  MODULES: 'contaju_modules',
  IMPROVEMENTS: 'contaju_improvements',
  BUDGET_PLANS: 'contaju_budget_plans',
  CREDIT_CARDS: 'contaju_credit_cards',
  CARD_PURCHASES: 'contaju_card_purchases',
  CARD_INVOICE_PAYMENTS: 'contaju_card_invoice_payments',
  CASH_COUNTS: 'contaju_cash_counts',
  GLOBAL_PERIOD_FILTER: 'contaju_global_period_filter',
  DASHBOARD_CONFIG: 'contaju_dashboard_config',
  THEME: 'contaju_theme'
};

const DEFAULT_GLOBAL_PERIOD_FILTER = {
  active: false,
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1
};

const DEFAULT_DASHBOARD_CONFIG = {
  visibleKpis: [
    'faturamento_bruto',
    'resultado_liquido',
    'mrr',
    'clientes_ativos',
    'crescimento_clientes',
    'inadimplencia',
    'saldo_disponivel',
    'entradas_caixa',
    'saidas_caixa'
  ],
  visibleWidgets: [
    'widget_faturamento_resumo',
    'widget_saldos_consolidados',
    'widget_resumo_clientes',
    'widget_gap_caixa',
    'widget_proximos_receber',
    'widget_proximos_pagar'
  ]
};

class StorageService {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initIfEmpty();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public initIfEmpty(force = false) {
    if (force || !localStorage.getItem(STORAGE_KEYS.COMPANY)) {
      localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(INITIAL_COMPANY));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, INITIAL_USERS[0].id);
      localStorage.setItem(STORAGE_KEYS.CHART_ACCOUNTS, JSON.stringify(INITIAL_CHART_ACCOUNTS));
      localStorage.setItem(STORAGE_KEYS.BANK_ACCOUNTS, JSON.stringify(INITIAL_BANK_ACCOUNTS));
      localStorage.setItem(STORAGE_KEYS.COUNTERPARTIES, JSON.stringify(INITIAL_COUNTERPARTIES));
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
      localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(INITIAL_CONTRACTS));
      localStorage.setItem(STORAGE_KEYS.TITLES, JSON.stringify(INITIAL_TITLES));
      localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(INITIAL_SETTLEMENTS));
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(INITIAL_MOVEMENTS));
      localStorage.setItem(STORAGE_KEYS.STATEMENT_ENTRIES, JSON.stringify(INITIAL_STATEMENT_ENTRIES));
      localStorage.setItem(STORAGE_KEYS.PERIOD_CLOSURES, JSON.stringify(INITIAL_PERIOD_CLOSURES));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
      localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(INITIAL_MODULES));
      localStorage.setItem(STORAGE_KEYS.IMPROVEMENTS, JSON.stringify(INITIAL_IMPROVEMENTS));
      localStorage.setItem(STORAGE_KEYS.BUDGET_PLANS, JSON.stringify(INITIAL_BUDGET_PLANS));
      localStorage.setItem(STORAGE_KEYS.CREDIT_CARDS, JSON.stringify(INITIAL_CREDIT_CARDS));
      localStorage.setItem(STORAGE_KEYS.CARD_PURCHASES, JSON.stringify(INITIAL_CARD_PURCHASES));
      localStorage.setItem(STORAGE_KEYS.CASH_COUNTS, JSON.stringify(INITIAL_CASH_COUNTS));
      this.notify();
    }
    // ensure budget plans exists even if already initialized
    if (!localStorage.getItem(STORAGE_KEYS.BUDGET_PLANS)) {
      localStorage.setItem(STORAGE_KEYS.BUDGET_PLANS, JSON.stringify(INITIAL_BUDGET_PLANS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CREDIT_CARDS)) {
      localStorage.setItem(STORAGE_KEYS.CREDIT_CARDS, JSON.stringify(INITIAL_CREDIT_CARDS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CARD_PURCHASES)) {
      localStorage.setItem(STORAGE_KEYS.CARD_PURCHASES, JSON.stringify(INITIAL_CARD_PURCHASES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CASH_COUNTS)) {
      localStorage.setItem(STORAGE_KEYS.CASH_COUNTS, JSON.stringify(INITIAL_CASH_COUNTS));
    }

    // Sync any newly added initial titles or settlements to existing storage
    try {
      const existingTitles = this.get<FinancialTitle[]>(STORAGE_KEYS.TITLES, []);
      const missingTitles = INITIAL_TITLES.filter(it => !existingTitles.some(et => et.id === it.id));
      if (missingTitles.length > 0) {
        localStorage.setItem(STORAGE_KEYS.TITLES, JSON.stringify([...existingTitles, ...missingTitles]));
      }

      // Also ensure initial credit card purchase titles are synced to TITLES (Contas a Pagar)
      const currentTitles = this.get<FinancialTitle[]>(STORAGE_KEYS.TITLES, []);
      const purchases = this.get<CreditCardPurchase[]>(STORAGE_KEYS.CARD_PURCHASES, INITIAL_CARD_PURCHASES);
      const cards = this.get<CreditCard[]>(STORAGE_KEYS.CREDIT_CARDS, INITIAL_CREDIT_CARDS);
      let titlesUpdated = false;
      const newTitlesToAdd: FinancialTitle[] = [];

      for (const pur of purchases) {
        const card = cards.find(c => c.id === pur.cardId);
        for (const inst of pur.installments) {
          const expectedTitleId = `title-cc-${pur.id}-${inst.installmentNumber}`;
          if (!currentTitles.some(t => t.id === expectedTitleId)) {
            newTitlesToAdd.push({
              id: expectedTitleId,
              companyId: 'comp-1',
              type: 'PAGAR',
              titleNumber: `CC-${card?.brand?.slice(0, 3) || 'CRD'}-${pur.id.slice(-4)}-${inst.installmentNumber}/${inst.totalInstallments}`,
              counterpartyId: pur.counterpartyId || 'prov-2',
              description: `[Cartão ${card?.name || 'Corporativo'}] ${pur.description} (${inst.installmentNumber}/${inst.totalInstallments})`,
              accountId: pur.chartAccountId || 'acc-desp-1',
              launchDate: pur.purchaseDate,
              competence: inst.competence,
              issueDate: pur.purchaseDate,
              dueDate: inst.dueDate,
              expectedCashDate: inst.dueDate,
              originalAmount: inst.amount,
              settledPrincipal: inst.settled ? inst.amount : 0,
              balancePrincipal: inst.settled ? 0 : inst.amount,
              accruedInterest: 0,
              accruedFine: 0,
              documentState: 'CONFIRMADO',
              settlementState: inst.settled ? 'LIQUIDADO' : 'ABERTO',
              originType: 'CARTAO_CREDITO',
              originId: pur.id,
              installmentIndex: inst.installmentNumber,
              totalInstallments: inst.totalInstallments,
              creditCardId: pur.cardId,
              creditCardInvoiceMonth: inst.invoiceMonth,
              isCreditCardPurchase: true,
              expectedBankAccountId: card?.defaultPaymentBankAccountId || 'bank-1',
              notes: `Parcela gerada automaticamente via Cartão de Crédito.`,
              createdAt: pur.createdAt,
              updatedAt: pur.createdAt
            });
            titlesUpdated = true;
          }
        }
      }

      if (titlesUpdated && newTitlesToAdd.length > 0) {
        localStorage.setItem(STORAGE_KEYS.TITLES, JSON.stringify([...currentTitles, ...newTitlesToAdd]));
      }

      const existingSettlements = this.get<Settlement[]>(STORAGE_KEYS.SETTLEMENTS, []);
      const missingSettlements = INITIAL_SETTLEMENTS.filter(is => !existingSettlements.some(es => es.id === is.id));
      if (missingSettlements.length > 0) {
        localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify([...existingSettlements, ...missingSettlements]));
      }
    } catch {
      // ignore parsing issues
    }
  }

  public resetToDefault() {
    this.initIfEmpty(true);
  }

  // Generic getter/setter
  private get<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
    this.notify();
  }

  // Company
  public getCompany(): CompanyProfile {
    return this.get(STORAGE_KEYS.COMPANY, INITIAL_COMPANY);
  }
  public saveCompany(comp: CompanyProfile) {
    this.set(STORAGE_KEYS.COMPANY, comp);
  }

  // Users
  public getUsers(): User[] {
    return this.get(STORAGE_KEYS.USERS, INITIAL_USERS);
  }
  public getCurrentUser(): User {
    const users = this.getUsers();
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    return users.find(u => u.id === currentId) || users[0];
  }
  public setCurrentUserId(id: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, id);
    this.notify();
  }
  public setCurrentUser(userOrId: User | string) {
    const id = typeof userOrId === 'string' ? userOrId : userOrId.id;
    this.setCurrentUserId(id);
  }
  public saveUsers(users: User[]) {
    this.set(STORAGE_KEYS.USERS, users);
  }

  // Chart of accounts
  public getChartAccounts(): ChartAccount[] {
    return this.get(STORAGE_KEYS.CHART_ACCOUNTS, INITIAL_CHART_ACCOUNTS);
  }
  public saveChartAccounts(accounts: ChartAccount[]) {
    this.set(STORAGE_KEYS.CHART_ACCOUNTS, accounts);
  }

  // Banks
  public getBankAccounts(): BankAccount[] {
    return this.get(STORAGE_KEYS.BANK_ACCOUNTS, INITIAL_BANK_ACCOUNTS);
  }
  public saveBankAccounts(banks: BankAccount[]) {
    this.set(STORAGE_KEYS.BANK_ACCOUNTS, banks);
  }

  // Counterparties (Clients/Suppliers)
  public getCounterparties(): Counterparty[] {
    return this.get(STORAGE_KEYS.COUNTERPARTIES, INITIAL_COUNTERPARTIES);
  }
  public getPersons(): Counterparty[] {
    return this.getCounterparties();
  }
  public saveCounterparties(parties: Counterparty[]) {
    this.set(STORAGE_KEYS.COUNTERPARTIES, parties);
  }

  // Services
  public getServices(): ServiceItem[] {
    return this.get(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  }
  public saveServices(services: ServiceItem[]) {
    this.set(STORAGE_KEYS.SERVICES, services);
  }

  // Contracts
  public getContracts(): Contract[] {
    return this.get(STORAGE_KEYS.CONTRACTS, INITIAL_CONTRACTS);
  }
  public saveContracts(contracts: Contract[]) {
    this.set(STORAGE_KEYS.CONTRACTS, contracts);
  }

  // Titles (Receivables & Payables)
  public getTitles(): FinancialTitle[] {
    return this.get(STORAGE_KEYS.TITLES, INITIAL_TITLES);
  }
  public saveTitles(titles: FinancialTitle[]) {
    this.set(STORAGE_KEYS.TITLES, titles);
  }

  // Settlements (Baixas)
  public getSettlements(): Settlement[] {
    return this.get(STORAGE_KEYS.SETTLEMENTS, INITIAL_SETTLEMENTS);
  }
  public saveSettlements(settlements: Settlement[]) {
    this.set(STORAGE_KEYS.SETTLEMENTS, settlements);
  }

  // Financial Movements
  public getMovements(): FinancialMovement[] {
    return this.get(STORAGE_KEYS.MOVEMENTS, INITIAL_MOVEMENTS);
  }
  public saveMovements(movements: FinancialMovement[]) {
    this.set(STORAGE_KEYS.MOVEMENTS, movements);
  }

  // Statement entries
  public getStatementEntries(): StatementEntry[] {
    return this.get(STORAGE_KEYS.STATEMENT_ENTRIES, INITIAL_STATEMENT_ENTRIES);
  }
  public saveStatementEntries(entries: StatementEntry[]) {
    this.set(STORAGE_KEYS.STATEMENT_ENTRIES, entries);
  }

  // Period Closures
  public getPeriodClosures(): PeriodClosure[] {
    return this.get(STORAGE_KEYS.PERIOD_CLOSURES, INITIAL_PERIOD_CLOSURES);
  }
  public savePeriodClosures(closures: PeriodClosure[]) {
    this.set(STORAGE_KEYS.PERIOD_CLOSURES, closures);
  }

  // Audit Logs
  public getAuditLogs(): AuditLogEntry[] {
    return this.get(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }
  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const logs = this.getAuditLogs();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.set(STORAGE_KEYS.AUDIT_LOGS, [newEntry, ...logs]);
  }

  // Modules
  public getModules(): ModuleConfig[] {
    return this.get(STORAGE_KEYS.MODULES, INITIAL_MODULES);
  }
  public saveModules(modules: ModuleConfig[]) {
    this.set(STORAGE_KEYS.MODULES, modules);
  }

  // Improvements
  public getImprovements(): ImprovementRequest[] {
    return this.get(STORAGE_KEYS.IMPROVEMENTS, INITIAL_IMPROVEMENTS);
  }
  public saveImprovements(imps: ImprovementRequest[]) {
    this.set(STORAGE_KEYS.IMPROVEMENTS, imps);
  }
  public getImprovementRequests(): ImprovementRequest[] {
    return this.getImprovements();
  }
  public saveImprovementRequests(imps: ImprovementRequest[]) {
    this.saveImprovements(imps);
  }

  // Budget Plans
  public getBudgetPlans(): AnnualBudgetPlan[] {
    return this.get(STORAGE_KEYS.BUDGET_PLANS, INITIAL_BUDGET_PLANS);
  }

  public getBudgetPlan(year: number): AnnualBudgetPlan {
    const plans = this.getBudgetPlans();
    let plan = plans.find(p => p.year === year);
    if (!plan) {
      plan = {
        id: `budget-${year}`,
        year,
        name: `Orçamento Anual ${year}`,
        updatedAt: new Date().toISOString(),
        notes: `Planejamento orçamentário anual para o exercício ${year}.`,
        items: []
      };
    }
    return plan;
  }

  public saveBudgetPlan(plan: AnnualBudgetPlan) {
    const plans = this.getBudgetPlans();
    const existingIndex = plans.findIndex(p => p.year === plan.year);
    let updated: AnnualBudgetPlan[];
    if (existingIndex >= 0) {
      updated = [...plans];
      updated[existingIndex] = { ...plan, updatedAt: new Date().toISOString() };
    } else {
      updated = [...plans, { ...plan, updatedAt: new Date().toISOString() }];
    }
    this.set(STORAGE_KEYS.BUDGET_PLANS, updated);
  }

  // Global Period Filter
  public getGlobalPeriodFilter(): GlobalPeriodFilter {
    return this.get(STORAGE_KEYS.GLOBAL_PERIOD_FILTER, DEFAULT_GLOBAL_PERIOD_FILTER);
  }

  public saveGlobalPeriodFilter(filter: GlobalPeriodFilter) {
    this.set(STORAGE_KEYS.GLOBAL_PERIOD_FILTER, filter);
  }

  // Dashboard Config
  public getDashboardConfig(): DashboardConfig {
    return this.get(STORAGE_KEYS.DASHBOARD_CONFIG, DEFAULT_DASHBOARD_CONFIG);
  }

  public saveDashboardConfig(config: DashboardConfig) {
    this.set(STORAGE_KEYS.DASHBOARD_CONFIG, config);
  }

  // Fast add counterparty
  public addCounterparty(party: Counterparty) {
    const list = this.getCounterparties();
    this.saveCounterparties([party, ...list]);
  }

  // Update a single title
  public updateTitle(titleId: string, updates: Partial<FinancialTitle>) {
    const titles = this.getTitles();
    const updated = titles.map(t => {
      if (t.id === titleId) {
        return {
          ...t,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    this.saveTitles(updated);
  }

  // Batch update titles
  public batchUpdateTitles(ids: string[], updates: Partial<FinancialTitle>): number {
    const setIds = new Set(ids);
    const titles = this.getTitles();
    let count = 0;
    const updated = titles.map(t => {
      if (setIds.has(t.id)) {
        count++;
        return {
          ...t,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    this.saveTitles(updated);
    return count;
  }

  // Batch cancel titles
  public batchCancelTitles(ids: string[]): { cancelledCount: number; ignoredCount: number } {
    const setIds = new Set(ids);
    const titles = this.getTitles();
    let cancelledCount = 0;
    let ignoredCount = 0;
    const updated = titles.map(t => {
      if (setIds.has(t.id)) {
        if (t.settledPrincipal > 0 || t.documentState === 'CANCELADO') {
          ignoredCount++;
          return t;
        }
        cancelledCount++;
        return {
          ...t,
          documentState: 'CANCELADO' as const,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    this.saveTitles(updated);
    return { cancelledCount, ignoredCount };
  }

  // Duplicate titles (single or multiple)
  public duplicateTitles(ids: string[], advanceMonth: boolean = false): FinancialTitle[] {
    const setIds = new Set(ids);
    const titles = this.getTitles();
    const sourceTitles = titles.filter(t => setIds.has(t.id));
    const newTitles: FinancialTitle[] = [];

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    for (const src of sourceTitles) {
      let nextCompetence = src.competence;
      let nextDueDate = src.dueDate;
      let nextExpectedCashDate = src.expectedCashDate || src.dueDate;

      if (advanceMonth) {
        const [cYear, cMonth] = src.competence.split('-').map(Number);
        const nextMonthDate = new Date(cYear, cMonth, 1); // cMonth is 1-based, new Date(y, m, 1) advances 1 month
        const ny = nextMonthDate.getFullYear();
        const nm = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
        nextCompetence = `${ny}-${nm}`;

        // Advance due date by ~1 month
        const dParts = src.dueDate.split('-').map(Number);
        const dueObj = new Date(dParts[0], dParts[1], dParts[2]);
        const nextDueMonth = String(dueObj.getMonth() + 1).padStart(2, '0');
        const nextDueDay = String(dueObj.getDate()).padStart(2, '0');
        nextDueDate = `${dueObj.getFullYear()}-${nextDueMonth}-${nextDueDay}`;
        nextExpectedCashDate = nextDueDate;
      }

      const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
      const prefix = src.type === 'RECEBER' ? 'REC' : 'PAG';
      const year = now.getFullYear();

      const cloned: FinancialTitle = {
        ...src,
        id: `tit-${Date.now()}-${randomSuffix}`,
        titleNumber: `${prefix}-${year}-${randomSuffix}`,
        description: `${src.description} (Cópia)`,
        competence: nextCompetence,
        dueDate: nextDueDate,
        expectedCashDate: nextExpectedCashDate,
        launchDate: today,
        issueDate: today,
        settledPrincipal: 0,
        balancePrincipal: src.originalAmount,
        accruedInterest: 0,
        accruedFine: 0,
        documentState: 'CONFIRMADO',
        settlementState: 'ABERTO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      newTitles.push(cloned);
    }

    if (newTitles.length > 0) {
      this.saveTitles([...newTitles, ...titles]);
    }
    return newTitles;
  }

  // ==========================================
  // CREDIT CARDS & PURCHASES
  // ==========================================
  public getCreditCards(): CreditCard[] {
    return this.get<CreditCard[]>(STORAGE_KEYS.CREDIT_CARDS, INITIAL_CREDIT_CARDS);
  }

  public saveCreditCards(cards: CreditCard[]) {
    this.set(STORAGE_KEYS.CREDIT_CARDS, cards);
  }

  public addCreditCard(card: CreditCard) {
    const cards = this.getCreditCards();
    this.saveCreditCards([...cards, card]);
  }

  public getCardPurchases(): CreditCardPurchase[] {
    return this.get<CreditCardPurchase[]>(STORAGE_KEYS.CARD_PURCHASES, INITIAL_CARD_PURCHASES);
  }

  public saveCardPurchases(purchases: CreditCardPurchase[]) {
    this.set(STORAGE_KEYS.CARD_PURCHASES, purchases);
  }

  public addCardPurchaseAndSyncTitles(purchase: CreditCardPurchase) {
    const purchases = this.getCardPurchases();
    this.saveCardPurchases([purchase, ...purchases]);

    // Also sync installments to FinancialTitle (Contas a Pagar)
    const cards = this.getCreditCards();
    const card = cards.find(c => c.id === purchase.cardId);
    const titles = this.getTitles();
    const newTitles: FinancialTitle[] = [];

    for (const inst of purchase.installments) {
      const titleId = `title-cc-${purchase.id}-${inst.installmentNumber}`;
      newTitles.push({
        id: titleId,
        companyId: 'comp-1',
        type: 'PAGAR',
        titleNumber: `CC-${card?.brand?.slice(0, 3) || 'CRD'}-${purchase.id.slice(-4)}-${inst.installmentNumber}/${inst.totalInstallments}`,
        counterpartyId: purchase.counterpartyId || 'prov-2',
        description: `[Cartão ${card?.name || 'Corporativo'}] ${purchase.description} (${inst.installmentNumber}/${inst.totalInstallments})`,
        accountId: purchase.chartAccountId || 'acc-desp-1',
        launchDate: purchase.purchaseDate,
        competence: inst.competence,
        issueDate: purchase.purchaseDate,
        dueDate: inst.dueDate,
        expectedCashDate: inst.dueDate,
        originalAmount: inst.amount,
        settledPrincipal: 0,
        balancePrincipal: inst.amount,
        accruedInterest: 0,
        accruedFine: 0,
        documentState: 'CONFIRMADO',
        settlementState: 'ABERTO',
        originType: 'CARTAO_CREDITO',
        originId: purchase.id,
        installmentIndex: inst.installmentNumber,
        totalInstallments: inst.totalInstallments,
        creditCardId: purchase.cardId,
        creditCardInvoiceMonth: inst.invoiceMonth,
        isCreditCardPurchase: true,
        expectedBankAccountId: card?.defaultPaymentBankAccountId || 'bank-1',
        notes: `Parcela de Cartão de Crédito - Fatura ${inst.invoiceMonth}`,
        createdAt: purchase.createdAt,
        updatedAt: purchase.createdAt
      });
    }

    this.saveTitles([...newTitles, ...titles]);
  }

  public getCardInvoicePayments(): CreditCardInvoicePayment[] {
    return this.get<CreditCardInvoicePayment[]>(STORAGE_KEYS.CARD_INVOICE_PAYMENTS, []);
  }

  public saveCardInvoicePayments(payments: CreditCardInvoicePayment[]) {
    this.set(STORAGE_KEYS.CARD_INVOICE_PAYMENTS, payments);
  }

  public addCardInvoicePayment(payment: CreditCardInvoicePayment) {
    const current = this.getCardInvoicePayments();
    this.saveCardInvoicePayments([payment, ...current]);
  }

  // ==========================================
  // CASH COUNT (CAIXA FÍSICO / CONTADOR DE CÉDULAS E MOEDAS)
  // ==========================================
  public getCashCounts(): CashCountRecord[] {
    return this.get<CashCountRecord[]>(STORAGE_KEYS.CASH_COUNTS, INITIAL_CASH_COUNTS);
  }

  public saveCashCounts(counts: CashCountRecord[]) {
    this.set(STORAGE_KEYS.CASH_COUNTS, counts);
  }

  public addCashCount(count: CashCountRecord) {
    const counts = this.getCashCounts();
    this.saveCashCounts([count, ...counts]);
  }

  // Full backup / restore
  public exportFullBackup(): string {
    const backup: Record<string, unknown> = {};
    for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
      try {
        const val = localStorage.getItem(storageKey);
        backup[key] = val ? JSON.parse(val) : null;
      } catch {
        // ignore
      }
    }
    return JSON.stringify(backup, null, 2);
  }

  public importFullBackup(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
        if (data[key] !== undefined) {
          localStorage.setItem(storageKey, JSON.stringify(data[key]));
        }
      }
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  // Theme Management (Futurismo Clean Dark / Light)
  public getTheme(): 'dark' | 'light' {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // fallback
    }
    return 'dark'; // Dark theme default as per Prompt Mestre 17.1
  }

  public setTheme(theme: 'dark' | 'light') {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {
      // fallback
    }
    this.notify();
  }
}

export const storage = new StorageService();
