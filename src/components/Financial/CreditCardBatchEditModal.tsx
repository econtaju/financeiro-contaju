import React, { useState, useMemo } from 'react';
import { 
  Edit3, 
  X, 
  Search, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Building2,
  Tag
} from 'lucide-react';
import { ChartAccount, Counterparty } from '../../types';
import { storage } from '../../services/storageService';
import { formatBRL } from '../../services/financialEngine';

interface BatchEditItem {
  purchaseId: string;
  installmentNumber: number;
  description: string;
  amount: number;
  totalInstallments: number;
}

interface CreditCardBatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: BatchEditItem[];
  chartAccounts: ChartAccount[];
  counterparties: Counterparty[];
  hasFutureInstallments: boolean;
  onSuccess: () => void;
}

export const CreditCardBatchEditModal: React.FC<CreditCardBatchEditModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  chartAccounts,
  counterparties,
  hasFutureInstallments,
  onSuccess
}) => {
  const [selectedChartAccountId, setSelectedChartAccountId] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState('');
  const [customCounterpartyName, setCustomCounterpartyName] = useState('');
  const [changeDescription, setChangeDescription] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [changeNotes, setChangeNotes] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const [applyToFuture, setApplyToFuture] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = useMemo(() => {
    return selectedItems.reduce((acc, it) => acc + it.amount, 0);
  }, [selectedItems]);

  const filteredExpenseAccounts = useMemo(() => {
    const expenses = chartAccounts.filter(a => a.type === 'DESPESA' || a.code.startsWith('4') || a.code.startsWith('3'));
    if (!categorySearch.trim()) return expenses.slice(0, 50);
    const term = categorySearch.toLowerCase();
    return expenses.filter(a => 
      a.name.toLowerCase().includes(term) || 
      a.code.toLowerCase().includes(term)
    );
  }, [chartAccounts, categorySearch]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validação: ao menos um campo deve ser alterado
    const hasCategoryChange = !!selectedChartAccountId;
    const hasCounterpartyChange = !!selectedCounterpartyId || !!customCounterpartyName.trim();
    const hasDescChange = changeDescription && !!newDescription.trim();
    const hasNoteChange = changeNotes;

    if (!hasCategoryChange && !hasCounterpartyChange && !hasDescChange && !hasNoteChange) {
      setError('Selecione ao menos um campo para atualizar nos lançamentos selecionados.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalCounterpartyName = customCounterpartyName.trim() || 
        (selectedCounterpartyId ? counterparties.find(c => c.id === selectedCounterpartyId)?.name : undefined);

      const result = storage.updateCardPurchasesBatch({
        items: selectedItems.map(it => ({
          purchaseId: it.purchaseId,
          installmentNumber: it.installmentNumber
        })),
        applyToFuture: hasFutureInstallments ? applyToFuture : true,
        changes: {
          ...(hasCategoryChange ? { chartAccountId: selectedChartAccountId } : {}),
          ...(selectedCounterpartyId ? { counterpartyId: selectedCounterpartyId } : {}),
          ...(finalCounterpartyName ? { counterpartyName: finalCounterpartyName } : {}),
          ...(hasDescChange ? { description: newDescription.trim() } : {}),
          ...(hasNoteChange ? { notes: newNotes.trim() } : {})
        }
      });

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError('Ocorreu um erro ao atualizar os lançamentos em lote.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha na atualização em lote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div 
        className="bg-white dark:bg-[#131720] border border-slate-200 dark:border-[#273040] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#273040] bg-slate-50 dark:bg-[#181E2A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Edição em Lote de Lançamentos
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedItems.length} {selectedItems.length === 1 ? 'lançamento selecionado' : 'lançamentos selecionados'} • Total: {formatBRL(totalAmount)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Categoria do Plano de Contas */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              Alterar Categoria do Plano de Contas (Opcional)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Filtrar categorias de despesas (ex: viagens, software, alimentação)..."
                className="w-full bg-slate-50 dark:bg-[#1B212D] border border-slate-200 dark:border-[#273040] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 mb-2"
              />
            </div>
            <select
              value={selectedChartAccountId}
              onChange={(e) => setSelectedChartAccountId(e.target.value)}
              className="w-full bg-white dark:bg-[#1B212D] border border-slate-300 dark:border-[#273040] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="">-- Manter categorias originais inalteradas --</option>
              {filteredExpenseAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Se selecionar uma categoria, todos os {selectedItems.length} lançamentos passarão para essa categoria contábil.
            </p>
          </div>

          {/* Favorecido / Estabelecimento */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              Alterar Favorecido / Fornecedor (Opcional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedCounterpartyId}
                onChange={(e) => {
                  setSelectedCounterpartyId(e.target.value);
                  if (e.target.value) setCustomCounterpartyName('');
                }}
                className="w-full bg-white dark:bg-[#1B212D] border border-slate-300 dark:border-[#273040] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">-- Selecionar fornecedor cadastrado --</option>
                {counterparties.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={customCounterpartyName}
                onChange={(e) => {
                  setCustomCounterpartyName(e.target.value);
                  if (e.target.value) setSelectedCounterpartyId('');
                }}
                placeholder="Ou digite o nome do favorecido avulso..."
                className="w-full bg-white dark:bg-[#1B212D] border border-slate-300 dark:border-[#273040] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          {/* Descrição em lote */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#181E2A] rounded-2xl border border-slate-200 dark:border-[#273040] space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={changeDescription}
                onChange={(e) => setChangeDescription(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
              <span>Substituir a descrição de todos os lançamentos selecionados</span>
            </label>
            {changeDescription && (
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Informe a nova descrição para todos os lançamentos selecionados..."
                className="w-full bg-white dark:bg-[#1B212D] border border-slate-300 dark:border-[#273040] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            )}
          </div>

          {/* Lançamentos futuros vinculados (Pergunta Crítica solicitada pelo Usuário) */}
          {hasFutureInstallments && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Existem parcelas ou lançamentos futuros vinculados a estas despesas:</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Alguns dos lançamentos selecionados fazem parte de compras parceladas ou recorrentes com parcelas em faturas futuras. Como você prefere aplicar as alterações?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setApplyToFuture(true)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    applyToFuture
                      ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-sm'
                      : 'bg-white dark:bg-[#1B212D] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#273040] hover:border-amber-400'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Alterar nesta e em todas as seguintes</span>
                    {applyToFuture && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] block mt-1 ${applyToFuture ? 'text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}>
                    Atualiza os títulos futuros no Contas a Pagar mantendo total padronização contábil.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setApplyToFuture(false)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    !applyToFuture
                      ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-sm'
                      : 'bg-white dark:bg-[#1B212D] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#273040] hover:border-amber-400'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Alterar apenas nesta fatura</span>
                    {!applyToFuture && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] block mt-1 ${!applyToFuture ? 'text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}>
                    Altera somente o lançamento desta fatura, sem modificar as parcelas dos meses futuros.
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Rodapé e Ações */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#273040]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-[#1B212D] dark:hover:bg-slate-800 border border-slate-200 dark:border-[#273040] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Aplicando Alterações...' : `Atualizar ${selectedItems.length} Lançamentos`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
