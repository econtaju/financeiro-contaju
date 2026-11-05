import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  ShoppingBag, 
  CreditCard as CardIcon, 
  Calendar, 
  Calculator, 
  Split, 
  Building2, 
  Layers, 
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Repeat,
  ArrowRight,
  Search,
  HelpCircle,
  Check
} from 'lucide-react';
import { CreditCard, Counterparty, ChartAccount, CreditCardPurchase, CreditCardInstallment } from '../../types';
import { storage } from '../../services/storageService';
import { formatBRL, formatDateBR } from '../../services/financialEngine';
import { getDaysInMonth } from '../../utils/dateUtils';

interface CreditCardPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CreditCard[];
  counterparties: Counterparty[];
  chartAccounts: ChartAccount[];
  initialCardId?: string;
  initialTransactionType?: 'DESPESA' | 'ESTORNO' | 'CASHBACK';
  editingPurchase?: CreditCardPurchase | null;
  onSuccess: () => void;
}

export const CreditCardPurchaseModal: React.FC<CreditCardPurchaseModalProps> = ({
  isOpen,
  onClose,
  cards,
  counterparties,
  chartAccounts,
  initialCardId,
  initialTransactionType = 'DESPESA',
  editingPurchase,
  onSuccess
}) => {
  const [transactionType, setTransactionType] = useState<'DESPESA' | 'ESTORNO' | 'CASHBACK'>(initialTransactionType);
  const [cardId, setCardId] = useState(initialCardId || cards[0]?.id || '');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [customCounterpartyName, setCustomCounterpartyName] = useState('');
  const [chartAccountId, setChartAccountId] = useState('acc-desp-1');
  const [categorySearch, setCategorySearch] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);

  // Recorrência e Repetição para Próximos Meses
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrenceMode, setRecurrenceMode] = useState<'MONTHS_COUNT' | 'UNTIL_MONTH' | 'TOTAL_DIVIDED'>('MONTHS_COUNT');
  const [extraMonths, setExtraMonths] = useState<number>(5); // padrão: fatura atual + 5 meses = 6 faturas
  const [untilMonthInput, setUntilMonthInput] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Calculation mode: TOTAL_DIVIDED or INSTALLMENT_VALUE
  const [calculationMode, setCalculationMode] = useState<'TOTAL_DIVIDED' | 'INSTALLMENT_VALUE'>('TOTAL_DIVIDED');
  const [totalAmountInput, setTotalAmountInput] = useState<string>('');
  const [installmentValueInput, setInstallmentValueInput] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingPurchase) {
      setCardId(editingPurchase.cardId);
      setTransactionType(editingPurchase.transactionType || 'DESPESA');
      setPurchaseDate(editingPurchase.purchaseDate);
      setDescription(editingPurchase.description);
      setCounterpartyId(editingPurchase.counterpartyId || '');
      setCustomCounterpartyName(editingPurchase.counterpartyName || '');
      setChartAccountId(editingPurchase.chartAccountId || 'acc-desp-1');
      const count = editingPurchase.installmentsCount || 1;
      setInstallmentsCount(count);
      const isRec = count > 1;
      setIsRecurring(isRec);
      if (editingPurchase.calculationMode === 'TOTAL_DIVIDED') {
        setRecurrenceMode('TOTAL_DIVIDED');
      } else {
        setRecurrenceMode('MONTHS_COUNT');
        setExtraMonths(Math.max(1, count - 1));
      }
      setCalculationMode(editingPurchase.calculationMode || 'TOTAL_DIVIDED');
      setTotalAmountInput(String(editingPurchase.totalAmount));
      const perVal = editingPurchase.installmentValue || (count > 1 ? Math.round((editingPurchase.totalAmount / count) * 100) / 100 : editingPurchase.totalAmount);
      setInstallmentValueInput(String(perVal));
      if (editingPurchase.installments && editingPurchase.installments.length > 0) {
        const last = editingPurchase.installments[editingPurchase.installments.length - 1];
        if (last?.invoiceMonth) {
          setUntilMonthInput(last.invoiceMonth);
        }
      }
      setNotes(editingPurchase.notes || '');
      setError(null);
    } else {
      setCardId(initialCardId || cards[0]?.id || '');
      setTransactionType(initialTransactionType || 'DESPESA');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setCounterpartyId('');
      setCustomCounterpartyName('');
      setChartAccountId('acc-desp-1');
      setInstallmentsCount(1);
      setIsRecurring(false);
      setRecurrenceMode('MONTHS_COUNT');
      setExtraMonths(5);
      setCalculationMode('TOTAL_DIVIDED');
      setTotalAmountInput('');
      setInstallmentValueInput('');
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      setUntilMonthInput(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      setNotes('');
      setError(null);
    }
  }, [editingPurchase, initialCardId, initialTransactionType, isOpen, cards]);

  const selectedCard = useMemo(() => {
    return cards.find(c => c.id === cardId) || cards[0];
  }, [cards, cardId]);

  // Mês da fatura inicial (se for edição, mantém a fatura original; se for novo, calcula a partir do fechamento)
  const baseInvoiceMonth = useMemo(() => {
    if (editingPurchase?.invoiceMonth) return editingPurchase.invoiceMonth;
    if (!selectedCard || !purchaseDate) return new Date().toISOString().slice(0, 7);

    const pDate = new Date(purchaseDate + 'T12:00:00');
    const pDay = pDate.getDate();
    let pMonth = pDate.getMonth() + 1; // 1-12
    let pYear = pDate.getFullYear();

    // Se a compra foi feita no dia de fechamento ou após, entra na próxima fatura
    if (pDay >= selectedCard.closingDay) {
      pMonth += 1;
      if (pMonth > 12) {
        pMonth = 1;
        pYear += 1;
      }
    }
    return `${pYear}-${String(pMonth).padStart(2, '0')}`;
  }, [editingPurchase, selectedCard, purchaseDate]);

  // Quantidade total de parcelas e valores calculados
  const { effectiveCount, finalTotalAmount, finalInstallmentValue } = useMemo(() => {
    let count = 1;
    if (isRecurring) {
      if (recurrenceMode === 'MONTHS_COUNT') {
        count = 1 + Math.max(1, Number(extraMonths) || 1);
      } else if (recurrenceMode === 'UNTIL_MONTH') {
        const [baseY, baseM] = baseInvoiceMonth.split('-').map(Number);
        const [endY, endM] = (untilMonthInput || baseInvoiceMonth).split('-').map(Number);
        const diffMonths = (endY - baseY) * 12 + (endM - baseM);
        count = Math.max(1, diffMonths + 1);
      } else {
        count = Math.max(1, Number(installmentsCount) || 1);
      }
    }

    if (!isRecurring) {
      const total = Math.max(0, parseFloat(totalAmountInput || installmentValueInput) || 0);
      return { effectiveCount: 1, finalTotalAmount: total, finalInstallmentValue: total };
    }

    if (recurrenceMode === 'TOTAL_DIVIDED') {
      const total = Math.max(0, parseFloat(totalAmountInput) || 0);
      const perInstallment = total > 0 ? Math.round((total / count) * 100) / 100 : 0;
      return { effectiveCount: count, finalTotalAmount: total, finalInstallmentValue: perInstallment };
    } else {
      // Recorrência por repetição mensal: valor da parcela se repete em cada fatura
      const perInstallment = Math.max(0, parseFloat(installmentValueInput || totalAmountInput) || 0);
      const total = Math.round(perInstallment * count * 100) / 100;
      return { effectiveCount: count, finalTotalAmount: total, finalInstallmentValue: perInstallment };
    }
  }, [isRecurring, recurrenceMode, extraMonths, untilMonthInput, baseInvoiceMonth, installmentsCount, totalAmountInput, installmentValueInput]);

  // Cronograma detalhado de prévia de vencimentos em cada fatura
  const previewInstallments = useMemo<CreditCardInstallment[]>(() => {
    if (!selectedCard || finalTotalAmount <= 0 || effectiveCount <= 0) return [];

    const result: CreditCardInstallment[] = [];
    const [baseY, baseM] = baseInvoiceMonth.split('-').map(Number);
    let remainingTotal = finalTotalAmount;

    for (let i = 1; i <= effectiveCount; i++) {
      let instYear = baseY;
      let instMonth = baseM + (i - 1);
      while (instMonth > 12) {
        instMonth -= 12;
        instYear += 1;
      }

      const invoiceMonth = `${instYear}-${String(instMonth).padStart(2, '0')}`;

      // Data de vencimento da fatura correspondente
      let dueYear = instYear;
      let dueMonth = instMonth;
      if (selectedCard.dueDay <= selectedCard.closingDay) {
        dueMonth += 1;
        if (dueMonth > 12) {
          dueMonth = 1;
          dueYear += 1;
        }
      }
      const maxDays = getDaysInMonth(dueYear, dueMonth);
      const actualDueDay = Math.min(selectedCard.dueDay, maxDays);
      const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(actualDueDay).padStart(2, '0')}`;

      let currentInstAmount = finalInstallmentValue;
      if (recurrenceMode === 'TOTAL_DIVIDED') {
        if (i === effectiveCount) {
          currentInstAmount = Math.round(remainingTotal * 100) / 100;
        } else {
          remainingTotal = Math.round((remainingTotal - currentInstAmount) * 100) / 100;
        }
      }

      result.push({
        installmentNumber: i,
        totalInstallments: effectiveCount,
        amount: currentInstAmount,
        competence: invoiceMonth,
        invoiceMonth,
        dueDate,
        settled: false
      });
    }

    return result;
  }, [selectedCard, finalTotalAmount, finalInstallmentValue, effectiveCount, baseInvoiceMonth, recurrenceMode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCard) {
      setError('Selecione um cartão de crédito cadastrado.');
      return;
    }

    if (!description.trim()) {
      setError('Informe uma descrição clara para o lançamento.');
      return;
    }

    if (finalTotalAmount <= 0) {
      setError('O valor do lançamento deve ser maior que zero.');
      return;
    }

    if (!purchaseDate) {
      setError('Selecione a data da transação.');
      return;
    }

    const providerName = customCounterpartyName.trim() || 
      counterparties.find(c => c.id === counterpartyId)?.name || 
      'Despesa Geral Cartão';

    const initialInvoiceMonth = previewInstallments[0]?.invoiceMonth || `${purchaseDate.substring(0, 7)}`;

    const computedCalculationMode = (isRecurring && recurrenceMode === 'TOTAL_DIVIDED') ? 'TOTAL_DIVIDED' : 'PER_INSTALLMENT';

    if (editingPurchase) {
      // Atualizar compra existente com preservação de IDs de parcelas compatíveis
      const updatedPurchase: CreditCardPurchase = {
        ...editingPurchase,
        cardId,
        transactionType,
        purchaseDate,
        description: description.trim(),
        counterpartyId: counterpartyId || undefined,
        counterpartyName: providerName,
        chartAccountId,
        totalAmount: finalTotalAmount,
        installmentsCount: effectiveCount,
        calculationMode: computedCalculationMode,
        installmentValue: finalInstallmentValue,
        invoiceMonth: initialInvoiceMonth,
        installments: previewInstallments,
        notes: notes.trim()
      };

      storage.updateCardPurchaseAndSyncTitles(updatedPurchase);

      // Log de Auditoria
      const currentUser = storage.getCurrentUser();
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'EDICAO_COMPRA_CARTAO',
        module: 'Cartões de Crédito',
        recordId: updatedPurchase.id,
        details: `Atualizado ${transactionType} no cartão ${selectedCard.name}: ${updatedPurchase.description} no valor de ${formatBRL(finalTotalAmount)}. Sincronizado no Contas a Pagar.`
      });
    } else {
      // Nova Compra / Estorno
      const newPurchase: CreditCardPurchase = {
        id: `cp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        cardId,
        transactionType,
        purchaseDate,
        description: description.trim(),
        counterpartyId: counterpartyId || undefined,
        counterpartyName: providerName,
        chartAccountId,
        totalAmount: finalTotalAmount,
        installmentsCount: effectiveCount,
        calculationMode: computedCalculationMode,
        installmentValue: finalInstallmentValue,
        invoiceMonth: initialInvoiceMonth,
        installments: previewInstallments,
        notes: notes.trim(),
        createdAt: new Date().toISOString()
      };

      // Save purchase AND synchronize with FinancialTitle (Contas a Pagar)
      storage.addCardPurchaseAndSyncTitles(newPurchase);

      // Audit log
      const currentUser = storage.getCurrentUser();
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: transactionType === 'DESPESA' ? 'LANCAMENTO_COMPRA_CARTAO' : 'LANCAMENTO_ESTORNO_CARTAO',
        module: 'Cartões de Crédito',
        recordId: newPurchase.id,
        details: `Lançado ${transactionType} no cartão ${selectedCard.name}: ${newPurchase.description} no valor de ${formatBRL(finalTotalAmount)}. Sincronizado no Contas a Pagar.`
      });
    }

    onSuccess();
    onClose();
  };

  const isCreditType = transactionType !== 'DESPESA';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white dark:bg-[#131720] border border-slate-200 dark:border-[#273040] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D]/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              isCreditType
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
            }`}>
              {transactionType === 'ESTORNO' ? (
                <RotateCcw className="w-5 h-5" />
              ) : transactionType === 'CASHBACK' ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingPurchase ? 'Editar Lançamento no Cartão' : isCreditType ? 'Novo Estorno / Crédito no Cartão' : 'Nova Compra no Cartão de Crédito'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isCreditType
                  ? 'Abate o total da fatura selecionada e recompõe o limite do cartão.'
                  : 'Lançamento parcelado ou à vista com integração direta no Contas a Pagar.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Seletor de Tipo de Transação */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setTransactionType('DESPESA')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                transactionType === 'DESPESA'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Compra / Despesa
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('ESTORNO')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                transactionType === 'ESTORNO'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Estorno / Devolução
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('CASHBACK')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                transactionType === 'CASHBACK'
                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Cashback / Recompensa
            </button>
          </div>

          {isCreditType && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>{transactionType === 'CASHBACK' ? 'Cashback:' : 'Estorno / Devolução:'}</strong> Este lançamento entrará como crédito líquido na fatura, diminuindo o valor a pagar e liberando o limite disponível do cartão.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Cartão */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cartão de Crédito Utilizado *
              </label>
              <select
                required
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                style={{ colorScheme: 'light dark' }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 cursor-pointer text-xs"
              >
                {cards.map(card => (
                  <option 
                    key={card.id} 
                    value={card.id}
                    className="bg-white text-slate-900 dark:bg-[#131720] dark:text-white"
                  >
                    {card.name} ({card.institution} • Final {card.lastFourDigits || '••••'}) — Fecha dia {card.closingDay} / Vence dia {card.dueDay}
                  </option>
                ))}
              </select>
            </div>

            {/* Data da Compra */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data da Compra *
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                style={{ colorScheme: 'light dark' }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-xs"
              />
              {selectedCard && (
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Fechamento do cartão: dia {selectedCard.closingDay}
                </span>
              )}
            </div>

            {/* Categoria do Plano de Contas */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Categoria / Plano de Contas *
                </label>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  Integração DRE & Pagar
                </span>
              </div>

              {/* Filtro de categorias para busca rápida com alto contraste */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Pesquisar categoria por código ou nome..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#1B212D] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>

              <select
                value={chartAccountId}
                onChange={(e) => setChartAccountId(e.target.value)}
                style={{ colorScheme: 'light dark' }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#1B212D] text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 cursor-pointer text-xs shadow-2xs"
              >
                {chartAccounts
                  .filter(a => (transactionType === 'DESPESA' ? a.type === 'DESPESA' : true) && a.acceptsLaunches)
                  .filter(a => {
                    if (!categorySearch.trim()) return true;
                    const q = categorySearch.toLowerCase();
                    return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
                  })
                  .map(a => (
                    <option 
                      key={a.id} 
                      value={a.id}
                      className="bg-white text-slate-900 dark:bg-[#131720] dark:text-white py-1"
                    >
                      {a.code} - {a.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Descrição da Compra / Despesa *
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Assinatura de Software, Material de Escritório, Passagens..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-xs"
              />
            </div>

            {/* Fornecedor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fornecedor Cadastrado
              </label>
              <select
                value={counterpartyId}
                onChange={(e) => setCounterpartyId(e.target.value)}
                style={{ colorScheme: 'light dark' }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 cursor-pointer text-xs"
              >
                <option value="" className="bg-white text-slate-900 dark:bg-[#131720] dark:text-white">
                  Selecione ou digite ao lado...
                </option>
                {counterparties.map(c => (
                  <option 
                    key={c.id} 
                    value={c.id}
                    className="bg-white text-slate-900 dark:bg-[#131720] dark:text-white"
                  >
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Ou Nome do Estabelecimento */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ou Estabelecimento / Nome Avulso
              </label>
              <input
                type="text"
                value={customCounterpartyName}
                onChange={(e) => setCustomCounterpartyName(e.target.value)}
                placeholder="Ex: Amazon AWS, Posto Shell, Kalunga..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-xs"
              />
            </div>

            {/* Bloco de Recorrência e Parcelamento para Próximos Meses */}
            <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 shrink-0">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Recorrência & Parcelamento nas Próximas Faturas
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Adiantar pagamentos para os próximos meses e sincronizar automaticamente no Contas a Pagar
                    </span>
                  </div>
                </div>

                {/* Toggle de Ativação de Recorrência */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none self-end sm:self-auto bg-white dark:bg-[#1B212D] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Ativar próximos pagamentos
                  </span>
                  <div className="relative inline-flex items-center">
                    <input 
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIsRecurring(val);
                        if (val && recurrenceMode === 'MONTHS_COUNT' && extraMonths < 1) {
                          setExtraMonths(5);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </div>
                </label>
              </div>

              {/* Se a recorrência estiver desativada (lançamento único) */}
              {!isRecurring ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Valor deste Lançamento (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      style={{ colorScheme: 'light dark' }}
                      value={totalAmountInput}
                      onChange={(e) => {
                        setTotalAmountInput(e.target.value);
                        setInstallmentValueInput(e.target.value);
                      }}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-xs shadow-2xs"
                    />
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                    Entrará como lançamento único na fatura de <strong>{baseInvoiceMonth}</strong> e gerará 1 título no Contas a Pagar.
                  </div>
                </div>
              ) : (
                /* Se a recorrência estiver ativada */
                <div className="space-y-3.5">
                  {/* Seletor de Modalidade de Recorrência */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setRecurrenceMode('MONTHS_COUNT')}
                      className={`py-1.5 px-2.5 rounded-lg font-medium transition-all cursor-pointer text-center ${
                        recurrenceMode === 'MONTHS_COUNT'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Repetir por Próximos Meses
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecurrenceMode('UNTIL_MONTH')}
                      className={`py-1.5 px-2.5 rounded-lg font-medium transition-all cursor-pointer text-center ${
                        recurrenceMode === 'UNTIL_MONTH'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Repetir Até Fatura Final
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecurrenceMode('TOTAL_DIVIDED')}
                      className={`py-1.5 px-2.5 rounded-lg font-medium transition-all cursor-pointer text-center ${
                        recurrenceMode === 'TOTAL_DIVIDED'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Dividir Total em Parcelas
                    </button>
                  </div>

                  {/* Campos específicos por modalidade */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    {recurrenceMode === 'MONTHS_COUNT' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Repetir por mais quantos meses? *
                          </label>
                          <select
                            value={extraMonths}
                            onChange={(e) => setExtraMonths(parseInt(e.target.value, 10) || 1)}
                            style={{ colorScheme: 'light dark' }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 cursor-pointer text-xs shadow-2xs"
                          >
                            <option value="1">Mais +1 mês (2 faturas)</option>
                            <option value="2">Mais +2 meses (3 faturas)</option>
                            <option value="3">Mais +3 meses (4 faturas)</option>
                            <option value="5">Mais +5 meses (6 faturas / Semestral)</option>
                            <option value="11">Mais +11 meses (12 faturas / Anual)</option>
                            <option value="23">Mais +23 meses (24 faturas / 2 Anos)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Valor Mensal de Cada Fatura (R$) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            style={{ colorScheme: 'light dark' }}
                            value={installmentValueInput || totalAmountInput}
                            onChange={(e) => {
                              setInstallmentValueInput(e.target.value);
                              setTotalAmountInput(e.target.value);
                            }}
                            placeholder="0.00"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-xs shadow-2xs"
                          />
                        </div>
                      </>
                    )}

                    {recurrenceMode === 'UNTIL_MONTH' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Repetir até qual fatura (Mês/Ano)? *
                          </label>
                          <input
                            type="month"
                            required
                            value={untilMonthInput}
                            onChange={(e) => setUntilMonthInput(e.target.value)}
                            min={baseInvoiceMonth}
                            style={{ colorScheme: 'light dark' }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-xs shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Valor Mensal de Cada Fatura (R$) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            style={{ colorScheme: 'light dark' }}
                            value={installmentValueInput || totalAmountInput}
                            onChange={(e) => {
                              setInstallmentValueInput(e.target.value);
                              setTotalAmountInput(e.target.value);
                            }}
                            placeholder="0.00"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-xs shadow-2xs"
                          />
                        </div>
                      </>
                    )}

                    {recurrenceMode === 'TOTAL_DIVIDED' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Número Total de Parcelas *
                          </label>
                          <select
                            value={installmentsCount}
                            onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10) || 1)}
                            style={{ colorScheme: 'light dark' }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 cursor-pointer text-xs shadow-2xs"
                          >
                            {Array.from({ length: 23 }, (_, i) => i + 2).map(n => (
                              <option key={n} value={n} className="bg-white text-slate-900 dark:bg-[#131720] dark:text-white">
                                {n}x parcelas
                              </option>
                            ))}
                            <option value="36">36x parcelas</option>
                            <option value="48">48x parcelas</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Valor Total da Compra (R$) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            style={{ colorScheme: 'light dark' }}
                            value={totalAmountInput}
                            onChange={(e) => setTotalAmountInput(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-xs shadow-2xs"
                          />
                        </div>
                      </>
                    )}

                    {/* Card de Resumo de Cálculo */}
                    <div className="p-2.5 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-center shadow-2xs">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {recurrenceMode === 'TOTAL_DIVIDED' ? 'Valor por fatura calculado:' : 'Total acumulado previsto:'}
                      </span>
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {recurrenceMode === 'TOTAL_DIVIDED'
                          ? `${effectiveCount}x de ${formatBRL(finalInstallmentValue)}`
                          : `Total de ${formatBRL(finalTotalAmount)}`}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        ({effectiveCount} {effectiveCount === 1 ? 'mês/fatura' : 'meses/faturas'})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pré-visualização das parcelas e cronograma de vencimentos */}
            {previewInstallments.length > 0 && (
              <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950/40 shadow-xs">
                <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Prévia do Cronograma de Vencimentos nas Faturas
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {previewInstallments.length} {previewInstallments.length === 1 ? 'fatura' : 'faturas'} • Integradas com o Contas a Pagar
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Total Acumulado</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold font-mono text-sm">
                      {formatBRL(finalTotalAmount)}
                    </span>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/60 text-xs">
                  {previewInstallments.map((inst, idx) => (
                    <div 
                      key={inst.installmentNumber} 
                      className={`px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors ${
                        idx === 0 ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg text-[11px] font-mono flex items-center justify-center font-bold shrink-0 ${
                          idx === 0 
                            ? 'bg-amber-500 text-slate-950' 
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {inst.installmentNumber}/{inst.totalInstallments}
                        </span>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Fatura {inst.invoiceMonth}
                            </span>
                            {idx === 0 ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                Fatura Atual
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                Contas a Pagar
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Vencimento real: <strong className="text-slate-700 dark:text-slate-300">{formatDateBR(inst.dueDate)}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-[10px] text-slate-500 max-w-[160px] truncate hidden md:inline">
                          {chartAccounts.find(a => a.id === chartAccountId)?.name || 'Despesa'}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatBRL(inst.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Observações
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalhes adicionais sobre a compra ou projeto correspondente..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-[#273040] flex items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              Sincroniza automaticamente com o relatório de Contas a Pagar
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-[#1B212D] dark:hover:bg-slate-800 border border-slate-200 dark:border-[#273040] rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-5 py-2 text-xs font-bold text-slate-950 rounded-xl shadow-md transition-all cursor-pointer ${
                  isCreditType
                    ? 'bg-emerald-500 hover:bg-emerald-400'
                    : 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:brightness-105'
                }`}
              >
                {editingPurchase ? 'Salvar Alterações' : isCreditType ? 'Confirmar Estorno / Crédito' : 'Confirmar Compra'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
