import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  RotateCcw, 
  Layers, 
  Check, 
  SlidersHorizontal,
  Clock
} from 'lucide-react';
import { useModulePeriod, ModulePeriodType } from '../../hooks/useModulePeriod';
import { GlobalPeriodSelectorModal } from './GlobalPeriodSelectorModal';

interface ModulePeriodNavigatorProps {
  moduleType: ModulePeriodType;
  titlePrefix?: string; // ex: "Vencimentos em" ou "Período:"
  filterSubtitle?: string; // ex: "Filtro por Data de Vencimento"
  className?: string;
  matchedCount?: number;
  totalCount?: number;
}

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

export const ModulePeriodNavigator: React.FC<ModulePeriodNavigatorProps> = ({
  moduleType,
  titlePrefix = 'Vencimentos em',
  filterSubtitle = 'Filtro por Data de Vencimento',
  className = '',
  matchedCount,
  totalCount
}) => {
  const {
    period,
    updatePeriod,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    showAllPeriods,
    formattedLabel,
    monthName
  } = useModulePeriod(moduleType);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const now = new Date();
  const isCurrentMonthActive = period.active && period.year === now.getFullYear() && period.month === now.getMonth() + 1;

  return (
    <>
      <div className={`p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#131720] border border-slate-200 dark:border-[#273040] shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${className}`}>
        
        {/* Lado Esquerdo: Identificação do Filtro da Aba */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
            period.active 
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400' 
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}>
            <Calendar className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {filterSubtitle}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                period.active
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
              }`}>
                {period.active ? 'Filtro Ativo' : 'Visualizando Todos'}
              </span>
              {matchedCount !== undefined && totalCount !== undefined && (
                <span className="text-[11px] text-slate-500 font-mono">
                  ({matchedCount} de {totalCount} registros)
                </span>
              )}
            </div>

            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate flex items-center gap-1.5">
              <span>{period.active ? `${titlePrefix}:` : 'Exibição:'}</span>
              <span className="text-amber-600 dark:text-amber-400">
                {formattedLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Controles de Navegação Rápida de Período */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap self-stretch sm:self-auto justify-between sm:justify-end">
          
          {/* Navegação Anterior / Próximo */}
          <div className="flex items-center bg-slate-100 dark:bg-[#1B212D] p-1 rounded-xl border border-slate-200 dark:border-[#273040]">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#273040] rounded-lg transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 cursor-pointer"
              title="Clique para escolher qualquer mês ou ano"
            >
              <span>{period.active ? (period.month === 0 ? `Ano ${period.year}` : `${monthName.substring(0, 3)}/${period.year}`) : 'Escolher Mês'}</span>
              <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#273040] rounded-lg transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Atalho Rápido Mês Atual */}
          <button
            type="button"
            onClick={goToCurrentMonth}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
              isCurrentMonthActive
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-2xs font-bold'
                : 'bg-white dark:bg-[#1B212D] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#273040] hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Voltar para os vencimentos do mês atual"
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Mês Atual</span>
          </button>

          {/* Atalho Ver Todos */}
          <button
            type="button"
            onClick={showAllPeriods}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
              !period.active
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-2xs font-bold'
                : 'bg-white dark:bg-[#1B212D] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#273040] hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Remover filtro de data e ver todos os lançamentos"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ver Todos</span>
          </button>
        </div>

      </div>

      {/* Modal de Escolha de Período para esta Aba */}
      {isModalOpen && (
        <GlobalPeriodSelectorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          customPeriod={period}
          onSaveCustomPeriod={updatePeriod}
          titleOverride={`Filtrar ${filterSubtitle}`}
          subtitleOverride="A escolha deste período é exclusiva desta aba e não altera os filtros das outras áreas."
        />
      )}
    </>
  );
};
