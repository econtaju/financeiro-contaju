import React, { useState, useMemo, useEffect } from 'react';
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
  Ban,
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
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ShieldCheck,
  MessageCircle,
  Lock
} from 'lucide-react';
import { FinancialTitle, Settlement } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatDateBR, getTemporalStatus } from '../../services/financialEngine';
import { CreditRiskService, CustomerRiskProfile, RiskLevel } from '../../services/creditRiskService';
import { matchesSearch } from '../../utils/searchUtils';
import { SettlementModal } from '../Modals/SettlementModal';
import { EditTitleModal } from '../Modals/EditTitleModal';
import { BatchEditTitlesModal } from '../Modals/BatchEditTitlesModal';
import { BatchSettlementModal } from '../Modals/BatchSettlementModal';
import { BatchPostponeModal } from '../Modals/BatchPostponeModal';
import { ImportSpreadsheetModal } from '../Modals/ImportSpreadsheetModal';
import { ConfirmBatchActionModal } from '../Modals/ConfirmBatchActionModal';
import { GlobalPeriodBanner } from '../Common/GlobalPeriodBanner';
import { useGlobalPeriod } from '../../hooks/useGlobalPeriod';
import { toast } from '../../hooks/useToast';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';

interface ReceivablesViewProps {
  onOpenNewTitleModal: (type: 'RECEBER') => void;
  initialSearch?: string;
}

