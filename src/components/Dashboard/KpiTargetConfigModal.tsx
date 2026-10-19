import React, { useState, useEffect } from 'react';
import { 
  X, 
  Target, 
  Save, 
  RotateCcw, 
  Calendar, 
  TrendingUp, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { storage } from '../../services/storageService';
import { KpiTarget } from '../../types';
import { formatBRL } from '../../services/financialEngine';

interface KpiTargetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  onSaved?: () => void;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const KPI_META_NAMES: Record<string, { name: string; format: 'CURRENCY' | 'PERCENT' | 'INTEGER'; defaultVal: number }> = {
  faturamento_bruto: { name: 'Receita Bruta (Faturamento)', format: 'CURRENCY', defaultVal: 35000 },
  resultado_liquido: { name: 'Resultado Líquido', format: 'CURRENCY', defaultVal: 10500 },
  margem_liquida: { name: 'Margem Líquida (%)', format: 'PERCENT', defaultVal: 30 },
  mrr: { name: 'MRR (Receita Recorrente)', format: 'CURRENCY', defaultVal: 25000 },
  clientes_ativos: { name: 'Clientes Ativos sob Contrato', format: 'INTEGER', defaultVal: 10 },
  crescimento_clientes: { name: 'Novos Clientes (Mês)', format: 'INTEGER', defaultVal: 2 },
  churn_clientes: { name: 'Churn de Clientes (Máximo)', format: 'INTEGER', defaultVal: 0 },
  taxa_churn: { name: 'Taxa de Churn (%) (Máximo)', format: 'PERCENT', defaultVal: 1.5 },
  ticket_medio: { name: 'Ticket Médio por Cliente', format: 'CURRENCY', defaultVal: 2500 },
  saldo_disponivel: { name: 'Disponibilidade em Caixa', format: 'CURRENCY', defaultVal: 100000 },
  entradas_caixa: { name: 'Entradas de Caixa', format: 'CURRENCY', defaultVal: 35000 },
  saidas_caixa: { name: 'Saídas de Caixa (Teto)', format: 'CURRENCY', defaultVal: 24500 },
  saldo_liquido_caixa: { name: 'Geração Líquida de Caixa', format: 'CURRENCY', defaultVal: 10500 },
  inadimplencia: { name: 'Inadimplência (%) (Máximo)', format: 'PERCENT', defaultVal: 5 },
  contas_receber_aberto: { name: 'A Receber em Aberto', format: 'CURRENCY', defaultVal: 20000 },
  contas_pagar_aberto: { name: 'A Pagar em Aberto', format: 'CURRENCY', defaultVal: 15000 }
};

export const KpiTargetConfigModal: React.FC<KpiTargetConfigModalProps> = ({
  isOpen,
  onClose,
  year,
  onSaved
}) => {
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [expandedKpiId, setExpandedKpiId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentTargets = storage.getKpiTargets(year);
      setTargets(JSON.parse(JSON.stringify(currentTargets)));
      setSuccessMsg(false);
    }
  }, [isOpen, year]);

  if (!isOpen) return null;

  const handleUpdateMonthlyVal = (kpiId: string, monthIdx: number, val: number) => {
    setTargets(prev => prev.map(t => {
      if (t.kpiId !== kpiId) return t;
      const newMonthly = [...t.monthlyTargets];
      newMonthly[monthIdx] = val;
      const isPercentOrAverage = KPI_META_NAMES[kpiId]?.format === 'PERCENT' || kpiId === 'mrr' || kpiId === 'clientes_ativos' || kpiId === 'ticket_medio';
      const newAnnual = isPercentOrAverage
        ? val
        : newMonthly.reduce((a, b) => a + b, 0);
      return {
        ...t,
        monthlyTargets: newMonthly,
        annualTarget: newAnnual,
        updatedAt: new Date().toISOString()
      };
    }));
  };

  const handleDistributeEvenly = (kpiId: string, baseVal: number) => {
    setTargets(prev => prev.map(t => {
      if (t.kpiId !== kpiId) return t;
      const isPercentOrAverage = KPI_META_NAMES[kpiId]?.format === 'PERCENT' || kpiId === 'mrr' || kpiId === 'clientes_ativos' || kpiId === 'ticket_medio';
      const monthlyVal = isPercentOrAverage ? baseVal : Math.round((baseVal / 12) * 100) / 100;
      return {
        ...t,
        monthlyTargets: Array.from({ length: 12 }, () => monthlyVal),
        annualTarget: baseVal,
        updatedAt: new Date().toISOString()
      };
    }));
  };

  const handleApplyMonthlyGrowth = (kpiId: string, initialMonthVal: number, growthRatePct: number) => {
    setTargets(prev => prev.map(t => {
      if (t.kpiId !== kpiId) return t;
      const newMonthly: number[] = [];
      let cur = initialMonthVal;
      for (let i = 0; i < 12; i++) {
        newMonthly.push(Math.round(cur * 100) / 100);
        cur *= (1 + growthRatePct / 100);
      }
      const isPercent = KPI_META_NAMES[kpiId]?.format === 'PERCENT';
      const newAnnual = isPercent ? newMonthly[11] : newMonthly.reduce((a, b) => a + b, 0);
      return {
        ...t,
        monthlyTargets: newMonthly,
        annualTarget: Math.round(newAnnual * 100) / 100,
        updatedAt: new Date().toISOString()
      };
    }));
  };

  const handleResetDefaults = () => {
    if (window.confirm(`Deseja restaurar as metas sugeridas padrão para o ano de ${year}?`)) {
      const defaults = storage.getDefaultKpiTargets(year);
      setTargets(defaults);
    }
  };

  const handleSave = () => {
    storage.saveKpiTargets(targets);
    setSuccessMsg(true);
    if (onSaved) onSaved();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Configuração de Metas Orçamentárias dos KPIs
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                  Ano {year}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Defina os objetivos mensais e anuais para acompanhar o percentual de atingimento (Planejado vs. Realizado).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-start space-x-2.5">
            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
            <span>
              Você pode definir uma meta rápida de valor mensal uniforme ou expandir cada linha para especificar metas sazonais mês a mês de Janeiro a Dezembro.
            </span>
          </div>

          <div className="space-y-3">
            {targets.map(target => {
              const metaInfo = KPI_META_NAMES[target.kpiId] || { name: target.kpiId, format: 'CURRENCY', defaultVal: 0 };
              const isExpanded = expandedKpiId === target.kpiId;
              const formatType = metaInfo.format;

              return (
                <div 
                  key={target.kpiId}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{metaInfo.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-card)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                          {formatType}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] flex items-center space-x-2">
                        <span>Meta Anual/Referência:</span>
                        <strong className="text-amber-400 font-mono">
                          {formatType === 'CURRENCY' ? formatBRL(target.annualTarget) : `${target.annualTarget}${formatType === 'PERCENT' ? '%' : ' un.'}`}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] text-[var(--text-secondary)]">Meta Mensal Padrão:</span>
                        <input
                          type="number"
                          step={formatType === 'PERCENT' ? '0.1' : '100'}
                          value={target.monthlyTargets[0] || 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleDistributeEvenly(target.kpiId, formatType === 'PERCENT' ? val : val * 12);
                          }}
                          className="w-28 px-2 py-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg text-xs font-mono font-bold text-right text-[var(--text-primary)] focus:border-amber-400 focus:outline-hidden"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedKpiId(isExpanded ? null : target.kpiId)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--surface-card)] text-[var(--text-secondary)] flex items-center cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5 mr-1" />
                            Ocultar Meses
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 mr-1" />
                            Editar 12 Meses
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Detalhamento dos 12 meses */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] space-y-3 animate-in fade-in duration-150">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[var(--text-secondary)]">Distribuição Mensal Personalizada:</span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              const p = prompt('Informe a taxa de crescimento mensal esperada (% ex: 2.5):', '2.0');
                              if (p) {
                                const rate = parseFloat(p);
                                if (!isNaN(rate)) handleApplyMonthlyGrowth(target.kpiId, target.monthlyTargets[0] || 1000, rate);
                              }
                            }}
                            className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center cursor-pointer"
                          >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Aplicar Rampa de Crescimento %
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {MONTH_NAMES.map((mName, mIdx) => (
                          <div key={mIdx} className="p-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-1">
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{mName}</div>
                            <input
                              type="number"
                              step={formatType === 'PERCENT' ? '0.1' : '10'}
                              value={target.monthlyTargets[mIdx] || 0}
                              onChange={(e) => handleUpdateMonthlyVal(target.kpiId, mIdx, parseFloat(e.target.value) || 0)}
                              className="w-full px-1.5 py-0.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded text-xs font-mono font-semibold text-right text-[var(--text-primary)] focus:border-amber-400 focus:outline-hidden"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Restaurar Sugeridos
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-card)] rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg shadow-sm transition-all flex items-center cursor-pointer active:scale-95"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {successMsg ? 'Salvo com Sucesso!' : 'Salvar Metas Orçamentárias'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
