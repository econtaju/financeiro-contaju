import React, { useState, useMemo, useEffect } from 'react';
import {
  Receipt,
  Plus,
  CheckCircle2,
  AlertCircle,
  Info,
  Calendar,
  DollarSign,
  Layers,
  Search,
  FileText,
  Tag,
  ArrowUpRight,
  Eye,
  X,
  Clock,
  CheckCircle,
  Edit2,
  Trash2,
  Save,
  RotateCcw
} from 'lucide-react';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatDateBR, formatCompetence } from '../../services/financialEngine';
import { FinancialTitle, Sale, SaleItem } from '../../types';
import { matchesSearch } from '../../utils/searchUtils';
import { addMonthsSafe } from '../../utils/dateUtils';
import { BatchEditSalesModal } from '../Modals/BatchEditSalesModal';
import { CompleteCounterpartyModal } from '../Modals/CompleteCounterpartyModal';

interface SalesViewProps {
  onOpenBillingModal?: () => void;
  initialSearch?: string;
}

export const SalesView: React.FC<SalesViewProps> = ({ onOpenBillingModal, initialSearch = '' }) => {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [clientModalId, setClientModalId] = useState<string | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  useEffect(() => {
    return storage.subscribe(() => setRefreshTrigger(k => k + 1));
  }, []);

  const counterparties = useMemo(() => storage.getCounterparties().filter(c => c.type === 'CLIENTE' || c.type === 'AMBOS'), [refreshTrigger]);
  const chartAccounts = useMemo(() => storage.getChartAccounts().filter(a => a.isAnalytical && a.isActive && (a.nature === 'RECEITA_SERVICO' || a.code.startsWith('1'))), [refreshTrigger]);
  const contracts = useMemo(() => storage.getContracts(), [refreshTrigger]);
  const allTitles = useMemo(() => storage.getTitles(), [refreshTrigger]);
  const sales = useMemo(() => storage.getSales(), [refreshTrigger]);

  const [salesTab, setSalesTab] = useState<'ALL' | 'CONTRATO' | 'AVULSO'>('ALL');
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCompetence, setSelectedCompetence] = useState<string>('ALL');

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchTerm(initialSearch);
      setSalesTab('ALL');
    }
  }, [initialSearch]);

  // Modal para criar nova venda avulsa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState(counterparties[0]?.id || '');
  const [description, setDescription] = useState('Consultoria Tributária Especial');
  const [competence, setCompetence] = useState(currentMonth);
  const [totalAmount, setTotalAmount] = useState<number>(6000);
  const [installmentsCount, setInstallmentsCount] = useState<number>(3);
  const [firstDueDate, setFirstDueDate] = useState(today);
  const [accountId, setAccountId] = useState(chartAccounts[0]?.id || '');
  const [isGeneratingSale, setIsGeneratingSale] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Identificação de contratos ativos do cliente selecionado (Prevenção de duplicidade)
  const clientActiveContracts = useMemo(() => {
    if (!customerId) return [];
    return contracts.filter(c => c.customerId === customerId && c.status === 'ATIVO');
  }, [customerId, contracts]);

  // Detecção de títulos já existentes para o cliente na mesma competência
  const existingTitlesForClientAndComp = useMemo(() => {
    if (!customerId || !competence) return [];
    return allTitles.filter(t => 
      t.type === 'RECEBER' && 
      t.counterpartyId === customerId && 
      t.competence === competence &&
      t.documentState !== 'CANCELADO'
    );
  }, [customerId, competence, allTitles]);

  // Modal de Confirmação de Duplicidade / Faturamento Sobreposto
  const [showDuplicateWarningModal, setShowDuplicateWarningModal] = useState(false);

  // Modal de Detalhes da Venda & Vínculos
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<Sale | null>(null);

  // Modal de Edição de Venda
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCompetence, setEditCompetence] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editAccountId, setEditAccountId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<'CONFIRMADA' | 'CANCELADA'>('CONFIRMADA');
  const [editSyncTitles, setEditSyncTitles] = useState<boolean>(true);

  // Modal de Exclusão de Venda
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [deleteLinkedTitles, setDeleteLinkedTitles] = useState<boolean>(true);

  // Operações em Lote de Vendas
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  const installmentValue = installmentsCount > 0 ? totalAmount / installmentsCount : totalAmount;

  const handleOpenEdit = (s: Sale) => {
    setEditingSale(s);
    setEditCustomerId(s.customerId);
    setEditDescription(s.items?.[0]?.description || s.notes || 'Faturamento de Venda');
    setEditCompetence(s.competence || currentMonth);
    setEditDate(s.date || today);
    setEditAmount(s.netTotal || s.grossTotal || 0);
    setEditAccountId(s.items?.[0]?.accountId || chartAccounts[0]?.id || '');
    setEditNotes(s.notes || '');
    setEditStatus(s.status || 'CONFIRMADA');
    setEditSyncTitles(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    if (editAmount <= 0) {
      alert('O valor da venda deve ser superior a R$ 0,00.');
      return;
    }

    const currentUser = storage.getCurrentUser();
    const previousAmount = editingSale.netTotal || editingSale.grossTotal;

    const updatedSale: Sale = {
      ...editingSale,
      customerId: editCustomerId,
      competence: editCompetence,
      date: editDate,
      grossTotal: editAmount,
      netTotal: editAmount,
      status: editStatus,
      notes: editNotes,
      items: editingSale.items && editingSale.items.length > 0 ? [
        {
          ...editingSale.items[0],
          description: editDescription,
          unitPrice: editAmount,
          total: editAmount,
          accountId: editAccountId || editingSale.items[0].accountId
        },
        ...editingSale.items.slice(1)
      ] : [
        {
          id: `item-${editingSale.id}`,
          serviceId: 'srv-1',
          description: editDescription,
          quantity: 1,
          unitPrice: editAmount,
          discount: 0,
          total: editAmount,
          accountId: editAccountId || chartAccounts[0]?.id || 'acc-1.1.01'
        }
      ]
    };

    storage.updateSale(updatedSale, editSyncTitles);

    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EDICAO_VENDA',
      module: 'Vendas e Faturamento',
      recordId: updatedSale.saleNumber,
      details: `Venda ${updatedSale.saleNumber} atualizada. Valor: de ${formatBRL(previousAmount)} para ${formatBRL(editAmount)}. Competência: ${updatedSale.competence}. Situação: ${updatedSale.status}.`
    });

    setSuccessMessage(`✓ Venda ${updatedSale.saleNumber} atualizada com sucesso!`);
    setTimeout(() => setSuccessMessage(''), 5000);

    if (selectedSaleForDetails && selectedSaleForDetails.id === editingSale.id) {
      setSelectedSaleForDetails(updatedSale);
    }

    setEditingSale(null);
  };

  const handleOpenDelete = (s: Sale) => {
    setSaleToDelete(s);
    setDeleteLinkedTitles(true);
  };

  const handleConfirmDelete = () => {
    if (!saleToDelete) return;
    const currentUser = storage.getCurrentUser();
    const saleNum = saleToDelete.saleNumber;
    const saleAmount = saleToDelete.netTotal || saleToDelete.grossTotal;

    const res = storage.deleteSale(saleToDelete.id, { deleteLinkedTitles });

    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EXCLUSAO_VENDA',
      module: 'Vendas e Faturamento',
      recordId: saleNum,
      details: `Venda ${saleNum} (${formatBRL(saleAmount)}) excluída do sistema. ${res.deletedTitlesCount} parcela(s) vinculada(s) em aberto removida(s).`
    });

    setSuccessMessage(`✓ Venda ${saleNum} excluída com sucesso! ${res.deletedTitlesCount > 0 ? `(${res.deletedTitlesCount} parcelas em aberto também foram removidas)` : ''}`);
    setTimeout(() => setSuccessMessage(''), 5000);

    if (selectedSaleForDetails && selectedSaleForDetails.id === saleToDelete.id) {
      setSelectedSaleForDetails(null);
    }
    setSaleToDelete(null);
  };

  const handleGenerateSale = (e: React.FormEvent, forceBypassWarning = false) => {
    e.preventDefault();
    setSuccessMessage('');

    if (isGeneratingSale) return;
    if (!customerId || totalAmount <= 0 || installmentsCount <= 0) return;

    if (FinancialEngine.isPeriodClosed(competence)) {
      alert(`O período ${competence} está fechado.`);
      return;
    }

    // Se já existem títulos para este cliente na mesma competência e não foi confirmado bypass
    if (!forceBypassWarning && existingTitlesForClientAndComp.length > 0) {
      setShowDuplicateWarningModal(true);
      return;
    }

    setIsGeneratingSale(true);

    try {
      const titles = storage.getTitles();
      const currentUser = storage.getCurrentUser();
      const newTitles: FinancialTitle[] = [];

      const baseNumber = `VEN-${Date.now().toString().slice(-4)}`;
      const saleId = `sale-manual-${Date.now()}`;
      const generatedTitleIds: string[] = [];

      const firstDueDay = parseInt(firstDueDate.split('-')[2], 10);
      const [compBaseYear, compBaseMonth] = competence.split('-').map(Number);

      for (let i = 1; i <= installmentsCount; i++) {
        const dueDateStr = addMonthsSafe(firstDueDate, i - 1, firstDueDay);
        const titleId = `tit-sale-${Date.now()}-${i}`;
        generatedTitleIds.push(titleId);

        const title: FinancialTitle = {
          id: titleId,
          companyId: 'comp-1',
          type: 'RECEBER',
          titleNumber: `${baseNumber}/${i.toString().padStart(2, '0')}`,
          counterpartyId: customerId,
          description: `${description} (Parcela ${i}/${installmentsCount})`,
          accountId: accountId || chartAccounts[0]?.id || 'acc-rec-01',
          launchDate: today,
          competence: competence, // Competência econômica contábil da venda (regime de competência único no DRE)
          issueDate: today,
          dueDate: dueDateStr,
          expectedCashDate: dueDateStr,
          originalAmount: installmentValue,
          settledPrincipal: 0,
          balancePrincipal: installmentValue,
          accruedInterest: 0,
          accruedFine: 0,
          documentState: 'CONFIRMADO',
          settlementState: 'ABERTO',
          originType: 'VENDA',
          saleId: saleId,
          saleNumber: baseNumber,
          installmentIndex: i,
          totalInstallments: installmentsCount,
          notes: `Faturamento parcelado em ${installmentsCount}x da venda ${baseNumber} (Competência DRE: ${competence})`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        newTitles.push(title);
      }

      // Salvar Títulos a Receber
      storage.saveTitles([...newTitles, ...titles]);

      // Salvar a Venda vinculada
      const newSale: Sale = {
        id: saleId,
        saleNumber: baseNumber,
        customerId,
        competence,
        date: today,
        items: [
          {
            id: `item-${Date.now()}`,
            serviceId: 'srv-1',
            description,
            quantity: 1,
            unitPrice: totalAmount,
            discount: 0,
            total: totalAmount,
            accountId: accountId || chartAccounts[0]?.id || 'acc-rec-01'
          }
        ],
        grossTotal: totalAmount,
        discountTotal: 0,
        netTotal: totalAmount,
        installmentsCount,
        notes: `Venda avulsa faturada em ${installmentsCount} parcelas.`,
        createdAt: new Date().toISOString(),
        originType: 'AVULSO',
        status: 'CONFIRMADA',
        titleIds: generatedTitleIds
      };
      storage.addSale(newSale);

      const client = counterparties.find(c => c.id === customerId);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'VENDA_PARCELADA_GERADA',
        module: 'Vendas e Faturamento',
        recordId: baseNumber,
        details: `Venda ${baseNumber} de ${formatBRL(totalAmount)} em ${installmentsCount}x para ${client?.name}. Competência econômica DRE: ${competence}.`
      });

      setSuccessMessage(`✓ Venda ${baseNumber} gerada com sucesso! ${installmentsCount} parcelas de ${formatBRL(installmentValue)} criadas com competência econômica única em ${competence}.`);
      setIsModalOpen(false);
    } finally {
      setIsGeneratingSale(false);
    }
  };

  // Filtragem e Métricas
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (salesTab === 'CONTRATO' && s.originType !== 'CONTRATO') return false;
      if (salesTab === 'AVULSO' && s.originType === 'CONTRATO') return false;
      if (selectedCompetence !== 'ALL' && s.competence !== selectedCompetence) return false;

      const client = counterparties.find(c => c.id === s.customerId);
      return matchesSearch([
        s.saleNumber,
        s.contractNumber,
        s.notes,
        client?.name,
        client?.tradeName,
        s.items?.[0]?.description
      ], searchTerm);
    }).sort((a, b) => {
      const compCompare = (b.competence || '').localeCompare(a.competence || '');
      if (compCompare !== 0) return compCompare;
      return (b.date || '').localeCompare(a.date || '');
    });
  }, [sales, salesTab, selectedCompetence, searchTerm, counterparties]);

  // Lista de competências disponíveis
  const availableCompetences = useMemo(() => {
    const set = new Set<string>();
    sales.forEach(s => {
      if (s.competence) set.add(s.competence);
    });
    return Array.from(set).sort().reverse();
  }, [sales]);

  // Lógica de Operações em Lote de Vendas
  const isAllSelected = useMemo(() => {
    return filteredSales.length > 0 && selectedSaleIds.length === filteredSales.length;
  }, [filteredSales, selectedSaleIds]);

  const selectedSalesTotal = useMemo(() => {
    return sales
      .filter(s => selectedSaleIds.includes(s.id))
      .reduce((acc, s) => acc + (s.netTotal || s.grossTotal || 0), 0);
  }, [sales, selectedSaleIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSaleIds([]);
    } else {
      setSelectedSaleIds(filteredSales.map(s => s.id));
    }
  };

  const handleToggleSelectSale = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSaleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConfirmBatchDelete = () => {
    if (selectedSaleIds.length === 0) return;
    const currentUser = storage.getCurrentUser();
    let deletedCount = 0;
    let deletedTitlesTotal = 0;

    for (const id of selectedSaleIds) {
      const res = storage.deleteSale(id, { deleteLinkedTitles: true });
      deletedCount++;
      deletedTitlesTotal += res.deletedTitlesCount;
    }

    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EXCLUSAO_LOTE_VENDAS',
      module: 'Vendas e Faturamento',
      recordId: `batch-${selectedSaleIds.length}`,
      details: `${deletedCount} vendas excluídas em lote do sistema. ${deletedTitlesTotal} parcela(s) vinculada(s) em aberto removida(s).`
    });

    setSuccessMessage(`✓ ${deletedCount} venda(s) excluída(s) em lote com sucesso! (${deletedTitlesTotal} parcelas em aberto removidas)`);
    setTimeout(() => setSuccessMessage(''), 5000);

    setSelectedSaleIds([]);
    setIsBatchDeleteModalOpen(false);
  };

  // Métricas agregadas
  const metrics = useMemo(() => {
    const totalSalesAmount = sales.reduce((acc, s) => acc + (s.netTotal || s.grossTotal || 0), 0);
    const contractSales = sales.filter(s => s.originType === 'CONTRATO');
    const standaloneSales = sales.filter(s => s.originType !== 'CONTRATO');

    const contractSalesAmount = contractSales.reduce((acc, s) => acc + (s.netTotal || s.grossTotal || 0), 0);
    const standaloneSalesAmount = standaloneSales.reduce((acc, s) => acc + (s.netTotal || s.grossTotal || 0), 0);

    return {
      totalCount: sales.length,
      totalSalesAmount,
      contractSalesCount: contractSales.length,
      contractSalesAmount,
      standaloneSalesCount: standaloneSales.length,
      standaloneSalesAmount
    };
  }, [sales]);

  // Títulos vinculados à venda selecionada para detalhes
  const saleLinkedTitles = useMemo(() => {
    if (!selectedSaleForDetails) return [];
    return allTitles.filter(t =>
      t.saleId === selectedSaleForDetails.id ||
      (selectedSaleForDetails.titleIds && selectedSaleForDetails.titleIds.includes(t.id)) ||
      (selectedSaleForDetails.contractId && (t.originId === selectedSaleForDetails.contractId || t.contractId === selectedSaleForDetails.contractId) && t.competence === selectedSaleForDetails.competence)
    );
  }, [selectedSaleForDetails, allTitles]);

  const editingSaleLinkedTitles = useMemo(() => {
    if (!editingSale) return [];
    return allTitles.filter(t =>
      t.saleId === editingSale.id ||
      (editingSale.titleIds && editingSale.titleIds.includes(t.id)) ||
      (editingSale.contractId && (t.originId === editingSale.contractId || t.contractId === editingSale.contractId) && t.competence === editingSale.competence)
    );
  }, [editingSale, allTitles]);

  const deletingSaleLinkedTitles = useMemo(() => {
    if (!saleToDelete) return [];
    return allTitles.filter(t =>
      t.saleId === saleToDelete.id ||
      (saleToDelete.titleIds && saleToDelete.titleIds.includes(t.id)) ||
      (saleToDelete.contractId && (t.originId === saleToDelete.contractId || t.contractId === saleToDelete.contractId) && t.competence === saleToDelete.competence)
    );
  }, [saleToDelete, allTitles]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--surface-card)] p-5 rounded-xl border border-[var(--border-subtle)] shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Vendas & Faturamento de Contratos</h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Registro unificado de vendas geradas a partir de contratos recorrentes e faturamento de serviços avulsos.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="h-9 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Faturar Venda Avulsa / Serviço
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Total Faturado em Vendas</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-700 dark:text-slate-300">
              {metrics.totalCount} vendas
            </span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] mt-1.5 font-mono">
            {formatBRL(metrics.totalSalesAmount)}
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">Reconhecimento econômico no DRE</p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Vendas de Contratos (MRR)</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              {metrics.contractSalesCount} faturas
            </span>
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1.5 font-mono">
            {formatBRL(metrics.contractSalesAmount)}
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">Vendas vinculadas a contratos ativos</p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-primary)]">Vendas Avulsas / Pontuais</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-700 dark:text-slate-300">
              {metrics.standaloneSalesCount} vendas
            </span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] mt-1.5 font-mono">
            {formatBRL(metrics.standaloneSalesAmount)}
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">Consultorias e serviços esporádicos</p>
        </div>
      </div>

      {/* Concept Explanatory Card */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-4 text-xs flex items-start space-x-3">
        <Info className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <span className="font-bold text-[var(--text-primary)]">
            Fluxo Integrado: Contrato ➔ Venda (DRE) ➔ Parcelas a Receber (Caixa)
          </span>
          <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">
            O <strong>Contrato</strong> é a matriz mestra de controle. Ao gerar o faturamento, cria-se a <strong>Venda</strong> (que reconhece a receita no mês econômico do DRE) e, a partir da venda, geram-se as <strong>Parcelas a Receber</strong> com seus respectivos vencimentos no Fluxo de Caixa.
          </p>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-[var(--surface-elevated)] p-1 rounded-xl border border-[var(--border-subtle)]">
            <button
              onClick={() => setSalesTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                salesTab === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Todas as Vendas ({sales.length})
            </button>
            <button
              onClick={() => setSalesTab('CONTRATO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                salesTab === 'CONTRATO'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Contratos Recorrentes ({metrics.contractSalesCount})
            </button>
            <button
              onClick={() => setSalesTab('AVULSO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                salesTab === 'AVULSO'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Vendas Avulsas ({metrics.standaloneSalesCount})
            </button>
          </div>

          {/* Search & Competence */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente, venda ou contrato..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <select
              value={selectedCompetence}
              onChange={e => setSelectedCompetence(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            >
              <option value="ALL">Todas as Competências</option>
              {availableCompetences.map(c => (
                <option key={c} value={c}>{formatCompetence(c)}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Batch Actions Toolbar */}
      {selectedSaleIds.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-white p-3.5 rounded-2xl border border-amber-600/40 shadow-xl flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-3">
            <span className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-xs shrink-0">
              {selectedSaleIds.length}
            </span>
            <div>
              <div className="font-bold text-xs flex items-center gap-2">
                <span>{selectedSaleIds.length} venda(s) selecionada(s)</span>
                <span className="text-amber-400 font-mono font-normal">
                  ({formatBRL(selectedSalesTotal)})
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                Ações em massa para agilizar faturamento, dados cadastrais e categorias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsBatchEditModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              Editar em Lote ({selectedSaleIds.length})
            </button>

            <button
              type="button"
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir em Lote
            </button>

            <button
              type="button"
              onClick={() => setSelectedSaleIds([])}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Limpar seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sales Table */}
      <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--surface-elevated)]/50">
          <h2 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
            Listagem de Vendas Registradas ({filteredSales.length})
          </h2>
          <span className="text-[11px] text-[var(--text-secondary)]">
            Total filtrado: <strong className="font-mono text-[var(--text-primary)]">{formatBRL(filteredSales.reduce((acc, s) => acc + (s.netTotal || 0), 0))}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-[44px] text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded-md border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    title="Selecionar todas as vendas filtradas"
                    aria-label="Selecionar todas as vendas filtradas"
                  />
                </th>
                <th className="py-3 px-4 w-[130px]">Nº da Venda</th>
                <th className="py-3 px-4 w-[150px]">Origem / Vínculo</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Descrição do Serviço</th>
                <th className="py-3 px-4 text-center w-[110px]">Competência (DRE)</th>
                <th className="py-3 px-4 text-center w-[100px]">Data Emissão</th>
                <th className="py-3 px-4 text-right w-[130px]">Valor da Venda</th>
                <th className="py-3 px-4 text-center w-[120px]">Parcelas a Receber</th>
                <th className="py-3 px-4 text-center w-[110px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[var(--text-secondary)] italic">
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredSales.map(s => {
                  const client = counterparties.find(c => c.id === s.customerId);
                  const isContract = s.originType === 'CONTRATO';
                  const contract = isContract ? contracts.find(c => c.id === s.contractId || c.contractNumber === s.contractNumber) : null;
                  const isSelected = selectedSaleIds.includes(s.id);

                  // Encontrar títulos vinculados a essa venda
                  const titlesForSale = allTitles.filter(t =>
                    t.saleId === s.id ||
                    (s.titleIds && s.titleIds.includes(t.id)) ||
                    (s.contractId && (t.originId === s.contractId || t.contractId === s.contractId) && t.competence === s.competence)
                  );
                  const settledCount = titlesForSale.filter(t => t.settlementState === 'LIQUIDADO').length;

                  return (
                    <tr 
                      key={s.id} 
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-amber-500/10 hover:bg-amber-500/15' 
                          : 'hover:bg-[var(--surface-elevated)]/50'
                      }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectSale(s.id, e)}
                          className="w-4 h-4 rounded-md border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                          title={`Selecionar venda ${s.saleNumber}`}
                          aria-label={`Selecionar venda ${s.saleNumber}`}
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[var(--text-primary)]">
                        {s.saleNumber}
                      </td>
                      <td className="py-3 px-4">
                        {isContract ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <FileText className="w-3 h-3" />
                              <span>{s.contractNumber || contract?.contractNumber || 'Contrato'}</span>
                            </span>
                            <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">Recorrente (MRR)</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                            <Receipt className="w-3 h-3" />
                            <span>Venda Avulsa</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[var(--text-primary)]">{client?.name || 'Cliente'}</span>
                          {client && (
                            <button
                              type="button"
                              onClick={() => {
                                setClientModalId(client.id);
                                setIsClientModalOpen(true);
                              }}
                              className="text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 p-0.5 rounded hover:bg-amber-500/10 transition-colors cursor-pointer"
                              title={`Editar cadastro de ${client.name}`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {client?.document && (
                          <div className="text-[10px] text-[var(--text-secondary)] font-mono">{client.document}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        <span className="truncate max-w-xs block" title={s.items?.[0]?.description || s.notes}>
                          {s.items?.[0]?.description || s.notes || 'Prestação de Serviços'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-[var(--text-primary)]">
                        {formatCompetence(s.competence)}
                      </td>
                      <td className="py-3 px-4 text-center text-[var(--text-secondary)] font-mono">
                        {formatDateBR(s.date)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[var(--text-primary)]">
                        {formatBRL(s.netTotal || s.grossTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          titlesForSale.length > 0 && settledCount === titlesForSale.length
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                        }`}>
                          {settledCount}/{titlesForSale.length || s.installmentsCount || 1} Quitada(s)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedSaleForDetails(s)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-amber-500 hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
                            title="Ver detalhes da venda e parcelas vinculadas"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Editar dados da venda e parcelas"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(s)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Excluir venda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhes da Venda & Vínculos */}
      {selectedSaleForDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[var(--border-subtle)] animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    Detalhes da Operação de Venda
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] font-mono">
                    Venda: {selectedSaleForDetails.saleNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSaleForDetails(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">

              {/* Informações Gerais */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Cliente</span>
                  <span className="font-semibold text-sm text-[var(--text-primary)]">
                    {counterparties.find(c => c.id === selectedSaleForDetails.customerId)?.name || 'Cliente'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Origem / Vínculo</span>
                  {selectedSaleForDetails.originType === 'CONTRATO' ? (
                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                      Contrato {selectedSaleForDetails.contractNumber || 'Recorrente'}
                    </span>
                  ) : (
                    <span className="font-bold text-[var(--text-primary)] mt-0.5 block">
                      Venda Avulsa / Serviço Pontual
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Competência DRE</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    {formatCompetence(selectedSaleForDetails.competence)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Valor Econômico Total</span>
                  <span className="font-mono font-bold text-base text-[var(--text-primary)]">
                    {formatBRL(selectedSaleForDetails.netTotal || selectedSaleForDetails.grossTotal)}
                  </span>
                </div>
              </div>

              {/* Títulos / Parcelas no Contas a Receber */}
              <div>
                <h3 className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Parcelas a Receber Vinculadas ({saleLinkedTitles.length})
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {saleLinkedTitles.length === 0 ? (
                    <div className="p-4 text-center text-[var(--text-secondary)] italic bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
                      Nenhuma parcela encontrada para esta venda.
                    </div>
                  ) : (
                    saleLinkedTitles.map(t => (
                      <div key={t.id} className="p-3 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] flex items-center justify-between">
                        <div>
                          <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <span>{t.titleNumber}</span>
                            <span className="text-[10px] font-mono text-[var(--text-secondary)]">Venc. {formatDateBR(t.dueDate)}</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{t.description}</div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-bold text-[var(--text-primary)]">{formatBRL(t.originalAmount)}</div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.settlementState === 'LIQUIDADO'
                              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                          }`}>
                            {t.settlementState}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sale = selectedSaleForDetails;
                      setSelectedSaleForDetails(null);
                      handleOpenEdit(sale);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar Venda
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sale = selectedSaleForDetails;
                      setSelectedSaleForDetails(null);
                      handleOpenDelete(sale);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir Venda
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSaleForDetails(null)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal to create installment sale */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[var(--border-subtle)] animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Faturamento de Venda Avulsa / Parcelada
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateSale} className="p-6 space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <label className="block font-semibold text-[var(--text-primary)]">Cliente *</label>
                  <div className="flex items-center gap-1.5">
                    {customerId && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientModalId(customerId);
                          setIsClientModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
                        title="Editar cadastro completo deste cliente"
                      >
                        <Edit2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>Editar Cadastro</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setClientModalId('NEW');
                        setIsClientModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Cadastrar um novo cliente agora sem sair da venda"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Novo Cliente</span>
                    </button>
                  </div>
                </div>
                <select
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
                  required
                >
                  {counterparties.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {/* ALERTA CRÍTICO ANTI-DUPLICAÇÃO COM CONTRATOS ATIVOS */}
                {clientActiveContracts.length > 0 && (
                  <div className="mt-2.5 p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-xs space-y-1.5 animate-in fade-in">
                    <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Atenção: Este cliente já possui Contrato Recorrente Ativo!</span>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      O cliente possui o(s) contrato(s):{' '}
                      <strong>{clientActiveContracts.map(c => `${c.contractNumber} (${formatBRL(c.monthlyTotal)}/mês)`).join(', ')}</strong>{' '}
                      com títulos e faturamento programados automaticamente.
                    </p>
                    <p className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                      ⚠️ <strong>Apenas lance aqui se for um serviço extraordinário/avulso.</strong> Se você estiver tentando faturar a mensalidade do contrato, não é necessário gerar venda avulsa, pois o contrato já gera os títulos e faturas para evitar duplicidade.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Descrição do Serviço / Venda *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
                  placeholder="Ex: Abertura e Legalização Societária"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">Valor Total da Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={totalAmount || ''}
                    onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 font-mono font-bold text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">Número de Parcelas *</label>
                  <select
                    value={installmentsCount}
                    onChange={e => setInstallmentsCount(parseInt(e.target.value) || 1)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 font-semibold text-[var(--text-primary)]"
                  >
                    <option value="1">À Vista (1x)</option>
                    <option value="2">2 parcelas</option>
                    <option value="3">3 parcelas</option>
                    <option value="4">4 parcelas</option>
                    <option value="6">6 parcelas</option>
                    <option value="10">10 parcelas</option>
                    <option value="12">12 parcelas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">Competência DRE *</label>
                  <input
                    type="month"
                    value={competence}
                    onChange={e => setCompetence(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 font-semibold text-[var(--text-primary)]"
                    required
                  />
                  <span className="text-[10px] text-[var(--text-secondary)]">Reconhecimento integral da receita</span>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">1º Vencimento *</label>
                  <input
                    type="date"
                    value={firstDueDate}
                    onChange={e => setFirstDueDate(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 font-semibold text-[var(--text-primary)]"
                    required
                  />
                  <span className="text-[10px] text-[var(--text-secondary)]">Demais parcelas em +30d</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Classificação Contábil DRE *</label>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 font-semibold text-[var(--text-primary)]"
                >
                  {chartAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>

              {/* Installment simulation box */}
              <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs space-y-1">
                <div className="font-semibold text-[var(--text-primary)] flex items-center">
                  <Layers className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  Simulação Contábil (DRE) vs Financeiro (Caixa):
                </div>
                <div className="text-[var(--text-secondary)]">
                  Total reconhecido no DRE em <strong>{formatCompetence(competence)}</strong>: <strong>{formatBRL(totalAmount)}</strong>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Fluxo de Caixa: {installmentsCount} parcela(s) de <strong>{formatBRL(installmentValue)}</strong> distribuídas nos vencimentos
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isGeneratingSale}
                  className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingSale}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {isGeneratingSale ? (
                    <span>Processando...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-slate-950" />
                      <span>Confirmar Faturamento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Alerta e Confirmação de Duplicidade / Faturamento Sobreposto */}
      {showDuplicateWarningModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-amber-500/40 animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-amber-500/15">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-amber-900 dark:text-amber-300">
                    Aviso de Faturamento Sobreposto
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Possível duplicidade identificada
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDuplicateWarningModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                Já existe(m) <strong>{existingTitlesForClientAndComp.length} título(s) a receber</strong> cadastrado(s) para este cliente na competência <strong>{formatCompetence(competence)}</strong>:
              </p>

              <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
                {existingTitlesForClientAndComp.map(t => (
                  <div key={t.id} className="flex justify-between items-center text-[11px] p-1.5 rounded bg-[var(--surface-card)]">
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {t.titleNumber} ({t.originType})
                    </span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                      {formatBRL(t.originalAmount)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 text-slate-800 dark:text-slate-200">
                <p className="font-bold text-amber-900 dark:text-amber-300">
                  Deseja realmente gerar este novo faturamento?
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Se esta venda for uma cobrança avulsa ou serviço extra independente da mensalidade, clique em <strong>"Sim, Criar Cobrança Adicional"</strong>. Se for apenas a mensalidade regular, cancele para não duplicar o contas a receber.
                </p>
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowDuplicateWarningModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] transition-colors cursor-pointer"
                >
                  Cancelar (Evitar Duplicata)
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    setShowDuplicateWarningModal(false);
                    handleGenerateSale(e as any, true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Sim, Criar Cobrança Adicional
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Venda */}
      {editingSale && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-[var(--border-subtle)] animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    Editar Venda / Faturamento
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                      {editingSale.saleNumber}
                    </span>
                    {editingSale.originType === 'CONTRATO' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        Contrato {editingSale.contractNumber}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                        Venda Avulsa
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingSale(null)} 
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Cliente *</label>
                <select
                  value={editCustomerId}
                  onChange={e => setEditCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
                  required
                >
                  {counterparties.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Descrição do Serviço / Faturamento *</label>
                <input
                  type="text"
                  required
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
                  placeholder="Ex: Mensalidade Contábil ou Consultoria Especial"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">Valor Total da Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editAmount || ''}
                    onChange={e => setEditAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 font-mono font-bold text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">Situação da Venda *</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as 'CONFIRMADA' | 'CANCELADA')}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 font-semibold text-[var(--text-primary)]"
                  >
                    <option value="CONFIRMADA">Confirmada / Ativa</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">Competência DRE *</label>
                  <input
                    type="month"
                    value={editCompetence}
                    onChange={e => setEditCompetence(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 font-semibold text-[var(--text-primary)]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">Data de Emissão *</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 font-semibold text-[var(--text-primary)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Classificação Contábil DRE</label>
                <select
                  value={editAccountId}
                  onChange={e => setEditAccountId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 font-semibold text-[var(--text-primary)]"
                >
                  {chartAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Observações / Notas</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--text-primary)]"
                  placeholder="Informações adicionais sobre esta venda..."
                />
              </div>

              {/* Sincronização com financeiro */}
              <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editSyncTitles}
                    onChange={e => setEditSyncTitles(e.target.checked)}
                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">
                      Sincronizar parcelas vinculadas no Contas a Receber
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      Atualiza cliente, competência, descrição e valor das parcelas em aberto desta venda no financeiro.
                    </span>
                  </div>
                </label>

                {editingSaleLinkedTitles.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                    <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-1">
                      Parcelas Vinculadas ({editingSaleLinkedTitles.length}):
                    </span>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {editingSaleLinkedTitles.map(t => (
                        <div key={t.id} className="flex justify-between items-center text-[11px] px-2 py-1 rounded bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                          <span className="font-mono">{t.titleNumber} ({formatDateBR(t.dueDate)})</span>
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                            t.settlementState === 'LIQUIDADO' 
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' 
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}>
                            {formatBRL(t.originalAmount)} • {t.settlementState}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão de Venda */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-500/30 animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-rose-500/10">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-rose-600 dark:text-rose-400">
                    Excluir Venda / Faturamento
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] font-mono">
                    {saleToDelete.saleNumber}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSaleToDelete(null)} 
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-[var(--text-primary)] text-sm">
                Tem certeza de que deseja excluir a venda <strong>{saleToDelete.saleNumber}</strong> no valor de <strong>{formatBRL(saleToDelete.netTotal || saleToDelete.grossTotal)}</strong>?
              </p>

              <div className="p-3 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Cliente:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {counterparties.find(c => c.id === saleToDelete.customerId)?.name || 'Cliente'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Competência DRE:</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    {formatCompetence(saleToDelete.competence)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Origem:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {saleToDelete.originType === 'CONTRATO' ? `Contrato ${saleToDelete.contractNumber}` : 'Venda Avulsa'}
                  </span>
                </div>
              </div>

              {deletingSaleLinkedTitles.length > 0 && (
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <input
                      type="checkbox"
                      checked={deleteLinkedTitles}
                      onChange={e => setDeleteLinkedTitles(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="font-bold text-rose-700 dark:text-rose-300 block">
                        Excluir também as parcelas em aberto no Contas a Receber
                      </span>
                      <span className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
                        {deletingSaleLinkedTitles.filter(t => t.settlementState !== 'LIQUIDADO').length} parcela(s) em aberto serão removidas do financeiro para evitar saldo fantasma.
                      </span>
                    </div>
                  </label>

                  {deletingSaleLinkedTitles.some(t => t.settlementState === 'LIQUIDADO') && (
                    <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        Esta venda possui parcela(s) já quitadas no banco, que serão preservadas para não desbalancear o caixa.
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setSaleToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Vendas em Lote */}
      <BatchEditSalesModal
        isOpen={isBatchEditModalOpen}
        selectedSaleIds={selectedSaleIds}
        sales={sales}
        onClose={() => setIsBatchEditModalOpen(false)}
        onSaved={(count) => {
          setSelectedSaleIds([]);
          setSuccessMessage(`✓ ${count} venda(s) atualizada(s) em lote com sucesso!`);
          setTimeout(() => setSuccessMessage(''), 5000);
        }}
      />

      {/* Modal de Exclusão em Lote */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-md w-full p-5 border border-[var(--border-subtle)] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-500/10">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Excluir Vendas em Lote</h3>
                <p className="text-xs text-[var(--text-secondary)]">{selectedSaleIds.length} vendas selecionadas ({formatBRL(selectedSalesTotal)})</p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Tem certeza que deseja excluir definitivamente as <strong>{selectedSaleIds.length}</strong> vendas selecionadas? As parcelas vinculadas em aberto também serão removidas do Contas a Receber.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-500 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Confirmar Exclusão em Lote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rápido de Criação / Edição de Cliente */}
      <CompleteCounterpartyModal
        isOpen={isClientModalOpen}
        counterpartyId={clientModalId}
        defaultType="CLIENTE"
        onClose={() => {
          setIsClientModalOpen(false);
          setClientModalId(null);
        }}
        onSaved={(savedClient) => {
          if (clientModalId === 'NEW') {
            setCustomerId(savedClient.id);
          }
          setSuccessMessage(`Dados de "${savedClient.name}" salvos com sucesso!`);
          setTimeout(() => setSuccessMessage(''), 4000);
        }}
      />
    </div>
  );
};
