import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingDown, 
  Plus, 
  Search, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Ban,
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
  CreditCard,
  ChevronDown,
  ChevronUp,
  Barcode,
  Lock,
  X
} from 'lucide-react';
import { FinancialTitle, ChartAccount } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatDateBR, getTemporalStatus, getFilteredChartAccounts } from '../../services/financialEngine';
import { matchesSearch } from '../../utils/searchUtils';
import { SettlementModal } from '../Modals/SettlementModal';
import { EditTitleModal } from '../Modals/EditTitleModal';
import { BatchEditTitlesModal } from '../Modals/BatchEditTitlesModal';
import { BatchSettlementModal } from '../Modals/BatchSettlementModal';
import { BatchPostponeModal } from '../Modals/BatchPostponeModal';
import { ImportSpreadsheetModal } from '../Modals/ImportSpreadsheetModal';
import { ConfirmBatchActionModal } from '../Modals/ConfirmBatchActionModal';
import { BoletoBatchSettlementModal } from './BoletoBatchSettlementModal';
import { GlobalPeriodBanner } from '../Common/GlobalPeriodBanner';
import { useGlobalPeriod } from '../../hooks/useGlobalPeriod';
import { toast } from '../../hooks/useToast';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';

interface PayablesViewProps {
  onOpenNewTitleModal: (type: 'PAGAR') => void;
  initialSearch?: string;
}

