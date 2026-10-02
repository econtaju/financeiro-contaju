import React, { useState, useEffect, useMemo } from 'react';
import { X, Edit3, AlertCircle, CheckCircle2, FolderPlus, Wallet } from 'lucide-react';
import { FinancialTitle, Counterparty, ChartAccount } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, getFilteredChartAccounts } from '../../services/financialEngine';
import { SearchableSelect, SelectOption } from '../Common/SearchableSelect';
import { CompleteCounterpartyModal } from './CompleteCounterpartyModal';
import { QuickCreateAccountModal } from './QuickCreateAccountModal';

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

  if (!isOpen || !title) return null;

  const isReceber = title.type === 'RECEBER';
  const hasSettlements = title.settledPrincipal > 0;

  const allCounterparties = storage.getCounterparties();
  const counterparties = allCounterparties.filter(c => {
    if (isReceber) return c.type === 'CLIENTE' || c.type === 'AMBOS';
    if (counterpartyFilter === 'FORNECEDORES') return c.type === 'FORNECEDOR' || c.type === 'AMBOS';
    if (counterpartyFilter === 'CLIENTES') return c.type === 'CLIENTE' || c.type === 'AMBOS';
    return true; // TODOS
  });
  const bankAccounts = storage.getBankAccounts().filter(a => a.status === 'ATIVO');

  const counterpartyOptions: SelectOption[] = counterparties.map(c => {
    let typeBadge = '';
    if (c.type === 'CLIENTE') typeBadge = 'Cliente';
    else if (c.type === 'FORNECEDOR') typeBadge = 'Fornecedor';
    else if (c.type === 'AMBOS') typeBadge = 'Cliente & Forn.';

    return {
      value: c.id,
      label: c.name,
      sublabel: c.document ? `Doc: ${c.document}` : (c.tradeName || undefined),
      badge: c.status === 'ATIVO' ? typeBadge : 'Inativo'
    };
  });

  const chartAccountOptions: SelectOption[] = chartAccounts.map(a => ({
    value: a.id,
    label: `${a.code} - ${a.name}`,
    sublabel: a.nature ? `Natureza: ${a.nature}` : undefined
  }));

  const bankAccountOptions: SelectOption[] = [
    { value: '', label: 'Indiferente / Não definida' },
    ...bankAccounts.map(b => ({
      value: b.id,
      label: b.name,
      sublabel: `${b.institution} - Saldo R$ ${FinancialEngine.getAccountBalance(b.id).toFixed(2)}`
    }))
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

    const newBalance = originalAmount - title.settledPrincipal;

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

    storage.updateTitle(title.id, {
      description: description.trim(),
      counterpartyId,
      accountId,
      competence,
      dueDate,
      expectedCashDate: dueDate, // Oculto da interface, leva em conta a data de vencimento
      originalAmount: Number(originalAmount),
      balancePrincipal: newBalance,
      expectedBankAccountId: settlementBankAccountId || expectedBankAccountId || undefined,
      barcode: barcode.trim() || undefined,
      notes
    });

    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EDICAO_TITULO',
      module: isReceber ? 'Contas a Receber' : 'Contas a Pagar',
      recordId: title.id,
      details: `Edição do título ${title.titleNumber} (${description}). Valor: ${formatBRL(originalAmount)}, Vencimento: ${dueDate}.`
    });

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

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
          
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-2">
              <Edit3 className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Editar Lançamento: <span className="font-mono text-amber-600">{title.titleNumber}</span>
                </h2>
                <p className="text-[11px] text-slate-700">
                  Duplo clique ativado • {isReceber ? 'Conta a Receber' : 'Conta a Pagar'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {hasSettlements && (
            <div className="mx-6 mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
              ⚠️ Este lançamento possui baixas parciais ({formatBRL(title.settledPrincipal)} baixados de {formatBRL(title.originalAmount)}). O valor original não pode ser reduzido abaixo do total já baixado.
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700">
                    {isReceber ? 'Cliente *' : 'Fornecedor ou Cliente *'}
                  </label>
                  {!isReceber && (
                    <div className="flex items-center gap-1 text-[10px] bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setCounterpartyFilter('TODOS')}
                        className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                          counterpartyFilter === 'TODOS' ? 'bg-white text-amber-600 shadow-2xs font-semibold' : 'text-slate-600'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setCounterpartyFilter('FORNECEDORES')}
                        className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                          counterpartyFilter === 'FORNECEDORES' ? 'bg-white text-amber-600 shadow-2xs font-semibold' : 'text-slate-600'
                        }`}
                      >
                        Forn.
                      </button>
                      <button
                        type="button"
                        onClick={() => setCounterpartyFilter('CLIENTES')}
                        className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                          counterpartyFilter === 'CLIENTES' ? 'bg-white text-amber-600 shadow-2xs font-semibold' : 'text-slate-600'
                        }`}
                        title="Permite selecionar clientes cadastrados dos quais você comprou"
                      >
                        Clientes
                      </button>
                    </div>
                  )}
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
                    value={originalAmount || ''}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    onChange={(e) => setOriginalAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#131720] pl-9 pr-3 py-2 font-bold text-slate-900 dark:text-amber-400 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none"
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

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-slate-950 font-bold bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm transition-colors flex items-center"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Salvar Alterações
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
    </>
  );
};
