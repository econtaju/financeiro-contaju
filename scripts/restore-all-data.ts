import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

console.log('🚀 Iniciando processo de restauração completa dos dados...');

// 1. Obter initialData de d3c7dac
const origInitialData = execSync('git show d3c7dac:src/data/initialData.ts', { encoding: 'utf8' });

// 2. Obter creditCardsData, initialBudgetData, reconciliationRulesData de d3c7dac
const origCreditCardsData = execSync('git show d3c7dac:src/data/creditCardsData.ts', { encoding: 'utf8' });
const origBudgetData = execSync('git show d3c7dac:src/data/initialBudgetData.ts', { encoding: 'utf8' });
const origRulesData = execSync('git show d3c7dac:src/data/reconciliationRulesData.ts', { encoding: 'utf8' });

// Escrever os arquivos satélites
fs.writeFileSync(path.resolve(process.cwd(), 'src/data/creditCardsData.ts'), origCreditCardsData, 'utf8');
fs.writeFileSync(path.resolve(process.cwd(), 'src/data/initialBudgetData.ts'), origBudgetData, 'utf8');
fs.writeFileSync(path.resolve(process.cwd(), 'src/data/reconciliationRulesData.ts'), origRulesData, 'utf8');
console.log('✅ Arquivos creditCardsData, initialBudgetData e reconciliationRulesData restaurados.');

// Atualizar initialData com:
// A) Leonardo Ricardo Arantes em INITIAL_USERS com password
const usersBlock = `export const INITIAL_USERS: User[] = [
  {
    id: 'usr-master-1',
    name: 'Leonardo Ricardo Arantes',
    email: 'leonardoricardoarantes@gmail.com',
    role: 'SUPER_ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    status: 'ATIVO',
    password: 'contaju123'
  },
  {
    id: 'usr-1',
    name: 'Carlos Mendes',
    email: 'carlos@contaju.com.br',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
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
];`;

// B) INITIAL_BANK_ACCOUNTS incluindo bank-077-inter
const bankAccountsBlock = `export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank-1',
    institution: 'Itaú Unibanco',
    name: 'Itaú Conta Corrente PJ',
    agency: '0452',
    accountNumber: '28490-5',
    type: 'CORRENTE',
    currency: 'BRL',
    initialBalance: 35000.00,
    baseDate: '2026-01-01',
    includeInCashFlow: true,
    status: 'ATIVO',
    color: '#ea580c'
  },
  {
    id: 'bank-2',
    institution: 'Banco Inter',
    name: 'Inter PJ Operacional',
    agency: '0001',
    accountNumber: '948172-3',
    type: 'CORRENTE',
    currency: 'BRL',
    initialBalance: 18500.00,
    baseDate: '2026-01-01',
    includeInCashFlow: true,
    status: 'ATIVO',
    color: '#f97316'
  },
  {
    id: 'bank-3',
    institution: 'Caixa Interno',
    name: 'Caixa Pequeno Escritório',
    type: 'CAIXA_FISICO',
    currency: 'BRL',
    initialBalance: 1200.00,
    baseDate: '2026-01-01',
    includeInCashFlow: true,
    status: 'ATIVO',
    color: '#0284c7'
  },
  {
    id: 'bank-4',
    institution: 'XP Investimentos',
    name: 'XP Reserva e CDB Liquidez',
    agency: '0001',
    accountNumber: '448201-9',
    type: 'APLICACAO',
    currency: 'BRL',
    initialBalance: 60000.00,
    baseDate: '2026-01-01',
    includeInCashFlow: true,
    status: 'ATIVO',
    color: '#16a34a'
  },
  {
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
  }
];`;

let restored = origInitialData;

// Substituir bloco de users
restored = restored.replace(/export const INITIAL_USERS: User\[\] = \[[\s\S]*?\n\];/, usersBlock);

// Substituir bloco de bank accounts
restored = restored.replace(/export const INITIAL_BANK_ACCOUNTS: BankAccount\[\] = \[[\s\S]*?\n\];/, bankAccountsBlock);

fs.writeFileSync(path.resolve(process.cwd(), 'src/data/initialData.ts'), restored, 'utf8');
console.log('✅ src/data/initialData.ts reconstruído com base original + Leonardo Ricardo Arantes + Banco Inter.');

// Agora rodar apply-simulation.ts
console.log('🔄 Executando scripts/apply-simulation.ts para adicionar títulos de Outubro/2026...');
execSync('npx tsx scripts/apply-simulation.ts', { stdio: 'inherit' });

console.log('🎉 Restauração concluída com sucesso!');