export const PayablesView: React.FC<PayablesViewProps> = ({ onOpenNewTitleModal, initialSearch = '' }) => {
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
  const [quickDateFilter, setQuickDateFilter] = useState<'ALL' | 'HOJE' | 'ESTA_SEMANA' | 'VENCIDO' | 'LIQUIDADO' | 'ESTE_MES'>('ALL');
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
  const [isBatchSettlementOpen, setIsBatchSettlementOpen] = useState(false);
  const [isBatchPostponeOpen, setIsBatchPostponeOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBoletoModalOpen, setIsBoletoModalOpen] = useState(false);
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
      title: toastMessage.type === 'success' ? 'Contas a Pagar' : (toastMessage.type === 'error' ? 'Erro' : 'Aviso')
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
      return Array.isArray(data) ? data.filter(t => t && t.type === 'PAGAR') : [];
    } catch (err) {
      console.error('Erro ao ler títulos a pagar:', err);
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
      console.error('Erro ao filtrar títulos a pagar por período:', err);
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
      console.error('Erro ao calcular estatísticas de contas a pagar:', err);
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

  // Estatísticas e agrupamento de categorias ativas com despesa no período selecionado
  const categoryStats = useMemo(() => {
    try {
      const counts: Record<string, { count: number; totalAmount: number }> = {};
      let unclassifiedCount = 0;
      let unclassifiedTotal = 0;

      periodTitles.forEach(t => {
        if (!t || t.documentState === 'CANCELADO') return;
        const accId = t.chartAccountId || t.accountId;
        const amt = Number(t.originalAmount) || 0;
        if (!accId) {
          unclassifiedCount++;
          unclassifiedTotal += amt;
        } else {
          if (!counts[accId]) {
            counts[accId] = { count: 0, totalAmount: 0 };
          }
          counts[accId].count++;
          counts[accId].totalAmount += amt;
        }
      });

      // Contas analíticas de despesas do plano de contas
      const expenseAccounts = getFilteredChartAccounts(chartAccounts, 'PAGAR');
      const inPeriodMap = new Map<string, { account: ChartAccount; count: number; totalAmount: number }>();

      expenseAccounts.forEach(acc => {
        const stat = counts[acc.id];
        if (stat && stat.count > 0) {
          inPeriodMap.set(acc.id, {
            account: acc,
            count: stat.count,
            totalAmount: Math.round(stat.totalAmount * 100) / 100
          });
        }
      });

      // Garantir inclusão de qualquer conta com lançamentos no período
      Object.keys(counts).forEach(accId => {
        if (!inPeriodMap.has(accId)) {
          const acc = chartAccounts.find(a => a && a.id === accId);
          if (acc) {
            inPeriodMap.set(accId, {
              account: acc,
              count: counts[accId].count,
              totalAmount: Math.round(counts[accId].totalAmount * 100) / 100
            });
          }
        }
      });

      const inPeriod = Array.from(inPeriodMap.values());
      inPeriod.sort((a, b) => b.count - a.count || a.account.code.localeCompare(b.account.code, undefined, { numeric: true }));

      const others = expenseAccounts
        .filter(acc => !inPeriodMap.has(acc.id))
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

      return {
        inPeriod,
        others,
        unclassifiedCount,
        unclassifiedTotal: Math.round(unclassifiedTotal * 100) / 100,
        totalTitlesInPeriod: periodTitles.filter(t => t && t.documentState !== 'CANCELADO').length
      };
    } catch (err) {
      console.error('Erro ao calcular estatísticas de categorias no período:', err);
      return {
        inPeriod: [],
        others: [],
        unclassifiedCount: 0,
        unclassifiedTotal: 0,
        totalTitlesInPeriod: 0
      };
    }
  }, [periodTitles, chartAccounts]);

  // Filtering
  const filteredTitles = useMemo(() => {
    try {
      return periodTitles.filter(t => {
        if (!t) return false;
        const supplier = counterparties.find(c => c && c.id === t.counterpartyId);
        const chartAcc = chartAccounts.find(a => a && (a.id === t.accountId || a.id === t.chartAccountId));
        const matchSearch = matchesSearch([
          supplier?.name,
          supplier?.tradeName,
          supplier?.document,
          t.titleNumber,
          t.description,
          chartAcc?.name,
          chartAcc?.code
        ], searchTerm);

        if (!matchSearch) return false;

        // Category filter (específico, não classificado ou todos)
        if (categoryFilter !== 'ALL') {
          if (categoryFilter === 'SEM_CATEGORIA') {
            const hasCategory = Boolean(t.chartAccountId || t.accountId);
            if (hasCategory) return false;
          } else if (t.chartAccountId !== categoryFilter && t.accountId !== categoryFilter) {
            return false;
          }
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

        const balance = Number(t.balancePrincipal) || 0;
        const due = String(t.dueDate || '');

        // Quick Date filter
        if (quickDateFilter === 'HOJE') {
          if (t.documentState === 'CANCELADO' || balance <= 0 || due !== today) return false;
        } else if (quickDateFilter === 'ESTA_SEMANA') {
          if (t.documentState === 'CANCELADO' || balance <= 0 || due < weekRange.start || due > weekRange.end) return false;
        } else if (quickDateFilter === 'ESTE_MES') {
          if (t.documentState === 'CANCELADO' || balance <= 0 || !due.startsWith(today.slice(0, 7))) return false;
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
      console.error('Erro ao filtrar títulos a pagar:', err);
      return [];
    }
  }, [periodTitles, searchTerm, categoryFilter, counterpartyFilter, bankFilter, originFilter, quickDateFilter, statusFilter, today, weekRange, counterparties, chartAccounts]);

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
      console.error('Erro ao ordenar títulos a pagar:', err);
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
    setOriginFilter('ALL');
    setQuickDateFilter('ALL');
    setStatusFilter('ABERTO');
  };

  const hasActiveFilters = searchTerm !== '' || categoryFilter !== 'ALL' || counterpartyFilter !== 'ALL' || bankFilter !== 'ALL' || originFilter !== 'ALL' || quickDateFilter !== 'ALL';

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
        text: `Obrigação ${t.titleNumber} duplicada com sucesso!`
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
      text: `${created.length} obrigação(ões) duplicada(s) com sucesso!`
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
        text: `${res.deletedCount} obrigação(ões) excluída(s) permanentemente com sucesso!${res.affectedSettlements > 0 ? ` (${res.affectedSettlements} pagamento(s) estornado(s))` : ''}`
      });
    } else {
      const res = storage.batchCancelTitles(ids);
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
      setConfirmModalState({ isOpen: false, mode: 'CANCEL', titles: [] });
      setRefreshKey(k => k + 1);
      setToastMessage({
        type: res.cancelledCount > 0 ? 'success' : 'info',
        text: `${res.cancelledCount} obrigação(ões) cancelada(s) com sucesso.${res.ignoredCount > 0 ? ` (${res.ignoredCount} ignorados por possuírem baixas ou já cancelados)` : ''}`
      });
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

  const handleExportSelectedExcel = () => {
    if (selectedIds.length === 0) return;
    const targetTitles = titles.filter(t => selectedIds.includes(t.id));
    const headers = ['Título', 'Fornecedor', 'Descrição', 'Competência', 'Emissão', 'Vencimento', 'Previsão Caixa', 'Valor Original', 'Principal Baixado', 'Saldo Atual', 'Situação'];
    const rows = targetTitles.map(t => {
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
    exportToExcel(`lote-pagar-selecionados-${today}`, 'Lote Selecionado', headers, rows);
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
            <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Contas a Pagar</h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Gestão de obrigações, fornecedores, impostos, salários, pró-labore e liquidações.
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => onOpenNewTitleModal('PAGAR')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs flex items-center shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Pagamento
          </button>
          <button
            onClick={() => setIsBoletoModalOpen(true)}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center shrink-0 cursor-pointer"
            title="Reconhecimento e baixa automática em lote por linha digitável / boleto"
          >
            <Barcode className="w-4 h-4 mr-1.5" />
            <span>Baixar Boletos</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 bg-white dark:bg-[#19202D] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center shadow-2xs shrink-0 cursor-pointer"
            title="Importar lançamentos de contas a pagar de planilha externa"
          >
            <Upload className="w-4 h-4 mr-1.5 text-amber-500" />
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

      {/* Menu Superior de Títulos (Mobile First: Abas de Status e Busca em Destaque) */}
      <div className="block md:hidden bg-white dark:bg-[#1B212D] p-3.5 rounded-xl border border-slate-200 dark:border-[#273040] shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">Menu de Títulos</span>
          <span className="text-rose-600 dark:text-rose-400 font-bold">{filteredTitles.length} obrigação(ões)</span>
        </div>

        {/* Abas Horizontais com Contadores em Destaque */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
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
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab.id && quickDateFilter === 'ALL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                statusFilter === tab.id && quickDateFilter === 'ALL'
                  ? 'bg-rose-800 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Chips Rápidos de Data no Mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1">Prazo:</span>
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'HOJE', label: 'Hoje' },
            { id: 'ESTA_SEMANA', label: 'Esta Semana' },
            { id: 'ESTE_MES', label: 'Este Mês' },
          ].map(chip => (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setQuickDateFilter(chip.id as any);
                if (chip.id !== 'ALL') {
                  setStatusFilter('ABERTO');
                }
              }}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center whitespace-nowrap shrink-0 cursor-pointer ${
                quickDateFilter === chip.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Campo de Busca Mobile */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, fornecedor ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 dark:bg-[#131720] text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        {/* Seletor Rápido de Categoria Mobile */}
        <div className="flex items-center gap-2 pt-1">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            Categoria:
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#131720] text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">Todas as Despesas ({categoryStats.totalTitlesInPeriod})</option>
            {categoryStats.unclassifiedCount > 0 && (
              <option value="SEM_CATEGORIA" className="font-bold text-amber-600 dark:text-amber-400">
                ⚠️ Não Classificados ({categoryStats.unclassifiedCount})
              </option>
            )}
            {categoryStats.inPeriod.length > 0 && (
              <optgroup label="No Período Selecionado">
                {categoryStats.inPeriod.map(({ account, count, totalAmount }) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name} ({count} • {formatBRL(totalAmount)})
                  </option>
                ))}
              </optgroup>
            )}
            {categoryStats.others.length > 0 && (
              <optgroup label="Outras do Plano">
                {categoryStats.others.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Quick Date Filter Blocks (Visão Rápida / Indicadores - Desktop & Tablet) */}
      <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
              : 'bg-white dark:bg-[#131720] hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'ALL' && statusFilter === 'ABERTO' ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
            }`}>
              Em Aberto
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'ALL' && statusFilter === 'ABERTO' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}>
              {stats.openCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.openTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'ALL' && statusFilter === 'ABERTO' ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
            Total a pagar em aberto
          </div>
        </button>

        {/* Card: Vence Hoje */}
        <button
          type="button"
          onClick={() => setQuickDateFilter(prev => prev === 'HOJE' ? 'ALL' : 'HOJE')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            quickDateFilter === 'HOJE'
              ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-md ring-2 ring-amber-400/40'
              : 'bg-white dark:bg-[#151D2A] hover:bg-slate-50 dark:hover:bg-[#1D2738] border-amber-300 dark:border-amber-500/40 text-slate-900 dark:text-white shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              quickDateFilter === 'HOJE' ? 'text-slate-950' : 'text-amber-800 dark:text-amber-400'
            }`}>
              Vence Hoje
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'HOJE' ? 'bg-slate-950 text-white' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
            }`}>
              {stats.hojeCount}
            </span>
          </div>
          <div className="text-base font-black mt-1.5 truncate text-slate-900 dark:text-white">
            {formatBRL(stats.hojeTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'HOJE' ? 'text-slate-900 font-semibold' : 'text-slate-500 dark:text-slate-300'}`}>
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
              : 'bg-white dark:bg-[#151D2A] hover:bg-slate-50 dark:hover:bg-[#1D2738] border-rose-300 dark:border-rose-500/40 text-slate-900 dark:text-white shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              quickDateFilter === 'ESTA_SEMANA' ? 'text-white' : 'text-rose-800 dark:text-rose-400'
            }`}>
              Vence Esta Semana
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'ESTA_SEMANA' ? 'bg-white text-rose-700' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
            }`}>
              {stats.semanaCount}
            </span>
          </div>
          <div className="text-base font-black mt-1.5 truncate text-rose-600 dark:text-rose-400">
            {formatBRL(stats.semanaTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'ESTA_SEMANA' ? 'text-rose-100 font-semibold' : 'text-slate-500 dark:text-slate-300'}`}>
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
              : 'bg-red-50/60 hover:bg-red-50 dark:bg-red-950/30 dark:hover:bg-red-950/50 border-red-200 dark:border-red-800/60 text-red-950 dark:text-red-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'VENCIDO' ? 'text-red-100' : 'text-red-800 dark:text-red-300'
            }`}>
              Vencidos
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              quickDateFilter === 'VENCIDO' ? 'bg-red-800 text-white' : 'bg-red-200 dark:bg-red-900/80 text-red-900 dark:text-red-200'
            }`}>
              {stats.vencidosCount}
            </span>
          </div>
          <div className="text-base font-bold mt-1.5 truncate">
            {formatBRL(stats.vencidosTotal)}
          </div>
          <div className={`text-[10px] mt-0.5 ${quickDateFilter === 'VENCIDO' ? 'text-red-100' : 'text-red-700 dark:text-red-400'}`}>
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
              : 'bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/45 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              quickDateFilter === 'LIQUIDADO' || statusFilter === 'LIQUIDADO' ? 'text-emerald-100' : 'text-emerald-800 dark:text-emerald-300'
            }`}>
              Pagos
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
      <div className="bg-white dark:bg-[#131720] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        
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
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab.id && quickDateFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === tab.id && quickDateFilter === 'ALL'
                    ? 'bg-slate-800 dark:bg-amber-600 text-slate-200 dark:text-slate-950'
                    : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
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
              placeholder="Buscar por fornecedor, documento ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Row 2: Advanced Dropdown Filters (Category, Supplier, Bank Account, Origin) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs items-center">
          
          {/* Categoria / Plano de Contas */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Plano de Contas / Despesa:
              </label>
              {categoryFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ALL')}
                  className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                  title="Remover filtro de categoria"
                >
                  Limpar
                </button>
              )}
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none transition-colors ${
                categoryFilter !== 'ALL'
                  ? 'border-rose-500 dark:border-rose-400 bg-rose-50/50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 font-bold'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100'
              }`}
            >
              <option value="ALL">
                Todas as Despesas ({categoryStats.totalTitlesInPeriod} no período)
              </option>

              {categoryStats.unclassifiedCount > 0 && (
                <option value="SEM_CATEGORIA" className="font-bold text-amber-600 dark:text-amber-400">
                  ⚠️ Não Classificados (Sem Categoria) ({categoryStats.unclassifiedCount} títulos • {formatBRL(categoryStats.unclassifiedTotal)})
                </option>
              )}

              {categoryStats.inPeriod.length > 0 && (
                <optgroup label={`⚡ Categorias com Despesas no Período Selecionado (${categoryStats.inPeriod.length})`}>
                  {categoryStats.inPeriod.map(({ account, count, totalAmount }) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name} ({count} títulos • {formatBRL(totalAmount)})
                    </option>
                  ))}
                </optgroup>
              )}

              {categoryStats.others.length > 0 && (
                <optgroup label={`📋 Outras Categorias do Plano de Contas (${categoryStats.others.length})`}>
                  {categoryStats.others.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Fornecedor / Favorecido */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Fornecedor / Favorecido:
            </label>
            <select
              value={counterpartyFilter}
              onChange={(e) => setCounterpartyFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="ALL">Todos os Fornecedores e Clientes</option>
              <optgroup label="Fornecedores">
                {counterparties.filter(c => c.type === 'FORNECEDOR' || c.type === 'AMBOS').map(cp => (
                  <option key={cp.id} value={cp.id}>
                    {cp.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Clientes (Compras e Pagamentos)">
                {counterparties.filter(c => c.type === 'CLIENTE').map(cp => (
                  <option key={cp.id} value={cp.id}>
                    {cp.name} (Cliente)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Conta Bancária / Caixa Previsto */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Conta Bancária / Caixa:
            </label>
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Modalidade / Origem:
            </label>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                className="px-3 py-1.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 rounded-lg font-medium transition-colors flex items-center justify-center w-full shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Chip / Banner de Filtro de Categoria Ativo com Ação de Selecionar Todos para Classificar */}
        {categoryFilter !== 'ALL' && (
          <div className="pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-900 dark:text-rose-200 animate-fade-in shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-rose-600 text-white uppercase tracking-wider">
                  Filtro de Categoria
                </span>
                <span className="font-bold">
                  {categoryFilter === 'SEM_CATEGORIA' 
                    ? '⚠️ Não Classificados (Sem Categoria)' 
                    : (() => {
                        const acc = chartAccounts.find(a => a.id === categoryFilter);
                        return acc ? `${acc.code} - ${acc.name}` : categoryFilter;
                      })()
                  }
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                  ({filteredTitles.length} lançamentos • {formatBRL(filteredTitles.reduce((acc, t) => acc + (t.balancePrincipal || t.originalAmount || 0), 0))})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {filteredTitles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds(filteredTitles.map(t => t.id));
                      setToastMessage({
                        type: 'info',
                        text: `${filteredTitles.length} títulos desta categoria selecionados! Você pode classificá-los em lote usando a barra de ações.`
                      });
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                    title="Selecionar todos os títulos filtrados para classificar ou editar em lote"
                  >
                    Selecionar Todos ({filteredTitles.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ALL')}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                  title="Limpar filtro de categoria"
                >
                  ✕ Limpar Filtro
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Period Banner */}
      <GlobalPeriodBanner
        moduleName="Contas a Pagar"
        matchedCount={filteredTitles.length}
        totalCount={titles.length}
      />

      {/* Batch Actions Toolbar */}
      {selectedIds.length > 0 && (() => {
        const selectedTitles = titles.filter(t => selectedIds.includes(t.id));
        const hasClosedInSelection = selectedTitles.some(t => FinancialEngine.isPeriodClosed(t.competence));
        const totalSelectedBalance = selectedTitles.reduce((acc, t) => acc + t.balancePrincipal, 0);

        return (
          <div className="fixed bottom-16 inset-x-3 z-40 sm:static sm:inset-auto bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-3 sm:p-3.5 rounded-2xl sm:rounded-xl border border-rose-800 shadow-2xl sm:shadow-xl flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 animate-in slide-in-from-bottom sm:slide-in-from-top duration-200">
            {/* Header / Info counter */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {selectedIds.length}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-xs flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">{selectedIds.length} obrigação(ões)</span>
                    {hasClosedInSelection && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-normal">
                        <Lock className="w-3 h-3" /> Travada
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-rose-200 truncate">
                    Saldo: <strong>{formatBRL(totalSelectedBalance)}</strong>
                  </div>
                </div>
              </div>

              {/* Botão Desmarcar no mobile */}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="sm:hidden min-h-[40px] px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-white/10 active:bg-white/20 rounded-xl cursor-pointer shrink-0 font-medium flex items-center justify-center"
              >
                Desmarcar
              </button>
            </div>

            {/* Ações em Lote: Primária em destaque + Secundárias em carrossel horizontal suave */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-nowrap pb-0.5 touch-pan-x">
              {/* Baixar em Lote (Ação Primária com destaque e >= 44px) */}
              <button
                type="button"
                onClick={() => setIsBatchSettlementOpen(true)}
                className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center cursor-pointer shrink-0"
                title="Liquidar e amortizar os títulos selecionados em lote"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Baixar em Lote
              </button>

              {/* Prorrogar Vencimento em Lote */}
              <button
                type="button"
                onClick={() => setIsBatchPostponeOpen(true)}
                className="min-h-[40px] px-3 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center cursor-pointer shrink-0"
                title="Prorrogar vencimentos dos títulos selecionados (+7, +15, +30 dias)"
              >
                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                Prorrogar
              </button>

              {/* Exportar Lote */}
              <button
                type="button"
                onClick={handleExportSelectedExcel}
                className="min-h-[40px] px-3 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-semibold border border-white/20 transition-colors flex items-center cursor-pointer shrink-0"
                title="Exportar apenas os títulos selecionados para planilha Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Exportar
              </button>

              {/* Alteração em Massa */}
              <button
                type="button"
                onClick={() => setIsBatchEditOpen(true)}
                className="min-h-[40px] px-3 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center cursor-pointer shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                Em Massa
              </button>

              {/* Duplicar */}
              <button
                type="button"
                onClick={() => handleBatchDuplicate(false)}
                className="min-h-[40px] px-3 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-medium border border-white/20 transition-colors flex items-center cursor-pointer shrink-0"
                title="Duplicar obrigações para a mesma competência"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Duplicar
              </button>

              {/* Duplicar (+1 Mês) */}
              <button
                type="button"
                onClick={() => handleBatchDuplicate(true)}
                className="min-h-[40px] px-3 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-medium border border-white/20 transition-colors flex items-center cursor-pointer shrink-0"
                title="Duplicar avançando competência e vencimento em +1 mês"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                +1 Mês
              </button>

              {/* Cancelar */}
              <button
                type="button"
                onClick={handleOpenBatchCancel}
                className="min-h-[40px] px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center cursor-pointer shrink-0"
                title="Alterar a situação das obrigações selecionadas para CANCELADO"
              >
                <Ban className="w-3.5 h-3.5 mr-1 text-amber-400" />
                Cancelar
              </button>

              {/* Excluir */}
              <button
                type="button"
                onClick={handleOpenBatchDelete}
                className="min-h-[40px] px-3 py-2 bg-rose-700/70 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold border border-rose-500/40 transition-colors flex items-center cursor-pointer shrink-0"
                title="Excluir permanentemente as obrigações selecionadas do sistema"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Excluir
              </button>

              {/* Desmarcar desktop */}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="hidden sm:inline-flex min-h-[40px] px-3 py-2 text-xs text-slate-300 hover:text-white cursor-pointer items-center shrink-0 font-medium"
              >
                Desmarcar
              </button>
            </div>
          </div>
        );
      })()}

      {/* Summary Banner */}
      <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-4 py-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
        <span className="text-rose-900 dark:text-rose-200 flex items-center flex-wrap gap-1">
          <span>Listando <strong>{filteredTitles.length}</strong> obrigações a pagar.</span>
          <span className="hidden sm:inline ml-2 text-[11px] text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
            💡 Dica: Duplo clique em qualquer linha para editar o lançamento
          </span>
          <span className="sm:hidden text-[10px] text-rose-700 dark:text-rose-300 font-medium">
            👆 Toque na linha para ver os detalhes completos
          </span>
        </span>
        <span className="text-rose-950 dark:text-rose-100 font-bold text-xs sm:text-sm">
          Saldo em Aberto a Pagar: {formatBRL(openBalanceTotal)}
        </span>
      </div>

      {/* Mobile View: Cards Expansíveis (Descrição, Data de Vencimento e Valor; clique na linha expande o restante) */}
      <div className={`block md:hidden space-y-2.5 ${selectedIds.length > 0 ? 'pb-28 sm:pb-0' : ''}`}>
        {sortedTitles.length === 0 ? (
          <div className="bg-white dark:bg-[#1B212D] p-8 rounded-xl border border-slate-200 dark:border-[#273040] text-center text-slate-600 dark:text-slate-300 text-xs shadow-2xs">
            Nenhuma obrigação a pagar localizada para os filtros informados.
          </div>
        ) : (
          sortedTitles.map(t => {
            if (!t) return null;
            const supplier = counterparties.find(c => c && c.id === t.counterpartyId);
            const tempStatus = getTemporalStatus(t, today);
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
              cardBg = 'bg-rose-100/60 dark:bg-rose-950/40';
              cardBorder = 'border-rose-400 dark:border-rose-600';
            }

            return (
              <div 
                key={t.id}
                className={`rounded-xl border shadow-2xs overflow-hidden transition-all ${cardBg} ${cardBorder}`}
              >
                {/* Linha Principal Mobile: Status, Fornecedor, Descrição, Data e Valor Imediatos */}
                <div 
                  onClick={() => toggleExpandMobile(t.id)}
                  className="p-3.5 cursor-pointer select-none active:bg-slate-100/60 dark:active:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Checkbox com Tap Target >= 40px */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelectOne(t.id, e as any);
                      }}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center -m-2 cursor-pointer shrink-0 pt-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-300 dark:border-slate-600 text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4 bg-white dark:bg-slate-800"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Badge Temporal e Categoria Imediatos */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {balance > 0 && t.documentState !== 'CANCELADO' && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            Cancelado
                          </span>
                        )}
                        {t.settlementState === 'LIQUIDADO' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Pago
                          </span>
                        )}
                        {t.settlementState === 'PARCIAL' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            Parcial
                          </span>
                        )}
                        {chartAcc && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                            • {chartAcc.name}
                          </span>
                        )}
                      </div>

                      {/* Fornecedor / Favorecido em Destaque */}
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-snug truncate">
                        {supplier?.name || supplier?.tradeName || 'Fornecedor não especificado'}
                      </div>

                      {/* Descrição */}
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                        {t.description || 'Sem descrição'}
                      </div>

                      {/* Data de Vencimento com Ícone */}
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>Vencimento:</span>
                        <strong className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                          {formatDateBR(t.dueDate)}
                        </strong>
                      </div>
                    </div>

                    {/* Valor em Destaque + Toggle Indicator */}
                    <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                      <div className="font-extrabold font-mono text-rose-600 dark:text-rose-400 text-sm sm:text-base leading-tight">
                        {formatBRL(balance > 0 ? balance : t.originalAmount)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-auto pt-2 font-medium">
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
                          Pago
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
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Fornecedor / Favorecido</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100 block truncate">
                          {supplier?.name || 'Fornecedor não especificado'}
                        </span>
                        {supplier?.document && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">{supplier.document}</span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Nº Documento / Título</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {t.titleNumber || 'Sem código'}
                          </span>
                          {t.barcode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(t.barcode || '');
                                setToastMessage({ text: 'Linha digitável do boleto copiada!', type: 'success' });
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 cursor-pointer"
                            >
                              <Barcode className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              <span>Boleto</span>
                            </button>
                          )}
                        </div>
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

                      {t.originType === 'CARTAO_CREDITO' && (
                        <div className="col-span-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                            <CreditCard className="w-3 h-3 text-amber-500" />
                            Lançamento via Cartão de Crédito
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
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Principal Baixado</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatBRL(t.settledPrincipal || 0)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Saldo Restante</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">{formatBRL(t.balancePrincipal)}</span>
                      </div>
                    </div>

                    {/* Ações Rápidas Mobile */}
                    <div className="pt-2 border-t border-slate-200 dark:border-[#273040] flex flex-wrap gap-2 items-center">
                      {t.balancePrincipal > 0 && t.documentState !== 'CANCELADO' && (
                        <button
                          type="button"
                          onClick={() => setSelectedTitleForSettlement(t)}
                          className="min-h-[42px] flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Pagar Obrigação</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedTitleForEdit(t)}
                        className="min-h-[40px] min-w-[40px] py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDuplicateOne(t, e)}
                        className="min-h-[40px] min-w-[40px] py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        title="Duplicar obrigação"
                      >
                        <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span>Duplicar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHistoryTitle(t)}
                        className="min-h-[40px] min-w-[40px] p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs shadow-2xs flex items-center justify-center cursor-pointer"
                        title="Ver histórico de pagamentos"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {t.balancePrincipal === t.originalAmount && t.documentState !== 'CANCELADO' && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenSingleCancel(t, e)}
                          className="min-h-[40px] min-w-[40px] p-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-600/50 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl text-xs shadow-2xs flex items-center justify-center cursor-pointer"
                          title="Cancelar obrigação"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleOpenSingleDelete(t, e)}
                        className="min-h-[40px] min-w-[40px] p-2 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-600/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs shadow-2xs flex items-center justify-center cursor-pointer"
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

      {/* Payables Table (Desktop & Tablets) */}
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
                    title={isAllSelected ? "Desmarcar todos" : "Selecionar todas as obrigações da lista"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    )}
                  </button>
                </th>

                {/* Título / Documento */}
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-300/60 dark:hover:bg-slate-800/60 transition-colors text-slate-900 dark:text-slate-100 font-bold"
                  onClick={() => handleSort('titleNumber')}
                  title="Clique para ordenar por Documento/Descrição"
                >
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Título / Documento</span>
                    {sortField === 'titleNumber' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Fornecedor / Favorecido */}
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-300/60 dark:hover:bg-slate-800/60 transition-colors text-slate-900 dark:text-slate-100 font-bold"
                  onClick={() => handleSort('counterparty')}
                  title="Clique para ordenar por Fornecedor (Ordem Alfabética)"
                >
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Fornecedor / Favorecido</span>
                    {sortField === 'counterparty' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Competência */}
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-300/60 dark:hover:bg-slate-800/60 transition-colors text-slate-900 dark:text-slate-100 font-bold"
                  onClick={() => handleSort('competence')}
                  title="Clique para ordenar por Competência"
                >
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Competência</span>
                    {sortField === 'competence' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Vencimento */}
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-300/60 dark:hover:bg-slate-800/60 transition-colors text-slate-900 dark:text-slate-100 font-bold"
                  onClick={() => handleSort('dueDate')}
                  title="Clique para ordenar por Data de Vencimento"
                >
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Vencimento</span>
                    {sortField === 'dueDate' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Previsão Caixa */}
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-300/60 dark:hover:bg-slate-800/60 transition-colors text-slate-900 dark:text-slate-100 font-bold"
                  onClick={() => handleSort('expectedCashDate')}
                  title="Clique para ordenar por Data de Previsão de Pagamento"
                >
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Previsão Caixa</span>
                    {sortField === 'expectedCashDate' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Valor Original */}
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-300/60 dark:hover:bg-slate-800/60 transition-colors text-slate-900 dark:text-slate-100 font-bold"
                  onClick={() => handleSort('originalAmount')}
                  title="Clique para ordenar por Valor Original"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Valor Original</span>
                    {sortField === 'originalAmount' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Saldo Restante */}
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-300/60 dark:hover:bg-slate-800/60 transition-colors text-slate-900 dark:text-slate-100 font-bold"
                  onClick={() => handleSort('balancePrincipal')}
                  title="Clique para ordenar por Saldo Restante"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Saldo Restante</span>
                    {sortField === 'balancePrincipal' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Situação Temporal */}
                <th className="py-3 px-4 text-center text-slate-900 dark:text-slate-100 font-bold">
                  Situação Temporal
                </th>

                {/* Status */}
                <th 
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-300/60 dark:hover:bg-slate-800/60 transition-colors text-slate-900 dark:text-slate-100 font-bold"
                  onClick={() => handleSort('status')}
                  title="Clique para ordenar por Status"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Status</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    )}
                  </div>
                </th>

                <th className="py-3 px-4 text-right text-slate-900 dark:text-slate-100 font-bold">
                  Ações
                </th>
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
                  if (!t) return null;
                  const supplier = counterparties.find(c => c && c.id === t.counterpartyId);
                  const tempStatus = getTemporalStatus(t, today);
                  const isSelected = selectedIds.includes(t.id);
                  const balance = Number(t.balancePrincipal) || 0;
                  const titleDueDate = t.dueDate || today;

                  // Days diff for visual indicator safely
                  let diffDays = 0;
                  try {
                    const dueDateObj = new Date(titleDueDate + 'T00:00:00');
                    const todayObj = new Date(today + 'T00:00:00');
                    diffDays = Math.ceil((dueDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
                  } catch {
                    diffDays = 0;
                  }

                  // Row status styling: Red (Overdue), Yellow (Near due 0-3 days), Clean (On time)
                  let rowColorClass = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/60';
                  if (t.documentState === 'CANCELADO') {
                    rowColorClass = 'opacity-50 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60';
                  } else if (balance > 0) {
                    if (diffDays < 0 || titleDueDate < today) {
                      // Overdue - Red alert (suave e legível em ambos os temas)
                      rowColorClass = 'bg-rose-50/75 hover:bg-rose-100/80 border-l-4 border-l-rose-500 text-rose-950 dark:bg-rose-950/25 dark:hover:bg-rose-950/45 dark:border-l-rose-500 dark:text-rose-100 font-medium border-b border-slate-100 dark:border-slate-800/60';
                    } else if (!isNaN(diffDays) && diffDays <= 3) {
                      // Near due (Today or next 3 days) - Amber alert
                      rowColorClass = 'bg-amber-50/75 hover:bg-amber-100/80 border-l-4 border-l-amber-500 text-amber-950 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 dark:border-l-amber-400 dark:text-amber-100 font-medium border-b border-slate-100 dark:border-slate-800/60';
                    }
                  } else if (t.settlementState === 'LIQUIDADO') {
                    rowColorClass = 'hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-colors border-b border-slate-100 dark:border-slate-800/60';
                  }

                  if (isSelected) {
                    rowColorClass += ' bg-rose-100/80 dark:bg-rose-950/50';
                  }

                  return (
                    <tr 
                      key={t.id}
                      onDoubleClick={() => setSelectedTitleForEdit(t)}
                      title="💡 Dê um duplo clique para editar este lançamento"
                      className={`cursor-pointer select-none ${rowColorClass}`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectOne(t.id, e as any)}
                          className="rounded border-slate-300 dark:border-slate-600 text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4 bg-white dark:bg-slate-800"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{t.titleNumber}</span>
                          {t.originType === 'CARTAO_CREDITO' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs">
                              <CreditCard className="w-3 h-3 text-amber-500" />
                              Cartão de Crédito
                            </span>
                          )}
                          {t.barcode && (
                            <button
                              type="button"
                              title={`Linha digitável: ${t.barcode} (Clique para copiar)`}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(t.barcode || '');
                                setToastMessage({ text: 'Linha digitável do boleto copiada!', type: 'success' });
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:border-amber-500 cursor-pointer transition-colors"
                            >
                              <Barcode className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>Boleto</span>
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[220px]">{t.description}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{supplier?.name || 'Fornecedor'}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{supplier?.document}</div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {t.competence}
                      </td>

                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {formatDateBR(t.dueDate)}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {formatDateBR(t.expectedCashDate || t.dueDate)}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-medium">
                        {formatBRL(t.originalAmount)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 text-sm">
                        {formatBRL(t.balancePrincipal)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {t.balancePrincipal <= 0 ? (
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">-</span>
                        ) : (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            tempStatus === 'VENCIDO'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:border dark:border-rose-800/60'
                              : tempStatus === 'VENCE_HOJE'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border dark:border-amber-800/60'
                              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/60'
                          }`}>
                            {tempStatus === 'VENCIDO' ? 'Vencido' : tempStatus === 'VENCE_HOJE' ? 'Vence Hoje' : 'A Vencer'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          t.documentState === 'CANCELADO'
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : t.settlementState === 'LIQUIDADO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/60'
                            : t.settlementState === 'PARCIAL'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 dark:border dark:border-amber-800/60'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border dark:border-amber-800/60'
                        }`}>
                          {t.documentState === 'CANCELADO' ? 'CANCELADO' : t.settlementState}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {t.balancePrincipal > 0 && t.documentState !== 'CANCELADO' && (
                          <button
                            onClick={() => setSelectedTitleForSettlement(t)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-2xs transition-colors inline-flex items-center cursor-pointer"
                            title="Efetuar pagamento da obrigação"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Pagar
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedTitleForEdit(t)}
                          className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                          title="Editar obrigação (ou dê duplo clique na linha)"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => handleDuplicateOne(t, e)}
                          className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                          title="Duplicar esta obrigação"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setHistoryTitle(t)}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Ver detalhes e histórico de pagamentos"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {t.balancePrincipal === t.originalAmount && t.documentState !== 'CANCELADO' && (
                          <button
                            onClick={(e) => handleOpenSingleCancel(t, e)}
                            className="p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors cursor-pointer"
                            title="Cancelar Obrigação (muda status para CANCELADO)"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={(e) => handleOpenSingleDelete(t, e)}
                          className="p-1 text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
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

      {/* History Modal */}
      {historyTitle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131720] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Histórico da Obrigação: {historyTitle.titleNumber}
              </h2>
              <button 
                onClick={() => setHistoryTitle(null)} 
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Fechar histórico"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Valor Original:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{formatBRL(historyTitle.originalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Principal Pago:</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{formatBRL(historyTitle.settledPrincipal)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1">
                  <span className="text-slate-800 dark:text-slate-200 font-medium">Saldo Restante:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatBRL(historyTitle.balancePrincipal)}</span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Pagamentos Realizados</h3>
                {settlements.filter(s => s.titleId === historyTitle.id).length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-900/40 rounded border border-slate-100 dark:border-slate-800">
                    Nenhum pagamento registrado até o momento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {settlements.filter(s => s.titleId === historyTitle.id).map(s => (
                      <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                          <span>Data: {formatDateBR(s.settlementDate)}</span>
                          <span className="text-rose-600 dark:text-rose-400">-{formatBRL(s.components.netFinancialAmount)}</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                          Principal pago: {formatBRL(s.components.principalSettled)} | Desconto: {formatBRL(s.components.discount)} | Juros: {formatBRL(s.components.interest)}
                        </div>
                        {s.voucherRef && (
                          <div className="text-slate-500 dark:text-slate-400 text-[10px]">Autenticação: {s.voucherRef}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end">
              <button
                onClick={() => setHistoryTitle(null)}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
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
      {isImportModalOpen && (
        <ImportSpreadsheetModal
          isOpen={isImportModalOpen}
          defaultType="PAGAR"
          onClose={() => setIsImportModalOpen(false)}
          onImportCompleted={() => {
            setIsImportModalOpen(false);
            setStatusFilter('TODOS');
            setQuickDateFilter('ALL');
            setSearchTerm('');
            setRefreshKey(k => k + 1);
          }}
        />
      )}

      {/* Modal de Baixa em Lote (Melhoria 5) */}
      <BatchSettlementModal
        isOpen={isBatchSettlementOpen}
        onClose={() => setIsBatchSettlementOpen(false)}
        titles={titles.filter(t => selectedIds.includes(t.id))}
        type="PAGAR"
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
        type="PAGAR"
        titles={confirmModalState.titles}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false, titles: [] }))}
        onConfirm={handleExecuteConfirmedAction}
      />

      {/* Leitor e Baixa de Boletos em Lote por Linha Digitável */}
      <BoletoBatchSettlementModal
        isOpen={isBoletoModalOpen}
        onClose={() => setIsBoletoModalOpen(false)}
        titles={titles}
        bankAccounts={bankAccounts}
        counterparties={counterparties}
        onSuccess={(msg) => {
          setToastMessage({ text: msg, type: 'success' });
          setRefreshKey(k => k + 1);
        }}
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
