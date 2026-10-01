import React from 'react';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import { MonthSummary } from '../../services/contaAzulMappingEngine';
import { formatBRL } from '../../services/financialEngine';

interface ImportMonthlySummaryBarProps {
  monthlySummaries: MonthSummary[];
  selectedMonth: string; // 'ALL' or '2026-01'
  onSelectMonth: (monthKey: string) => void;
  onApproveMonth: (monthKey: string) => void;
  onDeselectMonth: (monthKey: string) => void;
  onSetMonthType: (monthKey: string, type: 'RECEBER' | 'PAGAR') => void;
}

export const ImportMonthlySummaryBar: React.FC<ImportMonthlySummaryBarProps> = ({
  monthlySummaries,
  selectedMonth,
  onSelectMonth,
  onApproveMonth,
  onDeselectMonth,
  onSetMonthType
}) => {
  // Active summary metrics (either specific month or consolidated annual)
  const activeSummary = React.useMemo(() => {
    if (monthlySummaries.length === 0) return null;
    if (selectedMonth === 'ALL') {
      const totalTitles = monthlySummaries.reduce((a, b) => a + b.totalTitles, 0);
      const receivablesCount = monthlySummaries.reduce((a, b) => a + b.receivablesCount, 0);
      const payablesCount = monthlySummaries.reduce((a, b) => a + b.payablesCount, 0);
      const totalReceivables = monthlySummaries.reduce((a, b) => a + b.totalReceivables, 0);
      const totalPayables = monthlySummaries.reduce((a, b) => a + b.totalPayables, 0);
      const netBalance = totalReceivables - totalPayables;
      const totalSettled = monthlySummaries.reduce((a, b) => a + b.totalSettled, 0);
      const totalOpen = monthlySummaries.reduce((a, b) => a + b.totalOpen, 0);
      const errorCount = monthlySummaries.reduce((a, b) => a + b.errorCount, 0);
      const selectedCount = monthlySummaries.reduce((a, b) => a + b.selectedCount, 0);

      return {
        label: `Consolidado Anual (${monthlySummaries.length} Meses)`,
        totalTitles,
        receivablesCount,
        payablesCount,
        totalReceivables,
        totalPayables,
        netBalance,
        totalSettled,
        totalOpen,
        errorCount,
        selectedCount
      };
    }

    const found = monthlySummaries.find(m => m.monthKey === selectedMonth);
    return found || monthlySummaries[0];
  }, [monthlySummaries, selectedMonth]);

  if (monthlySummaries.length === 0 || !activeSummary) return null;

  const isPositiveNet = activeSummary.netBalance >= 0;

  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4 space-y-4">
      {/* Header com Navegação em Abas por Mês */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Separação Mensal & Resumos da Importação
          </span>
          {monthlySummaries.length > 1 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Planilha Anual ({monthlySummaries.length} meses)
            </span>
          )}
        </div>

        {/* Ações em Lote para o Período Selecionado */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-[var(--text-secondary)] mr-1">Ações no Período:</span>
          <button
            type="button"
            onClick={() => onApproveMonth(selectedMonth)}
            className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold flex items-center transition-colors"
            title="Selecionar e aprovar todas as linhas válidas deste mês"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Aprovar Período
          </button>
          <button
            type="button"
            onClick={() => onDeselectMonth(selectedMonth)}
            className="px-2 py-1 bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-lg text-[11px] font-semibold transition-colors"
          >
            Desmarcar
          </button>
          <div className="h-4 w-px bg-[var(--border-subtle)] mx-1" />
          <button
            type="button"
            onClick={() => onSetMonthType(selectedMonth, 'RECEBER')}
            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-lg text-[11px] font-medium flex items-center transition-colors"
            title="Definir todas as linhas deste período como Receitas"
          >
            <TrendingUp className="w-3 h-3 mr-1 text-emerald-400" />
            Todas Receita
          </button>
          <button
            type="button"
            onClick={() => onSetMonthType(selectedMonth, 'PAGAR')}
            className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg text-[11px] font-medium flex items-center transition-colors"
            title="Definir todas as linhas deste período como Despesas"
          >
            <TrendingDown className="w-3 h-3 mr-1 text-rose-400" />
            Todas Despesa
          </button>
        </div>
      </div>

      {/* Abas Horizontais com Seletor de Meses */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <button
          type="button"
          onClick={() => onSelectMonth('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 shrink-0 ${
            selectedMonth === 'ALL'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Visão Consolidada Anual</span>
          <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
            selectedMonth === 'ALL' ? 'bg-slate-950/20 text-slate-950' : 'bg-[var(--surface-card)] text-[var(--text-secondary)]'
          }`}>
            {monthlySummaries.reduce((a, b) => a + b.totalTitles, 0)}
          </span>
        </button>

        {monthlySummaries.map(m => {
          const isSelected = selectedMonth === m.monthKey;
          const monthNet = m.totalReceivables - m.totalPayables;

          return (
            <button
              key={m.monthKey}
              type="button"
              onClick={() => onSelectMonth(m.monthKey)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-2 shrink-0 border ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-bold'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
              }`}
            >
              <span>{m.label}</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-[var(--surface-card)] text-[var(--text-secondary)]'
              }`}>
                {m.totalTitles}
              </span>
              {m.receivablesCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title={`${m.receivablesCount} receitas`} />
              )}
              {m.payablesCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title={`${m.payablesCount} despesas`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Cards de Resumo Matemático do Período Selecionado */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
        {/* Receitas */}
        <div className="bg-[var(--surface-elevated)] p-3 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Receitas (A Receber)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 rounded-md font-bold">
              {activeSummary.receivablesCount} títulos
            </span>
          </div>
          <div className="mt-2 text-base sm:text-lg font-bold text-emerald-400 font-mono">
            {formatBRL(activeSummary.totalReceivables)}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            Entradas operacionais
          </span>
        </div>

        {/* Despesas */}
        <div className="bg-[var(--surface-elevated)] p-3 rounded-xl border border-rose-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 flex items-center">
              <TrendingDown className="w-3.5 h-3.5 mr-1 text-rose-400" />
              Despesas (A Pagar)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-rose-500/10 text-rose-400 rounded-md font-bold">
              {activeSummary.payablesCount} títulos
            </span>
          </div>
          <div className="mt-2 text-base sm:text-lg font-bold text-rose-400 font-mono">
            {formatBRL(activeSummary.totalPayables)}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            Saídas e custos
          </span>
        </div>

        {/* Resultado Líquido do Período */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between ${
          isPositiveNet
            ? 'bg-emerald-500/5 border-emerald-500/30'
            : 'bg-rose-500/5 border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold flex items-center ${isPositiveNet ? 'text-emerald-400' : 'text-rose-400'}`}>
              <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
              Resultado Líquido
            </span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
              isPositiveNet ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {isPositiveNet ? 'Superávit' : 'Déficit'}
            </span>
          </div>
          <div className={`mt-2 text-base sm:text-lg font-bold font-mono ${isPositiveNet ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatBRL(activeSummary.netBalance)}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            Receitas - Despesas
          </span>
        </div>

        {/* Baixado / Liquidado */}
        <div className="bg-[var(--surface-elevated)] p-3 rounded-xl border border-[var(--border-subtle)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-400 flex items-center">
              <DollarSign className="w-3.5 h-3.5 mr-1 text-blue-400" />
              Baixado / Liquidado
            </span>
          </div>
          <div className="mt-2 text-base sm:text-lg font-bold text-blue-400 font-mono">
            {formatBRL(activeSummary.totalSettled)}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            Realizações automáticas
          </span>
        </div>

        {/* Saldo a Vencer / Aberto */}
        <div className="bg-[var(--surface-elevated)] p-3 rounded-xl border border-[var(--border-subtle)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" />
              Saldo em Aberto
            </span>
          </div>
          <div className="mt-2 text-base sm:text-lg font-bold text-amber-400 font-mono">
            {formatBRL(activeSummary.totalOpen)}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            Projeção pendente
          </span>
        </div>
      </div>
    </div>
  );
};
