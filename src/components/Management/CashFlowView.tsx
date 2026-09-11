import React, { useState } from 'react';
import { 
  LineChart, 
  Download, 
  FileSpreadsheet, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock,
  Layers
} from 'lucide-react';
import { ReportingEngine, CashFlowMatrix } from '../../services/reportingEngine';
import { formatBRL } from '../../services/financialEngine';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';
import { useGlobalPeriod } from '../../hooks/useGlobalPeriod';
import { GlobalPeriodBanner } from '../Common/GlobalPeriodBanner';
import { storage } from '../../services/storageService';

export const CashFlowView: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { period } = useGlobalPeriod();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [mode, setMode] = useState<'REALIZADO' | 'PROJETADO' | 'COMBINADO'>('REALIZADO');

  const effectiveYear = period.active ? period.year : selectedYear;
  const cashData = ReportingEngine.generateCashFlow(effectiveYear, mode);
  const allTitles = storage.getTitles();

  const handleExportExcel = () => {
    const headers = ['Estrutura', 'Descrição', ...cashData.months, 'Total Exercício'];
    const rows = cashData.lines.map(l => [
      l.code || '-',
      l.name,
      ...l.valuesByMonth,
      l.totalYear
    ]);
    exportToExcel(`Fluxo-Caixa-${mode}-${selectedYear}`, `Fluxo de Caixa ${mode}`, headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['Estrutura', 'Descrição', ...cashData.months, 'Total Exercício'];
    const rows = cashData.lines.map(l => [
      l.code || '-',
      l.name,
      ...l.valuesByMonth,
      l.totalYear
    ]);
    exportToCSV(`Fluxo-Caixa-${mode}-${selectedYear}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <LineChart className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Fluxo de Caixa Direto
            </h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Demonstração da liquidez financeira por regime de caixa (entradas e saídas efetivas e projetadas).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Realizado / Projetado / Combinado Toggles */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setMode('REALIZADO')}
              className={`px-3 py-1 rounded transition-colors ${
                mode === 'REALIZADO' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Realizado
            </button>
            <button
              onClick={() => setMode('PROJETADO')}
              className={`px-3 py-1 rounded transition-colors ${
                mode === 'PROJETADO' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Projetado
            </button>
            <button
              onClick={() => setMode('COMBINADO')}
              className={`px-3 py-1 rounded transition-colors ${
                mode === 'COMBINADO' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Combinado
            </button>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <span className="font-semibold text-slate-700 px-1.5">Ano:</span>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  selectedYear === y ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors flex items-center shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1 text-emerald-700" />
            Excel
          </button>
        </div>
      </div>

      {/* Global Period Banner */}
      <GlobalPeriodBanner
        moduleName="Fluxo de Caixa Direto"
        matchedCount={allTitles.filter(t => t.competence?.startsWith(String(effectiveYear))).length}
        totalCount={allTitles.length}
      />

      {/* Mode explanation banner */}
      <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-lg flex items-center justify-between text-xs text-emerald-950">
        <div className="flex items-center space-x-2">
          <Wallet className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>
            Visualizando visão <strong>{mode}</strong> do Fluxo de Caixa Direto para o exercício <strong>{selectedYear}</strong>.
          </span>
        </div>
        <span className="text-[11px] text-emerald-800">
          {mode === 'REALIZADO' 
            ? 'Considera unicamente liquidações bancárias já confirmadas'
            : mode === 'PROJETADO'
            ? 'Considera títulos abertos por data de previsão de caixa'
            : 'Unifica histórico realizado com saldo futuro projetado'}
        </span>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[280px] sticky left-0 bg-slate-100 z-10">Rubrica de Caixa</th>
                {cashData.months.map(m => (
                  <th key={m} className="py-2.5 px-2.5 text-right font-mono min-w-[90px]">{m}</th>
                ))}
                <th className="py-2.5 px-3.5 text-right font-bold text-slate-900 min-w-[120px] bg-slate-200/50">
                  Total Exercício
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {cashData.lines.map(line => {
                const isSummary = line.isSummary;
                const isFinalBalance = line.id === 'cf-final' || line.name.includes('SALDO FINAL');
                const isInitialBalance = line.id === 'cf-initial' || line.name.includes('SALDO INICIAL');
                const isOutflow = line.name.startsWith('(-)');

                return (
                  <tr 
                    key={line.id} 
                    className={`transition-colors ${
                      isFinalBalance
                        ? 'bg-emerald-950 text-white font-extrabold text-xs'
                        : isInitialBalance
                        ? 'bg-slate-100/70 font-semibold text-slate-800'
                        : isSummary 
                        ? 'bg-slate-50/90 font-bold text-slate-900' 
                        : 'hover:bg-slate-50/60 text-slate-700'
                    }`}
                  >
                    <td className={`py-2 px-4 sticky left-0 z-10 ${
                      isFinalBalance 
                        ? 'bg-emerald-950' 
                        : isSummary 
                        ? 'bg-slate-50 font-bold' 
                        : 'bg-white'
                    }`} style={{ paddingLeft: `${line.level * 16 + 16}px` }}>
                      <div className="flex items-center space-x-1.5 truncate max-w-xs sm:max-w-md">
                        {line.code && <span className="font-mono text-[10px] text-slate-700">{line.code}</span>}
                        <span className="truncate">{line.name}</span>
                      </div>
                    </td>

                    {line.valuesByMonth.map((val, mIdx) => (
                      <td 
                        key={mIdx} 
                        className={`py-2 px-2.5 text-right font-mono ${
                          isFinalBalance 
                            ? 'text-emerald-300 font-bold' 
                            : isOutflow && val > 0 
                            ? 'text-rose-700' 
                            : !isOutflow && val > 0 && !isInitialBalance
                            ? 'text-emerald-700 font-medium'
                            : 'text-slate-800'
                        }`}
                      >
                        {val !== 0 ? formatBRL(Math.abs(val)) : '-'}
                      </td>
                    ))}

                    <td className={`py-2 px-3.5 text-right font-bold font-mono ${
                      isFinalBalance 
                        ? 'bg-emerald-900 text-emerald-300 text-sm' 
                        : 'bg-slate-100/40 text-slate-900'
                    }`}>
                      {formatBRL(Math.abs(line.totalYear))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
