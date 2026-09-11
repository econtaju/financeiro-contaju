import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  FileText, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  HelpCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Receipt,
  Calendar,
  Settings2,
  Sliders,
  Sparkles,
  Building2,
  Layers,
  CreditCard,
  BarChart3,
  Percent,
  DollarSign,
  RefreshCw,
  Check,
  ArrowRight,
  ShieldCheck,
  Users,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatDateBR, getTemporalStatus } from '../../services/financialEngine';
import { ReportingEngine } from '../../services/reportingEngine';
import { NavigationScreen } from '../Sidebar';
import { useDashboardConfig } from '../../hooks/useDashboardConfig';
import { useGlobalPeriod } from '../../hooks/useGlobalPeriod';
import { GlobalPeriodBanner } from '../Common/GlobalPeriodBanner';

interface DashboardViewProps {
  onNavigate: (screen: NavigationScreen) => void;
  onOpenNewTitleModal: (type: 'RECEBER' | 'PAGAR') => void;
  onOpenBillingModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenNewTitleModal,
  onOpenBillingModal
}) => {
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth(); // 0-based

  const { config, toggleKpi, toggleWidget, updateConfig, resetToDefault } = useDashboardConfig();
  const { period } = useGlobalPeriod();

  // Tab: 'DASHBOARD' | 'KPIS_CONFIG'
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'KPIS_CONFIG'>('DASHBOARD');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Effective year & month factoring in global period filter
  const effectiveYear = period.active ? period.year : selectedYear;
  const effectiveMonthIdx = period.active && period.month > 0 ? period.month - 1 : currentMonthIdx;
  const currentCompetenceStr = `${effectiveYear}-${String(effectiveMonthIdx + 1).padStart(2, '0')}`;

  // 1. DRE Data (Competence)
  const dreData = ReportingEngine.generateDRE(effectiveYear);
  const currentMonthGrossRevenue = dreData.lines[0]?.valuesByMonth[effectiveMonthIdx] || 0;
  const currentMonthNetResult = dreData.netResults[effectiveMonthIdx] || 0;
  
  // Year-to-date DRE
  const ytdGrossRevenue = dreData.lines[0]?.totalYear || 0;
  const ytdNetResult = dreData.totalNetResult || 0;
  const ytdMargin = ytdGrossRevenue > 0 ? (ytdNetResult / ytdGrossRevenue) * 100 : 0;
  const monthMargin = currentMonthGrossRevenue > 0 ? (currentMonthNetResult / currentMonthGrossRevenue) * 100 : 0;

  // 2. Cash Data (Realized Cash Flow)
  const cashData = ReportingEngine.generateCashFlow(effectiveYear, 'REALIZADO');
  const consolidatedCash = FinancialEngine.getConsolidatedCashBalance();
  const currentMonthCashInflow = cashData.lines[2]?.valuesByMonth[effectiveMonthIdx] || 0;
  const currentMonthCashOutflow = cashData.lines[3]?.valuesByMonth[effectiveMonthIdx] || 0;
  const currentMonthNetCash = currentMonthCashInflow - currentMonthCashOutflow;

  // 3. Bank Accounts Detailed
  const bankAccounts = storage.getBankAccounts().filter(b => b.status === 'ATIVO');
  const bankAccountsWithBalance = bankAccounts.map(b => ({
    ...b,
    calculatedBalance: FinancialEngine.getAccountBalance(b.id)
  }));

  // 4. Portfolio, Contracts & Billing
  const titles = storage.getTitles().filter(t => t.documentState === 'CONFIRMADO');
  const counterparties = storage.getCounterparties();
  const contracts = storage.getContracts().filter(c => c.status === 'ATIVO');

  const receivables = titles.filter(t => t.type === 'RECEBER');
  const payables = titles.filter(t => t.type === 'PAGAR');

  const openReceivables = receivables.reduce((acc, t) => acc + t.balancePrincipal, 0);
  const openPayables = payables.reduce((acc, t) => acc + t.balancePrincipal, 0);

  const mrr = FinancialEngine.calculateMRR();
  const delinquency = FinancialEngine.calculateDelinquencyRate(today);
  const activeContractsCount = contracts.length;
  const averageTicket = activeContractsCount > 0 ? mrr / activeContractsCount : 0;

  // 5. Client KPIs & Metrics (Solicitado pelo usuário)
  const clientMetrics = FinancialEngine.calculateClientMetrics(effectiveYear, effectiveMonthIdx);

  // Monthly billing summary calculations
  const titlesThisCompetence = titles.filter(t => t.competence === currentCompetenceStr && t.originType === 'CONTRATO');
  const contractsBilledCount = new Set(titlesThisCompetence.map(t => t.originId)).size;
  const contractsPendingCount = Math.max(0, activeContractsCount - contractsBilledCount);
  const totalBilledThisMonth = titlesThisCompetence.reduce((acc, t) => acc + t.originalAmount, 0);

  // Next dues in next 7 days
  const upcomingReceivables = receivables
    .filter(t => t.balancePrincipal > 0 && t.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const upcomingPayables = payables
    .filter(t => t.balancePrincipal > 0 && t.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  // Preset Handlers for KPI Configuration
  const applyPreset = (presetName: 'EXECUTIVO' | 'TESOURARIA' | 'CONTROLADORIA' | 'COMERCIAL') => {
    if (presetName === 'EXECUTIVO') {
      updateConfig({
        visibleKpis: ['faturamento_bruto', 'resultado_liquido', 'mrr', 'clientes_ativos', 'crescimento_clientes', 'inadimplencia', 'margem_liquida', 'ticket_medio'],
        visibleWidgets: ['widget_faturamento_resumo', 'widget_saldos_consolidados', 'widget_resumo_clientes', 'widget_dre_economico', 'widget_posicao_caixa', 'widget_proximos_vencimentos']
      });
    } else if (presetName === 'COMERCIAL') {
      updateConfig({
        visibleKpis: ['clientes_ativos', 'crescimento_clientes', 'carteira_total_clientes', 'mrr', 'ticket_medio', 'inadimplencia', 'faturamento_bruto'],
        visibleWidgets: ['widget_resumo_clientes', 'widget_faturamento_resumo', 'widget_proximos_vencimentos']
      });
    } else if (presetName === 'TESOURARIA') {
      updateConfig({
        visibleKpis: ['saldo_disponivel', 'entradas_caixa', 'saidas_caixa', 'saldo_liquido_caixa', 'contas_receber_aberto', 'contas_pagar_aberto'],
        visibleWidgets: ['widget_saldos_consolidados', 'widget_posicao_caixa', 'widget_proximos_vencimentos']
      });
    } else if (presetName === 'CONTROLADORIA') {
      updateConfig({
        visibleKpis: ['faturamento_bruto', 'resultado_liquido', 'faturamento_ano', 'margem_liquida', 'mrr', 'inadimplencia'],
        visibleWidgets: ['widget_faturamento_resumo', 'widget_dre_economico', 'widget_posicao_caixa', 'widget_proximos_vencimentos']
      });
    }
  };

  // KPI Catalog with metadata
  const KPI_CATALOG = [
    {
      id: 'faturamento_bruto',
      name: 'Receita Bruta (Mês)',
      category: 'Competência',
      value: formatBRL(currentMonthGrossRevenue),
      subtext: `Acumulado Ano: ${formatBRL(ytdGrossRevenue)}`,
      icon: Receipt,
      color: 'indigo',
      description: 'Faturamento reconhecido por competência contábil no mês selecionado.'
    },
    {
      id: 'resultado_liquido',
      name: 'Resultado Líquido (Mês)',
      category: 'Competência',
      value: formatBRL(currentMonthNetResult),
      subtext: `Margem: ${monthMargin.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'emerald',
      description: 'Lucro ou prejuízo líquido gerencial após todas as deduções e despesas.'
    },
    {
      id: 'mrr',
      name: 'MRR (Receita Recorrente)',
      category: 'Comercial',
      value: formatBRL(mrr),
      subtext: `${activeContractsCount} contratos ativos`,
      icon: FileText,
      color: 'purple',
      description: 'Receita mensal recorrente normalizada de clientes ativos.'
    },
    {
      id: 'clientes_ativos',
      name: 'Clientes Ativos',
      category: 'Clientes',
      value: `${clientMetrics.activeClients}`,
      subtext: `${clientMetrics.clientsWithActiveContracts} com contrato ativo (${clientMetrics.contractCoveragePercentage}%)`,
      icon: Users,
      color: 'blue',
      description: 'Número de clientes com cadastro ativo na Contaju e cobertura contratual regular.'
    },
    {
      id: 'crescimento_clientes',
      name: 'Crescimento de Clientes',
      category: 'Clientes',
      value: `+${clientMetrics.newClientsPeriod} novos (${clientMetrics.growthRate > 0 ? '+' : ''}${clientMetrics.growthRate}%)`,
      subtext: clientMetrics.netGrowthDiff >= 0 ? `+${clientMetrics.netGrowthDiff} vs mês anterior` : `${clientMetrics.netGrowthDiff} vs mês anterior`,
      icon: UserPlus,
      color: 'emerald',
      description: 'Novos clientes conquistados na competência selecionada e taxa de expansão líquida.'
    },
    {
      id: 'carteira_total_clientes',
      name: 'Total da Carteira',
      category: 'Clientes',
      value: `${clientMetrics.totalClients}`,
      subtext: `${clientMetrics.inactiveClients} inativo(s) / churn`,
      icon: UserCheck,
      color: 'indigo',
      description: 'Base total de clientes cadastrados no escritório (ativos e inativos).'
    },
    {
      id: 'inadimplencia',
      name: 'Taxa de Inadimplência',
      category: 'Risco',
      value: `${delinquency.rate}%`,
      subtext: `Vencido: ${formatBRL(delinquency.overdueBalance)}`,
      icon: AlertTriangle,
      color: 'amber',
      description: 'Razão entre títulos vencidos e total em aberto na carteira.'
    },
    {
      id: 'saldo_disponivel',
      name: 'Disponibilidade Bancária',
      category: 'Caixa',
      value: formatBRL(consolidatedCash),
      subtext: `${bankAccounts.length} contas bancárias PJ`,
      icon: Wallet,
      color: 'emerald',
      description: 'Saldo líquido total disponível e conciliado nas contas da empresa.'
    },
    {
      id: 'entradas_caixa',
      name: 'Entradas Realizadas (Caixa)',
      category: 'Caixa',
      value: formatBRL(currentMonthCashInflow),
      subtext: 'Liquidações efetivas',
      icon: ArrowUpRight,
      color: 'teal',
      description: 'Valores que efetivamente entraram nas contas bancárias no mês.'
    },
    {
      id: 'saidas_caixa',
      name: 'Saídas Realizadas (Caixa)',
      category: 'Caixa',
      value: formatBRL(currentMonthCashOutflow),
      subtext: 'Desembolsos operacionais',
      icon: ArrowDownRight,
      color: 'rose',
      description: 'Pagamentos e saídas financeiras liquidadas nas contas no mês.'
    },
    {
      id: 'saldo_liquido_caixa',
      name: 'Geração Líquida de Caixa',
      category: 'Caixa',
      value: formatBRL(currentMonthNetCash),
      subtext: currentMonthNetCash >= 0 ? 'Superávit no período' : 'Déficit no período',
      icon: BarChart3,
      color: currentMonthNetCash >= 0 ? 'emerald' : 'rose',
      description: 'Diferença entre entradas e saídas de caixa no mês selecionado.'
    },
    {
      id: 'contas_receber_aberto',
      name: 'A Receber em Aberto',
      category: 'Carteira',
      value: formatBRL(openReceivables),
      subtext: `${receivables.filter(t => t.balancePrincipal > 0).length} títulos a receber`,
      icon: Clock,
      color: 'blue',
      description: 'Saldo devedor total em aberto de títulos a receber.'
    },
    {
      id: 'contas_pagar_aberto',
      name: 'A Pagar em Aberto',
      category: 'Carteira',
      value: formatBRL(openPayables),
      subtext: `${payables.filter(t => t.balancePrincipal > 0).length} obrigações a pagar`,
      icon: Clock,
      color: 'orange',
      description: 'Saldo credor total em aberto de obrigações e contas a pagar.'
    },
    {
      id: 'margem_liquida',
      name: 'Margem Gerencial Ano',
      category: 'Controladoria',
      value: `${ytdMargin.toFixed(1)}%`,
      subtext: `Lucro YTD: ${formatBRL(ytdNetResult)}`,
      icon: Percent,
      color: 'indigo',
      description: 'Percentual do faturamento anual convertido em lucro líquido.'
    },
    {
      id: 'ticket_medio',
      name: 'Ticket Médio por Cliente',
      category: 'Comercial',
      value: formatBRL(averageTicket),
      subtext: 'Base de contratos recorrentes',
      icon: DollarSign,
      color: 'purple',
      description: 'Honorário médio mensal contratado por cliente ativo.'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Welcome & Tabs */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Painel Executivo Contaju</h1>
              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-mono font-medium">
                {dreData.months[effectiveMonthIdx]}/{effectiveYear}
              </span>
              {period.active && (
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                  Filtro Global Ativo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-700 mt-0.5">
              Gestão executiva por regime de competência (DRE), disponibilidades financeiras e acompanhamento de carteira.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenBillingModal}
              className="px-3 py-1.5 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 transition-colors shadow-2xs flex items-center"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Faturamento Mensal
            </button>
            <button
              onClick={() => onNavigate('CONCILIACAO')}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors flex items-center"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Conciliação Bancária
            </button>
          </div>
        </div>

        {/* Tab Navigation: Visão Geral vs Configuração de KPIs */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('DASHBOARD')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center ${
                activeTab === 'DASHBOARD'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Visão do Dashboard
            </button>
            <button
              onClick={() => setActiveTab('KPIS_CONFIG')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center ${
                activeTab === 'KPIS_CONFIG'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Personalizar KPIs & Widgets ({config.visibleKpis.length} ativos)
            </button>
          </div>

          <div className="text-[11px] text-slate-700 hidden sm:block">
            {config.visibleKpis.length} KPIs e {config.visibleWidgets.length} Widgets ativos no painel
          </div>
        </div>
      </div>

      {/* Global Period Banner in Dashboard */}
      <GlobalPeriodBanner
        moduleName="Painel Executivo"
        matchedCount={titles.filter(t => t.competence?.startsWith(String(effectiveYear))).length}
        totalCount={titles.length}
      />

      {/* ========================================================================= */}
      {/* TAB 1: VISÃO GERAL DO DASHBOARD (COM WIDGETS & KPIS CONFIGURADOS)          */}
      {/* ========================================================================= */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* WIDGETS CONFIGURÁVEIS SOLICITADOS: FATURAMENTO & SALDOS BANCÁRIOS CONSOLIDADOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* WIDGET 1: RESUMO RÁPIDO DE FATURAMENTO MENSAL */}
            {config.visibleWidgets.includes('widget_faturamento_resumo') && (
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-5 rounded-xl border border-indigo-800 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between pb-3 border-b border-indigo-800/60">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-indigo-600/60 rounded-lg">
                      <Receipt className="w-4 h-4 text-indigo-200" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                        Resumo Rápido de Faturamento
                      </h3>
                      <div className="text-[11px] text-indigo-300">
                        Competência {dreData.months[effectiveMonthIdx]}/{effectiveYear}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onOpenBillingModal}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded shadow-xs transition-colors flex items-center"
                  >
                    Faturar Lote
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold">Total Faturado</div>
                    <div className="text-base sm:text-lg font-bold text-white mt-1">
                      {formatBRL(totalBilledThisMonth)}
                    </div>
                    <div className="text-[10px] text-indigo-300 mt-0.5">Títulos do mês</div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold">Faturados</div>
                    <div className="text-base sm:text-lg font-bold text-emerald-400 mt-1">
                      {contractsBilledCount} <span className="text-xs font-normal text-indigo-300">/ {activeContractsCount}</span>
                    </div>
                    <div className="text-[10px] text-emerald-300 mt-0.5">Contratos gerados</div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold">Pendentes</div>
                    <div className="text-base sm:text-lg font-bold text-amber-400 mt-1">
                      {contractsPendingCount}
                    </div>
                    <div className="text-[10px] text-amber-300 mt-0.5">A faturar no lote</div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold">Ticket Médio</div>
                    <div className="text-base sm:text-lg font-bold text-indigo-200 mt-1">
                      {formatBRL(averageTicket)}
                    </div>
                    <div className="text-[10px] text-indigo-300 mt-0.5">Por contrato ativo</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-800/40 flex justify-between items-center text-[11px] text-indigo-300">
                  <span className="flex items-center">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 mr-1" />
                    Processo idempotente com bloqueio de duplicidade automática.
                  </span>
                  <button 
                    onClick={() => onNavigate('CONTRATOS')}
                    className="hover:text-white underline"
                  >
                    Ver Contratos
                  </button>
                </div>
              </div>
            )}

            {/* WIDGET 2: SALDOS BANCÁRIOS CONSOLIDADOS */}
            {config.visibleWidgets.includes('widget_saldos_consolidados') && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                        <Wallet className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Saldos Bancários Consolidados
                        </h3>
                        <div className="text-[11px] text-slate-700">
                          Posição real de liquidez disponível
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[10px] text-slate-700 font-semibold uppercase">Total Caixa</span>
                      <div className="text-lg font-bold text-emerald-950 font-mono">
                        {formatBRL(consolidatedCash)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                    {bankAccountsWithBalance.map(b => (
                      <div 
                        key={b.id} 
                        className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <div>
                            <div className="text-xs font-semibold text-slate-800">{b.name}</div>
                            <div className="text-[10px] text-slate-700 font-mono">Ag {b.agency || '-'} / CC {b.accountNumber || '-'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-bold font-mono ${b.calculatedBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                            {formatBRL(b.calculatedBalance)}
                          </div>
                          <span className="text-[9px] text-slate-700">Conciliado</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-700 text-[11px]">
                    {bankAccounts.length} contas bancárias integradas ao fluxo
                  </span>
                  <button
                    onClick={() => onNavigate('CONCILIACAO')}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center"
                  >
                    Ver Extratos & Conciliação
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                </div>
              </div>
            )}

            {/* WIDGET 3: PANORAMA & MÉTRICAS DE CLIENTES (SOLICITADO) */}
            {config.visibleWidgets.includes('widget_resumo_clientes') && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs col-span-1 lg:col-span-2 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-blue-700">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                            Panorama da Carteira de Clientes & Expansão
                          </h3>
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {clientMetrics.activeClients} Ativos
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Métricas de base ativa, novos clientes conquistados e taxa de retenção
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onNavigate('CLIENTES')}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center border border-blue-200"
                      >
                        <Users className="w-3.5 h-3.5 mr-1" />
                        Ver Todos os Clientes
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>

                  {/* 4 Cards de Métricas Principais de Clientes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-700">
                        <span className="font-semibold text-slate-700">Clientes Ativos</span>
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-slate-900 tracking-tight">
                        {clientMetrics.activeClients}
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center justify-between pt-0.5">
                        <span>Taxa de Ativação:</span>
                        <span className="font-semibold text-blue-700">{clientMetrics.activePercentage}% da base</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-1">
                      <div className="flex justify-between items-center text-xs text-emerald-800">
                        <span className="font-semibold text-emerald-900">Crescimento de Clientes</span>
                        <UserPlus className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-bold text-emerald-950 tracking-tight">
                        +{clientMetrics.newClientsPeriod} novos
                      </div>
                      <div className="text-[11px] text-emerald-800 flex items-center justify-between pt-0.5">
                        <span>Expansão no Mês:</span>
                        <span className="font-semibold text-emerald-700">
                          {clientMetrics.growthRate > 0 ? '+' : ''}{clientMetrics.growthRate}%
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/40 space-y-1">
                      <div className="flex justify-between items-center text-xs text-purple-800">
                        <span className="font-semibold text-purple-900">Cobertura de Contratos</span>
                        <FileText className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-bold text-purple-950 tracking-tight">
                        {clientMetrics.clientsWithActiveContracts} <span className="text-sm font-normal text-slate-600">/ {clientMetrics.activeClients}</span>
                      </div>
                      <div className="text-[11px] text-purple-800 flex items-center justify-between pt-0.5">
                        <span>Com Recorrência:</span>
                        <span className="font-semibold text-purple-700">{clientMetrics.contractCoveragePercentage}% da carteira</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border border-indigo-200 bg-indigo-50/40 space-y-1">
                      <div className="flex justify-between items-center text-xs text-indigo-800">
                        <span className="font-semibold text-indigo-900">Ticket Médio (ARPU)</span>
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="text-xl font-bold text-indigo-950 tracking-tight">
                        {formatBRL(clientMetrics.averageTicketPerClient)}
                      </div>
                      <div className="text-[11px] text-indigo-800 flex items-center justify-between pt-0.5">
                        <span>MRR Normalizado:</span>
                        <span className="font-semibold text-indigo-700">{formatBRL(mrr)}/mês</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra Visual de Saúde e Distribuição da Carteira */}
                  <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">Composição da Carteira de Clientes:</span>
                      <div className="flex items-center space-x-3 text-[11px]">
                        <span className="flex items-center text-emerald-800">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 mr-1.5" />
                          {clientMetrics.activeClients} Ativos ({clientMetrics.activePercentage}%)
                        </span>
                        <span className="flex items-center text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5" />
                          {clientMetrics.inactiveClients} Inativos ({100 - clientMetrics.activePercentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-emerald-600 h-full transition-all" 
                        style={{ width: `${clientMetrics.activePercentage}%` }} 
                        title={`Ativos: ${clientMetrics.activeClients}`}
                      />
                      <div 
                        className="bg-slate-400 h-full transition-all" 
                        style={{ width: `${100 - clientMetrics.activePercentage}%` }} 
                        title={`Inativos: ${clientMetrics.inactiveClients}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap justify-between items-center text-xs text-slate-600 gap-2">
                  <span className="text-[11px]">
                    Base total de <strong>{clientMetrics.totalClients} clientes</strong> registrados. Última atualização em tempo real.
                  </span>
                  <button
                    onClick={() => onNavigate('CLIENTES')}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center"
                  >
                    Gerenciar Clientes & Contratos
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* GRID DE KPIS DINÂMICOS CONFORME CONFIGURAÇÃO DO USUÁRIO */}
          {config.visibleKpis.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Indicadores Financeiros Chave (KPIs Selecionados)
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('KPIS_CONFIG')}
                  className="text-xs text-indigo-700 hover:text-indigo-900 font-medium flex items-center"
                >
                  <Sliders className="w-3.5 h-3.5 mr-1" />
                  Editar KPIs visíveis
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {KPI_CATALOG
                  .filter(kpi => config.visibleKpis.includes(kpi.id))
                  .map(kpi => {
                    const IconComponent = kpi.icon;
                    return (
                      <div 
                        key={kpi.id}
                        className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-colors space-y-1.5"
                      >
                        <div className="flex justify-between items-center text-xs text-slate-700">
                          <span className="font-medium truncate max-w-[170px]" title={kpi.name}>{kpi.name}</span>
                          <IconComponent className="w-4 h-4 text-slate-500 shrink-0 ml-1" />
                        </div>
                        <div className="text-lg font-bold text-slate-900 tracking-tight">
                          {kpi.value}
                        </div>
                        <div className="text-[11px] text-slate-700 truncate" title={kpi.subtext}>
                          {kpi.subtext}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* BLOCO 1: RESULTADO POR COMPETÊNCIA (DRE ECONÔMICO) */}
          {config.visibleWidgets.includes('widget_dre_economico') && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Demonstração do Resultado do Exercício (DRE Econômico)
                  </h2>
                </div>
                <button
                  onClick={() => onNavigate('DRE')}
                  className="text-xs text-indigo-700 hover:text-indigo-900 font-medium"
                >
                  Abrir DRE Completa →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100">
                  <div className="flex justify-between items-center text-xs text-indigo-900 font-medium">
                    <span>Receita Reconhecida ({dreData.months[effectiveMonthIdx]})</span>
                    <Receipt className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl font-bold text-indigo-950 mt-1">
                    {formatBRL(currentMonthGrossRevenue)}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1 flex justify-between">
                    <span>Acumulado Ano:</span>
                    <span className="font-semibold text-slate-700">{formatBRL(ytdGrossRevenue)}</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <div className="flex justify-between items-center text-xs text-emerald-900 font-medium">
                    <span>Resultado Líquido (Mês)</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-bold text-emerald-950 mt-1">
                    {formatBRL(currentMonthNetResult)}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1 flex justify-between">
                    <span>Margem Gerencial Ano:</span>
                    <span className="font-semibold text-emerald-700">{ytdMargin.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-purple-50/50 border border-purple-100">
                  <div className="flex justify-between items-center text-xs text-purple-900 font-medium">
                    <span>MRR (Receita Recorrente)</span>
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-xl font-bold text-purple-950 mt-1">
                    {formatBRL(mrr)}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1 flex justify-between">
                    <span>Contratos Ativos:</span>
                    <span className="font-semibold text-purple-700">{activeContractsCount} clientes</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-100">
                  <div className="flex justify-between items-center text-xs text-amber-900 font-medium">
                    <span className="flex items-center">
                      Inadimplência Carteira
                      <span title="Fórmula: Saldo Vencido / Saldo Total em Aberto na data" className="ml-1 cursor-help">
                        <HelpCircle className="w-3 h-3 text-amber-600" />
                      </span>
                    </span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-bold text-amber-950 mt-1">
                    {delinquency.rate}%
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1 flex justify-between">
                    <span>Vencido:</span>
                    <span className="font-semibold text-amber-800">{formatBRL(delinquency.overdueBalance)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BLOCO 2: POSIÇÃO FINANCEIRA DE CAIXA E CARTEIRA */}
          {config.visibleWidgets.includes('widget_posicao_caixa') && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Posição Financeira de Caixa & Carteira a Liquidar
                  </h2>
                </div>
                <button
                  onClick={() => onNavigate('FLUXO_CAIXA')}
                  className="text-xs text-indigo-700 hover:text-indigo-900 font-medium"
                >
                  Ver Fluxo de Caixa →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-center text-xs text-slate-700 font-medium">
                    <span>Disponibilidade Bancária</span>
                    <Wallet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {formatBRL(consolidatedCash)}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1">
                    Soma de {bankAccounts.length} contas bancárias PJ
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-emerald-50/40 border border-emerald-100">
                  <div className="flex justify-between items-center text-xs text-emerald-900 font-medium">
                    <span>Recebimentos no Mês (Caixa)</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-bold text-emerald-900 mt-1">
                    {formatBRL(currentMonthCashInflow)}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1">
                    Entradas efetivamente liquidadas
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-rose-50/40 border border-rose-100">
                  <div className="flex justify-between items-center text-xs text-rose-900 font-medium">
                    <span>Pagamentos no Mês (Caixa)</span>
                    <ArrowDownRight className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl font-bold text-rose-900 mt-1">
                    {formatBRL(currentMonthCashOutflow)}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-1">
                    Saídas operacionais liquidadas
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-center text-xs text-slate-700 font-medium">
                    <span>Carteira em Aberto</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-sm font-semibold text-emerald-700 mt-1">
                    + {formatBRL(openReceivables)} <span className="text-[10px] text-slate-700 font-normal">(Receber)</span>
                  </div>
                  <div className="text-sm font-semibold text-rose-700">
                    - {formatBRL(openPayables)} <span className="text-[10px] text-slate-700 font-normal">(Pagar)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WIDGET 6: PRÓXIMOS VENCIMENTOS */}
          {config.visibleWidgets.includes('widget_proximos_vencimentos') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Contas a Receber Próximas */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1.5 text-emerald-600" />
                    Próximos Vencimentos a Receber
                  </h3>
                  <button
                    onClick={() => onNavigate('CONTAS_RECEBER')}
                    className="text-xs font-medium text-indigo-700 hover:text-indigo-900"
                  >
                    Ver todos ({receivables.filter(t => t.balancePrincipal > 0).length}) →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-700 font-medium">
                        <th className="py-2">Cliente</th>
                        <th className="py-2">Vencimento</th>
                        <th className="py-2 text-right">Saldo</th>
                        <th className="py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {upcomingReceivables.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-700">Nenhum vencimento pendente</td>
                        </tr>
                      ) : (
                        upcomingReceivables.map(t => {
                          const client = counterparties.find(c => c.id === t.counterpartyId);
                          const tempStatus = getTemporalStatus(t, today);
                          return (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="py-2.5 font-medium text-slate-900">{client?.name || t.description}</td>
                              <td className="py-2.5 text-slate-600">{formatDateBR(t.dueDate)}</td>
                              <td className="py-2.5 text-right font-bold text-slate-900">{formatBRL(t.balancePrincipal)}</td>
                              <td className="py-2.5 text-center">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                  tempStatus === 'VENCE_HOJE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {tempStatus === 'VENCE_HOJE' ? 'Vence Hoje' : 'A Vencer'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Contas a Pagar Próximas */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                    <TrendingDown className="w-4 h-4 mr-1.5 text-rose-600" />
                    Próximos Vencimentos a Pagar
                  </h3>
                  <button
                    onClick={() => onNavigate('CONTAS_PAGAR')}
                    className="text-xs font-medium text-indigo-700 hover:text-indigo-900"
                  >
                    Ver todos ({payables.filter(t => t.balancePrincipal > 0).length}) →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-700 font-medium">
                        <th className="py-2">Fornecedor</th>
                        <th className="py-2">Vencimento</th>
                        <th className="py-2 text-right">Saldo</th>
                        <th className="py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {upcomingPayables.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-700">Nenhum pagamento pendente</td>
                        </tr>
                      ) : (
                        upcomingPayables.map(t => {
                          const supplier = counterparties.find(c => c.id === t.counterpartyId);
                          const tempStatus = getTemporalStatus(t, today);
                          return (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="py-2.5 font-medium text-slate-900">{supplier?.name || t.description}</td>
                              <td className="py-2.5 text-slate-600">{formatDateBR(t.dueDate)}</td>
                              <td className="py-2.5 text-right font-bold text-rose-700">{formatBRL(t.balancePrincipal)}</td>
                              <td className="py-2.5 text-center">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                  tempStatus === 'VENCE_HOJE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {tempStatus === 'VENCE_HOJE' ? 'Vence Hoje' : 'A Vencer'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CENTRAL DE CONFIGURAÇÃO DE KPIS & WIDGETS (SOLICITAÇÃO DO USUÁRIO)  */}
      {/* ========================================================================= */}
      {activeTab === 'KPIS_CONFIG' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Card with Presets */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center">
                  <Sliders className="w-5 h-5 mr-2 text-indigo-600" />
                  Central de Personalização de KPIs Financeiros
                </h2>
                <p className="text-xs text-slate-700 mt-1">
                  Ative ou desative os indicadores e widgets que deseja visualizar no seu Dashboard. Suas escolhas são salvas automaticamente.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={resetToDefault}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  Restaurar Padrão
                </button>
                <button
                  onClick={() => setActiveTab('DASHBOARD')}
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center"
                >
                  Ver no Dashboard
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </div>
            </div>

            {/* Presets Bar */}
            <div>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Perfis Prontos para Ativação Rápida:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyPreset('EXECUTIVO')}
                  className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 text-xs font-medium transition-colors flex items-center"
                >
                  <Building2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                  Perfil Diretoria & Executivo (MRR, Clientes, Lucro e Inadimplência)
                </button>

                <button
                  onClick={() => applyPreset('COMERCIAL')}
                  className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 text-xs font-medium transition-colors flex items-center"
                >
                  <Users className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Perfil Comercial & Clientes (Clientes Ativos, Crescimento, Cobertura, MRR)
                </button>

                <button
                  onClick={() => applyPreset('TESOURARIA')}
                  className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-xs font-medium transition-colors flex items-center"
                >
                  <Wallet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Perfil Tesouraria & Caixa (Saldos Bancários, Entradas e Saídas)
                </button>

                <button
                  onClick={() => applyPreset('CONTROLADORIA')}
                  className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-900 text-xs font-medium transition-colors flex items-center"
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                  Perfil Controladoria & DRE (Faturamento Anual, Margem Líquida)
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: KPI Selector Grid */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  1. Indicadores Chave de Desempenho (KPIs)
                </h3>
                <p className="text-xs text-slate-700">
                  Clique para marcar ou desmarcar os cartões de indicadores financeiros que serão exibidos no Dashboard.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full font-mono">
                {config.visibleKpis.length} de {KPI_CATALOG.length} selecionados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {KPI_CATALOG.map(kpi => {
                const isSelected = config.visibleKpis.includes(kpi.id);
                const IconComponent = kpi.icon;

                return (
                  <div
                    key={kpi.id}
                    onClick={() => toggleKpi(kpi.id)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {kpi.category}
                        </span>
                        
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 mt-2.5">
                        <IconComponent className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <h4 className="font-bold text-xs text-slate-900">{kpi.name}</h4>
                      </div>

                      <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                        {kpi.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="text-slate-700 text-[10px]">Valor Atual:</span>
                      <span className="font-bold font-mono text-slate-900">{kpi.value}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Widgets Selector */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                2. Blocos e Widgets Estruturais do Dashboard
              </h3>
              <p className="text-xs text-slate-700">
                Escolha quais seções analíticas completas devem compor a interface.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Widget: Faturamento Mensal Resumo */}
              <div 
                onClick={() => toggleWidget('widget_faturamento_resumo')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-start ${
                  config.visibleWidgets.includes('widget_faturamento_resumo')
                    ? 'border-indigo-600 bg-indigo-50/40'
                    : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                }`}
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">Widget: Resumo Rápido de Faturamento</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    Exibe volume de faturamento do mês, contratos emitidos vs pendentes de geração, ticket médio e botão para execução do lote.
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  config.visibleWidgets.includes('widget_faturamento_resumo') ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                }`}>
                  {config.visibleWidgets.includes('widget_faturamento_resumo') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              {/* Widget: Saldos Bancários Consolidados */}
              <div 
                onClick={() => toggleWidget('widget_saldos_consolidados')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-start ${
                  config.visibleWidgets.includes('widget_saldos_consolidados')
                    ? 'border-indigo-600 bg-indigo-50/40'
                    : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                }`}
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center space-x-2">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Widget: Saldos Bancários Consolidados</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    Apresenta cada conta bancária (Itaú, Nubank, Santander, etc.) com seu saldo líquido atualizado e saldo consolidado total da empresa.
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  config.visibleWidgets.includes('widget_saldos_consolidados') ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                }`}>
                  {config.visibleWidgets.includes('widget_saldos_consolidados') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              {/* Widget: Panorama da Carteira de Clientes */}
              <div 
                onClick={() => toggleWidget('widget_resumo_clientes')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-start ${
                  config.visibleWidgets.includes('widget_resumo_clientes')
                    ? 'border-indigo-600 bg-indigo-50/40'
                    : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                }`}
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Bloco: Panorama & Métricas da Carteira de Clientes</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    Exibe número de clientes ativos, taxa de expansão/crescimento líquido, cobertura contratual, ticket médio e distribuição da base.
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  config.visibleWidgets.includes('widget_resumo_clientes') ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                }`}>
                  {config.visibleWidgets.includes('widget_resumo_clientes') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              {/* Widget: DRE Econômica */}
              <div 
                onClick={() => toggleWidget('widget_dre_economico')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-start ${
                  config.visibleWidgets.includes('widget_dre_economico')
                    ? 'border-indigo-600 bg-indigo-50/40'
                    : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                }`}
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">Bloco: Resultado Econômico por Competência (DRE)</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    Visão de faturamento reconhecido, resultado líquido, MRR e taxa de inadimplência da carteira.
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  config.visibleWidgets.includes('widget_dre_economico') ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                }`}>
                  {config.visibleWidgets.includes('widget_dre_economico') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              {/* Widget: Posição de Caixa & Carteira */}
              <div 
                onClick={() => toggleWidget('widget_posicao_caixa')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-start ${
                  config.visibleWidgets.includes('widget_posicao_caixa')
                    ? 'border-indigo-600 bg-indigo-50/40'
                    : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                }`}
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center space-x-2">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Bloco: Posição de Caixa e Carteira a Liquidar</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    Entradas e saídas de caixa liquidadas no mês, além do confronto entre saldo a receber vs saldo a pagar.
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  config.visibleWidgets.includes('widget_posicao_caixa') ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                }`}>
                  {config.visibleWidgets.includes('widget_posicao_caixa') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              {/* Widget: Próximos Vencimentos */}
              <div 
                onClick={() => toggleWidget('widget_proximos_vencimentos')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-start ${
                  config.visibleWidgets.includes('widget_proximos_vencimentos')
                    ? 'border-indigo-600 bg-indigo-50/40'
                    : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                }`}
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Bloco: Próximos Vencimentos (Receber & Pagar)</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    Tabelas operacionais com os próximos 5 recebimentos e 5 pagamentos com alertas de situação temporal.
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  config.visibleWidgets.includes('widget_proximos_vencimentos') ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                }`}>
                  {config.visibleWidgets.includes('widget_proximos_vencimentos') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Action bar */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
            <span className="text-xs text-emerald-900 font-medium flex items-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mr-2" />
              Suas preferências de KPIs e Widgets estão salvas e ativas para sua sessão.
            </span>
            <button
              onClick={() => setActiveTab('DASHBOARD')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center"
            >
              Voltar ao Dashboard
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
