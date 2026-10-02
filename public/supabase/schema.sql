-- ==============================================================================
-- SCHEMA SUPABASE: SISTEMA FINANCEIRO & CONTÁBIL CONTAJU
-- Versão: 2.0.0 (Prefixo contaju_* para total isolamento entre projetos)
-- Descrição: Tabelas isoladas para não conflitar com outros sistemas no mesmo banco
-- ==============================================================================

-- 1. EXTENSÕES POSTGRESQL NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função utilitária para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. TABELA DE EMPRESAS (PERFIL DA ORGANIZAÇÃO)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_companies (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  currency TEXT DEFAULT 'BRL',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  tax_regime TEXT DEFAULT 'SIMPLES_NACIONAL',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABELA DE USUÁRIOS DO SISTEMA FINANCEIRO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'OPERADOR', -- ADMIN, GESTOR_FINANCEIRO, OPERADOR, CONSULTA
  avatar TEXT,
  status TEXT DEFAULT 'ATIVO', -- ATIVO, INATIVO
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABELA DE PLANO DE CONTAS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_chart_of_accounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES contaju_chart_of_accounts(id) ON DELETE SET NULL,
  nature TEXT NOT NULL,
  dremap JSONB NOT NULL DEFAULT '{"include": true, "line": "outros", "multiplier": 1}',
  cash_flow_category TEXT NOT NULL DEFAULT 'OPERACIONAL',
  is_analytical BOOLEAN NOT NULL DEFAULT TRUE,
  is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT DEFAULT 'ATIVO',
  dre_line_mapping TEXT,
  type TEXT,
  external_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contaju_chart_accounts_code ON contaju_chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_contaju_chart_accounts_parent ON contaju_chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_contaju_chart_accounts_nature ON contaju_chart_of_accounts(nature);

-- ==============================================================================
-- 5. TABELA DE CONTAS BANCÁRIAS E CAIXA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_bank_accounts (
  id TEXT PRIMARY KEY,
  institution TEXT NOT NULL,
  name TEXT NOT NULL,
  bank_code TEXT,
  agency TEXT,
  account_number TEXT,
  type TEXT DEFAULT 'CORRENTE',
  currency TEXT DEFAULT 'BRL',
  initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  base_date DATE DEFAULT CURRENT_DATE,
  include_in_cash_flow BOOLEAN DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. TABELA DE CONTRAPARTES (CLIENTES E FORNECEDORES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_counterparties (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'CLIENTE', -- CLIENTE, FORNECEDOR, AMBOS
  name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contaju_counterparties_doc ON contaju_counterparties(document);
CREATE INDEX IF NOT EXISTS idx_contaju_counterparties_type ON contaju_counterparties(type);
CREATE INDEX IF NOT EXISTS idx_contaju_counterparties_name ON contaju_counterparties(name);

-- ==============================================================================
-- 7. TABELA DE SERVIÇOS DO CATÁLOGO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  modality TEXT NOT NULL DEFAULT 'RECORRENTE',
  default_account_id TEXT REFERENCES contaju_chart_of_accounts(id) ON DELETE SET NULL,
  chart_account_id TEXT REFERENCES contaju_chart_of_accounts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. TABELA DE CONTRATOS RECORRENTES E AVULSOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_contracts (
  id TEXT PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES contaju_counterparties(id) ON DELETE RESTRICT,
  company_id TEXT REFERENCES contaju_companies(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  monthly_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  entry_date DATE,
  contract_type TEXT DEFAULT 'RECORRENTE',
  is_recurring BOOLEAN DEFAULT TRUE,
  auto_generate_future_months BOOLEAN DEFAULT TRUE,
  future_months_count INT DEFAULT 12,
  acquisition_channel TEXT,
  acquisition_referrer_name TEXT,
  acquisition_social_network TEXT,
  acquisition_notes TEXT,
  periodicity TEXT NOT NULL DEFAULT 'MENSAL',
  billing_frequency TEXT,
  due_day INT NOT NULL DEFAULT 10,
  due_rule TEXT NOT NULL DEFAULT 'SAME_MONTH',
  billing_method TEXT NOT NULL DEFAULT 'BOLETO',
  status TEXT NOT NULL DEFAULT 'ATIVO',
  cancellation_date DATE,
  cancellation_reason TEXT,
  cancellation_notes TEXT,
  inactivated_at TIMESTAMPTZ,
  inactivated_by TEXT,
  status_history JSONB DEFAULT '[]',
  notes TEXT,
  adjustment_rule TEXT,
  adjustments JSONB DEFAULT '[]',
  annual_balance_fee JSONB,
  last_generated_competence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contaju_contracts_cust ON contaju_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contaju_contracts_status ON contaju_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contaju_contracts_number ON contaju_contracts(contract_number);

-- ==============================================================================
-- 9. TABELA DE VENDAS E FATURAMENTO (ISOLADA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_sales (
  id TEXT PRIMARY KEY,
  sale_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES contaju_counterparties(id) ON DELETE RESTRICT,
  competence TEXT NOT NULL,
  date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  gross_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  net_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  installments_count INT NOT NULL DEFAULT 1,
  notes TEXT,
  contract_id TEXT REFERENCES contaju_contracts(id) ON DELETE SET NULL,
  contract_number TEXT,
  origin_type TEXT DEFAULT 'CONTRATO',
  status TEXT NOT NULL DEFAULT 'CONFIRMADA',
  title_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contaju_sales_cust ON contaju_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_contaju_sales_comp ON contaju_sales(competence);

-- ==============================================================================
-- 10. TABELA DE TÍTULOS FINANCEIROS (CONTAS A RECEBER E A PAGAR)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_financial_titles (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES contaju_companies(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- RECEBER, PAGAR
  title_number TEXT NOT NULL,
  counterparty_id TEXT NOT NULL REFERENCES contaju_counterparties(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES contaju_chart_of_accounts(id) ON DELETE RESTRICT,
  
  -- Datas de controle
  launch_date DATE NOT NULL,
  competence TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  expected_cash_date DATE NOT NULL,
  
  -- Valores financeiros
  original_amount NUMERIC(15, 2) NOT NULL,
  settled_principal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  balance_principal NUMERIC(15, 2) NOT NULL,
  accrued_interest NUMERIC(15, 2) NOT NULL DEFAULT 0,
  accrued_fine NUMERIC(15, 2) NOT NULL DEFAULT 0,
  
  -- Estados
  document_state TEXT NOT NULL DEFAULT 'CONFIRMADO',
  settlement_state TEXT NOT NULL DEFAULT 'ABERTO',
  
  -- Origem e vínculos
  origin_type TEXT NOT NULL DEFAULT 'MANUAL',
  origin_id TEXT,
  installment_index INT DEFAULT 1,
  total_installments INT DEFAULT 1,
  expected_bank_account_id TEXT REFERENCES contaju_bank_accounts(id) ON DELETE SET NULL,
  credit_card_id TEXT,
  credit_card_invoice_month TEXT,
  is_credit_card_purchase BOOLEAN DEFAULT FALSE,
  sale_id TEXT REFERENCES contaju_sales(id) ON DELETE SET NULL,
  sale_number TEXT,
  contract_id TEXT REFERENCES contaju_contracts(id) ON DELETE SET NULL,
  contract_number TEXT,
  barcode TEXT,
  bank_document_number TEXT,
  external_id TEXT,
  fingerprint TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contaju_titles_type ON contaju_financial_titles(type);
CREATE INDEX IF NOT EXISTS idx_contaju_titles_due_date ON contaju_financial_titles(due_date);
CREATE INDEX IF NOT EXISTS idx_contaju_titles_competence ON contaju_financial_titles(competence);
CREATE INDEX IF NOT EXISTS idx_contaju_titles_counterparty ON contaju_financial_titles(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_contaju_titles_settlement_state ON contaju_financial_titles(settlement_state);

-- ==============================================================================
-- 11. TABELA DE BAIXAS E LIQUIDAÇÕES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_settlements (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL REFERENCES contaju_financial_titles(id) ON DELETE CASCADE,
  settlement_number TEXT NOT NULL,
  settlement_date DATE NOT NULL,
  bank_account_id TEXT NOT NULL REFERENCES contaju_bank_accounts(id) ON DELETE RESTRICT,
  components JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  voucher_ref TEXT,
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  reversed_at TIMESTAMPTZ,
  reversed_by TEXT,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'Sistema',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contaju_settlements_title ON contaju_settlements(title_id);
CREATE INDEX IF NOT EXISTS idx_contaju_settlements_date ON contaju_settlements(settlement_date);
CREATE INDEX IF NOT EXISTS idx_contaju_settlements_bank ON contaju_settlements(bank_account_id);

-- ==============================================================================
-- 12. TABELA DE MOVIMENTAÇÕES FINANCEIRAS (FLUXO DE CAIXA REALIZADO)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_financial_movements (
  id TEXT PRIMARY KEY,
  bank_account_id TEXT NOT NULL REFERENCES contaju_bank_accounts(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  direction TEXT NOT NULL, -- ENTRADA, SAIDA
  amount NUMERIC(15, 2) NOT NULL,
  origin_type TEXT NOT NULL DEFAULT 'OPERACAO_DIRETA',
  origin_reference_id TEXT,
  description TEXT NOT NULL,
  counterparty_id TEXT REFERENCES contaju_counterparties(id) ON DELETE SET NULL,
  account_id TEXT REFERENCES contaju_chart_of_accounts(id) ON DELETE SET NULL,
  cash_flow_category TEXT NOT NULL DEFAULT 'OPERACIONAL',
  is_reversed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contaju_movements_date ON contaju_financial_movements(date);
CREATE INDEX IF NOT EXISTS idx_contaju_movements_bank ON contaju_financial_movements(bank_account_id);

-- ==============================================================================
-- 13. TABELA DE EXTRATO BANCÁRIO IMPORTADO (OFX / CSV)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_statement_entries (
  id TEXT PRIMARY KEY,
  import_batch_id TEXT NOT NULL DEFAULT 'batch-legacy',
  bank_account_id TEXT NOT NULL REFERENCES contaju_bank_accounts(id) ON DELETE CASCADE,
  fit_id TEXT,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  document_number TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  reconciliation_status TEXT NOT NULL DEFAULT 'PENDENTE',
  suggested_title_id TEXT REFERENCES contaju_financial_titles(id) ON DELETE SET NULL,
  rule_applied TEXT,
  matched_movement_id TEXT REFERENCES contaju_financial_movements(id) ON DELETE SET NULL,
  matched_title_id TEXT REFERENCES contaju_financial_titles(id) ON DELETE SET NULL,
  reconciliation_note TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contaju_statements_bank ON contaju_statement_entries(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_contaju_statements_date ON contaju_statement_entries(date);
CREATE INDEX IF NOT EXISTS idx_contaju_statements_status ON contaju_statement_entries(reconciliation_status);

-- ==============================================================================
-- 14. TABELA DE CARTÕES DE CRÉDITO CORPORATIVOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_credit_cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  brand TEXT NOT NULL,
  last_four_digits TEXT NOT NULL,
  credit_limit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  closing_day INT NOT NULL DEFAULT 20,
  due_day INT NOT NULL DEFAULT 5,
  color TEXT DEFAULT '#8B5CF6',
  default_payment_bank_account_id TEXT REFERENCES contaju_bank_accounts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 15. TABELA DE COMPRAS NO CARTÃO DE CRÉDITO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_card_purchases (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES contaju_credit_cards(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL,
  description TEXT NOT NULL,
  counterparty_id TEXT REFERENCES contaju_counterparties(id) ON DELETE SET NULL,
  counterparty_name TEXT,
  chart_account_id TEXT NOT NULL REFERENCES contaju_chart_of_accounts(id) ON DELETE RESTRICT,
  total_amount NUMERIC(15, 2) NOT NULL,
  installments_count INT NOT NULL DEFAULT 1,
  calculation_mode TEXT DEFAULT 'TOTAL_DIVIDED',
  installment_value NUMERIC(15, 2),
  installments JSONB NOT NULL DEFAULT '[]',
  invoice_month TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 16. TABELA DE FECHAMENTOS DE PERÍODO (TRAVA CONTÁBIL MENSAL)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_period_closures (
  id TEXT PRIMARY KEY,
  year_month TEXT NOT NULL UNIQUE,
  closed_at TIMESTAMPTZ NOT NULL,
  closed_by TEXT NOT NULL,
  notes TEXT,
  is_closed BOOLEAN NOT NULL DEFAULT TRUE,
  reopened_at TIMESTAMPTZ,
  reopened_by TEXT,
  reopen_reason TEXT,
  bank_snapshots JSONB DEFAULT '[]',
  checklist_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 17. TABELA DE AUDITORIA E LOGS DO SISTEMA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id TEXT,
  details TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contaju_audit_module ON contaju_audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_contaju_audit_timestamp ON contaju_audit_logs(timestamp);

-- ==============================================================================
-- 18. TABELA DE PLANOS DE ORÇAMENTO (BUDGET PLANNING)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_budget_plans (
  id TEXT PRIMARY KEY,
  year INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 19. TABELA DE REGRAS DE CONCILIAÇÃO BANCÁRIA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_reconciliation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pattern TEXT NOT NULL,
  match_type TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  chart_account_id TEXT NOT NULL REFERENCES contaju_chart_of_accounts(id) ON DELETE RESTRICT,
  counterparty_id TEXT REFERENCES contaju_counterparties(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INT NOT NULL DEFAULT 10,
  description_template TEXT,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 20. TABELA DE FECHAMENTOS DE SALDO BANCÁRIO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contaju_bank_balance_closings (
  id TEXT PRIMARY KEY,
  bank_account_id TEXT NOT NULL REFERENCES contaju_bank_accounts(id) ON DELETE CASCADE,
  closing_date DATE NOT NULL,
  closing_time TEXT,
  closed_by TEXT NOT NULL,
  system_balance NUMERIC(15, 2) NOT NULL,
  real_balance NUMERIC(15, 2) NOT NULL,
  difference NUMERIC(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PERFEITO',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 21. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ==============================================================================
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'contaju_companies', 'contaju_users', 'contaju_chart_of_accounts', 'contaju_bank_accounts', 
      'contaju_counterparties', 'contaju_services', 'contaju_contracts', 'contaju_sales', 
      'contaju_financial_titles', 'contaju_settlements', 'contaju_financial_movements', 
      'contaju_statement_entries', 'contaju_credit_cards', 'contaju_card_purchases', 
      'contaju_period_closures', 'contaju_budget_plans', 'contaju_reconciliation_rules', 
      'contaju_bank_balance_closings'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_update_timestamp ON %I;', t);
    EXECUTE format('CREATE TRIGGER trg_update_timestamp BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t);
  END LOOP;
END;
$$;

-- ==============================================================================
-- 22. CONFIGURAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'contaju_companies', 'contaju_users', 'contaju_chart_of_accounts', 'contaju_bank_accounts', 
      'contaju_counterparties', 'contaju_services', 'contaju_contracts', 'contaju_sales', 
      'contaju_financial_titles', 'contaju_settlements', 'contaju_financial_movements', 
      'contaju_statement_entries', 'contaju_credit_cards', 'contaju_card_purchases', 
      'contaju_period_closures', 'contaju_audit_logs', 'contaju_budget_plans', 
      'contaju_reconciliation_rules', 'contaju_bank_balance_closings'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public access for contaju" ON %I;', t);
    EXECUTE format('CREATE POLICY "Public access for contaju" ON %I FOR ALL USING (true) WITH CHECK (true);', t);
  END LOOP;
END;
$$;

-- FIM DO SCRIPT DE SCHEMA
