import React, { useState } from 'react';
import { X, CreditCard as CardIcon, Building2, Calendar, DollarSign, Palette } from 'lucide-react';
import { CreditCard, BankAccount } from '../../types';
import { storage } from '../../services/storageService';

interface CreditCardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  editingCard?: CreditCard | null;
  onSuccess: () => void;
}

const BRAND_OPTIONS = [
  { value: 'MASTERCARD', label: 'Mastercard' },
  { value: 'VISA', label: 'Visa' },
  { value: 'ELO', label: 'Elo' },
  { value: 'AMEX', label: 'American Express' },
  { value: 'OUTRO', label: 'Outro' }
];

const COLOR_PRESETS = [
  { label: 'Roxo Nubank', value: '#820ad1' },
  { label: 'Laranja Itaú', value: '#ec7000' },
  { label: 'Vermelho Santander/Bradesco', value: '#cc092f' },
  { label: 'Azul Petróleo', value: '#0284c7' },
  { label: 'Esmeralda Corporativo', value: '#059669' },
  { label: 'Grafite Escuro', value: '#334155' },
  { label: 'Dourado / Black', value: '#b45309' }
];

export const CreditCardFormModal: React.FC<CreditCardFormModalProps> = ({
  isOpen,
  onClose,
  bankAccounts,
  editingCard,
  onSuccess
}) => {
  const [name, setName] = useState(editingCard?.name || '');
  const [institution, setInstitution] = useState(editingCard?.institution || '');
  const [brand, setBrand] = useState<CreditCard['brand']>(editingCard?.brand || 'MASTERCARD');
  const [lastFourDigits, setLastFourDigits] = useState(editingCard?.lastFourDigits || '');
  const [creditLimit, setCreditLimit] = useState(editingCard?.creditLimit ? String(editingCard.creditLimit) : '10000');
  const [closingDay, setClosingDay] = useState(editingCard?.closingDay ? String(editingCard.closingDay) : '25');
  const [dueDay, setDueDay] = useState(editingCard?.dueDay ? String(editingCard.dueDay) : '5');
  const [color, setColor] = useState(editingCard?.color || '#820ad1');
  const [defaultPaymentBankAccountId, setDefaultPaymentBankAccountId] = useState(
    editingCard?.defaultPaymentBankAccountId || bankAccounts[0]?.id || ''
  );
  const [notes, setNotes] = useState(editingCard?.notes || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor, informe o nome descritivo do cartão.');
      return;
    }

    const limitNum = parseFloat(creditLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      setError('Informe um limite de crédito válido maior que zero.');
      return;
    }

    const cDay = parseInt(closingDay, 10);
    const dDay = parseInt(dueDay, 10);
    if (isNaN(cDay) || cDay < 1 || cDay > 31) {
      setError('Dia de fechamento da fatura deve estar entre 1 e 31.');
      return;
    }
    if (isNaN(dDay) || dDay < 1 || dDay > 31) {
      setError('Dia de vencimento da fatura deve estar entre 1 e 31.');
      return;
    }

    const cards = storage.getCreditCards();

    if (editingCard) {
      const updated: CreditCard = {
        ...editingCard,
        name: name.trim(),
        institution: institution.trim() || 'Banco Emissor',
        brand,
        lastFourDigits: lastFourDigits.slice(-4),
        creditLimit: limitNum,
        closingDay: cDay,
        dueDay: dDay,
        color,
        defaultPaymentBankAccountId: defaultPaymentBankAccountId || undefined,
        notes: notes.trim()
      };
      storage.saveCreditCards(cards.map(c => c.id === updated.id ? updated : c));
    } else {
      const newCard: CreditCard = {
        id: `card-${Date.now()}`,
        name: name.trim(),
        institution: institution.trim() || 'Banco Emissor',
        brand,
        lastFourDigits: lastFourDigits.slice(-4),
        creditLimit: limitNum,
        closingDay: cDay,
        dueDay: dDay,
        color,
        defaultPaymentBankAccountId: defaultPaymentBankAccountId || undefined,
        status: 'ATIVO',
        notes: notes.trim(),
        createdAt: new Date().toISOString()
      };
      storage.saveCreditCards([...cards, newCard]);
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CardIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {editingCard ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito Corporativo'}
              </h3>
              <p className="text-xs text-slate-400">
                Cadastre o cartão com limites e datas de fechamento para faturamento mensal.
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-lg text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome de Identificação do Cartão *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Nubank PJ Mastercard, Itaú Corporate"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Banco / Instituição Emissora
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Ex: Nubank, Itaú, Bradesco"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bandeira
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value as CreditCard['brand'])}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {BRAND_OPTIONS.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Últimos 4 Dígitos do Cartão
              </label>
              <input
                type="text"
                maxLength={4}
                value={lastFourDigits}
                onChange={(e) => setLastFourDigits(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 4821"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Limite de Crédito Total (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                onWheel={(e) => (e.target as HTMLElement).blur()}
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="10000.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Dia de Fechamento da Fatura *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                onWheel={(e) => (e.target as HTMLElement).blur()}
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                placeholder="25"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500">
                Dia do mês em que a fatura fecha para compras.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Dia de Vencimento da Fatura *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                onWheel={(e) => (e.target as HTMLElement).blur()}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="5"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500">
                Data de pagamento do boleto da fatura.
              </span>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Conta Bancária Padrão para Pagamento
              </label>
              <select
                value={defaultPaymentBankAccountId}
                onChange={(e) => setDefaultPaymentBankAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Selecione uma conta bancária PJ...</option>
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.bankName || 'PJ'})</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cor Visual do Cartão
              </label>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setColor(preset.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      color === preset.value ? 'scale-110 border-white ring-2 ring-amber-500/50' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Observações
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Cartão destinado para despesas de TI e marketing digital..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

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
              className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-lg transition-all"
            >
              {editingCard ? 'Salvar Alterações' : 'Cadastrar Cartão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
