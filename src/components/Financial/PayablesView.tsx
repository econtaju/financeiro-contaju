import React, { useState, useMemo } from 'react';
import { 
  TrendingDown, 
  Plus, 
  Search, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  FileSpreadsheet,
  Edit3,
  Copy,
  Trash2,
  Layers,
  CheckSquare,
  Square,
  Sparkles,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  RotateCcw,
  CreditCard
} from 'lucide-react';
import { FinancialTitle } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatDateBR, getTemporalStatus } from '../../services/financialEngine';
import { SettlementModal } from '../Modals/SettlementModal';
import { EditTitleModal } from '../Modals/EditTitleModal';
import { BatchEditTitlesModal } from '../Modals/BatchEditTitlesModal';
import { ImportSpreadsheetModal } from '../Modals/ImportSpreadsheetModal';
import { GlobalPeriodBanner } from '../Common/GlobalPeriodBanner';
import { useGlobalPeriod } from '../../hooks/useGlobalPeriod';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';

interface PayablesViewProps {
  onOpenNewTitleModal: (type: 'PAGAR') => void;
}

export const PayablesView: React.FC<PayablesViewProps> = ({ onOpenNewTitleModal }) => {
  const today = new Date().toISOString().split('T')[0];
  const { period } = useGlobalPeriod();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ABERTO' | 'VENCIDO' | 'LIQUIDADO' | 'CANCELADO'>('ABERTO');
  const [quickDateFilter, setQuickDateFilter] = useState<'ALL' | 'HOJE' | 'ESTA_SEMANA' | 'VENCIDO' | 'LIQUIDADO'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [counterpartyFilter, setCounterpartyFilter] = useState<string>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');
  const [originFilter, setOriginFilter] = useState<'ALL' | 'CARTAO_CREDITO' | 'OUTROS'>('ALL');

  // Sorting state
  const [sortField, setSortField] = useState<string>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [selectedTitleForSettlement, setSelectedTitleForSettlement] = useState<FinancialTitle | null>(null);
  const [selectedTitleForEdit, setSelectedTitleForEdit] = useState<FinancialTitle | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [historyTitle, setHistoryTitle] = useState<FinancialTitle | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const titles = storage.getTitles().filter(t => t.type === 'PAGAR');
  const counterparties = storage.getCounterparties();
  const chartAccounts = storage.getChartAccounts();
  const bankAccounts = storage.getBankAccounts();
  const settlements = storage.getSettlements();

  // Current week range (Monday to Sunday)
  const weekRange = useMemo(() => {
    const d = new Date(today + 'T00:00:00');
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  }, [today]);

  // Base titles matching Global Period
  const periodTitles = useMemo(() => {
    return titles.filter(t => {
      if (period.active) {
        const pYear = period.year;
        const pMonth = period.month;
        if (pMonth === 0) {
          const yStr = String(pYear);
          const matchYear = t.competence?.startsWith(yStr) || t.dueDate?.startsWith(yStr);
          if (!matchYear) return false;
        } else {
          const ymStr = `${pYear}-${String(pMonth).padStart(2, '0')}`;
          const matchPeriod = t.competence === ymStr || t.dueDate?.startsWith(ymStr) || (t.expectedCashDate && t.expectedCashDate.startsWith(ymStr));
          if (!matchPeriod) return false;
        }
      }
      return true;
    });
  }, [titles, period]);

  // KPI block stats
  const stats = useMemo(() => {
    const notCancelled = periodTitles.filter(t => t.documentState !== 'CANCELADO');
    const open = notCancelled.filter(t => t.balancePrincipal > 0);
    const hoje = open.filter(t => t.dueDate === today);
    const semana = open.filter(t => t.dueDate >= weekRange.start && t.dueDate <= weekRange.end);
    const vencidos = open.filter(t => t.dueDate < today);
    const liquidados = notCancelled.filter(t => t.settlementState === 'LIQUIDADO');

    return {
      openTotal: open.reduce((acc, t) => acc + t.balancePrincipal, 0),
      openCount: open.length,
      hojeTotal: hoje.reduce((acc, t) => acc + t.balancePrincipal, 0),
      hojeCount: hoje.length,
      semanaTotal: semana.reduce((acc, t) => acc + t.balancePrincipal, 0),
      semanaCount: semana.length,
      vencidosTotal: vencidos.reduce((acc, t) => acc + t.balancePrincipal, 0),
      vencidosCount: vencidos.length,
      liquidadosTotal: liquidados.reduce((acc, t) => acc + t.originalAmount, 0),
      liquidadosCount: liquidados.length
    };
  }, [periodTitles, today, weekRange]);

  // Filtering
  const filteredTitles = useMemo(() => {
    return periodTitles.filter(t => {
      const supplier = counterparties.find(c => c.id === t.counterpartyId);
      const supplierName = supplier?.name.toLowerCase() || '';
      const matchSearch = supplierName.includes(searchTerm.toLowerCase()) || 
        t.titleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && t.chartAccountId !== categoryFilter) {
        return false;
      }

      // Counterparty filter
      if (counterpartyFilter !== 'ALL' && t.counterpartyId !== counterpartyFilter) {
        return false;
      }

      // Bank account filter
      if (bankFilter !== 'ALL' && t.expectedBankAccountId !== bankFilter) {
        return false;
      }

      // Origin filter (Cartão de Crédito vs outros)
      if (originFilter === 'CARTAO_CREDITO' && t.originType !== 'CARTAO_CREDITO') {
        return false;
      }
      if (originFilter === 'OUTROS' && t.originType === 'CARTAO_CREDITO') {
        return false;
      }

      // Quick Date filter
      if (quickDateFilter === 'HOJE') {
        if (t.documentState === 'CANCELADO' || t.balancePrincipal <= 0 || t.dueDate !== today) return false;
      } else if (quickDateFilter === 'ESTA_SEMANA') {
        if (t.documentState === 'CANCELADO' || t.balancePrincipal <= 0 || t.dueDate < weekRange.start || t.dueDate > weekRange.end) return false;
      } else if (quickDateFilter === 'VENCIDO') {
        if (t.documentState === 'CANCELADO' || t.balancePrincipal <= 0 || t.dueDate >= today) return false;
      } else if (quickDateFilter === 'LIQUIDADO') {
        if (t.documentState === 'CANCELADO' || t.settlementState !== 'LIQUIDADO') return false;
      }

      // Status pill tab filter (only applied if quickDateFilter is ALL)
      if (quickDateFilter === 'ALL') {
        if (statusFilter === 'TODOS') return true;
        if (statusFilter === 'CANCELADO') return t.documentState === 'CANCELADO';
        if (t.documentState === 'CANCELADO') return false;

        if (statusFilter === 'ABERTO') return t.balancePrincipal > 0;
        if (statusFilter === 'VENCIDO') return t.balancePrincipal > 0 && t.dueDate < today;
        if (statusFilter === 'LIQUIDADO') return t.settlementState === 'LIQUIDADO';
      }

      return true;
    });
  }, [periodTitles, searchTerm, categoryFilter, counterpartyFilter, bankFilter, originFilter, quickDateFilter, statusFilter, today, weekRange, counterparties]);

  // Sorting
  const sortedTitles = useMemo(() => {
    return [...filteredTitles].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'titleNumber':
          valA = a.titleNumber;
          valB = b.titleNumber;
          break;
        case 'counterparty':
          valA = counterparties.find(c => c.id === a.counterpartyId)?.name || '';
          valB = counterparties.find(c => c.id === b.counterpartyId)?.name || '';
          break;
        case 'competence':
          valA = a.competence || '';
          valB = b.competence || '';
          break;
        case 'dueDate':
          valA = a.dueDate;
          valB = b.dueDate;
          break;
        case 'expectedCashDate':
          valA = a.expectedCashDate || a.dueDate;
          valB = b.expectedCashDate || b.dueDate;
          break;
        case 'originalAmount':
          valA = a.originalAmount;
          valB = b.originalAmount;
          break;
        case 'balancePrincipal':
          valA = a.balancePrincipal;
          valB = b.balancePrincipal;
          break;
        case 'status':
          valA = a.documentState === 'CANCELADO' ? 'CANCELADO' : a.settlementState;
          valB = b.documentState === 'CANCELADO' ? 'CANCELADO' : b.settlementState;
          break;
        default:
          valA = a.dueDate;
          valB = b.dueDate;
      }

      if (typeof valA === 'string') {
        const res = valA.localeCompare(valB);
        return sortOrder === 'asc' ? res : -res;
      } else {
        return sortOrder === 'asc' ? (valA - valB) : (valB - valA);
      }
    });
  }, [filteredTitles, sortField, sortOrder, counterparties]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('ALL');
    setCounterpartyFilter('ALL');
    setBankFilter('ALL');
    setOriginFilter('ALL');
    setQuickDateFilter('ALL');
    setStatusFilter('ABERTO');
  };

  const hasActiveFilters = searchTerm !== '' || categoryFilter !== 'ALL' || counterpartyFilter !== 'ALL' || bankFilter !== 'ALL' || originFilter !== 'ALL' || quickDateFilter !== 'ALL';

  // Batch selection helpers
  const selectableTitles = filteredTitles.filter(t => t.documentState !== 'CANCELADO');
  const isAllSelected = selectableTitles.length > 0 && selectableTitles.every(t => selectedIds.includes(t.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableTitles.map(t => t.id));
    }
  };

  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Duplicate single title
  const handleDuplicateOne = (t: FinancialTitle, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const created = storage.duplicateTitles([t.id], false);
    if (created.length > 0) {
      setRefreshKey(k => k + 1);
    }
  };

  // Batch operations
  const handleBatchDuplicate = (advanceMonth = false) => {
    if (selectedIds.length === 0) return;
    const created = storage.duplicateTitles(selectedIds, advanceMonth);
    alert(`${created.length} obrigação(ões) duplicada(s) com sucesso!`);
    setSelectedIds([]);
    setRefreshKey(k => k + 1);
  };

  const handleBatchCancel = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Deseja realmente cancelar ${selectedIds.length} obrigação(ões) selecionada(s)? Lançamentos com pagamentos parciais ou já liquidados serão preservados.`)) {
      const res = storage.batchCancelTitles(selectedIds);
      alert(`${res.cancelledCount} obrigação(ões) cancelada(s) com sucesso.${res.ignoredCount > 0 ? ` (${res.ignoredCount} títulos ignorados por possuírem baixas)` : ''}`);
      setSelectedIds([]);
      setRefreshKey(k => k + 1);
    }
  };

  const handleExportExcel = () => {
    const headers = ['Título', 'Fornecedor', 'Descrição', 'Competência', 'Emissão', 'Vencimento', 'Previsão Caixa', 'Valor Original', 'Principal Baixado', 'Saldo Atual', 'Situação'];
    const rows = filteredTitles.map(t => {
      const supplier = counterparties.find(c => c.id === t.counterpartyId);
      return [
        t.titleNumber,
        supplier?.name || 'Fornecedor',
        t.description,
        t.competence,
        t.issueDate,
        t.dueDate,
        t.expectedCashDate || t.dueDate,
        t.originalAmount,
        t.settledPrincipal,
        t.balancePrincipal,
        t.documentState === 'CANCELADO' ? 'CANCELADO' : t.settlementState
      ];
    });
    exportToExcel(`contas-a-pagar-${today}`, 'Contas a Pagar', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['Título', 'Fornecedor', 'Descrição', 'Competência', 'Emissão', 'Vencimento', 'Previsão Caixa', 'Valor Original', 'Saldo Atual', 'Situação'];
    const rows = filteredTitles.map(t => {
      const supplier = counterparties.find(c => c.id === t.counterpartyId);
      return [
        t.titleNumber,
        supplier?.name || 'Fornecedor',
        t.description,
        t.competence,
        t.issueDate,
        t.dueDate,
        t.expectedCashDate || t.dueDate,
        t.originalAmount,
        t.balancePrincipal,
        t.settlementState
      ];
    });
    exportToCSV(`contas-a-pagar-${today}`, headers, rows);
  };

  const handleCancelTitle = (t: FinancialTitle) => {
    if (t.settledPrincipal > 0) {
      alert('Títulos com baixas parciais não podem ser cancelados diretamente.');
      return;
    }
    if (confirm(`Deseja realmente cancelar a obrigação ${t.titleNumber}?`)) {
      const all = storage.getTitles();
      const updated = all.map(item => item.id === t.id ? { ...item, documentState: 'CANCELADO' as const, updatedAt: new Date().toISOString() } : item);
      storage.saveTitles(updated);

      const currentUser = storage.getCurrentUser();
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CANCELAMENTO_TITULO',
        module: 'Contas a Pagar',
        recordId: t.id,
        details: `Cancelamento da obrigação a pagar ${t.titleNumber} (${formatBRL(t.originalAmount)}).`
      });
      window.location.reload();
    }
  };

  const openBalanceTotal = filteredTitles.filter(t => t.documentState !== 'CANCELADO').reduce((acc, t) => acc + t.balancePrincipal, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contas a Pagar</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Gestão de obrigações, fornecedores, impostos, salários, pró-labore e liquidações.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors flex items-center shadow-2xs"
            title="Exportar para Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-700" />
            Excel
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors flex items-center shadow-2xs"
            title="Exportar para CSV"
          >
            <Download className="w-4 h-4 mr-1.5 text-slate-600" />
            CSV
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors flex items-center shadow-2xs"
            title="Importar lançamentos de contas a pagar de planilha externa"
          >
            <Upload className="w-4 h-4 mr-1.5 text-rose-600" />
            Importar Planilha
          </button>
          <button
            onClick={() => onOpenNewTitleModal('PAGAR')}
            className="px-3.5 py-2 bg-rose-700 text-white rounded-lg text-xs font-semibold hover:bg-rose-800 transition-colors shadow-2xs flex items-center"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Pagamento
          </button>
        </div>
      </div>

      {/* Quick Date Filter Blocks (Visão Rápida / Indicadores) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card: Em Aberto */}
        <button
          type="button"
          onClick={() => {
            setQuickDateFilter('ALL');
            setStatusFilter('ABERTO');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            quickDateFilter === 'ALL' && statusFilter === 'ABERTO'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/30'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'ALL' && statusFilter === 'ABERTO' ? 'text-slate-300' : 'text-slate-500'
            }`}>
              Em Aberto
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'ALL' && statusFilter === 'ABERTO' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}>
              {stats.openCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.openTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'ALL' && statusFilter === 'ABERTO' ? 'text-slate-400' : 'text-slate-500'}`}>
            Total a pagar em aberto
          </div>
        </button>

        {/* Card: Vence Hoje */}
        <button
          type="button"
          onClick={() => setQuickDateFilter(prev => prev === 'HOJE' ? 'ALL' : 'HOJE')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            quickDateFilter === 'HOJE'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400/40'
              : 'bg-amber-50/50 hover:bg-amber-50 border-amber-200 text-amber-950 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'HOJE' ? 'text-amber-100' : 'text-amber-800'
            }`}>
              Vence Hoje
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'HOJE' ? 'bg-amber-600 text-white' : 'bg-amber-200 text-amber-900'
            }`}>
              {stats.hojeCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.hojeTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'HOJE' ? 'text-amber-100' : 'text-amber-700'}`}>
            Vencendo na data de hoje
          </div>
        </button>

        {/* Card: Vence Esta Semana */}
        <button
          type="button"
          onClick={() => setQuickDateFilter(prev => prev === 'ESTA_SEMANA' ? 'ALL' : 'ESTA_SEMANA')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            quickDateFilter === 'ESTA_SEMANA'
              ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400/40'
              : 'bg-rose-50/50 hover:bg-rose-50 border-rose-200 text-rose-950 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'ESTA_SEMANA' ? 'text-rose-100' : 'text-rose-800'
            }`}>
              Vence Esta Semana
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'ESTA_SEMANA' ? 'bg-rose-700 text-white' : 'bg-rose-200 text-rose-900'
            }`}>
              {stats.semanaCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.semanaTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'ESTA_SEMANA' ? 'text-rose-100' : 'text-rose-700'}`}>
            Agenda até domingo
          </div>
        </button>

        {/* Card: Vencidos */}
        <button
          type="button"
          onClick={() => setQuickDateFilter(prev => prev === 'VENCIDO' ? 'ALL' : 'VENCIDO')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            quickDateFilter === 'VENCIDO'
              ? 'bg-red-700 text-white border-red-800 shadow-md ring-2 ring-red-500/40'
              : 'bg-red-50/60 hover:bg-red-50 border-red-200 text-red-950 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'VENCIDO' ? 'text-red-100' : 'text-red-800'
            }`}>
              Vencidos
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'VENCIDO' ? 'bg-red-800 text-white' : 'bg-red-200 text-red-900'
            }`}>
              {stats.vencidosCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.vencidosTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'VENCIDO' ? 'text-red-100' : 'text-red-700'}`}>
            Obrigações em atraso
          </div>
        </button>

        {/* Card: Pagos / Liquidados */}
        <button
          type="button"
          onClick={() => {
            setQuickDateFilter(prev => prev === 'LIQUIDADO' ? 'ALL' : 'LIQUIDADO');
            setStatusFilter('LIQUIDADO');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all col-span-2 sm:col-span-1 ${
            quickDateFilter === 'LIQUIDADO' || statusFilter === 'LIQUIDADO'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-400/40'
              : 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200 text-emerald-950 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'LIQUIDADO' || statusFilter === 'LIQUIDADO' ? 'text-emerald-100' : 'text-emerald-800'
            }`}>
              Pagos
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'LIQUIDADO' || statusFilter === 'LIQUIDADO' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'
            }`}>
              {stats.liquidadosCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.liquidadosTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'LIQUIDADO' || statusFilter === 'LIQUIDADO' ? 'text-emerald-100' : 'text-emerald-700'}`}>
            Total liquidado
          </div>
        </button>
      </div>

      {/* Top Filter Bar (Superior Filters) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        
        {/* Row 1: Status Pill Tabs & Search */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          
          {/* Status Pill Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs pb-1 md:pb-0">
            {[
              { id: 'ABERTO', label: 'Em Aberto' },
              { id: 'VENCIDO', label: 'Vencidos' },
              { id: 'LIQUIDADO', label: 'Liquidados' },
              { id: 'TODOS', label: 'Todos' },
              { id: 'CANCELADO', label: 'Cancelados' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id as any);
                  setQuickDateFilter('ALL');
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  statusFilter === tab.id && quickDateFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por fornecedor, documento ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
            />
          </div>
        </div>

        {/* Row 2: Advanced Dropdown Filters (Category, Supplier, Bank Account, Origin) */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs items-center">
          
          {/* Categoria / Plano de Contas */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Plano de Contas / Despesa:
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="ALL">Todas as Despesas</option>
              {chartAccounts.filter(a => a.type === 'DESPESA').map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fornecedor / Favorecido */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Fornecedor / Favorecido:
            </label>
            <select
              value={counterpartyFilter}
              onChange={(e) => setCounterpartyFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="ALL">Todos os Fornecedores</option>
              {counterparties.filter(c => c.type === 'FORNECEDOR' || c.type === 'AMBOS').map(cp => (
                <option key={cp.id} value={cp.id}>
                  {cp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Conta Bancária / Caixa Previsto */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Conta Bancária / Caixa:
            </label>
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="ALL">Todas as Contas</option>
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.institution || b.type})
                </option>
              ))}
            </select>
          </div>

          {/* Origem / Modalidade (Cartão de Crédito vs Título) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Modalidade / Origem:
            </label>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="ALL">Todas as Modalidades</option>
              <option value="CARTAO_CREDITO">💳 Cartão de Crédito</option>
              <option value="OUTROS">📄 Boletos / Títulos Tradicionais</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end h-full pt-4 sm:pt-0">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg font-medium transition-colors flex items-center justify-center w-full shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Global Period Banner */}
      <GlobalPeriodBanner
        moduleName="Contas a Pagar"
        matchedCount={filteredTitles.length}
        totalCount={titles.length}
      />

      {/* Batch Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 to-rose-950 text-white p-3.5 rounded-xl border border-rose-800 shadow-lg flex flex-wrap justify-between items-center gap-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-3">
            <span className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-xs">
              {selectedIds.length}
            </span>
            <div>
              <div className="font-semibold text-xs">
                {selectedIds.length} obrigação(ões) selecionada(s)
              </div>
              <div className="text-[11px] text-rose-200">
                Saldo total selecionado: {formatBRL(titles.filter(t => selectedIds.includes(t.id)).reduce((acc, t) => acc + t.balancePrincipal, 0))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsBatchEditOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              Alteração em Massa
            </button>

            <button
              onClick={() => handleBatchDuplicate(false)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium border border-white/20 transition-colors flex items-center"
              title="Duplicar obrigações para a mesma competência"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Duplicar
            </button>

            <button
              onClick={() => handleBatchDuplicate(true)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium border border-white/20 transition-colors flex items-center"
              title="Duplicar avançando competência e vencimento em +1 mês"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
              Duplicar (+1 Mês)
            </button>

            <button
              onClick={handleBatchCancel}
              className="px-3 py-1.5 bg-rose-700/80 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Cancelar em Lote
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* Summary Banner */}
      <div className="bg-rose-50/50 border border-rose-100 px-4 py-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
        <span className="text-rose-900 flex items-center">
          Listando <strong>{filteredTitles.length}</strong> obrigações a pagar.
          <span className="ml-3 text-[11px] text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-rose-200">
            💡 Dica: Duplo clique em qualquer linha para editar o lançamento
          </span>
        </span>
        <span className="text-rose-950 font-bold text-sm">
          Saldo em Aberto a Pagar: {formatBRL(openBalanceTotal)}
        </span>
      </div>

      {/* Payables Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider select-none">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-slate-500 hover:text-slate-800 transition-colors"
                    title={isAllSelected ? "Desmarcar todos" : "Selecionar todas as obrigações da lista"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>

                {/* Título / Documento */}
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('titleNumber')}
                  title="Clique para ordenar por Documento/Descrição"
                >
                  <div className="flex items-center space-x-1">
                    <span>Título / Documento</span>
                    {sortField === 'titleNumber' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Fornecedor / Favorecido */}
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('counterparty')}
                  title="Clique para ordenar por Fornecedor (Ordem Alfabética)"
                >
                  <div className="flex items-center space-x-1">
                    <span>Fornecedor / Favorecido</span>
                    {sortField === 'counterparty' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Competência */}
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('competence')}
                  title="Clique para ordenar por Competência"
                >
                  <div className="flex items-center space-x-1">
                    <span>Competência</span>
                    {sortField === 'competence' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Vencimento */}
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('dueDate')}
                  title="Clique para ordenar por Data de Vencimento"
                >
                  <div className="flex items-center space-x-1">
                    <span>Vencimento</span>
                    {sortField === 'dueDate' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Previsão Caixa */}
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('expectedCashDate')}
                  title="Clique para ordenar por Data de Previsão de Pagamento"
                >
                  <div className="flex items-center space-x-1">
                    <span>Previsão Caixa</span>
                    {sortField === 'expectedCashDate' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Valor Original */}
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('originalAmount')}
                  title="Clique para ordenar por Valor Original"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Valor Original</span>
                    {sortField === 'originalAmount' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Saldo Restante */}
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('balancePrincipal')}
                  title="Clique para ordenar por Saldo Restante"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Saldo Restante</span>
                    {sortField === 'balancePrincipal' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Situação Temporal */}
                <th className="py-3 px-4 text-center">Situação Temporal</th>

                {/* Status */}
                <th 
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('status')}
                  title="Clique para ordenar por Status"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Status</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>

                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTitles.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-700">
                    Nenhuma obrigação a pagar localizada para os filtros informados.
                  </td>
                </tr>
              ) : (
                sortedTitles.map(t => {
                  const supplier = counterparties.find(c => c.id === t.counterpartyId);
                  const tempStatus = getTemporalStatus(t, today);
                  const isSelected = selectedIds.includes(t.id);

                  // Days diff for visual indicator
                  const dueDateObj = new Date(t.dueDate + 'T00:00:00');
                  const todayObj = new Date(today + 'T00:00:00');
                  const diffDays = Math.ceil((dueDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));

                  // Row status styling: Red (Overdue), Yellow (Near due 0-3 days), Clean (On time)
                  let rowColorClass = 'hover:bg-slate-50 transition-colors';
                  if (t.documentState === 'CANCELADO') {
                    rowColorClass = 'opacity-50 bg-slate-50/50';
                  } else if (t.balancePrincipal > 0) {
                    if (diffDays < 0) {
                      // Overdue - Red alert
                      rowColorClass = 'bg-rose-50/75 hover:bg-rose-100/80 border-l-4 border-l-rose-500 text-rose-950 font-medium';
                    } else if (diffDays <= 3) {
                      // Near due (Today or next 3 days) - Amber alert
                      rowColorClass = 'bg-amber-50/75 hover:bg-amber-100/80 border-l-4 border-l-amber-500 text-amber-950 font-medium';
                    }
                  } else if (t.settlementState === 'LIQUIDADO') {
                    rowColorClass = 'hover:bg-emerald-50/30 transition-colors';
                  }

                  if (isSelected) {
                    rowColorClass += ' bg-rose-100/80';
                  }

                  return (
                    <tr 
                      key={t.id}
                      onDoubleClick={() => setSelectedTitleForEdit(t)}
                      title="💡 Dê um duplo clique para editar este lançamento"
                      className={`cursor-pointer select-none ${rowColorClass}`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {t.documentState !== 'CANCELADO' && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectOne(t.id, e as any)}
                            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                          />
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-semibold text-slate-900">{t.titleNumber}</span>
                          {t.originType === 'CARTAO_CREDITO' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200 shadow-2xs">
                              <CreditCard className="w-3 h-3 text-violet-600" />
                              Cartão de Crédito
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-700 truncate max-w-[220px]">{t.description}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{supplier?.name || 'Fornecedor'}</div>
                        <div className="text-[10px] text-slate-700">{supplier?.document}</div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-indigo-700">
                        {t.competence}
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {formatDateBR(t.dueDate)}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {formatDateBR(t.expectedCashDate || t.dueDate)}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-700 font-medium">
                        {formatBRL(t.originalAmount)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-rose-700 text-sm">
                        {formatBRL(t.balancePrincipal)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {t.balancePrincipal <= 0 ? (
                          <span className="text-[10px] font-medium text-slate-700">-</span>
                        ) : (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            tempStatus === 'VENCIDO'
                              ? 'bg-rose-100 text-rose-800'
                              : tempStatus === 'VENCE_HOJE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {tempStatus === 'VENCIDO' ? 'Vencido' : tempStatus === 'VENCE_HOJE' ? 'Vence Hoje' : 'A Vencer'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          t.documentState === 'CANCELADO'
                            ? 'bg-slate-200 text-slate-700'
                            : t.settlementState === 'LIQUIDADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.settlementState === 'PARCIAL'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.documentState === 'CANCELADO' ? 'CANCELADO' : t.settlementState}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {t.balancePrincipal > 0 && t.documentState !== 'CANCELADO' && (
                          <button
                            onClick={() => setSelectedTitleForSettlement(t)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-2xs transition-colors inline-flex items-center"
                            title="Efetuar pagamento da obrigação"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Pagar
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedTitleForEdit(t)}
                          className="p-1 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="Editar obrigação (ou dê duplo clique na linha)"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => handleDuplicateOne(t, e)}
                          className="p-1 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="Duplicar esta obrigação"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setHistoryTitle(t)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="Ver detalhes e histórico de pagamentos"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {t.balancePrincipal === t.originalAmount && t.documentState !== 'CANCELADO' && (
                          <button
                            onClick={() => handleCancelTitle(t)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Cancelar Obrigação"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement Modal */}
      {selectedTitleForSettlement && (
        <SettlementModal
          title={selectedTitleForSettlement}
          isOpen={true}
          onClose={() => setSelectedTitleForSettlement(null)}
          onSettled={() => {
            setSelectedTitleForSettlement(null);
            window.location.reload();
          }}
        />
      )}

      {/* History Modal */}
      {historyTitle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-semibold text-slate-900">
                Histórico da Obrigação: {historyTitle.titleNumber}
              </h2>
              <button onClick={() => setHistoryTitle(null)} className="text-slate-400 hover:text-slate-700 p-1">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-700">Valor Original:</span>
                  <span className="font-semibold text-slate-800">{formatBRL(historyTitle.originalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Principal Pago:</span>
                  <span className="font-semibold text-rose-700">{formatBRL(historyTitle.settledPrincipal)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-800 font-medium">Saldo Restante:</span>
                  <span className="font-bold text-slate-900">{formatBRL(historyTitle.balancePrincipal)}</span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-2">Pagamentos Realizados</h3>
                {settlements.filter(s => s.titleId === historyTitle.id).length === 0 ? (
                  <p className="text-slate-700 p-3 bg-slate-50 rounded border border-slate-100">
                    Nenhum pagamento registrado até o momento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {settlements.filter(s => s.titleId === historyTitle.id).map(s => (
                      <div key={s.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>Data: {formatDateBR(s.settlementDate)}</span>
                          <span className="text-rose-700">-{formatBRL(s.components.netFinancialAmount)}</span>
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          Principal pago: {formatBRL(s.components.principalSettled)} | Desconto: {formatBRL(s.components.discount)} | Juros: {formatBRL(s.components.interest)}
                        </div>
                        {s.voucherRef && (
                          <div className="text-slate-700 text-[10px]">Autenticação: {s.voucherRef}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setHistoryTitle(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Title Modal (Double click or pencil action) */}
      <EditTitleModal
        isOpen={!!selectedTitleForEdit}
        title={selectedTitleForEdit}
        onClose={() => setSelectedTitleForEdit(null)}
        onSaved={() => {
          setSelectedTitleForEdit(null);
          setRefreshKey(k => k + 1);
        }}
      />

      {/* Batch Edit Titles Modal */}
      <BatchEditTitlesModal
        isOpen={isBatchEditOpen}
        selectedTitleIds={selectedIds}
        type="PAGAR"
        onClose={() => setIsBatchEditOpen(false)}
        onSaved={() => {
          setIsBatchEditOpen(false);
          setSelectedIds([]);
          setRefreshKey(k => k + 1);
        }}
      />

      {/* Spreadsheet Import Modal */}
      <ImportSpreadsheetModal
        isOpen={isImportModalOpen}
        defaultType="PAGAR"
        onClose={() => setIsImportModalOpen(false)}
        onImportCompleted={() => {
          setIsImportModalOpen(false);
          setRefreshKey(k => k + 1);
        }}
      />

    </div>
  );
};
