import React, { useState, useMemo, useEffect } from 'react';
import { Trash2, Ban, AlertTriangle, X, ShieldAlert, CheckCircle2, Lock, Repeat, ChevronDown, ChevronUp } from 'lucide-react';
import { FinancialTitle } from '../../types';
import { FinancialEngine, formatBRL, formatDateBR } from '../../services/financialEngine';
import { RecurringSeriesService } from '../../services/recurringSeriesService';

interface ConfirmBatchActionModalProps {
  isOpen: boolean;
  mode: 'DELETE' | 'CANCEL';
  type: 'RECEBER' | 'PAGAR';
  titles: FinancialTitle[];
  onClose: () => void;
  onConfirm: (extraSubsequentIds?: string[]) => void;
}

export const ConfirmBatchActionModal: React.FC<ConfirmBatchActionModalProps> = ({
  isOpen,
  mode,
  type,
  titles,
  onClose,
  onConfirm
}) => {
  const [subsequentScope, setSubsequentScope] = useState<'THIS_ONLY' | 'ALL_FUTURE' | 'MANUAL'>('THIS_ONLY');
  const [selectedSubsequentIds, setSelectedSubsequentIds] = useState<string[]>([]);
  const [showSubsequentList, setShowSubsequentList] = useState(false);

  const singleTitleId = titles.length === 1 ? titles[0]?.id : '';

  const seriesInfo = useMemo(() => {
    if (!isOpen || titles.length !== 1 || !titles[0]) return null;
    return RecurringSeriesService.detectSeries(titles[0]);
  }, [isOpen, titles]);

  useEffect(() => {
    setSubsequentScope('THIS_ONLY');
    setShowSubsequentList(false);
    setSelectedSubsequentIds(seriesInfo?.subsequentOpenTitles.map(t => t.id) || []);
  }, [isOpen, singleTitleId, seriesInfo]);

  if (!isOpen || titles.length === 0) return null;

  const isDelete = mode === 'DELETE';
  const isReceber = type === 'RECEBER';
  const entityName = isReceber ? 'título(s) a receber' : 'obrigação(ões) a pagar';

  const totalOriginal = titles.reduce((acc, t) => acc + t.originalAmount, 0);
  const totalBalance = titles.reduce((acc, t) => acc + t.balancePrincipal, 0);
  const totalSettled = titles.reduce((acc, t) => acc + t.settledPrincipal, 0);
  const settledCount = titles.filter(t => t.settledPrincipal > 0 || t.settlementState === 'LIQUIDADO' || t.settlementState === 'PARCIAL').length;
  const alreadyCancelledCount = titles.filter(t => t.documentState === 'CANCELADO').length;

  const closedCount = titles.filter(t => FinancialEngine.isPeriodClosed(t.competence)).length;
  const isAllClosed = closedCount === titles.length && titles.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="confirm-batch-action-modal"
        className="bg-white dark:bg-[#131720] rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${
          isDelete 
            ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/60' 
            : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/60'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${
              isDelete ? 'bg-rose-600 text-white shadow-xs' : 'bg-amber-600 text-white shadow-xs'
            }`}>
              {isDelete ? <Trash2 className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isDelete 
                  ? (titles.length === 1 ? 'Excluir Lançamento' : 'Excluir Lançamentos em Lote') 
                  : (titles.length === 1 ? 'Cancelar Lançamento' : 'Cancelar Lançamentos em Lote')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {titles.length === 1 
                  ? `Confirmação de operação para 1 item` 
                  : `${titles.length} itens selecionados no módulo de ${isReceber ? 'Contas a Receber' : 'Contas a Pagar'}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Summary Box */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Quantidade</span>
                <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{titles.length}</span>
              </div>
              <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Valor Original</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatBRL(totalOriginal)}</span>
              </div>
              <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Saldo em Aberto</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{formatBRL(totalBalance)}</span>
              </div>
            </div>
          </div>

          {/* Warning / Explanation Banner */}
          {isDelete ? (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl p-4 text-xs text-rose-900 dark:text-rose-200 space-y-2">
              <div className="flex items-start space-x-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-950 dark:text-rose-100 text-sm">Exclusão Definitiva</div>
                  <p className="mt-1 leading-relaxed text-rose-800 dark:text-rose-300">
                    Os registros selecionados serão <strong>removidos permanentemente</strong> do banco de dados. Essa ação não pode ser desfeita.
                  </p>
                  {settledCount > 0 && (
                    <div className="mt-2.5 p-2.5 bg-rose-100/70 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700 rounded-lg text-rose-950 dark:text-rose-200 font-medium">
                      ⚠️ <strong>Atenção:</strong> {settledCount} do(s) lançamento(s) selecionado(s) possui(em) liquidações parciais ou totais ({formatBRL(totalSettled)}). Ao confirmar, o sistema realizará o <strong>estorno automático</strong> das movimentações financeiras para manter a integridade dos saldos bancários.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-950 dark:text-amber-100 text-sm">Cancelamento de Documentos</div>
                  <p className="mt-1 leading-relaxed text-amber-800 dark:text-amber-300">
                    Os lançamentos selecionados terão a situação alterada para <strong>CANCELADO</strong>, mantendo o histórico para fins de relatórios e conciliação.
                  </p>
                  {settledCount > 0 && (
                    <div className="mt-2.5 p-2 bg-amber-100/70 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-950 dark:text-amber-200 font-medium">
                      ℹ️ Títulos com baixas financeiras ({settledCount}) serão ignorados no cancelamento para proteger a integridade contábil.
                    </div>
                  )}
                  {alreadyCancelledCount > 0 && (
                    <div className="mt-1 text-slate-600 dark:text-slate-400">
                      {alreadyCancelledCount} item(ns) já está(ão) cancelado(s).
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Alerta de Período Fechado (Melhoria 1) */}
          {closedCount > 0 && (
            <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3.5 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  {closedCount} título(s) em competência contábil FECHADA
                </span>
                <p className="text-[11px] text-amber-900 dark:text-amber-300 mt-0.5">
                  {isAllClosed 
                    ? 'Todos os títulos selecionados pertencem a meses já encerrados no Fechamento Mensal. Esta operação não pode ser concluída sem reabrir a competência.' 
                    : 'Alguns dos títulos pertencem a competências encerradas. Apenas os títulos de competências abertas serão processados.'}
                </p>
              </div>
            </div>
          )}

          {/* Alerta de Cadeia Recorrente / Similares Futuros */}
          {seriesInfo && seriesInfo.isSeries && seriesInfo.subsequentOpenTitles.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/35 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Repeat className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-amber-300 block">
                    Sequência Futura Detectada ({seriesInfo.seriesTypeLabel})
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Identificamos <strong>{seriesInfo.subsequentOpenTitles.length} lançamento(s) posterior(es)</strong> similar(es) em meses seguintes em aberto. Eles também são continuidade? Escolha se deseja {isDelete ? 'excluir' : 'cancelar'} os posteriores ou apenas este mês:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSubsequentScope('THIS_ONLY')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    subsequentScope === 'THIS_ONLY'
                      ? 'bg-white dark:bg-slate-800 border-amber-500 ring-1 ring-amber-500/50 text-slate-900 dark:text-white font-semibold'
                      : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-500/40'
                  }`}
                >
                  <div className="text-[11px] font-bold">Somente este mês</div>
                  <div className="text-[10px] opacity-75">Apenas 1 item</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSubsequentScope('MANUAL');
                    setShowSubsequentList(true);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    subsequentScope === 'MANUAL'
                      ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/50 text-amber-950 dark:text-amber-200 font-semibold'
                      : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-500/40'
                  }`}
                >
                  <div className="text-[11px] font-bold">Selecionar manualmente</div>
                  <div className="text-[10px] opacity-75">{selectedSubsequentIds.length} futuro(s) marcado(s)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSubsequentScope('ALL_FUTURE')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    subsequentScope === 'ALL_FUTURE'
                      ? 'bg-rose-500/15 border-rose-500 ring-1 ring-rose-500/50 text-rose-950 dark:text-rose-200 font-semibold'
                      : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-rose-500/40'
                  }`}
                >
                  <div className="text-[11px] font-bold">Este e os {seriesInfo.subsequentOpenTitles.length} futuros</div>
                  <div className="text-[10px] opacity-75">Total de {1 + seriesInfo.subsequentOpenTitles.length} itens</div>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSubsequentList(!showSubsequentList)}
                    className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Visualizar os {seriesInfo.subsequentOpenTitles.length} lançamentos futuros encontrados</span>
                    {showSubsequentList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {subsequentScope === 'MANUAL' && (
                    <button
                      type="button"
                      onClick={() => setSelectedSubsequentIds(
                        selectedSubsequentIds.length === seriesInfo.subsequentOpenTitles.length
                          ? []
                          : seriesInfo.subsequentOpenTitles.map(t => t.id)
                      )}
                      className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      {selectedSubsequentIds.length === seriesInfo.subsequentOpenTitles.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                  )}
                </div>

                {(showSubsequentList || subsequentScope === 'MANUAL') && (
                  <div className="mt-2 max-h-36 overflow-y-auto space-y-1 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    {seriesInfo.subsequentOpenTitles.map(sub => {
                      const isChecked = selectedSubsequentIds.includes(sub.id);
                      const toggleItem = () => {
                        setSelectedSubsequentIds(prev =>
                          prev.includes(sub.id) ? prev.filter(id => id !== sub.id) : [...prev, sub.id]
                        );
                      };
                      return (
                        <div
                          key={sub.id}
                          onClick={() => subsequentScope === 'MANUAL' && toggleItem()}
                          className={`flex items-center justify-between text-[11px] p-1.5 rounded border transition-colors ${
                            subsequentScope === 'MANUAL' ? 'cursor-pointer' : ''
                          } ${
                            subsequentScope === 'MANUAL' && isChecked
                              ? 'bg-rose-500/10 border-rose-500/30'
                              : 'border-slate-100 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate max-w-[260px]">
                            {subsequentScope === 'MANUAL' && (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-3.5 h-3.5 accent-rose-600 rounded cursor-pointer shrink-0"
                              />
                            )}
                            <span className="font-mono text-[10px] text-slate-500 shrink-0">{sub.competence || sub.dueDate?.substring(0, 7)}</span>
                            <span className="text-slate-700 dark:text-slate-300 truncate">{sub.description}</span>
                          </div>
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                            {formatBRL(sub.originalAmount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* List Preview (First 5 items) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Lançamentos Selecionados ({titles.length})
            </div>
            <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs bg-white dark:bg-slate-900">
              {titles.slice(0, 5).map(t => (
                <div key={t.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <div className="truncate max-w-[280px]">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mr-2">{t.titleNumber}</span>
                    <span className="text-slate-600 dark:text-slate-400">{t.description}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">{formatBRL(t.originalAmount)}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Venc: {formatDateBR(t.dueDate)}</span>
                  </div>
                </div>
              ))}
              {titles.length > 5 && (
                <div className="p-2 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 font-medium">
                  + {titles.length - 5} outro(s) lançamento(s) selecionado(s)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Voltar / Não {isDelete ? 'excluir' : 'cancelar'}
          </button>
          <button
            type="button"
            onClick={() => {
              const extraIds =
                subsequentScope === 'ALL_FUTURE' && seriesInfo
                  ? seriesInfo.subsequentOpenTitles.map(t => t.id)
                  : subsequentScope === 'MANUAL'
                  ? selectedSubsequentIds
                  : undefined;
              onConfirm(extraIds && extraIds.length > 0 ? extraIds : undefined);
            }}
            disabled={isAllClosed}
            className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition-colors flex items-center ${
              isAllClosed
                ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                : isDelete 
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 cursor-pointer' 
                : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 cursor-pointer'
            }`}
          >
            {isAllClosed ? (
              <>
                <Lock className="w-4 h-4 mr-1.5" />
                Bloqueado: Competência Fechada
              </>
            ) : (() => {
              const extraCount =
                subsequentScope === 'ALL_FUTURE' && seriesInfo
                  ? seriesInfo.subsequentOpenTitles.length
                  : subsequentScope === 'MANUAL'
                  ? selectedSubsequentIds.length
                  : 0;
              const totalCount = titles.length + extraCount;
              return isDelete ? (
                <>
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Confirmar Exclusão {totalCount > 1 ? `(${totalCount})` : ''}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Confirmar Cancelamento {totalCount > 1 ? `(${totalCount})` : ''}
                </>
              );
            })()}
          </button>
        </div>
      </div>
    </div>
  );
};
