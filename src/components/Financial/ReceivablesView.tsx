import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  FileSpreadsheet,
  Calendar,
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
  RotateCcw
} from 'lucide-react';
import { FinancialTitle, Settlement } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatDateBR, getTemporalStatus } from '../../services/financialEngine';
import { SettlementModal } from '../Modals/SettlementModal';
import { EditTitleModal } from '../Modals/EditTitleModal';
import { BatchEditTitlesModal } from '../Modals/BatchEditTitlesModal';
import { ImportSpreadsheetModal } from '../Modals/ImportSpreadsheetModal';
import { GlobalPeriodBanner } from '../Common/GlobalPeriodBanner';
import { useGlobalPeriod } from '../../hooks/useGlobalPeriod';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';

interface ReceivablesViewProps {
  onOpenNewTitleModal: (type: 'RECEBER') => void;
}

export const ReceivablesView: React.FC<ReceivablesViewProps> = ({ onOpenNewTitleModal }) => {
  const today = new Date().toISOString().split('T')[0];
  const { period } = useGlobalPeriod();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ABERTO' | 'VENCIDO' | 'LIQUIDADO' | 'CANCELADO'>('ABERTO');
  const [quickDateFilter, setQuickDateFilter] = useState<'ALL' | 'HOJE' | 'ESTA_SEMANA' | 'VENCIDO' | 'LIQUIDADO'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [counterpartyFilter, setCounterpartyFilter] = useState<string>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');

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

  const titles = storage.getTitles().filter(t => t.type === 'RECEBER');
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
      const client = counterparties.find(c => c.id === t.counterpartyId);
      const clientName = client?.name.toLowerCase() || '';
      const matchSearch = clientName.includes(searchTerm.toLowerCase()) || 
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
  }, [periodTitles, searchTerm, categoryFilter, counterpartyFilter, bankFilter, quickDateFilter, statusFilter, today, weekRange, counterparties]);

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
    setQuickDateFilter('ALL');
    setStatusFilter('ABERTO');
  };

  const hasActiveFilters = searchTerm !== '' || categoryFilter !== 'ALL' || counterpartyFilter !== 'ALL' || bankFilter !== 'ALL' || quickDateFilter !== 'ALL';

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
    alert(`${created.length} título(s) duplicado(s) com sucesso!`);
    setSelectedIds([]);
    setRefreshKey(k => k + 1);
  };

  const handleBatchCancel = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Deseja realmente cancelar ${selectedIds.length} título(s) selecionado(s)? Lançamentos com baixas parciais ou já liquidados serão preservados.`)) {
      const res = storage.batchCancelTitles(selectedIds);
      alert(`${res.cancelledCount} título(s) cancelado(s) com sucesso.${res.ignoredCount > 0 ? ` (${res.ignoredCount} títulos ignorados por possuírem baixas)` : ''}`);
      setSelectedIds([]);
      setRefreshKey(k => k + 1);
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    const headers = ['Título', 'Cliente', 'Descrição', 'Competência', 'Emissão', 'Vencimento', 'Previsão Caixa', 'Valor Original', 'Principal Baixado', 'Saldo Atual', 'Situação'];
    const rows = filteredTitles.map(t => {
      const client = counterparties.find(c => c.id === t.counterpartyId);
      return [
        t.titleNumber,
        client?.name || 'Cliente',
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
    exportToExcel(`contas-a-receber-${today}`, 'Contas a Receber', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['Título', 'Cliente', 'Descrição', 'Competência', 'Emissão', 'Vencimento', 'Previsão Caixa', 'Valor Original', 'Saldo Atual', 'Situação'];
    const rows = filteredTitles.map(t => {
      const client = counterparties.find(c => c.id === t.counterpartyId);
      return [
        t.titleNumber,
        client?.name || 'Cliente',
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
    exportToCSV(`contas-a-receber-${today}`, headers, rows);
  };

  const handleCancelTitle = (t: FinancialTitle) => {
    if (t.settledPrincipal > 0) {
      alert('Títulos com baixas parciais não podem ser cancelados diretamente. Estorne as baixas primeiro.');
      return;
    }
    if (confirm(`Deseja realmente cancelar o título ${t.titleNumber}?`)) {
      const all = storage.getTitles();
      const updated = all.map(item => item.id === t.id ? { ...item, documentState: 'CANCELADO' as const, updatedAt: new Date().toISOString() } : item);
      storage.saveTitles(updated);

      const currentUser = storage.getCurrentUser();
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CANCELAMENTO_TITULO',
        module: 'Contas a Receber',
        recordId: t.id,
        details: `Cancelamento do título ${t.titleNumber} (${formatBRL(t.originalAmount)}).`
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
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contas a Receber</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Gestão de direitos, honorários faturados, agenda de liquidação e baixas parciais ou integrais.
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
            className="px-3 py-2 bg-white border border-cyan-300 text-cyan-800 hover:bg-cyan-50 rounded-lg text-xs font-semibold transition-colors flex items-center shadow-2xs"
            title="Importar lançamentos de planilha externa (Conta Azul, Asaas, Omie, etc.)"
          >
            <Upload className="w-4 h-4 mr-1.5 text-cyan-600" />
            Importar Planilha
          </button>
          <button
            onClick={() => onOpenNewTitleModal('RECEBER')}
            className="px-3.5 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-2xs flex items-center"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Recebimento
          </button>
        </div>
      </div>

      {/* Quick Date Filter Blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card: Todos em Aberto */}
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
            Total a receber em carteira
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
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400/40'
              : 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200 text-indigo-950 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'ESTA_SEMANA' ? 'text-indigo-100' : 'text-indigo-800'
            }`}>
              Vence Esta Semana
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'ESTA_SEMANA' ? 'bg-indigo-700 text-white' : 'bg-indigo-200 text-indigo-900'
            }`}>
              {stats.semanaCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.semanaTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'ESTA_SEMANA' ? 'text-indigo-100' : 'text-indigo-700'}`}>
            Agenda até domingo
          </div>
        </button>

        {/* Card: Vencidos */}
        <button
          type="button"
          onClick={() => setQuickDateFilter(prev => prev === 'VENCIDO' ? 'ALL' : 'VENCIDO')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            quickDateFilter === 'VENCIDO'
              ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400/40'
              : 'bg-rose-50/60 hover:bg-rose-50 border-rose-200 text-rose-950 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'VENCIDO' ? 'text-rose-100' : 'text-rose-800'
            }`}>
              Vencidos
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'VENCIDO' ? 'bg-rose-700 text-white' : 'bg-rose-200 text-rose-900'
            }`}>
              {stats.vencidosCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.vencidosTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'VENCIDO' ? 'text-rose-100' : 'text-rose-700'}`}>
            Títulos em atraso
          </div>
        </button>

        {/* Card: Liquidados */}
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
              Recebidos
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
              placeholder="Buscar por cliente, documento ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
        </div>

        {/* Row 2: Advanced Dropdown Filters (Category, Client, Bank Account) */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs items-center">
          
          {/* Categoria / Plano de Contas */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Plano de Contas / Categoria:
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Todas as Categorias</option>
              {chartAccounts.filter(a => a.type === 'RECEITA').map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cliente / Contraparte */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Cliente:
            </label>
            <select
              value={counterpartyFilter}
              onChange={(e) => setCounterpartyFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Todos os Clientes</option>
              {counterparties.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Banco / Conta Prevista */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Conta Bancária / Caixa Previsto:
            </label>
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Todas as Contas</option>
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.type})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Action */}
          <div className="flex items-end h-full">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full sm:w-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-slate-300"
                title="Limpar todos os filtros selecionados"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                Limpar Filtros
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 italic">
                Filtros rápidos ativos
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Summary Banner of current list & Global Period Banner */}
      <GlobalPeriodBanner
        moduleName="Contas a Receber"
        matchedCount={filteredTitles.length}
        totalCount={titles.length}
      />

      {/* Batch Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 rounded-xl border border-indigo-800 shadow-lg flex flex-wrap justify-between items-center gap-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-3">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs">
              {selectedIds.length}
            </span>
            <div>
              <div className="font-semibold text-xs">
                {selectedIds.length} lançamento(s) selecionado(s)
              </div>
              <div className="text-[11px] text-indigo-200">
                Saldo total selecionado: {formatBRL(titles.filter(t => selectedIds.includes(t.id)).reduce((acc, t) => acc + t.balancePrincipal, 0))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsBatchEditOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              Alteração em Massa
            </button>

            <button
              onClick={() => handleBatchDuplicate(false)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium border border-white/20 transition-colors flex items-center"
              title="Duplicar lançamentos para a mesma competência"
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
              className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center"
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

      {/* Summary Banner of current list */}
      <div className="bg-emerald-50/50 border border-emerald-100 px-4 py-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
        <span className="text-emerald-900 flex items-center">
          Listando <strong>{sortedTitles.length}</strong> lançamentos correspondentes aos filtros.
          <span className="ml-3 text-[11px] text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
            💡 Dica: Duplo clique em qualquer linha para editar o título
          </span>
        </span>
        <span className="text-emerald-950 font-bold text-sm">
          Saldo em Aberto Filtrado: {formatBRL(sortedTitles.filter(t => t.documentState !== 'CANCELADO').reduce((acc, t) => acc + t.balancePrincipal, 0))}
        </span>
      </div>

      {/* Receivables Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-slate-500 hover:text-slate-800 transition-colors"
                    title={isAllSelected ? "Desmarcar todos" : "Selecionar todos os títulos da lista"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>

                {/* Sortable Column: Título */}
                <th 
                  onClick={() => handleSort('titleNumber')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Clique para ordenar por número do título"
                >
                  <div className="flex items-center gap-1">
                    <span>Título / Lançamento</span>
                    {sortField === 'titleNumber' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Sortable Column: Cliente */}
                <th 
                  onClick={() => handleSort('counterparty')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Clique para ordenar por nome do cliente (ordem alfabética)"
                >
                  <div className="flex items-center gap-1">
                    <span>Cliente</span>
                    {sortField === 'counterparty' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Sortable Column: Competência */}
                <th 
                  onClick={() => handleSort('competence')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Clique para ordenar por competência"
                >
                  <div className="flex items-center gap-1">
                    <span>Competência</span>
                    {sortField === 'competence' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Sortable Column: Vencimento */}
                <th 
                  onClick={() => handleSort('dueDate')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Clique para ordenar por data de vencimento"
                >
                  <div className="flex items-center gap-1">
                    <span>Vencimento</span>
                    {sortField === 'dueDate' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Sortable Column: Previsão Caixa */}
                <th 
                  onClick={() => handleSort('expectedCashDate')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Clique para ordenar por previsão de caixa"
                >
                  <div className="flex items-center gap-1">
                    <span>Previsão Caixa</span>
                    {sortField === 'expectedCashDate' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Sortable Column: Valor Original */}
                <th 
                  onClick={() => handleSort('originalAmount')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Clique para ordenar por valor original"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Valor Original</span>
                    {sortField === 'originalAmount' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Sortable Column: Saldo Devedor */}
                <th 
                  onClick={() => handleSort('balancePrincipal')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Clique para ordenar por saldo devedor"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Saldo Devedor</span>
                    {sortField === 'balancePrincipal' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Temporal Situation */}
                <th className="py-3 px-4 text-center">Situação Temporal</th>

                {/* Sortable Column: Status */}
                <th 
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Clique para ordenar por status de liquidação"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Status</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTitles.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    Nenhum título a receber localizado para os filtros informados.
                  </td>
                </tr>
              ) : (
                sortedTitles.map(t => {
                  const client = counterparties.find(c => c.id === t.counterpartyId);
                  const tempStatus = getTemporalStatus(t, today);
                  const isSelected = selectedIds.includes(t.id);

                  // Calculate days diff for row highlighting
                  const daysDiff = Math.ceil((new Date(t.dueDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = t.balancePrincipal > 0 && t.dueDate < today;
                  const isNearDue = t.balancePrincipal > 0 && !isOverdue && daysDiff >= 0 && daysDiff <= 3;

                  let rowColorClass = 'hover:bg-slate-50 border-l-4 border-l-transparent';
                  if (t.documentState === 'CANCELADO') {
                    rowColorClass = 'opacity-50 bg-slate-50/50 border-l-4 border-l-slate-300';
                  } else if (t.settlementState === 'LIQUIDADO') {
                    rowColorClass = 'bg-emerald-50/25 hover:bg-emerald-50/50 border-l-4 border-l-emerald-400';
                  } else if (isOverdue) {
                    // Soft red for overdue row as requested
                    rowColorClass = 'bg-rose-50/75 hover:bg-rose-100/80 border-l-4 border-l-rose-500 text-rose-950 font-medium';
                  } else if (isNearDue) {
                    // Soft yellow for near due row as requested
                    rowColorClass = 'bg-amber-50/75 hover:bg-amber-100/80 border-l-4 border-l-amber-500 text-amber-950 font-medium';
                  }

                  return (
                    <tr 
                      key={t.id}
                      onDoubleClick={() => setSelectedTitleForEdit(t)}
                      title="💡 Dê um duplo clique para editar este lançamento"
                      className={`${rowColorClass} transition-colors cursor-pointer select-none ${
                        isSelected ? 'bg-indigo-50/90 ring-1 ring-inset ring-indigo-300' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {t.documentState !== 'CANCELADO' && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectOne(t.id, e as any)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                          />
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-slate-900">{t.titleNumber}</div>
                        <div className="text-[11px] text-slate-700 truncate max-w-[200px]">{t.description}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{client?.name || 'Cliente'}</div>
                        <div className="text-[10px] text-slate-700">{client?.document}</div>
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

                      <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                        {formatBRL(t.balancePrincipal)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {t.balancePrincipal <= 0 ? (
                          <span className="text-[10px] font-medium text-slate-500">-</span>
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
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-2xs transition-colors inline-flex items-center"
                            title="Efetuar baixa de recebimento"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Baixar
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedTitleForEdit(t)}
                          className="p-1 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                          title="Editar lançamento (ou dê duplo clique na linha)"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => handleDuplicateOne(t, e)}
                          className="p-1 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                          title="Duplicar este lançamento"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setHistoryTitle(t)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="Ver detalhes e histórico de liquidações"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {t.balancePrincipal === t.originalAmount && t.documentState !== 'CANCELADO' && (
                          <button
                            onClick={() => handleCancelTitle(t)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Cancelar Título"
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

      {/* History and Settlement Details Modal */}
      {historyTitle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-semibold text-slate-900">
                Histórico do Título: {historyTitle.titleNumber}
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
                  <span className="text-slate-700">Principal Baixado:</span>
                  <span className="font-semibold text-emerald-700">{formatBRL(historyTitle.settledPrincipal)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-800 font-medium">Saldo Restante:</span>
                  <span className="font-bold text-slate-900">{formatBRL(historyTitle.balancePrincipal)}</span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-2">Liquidações Realizadas</h3>
                {settlements.filter(s => s.titleId === historyTitle.id).length === 0 ? (
                  <p className="text-slate-700 p-3 bg-slate-50 rounded border border-slate-100">
                    Nenhuma baixa registrada até o momento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {settlements.filter(s => s.titleId === historyTitle.id).map(s => (
                      <div key={s.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>Data: {formatDateBR(s.settlementDate)}</span>
                          <span className="text-emerald-700">+{formatBRL(s.components.netFinancialAmount)}</span>
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          Principal baixado: {formatBRL(s.components.principalSettled)} | Desc: {formatBRL(s.components.discount)} | Juros: {formatBRL(s.components.interest)} | Tarifa: {formatBRL(s.components.bankFee)}
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
        type="RECEBER"
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
        defaultType="RECEBER"
        onClose={() => setIsImportModalOpen(false)}
        onImportCompleted={() => {
          setIsImportModalOpen(false);
          setRefreshKey(k => k + 1);
        }}
      />

    </div>
  );
};
