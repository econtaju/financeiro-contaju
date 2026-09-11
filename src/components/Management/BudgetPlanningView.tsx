import React, { useState, useMemo } from 'react';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Save, 
  RefreshCw, 
  Copy, 
  Percent, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  FileSpreadsheet,
  Table,
  SlidersHorizontal,
  Check,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { storage } from '../../services/storageService';
import { formatBRL } from '../../services/financialEngine';
import { BudgetEngine, BudgetHierarchyLine } from '../../services/budgetEngine';
import { AnnualBudgetPlan } from '../../types';
import { exportToExcel } from '../../utils/exportUtils';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

type AnnualMetricMode = 'ORC_VS_REAL' | 'PLANNED_ONLY' | 'REALIZED_ONLY' | 'VARIANCE_ONLY';

export const BudgetPlanningView: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth(); // 0..11

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activeTab, setActiveTab] = useState<'ANNUAL_12M' | 'COMPARISON' | 'PLANNING'>('ANNUAL_12M');
  const [annualMetricMode, setAnnualMetricMode] = useState<AnnualMetricMode>('ORC_VS_REAL');
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [natureFilter, setNatureFilter] = useState<'ALL' | 'RECEITAS' | 'DESPESAS'>('ALL');
  const [isFitScreen, setIsFitScreen] = useState<boolean>(true); // Enquadrado na tela sem rolagem por padrão
  const [useCompactNumbers, setUseCompactNumbers] = useState<boolean>(true); // Abreviação compacta k/M para enquadramento perfeito
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({
    '1': true,
    '2': true,
    '3': true,
    '4': true,
    '5': true
  });

  // Helper para formatar números compactos na visão enquadrada
  const formatCompactBRL = (amount: number): string => {
    if (!amount || Math.abs(amount) < 0.01) return '-';
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 1_000_000) {
      return `${sign}${(abs / 1_000_000).toFixed(1).replace('.', ',')}M`;
    }
    if (abs >= 1_000) {
      return `${sign}${(abs / 1_000).toFixed(1).replace('.', ',')}k`;
    }
    return `${sign}${Math.round(abs).toString()}`;
  };

  // Local draft of the budget plan for the planning mode
  const [editingPlan, setEditingPlan] = useState<AnnualBudgetPlan>(() => {
    return storage.getBudgetPlan(currentYear);
  });

  // Quick batch adjustment state
  const [batchPercent, setBatchPercent] = useState<number>(5);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Reload budget plan when year changes
  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    const p = storage.getBudgetPlan(newYear);
    setEditingPlan(p);
  };

  // Get live comparison data from BudgetEngine
  const comparisonData = useMemo(() => {
    const monthFilter = selectedMonth === 'ALL' ? undefined : selectedMonth;
    return BudgetEngine.getBudgetComparison(selectedYear, monthFilter);
  }, [selectedYear, selectedMonth]);

  // Always get full annual data for the 12-month matrix view
  const fullYearData = useMemo(() => {
    return BudgetEngine.getBudgetComparison(selectedYear, undefined);
  }, [selectedYear]);

  const { lines, kpis } = comparisonData;
  const accounts = useMemo(() => storage.getChartAccounts(), []);
  const currentUser = storage.getCurrentUser();

  // Filter lines by search and nature
  const filterHierarchyLines = (srcLines: BudgetHierarchyLine[]) => {
    return srcLines.filter(line => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = line.name.toLowerCase().includes(query);
        const matchesCode = line.code?.toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }

      // Nature filter
      if (natureFilter === 'RECEITAS') {
        if (line.id.startsWith('grp-3') || line.id.startsWith('grp-4') || line.id === 'grp-2-deduc' || line.id.startsWith('grp-cost') || line.id.startsWith('grp-exp')) {
          return false;
        }
      } else if (natureFilter === 'DESPESAS') {
        if (line.id === 'grp-1' || line.id === 'sub-net-rev' || line.id === 'sub-gross-profit') {
          return false;
        }
      }

      return true;
    });
  };

  const filteredComparisonLines = useMemo(() => {
    return filterHierarchyLines(lines);
  }, [lines, searchQuery, natureFilter]);

  const filteredAnnualLines = useMemo(() => {
    return filterHierarchyLines(fullYearData.lines);
  }, [fullYearData.lines, searchQuery, natureFilter]);

  // Aggregate monthly totals for summary ribbon (12 months)
  const monthlySummaryRibbon = useMemo(() => {
    const revenueLine = fullYearData.lines.find(l => l.id === 'grp-1');
    const netIncomeLine = fullYearData.lines.find(l => l.id === 'sub-final-net');
    const costsLine = fullYearData.lines.find(l => l.id === 'grp-3-custos');
    const opExpLine = fullYearData.lines.find(l => l.id === 'grp-4-op');

    const revPlanned = revenueLine ? revenueLine.plannedMonthly : new Array(12).fill(0);
    const revRealized = revenueLine ? revenueLine.realizedMonthly : new Array(12).fill(0);

    const netPlanned = netIncomeLine ? netIncomeLine.plannedMonthly : new Array(12).fill(0);
    const netRealized = netIncomeLine ? netIncomeLine.realizedMonthly : new Array(12).fill(0);

    const expPlanned = new Array(12).fill(0);
    const expRealized = new Array(12).fill(0);
    for (let i = 0; i < 12; i++) {
      expPlanned[i] = (costsLine?.plannedMonthly[i] || 0) + (opExpLine?.plannedMonthly[i] || 0);
      expRealized[i] = (costsLine?.realizedMonthly[i] || 0) + (opExpLine?.realizedMonthly[i] || 0);
    }

    return {
      revPlanned,
      revRealized,
      expPlanned,
      expRealized,
      netPlanned,
      netRealized
    };
  }, [fullYearData]);

  // Toggle tree expand/collapse
  const toggleExpand = (code: string) => {
    setExpandedCodes(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    fullYearData.lines.forEach(l => {
      if (l.code) allExpanded[l.code] = true;
    });
    setExpandedCodes(allExpanded);
  };

  const collapseAll = () => {
    setExpandedCodes({});
  };

  // -------------------------------------------------------------
  // Budget Planning Editing Handlers
  // -------------------------------------------------------------
  const handlePlannedValueChange = (accountId: string, monthIdx: number, valueStr: string) => {
    const numVal = parseFloat(valueStr) || 0;
    const items = [...editingPlan.items];
    const itemIndex = items.findIndex(i => i.accountId === accountId);

    if (itemIndex >= 0) {
      const updatedMonthly = [...items[itemIndex].monthlyPlanned];
      updatedMonthly[monthIdx] = numVal;
      items[itemIndex] = { ...items[itemIndex], monthlyPlanned: updatedMonthly };
    } else {
      const newMonthly = new Array(12).fill(0);
      newMonthly[monthIdx] = numVal;
      items.push({ accountId, monthlyPlanned: newMonthly });
    }

    setEditingPlan({ ...editingPlan, items });
  };

  const handleReplicateMonth = (accountId: string, sourceMonth: number) => {
    const updated = BudgetEngine.replicateMonthValue(editingPlan, accountId, sourceMonth);
    setEditingPlan(updated);
    setSaveSuccessMessage('Valor replicado com sucesso para os 12 meses!');
    setTimeout(() => setSaveSuccessMessage(null), 2500);
  };

  const handleApplyBatchPercent = (accountId?: string) => {
    const updated = BudgetEngine.applyPercentageAdjustment(editingPlan, batchPercent, accountId);
    setEditingPlan(updated);
    setSaveSuccessMessage(`Reajuste de ${batchPercent > 0 ? '+' : ''}${batchPercent}% aplicado com sucesso!`);
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleImportFromRealized = () => {
    if (!window.confirm(`Deseja preencher as metas de ${selectedYear} com base nos lançamentos contábeis já apurados no sistema?`)) {
      return;
    }
    const autoPlan = BudgetEngine.createFromRealized(selectedYear);
    setEditingPlan(autoPlan);
    setSaveSuccessMessage('Valores realizados importados para o orçamento de trabalho!');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleSaveBudgetPlan = () => {
    storage.saveBudgetPlan(editingPlan);
    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'ATUALIZACAO_ORCAMENTO',
      module: 'Planejamento Orçamentário',
      recordId: editingPlan.id,
      details: `Atualização e gravação das metas orçamentárias anuais para o exercício ${selectedYear}.`
    });

    setSaveSuccessMessage(`Orçamento de ${selectedYear} salvo com sucesso!`);
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Helper to get planned array for account from editingPlan
  const getEditingPlannedArray = (accId: string): number[] => {
    const item = editingPlan.items.find(i => i.accountId === accId);
    return item?.monthlyPlanned || new Array(12).fill(0);
  };

  // Export handlers
  const handleExportComparisonExcel = () => {
    const headers = [
      'Código', 
      'Conta / Grupo', 
      'Orçado (R$)', 
      'Realizado (R$)', 
      'Desvio Nominal (R$)', 
      'Desvio (%)', 
      'Atingimento (%)', 
      'Status'
    ];
    const rows = filteredComparisonLines.map(line => [
      line.code || '',
      line.name,
      line.plannedTotal,
      line.realizedTotal,
      line.varianceNominal,
      line.variancePercent.toFixed(2) + '%',
      line.executionRate.toFixed(2) + '%',
      line.favorableStatus
    ]);

    exportToExcel(
      `Planejamento_Orcamentario_Vs_Realizado_${selectedYear}`,
      'Orcado_vs_Realizado',
      headers,
      rows
    );
  };

  const handleExportMatrixExcel = () => {
    const headers = [
      'Código', 
      'Conta / Grupo', 
      'Orçado Anual (R$)', 
      'Realizado Anual (R$)', 
      'Desvio Anual (R$)', 
      ...MONTH_SHORT.map(m => `${m} Orçado`), 
      ...MONTH_SHORT.map(m => `${m} Realizado`),
      ...MONTH_SHORT.map(m => `${m} Desvio`)
    ];
    const rows = fullYearData.lines.map(line => {
      const devMonthly = line.realizedMonthly.map((r, i) => r - (line.plannedMonthly[i] || 0));
      return [
        line.code || '',
        line.name,
        line.plannedTotal,
        line.realizedTotal,
        line.varianceNominal,
        ...line.plannedMonthly,
        ...line.realizedMonthly,
        ...devMonthly
      ];
    });

    exportToExcel(
      `Matriz_Orcamento_12_Meses_${selectedYear}`,
      'Matriz_12_Meses',
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6 pb-12 w-full text-[var(--text-primary)]">
      {/* Toast Notification */}
      {saveSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 border border-emerald-400/40 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold">{saveSuccessMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--surface-card)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  Planejamento Orçamentário Anual
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  Exercício {selectedYear}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Definição de metas orçamentárias com visualização anual completa dos 12 meses lado a lado e acompanhamento contábil em tempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Year Selector & Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1 bg-[var(--surface-elevated)] p-1 rounded-xl border border-[var(--border-subtle)]">
            <Calendar className="w-4 h-4 text-cyan-400 ml-2 mr-1" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Ano:</span>
            {[currentYear - 1, currentYear, currentYear + 1].map(yr => (
              <button
                key={yr}
                onClick={() => handleYearChange(yr)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedYear === yr
                    ? 'bg-cyan-400 text-[#071321] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)]'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          <button
            onClick={activeTab === 'PLANNING' ? handleExportMatrixExcel : handleExportComparisonExcel}
            className="px-3.5 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl text-xs font-semibold flex items-center transition-colors shadow-xs"
            title="Exportar matriz orçamentária para planilha Excel"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            Exportar Excel
          </button>

          {activeTab === 'PLANNING' && (
            <button
              onClick={handleSaveBudgetPlan}
              className="px-4 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-[#071321] rounded-xl text-xs font-bold flex items-center transition-all shadow-[0_0_12px_rgba(99,217,255,0.25)]"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Salvar Orçamento
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap border-b border-[var(--border-subtle)] gap-2 sm:gap-6">
        <button
          onClick={() => setActiveTab('ANNUAL_12M')}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'ANNUAL_12M'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Visão Anual (12 Meses Lado a Lado)</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Completo
          </span>
        </button>

        <button
          onClick={() => setActiveTab('COMPARISON')}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'COMPARISON'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Comparativo Mensal & Desvios</span>
        </button>

        <button
          onClick={() => setActiveTab('PLANNING')}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'PLANNING'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Elaboração de Metas (Grade 12M Editável)</span>
        </button>
      </div>

      {/* Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Receita Bruta */}
        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Receita Bruta
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              kpis.revenueExecutionRate >= 98 
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}>
              {kpis.revenueExecutionRate.toFixed(1)}% Realizado
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Orçado: <span className="font-semibold text-[var(--text-primary)]">{formatBRL(kpis.totalPlannedRevenue)}</span>
              </p>
              <p className="text-xl font-bold text-[var(--text-primary)] font-mono mt-0.5">
                {formatBRL(kpis.totalRealizedRevenue)}
              </p>
            </div>
            <div className={`text-right text-xs font-semibold ${kpis.revenueVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <div className="flex items-center justify-end font-mono">
                {kpis.revenueVariance >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                {formatBRL(Math.abs(kpis.revenueVariance))}
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] font-sans">
                {kpis.revenueVariance >= 0 ? 'Superávit' : 'Déficit'}
              </span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-[var(--surface-elevated)] h-1.5 rounded-full mt-3 overflow-hidden border border-[var(--border-subtle)]">
            <div 
              className={`h-full rounded-full transition-all ${kpis.revenueExecutionRate >= 98 ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, Math.max(0, kpis.revenueExecutionRate))}%` }}
            />
          </div>
        </div>

        {/* 2. Custos e Despesas */}
        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Custos & Despesas
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              kpis.costsExpensesExecutionRate <= 100 
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}>
              {kpis.costsExpensesExecutionRate.toFixed(1)}% Consumido
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Orçado: <span className="font-semibold text-[var(--text-primary)]">{formatBRL(kpis.totalPlannedCostsAndExpenses)}</span>
              </p>
              <p className="text-xl font-bold text-[var(--text-primary)] font-mono mt-0.5">
                {formatBRL(kpis.totalRealizedCostsAndExpenses)}
              </p>
            </div>
            <div className={`text-right text-xs font-semibold ${kpis.costsExpensesVariance <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <div className="flex items-center justify-end font-mono">
                {kpis.costsExpensesVariance <= 0 ? <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> : <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
                {formatBRL(Math.abs(kpis.costsExpensesVariance))}
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] font-sans">
                {kpis.costsExpensesVariance <= 0 ? 'Economia' : 'Estouro'}
              </span>
            </div>
          </div>
          <div className="w-full bg-[var(--surface-elevated)] h-1.5 rounded-full mt-3 overflow-hidden border border-[var(--border-subtle)]">
            <div 
              className={`h-full rounded-full transition-all ${kpis.costsExpensesExecutionRate <= 100 ? 'bg-cyan-400' : 'bg-rose-400'}`}
              style={{ width: `${Math.min(100, Math.max(0, kpis.costsExpensesExecutionRate))}%` }}
            />
          </div>
        </div>

        {/* 3. Lucro Líquido */}
        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Lucro Líquido
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              kpis.netIncomeVariance >= 0 
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}>
              {kpis.netIncomeExecutionRate.toFixed(1)}% da Meta
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Meta: <span className="font-semibold text-[var(--text-primary)]">{formatBRL(kpis.plannedNetIncome)}</span>
              </p>
              <p className="text-xl font-bold text-[var(--text-primary)] font-mono mt-0.5">
                {formatBRL(kpis.realizedNetIncome)}
              </p>
            </div>
            <div className={`text-right text-xs font-semibold ${kpis.netIncomeVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <div className="flex items-center justify-end font-mono">
                {kpis.netIncomeVariance >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                {formatBRL(Math.abs(kpis.netIncomeVariance))}
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] font-sans">
                {kpis.netIncomeVariance >= 0 ? 'Acima da Meta' : 'Abaixo da Meta'}
              </span>
            </div>
          </div>
          <div className="w-full bg-[var(--surface-elevated)] h-1.5 rounded-full mt-3 overflow-hidden border border-[var(--border-subtle)]">
            <div 
              className={`h-full rounded-full transition-all ${kpis.netIncomeVariance >= 0 ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, Math.max(0, kpis.netIncomeExecutionRate))}%` }}
            />
          </div>
        </div>

        {/* 4. Margem Líquida */}
        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Margem Líquida
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              Rentabilidade
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Orçada: <span className="font-semibold text-[var(--text-primary)]">
                  {kpis.totalPlannedRevenue > 0 ? ((kpis.plannedNetIncome / kpis.totalPlannedRevenue) * 100).toFixed(1) : 0}%
                </span>
              </p>
              <p className="text-xl font-bold text-cyan-400 font-mono mt-0.5">
                {kpis.totalRealizedRevenue > 0 ? ((kpis.realizedNetIncome / kpis.totalRealizedRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="text-right text-xs font-semibold">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Exercício {selectedYear}
              </span>
              <p className="text-[10px] text-[var(--text-secondary)]">Competência</p>
            </div>
          </div>
          <div className="w-full bg-[var(--surface-elevated)] h-1.5 rounded-full mt-3 overflow-hidden border border-[var(--border-subtle)]">
            <div 
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{ 
                width: `${Math.min(100, Math.max(0, kpis.totalRealizedRevenue > 0 ? (kpis.realizedNetIncome / kpis.totalRealizedRevenue) * 100 : 0))}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ANNUAL 12-MONTH SIDE-BY-SIDE VIEW (VISUAL ANUAL 12 MESES LADO A LADO) */}
      {/* ========================================================================= */}
      {activeTab === 'ANNUAL_12M' && (
        <div className="space-y-4">
          {/* Controls Bar for 12-Month Matrix */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
            {/* Metric Mode Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                Métrica das Colunas:
              </span>
              <button
                onClick={() => setAnnualMetricMode('ORC_VS_REAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center ${
                  annualMetricMode === 'ORC_VS_REAL'
                    ? 'bg-cyan-400 text-[#071321] shadow-xs'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }`}
              >
                Orçado x Realizado
              </button>
              <button
                onClick={() => setAnnualMetricMode('PLANNED_ONLY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  annualMetricMode === 'PLANNED_ONLY'
                    ? 'bg-cyan-400 text-[#071321] shadow-xs'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }`}
              >
                Metas Orçadas
              </button>
              <button
                onClick={() => setAnnualMetricMode('REALIZED_ONLY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  annualMetricMode === 'REALIZED_ONLY'
                    ? 'bg-cyan-400 text-[#071321] shadow-xs'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }`}
              >
                Valores Realizados
              </button>
              <button
                onClick={() => setAnnualMetricMode('VARIANCE_ONLY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  annualMetricMode === 'VARIANCE_ONLY'
                    ? 'bg-cyan-400 text-[#071321] shadow-xs'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }`}
              >
                Desvios (R$ e %)
              </button>
            </div>

            {/* Filter and expand controls */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Buscar conta..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-cyan-400 focus:outline-hidden w-full sm:w-44"
                />
              </div>

              <select
                value={natureFilter}
                onChange={e => setNatureFilter(e.target.value as any)}
                aria-label="Filtrar contas por natureza"
                className="px-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-semibold text-[var(--text-primary)] focus:border-cyan-400 focus:outline-hidden"
              >
                <option value="ALL">Todas as Contas</option>
                <option value="RECEITAS">Apenas Receitas</option>
                <option value="DESPESAS">Custos e Despesas</option>
              </select>

              <button
                onClick={expandAll}
                className="px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-elevated)]"
                title="Expandir todos os grupos"
              >
                Expandir
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-elevated)]"
                title="Recolher todos os grupos"
              >
                Recolher
              </button>

              {/* Toggle Enquadrado na Tela (100% Sem Rolagem) */}
              <button
                onClick={() => setIsFitScreen(!isFitScreen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center shadow-xs ${
                  isFitScreen
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                }`}
                title={isFitScreen ? "Desativar enquadramento (ativar rolagem horizontal)" : "Enquadrar os 12 meses na tela sem precisar rolar"}
              >
                {isFitScreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                    Enquadrado na Tela
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 mr-1.5 text-[var(--text-secondary)]" />
                    Grade Expandida
                  </>
                )}
              </button>

              {/* Toggle Compact Numbers (k/M) vs Full Currency */}
              {isFitScreen && (
                <button
                  onClick={() => setUseCompactNumbers(!useCompactNumbers)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    useCompactNumbers
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Alternar entre números compactos (k/M) e valores monetários inteiros"
                >
                  {useCompactNumbers ? 'Compacto (k)' : 'R$ Inteiro'}
                </button>
              )}

              <button
                onClick={handleExportMatrixExcel}
                className="px-3 py-1.5 text-xs font-semibold text-cyan-400 border border-cyan-500/30 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 flex items-center transition-colors"
                title="Exportar grade dos 12 meses para Excel"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Planilha 12M
              </button>
            </div>
          </div>

          {/* Consolidated 12-Month Executive Summary Ribbon */}
          <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-xs p-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                Resumo Consolidado Mês a Mês ({selectedYear})
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                {isFitScreen ? 'Visão anual panorâmica enquadrada na tela' : `Coluna destacada = Mês focal corrente (${MONTH_NAMES[currentMonthIndex]})`}
              </span>
            </div>

            <div className={`${isFitScreen ? 'overflow-x-hidden' : 'overflow-x-auto'} pb-1`}>
              <table className={`w-full text-left border-collapse text-xs ${isFitScreen ? 'table-fixed' : 'min-w-[900px]'}`}>
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)]">
                    <th className={`py-2 px-2.5 sticky left-0 bg-[var(--surface-card)] z-10 ${isFitScreen ? 'w-[20%]' : 'min-w-[160px]'}`}>
                      Linha Mestra
                    </th>
                    <th className={`py-2 px-1.5 text-right font-bold text-[var(--text-primary)] bg-[var(--surface-elevated)] ${isFitScreen ? 'w-[9%]' : 'min-w-[110px]'}`}>
                      Total Anual
                    </th>
                    {MONTH_SHORT.map((m, idx) => {
                      const isCurrent = idx === currentMonthIndex && selectedYear === currentYear;
                      return (
                        <th 
                          key={m} 
                          className={`py-2 px-1 text-right ${isFitScreen ? 'w-[5.8%]' : 'min-w-[85px]'} ${
                            isCurrent ? 'bg-cyan-500/10 text-cyan-300 font-bold border-x border-cyan-500/20' : ''
                          }`}
                        >
                          {m}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-[11px]">
                  {/* Receita Bruta */}
                  <tr className="hover:bg-[var(--surface-elevated)]/50 transition-colors">
                    <td className={`py-2 px-2.5 font-sans font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--surface-card)] z-10 border-r border-[var(--border-subtle)] ${isFitScreen ? 'truncate' : ''}`}>
                      Receita Bruta (R$)
                    </td>
                    <td className="py-2 px-1.5 text-right font-bold text-emerald-400 bg-[var(--surface-elevated)]" title={formatBRL(monthlySummaryRibbon.revRealized.reduce((a, b) => a + b, 0))}>
                      {isFitScreen && useCompactNumbers 
                        ? formatCompactBRL(monthlySummaryRibbon.revRealized.reduce((a, b) => a + b, 0))
                        : formatBRL(monthlySummaryRibbon.revRealized.reduce((a, b) => a + b, 0))}
                    </td>
                    {monthlySummaryRibbon.revRealized.map((val, idx) => {
                      const isCurrent = idx === currentMonthIndex && selectedYear === currentYear;
                      return (
                        <td key={idx} className={`py-2 px-1 text-right text-[var(--text-primary)] ${isCurrent ? 'bg-cyan-500/10 font-bold border-x border-cyan-500/20' : ''}`} title={formatBRL(val)}>
                          {isFitScreen && useCompactNumbers ? formatCompactBRL(val) : formatBRL(val)}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Custos e Despesas */}
                  <tr className="hover:bg-[var(--surface-elevated)]/50 transition-colors">
                    <td className={`py-2 px-2.5 font-sans font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--surface-card)] z-10 border-r border-[var(--border-subtle)] ${isFitScreen ? 'truncate' : ''}`}>
                      Custos & Despesas (R$)
                    </td>
                    <td className="py-2 px-1.5 text-right font-bold text-rose-400 bg-[var(--surface-elevated)]" title={formatBRL(monthlySummaryRibbon.expRealized.reduce((a, b) => a + b, 0))}>
                      {isFitScreen && useCompactNumbers 
                        ? formatCompactBRL(monthlySummaryRibbon.expRealized.reduce((a, b) => a + b, 0))
                        : formatBRL(monthlySummaryRibbon.expRealized.reduce((a, b) => a + b, 0))}
                    </td>
                    {monthlySummaryRibbon.expRealized.map((val, idx) => {
                      const isCurrent = idx === currentMonthIndex && selectedYear === currentYear;
                      return (
                        <td key={idx} className={`py-2 px-1 text-right text-[var(--text-secondary)] ${isCurrent ? 'bg-cyan-500/10 font-bold border-x border-cyan-500/20' : ''}`} title={formatBRL(val)}>
                          {isFitScreen && useCompactNumbers ? formatCompactBRL(val) : formatBRL(val)}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Resultado Líquido */}
                  <tr className="bg-cyan-500/5 font-bold hover:bg-cyan-500/10 transition-colors">
                    <td className={`py-2 px-2.5 font-sans font-bold text-cyan-400 sticky left-0 bg-[var(--surface-card)] z-10 border-r border-[var(--border-subtle)] ${isFitScreen ? 'truncate' : ''}`}>
                      Resultado Líquido (R$)
                    </td>
                    <td className="py-2 px-1.5 text-right font-bold text-cyan-400 bg-[var(--surface-elevated)]" title={formatBRL(monthlySummaryRibbon.netRealized.reduce((a, b) => a + b, 0))}>
                      {isFitScreen && useCompactNumbers 
                        ? formatCompactBRL(monthlySummaryRibbon.netRealized.reduce((a, b) => a + b, 0))
                        : formatBRL(monthlySummaryRibbon.netRealized.reduce((a, b) => a + b, 0))}
                    </td>
                    {monthlySummaryRibbon.netRealized.map((val, idx) => {
                      const isCurrent = idx === currentMonthIndex && selectedYear === currentYear;
                      return (
                        <td key={idx} className={`py-2 px-1 text-right ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'} ${isCurrent ? 'bg-cyan-500/15 font-bold border-x border-cyan-500/30' : ''}`} title={formatBRL(val)}>
                          {isFitScreen && useCompactNumbers ? formatCompactBRL(val) : formatBRL(val)}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Full 12-Month Matrix Table */}
          <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-xs overflow-hidden">
            <div className={`${isFitScreen ? 'overflow-x-hidden max-h-[750px] overflow-y-auto' : 'overflow-x-auto max-h-[720px]'}`}>
              <table className={`w-full text-left border-collapse text-xs ${isFitScreen ? 'table-fixed' : 'min-w-[1200px]'}`}>
                <thead className="sticky top-0 z-20 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] shadow-xs">
                  <tr className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    {/* Fixed Account Column */}
                    <th className={`py-3 px-3 sticky left-0 bg-[var(--surface-elevated)] z-30 border-r border-[var(--border-subtle)] ${
                      isFitScreen ? 'w-[20%]' : 'min-w-[280px] max-w-[340px]'
                    }`}>
                      Conta Contábil / Estrutura
                    </th>

                    {/* Total Anual */}
                    <th className={`py-3 px-2 text-right bg-[var(--surface-card)] border-r border-[var(--border-subtle)] font-bold text-[var(--text-primary)] ${
                      isFitScreen ? 'w-[9%]' : 'min-w-[130px]'
                    }`}>
                      Total Anual ({selectedYear})
                    </th>

                    {/* 12 Months Columns */}
                    {MONTH_SHORT.map((m, idx) => {
                      const isCurrent = idx === currentMonthIndex && selectedYear === currentYear;
                      return (
                        <th 
                          key={m} 
                          className={`py-3 px-1 text-right ${
                            isFitScreen 
                              ? 'w-[5.8%]' 
                              : annualMetricMode === 'ORC_VS_REAL' ? 'min-w-[130px]' : 'min-w-[95px]'
                          } ${
                            isCurrent ? 'bg-cyan-500/15 text-cyan-300 font-bold border-x border-cyan-500/30' : ''
                          }`}
                        >
                          <div className="flex flex-col items-end">
                            <div className="flex items-center space-x-1">
                              <span>{m}</span>
                              {isCurrent && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" title="Mês corrente" />
                              )}
                            </div>
                            {annualMetricMode === 'ORC_VS_REAL' && (
                              <span className="text-[9px] font-normal text-[var(--text-secondary)]">
                                {isFitScreen ? 'R/O' : 'Real / Orç'}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredAnnualLines.map(line => {
                    const isHeader = line.isHeader;
                    const isSummary = line.isSummary;
                    const isGroup = isHeader || isSummary;
                    const isExpanded = line.code ? expandedCodes[line.code] : true;

                    // Row background styling based on hierarchy
                    let rowBg = 'hover:bg-[var(--surface-elevated)]/60';
                    let fontStyle = 'text-[var(--text-primary)] font-normal';
                    let stickyBg = 'bg-[var(--surface-card)]';

                    if (isHeader) {
                      rowBg = 'bg-[var(--surface-elevated)] font-bold text-[var(--text-primary)] border-t border-b border-[var(--border-subtle)]';
                      fontStyle = 'font-bold text-[var(--text-primary)]';
                      stickyBg = 'bg-[var(--surface-elevated)]';
                    } else if (isSummary) {
                      rowBg = 'bg-cyan-500/10 font-bold text-cyan-300 border-t-2 border-b-2 border-cyan-500/30';
                      fontStyle = 'font-bold text-cyan-300';
                      stickyBg = 'bg-cyan-950/40';
                    }

                    return (
                      <tr key={line.id} className={`${rowBg} transition-colors`}>
                        {/* Fixed Account Column */}
                        <td 
                          className={`py-2 px-2.5 sticky left-0 ${stickyBg} z-10 border-r border-[var(--border-subtle)] ${isFitScreen ? 'truncate' : ''}`}
                          title={`${line.code} - ${line.name}`}
                        >
                          <div 
                            className="flex items-center space-x-1.5 truncate"
                            style={{ paddingLeft: `${Math.max(0, (line.level - 1) * (isFitScreen ? 8 : 14))}px` }}
                          >
                            {isHeader && (
                              <button
                                onClick={() => line.code && toggleExpand(line.code)}
                                className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded shrink-0"
                              >
                                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                            )}
                            <span className="font-mono text-[10px] text-cyan-400 font-medium shrink-0">
                              {line.code}
                            </span>
                            <span className={`${fontStyle} truncate text-xs`} title={line.name}>
                              {line.name}
                            </span>
                          </div>
                        </td>

                        {/* Total Anual */}
                        <td className="py-2 px-1.5 text-right font-mono font-bold text-[var(--text-primary)] bg-[var(--surface-card)] border-r border-[var(--border-subtle)]">
                          {annualMetricMode === 'ORC_VS_REAL' ? (
                            <div className="flex flex-col items-end leading-tight" title={`Realizado: ${formatBRL(line.realizedTotal)} | Orçado: ${formatBRL(line.plannedTotal)} | Desvio: ${formatBRL(line.varianceNominal)}`}>
                              <span className="text-[var(--text-primary)] text-xs">
                                {isFitScreen && useCompactNumbers ? formatCompactBRL(line.realizedTotal) : formatBRL(line.realizedTotal)}
                              </span>
                              <span className="text-[9px] text-[var(--text-secondary)] font-medium">
                                Orç: {isFitScreen && useCompactNumbers ? formatCompactBRL(line.plannedTotal) : formatBRL(line.plannedTotal)}
                              </span>
                              <span className={`text-[9px] font-semibold ${line.varianceNominal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {line.varianceNominal > 0 ? '+' : ''}{isFitScreen && useCompactNumbers ? formatCompactBRL(line.varianceNominal) : formatBRL(line.varianceNominal)}
                              </span>
                            </div>
                          ) : annualMetricMode === 'PLANNED_ONLY' ? (
                            <span title={formatBRL(line.plannedTotal)}>
                              {isFitScreen && useCompactNumbers ? formatCompactBRL(line.plannedTotal) : formatBRL(line.plannedTotal)}
                            </span>
                          ) : annualMetricMode === 'REALIZED_ONLY' ? (
                            <span title={formatBRL(line.realizedTotal)}>
                              {isFitScreen && useCompactNumbers ? formatCompactBRL(line.realizedTotal) : formatBRL(line.realizedTotal)}
                            </span>
                          ) : (
                            <div className="flex flex-col items-end leading-tight" title={`Desvio: ${formatBRL(line.varianceNominal)}`}>
                              <span className={`text-xs ${line.varianceNominal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {line.varianceNominal > 0 ? '+' : ''}{isFitScreen && useCompactNumbers ? formatCompactBRL(line.varianceNominal) : formatBRL(line.varianceNominal)}
                              </span>
                              <span className="text-[9px] text-[var(--text-secondary)]">
                                {line.variancePercent.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 12 Months Values */}
                        {MONTH_SHORT.map((m, mIdx) => {
                          const isCurrent = mIdx === currentMonthIndex && selectedYear === currentYear;
                          const pVal = line.plannedMonthly[mIdx] || 0;
                          const rVal = line.realizedMonthly[mIdx] || 0;
                          const devNom = rVal - pVal;
                          const devPct = pVal !== 0 ? (devNom / pVal) * 100 : 0;

                          const titleTooltip = `Mês: ${m}/${selectedYear}\nRealizado: ${formatBRL(rVal)}\nOrçado: ${formatBRL(pVal)}\nDesvio: ${formatBRL(devNom)} (${devPct.toFixed(1)}%)`;

                          return (
                            <td 
                              key={mIdx} 
                              title={titleTooltip}
                              className={`py-1.5 px-1 text-right font-mono text-[10px] sm:text-[11px] ${
                                isCurrent ? 'bg-cyan-500/10 border-x border-cyan-500/20 font-semibold' : ''
                              }`}
                            >
                              {annualMetricMode === 'ORC_VS_REAL' ? (
                                <div className="flex flex-col items-end leading-tight">
                                  {/* Realized */}
                                  <span className="font-bold text-[var(--text-primary)]">
                                    {isFitScreen && useCompactNumbers ? formatCompactBRL(rVal) : formatBRL(rVal)}
                                  </span>
                                  {/* Planned */}
                                  <span className="text-[9px] text-[var(--text-secondary)]">
                                    {isFitScreen && useCompactNumbers ? formatCompactBRL(pVal) : formatBRL(pVal)}
                                  </span>
                                  {/* Micro variance (only in expanded mode or when fits) */}
                                  {!isFitScreen && pVal !== 0 && (
                                    <span className={`text-[8px] font-medium ${devNom >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {devNom > 0 ? '+' : ''}{formatBRL(devNom)}
                                    </span>
                                  )}
                                </div>
                              ) : annualMetricMode === 'PLANNED_ONLY' ? (
                                <span className="text-[var(--text-primary)] font-medium">
                                  {isFitScreen && useCompactNumbers ? formatCompactBRL(pVal) : formatBRL(pVal)}
                                </span>
                              ) : annualMetricMode === 'REALIZED_ONLY' ? (
                                <span className="text-[var(--text-primary)] font-bold">
                                  {isFitScreen && useCompactNumbers ? formatCompactBRL(rVal) : formatBRL(rVal)}
                                </span>
                              ) : (
                                <div className="flex flex-col items-end leading-tight">
                                  <span className={`font-semibold ${devNom >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {devNom > 0 ? '+' : ''}{isFitScreen && useCompactNumbers ? formatCompactBRL(devNom) : formatBRL(devNom)}
                                  </span>
                                  <span className="text-[8px] text-[var(--text-secondary)]">
                                    {devPct > 0 ? '+' : ''}{devPct.toFixed(0)}%
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DETAILED MONTHLY / PERIOD COMPARISON (ACOMPANHAMENTO MENSAL) */}
      {/* ========================================================================= */}
      {activeTab === 'COMPARISON' && (
        <div className="space-y-4">
          {/* Controls & Filters Bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
            {/* Month Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-secondary)] mr-1">Visão:</span>
              <button
                onClick={() => setSelectedMonth('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectedMonth === 'ALL'
                    ? 'bg-cyan-400 text-[#071321] shadow-xs'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }`}
              >
                Acumulado Anual (12M)
              </button>
              {MONTH_SHORT.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(idx)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                    selectedMonth === idx
                      ? 'bg-cyan-400 text-[#071321] font-bold shadow-xs'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Search and Nature Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Buscar conta..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-cyan-400 focus:outline-hidden w-40 sm:w-48"
                />
              </div>

              <select
                value={natureFilter}
                onChange={e => setNatureFilter(e.target.value as any)}
                aria-label="Filtrar contas por natureza"
                className="px-2.5 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-semibold text-[var(--text-primary)] focus:border-cyan-400 focus:outline-hidden"
              >
                <option value="ALL">Todas as Contas</option>
                <option value="RECEITAS">Apenas Receitas</option>
                <option value="DESPESAS">Custos e Despesas</option>
              </select>

              <button
                onClick={expandAll}
                className="px-2 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-elevated)]"
                title="Expandir grupos"
              >
                Expandir
              </button>
              <button
                onClick={collapseAll}
                className="px-2 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-elevated)]"
                title="Recolher grupos"
              >
                Recolher
              </button>
            </div>
          </div>

          {/* Side-by-Side Comparison Table */}
          <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    <th className="py-3 px-4 w-72">Estrutura Contábil / Conta</th>
                    <th className="py-3 px-3 text-right">Orçado (R$)</th>
                    <th className="py-3 px-3 text-right">Realizado (R$)</th>
                    <th className="py-3 px-3 text-right">Desvio R$</th>
                    <th className="py-3 px-3 text-right">Desvio %</th>
                    <th className="py-3 px-4 text-center w-36">Execução</th>
                    <th className="py-3 px-4 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredComparisonLines.map(line => {
                    const isHeader = line.isHeader;
                    const isSummary = line.isSummary;
                    const isGroup = isHeader || isSummary;
                    const isExpanded = line.code ? expandedCodes[line.code] : true;

                    // Row background styling based on hierarchy
                    let rowBg = 'hover:bg-[var(--surface-elevated)]/60';
                    let fontStyle = 'text-[var(--text-primary)] font-normal';

                    if (isHeader) {
                      rowBg = 'bg-[var(--surface-elevated)] font-bold text-[var(--text-primary)] border-t border-b border-[var(--border-subtle)]';
                      fontStyle = 'font-bold text-[var(--text-primary)]';
                    } else if (isSummary) {
                      rowBg = 'bg-cyan-500/10 font-bold text-cyan-300 border-t-2 border-b-2 border-cyan-500/30';
                      fontStyle = 'font-bold text-cyan-300';
                    }

                    // Execution progress bar color
                    const execWidth = Math.min(100, Math.max(0, line.executionRate));
                    let execBarColor = 'bg-emerald-400';
                    if (line.favorableStatus === 'ATENCAO') execBarColor = 'bg-amber-400';
                    if (line.favorableStatus === 'DESFAVORAVEL') execBarColor = 'bg-rose-400';

                    return (
                      <tr key={line.id} className={`${rowBg} transition-colors`}>
                        {/* Account Name with Level Indentation */}
                        <td className="py-2.5 px-4">
                          <div 
                            className="flex items-center space-x-2"
                            style={{ paddingLeft: `${Math.max(0, (line.level - 1) * 16)}px` }}
                          >
                            {isHeader && (
                              <button
                                onClick={() => line.code && toggleExpand(line.code)}
                                className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <span className="font-mono text-[11px] text-cyan-400 font-medium">
                              {line.code}
                            </span>
                            <span className={fontStyle}>
                              {line.name}
                            </span>
                          </div>
                        </td>

                        {/* Planned Value */}
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-[var(--text-secondary)]">
                          {formatBRL(line.plannedTotal)}
                        </td>

                        {/* Realized Value */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[var(--text-primary)]">
                          {formatBRL(line.realizedTotal)}
                        </td>

                        {/* Variance Nominal (Realized - Planned) */}
                        <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                          line.favorableStatus === 'FAVORAVEL' 
                            ? 'text-emerald-400' 
                            : line.favorableStatus === 'DESFAVORAVEL' 
                              ? 'text-rose-400' 
                              : 'text-[var(--text-secondary)]'
                        }`}>
                          {line.varianceNominal > 0 ? '+' : ''}{formatBRL(line.varianceNominal)}
                        </td>

                        {/* Variance Percentage */}
                        <td className={`py-2.5 px-3 text-right font-mono text-xs ${
                          line.variancePercent > 0 ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'
                        }`}>
                          {line.variancePercent > 0 ? '+' : ''}{line.variancePercent.toFixed(1)}%
                        </td>

                        {/* Execution Progress Bar */}
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-[var(--surface-elevated)] h-1.5 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                              <div 
                                className={`h-full rounded-full ${execBarColor}`}
                                style={{ width: `${execWidth}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-[var(--text-primary)] w-10 text-right">
                              {line.executionRate.toFixed(0)}%
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-4 text-center">
                          {line.favorableStatus === 'FAVORAVEL' && (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              No Alvo
                            </span>
                          )}
                          {line.favorableStatus === 'ATENCAO' && (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Atenção
                            </span>
                          )}
                          {line.favorableStatus === 'DESFAVORAVEL' && (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3 mr-1" />
                              Desvio
                            </span>
                          )}
                          {line.favorableStatus === 'NEUTRO' && (
                            <span className="text-[10px] text-[var(--text-secondary)]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EDITABLE 12-MONTH MATRIX PLANNING (ELABORAÇÃO DO ORÇAMENTO) */}
      {/* ========================================================================= */}
      {activeTab === 'PLANNING' && (
        <div className="space-y-4">
          {/* Productivity Tools Bar */}
          <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-bold text-[var(--text-secondary)]">Ajuste em Lote (%):</span>
                <input
                  type="number"
                  value={batchPercent}
                  onChange={e => setBatchPercent(Number(e.target.value))}
                  aria-label="Percentual de ajuste em lote"
                  className="w-16 px-2 py-1 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg text-center text-xs font-bold text-[var(--text-primary)] focus:border-cyan-400 focus:outline-hidden"
                />
                <button
                  onClick={() => handleApplyBatchPercent()}
                  className="px-2.5 py-1 bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-[var(--text-primary)] font-semibold rounded-lg text-xs transition-colors flex items-center border border-[var(--border-subtle)]"
                >
                  <Percent className="w-3 h-3 mr-1 text-cyan-400" />
                  Aplicar em Todo Orçamento
                </button>
              </div>

              <div className="h-4 w-px bg-[var(--border-subtle)] hidden sm:block" />

              <button
                onClick={handleImportFromRealized}
                className="px-3 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold hover:bg-cyan-500/20 flex items-center transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                Preencher com Base no Realizado
              </button>
            </div>

            <div className="flex items-center space-x-2.5">
              <span className="text-xs text-[var(--text-secondary)]">
                Última alteração: {new Date(editingPlan.updatedAt).toLocaleDateString('pt-BR')}
              </span>
              <button
                onClick={handleSaveBudgetPlan}
                className="px-4 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-[#071321] rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(99,217,255,0.25)] flex items-center"
              >
                <Save className="w-4 h-4 mr-1.5" />
                Gravar Metas Orçamentárias
              </button>
            </div>
          </div>

          {/* 12-Month Editable Matrix Table */}
          <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[650px]">
              <table className="w-full text-left border-collapse text-xs min-w-[1100px]">
                <thead className="sticky top-0 z-20 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] shadow-xs">
                  <tr className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    <th className="py-3 px-4 min-w-[240px] sticky left-0 bg-[var(--surface-elevated)] z-30 border-r border-[var(--border-subtle)]">
                      Conta Contábil
                    </th>
                    <th className="py-3 px-3 text-right bg-[var(--surface-card)] min-w-[110px] text-[var(--text-primary)] border-r border-[var(--border-subtle)]">
                      Total Anual
                    </th>
                    {MONTH_SHORT.map((m, idx) => (
                      <th key={m} className="py-3 px-2 text-right min-w-[95px]">
                        {m}/{String(selectedYear).substring(2)}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center min-w-[80px]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {accounts.filter(a => a.isAnalytical).map(acc => {
                    const monthly = getEditingPlannedArray(acc.id);
                    const annualTotal = monthly.reduce((a, b) => a + b, 0);

                    return (
                      <tr key={acc.id} className="hover:bg-[var(--surface-elevated)]/50 transition-colors">
                        {/* Account Name */}
                        <td className="py-2.5 px-4 font-medium text-[var(--text-primary)] sticky left-0 bg-[var(--surface-card)] z-10 border-r border-[var(--border-subtle)]">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[var(--text-primary)]">{acc.name}</span>
                            <span className="font-mono text-[10px] text-cyan-400">{acc.code}</span>
                          </div>
                        </td>

                        {/* Total Year Computed */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-cyan-400 bg-cyan-500/10 border-r border-[var(--border-subtle)]">
                          {formatBRL(annualTotal)}
                        </td>

                        {/* 12 Months Inputs */}
                        {monthly.map((val, mIdx) => (
                          <td key={mIdx} className="py-1 px-1.5 text-right">
                            <input
                              type="number"
                              value={val === 0 ? '' : val}
                              placeholder="0"
                              onChange={e => handlePlannedValueChange(acc.id, mIdx, e.target.value)}
                              aria-label={`Orçado de ${acc.name} em ${MONTH_SHORT[mIdx]}`}
                              className="w-full text-right px-2 py-1 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 focus:outline-hidden"
                            />
                          </td>
                        ))}

                        {/* Quick Action: Replicate Jan to all months */}
                        <td className="py-1 px-2 text-center">
                          <button
                            onClick={() => handleReplicateMonth(acc.id, 0)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-cyan-400 hover:bg-cyan-500/15 rounded-lg transition-colors"
                            title="Replicar valor de Janeiro para os 12 meses"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
