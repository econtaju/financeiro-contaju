import React, { useState, useEffect, useMemo } from 'react';
import { X, Edit3, AlertCircle, CheckCircle2, FolderPlus, Wallet, Edit2, Plus } from 'lucide-react';
import { FinancialTitle, Counterparty, ChartAccount } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, getFilteredChartAccounts, formatChartAccountSelectOptions } from '../../services/financialEngine';
import { SearchableSelect, SelectOption } from '../Common/SearchableSelect';
import { CompleteCounterpartyModal } from './CompleteCounterpartyModal';
import { QuickCreateAccountModal } from './QuickCreateAccountModal';
import { RecurringSeriesService, SeriesDetectionResult } from '../../services/recurringSeriesService';
import { SeriesUpdateConfirmationModal } from './SeriesUpdateConfirmationModal';
import { toast } from '../../hooks/useToast';

interface EditTitleModalProps {
  isOpen: boolean;
  title: FinancialTitle | null;
  onClose: () => void;
  onSaved: () => void;
}

export const EditTitleModal: React.FC<EditTitleModalProps> = ({
  isOpen,
  title,
  onClose,
  onSaved
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [description, setDescription] = useState('');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [counterpartyFilter, setCounterpartyFilter] = useState<'TODOS' | 'FORNECEDORES' | 'CLIENTES'>('TODOS');
  const [counterpartyRefreshTrigger, setCounterpartyRefreshTrigger] = useState(0);
  const [isManualCounterpartyModalOpen, setIsManualCounterpartyModalOpen] = useState(false);
  const [manualCounterpartyId, setManualCounterpartyId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState('');
  const [competence, setCompetence] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expectedCashDate, setExpectedCashDate] = useState('');
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [expectedBankAccountId, setExpectedBankAccountId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Quick account creation state
  const [isQuickAccountModalOpen, setIsQuickAccountModalOpen] = useState(false);

  // Quick counterparty creation state
  const [quickCreatedId, setQuickCreatedId] = useState<string | null>(null);
  const [openCompleteModal, setOpenCompleteModal] = useState(false);
  const [openCompleteAfterSave, setOpenCompleteAfterSave] = useState(true);

  // Estados de Baixa / Pagamento / Recebimento imediato
  const [isAlreadySettled, setIsAlreadySettled] = useState(false);
  const [settlementDate, setSettlementDate] = useState(today);
  const [settlementBankAccountId, setSettlementBankAccountId] = useState('');
  const [settlementPaymentMethod, setSettlementPaymentMethod] = useState<'PIX' | 'BOLETO' | 'TRANSFERENCIA' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'DEBITO_AUTOMATICO' | 'OUTROS'>('PIX');
  const [settlementDiscount, setSettlementDiscount] = useState<number>(0);
  const [settlementInterest, setSettlementInterest] = useState<number>(0);
  const [settlementBankFee, setSettlementBankFee] = useState<number>(0);
  const [settlementVoucherRef, setSettlementVoucherRef] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');

  // Estados para interceptação de alteração de valor em séries/recorrências/parcelamentos
  const [seriesModalState, setSeriesModalState] = useState<{
    isOpen: boolean;
    pendingAmount: number;
    seriesInfo: SeriesDetectionResult | null;
    pendingUpdates: Partial<FinancialTitle> | null;
  }>({
    isOpen: false,
    pendingAmount: 0,
    seriesInfo: null,
    pendingUpdates: null
  });

  useEffect(() => {
    if (title) {
      setDescription(title.description || '');
      setCounterpartyId(title.counterpartyId || '');
      setAccountId(title.accountId || '');
      setCompetence(title.competence || '');
      setDueDate(title.dueDate || '');
      setExpectedCashDate(title.expectedCashDate || title.dueDate || '');
      setOriginalAmount(title.originalAmount || 0);
      setExpectedBankAccountId(title.expectedBankAccountId || '');
      setBarcode(title.barcode || '');
      setNotes(title.notes || '');
      setErrorMessage('');

      setIsAlreadySettled(false);
      setSettlementDate(today);
      setSettlementBankAccountId(title.expectedBankAccountId || '');
      setSettlementPaymentMethod('PIX');
      setSettlementDiscount(0);
      setSettlementInterest(0);
      setSettlementBankFee(0);
      setSettlementVoucherRef('');
      setSettlementNotes('');

      setSeriesModalState({
        isOpen: false,
        pendingAmount: 0,
        seriesInfo: null,
        pendingUpdates: null
      });
    }
  }, [title, isOpen]);

  // Filtrar rigorosamente o plano de contas:
  // - Para RECEBER: apenas Receitas
  // - Para PAGAR: apenas Custos e Despesas
  const chartAccounts = useMemo(() => {
    if (!title) return [];
    const all = storage.getChartAccounts();
    const filtered = getFilteredChartAccounts(all, title.type);
    // Se o título já possui uma conta que não constava no filtro, preserva a conta existente
    if (accountId && !filtered.some(a => a.id === accountId)) {
      const current = all.find(a => a.id === accountId);
      if (current) {
        return [current, ...filtered];
      }
    }
    return filtered;
  }, [title?.type, accountId, isOpen]);

  const allCounterparties = useMemo(() => {
    try {
      const data = storage.getCounterparties();
      return Array.isArray(data) ? data.filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [counterpartyRefreshTrigger, isOpen]);

  const bankAccounts = useMemo(() => {
    try {
      const data = storage.getBankAccounts();
      return Array.isArray(data) ? data.filter(a => a && a.status === 'ATIVO') : [];
    } catch {
      return [];
    }
  }, [isOpen]);

  if (!isOpen || !title) return null;

  const isReceber = title.type === 'RECEBER';
  const hasSettlements = (title.settledPrincipal || 0) > 0;

  const counterparties = (allCounterparties || []).filter(c => {
    if (!c) return false;
    if (isReceber) return c.type === 'CLIENTE' || c.type === 'AMBOS';
    if (counterpartyFilter === 'FORNECEDORES') return c.type === 'FORNECEDOR' || c.type === 'AMBOS';
    if (counterpartyFilter === 'CLIENTES') return c.type === 'CLIENTE' || c.type === 'AMBOS';
    return true; // TODOS
  });

  const counterpartyOptions: SelectOption[] = counterparties
    .filter(c => c && c.id)
    .map(c => {
      let typeBadge = '';
      if (c.type === 'CLIENTE') typeBadge = 'Cliente';
      else if (c.type === 'FORNECEDOR') typeBadge = 'Fornecedor';
      else if (c.type === 'AMBOS') typeBadge = 'Cliente & Forn.';

      return {
        value: c.id,
        label: c.name || 'Sem Nome',
        sublabel: c.document ? `Doc: ${c.document}` : (c.tradeName || undefined),
        badge: c.status === 'ATIVO' ? typeBadge : 'Inativo'
      };
    });

  const chartAccountOptions: SelectOption[] = formatChartAccountSelectOptions(chartAccounts || []);

  const bankAccountOptions: SelectOption[] = [
    { value: '', label: 'Indiferente / Não definida' },
    ...bankAccounts.map(b => {
      let balanceStr = '0.00';
      try {
        const bal = FinancialEngine.getAccountBalance(b.id);
        balanceStr = Number(bal || 0).toFixed(2);
      } catch {
        balanceStr = '0.00';
      }
      return {
        value: b.id,
        label: b.name || 'Conta Bancária',
        sublabel: `${b.institution || 'Banco'} - Saldo R$ ${balanceStr}`
      };
    })
  ];

  const handleQuickCreateCounterparty = (name: string) => {
    const newId = `cp-${Date.now()}`;
    const newParty: Counterparty = {
      id: newId,
      name,
      type: isReceber ? 'CLIENTE' : (counterpartyFilter === 'CLIENTES' ? 'CLIENTE' : 'FORNECEDOR'),
      document: '',
      email: '',
      phone: '',
      status: 'ATIVO',
      createdAt: new Date().toISOString(),
      notes: 'Cadastro rápido criado via edição de título.'
    };
    storage.addCounterparty(newParty);
    setCounterpartyId(newId);
    setQuickCreatedId(newId);
  };

  const handleAccountCreated = (newAccount: ChartAccount) => {
    setAccountId(newAccount.id);
  };

  const executeFinalSave = (
    updatesToApply: Partial<FinancialTitle>,
    amountToSave: number,
    applyToSubsequent: boolean,
    seriesInfo?: SeriesDetectionResult | null
  ) => {
    if (!title) return;

    const currentUser = storage.getCurrentUser();
    const newBalance = Math.max(0, amountToSave - (title.settledPrincipal || 0));

    if (applyToSubsequent && seriesInfo && seriesInfo.subsequentOpenTitles.length > 0) {
      const result = RecurringSeriesService.executeSeriesUpdate({
        targetTitleId: title.id,
        newAmount: amountToSave,
        updates: updatesToApply,
        applyToSubsequent: true,
        subsequentTitleIds: seriesInfo.subsequentOpenTitles.map(t => t.id),
        contractId: title.contractId,
        currentUser
      });

      toast.success(
        `Atualização em lote concluída com sucesso! ${result.updatedCount} lançamento(s) em aberto foram atualizados para ${formatBRL(amountToSave)}.`
      );
    } else {
      storage.updateTitle(title.id, {
        ...updatesToApply,
        originalAmount: Number(amountToSave),
        balancePrincipal: newBalance
      });

      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'EDICAO_TITULO',
        module: isReceber ? 'Contas a Receber' : 'Contas a Pagar',
        recordId: title.id,
        details: `Edição do título ${title.titleNumber} (${updatesToApply.description || title.description}). Valor: ${formatBRL(amountToSave)}, Vencimento: ${updatesToApply.dueDate || title.dueDate}.`
      });

      if (seriesInfo && seriesInfo.isSeries) {
        toast.success('Título atualizado! A alteração de valor foi aplicada apenas a este lançamento.');
      }
    }

    // Se marcou como liquidado agora, efetuar a baixa do saldo remanescente
    if (isAlreadySettled && newBalance > 0) {
      FinancialEngine.postSettlement({
        titleId: title.id,
        settlementDate,
        bankAccountId: settlementBankAccountId,
        principalSettled: newBalance,
        discount: settlementDiscount,
        interest: settlementInterest,
        fine: 0,
        bankFee: isReceber ? settlementBankFee : 0,
        voucherRef: settlementVoucherRef.trim() || undefined,
        notes: settlementNotes.trim() 
          ? `${settlementNotes.trim()} [${settlementPaymentMethod}]` 
          : `Baixa realizada na edição do título [${settlementPaymentMethod}]`
      });
    }

    if (quickCreatedId && openCompleteAfterSave) {
      setOpenCompleteModal(true);
    } else {
      onSaved();
      onClose();
    }
  };

  const handleConfirmSeriesChoice = (applyToSubsequent: boolean) => {
    if (!seriesModalState.pendingUpdates) return;
    const updates = seriesModalState.pendingUpdates;
    const amt = seriesModalState.pendingAmount;
    const info = seriesModalState.seriesInfo;

    setSeriesModalState({
      isOpen: false,
      pendingAmount: 0,
      seriesInfo: null,
      pendingUpdates: null
    });

    executeFinalSave(updates, amt, applyToSubsequent, info);
  };

  const handleCancelSeriesChoice = () => {
    setSeriesModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!counterpartyId) {
      setErrorMessage(isReceber ? 'Selecione o cliente.' : 'Selecione o fornecedor.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Informe a descrição do lançamento.');
      return;
    }
    if (!accountId) {
      setErrorMessage('Selecione uma conta analítica do plano de contas.');
      return;
    }
    if (originalAmount <= 0) {
      setErrorMessage('O valor do título deve ser superior a zero.');
      return;
    }

    if (hasSettlements && originalAmount < title.settledPrincipal) {
      setErrorMessage(
        `O valor original (${formatBRL(originalAmount)}) não pode ser inferior ao valor já baixado (${formatBRL(title.settledPrincipal)}).`
      );
      return;
    }

    if (FinancialEngine.isPeriodClosed(title.competence)) {
      setErrorMessage(`A competência atual deste título (${title.competence}) encontra-se FECHADA e travada para alterações contábeis. Reabra o período no Fechamento Mensal para realizar modificações.`);
      return;
    }

    if (FinancialEngine.isPeriodClosed(competence)) {
      setErrorMessage(`A competência informada (${competence}) encontra-se FECHADA e travada para alterações.`);
      return;
    }

    const currentUser = storage.getCurrentUser();
    if (currentUser.role === 'CONSULTA') {
      setErrorMessage('Perfil de consulta não possui permissão para editar títulos.');
      return;
    }

    // Se marcou para liquidar/baixar agora o saldo restante
    if (isAlreadySettled) {
      if (!settlementBankAccountId) {
        setErrorMessage('Selecione a conta bancária onde ocorreu a movimentação.');
        return;
      }
      if (settlementDate > today) {
        setErrorMessage('A data da liquidação não pode ser futura.');
        return;
      }
      const settlementMonth = settlementDate.substring(0, 7);
      if (FinancialEngine.isPeriodClosed(settlementMonth)) {
        setErrorMessage(`O mês da liquidação (${settlementMonth}) encontra-se encerrado para alterações.`);
        return;
      }
    }

    const updatesPayload: Partial<FinancialTitle> = {
      description: description.trim(),
      counterpartyId,
      accountId,
      competence,
      dueDate,
      expectedCashDate: dueDate, // Oculto da interface, leva em conta a data de vencimento
      expectedBankAccountId: settlementBankAccountId || expectedBankAccountId || undefined,
      barcode: barcode.trim() || undefined,
      notes
    };

    // Verificar se houve alteração no valor do título
    const amountChanged = Math.abs(Number(originalAmount) - Number(title.originalAmount)) > 0.001;

    if (amountChanged) {
      const seriesInfo = RecurringSeriesService.detectSeries(title);
      // Se pertence a uma série e há meses/parcelas seguintes em aberto
      if (seriesInfo.isSeries && seriesInfo.subsequentOpenTitles.length > 0) {
        setSeriesModalState({
          isOpen: true,
          pendingAmount: Number(originalAmount),
          seriesInfo,
          pendingUpdates: updatesPayload
        });
        return;
      }
    }

    // Sem alteração de valor ou sem parcelas seguintes em aberto: salvar diretamente
    executeFinalSave(updatesPayload, Number(originalAmount), false, null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl max-w-xl w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] overflow-hidden border border-slate-200 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 my-0 sm:my-4 flex flex-col">
          
          {/* Header Fixo */}
          <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-slate-200 bg-slate-50 z-10">
            <div className="flex items-center space-x-2 min-w-0">
              <Edit3 className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                  Editar Lançamento: <span className="font-mono text-amber-600">{title.titleNumber}</span>
                </h2>
                <p className="text-[11px] text-slate-700 truncate">
                  Duplo clique ativado • {isReceber ? 'Conta a Receber' : 'Conta a Pagar'}
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="shrink-0 mx-4 sm:mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {hasSettlements && (
            <div className="shrink-0 mx-4 sm:mx-6 mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
              ⚠️ Este lançamento possui baixas parciais ({formatBRL(title.settledPrincipal)} baixados de {formatBRL(title.originalAmount)}). O valor original não pode ser reduzido abaixo do total já baixado.
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs pb-28 sm:pb-6 scroll-smooth [scroll-padding-bottom:7rem]">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      {isReceber ? 'Cliente *' : 'Fornecedor ou Cliente *'}
                    </label>
                    {!isReceber && (
                      <div className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setCounterpartyFilter('TODOS')}
                          className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                            counterpartyFilter === 'TODOS' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-2xs font-semibold' : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setCounterpartyFilter('FORNECEDORES')}
                          className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                            counterpartyFilter === 'FORNECEDORES' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-2xs font-semibold' : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Forn.
                        </button>
                        <button
                          type="button"
                          onClick={() => setCounterpartyFilter('CLIENTES')}
                          className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                            counterpartyFilter === 'CLIENTES' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-2xs font-semibold' : 'text-slate-600 dark:text-slate-400'
                          }`}
                          title="Permite selecionar clientes cadastrados dos quais você comprou"
                        >
                          Clientes
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {counterpartyId && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualCounterpartyId(counterpartyId);
                          setIsManualCounterpartyModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
                        title="Editar cadastro completo desta contraparte"
                      >
                        <Edit2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>Editar Cadastro</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setManualCounterpartyId('NEW');
                        setIsManualCounterpartyModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                      title={isReceber ? 'Cadastrar novo cliente' : 'Cadastrar novo fornecedor ou cliente'}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isReceber ? 'Novo Cliente' : 'Novo Favorecido'}</span>
                    </button>
                  </div>
                </div>
                <SearchableSelect
                  options={counterpartyOptions}
                  value={counterpartyId}
                  onChange={setCounterpartyId}
                  placeholder="Pesquise ou cadastre..."
                  searchPlaceholder="Digite o nome..."
                  allowQuickCreate={true}
                  quickCreateLabel={(q) => `+ Cadastrar rápido "${q}"`}
                  onQuickCreate={handleQuickCreateCounterparty}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Valor Original (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    value={originalAmount || ''}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    onChange={(e) => setOriginalAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#131720] pl-9 pr-3 py-2 font-bold text-slate-900 dark:text-amber-400 text-sm sm:text-xs focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Descrição do Título *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <label className="block font-medium text-slate-700">
                    {isReceber ? 'Classificação de Receitas (Plano de Contas) *' : 'Classificação de Custos & Despesas (Plano de Contas) *'}
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isReceber 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {isReceber ? 'Apenas Receitas' : 'Apenas Custos & Despesas'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickAccountModalOpen(true)}
                  className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                >
                  <FolderPlus className="w-3 h-3 text-amber-500" />
                  <span>+ Criar Categoria / Subcategoria</span>
                </button>
              </div>
              <SearchableSelect
                options={chartAccountOptions}
                value={accountId}
                onChange={setAccountId}
                placeholder={isReceber ? "Selecione a conta analítica de receitas..." : "Selecione a conta analítica de custos ou despesas..."}
                searchPlaceholder="Buscar por código ou descrição..."
                required
              />
            </div>

            {/* Datas */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-600 text-[11px] mb-1 font-medium">
                  Competência *
                </label>
                <input
                  type="month"
                  value={competence}
                  onChange={(e) => setCompetence(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[11px] mb-1 font-medium">
                  Vencimento *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    setExpectedCashDate(e.target.value);
                  }}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Conta Bancária Prevista
                </label>
                <SearchableSelect
                  options={bankAccountOptions}
                  value={expectedBankAccountId}
                  onChange={setExpectedBankAccountId}
                  placeholder="Selecione o banco..."
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Linha Digitável / Código de Barras do Boleto
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Ex: 34191.79001 01043.510047 91020.150008 5 98450000185000"
                  className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* SEÇÃO DE BAIXA / LIQUIDAÇÃO IMEDIATA (se o título ainda possuir saldo a quitar) */}
            {title.balancePrincipal > 0 && (
              <div className={`p-3.5 rounded-xl border transition-all ${
                isAlreadySettled
                  ? (isReceber ? 'bg-emerald-50/60 border-emerald-300 shadow-xs' : 'bg-rose-50/60 border-rose-300 shadow-xs')
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAlreadySettled}
                      onChange={(e) => {
                        setIsAlreadySettled(e.target.checked);
                        if (e.target.checked && !settlementBankAccountId && bankAccounts.length > 0) {
                          setSettlementBankAccountId(bankAccounts[0].id);
                        }
                      }}
                      className={`w-4 h-4 rounded border-slate-300 ${
                        isReceber ? 'text-emerald-600 focus:ring-emerald-500' : 'text-rose-600 focus:ring-rose-500'
                      }`}
                    />
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Wallet className={`w-4 h-4 ${isReceber ? 'text-emerald-600' : 'text-rose-600'}`} />
                      {isReceber
                        ? `Marcar como já recebido agora? (Saldo de ${formatBRL(title.balancePrincipal)})`
                        : `Marcar como já pago agora? (Saldo de ${formatBRL(title.balancePrincipal)})`}
                    </span>
                  </label>

                  {isAlreadySettled && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      isReceber ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}>
                      {isReceber ? '✓ Receber Agora' : '✓ Pagar Agora'}
                    </span>
                  )}
                </div>

                {isAlreadySettled && (
                  <div className="mt-3 pt-3 border-t border-slate-200/90 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-slate-700 text-[11px] font-semibold mb-1">
                          {isReceber ? 'Data do Recebimento *' : 'Data do Pagamento *'}
                        </label>
                        <input
                          type="date"
                          max={today}
                          value={settlementDate}
                          onChange={(e) => setSettlementDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white font-medium"
                          required={isAlreadySettled}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 text-[11px] font-semibold mb-1">
                          {isReceber ? 'Conta de Crédito *' : 'Conta de Débito *'}
                        </label>
                        <select
                          value={settlementBankAccountId}
                          onChange={(e) => setSettlementBankAccountId(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white font-medium"
                          required={isAlreadySettled}
                        >
                          <option value="">Selecione a conta...</option>
                          {bankAccounts.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.institution})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 text-[11px] font-semibold mb-1">
                          Forma de Pagamento
                        </label>
                        <select
                          value={settlementPaymentMethod}
                          onChange={(e) => setSettlementPaymentMethod(e.target.value as any)}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white font-medium"
                        >
                          <option value="PIX">PIX</option>
                          <option value="BOLETO">Boleto Bancário</option>
                          <option value="TRANSFERENCIA">Transferência</option>
                          <option value="CARTAO_DEBITO">Cartão de Débito</option>
                          <option value="DINHEIRO">Dinheiro em Espécie</option>
                          <option value="DEBITO_AUTOMATICO">Débito Automático</option>
                          <option value="OUTROS">Outros</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div>
                        <label className="block text-slate-600 text-[10px] font-medium mb-1">
                          Desconto (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={settlementDiscount || ''}
                          onChange={(e) => setSettlementDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="0,00"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 text-[10px] font-medium mb-1">
                          Juros / Multa (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={settlementInterest || ''}
                          onChange={(e) => setSettlementInterest(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="0,00"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                        />
                      </div>

                      {isReceber && (
                        <div>
                          <label className="block text-slate-600 text-[10px] font-medium mb-1">
                            Tarifa Retida (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={settlementBankFee || ''}
                            onChange={(e) => setSettlementBankFee(Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0,00"
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-slate-600 text-[10px] font-medium mb-1">
                          Nº Comprovante
                        </label>
                        <input
                          type="text"
                          value={settlementVoucherRef}
                          onChange={(e) => setSettlementVoucherRef(e.target.value)}
                          placeholder="Doc / Comprovante"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium">
                      <span className="text-slate-600">Líquido a movimentar na conta:</span>
                      <span className={`font-bold ${isReceber ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatBRL(
                          Math.max(
                            0,
                            (originalAmount - title.settledPrincipal) 
                            - settlementDiscount 
                            + settlementInterest 
                            - (isReceber ? settlementBankFee : 0)
                          )
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {quickCreatedId && (
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="completeAfterEdit"
                  checked={openCompleteAfterSave}
                  onChange={(e) => setOpenCompleteAfterSave(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="completeAfterEdit" className="text-slate-700 cursor-pointer text-xs">
                  Abrir modal para completar cadastro de cliente/fornecedor após salvar
                </label>
              </div>
            )}

            </div>

            {/* Footer Fixo */}
            <div className="shrink-0 sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3 sm:p-4 z-10 flex items-center justify-end gap-3 shadow-lg">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 sm:px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-colors flex items-center justify-center cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5 shrink-0" />
                <span>Salvar Alterações</span>
              </button>
            </div>

          </form>

        </div>
      </div>

      {openCompleteModal && quickCreatedId && (
        <CompleteCounterpartyModal
          isOpen={true}
          counterpartyId={quickCreatedId}
          onClose={() => {
            setOpenCompleteModal(false);
            onSaved();
            onClose();
          }}
          onSaved={() => {
            setOpenCompleteModal(false);
            onSaved();
            onClose();
          }}
        />
      )}

      {isQuickAccountModalOpen && (
        <QuickCreateAccountModal
          isOpen={true}
          titleType={title.type}
          onClose={() => setIsQuickAccountModalOpen(false)}
          onAccountCreated={handleAccountCreated}
        />
      )}

      {/* Modal Manual de Criação / Edição de Favorecido */}
      <CompleteCounterpartyModal
        isOpen={isManualCounterpartyModalOpen}
        counterpartyId={manualCounterpartyId}
        defaultType={isReceber ? 'CLIENTE' : 'FORNECEDOR'}
        onClose={() => {
          setIsManualCounterpartyModalOpen(false);
          setManualCounterpartyId(null);
        }}
        onSaved={(savedParty) => {
          setCounterpartyRefreshTrigger(prev => prev + 1);
          if (manualCounterpartyId === 'NEW') {
            setCounterpartyId(savedParty.id);
          }
        }}
      />

      {/* Modal de Confirmação para Atualização em Lote de Recorrências e Parcelamentos */}
      {seriesModalState.isOpen && seriesModalState.seriesInfo && (
        <SeriesUpdateConfirmationModal
          isOpen={seriesModalState.isOpen}
          targetTitle={title}
          newAmount={seriesModalState.pendingAmount}
          seriesInfo={seriesModalState.seriesInfo}
          onConfirm={handleConfirmSeriesChoice}
          onCancel={handleCancelSeriesChoice}
        />
      )}
    </>
  );
};
