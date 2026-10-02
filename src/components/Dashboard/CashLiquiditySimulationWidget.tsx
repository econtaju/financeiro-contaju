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
  Check
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

interface CashLiquiditySimulationWidgetProps {
  currentCompetenceStr: string; // ex: '2026-09'
  nominalCashBalance: number;
  openReceivablesThisMonth: number;
  openPayablesThisMonth: number;
  receivablesTitlesThisMonth: FinancialTitle[];
  contracts: Contract[];
  counterparties: Counterparty[];
}

export const CashLiquiditySimulationWidget: React.FC<CashLiquiditySimulationWidgetProps> = ({
  currentCompetenceStr,
  nominalCashBalance,
  openReceivablesThisMonth,
  openPayablesThisMonth,
  receivablesTitlesThisMonth,
  contracts,
  counterparties
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Cenários do storage
  const scenarios = useMemo(() => {
    return storage.getCashSimulationScenarios();
  }, [refreshKey]);

  const activeScenario = useMemo(() => {
    return scenarios.find(s => s.isActive) || scenarios[0] || null;
  }, [scenarios]);

  const [isSimulationEnabled, setIsSimulationEnabled] = useState(true);
  const [showClientDetails, setShowClientDetails] = useState(false);

  // Selecionar outro cenário ativo
  const handleSelectScenario = (id: string) => {
    storage.setActiveCashSimulationScenario(id);
    setRefreshKey(k => k + 1);
  };

  // Helper para obter o honorário base do cliente no mês
  const getClientExpectedBase = (clientId: string): number => {
    const clientTitles = receivablesTitlesThisMonth.filter(t => t.counterpartyId === clientId && t.balancePrincipal > 0);
    const sumTitles = clientTitles.reduce((acc, t) => acc + t.balancePrincipal, 0);
    if (sumTitles > 0) return sumTitles;

    const clientContract = contracts.find(c => c.customerId === clientId);
    if (clientContract) return clientContract.monthlyTotal;

    return 1500;
  };

  // Cálculo das deduções por cliente
  const clientDeductions = useMemo(() => {
    if (!activeScenario || !isSimulationEnabled) return [];

    return activeScenario.clientSettings.map(cs => {
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
  }, [activeScenario, isSimulationEnabled, receivablesTitlesThisMonth, contracts]);

  const totalExpectedDelinquency = useMemo(() => {
    return clientDeductions.reduce((sum, item) => sum + item.deduction, 0);
  }, [clientDeductions]);

  // Totais do Nível 1: Nominal
  const nominalProjectedFinal = nominalCashBalance + openReceivablesThisMonth - openPayablesThisMonth;

  // Totais do Nível 2: Previsto com Inadimplência
  const reliableNetCash = nominalProjectedFinal - (isSimulationEnabled ? totalExpectedDelinquency : 0);
  const adjustedReceivables = Math.max(0, openReceivablesThisMonth - (isSimulationEnabled ? totalExpectedDelinquency : 0));

  return (
    <div className="bg-white dark:bg-[#121620] rounded-xl border border-slate-200 dark:border-[#242D3D] shadow-2xs overflow-hidden">
      {/* Topo do Widget com Título e Controles de Cenário */}
      <div className="p-5 border-b border-slate-200 dark:border-[#242D3D] flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 dark:bg-[#161C28]">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/30 text-amber-700 dark:text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Projeção de Caixa & Cenário Simulado de Inadimplência
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                {isSimulationEnabled ? 'Simulação Ativa' : 'Visão Nominal'}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              Saldo projetado contratual vs. Saldo previsto com atrasos esperados de clientes
            </div>
          </div>
        </div>

        {/* Seletor de Cenário Salvo + Toggle + Botão Personalizar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Alternador de Cenários Salvos */}
          {scenarios.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-white dark:bg-[#121620] px-2.5 py-1 rounded-lg border border-slate-300 dark:border-[#242D3D]">
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Cenário:</span>
              <select
                value={activeScenario?.id || ''}
                onChange={e => handleSelectScenario(e.target.value)}
                className="bg-transparent border-0 text-slate-900 dark:text-slate-100 rounded px-1 py-0.5 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                {scenarios.map(s => (
                  <option key={s.id} value={s.id}>
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
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors border cursor-pointer ${
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
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-2xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-950" />
            <span>Personalizar Cenário</span>
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* NÍVEL 1: SALDO PROJETADO MENSAL NOMINAL (CONTRATUAL / SEM ATRASOS) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center">
              <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5" />
              1. Saldo Projetado Contratual do Mês (Sem Inadimplência)
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Previsão nominal considerando 100% de adimplência
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Disponibilidade Atual */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#161C28] border border-slate-200 dark:border-[#242D3D] space-y-1">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Disponibilidade Atual</div>
              <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-100">
                {formatBRL(nominalCashBalance)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Saldo em bancos hoje</div>
            </div>

            {/* A Receber no Mês */}
            <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 space-y-1">
              <div className="text-[10px] text-emerald-800 dark:text-emerald-400 uppercase font-semibold">
                (+) A Receber no Mês
              </div>
              <div className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-400">
                +{formatBRL(openReceivablesThisMonth)}
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-500">Títulos contratuais em aberto</div>
            </div>

            {/* A Pagar no Mês */}
            <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 space-y-1">
              <div className="text-[10px] text-rose-800 dark:text-rose-400 uppercase font-semibold">
                (-) A Pagar no Mês
              </div>
              <div className="text-base font-bold font-mono text-rose-800 dark:text-rose-400">
                -{formatBRL(openPayablesThisMonth)}
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-500">Obrigações e despesas do mês</div>
            </div>

            {/* Saldo Final Projetado Nominal */}
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-[#161C28] border border-slate-200 dark:border-[#242D3D] space-y-1">
              <div className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-semibold">
                (=) Saldo Final Projetado
              </div>
              <div className={`text-base font-bold font-mono ${nominalProjectedFinal >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatBRL(nominalProjectedFinal)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Resultado contratual teórico</div>
            </div>
          </div>
        </div>

        {/* NÍVEL 2: SALDO PREVISTO COM AS INADIMPLÊNCIAS ESPERADAS (CAIXA LÍQUIDO REAL) */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 dark:from-amber-950/20 dark:via-[#161C28] dark:to-[#121620] border-2 border-amber-500/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                2. Saldo Previsto com Inadimplências Esperadas (Caixa Líquido Real)
              </h4>
            </div>

            <div className="flex items-center space-x-2">
              {clientDeductions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClientDetails(!showClientDetails)}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                >
                  {showClientDetails ? 'Ocultar Detalhes dos Clientes' : `Ver ${clientDeductions.length} clientes em simulação`}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Bloco de Dedução por Inadimplência Prevista */}
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-1">
              <div className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-semibold flex items-center justify-between">
                <span>(-) Inadimplência Prevista</span>
                <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-lg font-extrabold font-mono text-rose-600 dark:text-rose-400">
                {isSimulationEnabled ? `-${formatBRL(totalExpectedDelinquency)}` : 'R$ 0,00'}
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-400">
                {isSimulationEnabled 
                  ? `${clientDeductions.length} cliente(s) com atraso estimado` 
                  : 'Simulação temporariamente desativada'}
              </div>
            </div>

            {/* Bloco de Recebimento Efetivo Ajustado */}
            <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 space-y-1">
              <div className="text-[10px] text-emerald-800 dark:text-emerald-400 uppercase font-semibold">
                Recebíveis Confiáveis no Mês
              </div>
              <div className="text-lg font-bold font-mono text-emerald-800 dark:text-emerald-400">
                {formatBRL(adjustedReceivables)}
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                A receber líquido deduzido o risco
              </div>
            </div>

            {/* Bloco Destaque: Caixa Líquido Confiável que o Usuário Pode Contar */}
            <div className="p-3.5 rounded-lg bg-white dark:bg-[#161C28] border-2 border-amber-500 shadow-xs space-y-1">
              <div className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-extrabold flex items-center justify-between">
                <span>(=) Caixa Líquido Real Confiável</span>
                <Check className="w-4 h-4 text-amber-500" />
              </div>
              <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                reliableNetCash >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatBRL(reliableNetCash)}
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium flex items-center justify-between">
                <span>Saldo seguro para planejamento</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  {reliableNetCash >= openPayablesThisMonth ? 'Cobertura 100% OK' : 'Atenção ao Caixa'}
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
                  className="text-[11px] text-amber-500 hover:text-amber-400 hover:underline font-semibold"
                >
                  Alterar clientes e porcentagens →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {clientDeductions.map(c => (
                  <div key={c.clientId} className="p-2.5 rounded-lg bg-white dark:bg-[#161C28] border border-slate-200 dark:border-[#242D3D] text-xs space-y-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate" title={c.clientName}>
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
    </div>
  );
};
