import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  FileSpreadsheet, 
  Download, 
  Search, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  Wallet, 
  Percent, 
  DollarSign, 
  AlertTriangle,
  Receipt,
  FileText,
  UserPlus,
  UserMinus,
  Clock,
  Sparkles,
  Info,
  Target,
  Sliders
} from 'lucide-react';
import { KpiEngine, AnnualKpiRow, KpiCategory } from '../../services/kpiEngine';
import { formatBRL } from '../../services/financialEngine';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';
import { KpiTargetConfigModal } from './KpiTargetConfigModal';

export interface AnnualKpiComparisonViewProps {
  currentYear?: number;
  selectedMonthIdx?: number;
  onNavigateScreen?: (screen: string) => void;
  isCompactMode?: boolean; // Se exibido dentro do widget do dashboard ou em tela cheia
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_FULL_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Minigráfico vetorial Sparkline para a curva anual de cada KPI
 */
const KpiSparkline: React.FC<{ values: number[]; isPositiveUp?: boolean }> = ({ values, isPositiveUp = true }) => {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const width = 48;
  const height = 18;
  const padding = 2;

  if (range === 0) {
    return (
      <svg width={width} height={height} className="overflow-visible inline-block opacity-40">
        <line x1="2" y1={height / 2} x2={width - 2} y2={height / 2} stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
      </svg>
    );
  }

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const isRising = lastVal >= firstVal;
  const isFavorable = isPositiveUp ? isRising : !isRising;
  const strokeColor = isFavorable ? '#10B981' : '#F43F5E';

  const lastX = width - padding;
  const lastY = height - padding - ((lastVal - min) / range) * (height - padding * 2);

  return (
    <svg width={width} height={height} className="overflow-visible inline-block">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={lastX} cy={lastY} r="2" fill={strokeColor} />
    </svg>
  );
};

export const AnnualKpiComparisonView: React.FC<AnnualKpiComparisonViewProps> = ({
  currentYear = new Date().getFullYear(),
  selectedMonthIdx = new Date().getMonth(),
  onNavigateScreen,
  isCompactMode = false
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [timeHorizon, setTimeHorizon] = useState<'ANO' | 'SEMESTRE_1' | 'SEMESTRE_2' | 'TRI_1' | 'TRI_2' | 'TRI_3' | 'TRI_4' | 'MES'>('ANO');
  const [selectedCategory, setSelectedCategory] = useState<'TODOS' | KpiCategory>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showTargets, setShowTargets] = useState<boolean>(true);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Meses ativos no horizonte temporal selecionado
  const activeMonthIndices = useMemo(() => {
    switch (timeHorizon) {
      case 'SEMESTRE_1':
        return [0, 1, 2, 3, 4, 5];
      case 'SEMESTRE_2':
        return [6, 7, 8, 9, 10, 11];
      case 'TRI_1':
        return [0, 1, 2];
      case 'TRI_2':
        return [3, 4, 5];
      case 'TRI_3':
        return [6, 7, 8];
      case 'TRI_4':
        return [9, 10, 11];
      case 'MES':
        return [selectedMonthIdx];
      case 'ANO':
      default:
        return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }
  }, [timeHorizon, selectedMonthIdx]);

  // Séries mensais de todos os KPIs calculadas pelo KpiEngine
  const allKpiRows = useMemo(() => {
    return KpiEngine.getAnnualKpis(selectedYear, activeMonthIndices);
  }, [selectedYear, activeMonthIndices, refreshTrigger]);

  // Filtragem por busca e categoria
  const filteredKpiRows = useMemo(() => {
    return allKpiRows.filter(row => {
      if (selectedCategory !== 'TODOS' && row.category !== selectedCategory) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = row.name.toLowerCase().includes(term);
        const matchesDesc = row.description.toLowerCase().includes(term);
        const matchesCat = row.category.toLowerCase().includes(term);
        return matchesName || matchesDesc || matchesCat;
      }
      return true;
    });
  }, [allKpiRows, selectedCategory, searchTerm]);

