import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, X, ShieldAlert, CheckCircle2, DollarSign, Calendar, ArrowLeftRight } from 'lucide-react';
import { FinancialTitle } from '../../types';
import { FinancialEngine, formatBRL, formatDateBR } from '../../services/financialEngine';

interface ConfirmReopenTitlesModalProps {
  isOpen: boolean;
  titles: FinancialTitle[];
  type: 'RECEBER' | 'PAGAR';
  onClose: () => void;
  onConfirmed: (reopenedCount: number, message: string) => void;
}

export const ConfirmReopenTitlesModal: React.FC<ConfirmReopenTitlesModalProps> = ({
  isOpen,
  titles,
  type,
  onClose,
  onConfirmed
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || titles.length === 0) return null;

  const isReceber = type === 'RECEBER';
  const entitySingular = isReceber ? 'recebimento' : 'pagamento';
  const entityPlural = isReceber ? 'recebimentos' : 'pagamentos';

  const totalOriginalAmount = titles.reduce((acc, t) => acc + (t.originalAmount || 0), 0);
  const totalSettledAmount = titles.reduce((acc, t) => acc + (t.settledPrincipal || 0), 0);

  const handleConfirm = () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const titleIds = titles.map(t => t.id);
      const res = FinancialEngine.reopenTitlesToOpenBatch(titleIds, reason.trim() || undefined);

      setIsSubmitting(false);

      if (res.success) {
        onConfirmed(res.reopenedCount, res.message);
        onClose();
      } else {
        setErrorMessage(res.message || 'Não foi possível reabrir os títulos selecionados.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Erro inesperado ao processar reabertura.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[var(--border-subtle)] flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {titles.length === 1 
                    ? `Voltar ${entitySingular} para Em Aberto` 
                    : `Voltar ${titles.length} ${entityPlural} para Em Aberto`}
                </h2>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Estorno de baixa e recomposição de saldo bancário
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center text-xs text-rose-700 dark:text-rose-300 font-semibold">
              <AlertTriangle className="w-4 h-4 mr-2 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Destaque das Consequências da Ação */}
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/25 rounded-xl space-y-2 text-blue-950 dark:text-blue-200">
            <div className="font-bold text-xs flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              O que acontece ao voltar para Em Aberto:
            </div>
            <ul className="text-[11px] space-y-1.5 list-disc pl-4 text-blue-900/90 dark:text-blue-200/90">
              <li>
                <strong>Desvinculação Bancária:</strong> as baixas vinculadas serão estornadas e o saldo da conta bancária será recomposto automaticamente.
              </li>
              <li>
                <strong>Restauração do Título:</strong> o valor baixado ({formatBRL(totalSettledAmount)}) voltará a ser exigível/a receber na totalidade ({formatBRL(totalOriginalAmount)}).
              </li>
              <li>
                <strong>Data de Vencimento:</strong> o título retorna à sua data de vencimento original, sendo reclassificado como <em>Vencido</em> ou <em>A Vencer</em> no painel de controle.
              </li>
            </ul>
          </div>

          {/* Resumo dos Títulos Afetados */}
          <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--surface-elevated)]/40">
            <div className="px-3.5 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between font-bold text-[11px] text-[var(--text-secondary)]">
              <span>TÍTULOS QUE VOLTARÃO A FICAR EM ABERTO ({titles.length})</span>
              <span className="font-mono text-[var(--text-primary)]">Total: {formatBRL(totalOriginalAmount)}</span>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-[var(--border-subtle)] p-1">
              {titles.map(t => (
                <div key={t.id} className="p-2 flex items-center justify-between text-[11px]">
                  <div className="min-w-0 pr-2">
                    <div className="font-mono font-bold text-[var(--text-primary)]">{t.titleNumber}</div>
                    <div className="text-[10px] text-[var(--text-secondary)] truncate">{t.description}</div>
                    <div className="text-[10px] text-slate-500">Vencimento: {formatDateBR(t.dueDate)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-[var(--text-primary)] block">
                      {formatBRL(t.originalAmount)}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      Liquidado: {formatBRL(t.settledPrincipal || t.originalAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Motivo Opcional */}
          <div>
            <label className="block font-medium text-[var(--text-secondary)] mb-1 text-[11px]">
              Motivo do Estorno / Reabertura (Opcional):
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Baixa realizada por engano / Comprovante não identificado"
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
            {isSubmitting 
              ? 'Processando Estorno...' 
              : titles.length === 1 
                ? 'Confirmar e Voltar para Aberto' 
                : `Voltar ${titles.length} para Aberto`}
          </button>
        </div>
      </div>
    </div>
  );
};
