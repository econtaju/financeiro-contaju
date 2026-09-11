import React, { useState } from 'react';
import { Calendar, Filter, X, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useGlobalPeriod } from '../../hooks/useGlobalPeriod';
import { GlobalPeriodSelectorModal } from './GlobalPeriodSelectorModal';

interface GlobalPeriodBannerProps {
  moduleName?: string;
  matchedCount?: number;
  totalCount?: number;
}

const MONTH_NAMES = [
  '',
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const GlobalPeriodBanner: React.FC<GlobalPeriodBannerProps> = ({
  moduleName = 'este módulo',
  matchedCount,
  totalCount
}) => {
  const { period, toggleActive } = useGlobalPeriod();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!period.active) return null;

  const monthLabel = period.month === 0 
    ? `Ano Completo de ${period.year}` 
    : `${MONTH_NAMES[period.month]} / ${period.year}`;

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-4 py-2.5 rounded-xl border border-indigo-700/60 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded-md bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center shrink-0">
            <Filter className="w-3.5 h-3.5 text-indigo-200" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white">Filtro Central Ativo:</span>
              <span className="bg-indigo-400/20 text-indigo-100 font-bold px-2 py-0.5 rounded border border-indigo-300/30">
                {monthLabel}
              </span>
            </div>
            <p className="text-[11px] text-indigo-200 mt-0.5">
              Sincronizado em todo o sistema. {matchedCount !== undefined && totalCount !== undefined ? (
                <>Mostrando <strong>{matchedCount}</strong> de {totalCount} registros em {moduleName}.</>
              ) : (
                <>Restringindo visualização a lançamentos deste período.</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 text-[11px] font-medium transition-colors flex items-center"
            title="Alterar mês ou ano global"
          >
            <SlidersHorizontal className="w-3 h-3 mr-1" />
            Alterar Período
          </button>
          <button
            onClick={() => toggleActive(false)}
            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white rounded-lg border border-rose-400/30 text-[11px] font-medium transition-colors flex items-center"
            title="Desativar filtro global"
          >
            <X className="w-3 h-3 mr-1" />
            Desativar
          </button>
        </div>
      </div>

      <GlobalPeriodSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