  // Ícones por ID do KPI
  const getKpiIcon = (id: string) => {
    switch (id) {
      case 'faturamento_bruto':
        return Receipt;
      case 'resultado_liquido':
      case 'margem_liquida':
        return TrendingUp;
      case 'mrr':
        return FileText;
      case 'clientes_ativos':
        return Users;
      case 'crescimento_clientes':
        return UserPlus;
      case 'churn_clientes':
      case 'taxa_churn':
        return UserMinus;
      case 'ticket_medio':
        return DollarSign;
      case 'saldo_disponivel':
        return Wallet;
      case 'entradas_caixa':
        return ArrowUpRight;
      case 'saidas_caixa':
        return ArrowDownRight;
      case 'saldo_liquido_caixa':
        return BarChart3;
      case 'inadimplencia':
        return AlertTriangle;
      case 'contas_receber_aberto':
      case 'contas_pagar_aberto':
        return Clock;
      default:
        return BarChart3;
    }
  };

  // Cores de badge por categoria
  const getCategoryBadgeClass = (category: KpiCategory) => {
    switch (category) {
      case 'Competência':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Comercial':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'Caixa':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Risco':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'Controladoria':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  // Exportação para Excel
  const handleExportExcel = () => {
    const headers = [
      'Indicador (KPI)',
      'Categoria',
      'Descrição',
      ...activeMonthIndices.map(m => MONTH_NAMES[m]),
      'Total/Média Período',
      'Evolução Anual (% AH)'
    ];

    const data = filteredKpiRows.map(row => {
      return [
        row.name,
        row.category,
        row.description,
        ...activeMonthIndices.map(m => KpiEngine.formatValue(row.valuesByMonth[m] || 0, row.format)),
        KpiEngine.formatValue(row.periodTotal, row.format),
        `${row.annualGrowth > 0 ? '+' : ''}${row.annualGrowth.toFixed(1)}%`
      ];
    });

    exportToExcel(`evolucao_kpis_${selectedYear}`, 'Evolucao_KPIs', headers, data);
  };

  // Exportação para CSV
  const handleExportCSV = () => {
    const headers = [
      'Indicador',
      'Categoria',
      ...activeMonthIndices.map(m => MONTH_NAMES[m]),
      'Total Periodo',
      'Evolucao %'
    ];

    const data = filteredKpiRows.map(row => {
      return [
        row.name,
        row.category,
        ...activeMonthIndices.map(m => row.valuesByMonth[m] || 0),
        row.periodTotal,
        row.annualGrowth
      ];
    });

    exportToCSV(`evolucao_kpis_${selectedYear}`, headers, data);
  };

  return (
    <div className={`space-y-4 ${isCompactMode ? '' : 'animate-in fade-in duration-200'}`}>
      
      {/* Barra de Controles: Filtro de Período, Categorias, Busca e Exportação */}
      <div className="bg-[var(--surface-card)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-2xs space-y-3">
        
        {/* Linha 1: Título e Horizonte Temporal */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 flex-wrap">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-xs" />
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <span>Visão Anual Comparativa por Linha (Jan-Dez)</span>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                Exercício {selectedYear}
              </span>
            </h3>
            <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">
              • Acompanhe a evolução, o crescimento e a sazonalidade de cada indicador mês a mês
            </span>
          </div>

          {/* Seletores de Horizonte e Ano */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Ano */}
            <div className="flex items-center bg-[var(--surface-elevated)] p-1 rounded-xl border border-[var(--border-subtle)] text-xs">
              <button
                type="button"
                onClick={() => setSelectedYear(y => y - 1)}
                className="px-2 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] cursor-pointer"
                title="Ano anterior"
              >
                ◀
              </button>
              <span className="px-2.5 font-bold font-mono text-[var(--text-primary)]">
                {selectedYear}
              </span>
              <button
                type="button"
                onClick={() => setSelectedYear(y => y + 1)}
                className="px-2 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] cursor-pointer"
                title="Próximo ano"
              >
                ▶
              </button>
            </div>

            {/* Horizonte de Tempo (Ano, Semestres, Trimestres) */}
            <div className="flex items-center bg-[var(--surface-elevated)] p-1 rounded-xl border border-[var(--border-subtle)] text-xs overflow-x-auto scrollbar-none">
              {[
                { id: 'ANO', label: '12 Meses (Ano)' },
                { id: 'SEMESTRE_1', label: '1º Sem (Jan-Jun)' },
                { id: 'SEMESTRE_2', label: '2º Sem (Jul-Dez)' },
                { id: 'TRI_1', label: '1º Tri' },
                { id: 'TRI_2', label: '2º Tri' },
                { id: 'TRI_3', label: '3º Tri' },
                { id: 'TRI_4', label: '4º Tri' }
              ].map(h => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setTimeHorizon(h.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                    timeHorizon === h.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>

            {/* Botões de Exportação */}
            <div className="flex items-center gap-1.5 ml-auto sm:ml-0 flex-wrap">
              {/* Botão Toggle de Metas Orçamentárias */}
              <button
                type="button"
                onClick={() => setShowTargets(!showTargets)}
                className={`px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  showTargets 
                    ? 'bg-amber-400 text-slate-950 font-bold border-amber-400' 
                    : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Exibir metas orçamentárias e comparativo Planejado vs Realizado"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Metas {showTargets ? 'Ativas' : ''}</span>
              </button>

              {showTargets && (
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Configurar metas mensais e anuais dos KPIs"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Ajustar Metas...</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportExcel}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-amber-500/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Exportar tabela anual para Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-amber-500/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Exportar tabela anual para CSV"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Linha 2: Filtro de Categorias e Campo de Busca */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
          
          {/* Pílulas de Categoria */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs pb-1 sm:pb-0">
            {(['TODOS', 'Competência', 'Comercial', 'Caixa', 'Risco', 'Controladoria'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer border ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-xs'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat === 'TODOS' ? 'Todos os Indicadores' : cat}
              </button>
            ))}
          </div>

          {/* Busca por texto */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar indicador ou descrição..."
              className="w-full pl-8 pr-3 py-1 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* TABELA COMPARATIVA ANUAL (MÊS A MÊS - JAN A DEZ) */}
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left text-xs border-collapse">
            
            {/* Cabeçalho da Tabela */}
            <thead>
              <tr className="bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] uppercase text-[11px] font-bold tracking-wider">
                {/* Coluna 1 Congelada: Indicador & Descrição */}
                <th className="py-3 px-4 sticky left-0 z-20 bg-[var(--surface-elevated)] shadow-sm min-w-[240px] max-w-[280px] sm:min-w-[320px]">
                  Indicador & Descrição Detalhada
                </th>

                {/* Colunas dos Meses Selecionados */}
                {activeMonthIndices.map(mIdx => {
                  const isCurrentMonth = mIdx === selectedMonthIdx;
                  return (
                    <th 
                      key={mIdx}
                      className={`py-3 px-2.5 text-right font-mono border-l border-[var(--border-subtle)] min-w-[95px] ${
                        isCurrentMonth 
                          ? 'bg-amber-500/15 text-amber-300 font-black border-amber-500/40' 
                          : 'text-[var(--text-secondary)]'
                      }`}
                      title={MONTH_FULL_NAMES[mIdx]}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>{MONTH_NAMES[mIdx]}</span>
                        {isCurrentMonth && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Mês ativo selecionado no painel" />
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Coluna de Total ou Média */}
                <th className="py-3 px-3 text-right font-bold text-amber-400 border-l-2 border-amber-500/40 bg-amber-500/10 min-w-[110px]" title="Total acumulado ou média do período">
                  Total/Média
                </th>

                {/* Colunas Opcionais de Metas Orçamentárias */}
                {showTargets && (
                  <>
                    <th className="py-3 px-3 text-right font-bold text-slate-300 border-l border-[var(--border-subtle)] bg-[var(--surface-elevated)] min-w-[105px]" title="Meta orçamentária acumulada ou média do período">
                      Meta Período
                    </th>
                    <th className="py-3 px-3 text-right font-bold text-emerald-400 border-l border-[var(--border-subtle)] bg-emerald-500/10 min-w-[105px]" title="Percentual de atingimento da meta no período (Realizado vs Meta)">
                      % Atingimento
                    </th>
                  </>
                )}

                {/* Coluna de Evolução / Crescimento Anual (% AH) */}
                <th className="py-3 px-3 text-right font-bold text-[var(--text-primary)] border-l border-[var(--border-subtle)] bg-[var(--surface-elevated)] min-w-[100px]" title="Evolução acumulada no período (Mês inicial vs Mês final)">
                  Evolução (% AH)
                </th>

                {/* Coluna Sparkline de Tendência */}
                <th className="py-3 px-2 text-center text-[var(--text-secondary)] border-l border-[var(--border-subtle)] min-w-[75px]" title="Curva gráfica vetorial de evolução dos 12 meses">
                  Tendência
                </th>
              </tr>
            </thead>

            {/* Corpo da Tabela: Linhas dos KPIs */}
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredKpiRows.length === 0 ? (
                <tr>
                  <td colSpan={activeMonthIndices.length + 4} className="py-10 text-center text-[var(--text-secondary)]">
                    Nenhum indicador localizado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredKpiRows.map((row) => {
                  const Icon = getKpiIcon(row.id);
                  const isUpFavorable = row.positiveDirection === 'UP';
                  const isGrowthFavorable = isUpFavorable ? row.annualGrowth >= 0 : row.annualGrowth <= 0;

                  return (
                    <tr 
                      key={row.id}
                      className="hover:bg-amber-500/5 transition-colors group"
                    >
                      {/* Coluna 1 Congelada: Nome, Descrição e Categoria */}
                      <td className="py-3 px-4 sticky left-0 z-10 bg-[var(--surface-card)] group-hover:bg-[var(--surface-elevated)] transition-colors border-r border-[var(--border-subtle)] shadow-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] shrink-0 mt-0.5 group-hover:border-amber-500/40 transition-colors">
                            <Icon className="w-4 h-4 text-amber-400" />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-tight">
                                {row.name}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getCategoryBadgeClass(row.category)}`}>
                                {row.category}
                              </span>
                            </div>

                            {/* Descrição Detalhada do KPI */}
                            <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-relaxed">
                              {row.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Colunas dos Meses Selecionados */}
                      {activeMonthIndices.map((mIdx, pos) => {
                        const val = row.valuesByMonth[mIdx] || 0;
                        const prevVal = pos > 0 ? (row.valuesByMonth[activeMonthIndices[pos - 1]] || 0) : null;
                        const isCurrentMonth = mIdx === selectedMonthIdx;
                        
                        // Variação MoM em relação ao mês anterior
                        let momDiff: number | null = null;
                        let momPct: number | null = null;
                        if (prevVal !== null && prevVal !== 0) {
                          momDiff = val - prevVal;
                          momPct = (momDiff / Math.abs(prevVal)) * 100;
                        }

                        return (
                          <td 
                            key={mIdx}
                            className={`py-2.5 px-2.5 text-right font-mono border-l border-[var(--border-subtle)] tabular-nums whitespace-nowrap text-xs ${
                              isCurrentMonth 
                                ? 'bg-amber-500/10 font-bold text-amber-300 border-amber-500/30' 
                                : 'text-[var(--text-primary)]'
                            } ${val === 0 ? 'text-[var(--text-muted)] opacity-60' : ''}`}
                          >
                            <div className="font-semibold">
                              {KpiEngine.formatValue(val, row.format)}
                            </div>

                            {/* Meta do mês se ativada */}
                            {showTargets && row.targetValuesByMonth && (
                              <div 
                                className="text-[9px] font-mono text-[var(--text-muted)] opacity-80 mt-0.5 leading-none"
                                title={`Meta orçamentária: ${KpiEngine.formatValue(row.targetValuesByMonth[mIdx] || 0, row.format)}`}
                              >
                                M: {KpiEngine.formatValue(row.targetValuesByMonth[mIdx] || 0, row.format)}
                              </div>
                            )}

                            {/* Variação MoM */}
                            {momPct !== null && Math.abs(momPct) >= 0.1 && (
                              <div 
                                className={`text-[9px] font-mono font-bold flex items-center justify-end gap-0.5 mt-0.5 leading-none ${
                                  (isUpFavorable ? momPct >= 0 : momPct <= 0)
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                                }`}
                                title={`Variação vs ${MONTH_NAMES[activeMonthIndices[pos - 1]]}: ${momDiff && momDiff >= 0 ? '+' : ''}${row.format === 'CURRENCY' ? formatBRL(momDiff || 0) : momDiff} (${momPct.toFixed(1)}%)`}
                              >
                                <span>{momPct >= 0 ? '+' : ''}{momPct.toFixed(0)}%</span>
                                {momPct >= 0 ? (
                                  <ArrowUpRight className="w-2.5 h-2.5 shrink-0" />
                                ) : (
                                  <ArrowDownRight className="w-2.5 h-2.5 shrink-0" />
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Total ou Média do Período */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300 border-l-2 border-amber-500/40 bg-amber-500/5 tabular-nums whitespace-nowrap text-xs">
                        <div>{KpiEngine.formatValue(row.periodTotal, row.format)}</div>
                        <span className="text-[9px] font-normal text-amber-400/70 uppercase">
                          {row.aggregationType === 'SUM' ? 'Soma' : row.aggregationType === 'AVERAGE' ? 'Média' : 'Posição'}
                        </span>
                      </td>

                      {/* Colunas de Metas Orçamentárias */}
                      {showTargets && (
                        <>
                          {/* Meta Período */}
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-[var(--text-secondary)] border-l border-[var(--border-subtle)] bg-[var(--surface-elevated)] tabular-nums whitespace-nowrap text-xs">
                            <div>{KpiEngine.formatValue(row.targetPeriodTotal || 0, row.format)}</div>
                            <span className="text-[9px] font-normal text-[var(--text-muted)] uppercase">
                              Meta
                            </span>
                          </td>

                          {/* % Atingimento */}
                          <td className="py-2.5 px-3 text-right font-mono border-l border-[var(--border-subtle)] bg-emerald-500/5 tabular-nums whitespace-nowrap text-xs">
                            {row.targetAchievementRate !== undefined ? (
                              <div className="flex flex-col items-end">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  row.targetAchievementRate >= 100 
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                    : row.targetAchievementRate >= 90 
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                }`}>
                                  {row.targetAchievementRate.toFixed(1)}%
                                </span>
                                {row.targetDiff !== undefined && (
                                  <span className={`text-[9px] font-mono mt-0.5 ${
                                    (row.positiveDirection === 'UP' ? row.targetDiff >= 0 : row.targetDiff <= 0)
                                      ? 'text-emerald-400/80'
                                      : 'text-rose-400/80'
                                  }`}>
                                    {row.targetDiff >= 0 ? '+' : ''}{row.format === 'CURRENCY' ? formatBRL(row.targetDiff) : row.targetDiff}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)]">-</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Evolução / Crescimento Anual (% AH) */}
                      <td className="py-2.5 px-3 text-right font-mono border-l border-[var(--border-subtle)] tabular-nums whitespace-nowrap text-xs">
                        <div className="flex items-center justify-end gap-1">
                          {row.annualGrowth >= 0 ? (
                            <TrendingUp className={`w-3.5 h-3.5 shrink-0 ${isGrowthFavorable ? 'text-emerald-400' : 'text-rose-400'}`} />
                          ) : (
                            <TrendingDown className={`w-3.5 h-3.5 shrink-0 ${isGrowthFavorable ? 'text-emerald-400' : 'text-rose-400'}`} />
                          )}
                          <span className={`font-bold ${
                            row.annualGrowth === 0 ? 'text-[var(--text-secondary)]' :
                            isGrowthFavorable ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {row.annualGrowth > 0 ? '+' : ''}{row.annualGrowth.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Minigráfico Sparkline de Tendência */}
                      <td className="py-2.5 px-2 text-center border-l border-[var(--border-subtle)] whitespace-nowrap">
                        <KpiSparkline 
                          values={activeMonthIndices.map(i => row.valuesByMonth[i] || 0)} 
                          isPositiveUp={isUpFavorable} 
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé Informativo */}
        <div className="p-3.5 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)] flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Exibindo <strong>{filteredKpiRows.length}</strong> indicadores consolidados para o exercício de <strong>{selectedYear}</strong> ({activeMonthIndices.length} meses apurados).
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            Dados atualizados em tempo real diretamente do banco contábil e de contratos.
          </span>
        </div>
      </div>

      {/* Modal de Configuração de Metas Orçamentárias */}
      {isTargetModalOpen && (
        <KpiTargetConfigModal
          isOpen={isTargetModalOpen}
          onClose={() => setIsTargetModalOpen(false)}
          year={selectedYear}
          onSaved={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

    </div>
  );
};
