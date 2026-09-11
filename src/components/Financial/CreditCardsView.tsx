import React, { useState, useMemo, useEffect } from 'react';
import { 
  CreditCard as CardIcon, 
  Plus, 
  ShoppingBag, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Receipt, 
  Search, 
  Edit3, 
  Clock, 
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { 
  CreditCard as CreditCardType, 
  CreditCardPurchase, 
  BankAccount, 
  Counterparty, 
  ChartAccount
} from '../../types';
import { FinancialEngine, formatBRL } from '../../services/financialEngine';
import { storage } from '../../services/storageService';
import { CreditCardFormModal } from './CreditCardFormModal';
import { CreditCardPurchaseModal } from './CreditCardPurchaseModal';
import { CreditCardInvoicePaymentModal } from './CreditCardInvoicePaymentModal';

interface CreditCardsViewProps {
  onNavigateToPayables?: () => void;
}

export const CreditCardsView: React.FC<CreditCardsViewProps> = ({ onNavigateToPayables }) => {
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [purchases, setPurchases] = useState<CreditCardPurchase[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [selectedInvoiceMonth, setSelectedInvoiceMonth] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');

  // Modals
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPayInvoiceModalOpen, setIsPayInvoiceModalOpen] = useState(false);

  const loadData = () => {
    const loadedCards = storage.getCreditCards();
    const loadedPurchases = storage.getCardPurchases();
    const loadedBanks = storage.getBankAccounts();
    const loadedCounterparties = storage.getCounterparties();
    const loadedChartAccounts = storage.getChartAccounts();

    setCards(loadedCards);
    setPurchases(loadedPurchases);
    setBankAccounts(loadedBanks);
    setCounterparties(loadedCounterparties);
    setChartAccounts(loadedChartAccounts);

    if (loadedCards.length > 0) {
      if (!selectedCardId || !loadedCards.some(c => c.id === selectedCardId)) {
        setSelectedCardId(loadedCards[0].id);
      }
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const activeCard = useMemo(() => {
    return cards.find(c => c.id === selectedCardId) || cards[0];
  }, [cards, selectedCardId]);

  // Invoices for active card
  const invoices = useMemo(() => {
    if (!activeCard) return [];
    return FinancialEngine.getCardInvoices(activeCard.id);
  }, [activeCard, purchases]);

  // Set default invoice month if not set
  useEffect(() => {
    if (invoices.length > 0) {
      if (!selectedInvoiceMonth || !invoices.some(inv => inv.invoiceMonth === selectedInvoiceMonth)) {
        const preferred = invoices.find(i => i.status !== 'PAGA' && i.totalAmount > 0) || invoices[0];
        setSelectedInvoiceMonth(preferred.invoiceMonth);
      }
    }
  }, [invoices, selectedInvoiceMonth]);

  const activeInvoice = useMemo(() => {
    return invoices.find(i => i.invoiceMonth === selectedInvoiceMonth) || invoices[0];
  }, [invoices, selectedInvoiceMonth]);

  // Purchases / Installments for active invoice
  const currentInvoiceItems = useMemo(() => {
    if (!activeCard || !selectedInvoiceMonth) return [];

    const items: Array<{
      purchaseId: string;
      purchaseDate: string;
      description: string;
      counterpartyName: string;
      chartAccountName: string;
      installmentNumber: number;
      totalInstallments: number;
      amount: number;
      dueDate: string;
      settled: boolean;
    }> = [];

    const cardPurchases = purchases.filter(p => p.cardId === activeCard.id);

    for (const pur of cardPurchases) {
      const chartAcc = chartAccounts.find(a => a.id === pur.chartAccountId);
      for (const inst of pur.installments) {
        if (inst.invoiceMonth === selectedInvoiceMonth) {
          items.push({
            purchaseId: pur.id,
            purchaseDate: pur.purchaseDate,
            description: pur.description,
            counterpartyName: pur.counterpartyName || 'Fornecedor',
            chartAccountName: chartAcc ? `${chartAcc.code} - ${chartAcc.name}` : 'Despesas Gerais',
            installmentNumber: inst.installmentNumber,
            totalInstallments: inst.totalInstallments,
            amount: inst.amount,
            dueDate: inst.dueDate,
            settled: inst.settled
          });
        }
      }
    }

    if (!searchFilter.trim()) return items;

    const term = searchFilter.toLowerCase();
    return items.filter(it => 
      it.description.toLowerCase().includes(term) ||
      it.counterpartyName.toLowerCase().includes(term) ||
      it.chartAccountName.toLowerCase().includes(term)
    );
  }, [activeCard, purchases, selectedInvoiceMonth, chartAccounts, searchFilter]);

  // Invoice payment records
  const invoicePayments = useMemo(() => {
    if (!activeCard) return [];
    return storage.getCardInvoicePayments()
      .filter(p => p.cardId === activeCard.id)
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }, [activeCard]);

  const handleOpenNewCard = () => {
    setEditingCard(null);
    setIsCardModalOpen(true);
  };

  const handleEditCard = (card: CreditCardType) => {
    setEditingCard(card);
    setIsCardModalOpen(true);
  };

  const handleOpenNewPurchase = () => {
    setIsPurchaseModalOpen(true);
  };

  const handleOpenPayInvoice = () => {
    if (activeInvoice) {
      setIsPayInvoiceModalOpen(true);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header com identidade Leão Dourado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131720] p-5 rounded-2xl border border-slate-200 dark:border-[#273040] shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black border border-amber-500/50 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <CardIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Cartões de Crédito Corporativos
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {cards.length} {cards.length === 1 ? 'cartão' : 'cartões'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Gestão de compras à vista ou parceladas, faturas mensais e integração direta com o Contas a Pagar.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateToPayables && (
            <button
              id="btn-nav-payables"
              onClick={onNavigateToPayables}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#1B212D] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-300 dark:border-[#273040] transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Ver no Contas a Pagar
            </button>
          )}

          <button
            id="btn-new-card"
            onClick={handleOpenNewCard}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1B212D] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-300 dark:border-[#273040] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-amber-500" />
            Novo Cartão
          </button>

          <button
            id="btn-new-purchase"
            disabled={cards.length === 0}
            onClick={handleOpenNewPurchase}
            className="px-4 py-2 text-xs font-bold text-black bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:brightness-105 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-4 h-4 text-black stroke-[2.2]" />
            Lançar Compra no Cartão
          </button>
        </div>
      </div>

      {/* Cards Selector Bar (Visual Cards Carousel) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => {
          const isSelected = activeCard?.id === card.id;
          const metrics = FinancialEngine.getCardAvailableLimit(card.id);
          const usedPercent = card.creditLimit > 0 ? Math.min(100, (metrics.used / card.creditLimit) * 100) : 0;

          return (
            <div
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className={`cursor-pointer rounded-2xl p-5 transition-all relative overflow-hidden border ${
                isSelected 
                  ? 'ring-2 ring-amber-500 border-amber-500 shadow-lg shadow-amber-500/10 bg-white dark:bg-[#181F2C]' 
                  : 'border-slate-200 dark:border-[#273040] bg-white dark:bg-[#131720] hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* Card Color Stripe */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: card.color || '#f59e0b' }}
              />

              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {card.institution || 'Banco Emissor'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {card.name}
                  </h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCard(card);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Editar cartão"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    •••• {card.lastFourDigits || '0000'}
                  </span>
                </div>
              </div>

              {/* Balance & Limit Progress */}
              <div className="space-y-2 mb-3">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Limite Disponível:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBRL(metrics.available)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-[#273040]">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      usedPercent > 85 ? 'bg-rose-500' : usedPercent > 60 ? 'bg-amber-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Usado: {formatBRL(metrics.used)}</span>
                  <span>Total: {formatBRL(card.creditLimit)}</span>
                </div>
              </div>

              {/* Dates */}
              <div className="pt-2 border-t border-slate-100 dark:border-[#273040] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Fecha dia <strong className="text-slate-700 dark:text-slate-200">{card.closingDay}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Vence dia <strong className="text-slate-700 dark:text-slate-200">{card.dueDay}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activeCard && (
        <>
          {/* Active Card Invoice Management Workspace */}
          <div className="bg-white dark:bg-[#131720] border border-slate-200 dark:border-[#273040] rounded-2xl overflow-hidden shadow-2xs">
            {/* Months Tabs */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-[#1B212D] border-b border-slate-200 dark:border-[#273040] flex items-center justify-between gap-4 overflow-x-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  Faturas Mensais:
                </span>
                <div className="flex items-center gap-1.5">
                  {invoices.map(inv => {
                    const isSelected = selectedInvoiceMonth === inv.invoiceMonth;
                    return (
                      <button
                        key={inv.invoiceMonth}
                        onClick={() => setSelectedInvoiceMonth(inv.invoiceMonth)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500 text-black shadow-xs font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{inv.invoiceMonth}</span>
                        {inv.status === 'PAGA' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                        {inv.status === 'FECHADA' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                        {inv.status === 'ABERTA' && inv.totalAmount > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeInvoice && (
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    activeInvoice.status === 'PAGA'
                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                      : activeInvoice.status === 'FECHADA'
                        ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800'
                  }`}>
                    {activeInvoice.status === 'PAGA' ? 'Fatura Paga' : activeInvoice.status === 'FECHADA' ? 'Fatura Fechada' : 'Fatura Aberta'}
                  </span>
                </div>
              )}
            </div>

            {/* Active Invoice Details Dashboard */}
            {activeInvoice && (
              <div className="p-6 border-b border-slate-200 dark:border-[#273040] bg-white dark:bg-[#131720]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200 dark:border-[#273040]">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Total da Fatura ({activeInvoice.invoiceMonth})
                    </span>
                    <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                      {formatBRL(activeInvoice.totalAmount)}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {activeInvoice.itemsCount} {activeInvoice.itemsCount === 1 ? 'lançamento nesta fatura' : 'lançamentos nesta fatura'}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200 dark:border-[#273040]">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Saldo Restante a Pagar
                    </span>
                    <div className={`text-xl font-bold font-mono ${activeInvoice.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatBRL(activeInvoice.balance)}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {activeInvoice.paidAmount > 0 ? `Já pago: ${formatBRL(activeInvoice.paidAmount)}` : 'Aguardando liquidação'}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200 dark:border-[#273040]">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Fechamento & Vencimento
                    </span>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Fecha: <span className="font-mono text-slate-600 dark:text-slate-300">{activeInvoice.closingDate}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                      Vence: <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{activeInvoice.dueDate}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200 dark:border-[#273040] flex flex-col justify-center">
                    <button
                      id="btn-pay-invoice"
                      type="button"
                      disabled={activeInvoice.balance <= 0}
                      onClick={handleOpenPayInvoice}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
                        activeInvoice.balance > 0
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-105 text-white shadow-emerald-900/20 active:scale-95 cursor-pointer'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {activeInvoice.balance > 0 ? 'Pagar Fatura' : 'Fatura Totalmente Paga'}
                    </button>
                    {activeInvoice.balance > 0 && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center block mt-1.5">
                        Debita de banco PJ e liquida no Contas a Pagar
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Purchases List in Current Invoice */}
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Lançamentos da Fatura ({selectedInvoiceMonth})
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({currentInvoiceItems.length})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Buscar por fornecedor, descrição..."
                      className="w-full bg-white dark:bg-[#1B212D] border border-slate-200 dark:border-[#273040] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {currentInvoiceItems.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-[#1B212D]/40 rounded-xl border border-slate-200 dark:border-[#273040] text-slate-500 text-xs">
                  Nenhum lançamento encontrado nesta fatura ({selectedInvoiceMonth}).
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-[#273040] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#1B212D] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#273040]">
                      <tr>
                        <th className="p-3">Data Compra</th>
                        <th className="p-3">Descrição da Despesa</th>
                        <th className="p-3">Estabelecimento / Fornecedor</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3 text-center">Parcela</th>
                        <th className="p-3 text-right">Valor nesta Fatura</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Integração</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#273040] text-slate-700 dark:text-slate-300">
                      {currentInvoiceItems.map((item) => (
                        <tr key={`${item.purchaseId}-${item.installmentNumber}`} className="hover:bg-slate-50 dark:hover:bg-[#1B212D]/60 transition-colors">
                          <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                            {item.purchaseDate}
                          </td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">
                            {item.description}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">
                            {item.counterpartyName}
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">
                            {item.chartAccountName}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 font-bold">
                              {item.installmentNumber}/{item.totalInstallments}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatBRL(item.amount)}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.settled
                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                            }`}>
                              {item.settled ? 'LIQUIDADO' : 'EM ABERTO'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Contas a Pagar
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Past Payments History for this Card */}
            {invoicePayments.length > 0 && (
              <div className="p-6 border-t border-slate-200 dark:border-[#273040] bg-slate-50/50 dark:bg-[#131720]/40">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Histórico de Pagamentos de Faturas Anteriores
                  </h4>
                </div>

                <div className="border border-slate-200 dark:border-[#273040] rounded-xl overflow-hidden bg-white dark:bg-[#131720]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#1B212D] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#273040]">
                      <tr>
                        <th className="p-2.5">Data do Pagamento</th>
                        <th className="p-2.5">Fatura Referente</th>
                        <th className="p-2.5">Conta Bancária Debitada</th>
                        <th className="p-2.5 text-right">Valor Pago</th>
                        <th className="p-2.5">Responsável</th>
                        <th className="p-2.5">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#273040] text-slate-700 dark:text-slate-300">
                      {invoicePayments.map(pay => {
                        const bank = bankAccounts.find(b => b.id === pay.bankAccountId);
                        return (
                          <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400">{pay.paymentDate}</td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">{pay.invoiceMonth}</td>
                            <td className="p-2.5 text-slate-700 dark:text-slate-300">{bank?.name || 'Conta PJ'}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatBRL(pay.amountPaid)}
                            </td>
                            <td className="p-2.5 text-slate-500 dark:text-slate-400">{pay.createdBy || 'Sistema'}</td>
                            <td className="p-2.5 text-slate-500 dark:text-slate-400">{pay.notes || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      <CreditCardFormModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        bankAccounts={bankAccounts}
        editingCard={editingCard}
        onSuccess={loadData}
      />

      <CreditCardPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        cards={cards}
        counterparties={counterparties}
        chartAccounts={chartAccounts}
        initialCardId={activeCard?.id}
        onSuccess={loadData}
      />

      {activeCard && activeInvoice && (
        <CreditCardInvoicePaymentModal
          isOpen={isPayInvoiceModalOpen}
          onClose={() => setIsPayInvoiceModalOpen(false)}
          card={activeCard}
          invoiceMonth={activeInvoice.invoiceMonth}
          invoiceTotal={activeInvoice.totalAmount}
          invoiceBalance={activeInvoice.balance}
          dueDate={activeInvoice.dueDate}
          bankAccounts={bankAccounts}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
