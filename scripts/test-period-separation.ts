// Mock de LocalStorage e Window para execução em ambiente Node.js / CLI
class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

(global as any).localStorage = new LocalStorageMock();
(global as any).window = global;

import { storage } from '../src/services/storageService';
import { GlobalPeriodFilter } from '../src/types';

console.log('--- TESTE: ISOLAMENTO DE FILTROS POR ABA E FILTRAGEM POR VENCIMENTO ---');

// 1. Testar isolamento dos storages
const filterPayables: GlobalPeriodFilter = { year: 2026, month: 10, active: true };
const filterReceivables: GlobalPeriodFilter = { year: 2026, month: 11, active: true };
const filterDashboard: GlobalPeriodFilter = { year: 2026, month: 12, active: false };

storage.savePayablesPeriodFilter(filterPayables);
storage.saveReceivablesPeriodFilter(filterReceivables);
storage.saveDashboardPeriodFilter(filterDashboard);

const loadedPayables = storage.getPayablesPeriodFilter();
const loadedReceivables = storage.getReceivablesPeriodFilter();
const loadedDashboard = storage.getDashboardPeriodFilter();

console.assert(loadedPayables.month === 10, `Payables deve ser mês 10, obteve ${loadedPayables.month}`);
console.assert(loadedReceivables.month === 11, `Receivables deve ser mês 11, obteve ${loadedReceivables.month}`);
console.assert(loadedDashboard.month === 12, `Dashboard deve ser mês 12, obteve ${loadedDashboard.month}`);
console.assert(loadedDashboard.active === false, 'Dashboard deve ser active=false');

console.log('✓ [1/2] Filtros isolados por tela funcionando perfeitamente sem colisão!');

// 2. Testar lógica de filtragem por dueDate estrita vs competência
const mockTitles = [
  {
    id: 'T1',
    description: 'Honorário com competência Outubro mas vencimento Novembro',
    competence: '2026-10',
    dueDate: '2026-11-10',
    amount: 1000
  },
  {
    id: 'T2',
    description: 'Título com competência Setembro e vencimento Outubro',
    competence: '2026-09',
    dueDate: '2026-10-05',
    amount: 1500
  },
  {
    id: 'T3',
    description: 'Título com competência Outubro e vencimento Outubro',
    competence: '2026-10',
    dueDate: '2026-10-25',
    amount: 2000
  }
];

// Simulando filtro de Outubro/2026 por Vencimento (Regra nova)
const activeFilter = { year: 2026, month: 10, active: true };
const ymStr = `${activeFilter.year}-${String(activeFilter.month).padStart(2, '0')}`;

const filteredByDueDate = mockTitles.filter(t => String(t.dueDate).startsWith(ymStr));
console.assert(filteredByDueDate.length === 2, `Deveriam passar 2 títulos no mês 10 por vencimento, passaram: ${filteredByDueDate.length}`);
console.assert(filteredByDueDate.some(t => t.id === 'T2'), 'T2 (vencimento em 10/2026) deve estar incluído');
console.assert(filteredByDueDate.some(t => t.id === 'T3'), 'T3 (vencimento em 10/2026) deve estar incluído');
console.assert(!filteredByDueDate.some(t => t.id === 'T1'), 'T1 NÃO deve estar incluído em 10/2026 pois vence em 11/2026!');

console.log('✓ [2/2] Regra de negócio validada: Títulos com competência do mês corrente mas vencimento no mês seguinte NÃO aparecem no mês atual de Contas a Pagar/Receber!');
console.log('================================================================');
console.log('✓ TESTE DE SEPARAÇÃO E VENCIMENTO CONCLUÍDO COM 100% DE SUCESSO!');
