import React, { useState } from 'react';
import { X, CalendarClock, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatCompetence } from '../../services/financialEngine';

interface BillingGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (results?: {
    generatedCount: number;
    alreadyExistingCount: number;
    ignoredCount: number;
    totalAmountGenerated: number;
  }) => void;
}

export const BillingGenerationModal: React.FC<BillingGenerationModalProps> = ({
  isOpen,
  onClose,
  onGenerated
}) => {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  const [competence, setCompetence] = useState(currentMonth);
  const [results, setResults] = useState<{
    generatedCount: number;
    alreadyExistingCount: number;
    ignoredCount: number;
    totalAmountGenerated: number;
  } | null>(null);

  const contracts = storage.getContracts().filter(c => c.status === 'ATIVO');
  const counterparties = storage.getCounterparties();

  const handleExecuteGeneration = () => {
    const res = FinancialEngine.generateContractBilling(competence);
    setResults(res);
    onGenerated(res);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[var(--border-subtle)] animate-in fade-in zoom-in-95">
        
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Faturamento Mensal de Contratos Recorrentes
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">Geração automática em lote de mensalidades</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          
          {/* Competence selection */}
          <div className="bg-[var(--surface-elevated)] p-4 rounded-xl border border-[var(--border-subtle)]">
            <label className="block font-semibold text-[var(--text-primary)] mb-1">
              Competência Econômica a Faturar (Mês/Ano) *
            </label>
            <input
              type="month"
              value={competence}
              onChange={(e) => {
                setCompetence(e.target.value);
                setResults(null);
              }}
              className="w-full rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-card)] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              Gera títulos a receber com base nos contratos ativos. A execução é <strong>idempotente</strong>: rodar novamente não duplica cobranças da mesma competência.
            </p>
          </div>

          {/* Active contracts preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-[var(--text-primary)]">
                Contratos Ativos Elegíveis ({contracts.length})
              </span>
              <span className="text-[var(--text-secondary)] font-mono font-medium">
                Total mensal: <strong className="text-[var(--text-primary)]">{formatBRL(FinancialEngine.calculateMRR())}</strong>
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-[var(--border-subtle)] rounded-xl p-2 bg-[var(--surface-elevated)]/40">
              {contracts.length === 0 ? (
                <div className="p-4 text-center text-[var(--text-secondary)] italic">
                  Nenhum contrato ativo cadastrado para faturamento automático.
                </div>
              ) : (
                contracts.map(c => {
                  const client = counterparties.find(cp => cp.id === c.customerId);
                  return (
                    <div key={c.id} className="flex justify-between items-center p-2.5 bg-[var(--surface-card)] rounded-lg border border-[var(--border-subtle)] text-xs">
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{client?.name || 'Cliente'}</div>
                        <div className="text-[10px] text-[var(--text-secondary)]">{c.contractNumber} • Venc. dia {c.dueDay} ({c.dueRule === 'NEXT_MONTH' ? 'mês seguinte' : 'mesmo mês'})</div>
                      </div>
                      <span className="font-bold font-mono text-[var(--text-primary)]">{formatBRL(c.monthlyTotal)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Results summary if executed */}
          {results && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center text-emerald-800 dark:text-emerald-300 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                Faturamento processado para {formatCompetence(competence)}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="bg-[var(--surface-card)] p-2.5 rounded-lg border border-emerald-500/20">
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{results.generatedCount}</div>
                  <div className="text-[10px] text-[var(--text-secondary)] font-medium">Títulos Gerados</div>
                </div>
                <div className="bg-[var(--surface-card)] p-2.5 rounded-lg border border-amber-500/20">
                  <div className="text-base font-bold text-amber-600 dark:text-amber-400">{results.alreadyExistingCount}</div>
                  <div className="text-[10px] text-[var(--text-secondary)] font-medium">Já Existentes</div>
                </div>
                <div className="bg-[var(--surface-card)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                  <div className="text-base font-bold text-[var(--text-secondary)]">{results.ignoredCount}</div>
                  <div className="text-[10px] text-[var(--text-secondary)] font-medium">Ignorados/Fora Vigência</div>
                </div>
              </div>
              <div className="text-right text-xs font-semibold text-emerald-800 dark:text-emerald-300 pt-1">
                Total Gerado nesta Execução: <span className="font-mono font-bold">{formatBRL(results.totalAmountGenerated)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleExecuteGeneration}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarClock className="w-4 h-4" />
              <span>Executar Faturamento em Lote</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
