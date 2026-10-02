import { 
  CompanyProfile, 
  User, 
  Counterparty, 
  ServiceItem, 
  Contract, 
  ContractStatus,
  ContractStatusHistoryEntry,
  Sale,
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
  BudgetVersion,
  BudgetChangeRecord,
  GlobalPeriodFilter,
  DashboardConfig,
  BatchEditOptions,
  CreditCard,
  CreditCardPurchase,
  CreditCardInvoicePayment,
  CashCountRecord,
  SavedCashSimulationScenario,
  ClientDelinquencySetting,
  ReconciliationRule,
  BankBalanceClosingRecord
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
import { INITIAL_RECONCILIATION_RULES } from '../data/reconciliationRulesData';
import { advanceCompetence, addMonthsSafe } from '../utils/dateUtils';

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
  BUDGET_VERSIONS: 'contaju_budget_versions',
  CREDIT_CARDS: 'contaju_credit_cards',
  CARD_PURCHASES: 'contaju_card_purchases',
  CARD_INVOICE_PAYMENTS: 'contaju_card_invoice_payments',
  CASH_COUNTS: 'contaju_cash_counts',
  GLOBAL_PERIOD_FILTER: 'contaju_global_period_filter',
  DASHBOARD_CONFIG: 'contaju_dashboard_config',
  CASH_SIMULATION_SCENARIOS: 'contaju_cash_simulation_scenarios',
  RECONCILIATION_RULES: 'contaju_reconciliation_rules',
  SALES: 'contaju_sales',
  THEME: 'contaju_theme',
  DELETED_TITLE_IDS: 'contaju_deleted_title_ids',
  DELETED_SALE_IDS: 'contaju_deleted_sale_ids',
  BANK_CLOSINGS: 'contaju_bank_closings',
  AUTH_SESSION: 'contaju_auth_session'
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
    'widget_avisos_pendentes',
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
  private debouncedSyncTimeout: any = null;

  constructor() {
    this.initIfEmpty();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private triggerAutoSyncIfConfigured() {
    if (typeof window === 'undefined') return;
    try {
      const autoSyncSaved = localStorage.getItem('contaju_supabase_auto_sync');
      const isAutoSync = autoSyncSaved !== null ? autoSyncSaved === 'true' : true;
      const hasUrl = localStorage.getItem('contaju_supabase_url') || (import.meta.env.VITE_SUPABASE_URL as string | undefined);
      const hasKey = localStorage.getItem('contaju_supabase_anon_key') || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

      if (isAutoSync && hasUrl && hasKey) {
        if (this.debouncedSyncTimeout) {
          clearTimeout(this.debouncedSyncTimeout);
        }
        this.debouncedSyncTimeout = setTimeout(async () => {
          try {
            const { supabaseSync } = await import('./supabaseSyncService');
            await supabaseSync.syncAllToSupabase();
          } catch {
            // falha silenciosa para garantir isolamento total e nunca quebrar a UI
          }
        }, 3000);
      }
    } catch {
      // ignore
    }
  }

  private notify() {
    // Agendado no próximo tick para evitar "Cannot update a component while rendering a different component"
    setTimeout(() => {
      this.listeners.forEach(fn => fn());
    }, 0);
    this.triggerAutoSyncIfConfigured();
  }

  public initIfEmpty(force = false) {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    
    const DATA_SCHEMA_VERSION = 'v5_clean_zero_state';
    const SCHEMA_KEY = 'contaju_schema_version';
    const currentSchema = localStorage.getItem(SCHEMA_KEY);

    if (force || currentSchema !== DATA_SCHEMA_VERSION) {
      // Limpeza de todos os dados mockados/transacionais para estado 100% zerado
      localStorage.setItem(STORAGE_KEYS.TITLES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.STATEMENT_ENTRIES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PERIOD_CLOSURES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.IMPROVEMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BUDGET_PLANS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BUDGET_VERSIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CREDIT_CARDS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CARD_PURCHASES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CARD_INVOICE_PAYMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CASH_COUNTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.COUNTERPARTIES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BANK_ACCOUNTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BANK_CLOSINGS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CASH_SIMULATION_SCENARIOS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.RECONCILIATION_RULES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.DELETED_TITLE_IDS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.DELETED_SALE_IDS, JSON.stringify([]));

      // Garantir perfis essenciais e cadastros base (usuários para login e plano de contas)
      if (!localStorage.getItem(STORAGE_KEYS.COMPANY) || force) {
        localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(INITIAL_COMPANY));
      }
      if (!localStorage.getItem(STORAGE_KEYS.USERS) || force) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, INITIAL_USERS[0].id);
      }
      if (!localStorage.getItem(STORAGE_KEYS.CHART_ACCOUNTS) || force) {
        localStorage.setItem(STORAGE_KEYS.CHART_ACCOUNTS, JSON.stringify(INITIAL_CHART_ACCOUNTS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.MODULES) || force) {
        localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(INITIAL_MODULES));
      }

      localStorage.setItem(SCHEMA_KEY, DATA_SCHEMA_VERSION);
      this.notify();
    }
    // ensure budget plans exists even if already initialized
    if (!localStorage.getItem(STORAGE_KEYS.BUDGET_PLANS)) {
      localStorage.setItem(STORAGE_KEYS.BUDGET_PLANS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CREDIT_CARDS)) {
      localStorage.setItem(STORAGE_KEYS.CREDIT_CARDS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CARD_PURCHASES)) {
      localStorage.setItem(STORAGE_KEYS.CARD_PURCHASES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CASH_COUNTS)) {
      localStorage.setItem(STORAGE_KEYS.CASH_COUNTS, JSON.stringify([]));
    }

    // Sync any newly added initial titles or settlements to existing storage ONLY on first initialization or if not deleted
    try {
      const isAlreadyInitialized = !!localStorage.getItem(STORAGE_KEYS.COMPANY);
      const deletedIds = new Set(this.get<string[]>(STORAGE_KEYS.DELETED_TITLE_IDS, []));

      // Se o sistema já foi inicializado anteriormente pelo usuário, NÃO ressuscitar títulos que foram deletados
      if (!isAlreadyInitialized) {
        const existingTitles = this.get<FinancialTitle[]>(STORAGE_KEYS.TITLES, []);
        const missingTitles = INITIAL_TITLES.filter(it => !existingTitles.some(et => et.id === it.id) && !deletedIds.has(it.id));
        if (missingTitles.length > 0) {
          localStorage.setItem(STORAGE_KEYS.TITLES, JSON.stringify([...existingTitles, ...missingTitles]));
        }

        const existingSettlements = this.get<Settlement[]>(STORAGE_KEYS.SETTLEMENTS, []);
        const missingSettlements = INITIAL_SETTLEMENTS.filter(is => !existingSettlements.some(es => es.id === is.id));
        if (missingSettlements.length > 0) {
          localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify([...existingSettlements, ...missingSettlements]));
        }
      }

      // Also ensure initial credit card purchase titles are synced to TITLES (Contas a Pagar) ONLY if not deleted
      const currentTitles = this.get<FinancialTitle[]>(STORAGE_KEYS.TITLES, []);
      const purchases = this.get<CreditCardPurchase[]>(STORAGE_KEYS.CARD_PURCHASES, INITIAL_CARD_PURCHASES);
      const cards = this.get<CreditCard[]>(STORAGE_KEYS.CREDIT_CARDS, INITIAL_CREDIT_CARDS);
      let titlesUpdated = false;
      const newTitlesToAdd: FinancialTitle[] = [];

      for (const pur of purchases) {
        const card = cards.find(c => c.id === pur.cardId);
        for (const inst of pur.installments) {
          const expectedTitleId = `title-cc-${pur.id}-${inst.installmentNumber}`;
          if (!currentTitles.some(t => t.id === expectedTitleId || (t.originType === 'CARTAO_CREDITO' && t.originId === pur.id && t.installmentIndex === inst.installmentNumber)) && !deletedIds.has(expectedTitleId)) {
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
    } catch {
      // ignore parsing issues
    }
  }

  public resetToDefault() {
    this.initIfEmpty(true);
  }

  // Generic getter/setter
  private get<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return fallback;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, value: T) {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
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

  // Users & Authentication
  public getUsers(): User[] {
    const rawUsers = this.get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    // Assegura que todo usuário tenha senha padrão se for nula
    return rawUsers.map(u => ({
      ...u,
      password: u.password || 'contaju123'
    }));
  }

  public isAuthenticated(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
    const session = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    return !!session;
  }

  public getCurrentUser(): User {
    const users = this.getUsers();
    const sessionStr = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    let activeId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);

    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.userId) {
          activeId = session.userId;
        }
      } catch {
        // ignore
      }
    }

    return users.find(u => u.id === activeId) || users[0];
  }

  public setCurrentUserId(id: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, id);
    if (this.isAuthenticated()) {
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify({
        userId: id,
        loggedAt: new Date().toISOString()
      }));
    }
    this.notify();
  }

  public setCurrentUser(userOrId: User | string) {
    const id = typeof userOrId === 'string' ? userOrId : userOrId.id;
    this.setCurrentUserId(id);
  }

  public login(email: string, password?: string): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.trim().toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, error: 'Usuário não cadastrado com este e-mail corporativo.' };
    }

    if (user.status === 'PENDENTE') {
      return { 
        success: false, 
        error: 'Sua solicitação de cadastro foi recebida com sucesso e aguarda aprovação do administrador (leonardoricardoarantes@gmail.com). Você poderá acessar o sistema assim que for aprovado.' 
      };
    }

    if (user.status === 'INATIVO') {
      return { success: false, error: 'Este usuário está inativo. Solicite liberação ao administrador.' };
    }

    const expectedPass = user.password || 'contaju123';
    // Aceita a senha do usuário, a senha padrão contaju123 ou se estiver vazia em modo teste
    if (password && password.trim() !== expectedPass && password.trim() !== 'contaju123') {
      return { success: false, error: 'Senha incorreta. Verifique e tente novamente.' };
    }

    // Grava sessão
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      loggedAt: new Date().toISOString()
    }));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);

    try {
      this.addAuditLog({
        userName: user.name,
        userRole: user.role,
        action: 'LOGIN',
        module: 'Autenticação',
        recordId: user.id,
        details: `Login autorizado com sucesso para o usuário ${user.name} (${user.role}).`
      });
    } catch {
      // ignore
    }

    this.notify();
    return { success: true, user };
  }

  public async registerUser(
    name: string, 
    email: string, 
    password: string, 
    requestedRole: UserRole = 'OPERADOR'
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();

    if (users.some(u => u.email.trim().toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Já existe um cadastro com este e-mail corporativo.' };
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      role: requestedRole,
      status: 'PENDENTE',
      password: password.trim(),
      createdAt: new Date().toISOString()
    };

    const updated = [...users, newUser];
    this.saveUsers(updated);

    try {
      this.addAuditLog({
        userName: newUser.name,
        userRole: newUser.role,
        action: 'SOLICITACAO_CADASTRO',
        module: 'Autenticação',
        recordId: newUser.id,
        details: `Novo cadastro solicitado por ${newUser.name} (${newUser.email}). Notificação enviada para leonardoricardoarantes@gmail.com.`
      });
    } catch {
      // ignore
    }

    // Notificar administrador via Resend
    try {
      const { resendService } = await import('./resendService');
      await resendService.sendRegistrationApprovalEmail({
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt || new Date().toISOString()
      });
    } catch (err) {
      console.warn('Falha no disparo em background do e-mail de aprovação:', err);
    }

    this.notify();
    return { success: true, user: newUser };
  }

  public approveUser(userId: string, approvedBy?: string): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, error: 'Usuário não localizado.' };
    }

    const currentAdmin = this.getCurrentUser();
    const approver = approvedBy || currentAdmin?.name || 'Administrador Geral';

    const updated = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'ATIVO' as const,
          approvedAt: new Date().toISOString(),
          approvedBy: approver
        };
      }
      return u;
    });

    this.saveUsers(updated);

    try {
      this.addAuditLog({
        userName: approver,
        userRole: currentAdmin?.role || 'ADMIN',
        action: 'APROVACAO_USUARIO',
        module: 'Usuários e Permissões',
        recordId: target.id,
        details: `Acesso aprovado para o colaborador ${target.name} (${target.email}).`
      });
    } catch {
      // ignore
    }

    this.notify();
    return { success: true, user: updated.find(u => u.id === userId) };
  }

  public rejectUser(userId: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, error: 'Usuário não localizado.' };
    }

    const currentAdmin = this.getCurrentUser();
    const updated = users.filter(u => u.id !== userId);
    this.saveUsers(updated);

    try {
      this.addAuditLog({
        userName: currentAdmin?.name || 'Administrador Geral',
        userRole: currentAdmin?.role || 'ADMIN',
        action: 'REJEICAO_USUARIO',
        module: 'Usuários e Permissões',
        recordId: target.id,
        details: `Solicitação de acesso rejeitada/removida para ${target.name} (${target.email}).`
      });
    } catch {
      // ignore
    }

    this.notify();
    return { success: true };
  }

  public logout(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const user = this.getCurrentUser();
    try {
      this.addAuditLog({
        userName: user?.name || 'Sistema',
        userRole: user?.role || 'CONSULTA',
        action: 'LOGOUT',
        module: 'Autenticação',
        recordId: user?.id || 'logout',
        details: `Sessão encerrada com segurança.`
      });
    } catch {
      // ignore
    }
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    this.notify();
  }

  public updateUserPassword(userId: string, newPass: string): boolean {
    const users = this.getUsers();
    const updated = users.map(u => u.id === userId ? { ...u, password: newPass } : u);
    this.saveUsers(updated);
    return true;
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

  // Sales (Vendas & Faturamento vinculado a Contratos e Avulsos)
  public getSales(): Sale[] {
    const rawSales = this.get<Sale[]>(STORAGE_KEYS.SALES, []);
    const deletedSaleIds = new Set(this.get<string[]>(STORAGE_KEYS.DELETED_SALE_IDS, []));
    const sales = rawSales.filter(s => !deletedSaleIds.has(s.id));

    // Auto-sync: sincroniza faturas de contratos e vendas para garantir vínculo 100% íntegro
    const titles = this.getTitles();
    const billingTitles = titles.filter(t => 
      t.type === 'RECEBER' && 
      (t.originType === 'CONTRATO' || t.originType === 'VENDA') && 
      t.documentState !== 'CANCELADO'
    );
    
    const contracts = this.getContracts();
    let hasNew = false;
    const existingSaleIds = new Set(sales.map(s => s.id));
    const existingTitleIdsInSales = new Set(sales.flatMap(s => s.titleIds || []));

    for (const t of billingTitles) {
      if (t.id && !existingTitleIdsInSales.has(t.id)) {
        const contract = contracts.find(c => 
          c.id === t.originId || 
          c.id === t.contractId || 
          c.contractNumber === t.contractNumber ||
          c.contractNumber === t.originId
        );
        const saleId = t.saleId || `sale-${t.originType === 'CONTRATO' ? 'ctr' : 'venda'}-${t.id}`;
        
        if (!existingSaleIds.has(saleId) && !deletedSaleIds.has(saleId)) {
          const comp = t.competence || (t.dueDate ? t.dueDate.substring(0, 7) : new Date().toISOString().substring(0, 7));
          const generatedSaleNumber = t.saleNumber || (t.titleNumber ? `VEN-${t.titleNumber.replace('FAT-', '').replace('TB-', 'TB-')}` : `VEN-${t.id.slice(-6)}`);
          
          const newSale: Sale = {
            id: saleId,
            saleNumber: generatedSaleNumber,
            customerId: t.counterpartyId,
            competence: comp,
            date: t.issueDate || t.launchDate || new Date().toISOString().split('T')[0],
            items: [
              {
                id: `item-${t.id}`,
                serviceId: contract?.items?.[0]?.serviceId || 'srv-1',
                description: t.description || (contract ? `Mensalidade Contrato ${contract.contractNumber}` : 'Faturamento de Venda'),
                quantity: 1,
                unitPrice: t.originalAmount,
                discount: 0,
                total: t.originalAmount,
                accountId: t.accountId || 'acc-1.1.01'
              }
            ],
            grossTotal: t.originalAmount,
            discountTotal: 0,
            netTotal: t.originalAmount,
            installmentsCount: t.totalInstallments || 1,
            notes: contract ? `Venda gerada do Contrato ${contract.contractNumber}` : (t.notes || 'Faturamento de serviço avulso'),
            createdAt: t.createdAt || new Date().toISOString(),
            originType: t.originType === 'CONTRATO' ? 'CONTRATO' : 'AVULSO',
            contractId: contract?.id || t.contractId,
            contractNumber: contract?.contractNumber || t.contractNumber,
            status: 'CONFIRMADA',
            titleIds: [t.id]
          };
          sales.push(newSale);
          existingSaleIds.add(saleId);
          existingTitleIdsInSales.add(t.id);
          hasNew = true;
        }
      }
    }

    if (hasNew && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    }

    return sales;
  }

  public saveSales(sales: Sale[]): void {
    this.set(STORAGE_KEYS.SALES, sales);
  }

  public addSale(sale: Sale): void {
    const sales = this.getSales();
    this.saveSales([sale, ...sales]);
  }

  public updateSale(updatedSale: Sale, updateLinkedTitles = true): void {
    const sales = this.getSales();
    const existingSale = sales.find(s => s.id === updatedSale.id);
    this.saveSales(sales.map(s => s.id === updatedSale.id ? updatedSale : s));

    if (updateLinkedTitles && existingSale) {
      const titles = this.getTitles();
      const linkedTitleIds = new Set(updatedSale.titleIds || existingSale.titleIds || []);
      
      const updatedTitles = titles.map(t => {
        const isLinked = t.saleId === updatedSale.id || 
          linkedTitleIds.has(t.id) || 
          (updatedSale.contractId && (t.originId === updatedSale.contractId || t.contractId === updatedSale.contractId) && t.competence === existingSale.competence);

        if (isLinked) {
          const isSettled = t.settlementState === 'LIQUIDADO';
          const newAmount = updatedSale.netTotal || updatedSale.grossTotal;
          const totalInst = t.totalInstallments || updatedSale.installmentsCount || 1;
          const installmentAmount = totalInst > 1 ? Number((newAmount / totalInst).toFixed(2)) : newAmount;

          const updatedDocState = updatedSale.status === 'CANCELADA' && !isSettled 
            ? ('CANCELADO' as const) 
            : t.documentState;

          return {
            ...t,
            counterpartyId: updatedSale.customerId,
            competence: updatedSale.competence || t.competence,
            description: updatedSale.items?.[0]?.description 
              ? `${updatedSale.items[0].description}${totalInst > 1 ? ` (Parcela ${t.installmentIndex || 1}/${totalInst})` : ''}` 
              : t.description,
            originalAmount: !isSettled ? installmentAmount : t.originalAmount,
            balancePrincipal: !isSettled ? Math.max(0, installmentAmount - (t.settledPrincipal || 0)) : t.balancePrincipal,
            accountId: updatedSale.items?.[0]?.accountId || t.accountId,
            documentState: updatedDocState,
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });

      this.saveTitles(updatedTitles);
    }
  }

  public deleteSale(id: string, options?: { deleteLinkedTitles?: boolean }): { success: boolean; deletedTitlesCount: number } {
    const sales = this.getSales();
    const saleToDelete = sales.find(s => s.id === id);
    if (!saleToDelete) return { success: false, deletedTitlesCount: 0 };

    this.saveSales(sales.filter(s => s.id !== id));

    // Registrar ID de venda excluída para evitar ressuscitação automática
    const currentDeletedSales = this.get<string[]>(STORAGE_KEYS.DELETED_SALE_IDS, []);
    this.set(STORAGE_KEYS.DELETED_SALE_IDS, Array.from(new Set([...currentDeletedSales, id])));

    let deletedTitlesCount = 0;
    if (options?.deleteLinkedTitles !== false) {
      const titles = this.getTitles();
      const linkedTitleIds = new Set(saleToDelete.titleIds || []);
      const titleIdsToDelete = titles
        .filter(t => 
          t.saleId === id || 
          linkedTitleIds.has(t.id) || 
          (saleToDelete.contractId && (t.originId === saleToDelete.contractId || t.contractId === saleToDelete.contractId) && t.competence === saleToDelete.competence)
        )
        // Se ainda não estiver liquidado, exclui definitivamente
        .filter(t => t.settlementState !== 'LIQUIDADO')
        .map(t => t.id);

      if (titleIdsToDelete.length > 0) {
        this.batchDeleteTitles(titleIdsToDelete);
        deletedTitlesCount = titleIdsToDelete.length;
      }
    }

    return { success: true, deletedTitlesCount };
  }

  public cancelOrInactivateContract(
    contractId: string, 
    options: {
      status: 'CANCELADO' | 'INATIVO' | 'ENCERRADO';
      cancellationDate: string; // YYYY-MM-DD
      cancellationReason: string;
      cancellationNotes?: string;
      inactivateClient?: boolean;
      cancelPendingTitlesAfterDate?: boolean;
    }
  ): { success: boolean; message: string; cancelledTitlesCount: number } {
    const contracts = this.getContracts();
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return { success: false, message: 'Contrato não encontrado.', cancelledTitlesCount: 0 };

    const currentUser = this.getCurrentUser();
    const nowIso = new Date().toISOString();

    const updatedContracts = contracts.map(c => {
      if (c.id === contractId) {
        const historyEntry: ContractStatusHistoryEntry = {
          id: `csh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          contractId,
          previousStatus: c.status,
          newStatus: options.status,
          changedAt: nowIso,
          changedBy: currentUser.name,
          userRole: currentUser.role,
          reason: options.cancellationReason,
          notes: options.cancellationNotes,
          effectiveDate: options.cancellationDate
        };

        return {
          ...c,
          status: options.status,
          cancellationDate: options.cancellationDate,
          cancellationReason: options.cancellationReason,
          cancellationNotes: options.cancellationNotes,
          inactivatedAt: nowIso,
          inactivatedBy: currentUser.name,
          statusHistory: [historyEntry, ...(c.statusHistory || [])]
        };
      }
      return c;
    });
    this.saveContracts(updatedContracts);

    // Cancel pending titles if requested
    let cancelledTitlesCount = 0;
    if (options.cancelPendingTitlesAfterDate) {
      const titles = this.getTitles();
      const cancellationMonth = options.cancellationDate.substring(0, 7);
      
      const updatedTitles = titles.map(t => {
        if (
          t.originType === 'CONTRATO' && 
          t.originId === contractId && 
          t.settlementState !== 'LIQUIDADO' &&
          t.documentState !== 'CANCELADO' &&
          (t.dueDate >= options.cancellationDate || (t.competence && t.competence >= cancellationMonth))
        ) {
          cancelledTitlesCount++;
          return {
            ...t,
            documentState: 'CANCELADO' as const,
            notes: `${t.notes ? t.notes + ' • ' : ''}Título cancelado devido ao encerramento/cancelamento do contrato a partir de ${options.cancellationDate}. Motivo: ${options.cancellationReason}`
          };
        }
        return t;
      });

      if (cancelledTitlesCount > 0) {
        this.saveTitles(updatedTitles);
      }
    }

    // Inactivate client if requested
    if (options.inactivateClient && contract.customerId) {
      const counterparties = this.getCounterparties();
      const updatedCounterparties = counterparties.map(cp => {
        if (cp.id === contract.customerId) {
          return { ...cp, status: 'INATIVO' as const };
        }
        return cp;
      });
      this.saveCounterparties(updatedCounterparties);
    }

    // Audit log
    const statusLabel = options.status === 'CANCELADO' ? 'Cancelamento' : (options.status === 'INATIVO' ? 'Inativação' : 'Encerramento');
    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: options.status === 'CANCELADO' ? 'CANCELAMENTO_CONTRATO' : 'INATIVACAO_CONTRATO',
      module: 'Contratos Recorrentes',
      recordId: contractId,
      details: `${statusLabel} do contrato ${contract.contractNumber} a partir de ${options.cancellationDate}. Motivo: ${options.cancellationReason}. ${cancelledTitlesCount > 0 ? `(${cancelledTitlesCount} títulos futuros cancelados)` : ''}`
    });

    return { 
      success: true, 
      message: `Contrato ${contract.contractNumber} marcado como ${options.status} com sucesso!`,
      cancelledTitlesCount 
    };
  }

  public reactivateContract(
    contractId: string,
    options?: { reactivateClient?: boolean }
  ): { success: boolean; message: string } {
    const contracts = this.getContracts();
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return { success: false, message: 'Contrato não encontrado.' };

    const currentUser = this.getCurrentUser();
    const nowIso = new Date().toISOString();
    const updatedContracts = contracts.map(c => {
      if (c.id === contractId) {
        const historyEntry: ContractStatusHistoryEntry = {
          id: `csh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          contractId,
          previousStatus: c.status,
          newStatus: 'ATIVO',
          changedAt: nowIso,
          changedBy: currentUser.name,
          userRole: currentUser.role,
          reason: 'Reativação para carteira ativa',
          notes: 'Contrato reativado para faturamento contínuo',
          effectiveDate: new Date().toISOString().split('T')[0]
        };

        return {
          ...c,
          status: 'ATIVO' as const,
          cancellationNotes: c.cancellationDate ? `Reativado em ${new Date().toISOString().split('T')[0]} por ${currentUser.name}. (Anteriormente cancelado em ${c.cancellationDate}: ${c.cancellationReason || ''})` : undefined,
          statusHistory: [historyEntry, ...(c.statusHistory || [])]
        };
      }
      return c;
    });
    this.saveContracts(updatedContracts);

    if (options?.reactivateClient && contract.customerId) {
      const counterparties = this.getCounterparties();
      const updatedCounterparties = counterparties.map(cp => {
        if (cp.id === contract.customerId) {
          return { ...cp, status: 'ATIVO' as const };
        }
        return cp;
      });
      this.saveCounterparties(updatedCounterparties);
    }

    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'REATIVACAO_CONTRATO',
      module: 'Contratos Recorrentes',
      recordId: contractId,
      details: `Reativação do contrato ${contract.contractNumber} para a carteira ativa.`
    });

    return { success: true, message: `Contrato ${contract.contractNumber} reativado com sucesso na carteira ativa!` };
  }

  public changeContractStatus(
    contractId: string,
    newStatus: ContractStatus,
    options?: {
      reason?: string;
      notes?: string;
      effectiveDate?: string;
    }
  ): { success: boolean; message: string } {
    const contracts = this.getContracts();
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return { success: false, message: 'Contrato não encontrado.' };

    if (contract.status === newStatus) {
      return { success: true, message: `O contrato já se encontra no status ${newStatus}.` };
    }

    const currentUser = this.getCurrentUser();
    const nowIso = new Date().toISOString();
    const effective = options?.effectiveDate || nowIso.split('T')[0];

    const historyEntry: ContractStatusHistoryEntry = {
      id: `csh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      contractId,
      previousStatus: contract.status,
      newStatus,
      changedAt: nowIso,
      changedBy: currentUser.name,
      userRole: currentUser.role,
      reason: options?.reason || `Alteração manual de status para ${newStatus}`,
      notes: options?.notes,
      effectiveDate: effective
    };

    const updatedContracts = contracts.map(c => {
      if (c.id === contractId) {
        return {
          ...c,
          status: newStatus,
          cancellationDate: (newStatus === 'CANCELADO' || newStatus === 'INATIVO' || newStatus === 'ENCERRADO') ? effective : c.cancellationDate,
          cancellationReason: options?.reason || c.cancellationReason,
          cancellationNotes: options?.notes || c.cancellationNotes,
          inactivatedAt: (newStatus === 'CANCELADO' || newStatus === 'INATIVO') ? nowIso : undefined,
          inactivatedBy: (newStatus === 'CANCELADO' || newStatus === 'INATIVO') ? currentUser.name : undefined,
          statusHistory: [historyEntry, ...(c.statusHistory || [])]
        };
      }
      return c;
    });

    this.saveContracts(updatedContracts);

    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'ALTERACAO_STATUS_CONTRATO',
      module: 'Contratos Recorrentes',
      recordId: contractId,
      details: `Status do contrato ${contract.contractNumber} alterado de ${contract.status} para ${newStatus}. Motivo: ${options?.reason || 'Não informado'}. Usuário: ${currentUser.name}.`
    });

    return { 
      success: true, 
      message: `Status do contrato alterado de ${contract.status} para ${newStatus} com sucesso!` 
    };
  }

  public getContractAuditLogs(contractId: string, contractNumber?: string): AuditLogEntry[] {
    const logs = this.getAuditLogs();
    return logs.filter(l => 
      l.recordId === contractId || 
      (contractNumber && l.details.includes(contractNumber)) ||
      (l.module === 'Contratos Recorrentes' && l.recordId === contractId)
    );
  }

  public deleteContract(
    contractId: string, 
    options?: { cancelPendingTitles?: boolean }
  ): { success: boolean; message: string; cancelledCount: number } {
    const contracts = this.getContracts();
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return { success: false, message: 'Contrato não encontrado.', cancelledCount: 0 };

    const currentUser = this.getCurrentUser();
    const updatedContracts = contracts.filter(c => c.id !== contractId);
    this.saveContracts(updatedContracts);

    let cancelledCount = 0;
    if (options?.cancelPendingTitles) {
      const titles = this.getTitles();
      const updatedTitles = titles.map(t => {
        if (t.originType === 'CONTRATO' && t.originId === contractId && t.settlementState !== 'LIQUIDADO' && t.documentState !== 'CANCELADO') {
          cancelledCount++;
          return {
            ...t,
            documentState: 'CANCELADO' as const,
            notes: `${t.notes ? t.notes + ' • ' : ''}Título cancelado devido à exclusão definitiva do contrato ${contract.contractNumber}.`
          };
        }
        return t;
      });
      if (cancelledCount > 0) {
        this.saveTitles(updatedTitles);
      }
    }

    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EXCLUSAO_CONTRATO',
      module: 'Contratos Recorrentes',
      recordId: contractId,
      details: `Exclusão do contrato ${contract.contractNumber} (${contract.description}). ${cancelledCount > 0 ? `${cancelledCount} títulos pendentes foram cancelados.` : ''}`
    });

    return { success: true, message: `Contrato ${contract.contractNumber} excluído com sucesso!`, cancelledCount };
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

  // Budget Versions & Simulation History
  public getBudgetVersions(year?: number): BudgetVersion[] {
    const all = this.get<BudgetVersion[]>(STORAGE_KEYS.BUDGET_VERSIONS, []);
    if (year) {
      return all.filter(v => v.year === year);
    }
    return all;
  }

  public saveBudgetVersion(version: BudgetVersion) {
    const all = this.getBudgetVersions();
    const existingIdx = all.findIndex(v => v.id === version.id);
    let updated: BudgetVersion[];
    if (existingIdx >= 0) {
      updated = [...all];
      updated[existingIdx] = version;
    } else {
      updated = [version, ...all];
    }
    this.set(STORAGE_KEYS.BUDGET_VERSIONS, updated);
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

  // Batch delete titles permanently from storage
  public batchDeleteTitles(ids: string[]): { deletedCount: number; affectedSettlements: number } {
    if (!ids || ids.length === 0) return { deletedCount: 0, affectedSettlements: 0 };
    const setIds = new Set(ids);
    const titles = this.getTitles();
    const settlements = this.getSettlements();
    const movements = this.getMovements();
    const bankAccounts = this.getBankAccounts();

    const titlesToDelete = titles.filter(t => setIds.has(t.id));
    const deletedCount = titlesToDelete.length;
    if (deletedCount === 0) return { deletedCount: 0, affectedSettlements: 0 };

    // 1. Remove titles from titles list and record IDs to prevent future resurrection
    const remainingTitles = titles.filter(t => !setIds.has(t.id));
    this.saveTitles(remainingTitles);

    const currentDeleted = this.get<string[]>(STORAGE_KEYS.DELETED_TITLE_IDS, []);
    const updatedDeleted = Array.from(new Set([...currentDeleted, ...ids]));
    this.set(STORAGE_KEYS.DELETED_TITLE_IDS, updatedDeleted);

    // 2. Identify linked settlements to reverse balances and clean up
    const linkedSettlements = settlements.filter(s => setIds.has(s.titleId));
    const affectedSettlements = linkedSettlements.length;

    if (affectedSettlements > 0) {
      // Safely adjust bank account balances for any linked settlements being deleted
      const updatedBankAccounts = bankAccounts.map(ba => {
        let balanceAdjustment = 0;
        linkedSettlements.forEach(s => {
          if (s.bankAccountId === ba.id) {
            const title = titlesToDelete.find(t => t.id === s.titleId);
            if (title?.type === 'RECEBER') {
              // Was income received: subtract back from bank account
              balanceAdjustment -= s.components.netFinancialAmount;
            } else if (title?.type === 'PAGAR') {
              // Was expense paid: refund back to bank account
              balanceAdjustment += s.components.netFinancialAmount;
            }
          }
        });
        if (balanceAdjustment !== 0) {
          return {
            ...ba,
            currentBalance: ba.currentBalance + balanceAdjustment,
            updatedAt: new Date().toISOString()
          };
        }
        return ba;
      });
      this.saveBankAccounts(updatedBankAccounts);

      // Remove the orphan settlements
      const remainingSettlements = settlements.filter(s => !setIds.has(s.titleId));
      this.saveSettlements(remainingSettlements);

      // Remove any movements linked to these settlements
      const linkedSettlementIds = new Set(linkedSettlements.map(s => s.id));
      const remainingMovements = movements.filter(m => 
        !(m.originType === 'BAIXA_TITULO' && m.originReferenceId && linkedSettlementIds.has(m.originReferenceId))
      );
      this.saveMovements(remainingMovements);
    }

    // 3. Add audit log
    const currentUser = this.getCurrentUser();
    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EXCLUSAO_EM_LOTE',
      module: 'Financeiro',
      recordId: `batch-${deletedCount}`,
      details: `Exclusão permanente de ${deletedCount} título(s)${affectedSettlements > 0 ? ` com estorno de ${affectedSettlements} baixa(s) vinculada(s)` : ''}.`
    });

    return { deletedCount, affectedSettlements };
  }

  // Single delete title
  public deleteTitle(id: string): boolean {
    const res = this.batchDeleteTitles([id]);
    return res.deletedCount > 0;
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
        nextCompetence = advanceCompetence(src.competence, 1);
        nextDueDate = addMonthsSafe(src.dueDate, 1);
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

  public batchAddCardPurchasesAndSyncTitles(newPurchases: CreditCardPurchase[]) {
    if (newPurchases.length === 0) return;

    const currentPurchases = this.getCardPurchases();
    this.saveCardPurchases([...newPurchases, ...currentPurchases]);

    const cards = this.getCreditCards();
    const titles = this.getTitles();
    const newTitles: FinancialTitle[] = [];

    for (const purchase of newPurchases) {
      const card = cards.find(c => c.id === purchase.cardId);

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
          notes: `Lançamento importado da fatura - Fatura ${inst.invoiceMonth}`,
          createdAt: purchase.createdAt,
          updatedAt: purchase.createdAt
        });
      }
    }

    this.saveTitles([...newTitles, ...titles]);

    const currentUser = this.getCurrentUser();
    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'IMPORTACAO_FATURA_CARTAO',
      module: 'Cartões de Crédito',
      recordId: `imp-cc-${Date.now()}`,
      details: `Importação e cadastro de ${newPurchases.length} novos lançamentos faltantes da fatura de cartão de crédito. Títulos sincronizados no Contas a Pagar.`
    });
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
    const rawData: Record<string, unknown> = {};
    for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
      try {
        const val = localStorage.getItem(storageKey);
        rawData[key] = val ? JSON.parse(val) : null;
      } catch {
        // ignore
      }
    }

    const company = this.getCompany();
    const titles = this.getTitles();
    const contracts = this.getContracts();
    const counterparties = this.getCounterparties();
    const movements = this.getMovements();
    const bankAccounts = this.getBankAccounts();

    const fullPackage = {
      system: 'Sistema Financeiro & Contábil Leão Dourado',
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      companyName: company?.tradeName || company?.companyName || 'Empresa Contábil',
      stats: {
        totalTitles: titles.length,
        totalContracts: contracts.length,
        totalCounterparties: counterparties.length,
        totalMovements: movements.length,
        totalBankAccounts: bankAccounts.length
      },
      data: rawData
    };

    return JSON.stringify(fullPackage, null, 2);
  }

  public downloadBackupFile(): { filename: string; sizeKb: number } {
    const jsonStr = this.exportFullBackup();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `backup-leao-dourado-${dateStr}_${timeStr}.json`;

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const currentUser = this.getCurrentUser();
    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EXPORTACAO_BACKUP',
      module: 'Segurança e Backup',
      recordId: 'backup',
      details: `Download de backup completo da base de dados em formato JSON (${filename}, ${(blob.size / 1024).toFixed(1)} KB).`
    });

    return {
      filename,
      sizeKb: parseFloat((blob.size / 1024).toFixed(1))
    };
  }

  public importFullBackup(jsonStr: string): { success: boolean; message: string; keysRestored: number } {
    try {
      const parsed = JSON.parse(jsonStr);
      // Suporta formato estruturado (com campo .data) ou objeto plano de chaves
      const payload = (parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object')
        ? parsed.data
        : parsed;

      let keysRestored = 0;
      for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
        if (payload[key] !== undefined && payload[key] !== null) {
          localStorage.setItem(storageKey, JSON.stringify(payload[key]));
          keysRestored++;
        }
      }

      const currentUser = this.getCurrentUser();
      this.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'RESTAURACAO_BACKUP',
        module: 'Segurança e Backup',
        recordId: 'restore',
        details: `Restauração de backup JSON concluída com sucesso. ${keysRestored} tabelas/módulos restaurados.`
      });

      this.notify();
      return {
        success: true,
        message: `Backup restaurado com sucesso! ${keysRestored} áreas de dados foram sincronizadas.`,
        keysRestored
      };
    } catch (err) {
      return {
        success: false,
        message: 'Arquivo de backup inválido ou corrompido. O JSON não pôde ser processado.',
        keysRestored: 0
      };
    }
  }

  // Importação de contratos em lote com criação de novos clientes
  public batchImportContracts(
    newContracts: Contract[], 
    newCounterparties: Counterparty[]
  ): { importedContracts: number; createdClients: number } {
    // 1. Salva novos clientes caso existam
    let createdClients = 0;
    if (newCounterparties.length > 0) {
      const currentClients = this.getCounterparties();
      const existingIds = new Set(currentClients.map(c => c.id));
      const filteredNew = newCounterparties.filter(c => !existingIds.has(c.id));
      if (filteredNew.length > 0) {
        this.saveCounterparties([...currentClients, ...filteredNew]);
        createdClients = filteredNew.length;
      }
    }

    // 2. Salva os novos contratos
    const currentContracts = this.getContracts();
    this.saveContracts([...currentContracts, ...newContracts]);

    // 3. Auditoria
    const currentUser = this.getCurrentUser();
    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'IMPORTACAO_LOTE_CONTRATOS',
      module: 'Contratos Recorrentes',
      recordId: 'import-batch',
      details: `Importação em lote de ${newContracts.length} contratos e cadastro de ${createdClients} novos clientes.`
    });

    this.notify();
    return {
      importedContracts: newContracts.length,
      createdClients
    };
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

  // ==========================================
  // CENÁRIOS DE SIMULAÇÃO DE FLUXO DE CAIXA E INADIMPLÊNCIA
  // ==========================================
  public getCashSimulationScenarios(): SavedCashSimulationScenario[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CASH_SIMULATION_SCENARIOS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Erro ao ler cenários de simulação:', e);
    }

    // Cenário padrão inicial caso ainda não exista nenhum
    const counterparties = this.getCounterparties();
    const client1 = counterparties.find(c => c.id === 'cli-1') || counterparties[0];
    const client5 = counterparties.find(c => c.id === 'cli-5') || counterparties[1];

    const initialScenario: SavedCashSimulationScenario = {
      id: 'scen-default-1',
      name: 'Cenário Conservador Padrão',
      description: 'Projeção preventiva considerando atrasos médios em clientes recorrentes.',
      isActive: true,
      clientSettings: [
        ...(client1 ? [{
          clientId: client1.id,
          clientName: client1.name,
          mode: 'PERCENTAGE' as const,
          percentage: 50,
          notes: 'Atraso parcial habitual na virada de competência'
        }] : []),
        ...(client5 ? [{
          clientId: client5.id,
          clientName: client5.name,
          mode: 'TOTAL' as const,
          notes: 'Pagamento postergado para o mês seguinte'
        }] : [])
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const initialList = [initialScenario];
    this.saveCashSimulationScenarios(initialList);
    return initialList;
  }

  public saveCashSimulationScenarios(scenarios: SavedCashSimulationScenario[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CASH_SIMULATION_SCENARIOS, JSON.stringify(scenarios));
      this.notify();
    } catch (e) {
      console.error('Erro ao salvar cenários de simulação:', e);
    }
  }

  public getActiveCashSimulationScenario(): SavedCashSimulationScenario | null {
    const scenarios = this.getCashSimulationScenarios();
    return scenarios.find(s => s.isActive) || scenarios[0] || null;
  }

  public setActiveCashSimulationScenario(id: string | null): void {
    const scenarios = this.getCashSimulationScenarios();
    const updated = scenarios.map(s => ({
      ...s,
      isActive: s.id === id
    }));
    this.saveCashSimulationScenarios(updated);
  }

  public saveOrUpdateCashSimulationScenario(scenario: SavedCashSimulationScenario): void {
    const scenarios = this.getCashSimulationScenarios();
    const index = scenarios.findIndex(s => s.id === scenario.id);
    let updated: SavedCashSimulationScenario[];

    if (scenario.isActive) {
      scenarios.forEach(s => { s.isActive = false; });
    }

    if (index >= 0) {
      updated = [...scenarios];
      updated[index] = {
        ...scenario,
        updatedAt: new Date().toISOString()
      };
    } else {
      updated = [
        ...scenarios,
        {
          ...scenario,
          createdAt: scenario.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
    this.saveCashSimulationScenarios(updated);
  }

  public deleteCashSimulationScenario(id: string): void {
    const scenarios = this.getCashSimulationScenarios();
    const updated = scenarios.filter(s => s.id !== id);
    // Se excluiu o ativo e ainda sobraram outros, ativa o primeiro
    if (updated.length > 0 && !updated.some(s => s.isActive)) {
      updated[0].isActive = true;
    }
    this.saveCashSimulationScenarios(updated);
  }

  // ==========================================
  // REGRAS DE CONCILIAÇÃO AUTOMÁTICA (DE-PARA)
  // ==========================================
  public getReconciliationRules(): ReconciliationRule[] {
    const stored = this.get<ReconciliationRule[]>(STORAGE_KEYS.RECONCILIATION_RULES, []);
    if (!stored || stored.length === 0) {
      this.saveReconciliationRules(INITIAL_RECONCILIATION_RULES);
      return INITIAL_RECONCILIATION_RULES;
    }
    return stored;
  }

  public saveReconciliationRules(rules: ReconciliationRule[]): void {
    this.set(STORAGE_KEYS.RECONCILIATION_RULES, rules);
  }

  public addReconciliationRule(rule: ReconciliationRule): void {
    const rules = this.getReconciliationRules();
    this.saveReconciliationRules([rule, ...rules]);
  }

  public updateReconciliationRule(id: string, updates: Partial<ReconciliationRule>): void {
    const rules = this.getReconciliationRules();
    const updated = rules.map(r => {
      if (r.id === id) {
        return {
          ...r,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    this.saveReconciliationRules(updated);
  }

  public toggleReconciliationRule(id: string): void {
    const rules = this.getReconciliationRules();
    const updated = rules.map(r => {
      if (r.id === id) {
        return {
          ...r,
          active: !r.active,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    this.saveReconciliationRules(updated);
  }

  public deleteReconciliationRule(id: string): void {
    const rules = this.getReconciliationRules();
    this.saveReconciliationRules(rules.filter(r => r.id !== id));
  }

  // ==========================================
  // CONFERÊNCIA DE SALDOS BANCÁRIOS & FECHAMENTO PERFEITO
  // ==========================================
  public getBankClosingRecords(): BankBalanceClosingRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BANK_CLOSINGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveBankClosingRecord(record: BankBalanceClosingRecord): void {
    const records = this.getBankClosingRecords();
    const updated = [record, ...records.filter(r => r.id !== record.id)];
    localStorage.setItem(STORAGE_KEYS.BANK_CLOSINGS, JSON.stringify(updated));
    this.notify();
  }

  public saveBankClosingRecords(records: BankBalanceClosingRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.BANK_CLOSINGS, JSON.stringify(records));
    this.notify();
  }
}

export const storage = new StorageService();
