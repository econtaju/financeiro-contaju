import React, { useState, useMemo } from 'react';
import { 
  Sliders, 
  Sparkles, 
  TrendingDown, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  DollarSign, 
  Percent, 
  Users, 
  Eye, 
  EyeOff, 
  HelpCircle,
  Clock,
  Layers,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  SavedCashSimulationScenario, 
  ClientDelinquencySetting, 
  FinancialTitle, 
  Contract, 
  Counterparty 
} from '../../types';
import { storage } from '../../services/storageService';
import { formatBRL } from '../../services/financialEngine';
import { CashSimulationModal } from './CashSimulationModal';
import { TitlesCompositionModal } from './TitlesCompositionModal';

interface CashLiquiditySimulationWidgetProps {
  currentCompetenceStr: string; // ex: '2026-10'
  nominalCashBalance: number;
  allReceivables: FinancialTitle[];
  allPayables: FinancialTitle[];
  contracts: Contract[];
  counterparties: Counterparty[];
  onSelectTitle?: (title: FinancialTitle) => void;
  onOpenStressTesting?: () => void;
}

export const CashLiquiditySimulationWidget: React.FC<CashLiquiditySimulationWidgetProps> = ({
  currentCompetenceStr,
  nominalCashBalance = 0,
  allReceivables = [],
  allPayables = [],
  contracts = [],
  counterparties = [],
  onSelectTitle,
  onOpenStressTesting
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modo de filtro de data para a projeção de liquidez:
  // 'DUE_DATE' = Por Vencimento no Mês (Fluxo Real de Caixa) [Padrão e Recomendado]
  // 'COMPETENCE' = Por Competência do Mês
  // 'BOTH' = Ambos (Acumulado)
  const [dateFilterMode, setDateFilterMode] = useState<'DUE_DATE' | 'COMPETENCE' | 'BOTH'>('DUE_DATE');

  // Modal de Composição Detalhada
  const [compositionModalConfig, setCompositionModalConfig] = useState<{
    isOpen: boolean;
    type: 'RECEBER' | 'PAGAR';
  } | null>(null);

  // Cenários do storage
  const scenarios = useMemo(() => {
    return storage.getCashSimulationScenarios() || [];
  }, [refreshKey]);

  const activeScenario = useMemo(() => {
    return (scenarios || []).find(s => s.isActive) || (scenarios || [])[0] || null;
  }, [scenarios]);

  const [isSimulationEnabled, setIsSimulationEnabled] = useState(true);
  const [showClientDetails, setShowClientDetails] = useState(false);

  // Títulos a Receber do período com base no critério selecionado
  const receivablesTitlesThisMonth = useMemo(() => {
    return (allReceivables || []).filter(t => {
      if (!t || t.documentState !== 'CONFIRMADO') return false;
      const isDue = t.dueDate && t.dueDate.startsWith(currentCompetenceStr);
      const isComp = t.competence && t.competence.startsWith(currentCompetenceStr);
      if (dateFilterMode === 'DUE_DATE') return isDue;
      if (dateFilterMode === 'COMPETENCE') return isComp;
      return isDue || isComp;
    });
  }, [allReceivables, currentCompetenceStr, dateFilterMode]);

  // Títulos a Pagar do período com base no critério selecionado
  const payablesTitlesThisMonth = useMemo(() => {
    return (allPayables || []).filter(t => {
      if (!t || t.documentState !== 'CONFIRMADO') return false;
      const isDue = t.dueDate && t.dueDate.startsWith(currentCompetenceStr);
      const isComp = t.competence && t.competence.startsWith(currentCompetenceStr);
      if (dateFilterMode === 'DUE_DATE') return isDue;
      if (dateFilterMode === 'COMPETENCE') return isComp;
      return isDue || isComp;
    });
  }, [allPayables, currentCompetenceStr, dateFilterMode]);

  // Títulos em aberto para a soma
  const openReceivablesTitles = useMemo(() => {
    return receivablesTitlesThisMonth.filter(t => (t.balancePrincipal || 0) > 0);
  }, [receivablesTitlesThisMonth]);

  const openPayablesTitles = useMemo(() => {
    return payablesTitlesThisMonth.filter(t => (t.balancePrincipal || 0) > 0);
  }, [payablesTitlesThisMonth]);

  const openReceivablesThisMonth = useMemo(() => {
    return Math.round(openReceivablesTitles.reduce((acc, t) => acc + (t.balancePrincipal || 0), 0) * 100) / 100;
  }, [openReceivablesTitles]);

  const openPayablesThisMonth = useMemo(() => {
    return Math.round(openPayablesTitles.reduce((acc, t) => acc + (t.balancePrincipal || 0), 0) * 100) / 100;
  }, [openPayablesTitles]);

  // Selecionar outro cenário ativo
  const handleSelectScenario = (id: string) => {
    storage.setActiveCashSimulationScenario(id);
    setRefreshKey(k => k + 1);
  };

  // Helper para obter o honorário base do cliente no mês
  const getClientExpectedBase = (clientId: string): number => {
    const clientTitles = openReceivablesTitles.filter(t => t.counterpartyId === clientId);
    const sumTitles = clientTitles.reduce((acc, t) => acc + (t.balancePrincipal || 0), 0);
    if (sumTitles > 0) return sumTitles;

    const clientContract = (contracts || []).find(c => c && c.customerId === clientId);
    if (clientContract) return clientContract.monthlyTotal || 0;

    return 1500;
  };

  // Cálculo das deduções por cliente
  const clientDeductions = useMemo(() => {
    if (!activeScenario || !isSimulationEnabled) return [];
    const clientSettings = Array.isArray(activeScenario.clientSettings) ? activeScenario.clientSettings : [];

    return clientSettings.map(cs => {
      const baseValue = getClientExpectedBase(cs.clientId);
      let deduction = 0;

      if (cs.mode === 'TOTAL') {
        deduction = baseValue;
      } else if (cs.mode === 'PERCENTAGE') {
        deduction = (baseValue * (cs.percentage ?? 100)) / 100;
      } else if (cs.mode === 'FIXED_VALUE') {
        deduction = Math.min(baseValue, cs.fixedAmount ?? baseValue);
      }

      return {
        ...cs,
        baseValue,
        deduction: Math.round(deduction * 100) / 100
      };
    });
  }, [activeScenario, isSimulationEnabled, openReceivablesTitles, contracts]);

  const totalExpectedDelinquency = useMemo(() => {
    return clientDeductions.reduce((sum, item) => sum + (item.deduction || 0), 0);
  }, [clientDeductions]);

  // Totais do Nível 1: Nominal
  const nominalProjectedFinal = Math.round((nominalCashBalance + openReceivablesThisMonth - openPayablesThisMonth) * 100) / 100;

  // Totais do Nível 2: Previsto com Inadimplência
  const reliableNetCash = Math.round((nominalProjectedFinal - (isSimulationEnabled ? totalExpectedDelinquency : 0)) * 100) / 100;
  const adjustedReceivables = Math.max(0, Math.round((openReceivablesThisMonth - (isSimulationEnabled ? totalExpectedDelinquency : 0)) * 100) / 100);

  return (
    <div className="bg-white dark:bg-[#121620] rounded-2xl border border-slate-200 dark:border-[#242D3D] shadow-sm overflow-hidden transition-all">
      
      {/* Topo do Widget com Título e Controles de Cenário */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#242D3D] flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-slate-50 to-amber-50/20 dark:from-[#161C28] dark:via-[#161C28] dark:to-amber-950/10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-700 dark:text-amber-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Projeção de Caixa & Cenário Simulado de Inadimplência
              </h3>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                {isSimulationEnabled ? 'Simulação Ativa' : 'Visão Nominal'}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Saldo projetado contratual vs. Saldo previsto com atrasos esperados de clientes
            </div>
          </div>
        </div>

        {/* Seletor de Cenário Salvo + Toggle + Botão Personalizar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Alternador de Cenários Salvos */}
          {scenarios.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-white dark:bg-[#121620] px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-[#242D3D] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Cenário:</span>
              <select
                value={activeScenario?.id || ''}
                onChange={e => handleSelectScenario(e.target.value)}
                className="bg-transparent border-0 text-slate-900 dark:text-slate-100 rounded px-1 text-xs font-bold focus:outline-none cursor-pointer"
              >
                {scenarios.map(s => (
                  <option key={s.id} value={s.id} className="dark:bg-[#121620]">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle para Ligar/Desligar a Simulação */}
          <button
            type="button"
            onClick={() => setIsSimulationEnabled(!isSimulationEnabled)}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-colors border cursor-pointer ${
              isSimulationEnabled
                ? 'bg-amber-100 border-amber-300 text-amber-950 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/25'
                : 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-[#161C28] dark:border-[#242D3D] dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title={isSimulationEnabled ? 'Desativar simulação e ver valores nominais' : 'Ativar simulação de inadimplência'}
          >
            {isSimulationEnabled ? <Eye className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isSimulationEnabled ? 'Simulação Ligada' : 'Ver Nominal (100%)'}</span>
          </button>

          {/* Botão Personalizar */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-950" />
            <span>Personalizar Cenário</span>
          </button>

          {/* Atalho para o Simulador de Estresse (180 Dias) */}
          {onOpenStressTesting && (
            <button
              type="button"
              onClick={onOpenStressTesting}
              className="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-500/30 font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
              title="Abrir Simulador de Estresse e Churn para os próximos 180 dias"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Estresse 180 Dias</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra Informativa de Critério de Data do Período (Explicação da Soma) */}
      <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-[#151A25] border-b border-slate-200 dark:border-[#242D3D] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Info className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            Critério da Projeção para <strong>{currentCompetenceStr}</strong>:
          </span>
          <span className="font-semibold text-slate-600 dark:text-slate-400">
            {dateFilterMode === 'DUE_DATE' && 'Por Vencimento no Mês (Fluxo Real de Caixa)'}
            {dateFilterMode === 'COMPETENCE' && 'Por Competência Faturada'}
            {dateFilterMode === 'BOTH' && 'Ambos (Vencimento + Competência Acumulados)'}
          </span>
        </div>

        {/* Alternador Rápido de Critério */}
        <div className="flex items-center bg-white dark:bg-[#121620] border border-slate-300 dark:border-[#242D3D] rounded-lg p-0.5 text-[11px] font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setDateFilterMode('DUE_DATE')}
            className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
              dateFilterMode === 'DUE_DATE'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Soma apenas contas que vencem neste mês (dinheiro real do caixa)"
          >
            Vencimento (Caixa Real)
          </button>
          <button
            type="button"
            onClick={() => setDateFilterMode('COMPETENCE')}
            className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
              dateFilterMode === 'COMPETENCE'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Soma contas faturadas para esta competência"
          >
            Competência
          </button>
          <button
            type="button"
            onClick={() => setDateFilterMode('BOTH')}
            className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
              dateFilterMode === 'BOTH'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Soma ambos (inclui parcelas com vencimento + competência)"
          >
            Ambos
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* NÍVEL 1: SALDO PROJETADO MENSAL NOMINAL (CONTRATUAL / SEM ATRASOS) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 mr-2" />
              1. Saldo Projetado Contratual do Mês (Sem Inadimplência)
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Previsão nominal considerando 100% de adimplência
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Disponibilidade Atual */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161C28] border border-slate-200 dark:border-[#242D3D] space-y-1 shadow-2xs">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                Disponibilidade Atual
              </div>
              <div className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">
                {formatBRL(nominalCashBalance)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Saldo consolidado em bancos hoje</div>
            </div>

            {/* A Receber no Mês */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900/40 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-400 uppercase font-bold tracking-wider">
                  (+) A Receber no Mês
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300 px-1.5 py-0.2 rounded">
                  {openReceivablesTitles.length} títulos
                </span>
              </div>
              <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                +{formatBRL(openReceivablesThisMonth)}
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-500">Títulos em aberto</span>
                <button
                  type="button"
                  onClick={() => setCompositionModalConfig({ isOpen: true, type: 'RECEBER' })}
                  className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="Ver quais títulos compõem este valor"
                >
                  <span>Ver Composição ➔</span>
                </button>
              </div>
            </div>

            {/* A Pagar no Mês */}
            <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/40 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-rose-800 dark:text-rose-400 uppercase font-bold tracking-wider">
                  (-) A Pagar no Mês
                </span>
                <span className="text-[10px] font-mono font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-300 px-1.5 py-0.2 rounded">
                  {openPayablesTitles.length} títulos
                </span>
              </div>
              <div className="text-lg font-black font-mono text-rose-700 dark:text-rose-400">
                -{formatBRL(openPayablesThisMonth)}
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[10px] text-rose-700 dark:text-rose-500">Obrigações e despesas</span>
                <button
                  type="button"
                  onClick={() => setCompositionModalConfig({ isOpen: true, type: 'PAGAR' })}
                  className="text-[10px] font-bold text-rose-800 dark:text-rose-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="Ver quais contas compõem este valor"
                >
                  <span>Ver Composição ➔</span>
                </button>
              </div>
            </div>

            {/* Saldo Final Projetado Nominal */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-[#161C28] border border-slate-200 dark:border-[#242D3D] space-y-1 shadow-2xs">
              <div className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider">
                (=) Saldo Final Projetado
              </div>
              <div className={`text-lg font-black font-mono ${nominalProjectedFinal >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatBRL(nominalProjectedFinal)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Resultado contratual teórico</div>
            </div>
          </div>
        </div>

        {/* NÍVEL 2: SALDO PREVISTO COM AS INADIMPLÊNCIAS ESPERADAS (CAIXA LÍQUIDO REAL) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 dark:from-amber-950/25 dark:via-[#161C28] dark:to-[#121620] border-2 border-amber-500/50 space-y-3.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
              <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-400">
                2. Saldo Previsto com Inadimplências Esperadas (Caixa Líquido Real)
              </h4>
            </div>

            <div className="flex items-center space-x-2">
              {clientDeductions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClientDetails(!showClientDetails)}
                  className="text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  {showClientDetails ? 'Ocultar Detalhes dos Clientes' : `Ver ${clientDeductions.length} clientes em simulação`}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Bloco de Dedução por Inadimplência Prevista */}
            <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-1 shadow-2xs">
              <div className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-bold flex items-center justify-between">
                <span>(-) Inadimplência Prevista</span>
                <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                {isSimulationEnabled ? `-${formatBRL(totalExpectedDelinquency)}` : 'R$ 0,00'}
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-400">
                {isSimulationEnabled 
                  ? `${clientDeductions.length} cliente(s) com atraso estimado` 
                  : 'Simulação temporariamente desativada'}
              </div>
            </div>

            {/* Bloco de Recebimento Efetivo Ajustado */}
            <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 space-y-1 shadow-2xs">
              <div className="text-[10px] text-emerald-800 dark:text-emerald-400 uppercase font-bold">
                Recebíveis Confiáveis no Mês
              </div>
              <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                {formatBRL(adjustedReceivables)}
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                A receber líquido deduzido o risco
              </div>
            </div>

            {/* Bloco Destaque: Caixa Líquido Confiável que o Usuário Pode Contar */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#161C28] border-2 border-amber-500 shadow-md space-y-1">
              <div className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-black flex items-center justify-between">
                <span>(=) Caixa Líquido Real Confiável</span>
                <Check className="w-4 h-4 text-amber-500 stroke-[3]" />
              </div>
              <div className={`text-2xl font-black font-mono tracking-tight ${
                reliableNetCash >= 0 ? 'text-slate-950 dark:text-white' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatBRL(reliableNetCash)}
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium flex items-center justify-between pt-0.5">
                <span>Saldo seguro para planejamento</span>
                <span className="font-extrabold text-amber-700 dark:text-amber-400">
                  {reliableNetCash >= openPayablesThisMonth ? '✓ Cobertura 100% OK' : '⚠ Atenção ao Caixa'}
                </span>
              </div>
            </div>
          </div>

          {/* Detalhamento dos Clientes Simulados (Expansível) */}
          {showClientDetails && clientDeductions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Clientes com atraso previsto configurados neste cenário:</span>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                >
                  Alterar clientes e porcentagens →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {clientDeductions.map(c => (
                  <div key={c.clientId} className="p-3 rounded-xl bg-white dark:bg-[#161C28] border border-slate-200 dark:border-[#242D3D] text-xs space-y-1 shadow-2xs">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate" title={c.clientName}>
                      {c.clientName}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      <span>Honorário: {formatBRL(c.baseValue)}</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">-{formatBRL(c.deduction)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>
                        {c.mode === 'TOTAL' ? 'Abatimento Total (100%)' : c.mode === 'PERCENTAGE' ? `Abatimento de ${c.percentage}%` : 'Valor Fixo'}
                      </span>
                      {c.notes && <span className="italic truncate max-w-[120px]" title={c.notes}>{c.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Configuração Completa da Simulação */}
      {isModalOpen && (
        <CashSimulationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentCompetenceStr={currentCompetenceStr}
          nominalCashBalance={nominalCashBalance}
          nominalReceivablesThisMonth={openReceivablesThisMonth}
          nominalPayablesThisMonth={openPayablesThisMonth}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      )}

      {/* Modal de Composição Detalhada dos Títulos a Receber/Pagar */}
      {compositionModalConfig && compositionModalConfig.isOpen && (
        <TitlesCompositionModal
          isOpen={compositionModalConfig.isOpen}
          onClose={() => setCompositionModalConfig(null)}
          type={compositionModalConfig.type}
          periodStr={currentCompetenceStr}
          allTitles={compositionModalConfig.type === 'RECEBER' ? allReceivables : allPayables}
          counterparties={counterparties}
          onSelectTitle={(t) => {
            setCompositionModalConfig(null);
            if (onSelectTitle) onSelectTitle(t);
          }}
          initialFilterMode={dateFilterMode}
        />
      )}
    </div>
  );
};