export const ReceivablesView: React.FC<ReceivablesViewProps> = ({ onOpenNewTitleModal, initialSearch = '' }) => {
  const today = new Date().toISOString().split('T')[0];
  const { period } = useGlobalPeriod();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ABERTO' | 'VENCIDO' | 'LIQUIDADO' | 'CANCELADO'>(
    initialSearch ? 'TODOS' : 'ABERTO'
  );

  React.useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
      setStatusFilter('TODOS');
    }
  }, [initialSearch]);
  const [quickDateFilter, setQuickDateFilter] = useState<'ALL' | 'HOJE' | 'ESTA_SEMANA' | 'VENCIDO' | 'LIQUIDADO'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [counterpartyFilter, setCounterpartyFilter] = useState<string>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'BAIXO' | 'MODERADO' | 'ALTO'>('ALL');

  // Sorting state
  const [sortField, setSortField] = useState<string>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [selectedTitleForSettlement, setSelectedTitleForSettlement] = useState<FinancialTitle | null>(null);
  const [selectedTitleForEdit, setSelectedTitleForEdit] = useState<FinancialTitle | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isBatchSettlementOpen, setIsBatchSettlementOpen] = useState(false);
  const [isBatchPostponeOpen, setIsBatchPostponeOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedMobileIds, setExpandedMobileIds] = useState<Record<string, boolean>>({});
  const [historyTitle, setHistoryTitle] = useState<FinancialTitle | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const toggleExpandMobile = (id: string) => {
    setExpandedMobileIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Modal de Confirmação em Lote ou Individual
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    mode: 'DELETE' | 'CANCEL';
    titles: FinancialTitle[];
  }>({
    isOpen: false,
    mode: 'DELETE',
    titles: []
  });

  // Notificação Toast não-bloqueante (substitui window.alert)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    toast.show({
      type: toastMessage.type,
      message: toastMessage.text,
      title: toastMessage.type === 'success' ? 'Contas a Receber' : (toastMessage.type === 'error' ? 'Erro' : 'Aviso')
    });
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Inscrição reativa para atualizações instantâneas no storage
  useEffect(() => {
    return storage.subscribe(() => {
      setRefreshKey(k => k + 1);
    });
  }, []);

  const titles = useMemo(() => {
    try {
      const data = storage.getTitles();
      return Array.isArray(data) ? data.filter(t => t && t.type === 'RECEBER') : [];
    } catch (err) {
      console.error('Erro ao ler títulos a receber:', err);
      return [];
    }
  }, [refreshKey]);

  const counterparties = useMemo(() => {
    try {
      const data = storage.getCounterparties();
      return Array.isArray(data) ? data.filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [refreshKey]);

  const chartAccounts = useMemo(() => {
    try {
      const data = storage.getChartAccounts();
      return Array.isArray(data) ? data.filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [refreshKey]);

  const bankAccounts = useMemo(() => {
    try {
      const data = storage.getBankAccounts();
      return Array.isArray(data) ? data.filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [refreshKey]);

  const settlements = useMemo(() => {
    try {
      const data = storage.getSettlements();
      return Array.isArray(data) ? data.filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [refreshKey]);

  // Current week range (Monday to Sunday)
  const weekRange = useMemo(() => {
    try {
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
    } catch {
      return { start: today, end: today };
    }
  }, [today]);

  // Base titles matching Global Period
  const periodTitles = useMemo(() => {
    try {
      return titles.filter(t => {
        if (!t) return false;
        if (period && period.active) {
          const pYear = period.year;
          const pMonth = period.month;
          const compStr = String(t.competence || '');
          const dueStr = String(t.dueDate || '');
          const cashStr = String(t.expectedCashDate || '');

          if (pMonth === 0) {
            const yStr = String(pYear);
            const matchYear = compStr.startsWith(yStr) || dueStr.startsWith(yStr) || cashStr.startsWith(yStr);
            if (!matchYear) return false;
          } else {
            const ymStr = `${pYear}-${String(pMonth).padStart(2, '0')}`;
            const matchPeriod = compStr === ymStr || dueStr.startsWith(ymStr) || cashStr.startsWith(ymStr);
            if (!matchPeriod) return false;
          }
        }
        return true;
      });
    } catch (err) {
      console.error('Erro ao filtrar títulos por período:', err);
      return [];
    }
  }, [titles, period]);

  // KPI block stats
  const stats = useMemo(() => {
    try {
      const notCancelled = periodTitles.filter(t => t && t.documentState !== 'CANCELADO');
      const open = notCancelled.filter(t => (Number(t.balancePrincipal) || 0) > 0);
      const hoje = open.filter(t => String(t.dueDate || '') === today);
      const semana = open.filter(t => {
        const d = String(t.dueDate || '');
        return d && d >= weekRange.start && d <= weekRange.end;
      });
      const vencidos = open.filter(t => {
        const d = String(t.dueDate || '');
        return d && d < today;
      });
      const liquidados = notCancelled.filter(t => t.settlementState === 'LIQUIDADO');

      return {
        openTotal: open.reduce((acc, t) => acc + (Number(t.balancePrincipal) || 0), 0),
        openCount: open.length,
        hojeTotal: hoje.reduce((acc, t) => acc + (Number(t.balancePrincipal) || 0), 0),
        hojeCount: hoje.length,
        semanaTotal: semana.reduce((acc, t) => acc + (Number(t.balancePrincipal) || 0), 0),
        semanaCount: semana.length,
        vencidosTotal: vencidos.reduce((acc, t) => acc + (Number(t.balancePrincipal) || 0), 0),
        vencidosCount: vencidos.length,
        liquidadosTotal: liquidados.reduce((acc, t) => acc + (Number(t.originalAmount) || 0), 0),
        liquidadosCount: liquidados.length,
        canceladosCount: periodTitles.filter(t => t && t.documentState === 'CANCELADO').length,
        todosCount: periodTitles.length
      };
    } catch (err) {
      console.error('Erro ao calcular estatísticas de recebíveis:', err);
      return {
        openTotal: 0, openCount: 0,
        hojeTotal: 0, hojeCount: 0,
        semanaTotal: 0, semanaCount: 0,
        vencidosTotal: 0, vencidosCount: 0,
        liquidadosTotal: 0, liquidadosCount: 0,
        canceladosCount: 0,
        todosCount: 0
      };
    }
  }, [periodTitles, today, weekRange]);

  // Diagnóstico Preditivo de Risco de Crédito da Carteira
  const portfolioRisk = useMemo(() => {
    return CreditRiskService.getPortfolioRiskOverview(today);
  }, [titles, refreshKey, today]);

  // Filtering
  const filteredTitles = useMemo(() => {
    try {
      return periodTitles.filter(t => {
        if (!t) return false;
        const client = counterparties.find(c => c && c.id === t.counterpartyId);
        const chartAcc = chartAccounts.find(a => a && (a.id === t.accountId || a.id === t.chartAccountId));
        const matchSearch = matchesSearch([
          client?.name,
          client?.tradeName,
          client?.document,
          t.titleNumber,
          t.description,
          chartAcc?.name,
          chartAcc?.code
        ], searchTerm);

        if (!matchSearch) return false;

        // Risk filter
        if (riskFilter !== 'ALL') {
          const p = portfolioRisk.customerProfiles[t.counterpartyId];
          if (p?.riskLevel !== riskFilter) return false;
        }

        // Category filter
        if (categoryFilter !== 'ALL' && t.chartAccountId !== categoryFilter && t.accountId !== categoryFilter) {
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

        const balance = Number(t.balancePrincipal) || 0;
        const due = String(t.dueDate || '');

        // Quick Date filter
        if (quickDateFilter === 'HOJE') {
          if (t.documentState === 'CANCELADO' || balance <= 0 || due !== today) return false;
        } else if (quickDateFilter === 'ESTA_SEMANA') {
          if (t.documentState === 'CANCELADO' || balance <= 0 || due < weekRange.start || due > weekRange.end) return false;
        } else if (quickDateFilter === 'VENCIDO') {
          if (t.documentState === 'CANCELADO' || balance <= 0 || due >= today) return false;
        } else if (quickDateFilter === 'LIQUIDADO') {
          if (t.documentState === 'CANCELADO' || t.settlementState !== 'LIQUIDADO') return false;
        }

        // Status pill tab filter (only applied if quickDateFilter is ALL)
        if (quickDateFilter === 'ALL') {
          if (statusFilter === 'TODOS') return true;
          if (statusFilter === 'CANCELADO') return t.documentState === 'CANCELADO';
          if (t.documentState === 'CANCELADO') return false;

          if (statusFilter === 'ABERTO') return balance > 0;
          if (statusFilter === 'VENCIDO') return balance > 0 && due < today;
          if (statusFilter === 'LIQUIDADO') return t.settlementState === 'LIQUIDADO';
        }

        return true;
      });
    } catch (err) {
      console.error('Erro ao filtrar títulos:', err);
      return [];
    }
  }, [periodTitles, searchTerm, categoryFilter, counterpartyFilter, bankFilter, quickDateFilter, statusFilter, today, weekRange, counterparties, chartAccounts]);

  // Sorting
  const sortedTitles = useMemo(() => {
    try {
      return [...filteredTitles].sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        switch (sortField) {
          case 'titleNumber':
            valA = a.titleNumber || '';
            valB = b.titleNumber || '';
            break;
          case 'counterparty':
            valA = counterparties.find(c => c && c.id === a.counterpartyId)?.name || '';
            valB = counterparties.find(c => c && c.id === b.counterpartyId)?.name || '';
            break;
          case 'competence':
            valA = a.competence || '';
            valB = b.competence || '';
            break;
          case 'dueDate':
            valA = a.dueDate || '';
            valB = b.dueDate || '';
            break;
          case 'expectedCashDate':
            valA = a.expectedCashDate || a.dueDate || '';
            valB = b.expectedCashDate || b.dueDate || '';
            break;
          case 'originalAmount':
            valA = Number(a.originalAmount) || 0;
            valB = Number(b.originalAmount) || 0;
            break;
          case 'balancePrincipal':
            valA = Number(a.balancePrincipal) || 0;
            valB = Number(b.balancePrincipal) || 0;
            break;
          case 'status':
            valA = a.documentState === 'CANCELADO' ? 'CANCELADO' : (a.settlementState || '');
            valB = b.documentState === 'CANCELADO' ? 'CANCELADO' : (b.settlementState || '');
            break;
          default:
            valA = a.dueDate || '';
            valB = b.dueDate || '';
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? (valA - valB) : (valB - valA);
        } else {
          const strA = String(valA || '');
          const strB = String(valB || '');
          const res = strA.localeCompare(strB);
          return sortOrder === 'asc' ? res : -res;
        }
      });
    } catch (err) {
      console.error('Erro ao ordenar títulos:', err);
      return filteredTitles;
    }
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

  // Batch selection helpers - Permite selecionar qualquer lançamento, inclusive cancelados para exclusão em lote
  const selectableTitles = filteredTitles;
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
      setToastMessage({
        type: 'success',
        text: `Título ${t.titleNumber} duplicado com sucesso!`
      });
    }
  };

  // Batch operations
  const handleBatchDuplicate = (advanceMonth = false) => {
    if (selectedIds.length === 0) return;
    const created = storage.duplicateTitles(selectedIds, advanceMonth);
    setSelectedIds([]);
    setRefreshKey(k => k + 1);
    setToastMessage({
      type: 'success',
      text: `${created.length} título(s) duplicado(s) com sucesso!`
    });
  };

  // Triggers para abrir o modal de confirmação
  const handleOpenBatchDelete = () => {
    if (selectedIds.length === 0) return;
    const allTitles = storage.getTitles();
    const targetTitles = allTitles.filter(t => selectedIds.includes(t.id));
    setConfirmModalState({
      isOpen: true,
      mode: 'DELETE',
      titles: targetTitles.length > 0 ? targetTitles : titles.filter(t => selectedIds.includes(t.id))
    });
  };

  const handleOpenBatchCancel = () => {
    if (selectedIds.length === 0) return;
    const allTitles = storage.getTitles();
    const targetTitles = allTitles.filter(t => selectedIds.includes(t.id));
    setConfirmModalState({
      isOpen: true,
      mode: 'CANCEL',
      titles: targetTitles.length > 0 ? targetTitles : titles.filter(t => selectedIds.includes(t.id))
    });
  };

  const handleOpenSingleDelete = (t: FinancialTitle, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmModalState({
      isOpen: true,
      mode: 'DELETE',
      titles: [t]
    });
  };

  const handleOpenSingleCancel = (t: FinancialTitle, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmModalState({
      isOpen: true,
      mode: 'CANCEL',
      titles: [t]
    });
  };

  // Execução após confirmação no modal
  const handleExecuteConfirmedAction = () => {
    const { mode, titles: targetTitles } = confirmModalState;
    const ids = targetTitles.length > 0 ? targetTitles.map(t => t.id) : selectedIds;
    if (ids.length === 0) {
      setConfirmModalState({ isOpen: false, mode: 'DELETE', titles: [] });
      return;
    }

    if (mode === 'DELETE') {
      const res = storage.batchDeleteTitles(ids);
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
      setConfirmModalState({ isOpen: false, mode: 'DELETE', titles: [] });
      setRefreshKey(k => k + 1);
      setToastMessage({
        type: 'success',
        text: `${res.deletedCount} lançamento(s) excluído(s) permanentemente com sucesso!${res.affectedSettlements > 0 ? ` (${res.affectedSettlements} baixa(s) estornada(s))` : ''}`
      });
    } else {
      const res = storage.batchCancelTitles(ids);
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
      setConfirmModalState({ isOpen: false, mode: 'CANCEL', titles: [] });
      setRefreshKey(k => k + 1);
      setToastMessage({
        type: res.cancelledCount > 0 ? 'success' : 'info',
        text: `${res.cancelledCount} título(s) cancelado(s) com sucesso.${res.ignoredCount > 0 ? ` (${res.ignoredCount} ignorados por possuírem baixas ou já cancelados)` : ''}`
      });
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

  const handleExportSelectedExcel = () => {
    if (selectedIds.length === 0) return;
    const targetTitles = titles.filter(t => selectedIds.includes(t.id));
    const headers = ['Título', 'Cliente', 'Descrição', 'Competência', 'Emissão', 'Vencimento', 'Previsão Caixa', 'Valor Original', 'Principal Baixado', 'Saldo Atual', 'Situação'];
    const rows = targetTitles.map(t => {
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
    exportToExcel(`lote-receber-selecionados-${today}`, 'Lote Selecionado', headers, rows);
    setToastMessage({
      type: 'success',
      text: `${targetTitles.length} títulos selecionados exportados para planilha Excel!`
    });
  };

  const handleCancelTitle = (t: FinancialTitle) => {
    handleOpenSingleCancel(t);
  };

  const openBalanceTotal = filteredTitles.filter(t => t.documentState !== 'CANCELADO').reduce((acc, t) => acc + t.balancePrincipal, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white dark:bg-[#1B212D] p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-[#273040] shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Contas a Receber</h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Gestão de direitos, honorários faturados, agenda de liquidação e baixas parciais ou integrais.
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => onOpenNewTitleModal('RECEBER')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs flex items-center shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Recebimento
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 bg-white dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/40 rounded-lg text-xs font-semibold transition-colors flex items-center shadow-2xs shrink-0 cursor-pointer"
            title="Importar lançamentos de planilha externa (Conta Azul, Asaas, Omie, etc.)"
          >
            <Upload className="w-4 h-4 mr-1.5 text-amber-600 dark:text-amber-400" />
            Importar
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center shadow-2xs shrink-0 cursor-pointer"
            title="Exportar para Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
            Excel
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center shadow-2xs shrink-0 cursor-pointer"
            title="Exportar para CSV"
          >
            <Download className="w-4 h-4 mr-1.5 text-slate-500 dark:text-slate-400" />
            CSV
          </button>
        </div>
      </div>

      {/* Widget Preditivo de Inadimplência & Liquidez de Caixa */}
      <div className="bg-white dark:bg-[#1B212D] p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-[#273040] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#273040] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Alerta Preditivo de Inadimplência & Pontualidade</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Inteligência Financeira
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Score histórico de pontualidade por cliente, atrasos médios e títulos em risco de caixa
              </p>
            </div>
          </div>

          {/* Filtro Rápido por Grau de Risco */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Filtrar:</span>
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'BAIXO', label: '🟢 Baixo Risco' },
              { id: 'MODERADO', label: '🟡 Risco Moderado' },
              { id: 'ALTO', label: '🔴 Alto Risco' },
            ].map(rf => (
              <button
                key={rf.id}
                type="button"
                onClick={() => setRiskFilter(rf.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  riskFilter === rf.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{rf.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3 Blocos de Visão de Risco do Caixa */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              <span>Recebimento Seguro (Baixo Risco)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200/60 dark:bg-emerald-900/60 font-mono">Alta Previsibilidade</span>
            </div>
            <div className="text-base font-black text-emerald-700 dark:text-emerald-400 mt-1">
              {formatBRL(portfolioRisk.lowRiskOpenAmount)}
            </div>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
              Clientes pontuais com índice de quitação em dia superior a 85%.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300">
              <span>Atenção Preventiva (Moderado)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/60 dark:bg-amber-900/60 font-mono">Lembrete D-2</span>
            </div>
            <div className="text-base font-black text-amber-700 dark:text-amber-400 mt-1">
              {formatBRL(portfolioRisk.moderateRiskOpenAmount)}
            </div>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">
              Atrasos pontuais no histórico. Recomenda-se envio prévio de lembrete com chave PIX.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
            <div className="flex items-center justify-between text-[11px] font-bold text-rose-800 dark:text-rose-300">
              <span>Em Risco Crítico / Atraso</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-200/60 dark:bg-rose-900/60 font-mono">Cobrança Ativa</span>
            </div>
            <div className="text-base font-black text-rose-700 dark:text-rose-400 mt-1">
              {formatBRL(portfolioRisk.highRiskOpenAmount)}
            </div>
            <p className="text-[10px] text-rose-600/80 dark:text-rose-400/70 mt-0.5">
              {portfolioRisk.highRiskCustomerCount} cliente(s) com títulos já vencidos ou alto índice de inadimplência.
            </p>
          </div>
        </div>
      </div>

      {/* Menu Superior de Títulos (Mobile First: Abas de Status e Busca em Destaque) */}
      <div className="block md:hidden bg-white dark:bg-[#1B212D] p-3.5 rounded-xl border border-slate-200 dark:border-[#273040] shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">Menu de Títulos</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{filteredTitles.length} título(s)</span>
        </div>

        {/* Abas Horizontais com Contadores em Destaque */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'ABERTO', label: 'Em Aberto', count: stats.openCount },
            { id: 'VENCIDO', label: 'Vencidos', count: stats.vencidosCount },
            { id: 'LIQUIDADO', label: 'Recebidos', count: stats.liquidadosCount },
            { id: 'TODOS', label: 'Todos', count: stats.todosCount },
            { id: 'CANCELADO', label: 'Cancelados', count: stats.canceladosCount }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id as any);
                setQuickDateFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab.id && quickDateFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusFilter === tab.id && quickDateFilter === 'ALL'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Campo de Busca Mobile */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, cliente ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-[#131720] text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Quick Date Filter Blocks (Visão Rápida / Indicadores - Desktop & Tablet) */}
      <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
              : 'bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'HOJE' ? 'text-amber-100' : 'text-amber-800 dark:text-amber-300'
            }`}>
              Vence Hoje
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'HOJE' ? 'bg-amber-600 text-white' : 'bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200'
            }`}>
              {stats.hojeCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.hojeTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'HOJE' ? 'text-amber-100' : 'text-amber-700 dark:text-amber-400'}`}>
            Vencendo na data de hoje
          </div>
        </button>

        {/* Card: Vence Esta Semana */}
        <button
          type="button"
          onClick={() => setQuickDateFilter(prev => prev === 'ESTA_SEMANA' ? 'ALL' : 'ESTA_SEMANA')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            quickDateFilter === 'ESTA_SEMANA'
              ? 'bg-slate-900 text-white border-amber-500 shadow-md ring-2 ring-amber-400/40'
              : 'bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'ESTA_SEMANA' ? 'text-amber-400' : 'text-slate-700 dark:text-slate-300'
            }`}>
              Vence Esta Semana
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'ESTA_SEMANA' ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
            }`}>
              {stats.semanaCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.semanaTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'ESTA_SEMANA' ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
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
              : 'bg-rose-50/60 hover:bg-rose-50 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'VENCIDO' ? 'text-rose-100' : 'text-rose-800 dark:text-rose-300'
            }`}>
              Vencidos
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'VENCIDO' ? 'bg-rose-700 text-white' : 'bg-rose-200 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200'
            }`}>
              {stats.vencidosCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.vencidosTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'VENCIDO' ? 'text-rose-100' : 'text-rose-700 dark:text-rose-400'}`}>
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
              : 'bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/45 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'LIQUIDADO' || statusFilter === 'LIQUIDADO' ? 'text-emerald-100' : 'text-emerald-800 dark:text-emerald-300'
            }`}>
              Recebidos
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'LIQUIDADO' || statusFilter === 'LIQUIDADO' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200'
            }`}>
              {stats.liquidadosCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.liquidadosTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'LIQUIDADO' || statusFilter === 'LIQUIDADO' ? 'text-emerald-100' : 'text-emerald-700 dark:text-emerald-400'}`}>
            Total liquidado
          </div>
        </button>
      </div>

      {/* Top Filter Bar (Superior Filters) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        
        {/* Row 1: Status Pill Tabs & Search */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          
          {/* Status Pill Tabs (Menu Superior de Títulos) */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'ABERTO', label: 'Em Aberto', count: stats.openCount },
              { id: 'VENCIDO', label: 'Vencidos', count: stats.vencidosCount },
              { id: 'LIQUIDADO', label: 'Liquidados', count: stats.liquidadosCount },
              { id: 'TODOS', label: 'Todos', count: stats.todosCount },
              { id: 'CANCELADO', label: 'Cancelados', count: stats.canceladosCount }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id as any);
                  setQuickDateFilter('ALL');
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id && quickDateFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-slate-50 border border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === tab.id && quickDateFilter === 'ALL'
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-slate-200/80 text-slate-700'
                }`}>
                  {tab.count}
                </span>
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
      {selectedIds.length > 0 && (() => {
        const selectedTitles = titles.filter(t => selectedIds.includes(t.id));
        const hasClosedInSelection = selectedTitles.some(t => FinancialEngine.isPeriodClosed(t.competence));
        const totalSelectedBalance = selectedTitles.reduce((acc, t) => acc + t.balancePrincipal, 0);

        return (
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-3.5 rounded-xl border border-amber-500/40 shadow-xl flex flex-wrap justify-between items-center gap-3 animate-in slide-in-from-top duration-200">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
                {selectedIds.length}
              </span>
              <div>
                <div className="font-semibold text-xs flex items-center gap-2">
                  <span>{selectedIds.length} recebimento(s) selecionado(s)</span>
                  {hasClosedInSelection && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-normal">
                      <Lock className="w-3 h-3" /> Contém títulos em competência travada
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-300">
                  Saldo total selecionado: <strong className="text-amber-400 font-bold">{formatBRL(totalSelectedBalance)}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {/* Baixar em Lote (Melhoria 5) */}
              <button
                onClick={() => setIsBatchSettlementOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center cursor-pointer"
                title="Liquidar e amortizar os títulos selecionados em lote"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Baixar em Lote
              </button>

              {/* Prorrogar Vencimento em Lote (Melhoria 5) */}
              <button
                onClick={() => setIsBatchPostponeOpen(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center cursor-pointer"
                title="Prorrogar vencimentos dos títulos selecionados (+7, +15, +30 dias)"
              >
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                Prorrogar
              </button>

              {/* Exportar Lote */}
              <button
                onClick={handleExportSelectedExcel}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-colors flex items-center cursor-pointer"
                title="Exportar apenas os títulos selecionados para planilha Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Exportar Lote
              </button>

              <button
                onClick={() => setIsBatchEditOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                Alteração em Massa
              </button>

              <button
                onClick={() => handleBatchDuplicate(false)}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium border border-white/20 transition-colors flex items-center cursor-pointer"
                title="Duplicar lançamentos para a mesma competência"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Duplicar
              </button>

              <button
                onClick={() => handleBatchDuplicate(true)}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium border border-white/20 transition-colors flex items-center cursor-pointer"
                title="Duplicar avançando competência e vencimento em +1 mês"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                Duplicar (+1 Mês)
              </button>

              <button
                onClick={handleOpenBatchCancel}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center cursor-pointer"
                title="Alterar a situação dos títulos selecionados para CANCELADO"
              >
                <Ban className="w-3.5 h-3.5 mr-1 text-amber-400" />
                Cancelar
              </button>

              <button
                onClick={handleOpenBatchDelete}
                className="px-2.5 py-1.5 bg-rose-700/70 hover:bg-rose-700 text-white rounded-lg text-xs font-bold border border-rose-500/40 transition-colors flex items-center cursor-pointer"
                title="Excluir permanentemente os títulos selecionados do sistema"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Excluir
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Desmarcar
              </button>
            </div>
          </div>
        );
      })()}

      {/* Summary Banner of current list */}
      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/60 px-4 py-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
        <span className="text-emerald-900 dark:text-emerald-200 flex items-center flex-wrap gap-1">
          <span>Listando <strong>{sortedTitles.length}</strong> lançamentos correspondentes aos filtros.</span>
          <span className="hidden sm:inline ml-2 text-[11px] text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-700">
            💡 Dica: Duplo clique em qualquer linha para editar o título
          </span>
          <span className="sm:hidden text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
            👆 Toque na linha para ver os detalhes completos
          </span>
        </span>
        <span className="text-emerald-950 dark:text-emerald-100 font-bold text-xs sm:text-sm">
          Saldo em Aberto Filtrado: {formatBRL(sortedTitles.filter(t => t.documentState !== 'CANCELADO').reduce((acc, t) => acc + t.balancePrincipal, 0))}
        </span>
      </div>

      {/* Mobile View: Cards Expansíveis (Descrição, Data de Vencimento e Valor; clique na linha expande o restante) */}
      <div className="block md:hidden space-y-2.5">
        {sortedTitles.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-600 text-xs shadow-2xs">
            Nenhum título a receber localizado para os filtros informados.
          </div>
        ) : (
          sortedTitles.map(t => {
            if (!t) return null;
            const customer = counterparties.find(c => c && c.id === t.counterpartyId);
            const isSelected = selectedIds.includes(t.id);
            const isExpanded = !!expandedMobileIds[t.id];
            const balance = Number(t.balancePrincipal) || 0;
            const titleDueDate = t.dueDate || today;
            const chartAcc = chartAccounts.find(a => a && (a.id === t.accountId || a.id === t.chartAccountId));
            const bank = bankAccounts.find(b => b.id === t.bankAccountId);

            // Days diff for visual indicator
            let diffDays = 0;
            try {
              const dueDateObj = new Date(titleDueDate + 'T00:00:00');
              const todayObj = new Date(today + 'T00:00:00');
              diffDays = Math.ceil((dueDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
            } catch {
              diffDays = 0;
            }

            const isOverdue = balance > 0 && (diffDays < 0 || titleDueDate < today);
            const isNearDue = balance > 0 && !isOverdue && !isNaN(diffDays) && diffDays <= 3;

            let cardBorder = 'border-slate-200 dark:border-[#273040]';
            let cardBg = 'bg-white dark:bg-[#1B212D]';
            if (t.documentState === 'CANCELADO') {
              cardBg = 'bg-slate-50 dark:bg-slate-900/40 opacity-60';
              cardBorder = 'border-slate-200 dark:border-slate-800';
            } else if (isOverdue) {
              cardBg = 'bg-rose-50/40 dark:bg-rose-950/20';
              cardBorder = 'border-rose-300 dark:border-rose-800/60 ring-1 ring-rose-300/40';
            } else if (isNearDue) {
              cardBg = 'bg-amber-50/40 dark:bg-amber-950/20';
              cardBorder = 'border-amber-300 dark:border-amber-800/60 ring-1 ring-amber-300/40';
            } else if (t.settlementState === 'LIQUIDADO') {
              cardBg = 'bg-emerald-50/20 dark:bg-emerald-950/20';
              cardBorder = 'border-emerald-200 dark:border-emerald-800/50';
            }

            if (isSelected) {
              cardBg = 'bg-emerald-100/60 dark:bg-emerald-950/40';
              cardBorder = 'border-emerald-400 dark:border-emerald-600';
            }

            return (
              <div 
                key={t.id}
                className={`rounded-xl border shadow-2xs overflow-hidden transition-all ${cardBg} ${cardBorder}`}
              >
                {/* Linha Principal Mobile: Descrição, Data de Vencimento e Valor */}
                <div 
                  onClick={() => toggleExpandMobile(t.id)}
                  className="p-3.5 cursor-pointer select-none active:bg-slate-100/60 dark:active:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Checkbox + Descrição + Data de Vencimento */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectOne(t.id, e as any);
                        }}
                        className="pt-0.5 cursor-pointer shrink-0"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 bg-white dark:bg-slate-800"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Descrição */}
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-snug line-clamp-2">
                          {t.description || 'Sem descrição'}
                        </div>

                        {/* Cliente & Badge de Risco */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                            {customer?.tradeName || customer?.name || 'Cliente'}
                          </span>
                          {portfolioRisk.customerProfiles[t.counterpartyId] && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${portfolioRisk.customerProfiles[t.counterpartyId].riskColorClasses.badge}`}>
                              {portfolioRisk.customerProfiles[t.counterpartyId].riskBadgeLabel}
                            </span>
                          )}
                        </div>

                        {/* Data de Vencimento */}
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>Vencimento:</span>
                          <strong className="text-slate-800 dark:text-slate-200">{formatDateBR(t.dueDate)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Valor em Destaque + Toggle Indicator */}
                    <div className="text-right shrink-0 flex flex-col items-end justify-between">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm sm:text-base leading-tight">
                        {formatBRL(balance > 0 ? balance : t.originalAmount)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                        <span>{isExpanded ? 'recolher' : 'detalhes'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Conteúdo Expandido ao Clicar na Linha */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-[#273040] bg-slate-50/90 dark:bg-[#131720]/90 p-3.5 space-y-3 text-xs">
                    
                    {/* Status e Situação */}
                    <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Situação:</span>
                      {balance > 0 && t.documentState !== 'CANCELADO' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : isNearDue
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {isOverdue ? 'Vencido' : isNearDue ? 'Vence Hoje' : 'Em dia'}
                        </span>
                      )}
                      {t.documentState === 'CANCELADO' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Cancelado
                        </span>
                      )}
                      {t.settlementState === 'LIQUIDADO' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Recebido
                        </span>
                      )}
                      {t.settlementState === 'PARCIAL' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Parcialmente Baixado
                        </span>
                      )}
                    </div>

                    {/* Grade de Detalhes Secundários */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Cliente / Devedor</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100 block truncate">
                          {customer?.name || 'Cliente não especificado'}
                        </span>
                        {customer?.document && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">{customer.document}</span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Nº Documento / Título</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block truncate">
                          {t.titleNumber || 'Sem código'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Competência</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block">
                          {t.competence || '-'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Previsão Caixa</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium block">
                          {formatDateBR(t.expectedCashDate || t.dueDate)}
                        </span>
                      </div>

                      {chartAcc && (
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Plano de Contas</span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium block truncate">
                            {chartAcc.code} - {chartAcc.name}
                          </span>
                        </div>
                      )}

                      {bank && (
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Conta Bancária</span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium block truncate">
                            {bank.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Resumo Financeiro */}
                    <div className="bg-white dark:bg-[#1B212D] p-2.5 rounded-lg border border-slate-200 dark:border-[#273040] flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Valor Original</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{formatBRL(t.originalAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Recebido</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatBRL(t.settledPrincipal || 0)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Saldo a Receber</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(t.balancePrincipal)}</span>
                      </div>
                    </div>

                    {/* Diagnóstico Preditivo do Cliente */}
                    {portfolioRisk.customerProfiles[t.counterpartyId] && (
                      <div className="p-3 rounded-xl bg-white dark:bg-[#1B212D] border border-slate-200 dark:border-[#273040] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Diagnóstico Preditivo</span>
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${portfolioRisk.customerProfiles[t.counterpartyId].riskColorClasses.badge}`}>
                            {portfolioRisk.customerProfiles[t.counterpartyId].riskBadgeLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/60">
                            <span className="text-slate-400 block">Pontualidade:</span>
                            <strong className="text-slate-800 dark:text-slate-200">{portfolioRisk.customerProfiles[t.counterpartyId].punctualityScore}%</strong>
                          </div>
                          <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/60">
                            <span className="text-slate-400 block">Atraso Médio:</span>
                            <strong className="text-slate-800 dark:text-slate-200">{portfolioRisk.customerProfiles[t.counterpartyId].averageDelayDays}d</strong>
                          </div>
                          <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/60">
                            <span className="text-slate-400 block">Vencidos:</span>
                            <strong className={portfolioRisk.customerProfiles[t.counterpartyId].overdueCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                              {portfolioRisk.customerProfiles[t.counterpartyId].overdueCount}
                            </strong>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-600 dark:text-slate-400">
                          <strong className="text-slate-700 dark:text-slate-300">Recomendação: </strong>
                          {portfolioRisk.customerProfiles[t.counterpartyId].recommendedAction}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const p = portfolioRisk.customerProfiles[t.counterpartyId];
                            if (p?.suggestedWhatsAppMessage) {
                              navigator.clipboard.writeText(p.suggestedWhatsAppMessage);
                              setToastMessage({ text: 'Mensagem WhatsApp copiada com sucesso!', type: 'success' });
                            }
                          }}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center gap-1.5 border border-emerald-300 dark:border-emerald-700 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Copiar Mensagem de Cobrança WhatsApp</span>
                        </button>
                      </div>
                    )}

                    {/* Ações Rápidas Mobile */}
                    <div className="pt-2 border-t border-slate-200 dark:border-[#273040] flex flex-wrap gap-2 items-center">
                      {t.balancePrincipal > 0 && t.documentState !== 'CANCELADO' && (
                        <button
                          type="button"
                          onClick={() => setSelectedTitleForSettlement(t)}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Receber / Baixar
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedTitleForEdit(t)}
                        className="py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDuplicateOne(t, e)}
                        className="py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                        title="Duplicar lançamento"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        Duplicar
                      </button>

                      <button
                        type="button"
                        onClick={() => setHistoryTitle(t)}
                        className="p-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-lg text-xs shadow-2xs"
                        title="Ver histórico de recebimentos"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {t.balancePrincipal === t.originalAmount && t.documentState !== 'CANCELADO' && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenSingleCancel(t, e)}
                          className="p-2 bg-white border border-amber-300 hover:bg-amber-50 text-amber-600 rounded-lg text-xs shadow-2xs"
                          title="Cancelar título"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleOpenSingleDelete(t, e)}
                        className="p-2 bg-white border border-rose-300 hover:bg-rose-50 text-rose-600 rounded-lg text-xs shadow-2xs"
                        title="Excluir definitivamente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Receivables Table (Desktop & Tablets) */}
      <div className="hidden md:block bg-white dark:bg-[#131720] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-200/90 dark:bg-[#121620] border-b-2 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold uppercase tracking-wider select-none">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                    title={isAllSelected ? "Desmarcar todos" : "Selecionar todos os títulos da lista"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    )}
                  </button>
                </th>

                {/* Sortable Column: Título */}
                <th 
                  onClick={() => handleSort('titleNumber')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none transition-colors"
                  title="Clique para ordenar por número do título"
                >
                  <div className="flex items-center gap-1">
                    <span>Título / Lançamento</span>
                    {sortField === 'titleNumber' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-500" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Sortable Column: Cliente */}
                <th 
                  onClick={() => handleSort('counterparty')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none transition-colors"
                  title="Clique para ordenar por nome do cliente (ordem alfabética)"
                >
                  <div className="flex items-center gap-1">
                    <span>Cliente</span>
                    {sortField === 'counterparty' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-500" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Sortable Column: Competência */}
                <th 
                  onClick={() => handleSort('competence')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none transition-colors"
                  title="Clique para ordenar por competência"
                >
                  <div className="flex items-center gap-1">
                    <span>Competência</span>
                    {sortField === 'competence' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-500" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Sortable Column: Vencimento */}
                <th 
                  onClick={() => handleSort('dueDate')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none transition-colors"
                  title="Clique para ordenar por data de vencimento"
                >
                  <div className="flex items-center gap-1">
                    <span>Vencimento</span>
                    {sortField === 'dueDate' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-500" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Sortable Column: Previsão Caixa */}
                <th 
                  onClick={() => handleSort('expectedCashDate')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none transition-colors"
                  title="Clique para ordenar por previsão de caixa"
                >
                  <div className="flex items-center gap-1">
                    <span>Previsão Caixa</span>
                    {sortField === 'expectedCashDate' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-500" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Sortable Column: Valor Original */}
                <th 
                  onClick={() => handleSort('originalAmount')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none transition-colors"
                  title="Clique para ordenar por valor original"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Valor Original</span>
                    {sortField === 'originalAmount' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-500" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Sortable Column: Saldo Devedor */}
                <th 
                  onClick={() => handleSort('balancePrincipal')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none transition-colors"
                  title="Clique para ordenar por saldo devedor"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Saldo Devedor</span>
                    {sortField === 'balancePrincipal' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-500" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
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
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none transition-colors"
                  title="Clique para ordenar por status de liquidação"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Status</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-500" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
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
                  if (!t) return null;
                  const client = counterparties.find(c => c && c.id === t.counterpartyId);
                  const tempStatus = getTemporalStatus(t, today);
                  const isSelected = selectedIds.includes(t.id);
                  const balance = Number(t.balancePrincipal) || 0;
                  const titleDueDate = t.dueDate || today;

                  // Calculate days diff for row highlighting safely
                  let daysDiff = 0;
                  try {
                    daysDiff = Math.ceil((new Date(titleDueDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
                  } catch {
                    daysDiff = 0;
                  }
                  const isOverdue = balance > 0 && titleDueDate < today;
                  const isNearDue = balance > 0 && !isOverdue && !isNaN(daysDiff) && daysDiff >= 0 && daysDiff <= 3;

                  let rowColorClass = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-l-transparent';
                  if (t.documentState === 'CANCELADO') {
                    rowColorClass = 'opacity-50 bg-slate-50/50 dark:bg-slate-900/40 border-l-4 border-l-slate-300 dark:border-l-slate-700';
                  } else if (t.settlementState === 'LIQUIDADO') {
                    rowColorClass = 'bg-emerald-50/25 hover:bg-emerald-50/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border-l-4 border-l-emerald-400';
                  } else if (isOverdue) {
                    // Soft red for overdue row with full dark contrast
                    rowColorClass = 'bg-rose-50/75 hover:bg-rose-100/80 border-l-4 border-l-rose-500 text-rose-950 dark:bg-rose-950/25 dark:hover:bg-rose-950/45 dark:border-l-rose-500 dark:text-rose-100 font-medium';
                  } else if (isNearDue) {
                    // Soft yellow for near due row with full dark contrast
                    rowColorClass = 'bg-amber-50/75 hover:bg-amber-100/80 border-l-4 border-l-amber-500 text-amber-950 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 dark:border-l-amber-400 dark:text-amber-100 font-medium';
                  }

                  return (
                    <tr 
                      key={t.id}
                      onDoubleClick={() => setSelectedTitleForEdit(t)}
                      title="💡 Dê um duplo clique para editar este lançamento"
                      className={`${rowColorClass} transition-colors cursor-pointer select-none ${
                        isSelected ? 'bg-amber-500/15 ring-1 ring-inset ring-amber-400' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectOne(t.id, e as any)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer w-4 h-4"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-slate-900">{t.titleNumber}</div>
                        <div className="text-[11px] text-slate-700 truncate max-w-[200px]">{t.description}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-800">{client?.name || 'Cliente'}</span>
                          {portfolioRisk.customerProfiles[t.counterpartyId] && (
                            <span
                              title={`${portfolioRisk.customerProfiles[t.counterpartyId].recommendedAction} (Clique para copiar mensagem de cobrança WhatsApp)`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const p = portfolioRisk.customerProfiles[t.counterpartyId];
                                if (p?.suggestedWhatsAppMessage) {
                                  navigator.clipboard.writeText(p.suggestedWhatsAppMessage);
                                  setToastMessage({ text: 'Mensagem WhatsApp copiada com sucesso!', type: 'success' });
                                }
                              }}
                              className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${portfolioRisk.customerProfiles[t.counterpartyId].riskColorClasses.badge}`}
                            >
                              <span>{portfolioRisk.customerProfiles[t.counterpartyId].riskBadgeLabel}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-700">{client?.document}</div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
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
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
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
                          className="p-1 text-slate-600 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                          title="Editar lançamento (ou dê duplo clique na linha)"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => handleDuplicateOne(t, e)}
                          className="p-1 text-slate-600 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
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
                            onClick={(e) => handleOpenSingleCancel(t, e)}
                            className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded"
                            title="Cancelar Título (muda status para CANCELADO)"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={(e) => handleOpenSingleDelete(t, e)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="Excluir Lançamento Definitivamente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          setStatusFilter('TODOS');
          setQuickDateFilter('ALL');
          setSearchTerm('');
          setRefreshKey(k => k + 1);
        }}
      />

      {/* Modal de Baixa em Lote (Melhoria 5) */}
      <BatchSettlementModal
        isOpen={isBatchSettlementOpen}
        onClose={() => setIsBatchSettlementOpen(false)}
        titles={titles.filter(t => selectedIds.includes(t.id))}
        type="RECEBER"
        onSettled={() => {
          setSelectedIds([]);
          setRefreshKey(k => k + 1);
          setToastMessage({ type: 'success', text: 'Baixa em lote realizada com sucesso!' });
        }}
      />

      {/* Modal de Prorrogação de Vencimento em Lote (Melhoria 5) */}
      <BatchPostponeModal
        isOpen={isBatchPostponeOpen}
        onClose={() => setIsBatchPostponeOpen(false)}
        titles={titles.filter(t => selectedIds.includes(t.id))}
        onUpdated={() => {
          setSelectedIds([]);
          setRefreshKey(k => k + 1);
          setToastMessage({ type: 'success', text: 'Vencimentos prorrogados com sucesso!' });
        }}
      />

      {/* Confirm Batch or Single Delete / Cancel Modal */}
      <ConfirmBatchActionModal
        isOpen={confirmModalState.isOpen}
        mode={confirmModalState.mode}
        type="RECEBER"
        titles={confirmModalState.titles}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false, titles: [] }))}
        onConfirm={handleExecuteConfirmedAction}
      />

      {/* In-App Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center space-x-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
          toastMessage.type === 'success' 
            ? 'bg-slate-900 text-emerald-300 border-emerald-600/50 shadow-emerald-950/20' 
            : toastMessage.type === 'error'
            ? 'bg-slate-900 text-rose-300 border-rose-600/50 shadow-rose-950/20'
            : 'bg-slate-900 text-amber-300 border-amber-600/50 shadow-amber-950/20'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)} 
            className="text-slate-400 hover:text-white ml-2 p-0.5 rounded hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
};
