import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  RotateCcw, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert, 
  Zap, 
  Target, 
  DollarSign, 
  PieChart, 
  ChevronRight,
  Sparkles,
  Layers,
  X
} from 'lucide-react';
import { formatBRL } from '../../services/financialEngine';
import { DREMatrix } from '../../services/reportingEngine';

export interface WhatIfScenario {
  name: string;
  revenueDelta: number; // ex: +10% ou -15%
  costDelta: number;    // ex: -5%
  opExpDelta: number;   // ex: +2%
  finExpDelta: number;  // ex: 0%
  appliedAt: string;
}

interface DREWhatIfModalProps {
  isOpen: boolean;
  onClose: () => void;
  dreData: DREMatrix;
  effectiveYear: number;
  kpis: {
    grossRev: number;
    netRev: number;
    costs: number;
    grossProfit: number;
    opExpenses: number;
    opResult: number;
    finResult: number;
    netResult: number;
  };
  activeScenario: WhatIfScenario | null;
  onApplyScenario: (scenario: WhatIfScenario | null) => void;
}

export const DREWhatIfModal: React.FC<DREWhatIfModalProps> = ({
  isOpen,
  onClose,
  dreData,
  effectiveYear,
  kpis,
  activeScenario,
  onApplyScenario
}) => {
  const [revenueDelta, setRevenueDelta] = useState<number>(activeScenario?.revenueDelta || 0);
  const [costDelta, setCostDelta] = useState<number>(activeScenario?.costDelta || 0);
  const [opExpDelta, setOpExpDelta] = useState<number>(activeScenario?.opExpDelta || 0);
  const [finExpDelta, setFinExpDelta] = useState<number>(activeScenario?.finExpDelta || 0);
  const [scenarioName, setScenarioName] = useState<string>(activeScenario?.name || 'Cenário Personalizado');

  // Sincronizar parâmetros caso o modal seja reaberto ou o cenário mude
  useEffect(() => {
    if (isOpen) {
      setRevenueDelta(activeScenario?.revenueDelta || 0);
      setCostDelta(activeScenario?.costDelta || 0);
      setOpExpDelta(activeScenario?.opExpDelta || 0);
      setFinExpDelta(activeScenario?.finExpDelta || 0);
      setScenarioName(activeScenario?.name || 'Cenário Personalizado');
    }
  }, [isOpen, activeScenario]);

  // Cálculos do Cenário Simulado (Hook executado incondicionalmente em todos os renders)
  const simulation = useMemo(() => {
    // 1. Receita Bruta
    const baseGross = kpis.grossRev;
    const simGross = Math.max(0, baseGross * (1 + revenueDelta / 100));

    // Deduções (proporcionais à receita bruta)
    const baseDeductions = baseGross - kpis.netRev;
    const simDeductions = baseGross > 0 ? (baseDeductions / baseGross) * simGross : 0;
    const simNetRev = Math.max(0, simGross - simDeductions);

    // 2. Custos Operacionais
    const baseCosts = kpis.costs;
    const simCosts = Math.max(0, baseCosts * (1 + costDelta / 100));

    // 3. Lucro Bruto
    const simGrossProfit = simNetRev - simCosts;
    const baseGrossMargin = kpis.netRev > 0 ? (kpis.grossProfit / kpis.netRev) * 100 : 0;
    const simGrossMargin = simNetRev > 0 ? (simGrossProfit / simNetRev) * 100 : 0;

    // 4. Despesas Operacionais
    const baseOpExp = kpis.opExpenses;
    const simOpExp = Math.max(0, baseOpExp * (1 + opExpDelta / 100));

    // 5. EBITDA / Resultado Operacional
    const simOpResult = simGrossProfit - simOpExp;
    const baseOpMargin = kpis.netRev > 0 ? (kpis.opResult / kpis.netRev) * 100 : 0;
    const simOpMargin = simNetRev > 0 ? (simOpResult / simNetRev) * 100 : 0;

    // 6. Despesas Financeiras
    const baseFin = kpis.finResult;
    const simFin = baseFin < 0 
      ? baseFin * (1 + finExpDelta / 100) 
      : baseFin * (1 - finExpDelta / 100);

    // 7. Resultado Líquido
    const simNetResult = simOpResult + simFin;
    const baseNetMargin = kpis.netRev > 0 ? (kpis.netResult / kpis.netRev) * 100 : 0;
    const simNetMargin = simNetRev > 0 ? (simNetResult / simNetRev) * 100 : 0;

    // 8. Ponto de Equilíbrio (Break-Even Point R$)
    const simContributionMarginPct = simNetRev > 0 ? Math.max((simNetRev - simCosts) / simNetRev, 0.05) : 0.05;
    const baseContributionMarginPct = kpis.netRev > 0 ? Math.max((kpis.netRev - baseCosts) / kpis.netRev, 0.05) : 0.05;

    const baseBreakEven = baseOpExp / baseContributionMarginPct;
    const simBreakEven = simOpExp / simContributionMarginPct;
    const breakEvenDiff = simBreakEven - baseBreakEven;

    // Variações nominais
    const netResultDiff = simNetResult - kpis.netResult;
    const netResultDiffPct = kpis.netResult !== 0 
      ? (netResultDiff / Math.abs(kpis.netResult)) * 100 
      : (simNetResult > 0 ? 100 : 0);

    return {
      simGross,
      simNetRev,
      simCosts,
      simGrossProfit,
      baseGrossMargin,
      simGrossMargin,
      simOpExp,
      simOpResult,
      baseOpMargin,
      simOpMargin,
      simFin,
      simNetResult,
      baseNetMargin,
      simNetMargin,
      netResultDiff,
      netResultDiffPct,
      baseBreakEven,
      simBreakEven,
      breakEvenDiff
    };
  }, [kpis, revenueDelta, costDelta, opExpDelta, finExpDelta]);

  if (!isOpen) return null;

  // Presets rápidos
  const applyPreset = (preset: { name: string; rev: number; cost: number; opExp: number; finExp: number }) => {
    setScenarioName(preset.name);
    setRevenueDelta(preset.rev);
    setCostDelta(preset.cost);
    setOpExpDelta(preset.opExp);
    setFinExpDelta(preset.finExp);
  };

  const handleReset = () => {
    setScenarioName('Cenário Base (Realizado)');
    setRevenueDelta(0);
    setCostDelta(0);
    setOpExpDelta(0);
    setFinExpDelta(0);
  };

  const handleApply = () => {
    if (revenueDelta === 0 && costDelta === 0 && opExpDelta === 0 && finExpDelta === 0) {
      onApplyScenario(null);
    } else {
      onApplyScenario({
        name: scenarioName || 'Cenário Customizado',
        revenueDelta,
        costDelta,
        opExpDelta,
        finExpDelta,
        appliedAt: new Date().toISOString()
      });
    }
    onClose();
  };

  const handleClearApplied = () => {
    handleReset();
    onApplyScenario(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-[var(--border-subtle)] flex flex-col max-h-[92vh]">
        
        {/* Cabeçalho */}
        <div className="p-5 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mt-0.5">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Planejamento Estratégico & Stress Testing
                </span>
                {activeScenario && (
                  <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Cenário Ativo no DRE
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mt-1">
                Simulação de Cenários de Sensibilidade (What-If)
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Simule variações de receita, custos e despesas para antecipar impactos no EBITDA, Lucro Líquido e Ponto de Equilíbrio em {effectiveYear}.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--surface-card)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Presets Estratégicos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Cenários Pré-Configurados (Recomendações de Mercado):
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <RotateCcw className="w-3 h-3" /> Resetar Ajustes (0%)
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset({ name: 'Cenário Otimista', rev: 15, cost: -5, opExp: -3, finExp: 0 })}
                className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-emerald-400 flex items-center justify-between">
                  <span>Otimista</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  +15% Vendas, -5% Custos, -3% Despesas
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset({ name: 'Cenário Conservador', rev: -8, cost: 4, opExp: 0, finExp: 0 })}
                className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-amber-400 flex items-center justify-between">
                  <span>Conservador</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  -8% Vendas, +4% Custos, 0% Despesas
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset({ name: 'Stress Test (Crise)', rev: -20, cost: 8, opExp: 5, finExp: 15 })}
                className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-rose-400 flex items-center justify-between">
                  <span>Stress Test</span>
                  <ShieldAlert className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  -20% Vendas, +8% Custos, +15% Juros
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset({ name: 'Corte de Gastos', rev: 0, cost: -12, opExp: -10, finExp: -5 })}
                className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-blue-400 flex items-center justify-between">
                  <span>Corte de Gastos</span>
                  <Zap className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  0% Vendas, -12% Custos, -10% Desp.
                </div>
              </button>
            </div>
          </div>

          {/* Sliders de Sensibilidade */}
          <div className="bg-[var(--surface-elevated)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-4">
            <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Ajuste das Variáveis de Sensibilidade (% de Variação):</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Slider 1: Receita Operacional */}
              <div className="space-y-1.5 bg-[var(--surface-card)] p-3 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-[var(--text-primary)]">Receita Operacional Bruta:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    revenueDelta > 0 ? 'bg-emerald-500/20 text-emerald-400' :
                    revenueDelta < 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-300'
                  }`}>
                    {revenueDelta > 0 ? `+${revenueDelta}%` : `${revenueDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={revenueDelta}
                  onChange={(e) => setRevenueDelta(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-50%</span>
                  <span>Base (0%)</span>
                  <span>+50%</span>
                </div>
              </div>

              {/* Slider 2: Custos CMV */}
              <div className="space-y-1.5 bg-[var(--surface-card)] p-3 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-[var(--text-primary)]">(-) Custos Operacionais (CMV):</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    costDelta < 0 ? 'bg-emerald-500/20 text-emerald-400' :
                    costDelta > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-300'
                  }`}>
                    {costDelta > 0 ? `+${costDelta}%` : `${costDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={costDelta}
                  onChange={(e) => setCostDelta(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-50% (Economia)</span>
                  <span>Base (0%)</span>
                  <span>+50% (Aumento)</span>
                </div>
              </div>

              {/* Slider 3: Despesas Operacionais */}
              <div className="space-y-1.5 bg-[var(--surface-card)] p-3 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-[var(--text-primary)]">(-) Despesas Operacionais (Fixas/Var):</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    opExpDelta < 0 ? 'bg-emerald-500/20 text-emerald-400' :
                    opExpDelta > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-300'
                  }`}>
                    {opExpDelta > 0 ? `+${opExpDelta}%` : `${opExpDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={opExpDelta}
                  onChange={(e) => setOpExpDelta(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-50% (Economia)</span>
                  <span>Base (0%)</span>
                  <span>+50% (Aumento)</span>
                </div>
              </div>

              {/* Slider 4: Despesas Financeiras */}
              <div className="space-y-1.5 bg-[var(--surface-card)] p-3 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-[var(--text-primary)]">(-) Despesas Financeiras & Juros:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    finExpDelta < 0 ? 'bg-emerald-500/20 text-emerald-400' :
                    finExpDelta > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-300'
                  }`}>
                    {finExpDelta > 0 ? `+${finExpDelta}%` : `${finExpDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={finExpDelta}
                  onChange={(e) => setFinExpDelta(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-50%</span>
                  <span>Base (0%)</span>
                  <span>+50%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cards Executivos de Impacto do Cenário Simulado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Resultado Líquido Simulado */}
            <div className={`p-4 rounded-xl border ${
              simulation.simNetResult >= 0 
                ? 'bg-amber-500/10 border-amber-500/30' 
                : 'bg-rose-500/10 border-rose-500/30'
            }`}>
              <div className="text-[11px] uppercase font-bold text-[var(--text-secondary)] flex justify-between items-center">
                <span>Resultado Líquido Simulado</span>
                {simulation.netResultDiff >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <div className={`mt-2 text-xl font-mono font-black ${
                simulation.simNetResult >= 0 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {formatBRL(simulation.simNetResult)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                <span className="text-[var(--text-secondary)]">Variação vs Realizado:</span>
                <span className={`font-mono font-bold ${
                  simulation.netResultDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {simulation.netResultDiff >= 0 ? '+' : ''}{formatBRL(simulation.netResultDiff)} ({simulation.netResultDiffPct.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* 2. Margem EBITDA / Margem Líquida */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[var(--surface-elevated)]">
              <div className="text-[11px] uppercase font-bold text-[var(--text-secondary)] flex justify-between items-center">
                <span>Margem Líquida Projetada</span>
                <PieChart className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-xl font-mono font-black text-[var(--text-primary)]">
                {simulation.simNetMargin.toFixed(1)}%
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                <span>Margem Realizada Anterior:</span>
                <span className="font-mono font-semibold">{simulation.baseNetMargin.toFixed(1)}%</span>
              </div>
            </div>

            {/* 3. Ponto de Equilíbrio (Break-Even) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[var(--surface-elevated)]">
              <div className="text-[11px] uppercase font-bold text-[var(--text-secondary)] flex justify-between items-center">
                <span>Novo Ponto de Equilíbrio</span>
                <Target className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-xl font-mono font-black text-slate-100">
                {formatBRL(simulation.simBreakEven)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                <span className="text-[var(--text-secondary)]">Meta Faturamento Mínimo:</span>
                <span className={`font-mono font-bold ${
                  simulation.breakEvenDiff <= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {simulation.breakEvenDiff > 0 ? '+' : ''}{formatBRL(simulation.breakEvenDiff)}
                </span>
              </div>
            </div>
          </div>

          {/* Tabela Comparativa Detalhada: Realizado vs Simulado */}
          <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <div className="bg-[var(--surface-elevated)] p-2.5 border-b border-[var(--border-subtle)] font-bold text-xs text-[var(--text-primary)] flex items-center justify-between">
              <span>Demonstrativo Comparativo Sintético: Realizado vs Simulação</span>
              <span className="text-[10px] text-slate-400 font-normal">Exercício Anual Acumulado ({effectiveYear})</span>
            </div>
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/60 text-slate-300 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Estrutura DRE</th>
                  <th className="py-2 px-3 text-right">Realizado Base</th>
                  <th className="py-2 px-3 text-right">Cenário Simulado</th>
                  <th className="py-2 px-3 text-right">Diferença (R$)</th>
                  <th className="py-2 px-3 text-right">Impacto %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                <tr>
                  <td className="py-2 px-3 font-sans font-semibold text-[var(--text-primary)]">1. Receita Operacional Bruta</td>
                  <td className="py-2 px-3 text-right">{formatBRL(kpis.grossRev)}</td>
                  <td className="py-2 px-3 text-right font-bold text-amber-400">{formatBRL(simulation.simGross)}</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                    {simulation.simGross - kpis.grossRev >= 0 ? '+' : ''}{formatBRL(simulation.simGross - kpis.grossRev)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold">
                    {revenueDelta >= 0 ? `+${revenueDelta}%` : `${revenueDelta}%`}
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-3 font-sans font-semibold text-[var(--text-primary)]">(=) Receita Operacional Líquida</td>
                  <td className="py-2 px-3 text-right">{formatBRL(kpis.netRev)}</td>
                  <td className="py-2 px-3 text-right font-bold text-amber-400">{formatBRL(simulation.simNetRev)}</td>
                  <td className="py-2 px-3 text-right font-bold">
                    {simulation.simNetRev - kpis.netRev >= 0 ? '+' : ''}{formatBRL(simulation.simNetRev - kpis.netRev)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold">
                    {kpis.netRev > 0 ? `${(((simulation.simNetRev - kpis.netRev) / kpis.netRev) * 100).toFixed(1)}%` : '-'}
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-3 font-sans text-rose-400">(-) Custos Operacionais (CMV)</td>
                  <td className="py-2 px-3 text-right text-rose-300">{formatBRL(kpis.costs)}</td>
                  <td className="py-2 px-3 text-right font-bold text-rose-400">{formatBRL(simulation.simCosts)}</td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-400">
                    {simulation.simCosts - kpis.costs <= 0 ? '' : '+'}{formatBRL(simulation.simCosts - kpis.costs)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold">
                    {costDelta >= 0 ? `+${costDelta}%` : `${costDelta}%`}
                  </td>
                </tr>

                <tr className="bg-amber-500/5 font-bold">
                  <td className="py-2 px-3 font-sans text-amber-300">(=) LUCRO BRUTO</td>
                  <td className="py-2 px-3 text-right text-amber-200">{formatBRL(kpis.grossProfit)}</td>
                  <td className="py-2 px-3 text-right text-amber-400 font-extrabold">{formatBRL(simulation.simGrossProfit)}</td>
                  <td className="py-2 px-3 text-right text-emerald-400">
                    {simulation.simGrossProfit - kpis.grossProfit >= 0 ? '+' : ''}{formatBRL(simulation.simGrossProfit - kpis.grossProfit)}
                  </td>
                  <td className="py-2 px-3 text-right text-amber-300">
                    Margem: {simulation.simGrossMargin.toFixed(1)}%
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-3 font-sans text-slate-300">(-) Despesas Operacionais</td>
                  <td className="py-2 px-3 text-right">{formatBRL(kpis.opExpenses)}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-200">{formatBRL(simulation.simOpExp)}</td>
                  <td className="py-2 px-3 text-right font-bold">
                    {simulation.simOpExp - kpis.opExpenses <= 0 ? '' : '+'}{formatBRL(simulation.simOpExp - kpis.opExpenses)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold">
                    {opExpDelta >= 0 ? `+${opExpDelta}%` : `${opExpDelta}%`}
                  </td>
                </tr>

                <tr className="bg-amber-500/10 font-bold border-t border-amber-500/30">
                  <td className="py-2 px-3 font-sans text-amber-300">(=) RESULTADO OPERACIONAL (EBITDA)</td>
                  <td className="py-2 px-3 text-right text-amber-200">{formatBRL(kpis.opResult)}</td>
                  <td className="py-2 px-3 text-right text-amber-400 font-extrabold">{formatBRL(simulation.simOpResult)}</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-extrabold">
                    {simulation.simOpResult - kpis.opResult >= 0 ? '+' : ''}{formatBRL(simulation.simOpResult - kpis.opResult)}
                  </td>
                  <td className="py-2 px-3 text-right text-amber-300">
                    Margem: {simulation.simOpMargin.toFixed(1)}%
                  </td>
                </tr>

                <tr className="bg-amber-500/20 font-black border-y-2 border-amber-500 text-sm">
                  <td className="py-2.5 px-3 font-sans uppercase tracking-tight text-amber-400">(=) RESULTADO LÍQUIDO SIMULADO</td>
                  <td className="py-2.5 px-3 text-right text-amber-200">{formatBRL(kpis.netResult)}</td>
                  <td className="py-2.5 px-3 text-right text-amber-300 font-black">{formatBRL(simulation.simNetResult)}</td>
                  <td className={`py-2.5 px-3 text-right ${simulation.netResultDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {simulation.netResultDiff >= 0 ? '+' : ''}{formatBRL(simulation.netResultDiff)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-400 font-black">
                    {simulation.simNetMargin.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-[var(--text-secondary)]">
            {activeScenario ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Cenário aplicado: <strong>{activeScenario.name}</strong>
              </span>
            ) : (
              <span>Nenhum cenário aplicado à grade principal do DRE no momento.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeScenario && (
              <button
                type="button"
                onClick={handleClearApplied}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors cursor-pointer"
              >
                Remover Cenário do DRE
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{activeScenario ? 'Atualizar Cenário no DRE' : 'Aplicar Simulação no DRE'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
