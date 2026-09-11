import React, { useState } from 'react';
import { 
  X, 
  CreditCard as CardIcon, 
  Building2, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { CreditCard, BankAccount } from '../../types';
import { FinancialEngine, formatBRL } from '../../services/financialEngine';
import { storage } from '../../services/storageService';

interface CreditCardInvoicePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCard;
  invoiceMonth: string; // YYYY-MM
  invoiceTotal: number;
  invoiceBalance: number;
  dueDate: string;
  bankAccounts: BankAccount[];
  onSuccess: () => void;
}

export const CreditCardInvoicePaymentModal: React.FC<CreditCardInvoicePaymentModalProps> = ({
  isOpen,
  onClose,
  card,
  invoiceMonth,
  invoiceTotal,
  invoiceBalance,
  dueDate,
  bankAccounts,
  onSuccess
}) => {
  const [bankAccountId, setBankAccountId] = useState(
    card.defaultPaymentBankAccountId || bankAccounts[0]?.id || ''
  );
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountToPay, setAmountToPay] = useState(String(invoiceBalance));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const selectedBank = bankAccounts.find(b => b.id === bankAccountId);
  const bankCurrentBalance = selectedBank ? FinancialEngine.calculateAccountBalance(selectedBank.id) : 0;

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = parseFloat(amountToPay);
    if (isNaN(val) || val <= 0) {
      setError('Por favor, informe um valor de pagamento válido.');
      return;
    }

    if (!bankAccountId) {
      setError('Selecione a conta bancária de onde o saldo será debitado.');
      return;
    }

    setIsProcessing(true);

    const res = FinancialEngine.payCardInvoice({
      cardId: card.id,
      invoiceMonth,
      bankAccountId,
      amountPaid: val,
      paymentDate,
      notes: notes.trim()
    });

    setIsProcessing(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || 'Erro ao processar o pagamento da fatura.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CardIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Pagamento de Fatura do Cartão
              </h3>
              <p className="text-xs text-slate-400">
                {card.name} — Fatura {invoiceMonth}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePay} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-lg text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Invoice Summary Box */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total da Fatura:</span>
              <span className="font-mono font-bold text-slate-200">{formatBRL(invoiceTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Vencimento da Fatura:</span>
              <span className="font-mono text-slate-200">{dueDate}</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Saldo a Pagar:</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                {formatBRL(invoiceBalance)}
              </span>
            </div>
          </div>

          {/* Conta Bancária Pagadora */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Debitar da Conta Bancária PJ *
            </label>
            <select
              required
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Selecione a conta bancária pagadora...</option>
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.bankName || 'Banco PJ'})
                </option>
              ))}
            </select>
            {selectedBank && (
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                <span>Saldo contábil disponível:</span>
                <span className={`font-mono font-semibold ${bankCurrentBalance >= parseFloat(amountToPay || '0') ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {formatBRL(bankCurrentBalance)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Data do Pagamento */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data do Pagamento *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Valor a Pagar */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Valor do Pagamento (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                onWheel={(e) => (e.target as HTMLElement).blur()}
                value={amountToPay}
                onChange={(e) => setAmountToPay(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observações / Comprovante
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pago via débito automático / Pix bancário"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Automations Badge */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5 text-[11px] text-slate-400">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Impactos automáticos no sistema:
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
              <span>Gera saída bancária imediata na conta selecionada.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
              <span>Baixa automaticamente os títulos da fatura no Contas a Pagar.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
              <span>Restaura o limite de crédito disponível do cartão.</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
