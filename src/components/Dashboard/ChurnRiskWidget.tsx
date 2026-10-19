import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  TrendingDown, 
  PhoneCall, 
  ArrowRight, 
  Search, 
  Filter, 
  FileText, 
  Clock, 
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ChurnPredictionEngine } from '../../services/churnPredictionEngine';
import { CustomerChurnRiskAssessment, ChurnRiskLevel } from '../../types';
import { formatBRL } from '../../services/financialEngine';

interface ChurnRiskWidgetProps {
  onNavigateScreen?: (screen: string) => void;
  isCompactMode?: boolean;
}

export const ChurnRiskWidget: React.FC<ChurnRiskWidgetProps> = ({
  onNavigateScreen,
  isCompactMode = false
}) => {
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'TODOS' | ChurnRiskLevel>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionDoneMap, setActionDoneMap] = useState<Record<string, string>>({});

  const summary = useMemo(() => {
    return ChurnPredictionEngine.getPortfolioRiskSummary();
  }, []);

  const filteredAssessments = useMemo(() => {
    return summary.assessments.filter(item => {
      if (selectedRiskFilter !== 'TODOS' && item.riskLevel !== selectedRiskFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          item.customerName.toLowerCase().includes(term) ||
          (item.contractNumber && item.contractNumber.toLowerCase().includes(term)) ||
          item.riskFactors.some(f => f.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [summary.assessments, selectedRiskFilter, searchTerm]);

  const getRiskBadge = (level: ChurnRiskLevel, score: number) => {
    switch (level) {
      case 'CRITICO':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-400" />
            Crítico ({score}/100)
          </span>
        );
      case 'ALTO':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-400" />
            Alto Risco ({score}/100)
          </span>
        );
      case 'MODERADO':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Clock className="w-3.5 h-3.5 mr-1 text-blue-400" />
            Atenção ({score}/100)
          </span>
        );
      case 'SAUDAVEL':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            Saudável ({score}/100)
          </span>
        );
    }
  };

  const handleActionClick = (customerId: string, actionName: string) => {
    setActionDoneMap(prev => ({
      ...prev,
      [customerId]: `Ação registrada: ${actionName} (${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`
    }));
  };

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden space-y-4 p-4 sm:p-5">
      
      {/* Top Banner / Widget Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Detecção Preditiva de Risco de Churn (Health Score)
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Alerta Preventivo
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Algoritmo de monitoramento contínuo de pontualidade, inadimplência e sinais prévios de rescisão contratual.
            </p>
          </div>
        </div>

        {onNavigateScreen && (
          <button
            onClick={() => onNavigateScreen('CLIENTES')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center cursor-pointer"
          >
            Gerenciar Clientes & Contratos
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        )}
      </div>

      {/* 4 Cards de Resumo da Carteira */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Em Risco Crítico ou Alto */}
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-1">
          <div className="flex justify-between items-center text-xs text-rose-400 font-semibold">
            <span>Contratos Ameaçados</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300 tracking-tight">
            {summary.criticoCount + summary.altoCount} clientes
          </div>
          <div className="text-[11px] text-rose-400 flex justify-between items-center pt-0.5">
            <span>MRR sob risco:</span>
            <strong className="text-rose-200">{formatBRL(summary.totalAtRiskMonthlyFee)}/mês</strong>
          </div>
        </div>

        {/* Card 2: Health Score Médio */}
        <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] space-y-1">
          <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] font-semibold">
            <span>Health Score da Base</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
            {summary.averageHealthScore}/100
          </div>
          <div className="text-[11px] text-[var(--text-muted)] flex justify-between items-center pt-0.5">
            <span>Avaliação geral:</span>
            <span className={`font-bold ${
              summary.averageHealthScore >= 75 ? 'text-emerald-400' : summary.averageHealthScore >= 55 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {summary.averageHealthScore >= 75 ? 'Saudável' : summary.averageHealthScore >= 55 ? 'Atenção Necessária' : 'Risco Alto'}
            </span>
          </div>
        </div>

        {/* Card 3: Clientes Saudáveis */}
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-1">
          <div className="flex justify-between items-center text-xs text-emerald-400 font-semibold">
            <span>Base Saudável & Adimplente</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300 tracking-tight">
            {summary.saudavelCount} clientes
          </div>
          <div className="text-[11px] text-emerald-400 flex justify-between items-center pt-0.5">
            <span>Proporção ativa:</span>
            <strong className="text-emerald-200">
              {summary.totalActiveCustomers > 0 ? Math.round((summary.saudavelCount / summary.totalActiveCustomers) * 100) : 100}% da base
            </strong>
          </div>
        </div>

        {/* Card 4: Clientes em Alerta Moderado */}
        <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-1">
          <div className="flex justify-between items-center text-xs text-blue-400 font-semibold">
            <span>Em Observação Preventiva</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-300 tracking-tight">
            {summary.moderadoCount} clientes
          </div>
          <div className="text-[11px] text-blue-400 flex justify-between items-center pt-0.5">
            <span>Total ativo monitorado:</span>
            <strong className="text-blue-200">{summary.totalActiveCustomers} contratos</strong>
          </div>
        </div>

      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {(['TODOS', 'CRITICO', 'ALTO', 'MODERADO', 'SAUDAVEL'] as const).map(lvl => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedRiskFilter(lvl)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer border ${
                selectedRiskFilter === lvl
                  ? 'bg-amber-400 text-slate-950 font-bold border-amber-400 shadow-2xs'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {lvl === 'TODOS' ? `Todos (${summary.totalActiveCustomers})` :
               lvl === 'CRITICO' ? `Crítico (${summary.criticoCount})` :
               lvl === 'ALTO' ? `Alto Risco (${summary.altoCount})` :
               lvl === 'MODERADO' ? `Atenção (${summary.moderadoCount})` :
               `Saudável (${summary.saudavelCount})`}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px] sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente ou motivo..."
            className="w-full pl-8 pr-3 py-1 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-amber-400"
          />
        </div>
      </div>

      {/* Lista / Tabela de Clientes em Risco */}
      <div className="space-y-3">
        {filteredAssessments.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-secondary)] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
            Nenhum cliente encontrado para os filtros selecionados.
          </div>
        ) : (
          filteredAssessments.map(item => {
            const hasAction = actionDoneMap[item.customerId];
            const isCriticalOrHigh = item.riskLevel === 'CRITICO' || item.riskLevel === 'ALTO';

            return (
              <div 
                key={item.customerId}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  item.riskLevel === 'CRITICO' 
                    ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60' 
                    : item.riskLevel === 'ALTO'
                    ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-amber-500/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">{item.customerName}</h4>
                      {getRiskBadge(item.riskLevel, item.healthScore)}
                      {item.contractNumber && (
                        <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--surface-card)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                          Contrato: {item.contractNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] flex items-center space-x-3 flex-wrap">
                      <span>Honorário: <strong className="text-amber-400">{formatBRL(item.monthlyFee)}/mês</strong></span>
                      <span>•</span>
                      <span>Tempo ativo: <strong className="text-[var(--text-primary)]">{item.monthsActive} meses</strong></span>
                      {item.overdueTitlesCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-rose-400 font-bold">
                            {item.overdueTitlesCount} título(s) vencido(s) ({formatBRL(item.overdueAmount)})
                          </span>
                          {item.maxDaysOverdue > 0 && (
                            <span className="text-rose-300">({item.maxDaysOverdue} dias de atraso)</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleActionClick(item.customerId, 'Contato de Cobrança / Alinhamento')}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all flex items-center cursor-pointer shadow-2xs active:scale-95"
                    >
                      <PhoneCall className="w-3.5 h-3.5 mr-1.5" />
                      Ação Preventiva
                    </button>
                    {onNavigateScreen && (
                      <button
                        type="button"
                        onClick={() => onNavigateScreen('CONTAS_RECEBER')}
                        className="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--surface-card)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center cursor-pointer"
                        title="Abrir Contas a Receber para ver títulos"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Títulos
                      </button>
                    )}
                  </div>
                </div>

                {/* Diagnóstico de Fatores de Risco */}
                <div className="p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs space-y-1.5">
                  <div className="font-semibold text-[var(--text-secondary)] flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Fatores de Risco Identificados:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[var(--text-muted)]">
                    {item.riskFactors.map((factor, idx) => (
                      <li key={idx} className="leading-relaxed">
                        <span className="text-[var(--text-primary)]">{factor}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-start space-x-1.5 text-[11px]">
                    <strong className="text-amber-400 shrink-0">Recomendação Estratégica:</strong>
                    <span className="text-[var(--text-secondary)] font-medium">{item.recommendedAction}</span>
                  </div>
                </div>

                {hasAction && (
                  <div className="text-[11px] font-semibold text-emerald-400 flex items-center bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    {hasAction}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
