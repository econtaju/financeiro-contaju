import React, { useState } from 'react';
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
  ChevronUp 
} from 'lucide-react';
import { FinancialTitle } from '../../types';
import { formatBRL, formatDateBR } from '../../services/financialEngine';
import { SeriesDetectionResult } from '../../services/recurringSeriesService';

interface SeriesUpdateConfirmationModalProps {
  isOpen: boolean;
  targetTitle: FinancialTitle;
  newAmount: number;
  seriesInfo: SeriesDetectionResult;
  onConfirm: (applyToSubsequent: boolean) => void;
  onCancel: () => void;
}

export const SeriesUpdateConfirmationModal: React.FC<SeriesUpdateConfirmationModalProps> = ({
  isOpen,
  targetTitle,
  newAmount,
  seriesInfo,
  onConfirm,
  onCancel
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const previousAmount = targetTitle.originalAmount || 0;
  const diff = newAmount - previousAmount;
  const isIncrease = diff > 0;
  const subsequentCount = seriesInfo.subsequentOpenTitles.length;

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
          {/* Card de Comparação de Valores */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161C28] border border-slate-200 dark:border-[#273040] space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
              <span>Descrição do Título:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
                {targetTitle.description}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
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

            <div className="pt-1 flex items-center justify-end">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isIncrease 
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              }`}>
                {isIncrease ? `+ ${formatBRL(diff)}` : `- ${formatBRL(Math.abs(diff))}`}
              </span>
            </div>
          </div>

          {/* Pergunta de Negócio */}
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

          {/* Lista detalhada expansível dos próximos meses */}
          {subsequentCount > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-[#273040] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#161C28] flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>Ver os {subsequentCount} lançamentos futuros que serão atualizados</span>
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDetails && (
                <div className="p-2.5 max-h-40 overflow-y-auto space-y-1.5 bg-white dark:bg-[#121620]">
                  {seriesInfo.subsequentOpenTitles.map(t => (
                    <div 
                      key={t.id} 
                      className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-[#161C28] border border-slate-200/60 dark:border-slate-800 text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold truncate">{t.titleNumber}</span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          (Venc: {formatDateBR(t.dueDate)})
                        </span>
                      </div>
                      <span className="text-amber-600 dark:text-amber-400 font-bold font-mono shrink-0">
                        {formatBRL(newAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cards de Opção de Ação */}
          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {/* Opção 1: Apenas este lançamento */}
            <button
              type="button"
              onClick={() => onConfirm(false)}
              className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-[#161C28] hover:bg-slate-50 dark:hover:bg-[#1a2130] text-left transition-all cursor-pointer group flex items-start gap-3"
            >
              <div className="w-4 h-4 rounded-full border-2 border-slate-400 group-hover:border-slate-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  Alterar apenas este lançamento
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Atualiza somente o título de {targetTitle.competence || formatDateBR(targetTitle.dueDate)}. Os meses seguintes permanecerão com o valor antigo.
                </div>
              </div>
            </button>

            {/* Opção 2: Este e todos os meses seguintes */}
            <button
              type="button"
              onClick={() => onConfirm(true)}
              className="p-3.5 rounded-xl border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/15 text-left transition-all cursor-pointer shadow-xs flex items-start gap-3"
            >
              <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-amber-700 dark:text-amber-300 text-xs flex items-center gap-1.5 flex-wrap">
                  <span>Alterar este e todos os {subsequentCount} meses seguintes em aberto</span>
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-extrabold px-1.5 py-0.2 rounded">
                    Recomendado
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Aplica o novo valor de <strong>{formatBRL(newAmount)}</strong> a este mês e atualiza em lote todos os lançamentos futuros em aberto.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-[#161C28] border-t border-slate-200 dark:border-[#273040] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
