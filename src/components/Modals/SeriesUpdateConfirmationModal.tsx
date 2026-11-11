import React, { useState, useMemo } from 'react';
import { 
  X, 
  Repeat, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  FolderTree,
  Building2,
  Sparkles,
  Trash2
} from 'lucide-react';
import { FinancialTitle } from '../../types';
import { formatBRL, formatDateBR } from '../../services/financialEngine';
import { SeriesDetectionResult, SeriesFieldChanges } from '../../services/recurringSeriesService';
import { storage } from '../../services/storageService';

interface SeriesUpdateConfirmationModalProps {
  isOpen: boolean;
  targetTitle: FinancialTitle;
  newAmount: number;
  newDueDate?: string;
  newAccountId?: string;
  newBankAccountId?: string;
  fieldChanges?: SeriesFieldChanges;
  seriesInfo: SeriesDetectionResult;
  onConfirm: (
    applyToSubsequent: boolean,
    selectedSubsequentIds?: string[],
    options?: {
      actionMode?: 'UPDATE' | 'DELETE';
      individualOverrides?: Record<string, { amount?: number; dueDate?: string; description?: string }>;
    }
  ) => void;
  onCancel: () => void;
}

export const SeriesUpdateConfirmationModal: React.FC<SeriesUpdateConfirmationModalProps> = ({
  isOpen,
  targetTitle,
  newAmount,
  newDueDate,
  newAccountId,
  newBankAccountId,
  fieldChanges,
  seriesInfo,
  onConfirm,
  onCancel
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    seriesInfo.subsequentOpenTitles.map(t => t.id)
  );
  const [manualEdits, setManualEdits] = useState<Record<string, { amount: number; dueDate: string }>>(() => {
    const initial: Record<string, { amount: number; dueDate: string }> = {};
    const newDueDay = newDueDate && newDueDate.includes('-') ? parseInt(newDueDate.split('-')[2], 10) : 0;
    const isAmtChanged = fieldChanges ? fieldChanges.amountChanged : Math.abs(newAmount - (targetTitle.originalAmount || 0)) > 0.001;
    const isDayChanged = fieldChanges ? fieldChanges.dueDayChanged : false;

    seriesInfo.subsequentOpenTitles.forEach(t => {
      let nextDue = t.dueDate || '';
      if (isDayChanged && newDueDay > 0 && t.dueDate && t.dueDate.includes('-')) {
        const [y, m] = t.dueDate.split('-').map(Number);
        if (y && m) {
          const maxD = new Date(y, m, 0).getDate();
          nextDue = `${y}-${String(m).padStart(2, '0')}-${String(Math.min(newDueDay, maxD)).padStart(2, '0')}`;
        }
      }
      initial[t.id] = {
        amount: isAmtChanged ? newAmount : (Number(t.originalAmount) || 0),
        dueDate: nextDue
      };
    });
    return initial;
  });

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleManualFieldChange = (id: string, field: 'amount' | 'dueDate', value: number | string) => {
    setManualEdits(prev => ({
      ...prev,
      [id]: {
        amount: prev[id]?.amount ?? newAmount,
        dueDate: prev[id]?.dueDate ?? '',
        [field]: value
      }
    }));
  };

  // Mapear nomes de plano de contas, bancos e contrapartes para exibição amigável
  const { oldAccountName, newAccountName, oldBankName, newBankName, oldCounterpartyName, newCounterpartyName } = useMemo(() => {
    try {
      const chartAccounts = storage.getChartAccounts();
      const bankAccounts = storage.getBankAccounts();
      const counterparties = storage.getCounterparties();

      const oldAcc = chartAccounts.find(a => a.id === targetTitle.accountId);
      const newAcc = chartAccounts.find(a => a.id === newAccountId);

      const oldBank = bankAccounts.find(b => b.id === targetTitle.expectedBankAccountId);
      const newBank = bankAccounts.find(b => b.id === newBankAccountId);

      const oldCp = counterparties.find(c => c.id === (fieldChanges?.oldCounterpartyId || targetTitle.counterpartyId));
      const newCp = counterparties.find(c => c.id === (fieldChanges?.newCounterpartyId || targetTitle.counterpartyId));

      return {
        oldAccountName: oldAcc?.name || targetTitle.accountId || 'Não definida',
        newAccountName: newAcc?.name || newAccountId || 'Não definida',
        oldBankName: oldBank ? `${oldBank.name} (${oldBank.institution})` : 'Indiferente / Não definida',
        newBankName: newBank ? `${newBank.name} (${newBank.institution})` : 'Indiferente / Não definida',
        oldCounterpartyName: oldCp?.name || 'Não definido',
        newCounterpartyName: newCp?.name || 'Não definido'
      };
    } catch {
      return {
        oldAccountName: 'Conta anterior',
        newAccountName: 'Nova conta',
        oldBankName: 'Banco anterior',
        newBankName: 'Novo banco',
        oldCounterpartyName: 'Favorecido anterior',
        newCounterpartyName: 'Novo favorecido'
      };
    }
  }, [targetTitle.accountId, newAccountId, targetTitle.expectedBankAccountId, newBankAccountId, fieldChanges?.oldCounterpartyId, fieldChanges?.newCounterpartyId, targetTitle.counterpartyId]);

  if (!isOpen) return null;

  const previousAmount = targetTitle.originalAmount || 0;
  const diff = newAmount - previousAmount;
  const isIncrease = diff > 0;
  const subsequentCount = seriesInfo.subsequentOpenTitles.length;

  const isAmountChanged = fieldChanges ? fieldChanges.amountChanged : Math.abs(newAmount - previousAmount) > 0.001;
  const isDescriptionChanged = fieldChanges ? Boolean(fieldChanges.descriptionChanged) : false;
  const isCounterpartyChanged = fieldChanges ? Boolean(fieldChanges.counterpartyChanged) : false;
  const isDueDayChanged = fieldChanges ? fieldChanges.dueDayChanged : false;
  const isAccountChanged = fieldChanges ? fieldChanges.accountChanged : Boolean(newAccountId && newAccountId !== targetTitle.accountId);
  const isBankChanged = fieldChanges ? fieldChanges.bankAccountChanged : Boolean(newBankAccountId !== (targetTitle.expectedBankAccountId || ''));

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#273040] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#273040] bg-slate-50 dark:bg-[#161C28] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              {seriesInfo.seriesType === 'PARCELAMENTO' ? (
                <Layers className="w-5 h-5" />
              ) : (
                <Repeat className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight">
                Atualizar Lançamento Recorrente
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {seriesInfo.seriesTypeLabel} • {targetTitle.titleNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Diálogo */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Card com as Modificações Detectadas */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161C28] border border-slate-200 dark:border-[#273040] space-y-3">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
              <span>Descrição Atual:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[240px]">
                {targetTitle.description}
              </span>
            </div>

            {isDescriptionChanged && fieldChanges?.newDescription && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Nova Descrição:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 truncate max-w-[240px]">
                  {fieldChanges.newDescription}
                </span>
              </div>
            )}

            {isCounterpartyChanged && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 truncate max-w-[160px]">{oldCounterpartyName}</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0 mx-1" />
                <span className="font-bold text-amber-600 dark:text-amber-400 truncate max-w-[160px]">
                  {newCounterpartyName}
                </span>
              </div>
            )}

            {/* 1. Alteração de Valor */}
            {isAmountChanged && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-500">Valor Anterior</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {formatBRL(previousAmount)}
                    </span>
                  </div>

                  <div className="px-2">
                    <ArrowRight className="w-4 h-4 text-amber-500" />
                  </div>

                  <div className="text-right">
                    <span className="block text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Novo Valor</span>
                    <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                      {formatBRL(newAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isIncrease 
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  }`}>
                    {isIncrease ? `+ ${formatBRL(diff)}` : `- ${formatBRL(Math.abs(diff))}`}
                  </span>
                </div>
              </div>
            )}

            {/* 2. Alteração de Dia de Vencimento */}
            {isDueDayChanged && fieldChanges && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-500">Vencimento Padrão</span>
                    <span className="text-xs font-semibold">Dia {fieldChanges.oldDueDay}</span>
                  </div>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-amber-500" />

                <div className="text-right">
                  <span className="block text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Novo Dia</span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Todo dia {fieldChanges.newDueDay}</span>
                </div>
              </div>
            )}

            {/* 3. Alteração de Categoria Contábil */}
            {isAccountChanged && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 truncate max-w-[190px]">
                  <FolderTree className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate" title={oldAccountName}>{oldAccountName}</span>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0 mx-1" />

                <div className="text-right truncate max-w-[190px] font-bold text-indigo-600 dark:text-indigo-400">
                  <span className="truncate" title={newAccountName}>{newAccountName}</span>
                </div>
              </div>
            )}

            {/* 4. Alteração de Conta Bancária */}
            {isBankChanged && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 truncate max-w-[190px]">
                  <Building2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  <span className="truncate" title={oldBankName}>{oldBankName}</span>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0 mx-1" />

                <div className="text-right truncate max-w-[190px] font-bold text-teal-600 dark:text-teal-400">
                  <span className="truncate" title={newBankName}>{newBankName}</span>
                </div>
              </div>
            )}
          </div>

          {/* Pergunta de Decisão */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Como você deseja aplicar esta alteração?
            </h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
              Detectamos que este lançamento faz parte de uma sequência com{' '}
              <strong className="text-amber-600 dark:text-amber-400">{subsequentCount} lançamento(s) seguinte(s) em aberto</strong>.
            </p>
          </div>

          {/* Aviso de Proteção para Meses Já Pagos */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-start gap-2.5 text-emerald-900 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="leading-snug text-[11px]">
              <strong>Histórico Protegido:</strong> Lançamentos que já foram pagos/recebidos ou com baixas confirmadas{' '}
              {seriesInfo.paidTitlesCount > 0 ? `(${seriesInfo.paidTitlesCount} já quitados) ` : ''}
              <strong>não serão modificados</strong>. Apenas os meses em aberto desse período em diante serão atualizados.
            </div>
          </div>

          {/* Aviso especial de Contrato com Histórico de Reajuste */}
          {seriesInfo.seriesType === 'CONTRATO' && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center space-x-2 text-[11px] text-amber-800 dark:text-amber-300">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                <strong>Sincronização Contratual:</strong> O contrato ativo terá seu valor mensal atualizado e um registro oficial será gravado no seu <strong>Histórico de Reajustes</strong> (com opção de notificar o cliente via WhatsApp/E-mail).
              </span>
            </div>
          )}

          {/* Lista detalhada expansível dos próximos meses */}
          {subsequentCount > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-[#273040] overflow-hidden">
              <div className="w-full px-3 py-2 bg-slate-50 dark:bg-[#161C28] flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1.5 hover:text-amber-500 transition-colors cursor-pointer"
                >
                  <span>
                    {isManualMode 
                      ? `Selecione manualmente quais dos ${subsequentCount} meses futuros atualizar (${selectedIds.length} marcado(s)):`
                      : `Ver os ${subsequentCount} lançamentos futuros detectados na cadeia`}
                  </span>
                  {showDetails || isManualMode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {isManualMode && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds(
                      selectedIds.length === subsequentCount 
                        ? [] 
                        : seriesInfo.subsequentOpenTitles.map(t => t.id)
                    )}
                    className="text-[10px] text-amber-500 hover:underline font-bold cursor-pointer"
                  >
                    {selectedIds.length === subsequentCount ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                )}
              </div>

              {(showDetails || isManualMode) && (
                <div className="p-2.5 max-h-56 overflow-y-auto space-y-2 bg-white dark:bg-[#121620]">
                  {seriesInfo.subsequentOpenTitles.map(t => {
                    const isChecked = selectedIds.includes(t.id);
                    const manualData = manualEdits[t.id] || { amount: t.originalAmount, dueDate: t.dueDate };
                    return (
                      <div 
                        key={t.id} 
                        className={`p-2 rounded-lg border text-[11px] transition-all space-y-2 ${
                          isManualMode && isChecked
                            ? 'bg-amber-500/10 border-amber-500/40'
                            : 'bg-slate-50 dark:bg-[#161C28] border-slate-200/60 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <label className={`flex items-center gap-2 min-w-0 pr-2 ${isManualMode ? 'cursor-pointer' : ''}`}>
                            {isManualMode && (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectId(t.id)}
                                className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <span className="font-mono text-[10px] text-slate-500 block truncate">
                                {t.competence || (t.dueDate ? t.dueDate.substring(0, 7) : '')} • {t.titleNumber}
                              </span>
                              <span className="text-slate-700 dark:text-slate-300 truncate block font-medium">
                                {t.description}
                              </span>
                            </div>
                          </label>
                          {!isManualMode && (
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-slate-500 block">Venc: {formatDateBR(t.dueDate)}</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                {isAmountChanged ? `${formatBRL(t.originalAmount)} → ${formatBRL(newAmount)}` : formatBRL(t.originalAmount)}
                              </span>
                            </div>
                          )}
                        </div>

                        {isManualMode && isChecked && (
                          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-700/60">
                            <div>
                              <span className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Valor deste mês (R$)</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={manualData.amount}
                                onChange={(e) => handleManualFieldChange(t.id, 'amount', parseFloat(e.target.value) || 0)}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#121620] px-2 py-1 text-[11px] font-mono font-bold text-slate-900 dark:text-amber-300"
                              />
                            </div>
                            <div>
                              <span className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Vencimento</span>
                              <input
                                type="date"
                                value={manualData.dueDate}
                                onChange={(e) => handleManualFieldChange(t.id, 'dueDate', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#121620] px-2 py-1 text-[11px] font-mono text-slate-900 dark:text-slate-200"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Rodapé com as opções de decisão (Este Mês, Manual, Todos Seguintes ou Excluir Posteriores) */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-[#273040] bg-slate-50 dark:bg-[#161C28] flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-between items-stretch sm:items-center">
            <button
              type="button"
              onClick={() => onConfirm(false)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#273040] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors flex items-center justify-center text-xs cursor-pointer"
            >
              <span>Alterar Apenas Este Mês</span>
            </button>

            <div className="flex flex-col sm:flex-row gap-2">
              {!isManualMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsManualMode(true);
                    setShowDetails(true);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold transition-colors flex items-center justify-center text-xs cursor-pointer"
                >
                  <span>Editar Manualmente Cada um Deles</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const overrides: Record<string, { amount?: number; dueDate?: string }> = {};
                    selectedIds.forEach(id => {
                      if (manualEdits[id]) {
                        overrides[id] = {
                          amount: manualEdits[id].amount,
                          dueDate: manualEdits[id].dueDate
                        };
                      }
                    });
                    onConfirm(selectedIds.length > 0, selectedIds, {
                      actionMode: 'UPDATE',
                      individualOverrides: overrides
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Aplicar nos {selectedIds.length} Selecionados</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onConfirm(true, seriesInfo.subsequentOpenTitles.map(t => t.id), { actionMode: 'UPDATE' })}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Este e Todos os {subsequentCount} Meses Seguintes</span>
              </button>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Ou encerre a sequência salvando este mês e excluindo os posteriores {isManualMode ? 'marcados' : 'em aberto'}:
            </span>
            <button
              type="button"
              onClick={() => {
                const targetIdsToDelete = isManualMode
                  ? selectedIds
                  : seriesInfo.subsequentOpenTitles.map(t => t.id);
                if (targetIdsToDelete.length === 0) {
                  onConfirm(false);
                  return;
                }
                onConfirm(true, targetIdsToDelete, { actionMode: 'DELETE' });
              }}
              className="px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold transition-colors inline-flex items-center gap-1.5 text-[11px] cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                Excluir {isManualMode ? `${selectedIds.length} Marcado(s)` : `${subsequentCount} Posteriores`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
