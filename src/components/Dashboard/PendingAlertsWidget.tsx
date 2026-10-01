import React from 'react';
import { 
  BellRing, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { FinancialTitle } from '../../types';
import { formatBRL, formatDateBR } from '../../services/financialEngine';
import { NavigationScreen } from '../Sidebar';

interface PendingAlertsWidgetProps {
  titles: FinancialTitle[];
  onNavigate: (screen: NavigationScreen) => void;
}

export const PendingAlertsWidget: React.FC<PendingAlertsWidgetProps> = ({
  titles,
  onNavigate
}) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);
  const in3DaysStr = in3Days.toISOString().split('T')[0];

  // Filtra títulos ativos com saldo pendente vencendo entre hoje e D+3
  const activePendingTitles = titles.filter(t => 
    t.documentState === 'CONFIRMADO' &&
    t.balancePrincipal > 0 &&
    t.dueDate >= todayStr &&
    t.dueDate <= in3DaysStr
  );

  const pendingReceivables = activePendingTitles.filter(t => t.type === 'RECEBER');
  const pendingPayables = activePendingTitles.filter(t => t.type === 'PAGAR');

  const totalReceivableAmount = pendingReceivables.reduce((sum, t) => sum + t.balancePrincipal, 0);
  const totalPayableAmount = pendingPayables.reduce((sum, t) => sum + t.balancePrincipal, 0);
  const netProjected = totalReceivableAmount - totalPayableAmount;

  const totalAlertsCount = activePendingTitles.length;

  // Títulos ordenados por vencimento iminente
  const sortedUpcoming = [...activePendingTitles].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const getDueBadge = (dueDate: string) => {
    if (dueDate === todayStr) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 animate-pulse">
          Vence Hoje
        </span>
      );
    }
    
    // Calcula diferença em dias
    const dueTime = new Date(`${dueDate}T00:00:00`).getTime();
    const todayTime = new Date(`${todayStr}T00:00:00`).getTime();
    const diffDays = Math.ceil((dueTime - todayTime) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
          Vence Amanhã
        </span>
      );
    }

    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        Em {diffDays} dias
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-[#131720] rounded-2xl border border-slate-200 dark:border-[#273040] shadow-2xs overflow-hidden p-5 space-y-4">
      
      {/* Header do Widget */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 dark:border-[#273040] gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Avisos Pendentes (Próximos 3 Dias)
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                totalAlertsCount > 0 
                  ? 'bg-amber-500 text-slate-950 shadow-xs' 
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
              }`}>
                {totalAlertsCount > 0 ? `${totalAlertsCount} pendências` : 'Em dia'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Contas a pagar e receber com vencimento de {formatDateBR(todayStr)} até {formatDateBR(in3DaysStr)}.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('CONTAS_PAGAR')}
            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Contas a Pagar
            <ExternalLink className="w-3 h-3 ml-1" />
          </button>
          <button
            onClick={() => onNavigate('CONTAS_RECEBER')}
            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Contas a Receber
            <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        </div>
      </div>

      {/* Grid de 3 Cards Resumo (Receber, Pagar e Saldo Projetado Imediato) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* A Receber em 3 dias */}
        <div 
          onClick={() => onNavigate('CONTAS_RECEBER')}
          className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/25 cursor-pointer hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 transition-all space-y-1 shadow-2xs"
        >
          <div className="flex justify-between items-center text-xs text-emerald-900 dark:text-emerald-300">
            <span className="font-bold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              A Receber (≤ 3 dias)
            </span>
            <span className="font-mono text-[11px] font-bold bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-200 px-1.5 py-0.5 rounded">
              {pendingReceivables.length}
            </span>
          </div>
          <div className="text-xl font-extrabold text-emerald-950 dark:text-emerald-300 font-mono tracking-tight">
            {formatBRL(totalReceivableAmount)}
          </div>
          <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-400/80">
            Previsão de entrada de caixa
          </div>
        </div>

        {/* A Pagar em 3 dias */}
        <div 
          onClick={() => onNavigate('CONTAS_PAGAR')}
          className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/25 cursor-pointer hover:bg-rose-100/60 dark:hover:bg-rose-950/40 transition-all space-y-1 shadow-2xs"
        >
          <div className="flex justify-between items-center text-xs text-rose-900 dark:text-rose-300">
            <span className="font-bold flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
              A Pagar (≤ 3 dias)
            </span>
            <span className="font-mono text-[11px] font-bold bg-rose-200/80 dark:bg-rose-900/80 text-rose-950 dark:text-rose-200 px-1.5 py-0.5 rounded">
              {pendingPayables.length}
            </span>
          </div>
          <div className="text-xl font-extrabold text-rose-950 dark:text-rose-300 font-mono tracking-tight">
            {formatBRL(totalPayableAmount)}
          </div>
          <div className="text-[11px] font-medium text-rose-800 dark:text-rose-400/80">
            Compromissos a liquidar
          </div>
        </div>

        {/* Saldo Líquido Imediato */}
        <div className="p-3.5 rounded-xl border border-slate-300 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] space-y-1 shadow-2xs">
          <div className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-300">
            <span className="font-bold flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Saldo Líquido (3 dias)
            </span>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {netProjected >= 0 ? 'Superávit' : 'Déficit'}
            </span>
          </div>
          <div className={`text-xl font-extrabold font-mono tracking-tight ${
            netProjected >= 0 ? 'text-slate-950 dark:text-white' : 'text-rose-700 dark:text-rose-400'
          }`}>
            {formatBRL(netProjected)}
          </div>
          <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
            {netProjected >= 0 ? 'Caixa suficiente no curto prazo' : 'Atenção para cobertura de caixa'}
          </div>
        </div>

      </div>

      {/* Listagem compacta das contas mais urgentes */}
      {sortedUpcoming.length > 0 ? (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Detalhamento das Contas a Liquidar nos Próximos 3 Dias
          </div>
          <div className="divide-y divide-slate-100 dark:divide-[#273040] border border-slate-200 dark:border-[#273040] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            {sortedUpcoming.map(t => {
              const isReceber = t.type === 'RECEBER';
              return (
                <div 
                  key={t.id}
                  onClick={() => onNavigate(isReceber ? 'CONTAS_RECEBER' : 'CONTAS_PAGAR')}
                  className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#1B212D]/60 transition-colors cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isReceber ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      {isReceber ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {t.counterpartyName}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {t.description || t.titleNumber}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 ml-3">
                    <div className="text-right">
                      <div className={`font-mono font-bold ${
                        isReceber ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {formatBRL(t.balancePrincipal)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {formatDateBR(t.dueDate)}
                      </div>
                    </div>
                    <div>
                      {getDueBadge(t.dueDate)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-4 text-center bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200 dark:border-[#273040] space-y-1">
          <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500" />
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Nenhuma conta a pagar ou receber vence nos próximos 3 dias.
          </div>
          <div className="text-[11px] text-slate-500">
            Todos os compromissos imediatos estão regularizados.
          </div>
        </div>
      )}

    </div>
  );
};
