# 🚀 Guia de Integração e Conexão: Supabase & Sistema Contaju

Este documento descreve como conectar o **Sistema Financeiro & Contábil Contaju** ao banco de dados relacional **Supabase (PostgreSQL Cloud)**.

---

## 📋 Sumário
1. [Passo a Passo de Configuração no Supabase](#1-passo-a-passo-de-configuração-no-supabase)
2. [Execução do Script SQL (schema.sql)](#2-execução-do-script-sql-schemasql)
3. [Configuração das Chaves de Acesso](#3-configuração-das-chaves-de-acesso)
4. [Sincronização e Migração dos Dados](#4-sincronização-e-migração-dos-dados)
5. [Arquitetura Híbrida (Offline-First + Cloud)](#5-arquitetura-híbrida-offline-first--cloud)
6. [Tabelas do Banco de Dados](#6-tabelas-do-banco-de-dados)

---

## 1. Passo a Passo de Configuração no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login (ou crie sua conta gratuita).
2. Clique em **"New Project"**.
3. Defina o nome do projeto (ex: `contaju-financeiro`) e escolha uma senha forte para o banco de dados.
4. Escolha a região mais próxima (ex: `South America (São Paulo) - sa-east-1` ou `East US`).
5. Aguarde cerca de 1 a 2 minutos para que o Supabase provisione a instância do PostgreSQL.

---

## 2. Execução do Script SQL (schema.sql)

O arquivo [`supabase/schema.sql`](./supabase/schema.sql) contém a estrutura completa de 24 tabelas relacionais, tipos ENUM, índices de alto desempenho, triggers automáticos para `updated_at` e políticas de segurança RLS (Row Level Security).

### Como aplicar:
1. Acesse diretamente o SQL Editor do seu projeto: **[Supabase SQL Editor (klqrydjoyxmxkshtyogp)](https://supabase.com/dashboard/project/klqrydjoyxmxkshtyogp/sql/new)**
2. Copie todo o conteúdo do arquivo [`supabase/schema.sql`](./supabase/schema.sql) (ou clique no botão **"Copiar Script SQL"** diretamente na tela de Configurações do Sistema em **Supabase DB**).
3. Cole o script no SQL Editor do Supabase.
4. Clique em **Run** (botão verde no canto inferior direito).
5. Todas as 22 tabelas `contaju_*` serão criadas com isolamento total!

---

## 3. Configuração das Chaves de Acesso

Você tem **duas formas** de configurar as credenciais no sistema:

### Opção A: Pela Interface do Sistema (Recomendado e Imediato)
1. No sistema Contaju, vá em **Configurações > Banco Supabase (Cloud)**.
2. No painel do Supabase, acesse **Project Settings > API**.
3. Copie a **Project URL** (ex: `https://xyzcompany.supabase.co`) e cole no campo correspondente.
4. Copie a **anon / public key** e cole no campo correspondente.
5. Clique em **Salvar Credenciais**.
6. Clique em **Testar Conexão** para validar a latência e a existência das tabelas em tempo real!

### Opção B: Via Variáveis de Ambiente (.env)
Crie ou edite o arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-anon-aqui"
```

---

## 4. Sincronização e Migração dos Dados

Na tela de **Configurações > Banco Supabase (Cloud)**:
* **Migrar / Enviar para o Supabase (Push / Seed Remoto):**
  Envia todos os dados locais existentes (títulos, contas, clientes, fornecedores, contratos, faturamento) para o Supabase PostgreSQL usando `UPSERT` seguro.
* **Puxar Dados do Supabase (Pull):**
  Baixa os dados centralizados do Supabase para atualizar o cache local do navegador.
* **Auto-Sync em Segundo Plano:**
  Quando ativado, qualquer lançamento salvo no sistema é sincronizado automaticamente em background sem interromper ou travar a tela.

---

## 5. Arquitetura Híbrida (Offline-First + Cloud)

* **Zero Quebras ou Bloqueios:** O aplicativo funciona mesmo sem conexão com a internet ou se o Supabase não estiver configurado.
* **Persistência Dupla:** Operações diárias continuam rápidas e responsivas via cache local de alta performance, espelhando assincronamente no Supabase.
* **Segurança e Isolamento:** Cada projeto e empresa mantém suas credenciais isoladas e com RLS habilitado.

---

## 6. Tabelas do Banco de Dados

| Tabela | Descrição |
| :--- | :--- |
| `companies` | Dados cadastrais da empresa e alíquotas fiscais |
| `users` | Usuários do sistema e permissões RBAC |
| `chart_of_accounts` | Plano de contas contábil/financeiro |
| `bank_accounts` | Contas correntes, poupanças e caixa físico |
| `counterparties` | Clientes, fornecedores e parceiros |
| `services` | Catálogo de serviços recorrentes e avulsos |
| `contracts` | Contratos de clientes e regras de honorários |
| `sales` | Vendas e faturamento associado |
| `financial_titles` | Contas a pagar e contas a receber |
| `settlements` | Baixas e liquidações financeiras |
| `financial_movements` | Movimentações do fluxo de caixa realizado |
| `statement_entries` | Extratos bancários importados (OFX / CSV) |
| `credit_cards` | Cartões corporativos |
| `card_purchases` | Compras parceladas no cartão |
| `card_invoice_payments` | Pagamentos de faturas de cartão |
| `period_closures` | Travas mensais de fechamento contábil |
| `audit_logs` | Trilha de auditoria e conformidade |
| `budget_plans` | Planejamento orçamentário anual |
| `reconciliation_rules` | Regras automáticas de conciliação |
| `bank_balance_closings` | Fechamento diário de saldo bancário |
| `cash_counts` | Auditoria de contagem física de caixa |
| `cash_simulation_scenarios` | Simulações de liquidez e cenários de estresse |
| `improvements` | Sugestões e solicitações de melhorias |
