import React, { useState } from 'react';
import { X, CalendarClock, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatCompetence } from '../../services/financialEngine';

interface BillingGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void;
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
    onGenerated();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-indigo-50/60">
          <div className="flex items-center space-x-2">
            <CalendarClock className="w-5 h-5 text-indigo-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Geração Mensal de Cobranças
              </h2>
              <p className="text-xs text-slate-700">Faturamento em lote de contratos recorrentes</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          
          {/* Competence selection */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <label className="block font-semibold text-slate-800 mb-1">
              Competência Econômica a Faturar (Mês/Ano) *
            </label>
            <input
              type="month"
              value={competence}
              onChange={(e) => {
                setCompetence(e.target.value);
                setResults(null);
              }}
              className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 bg-white"
            />
            <p className="text-[11px] text-slate-700 mt-1.5">
              Gera títulos a receber com base nos contratos ativos. A execução é <strong>idempotente</strong>: rodar novamente não duplica cobranças da mesma competência.
            </p>
          </div>

          {/* Active contracts preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800">
                Contratos Ativos Elegíveis ({contracts.length})
              </span>
              <span className="text-slate-700">
                Total mensal: {formatBRL(FinancialEngine.calculateMRR())}
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
              {contracts.map(c => {
                const client = counterparties.find(cp => cp.id === c.customerId);
                return (
                  <div key={c.id} className="flex justify-between items-center p-2 bg-white rounded border border-slate-100 text-xs">
                    <div>
                      <div className="font-medium text-slate-900">{client?.name || 'Cliente'}</div>
                      <div className="text-[10px] text-slate-700">{c.contractNumber} • Venc. dia {c.dueDay} ({c.dueRule === 'NEXT_MONTH' ? 'mês seguinte' : 'mesmo mês'})</div>
                    </div>
                    <span className="font-semibold text-slate-800">{formatBRL(c.monthlyTotal)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results summary if executed */}
          {results && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
              <div className="flex items-center text-emerald-800 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                Faturamento processado para {formatCompetence(competence)}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="bg-white p-2 rounded border border-emerald-100">
                  <div className="text-base font-bold text-emerald-700">{results.generatedCount}</div>
                  <div className="text-[10px] text-slate-700 font-medium">Títulos Gerados</div>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-100">
                  <div className="text-base font-bold text-amber-700">{results.alreadyExistingCount}</div>
                  <div className="text-[10px] text-slate-700 font-medium">Já Existentes</div>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-100">
                  <div className="text-base font-bold text-slate-700">{results.ignoredCount}</div>
                  <div className="text-[10px] text-slate-700 font-medium">Ignorados/Fora Vigência</div>
                </div>
              </div>
              <div className="text-right text-xs font-semibold text-emerald-900 pt-1">
                Total Gerado nesta Execução: {formatBRL(results.totalAmountGenerated)}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleExecuteGeneration}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm transition-colors flex items-center"
            >
              <CalendarClock className="w-4 h-4 mr-1.5" />
              Executar Faturamento em Lote
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
