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
  StatementEntry
} from '../types';

export const INITIAL_COMPANY: CompanyProfile = {
  id: 'comp-1',
  companyName: 'Contaju Assessoria Contábil e Financeira Ltda',
  tradeName: 'Contaju Contabilidade & Gestão',
  cnpj: '18.942.503/0001-88',
  email: 'financeiro@contaju.com.br',
  phone: '(11) 3450-8900',
  address: 'Av. Paulista, 1800 - Conjunto 142',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-200',
  currency: 'BRL',
  timezone: 'America/Sao_Paulo',
  fiscalRegime: 'SIMPLES_NACIONAL'
};

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Carlos Mendes',
    email: 'carlos@contaju.com.br',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    status: 'ATIVO',
    password: 'contaju123'
  },
  {
    id: 'usr-2',
    name: 'Mariana Silva',
    email: 'mariana.silva@contaju.com.br',
    role: 'GESTOR_FINANCEIRO',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    status: 'ATIVO',
    password: 'contaju123'
  },
  {
    id: 'usr-3',
    name: 'Rafael Costa',
    email: 'rafael.costa@contaju.com.br',
    role: 'OPERADOR',
    status: 'ATIVO',
    password: 'contaju123'
  },
  {
    id: 'usr-4',
    name: 'Beatriz Lima',
    email: 'beatriz.lima@contaju.com.br',
    role: 'CONSULTA',
    status: 'ATIVO',
    password: 'contaju123'
  }
];

export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [];

export const INITIAL_COUNTERPARTIES: Counterparty[] = [];

export const INITIAL_SERVICES: ServiceItem[] = [];

export const INITIAL_CONTRACTS: Contract[] = [];

export const INITIAL_TITLES: FinancialTitle[] = [];

export const INITIAL_SETTLEMENTS: Settlement[] = [];

export const INITIAL_MOVEMENTS: FinancialMovement[] = [];

export const INITIAL_STATEMENT_ENTRIES: StatementEntry[] = [];

export const INITIAL_PERIOD_CLOSURES: PeriodClosure[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

export const INITIAL_MODULES: ModuleConfig[] = [
  {
    id: 'mod-core',
    key: 'CORE_FINANCE',
    name: 'Núcleo Financeiro & Plano de Contas',
    description: 'Gestão de títulos, baixas com composição, bancos, plano hierárquico e auditoria.',
    isCore: true,
    isEnabled: true,
    status: 'ATIVO'
  },
  {
    id: 'mod-contracts',
    key: 'CONTRACTS_BILLING',
    name: 'Contratos e Faturamento Recorrente',
    description: 'Gestão de mensalidades, faturamento em lote idempotente e cálculo de MRR.',
    isCore: false,
    isEnabled: true,
    status: 'ATIVO'
  },
  {
    id: 'mod-reconciliation',
    key: 'BANK_RECONCILIATION',
    name: 'Conciliação Bancária (OFX / CSV / XLSX)',
    description: 'Motor inteligente de correspondência, importação e rastreamento de extratos.',
    isCore: false,
    isEnabled: true,
    status: 'ATIVO'
  },
  {
    id: 'mod-reports',
    key: 'MANAGERIAL_REPORTS',
    name: 'DRE Gerencial e Fluxo de Caixa Direto',
    description: 'DRE por competência mensal/anual e fluxo direto (operacional, investimento, financiamento).',
    isCore: true,
    isEnabled: true,
    status: 'ATIVO'
  },
  {
    id: 'mod-pix-gateways',
    key: 'PIX_GATEWAYS',
    name: 'Pix Dinâmico & Gateways de Cobrança',
    description: 'Geração de cobranças integradas via API (Asaas, Cora, Inter). Separação do título e webhooks.',
    isCore: false,
    isEnabled: false,
    status: 'PLANEJADO',
    dependencies: ['CORE_FINANCE', 'CONTRACTS_BILLING']
  },
  {
    id: 'mod-open-finance',
    key: 'OPEN_FINANCE',
    name: 'Conexão Bancária Direta (Open Finance / Pluggy)',
    description: 'Sincronização automática de extratos bancários sem necessidade de upload de arquivos.',
    isCore: false,
    isEnabled: false,
    status: 'PLANEJADO',
    dependencies: ['BANK_RECONCILIATION']
  },
  {
    id: 'mod-nfse',
    key: 'NFSE_EMISSION',
    name: 'Emissão Fiscal de NFS-e',
    description: 'Emissão de notas de serviço municipais conectadas ao faturamento gerencial.',
    isCore: false,
    isEnabled: false,
    status: 'PLANEJADO',
    dependencies: ['CONTRACTS_BILLING']
  },
  {
    id: 'mod-whatsapp',
    key: 'WHATSAPP_BILLING',
    name: 'Notificações e Cobrança via WhatsApp',
    description: 'Envio automático de avisos de vencimento e comprovantes com autorização do cliente.',
    isCore: false,
    isEnabled: false,
    status: 'PLANEJADO'
  }
];

export const INITIAL_IMPROVEMENTS: ImprovementRequest[] = [];
