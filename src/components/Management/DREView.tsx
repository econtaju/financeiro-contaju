import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  Layers, 
  ChevronRight, 
  ChevronDown, 
  Eye, 
  Info, 
  HelpCircle,
  TrendingUp,
  Percent
} from 'lucide-react';
import { ReportingEngine, DREMatrix, DRELineItem } from '../../services/reportingEngine';
import { formatBRL, formatDateBR } from '../../services/financialEngine';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';
import { FinancialTitle } from '../../types';
import { storage } from '../../services/storageService';
import { useGlobalPeriod } from '../../hooks/useGlobalPeriod';
import { GlobalPeriodBanner } from '../Common/GlobalPeriodBanner';

export const DREView: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { period } = useGlobalPeriod();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const effectiveYear = period.active ? period.year : selectedYear;
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({
    '1': true,
    '2': true,
    '3': true,
    '4': true,
    '5': true,
    '6': true,
    '7': true
  });
  const [drillDownItem, setDrillDownItem] = useState<{
    line: DRELineItem;
    monthIdx: number; // -1 for full year
    monthName: string;
    titles: FinancialTitle[];
  } | null>(null);

  const dreData = ReportingEngine.generateDRE(effectiveYear);

  const allTitles = storage.getTitles();

  const toggleExpand = (code: string) => {
    setExpandedCodes(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const handleOpenDrillDown = (line: DRELineItem, monthIdx: number) => {
    const lineTitles = allTitles.filter(t => line.matchedTitleIds?.includes(t.id));
    let matchingTitles = [...lineTitles];
    let monthName = 'Acumulado Ano';

    if (monthIdx >= 0) {
      const targetMonthStr = `${selectedYear}-${(monthIdx + 1).toString().padStart(2, '0')}`;
      matchingTitles = lineTitles.filter(t => t.competence === targetMonthStr);
      monthName = `${dreData.months[monthIdx]}/${selectedYear}`;
    }

    setDrillDownItem({
      line,
      monthIdx,
      monthName,
      titles: matchingTitles
    });
  };

  const handleExportExcel = () => {
    const headers = ['Estrutura', 'Descrição', ...dreData.months, 'Total Exercício', '% AV'];
    const grossRevenue = dreData.lines[0]?.totalYear || 1;

    const rows = dreData.lines.map(l => {
      const av = grossRevenue > 0 ? (l.totalYear / grossRevenue) * 100 : 0;
      return [
        l.code || '-',
        l.name,
        ...l.valuesByMonth,
        l.totalYear,
        `${av.toFixed(1)}%`
      ];
    });

    // Add Net Result line
    const netAV = grossRevenue > 0 ? (dreData.totalNetResult / grossRevenue) * 100 : 0;
    rows.push([
      '9',
      '(=) RESULTADO LÍQUIDO DO EXERCÍCIO',
      ...dreData.netResults,
      dreData.totalNetResult,
      `${netAV.toFixed(1)}%`
    ]);

    exportToExcel(`DRE-Gerencial-${selectedYear}`, 'DRE Gerencial', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['Estrutura', 'Descrição', ...dreData.months, 'Total Exercício'];
    const rows = dreData.lines.map(l => [
      l.code || '-',
      l.name,
      ...l.valuesByMonth,
      l.totalYear
    ]);
    exportToCSV(`DRE-Gerencial-${selectedYear}`, headers, rows);
  };

  const grossRevenue = dreData.lines[0]?.totalYear || 1;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Demonstração do Resultado do Exercício (DRE Gerencial)
            </h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Estruturado estritamente por <strong>Regime de Competência</strong>. Faturamento e despesas reconhecidos pelo período gerador.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <span className="font-semibold text-slate-700 px-2">Ano:</span>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
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
            title="Exportar para Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-700" />
            Excel
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors flex items-center shadow-2xs"
            title="Exportar para CSV"
          >
            <Download className="w-4 h-4 mr-1.5 text-slate-600" />
            CSV
          </button>
        </div>
      </div>

      {/* Global Period Banner */}
      <GlobalPeriodBanner
        moduleName="DRE Gerencial"
        matchedCount={allTitles.filter(t => t.competence?.startsWith(String(effectiveYear))).length}
        totalCount={allTitles.length}
      />

      {/* DRE Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900 uppercase tracking-wider">
              Grade Anual por Competência (R$)
            </span>
            <span className="text-slate-700">| Clique em qualquer valor para auditar a composição dos lançamentos (Drill-down)</span>
          </div>
          <span className="text-[11px] font-mono text-slate-700">Moeda: Real (BRL)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[280px] sticky left-0 bg-slate-100 z-10">Linha da DRE</th>
                {dreData.months.map(m => (
                  <th key={m} className="py-2.5 px-2.5 text-right font-mono min-w-[90px]">{m}</th>
                ))}
                <th className="py-2.5 px-3.5 text-right font-bold text-slate-900 min-w-[120px] bg-slate-200/50">
                  Total Ano
                </th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-700 min-w-[70px]">
                  % AV
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {dreData.lines.map(line => {
                const isSummary = line.isSummary;
                const isDeduction = line.type === 'DEDUCAO' || line.type === 'CUSTO' || line.type === 'DESPESA';
                const av = grossRevenue > 0 ? (line.totalYear / grossRevenue) * 100 : 0;

                return (
                  <tr 
                    key={line.id} 
                    className={`transition-colors ${
                      isSummary 
                        ? 'bg-slate-50/90 font-bold text-slate-900 border-t border-b border-slate-200' 
                        : 'hover:bg-slate-50/60 text-slate-700'
                    }`}
                  >
                    {/* Line Description with indent */}
                    <td className={`py-2 px-4 sticky left-0 z-10 ${
                      isSummary ? 'bg-slate-50 font-bold' : 'bg-white'
                    }`} style={{ paddingLeft: `${line.level * 16 + 16}px` }}>
                      <div className="flex items-center space-x-1.5 truncate max-w-xs sm:max-w-md">
                        <span className="font-mono text-[10px] text-slate-700">{line.code}</span>
                        <span className="truncate">{line.name}</span>
                      </div>
                    </td>

                    {/* Monthly Values */}
                    {line.valuesByMonth.map((val, mIdx) => (
                      <td 
                        key={mIdx} 
                        onClick={() => !isSummary && handleOpenDrillDown(line, mIdx)}
                        className={`py-2 px-2.5 text-right font-mono transition-colors ${
                          !isSummary ? 'cursor-pointer hover:bg-indigo-50/70 hover:text-indigo-900' : ''
                        } ${
                          val < 0 || (isDeduction && val > 0) ? 'text-rose-700' : val > 0 ? 'text-slate-800' : 'text-slate-700'
                        }`}
                      >
                        {val !== 0 ? formatBRL(Math.abs(val)) : '-'}
                      </td>
                    ))}

                    {/* Total Year */}
                    <td 
                      onClick={() => !isSummary && handleOpenDrillDown(line, -1)}
                      className={`py-2 px-3.5 text-right font-bold font-mono bg-slate-100/40 ${
                        !isSummary ? 'cursor-pointer hover:bg-indigo-50/70 hover:text-indigo-900' : ''
                      } ${
                        line.totalYear < 0 || (isDeduction && line.totalYear > 0) ? 'text-rose-800' : 'text-slate-900'
                      }`}
                    >
                      {formatBRL(Math.abs(line.totalYear))}
                    </td>

                    {/* Vertical Analysis (%) */}
                    <td className="py-2 px-3 text-right font-mono text-[11px] text-slate-700">
                      {line.totalYear !== 0 ? `${av.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                );
              })}

              {/* Final Net Result Row */}
              <tr className="bg-indigo-950 text-white font-extrabold border-t-2 border-indigo-900 text-xs">
                <td className="py-3 px-4 sticky left-0 bg-indigo-950 z-10">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-[10px] text-indigo-300">9</span>
                    <span>(=) RESULTADO LÍQUIDO DO EXERCÍCIO</span>
                  </div>
                </td>

                {dreData.netResults.map((net, mIdx) => (
                  <td key={mIdx} className="py-3 px-2.5 text-right font-mono text-emerald-400">
                    {formatBRL(net)}
                  </td>
                ))}

                <td className="py-3 px-3.5 text-right font-mono text-sm text-emerald-300 bg-indigo-900">
                  {formatBRL(dreData.totalNetResult)}
                </td>

                <td className="py-3 px-3 text-right font-mono text-[11px] text-indigo-200">
                  {grossRevenue > 0 ? `${((dreData.totalNetResult / grossRevenue) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Modal (Prompt Item 17) */}
      {drillDownItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
            
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  Rastreabilidade Contábil (Drill-Down DRE)
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {drillDownItem.line.code} - {drillDownItem.line.description}
                </h2>
                <div className="text-xs text-slate-700">
                  Período: <strong>{drillDownItem.monthName}</strong> • {drillDownItem.titles.length} lançamentos vinculados
                </div>
              </div>
              <button 
                onClick={() => setDrillDownItem(null)} 
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {drillDownItem.titles.length === 0 ? (
                <p className="text-slate-700 p-4 text-center bg-slate-50 rounded border border-slate-200">
                  Nenhum título detalhado compõe este período.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Título</th>
                        <th className="py-2 px-3">Descrição / Contraparte</th>
                        <th className="py-2 px-3">Competência</th>
                        <th className="py-2 px-3">Vencimento</th>
                        <th className="py-2 px-3 text-right">Valor Econômico</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {drillDownItem.titles.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{t.titleNumber}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-800">{t.description}</div>
                            <div className="text-[10px] text-slate-700">{t.originType}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-indigo-700 font-medium">{t.competence}</td>
                          <td className="py-2.5 px-3 text-slate-600">{formatDateBR(t.dueDate)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatBRL(t.originalAmount)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              t.settlementState === 'LIQUIDADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {t.settlementState}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDrillDownItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Fechar Auditoria
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
