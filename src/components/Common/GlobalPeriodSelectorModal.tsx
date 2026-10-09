import React, { useState, useEffect } from 'react';
import { X, Calendar, Check, AlertCircle, Sparkles, Filter } from 'lucide-react';
import { useGlobalPeriod } from '../../hooks/useGlobalPeriod';
import { GlobalPeriodFilter } from '../../types';

interface GlobalPeriodSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  customPeriod?: GlobalPeriodFilter;
  onSaveCustomPeriod?: (period: GlobalPeriodFilter) => void;
  titleOverride?: string;
  subtitleOverride?: string;
}

const MONTHS = [
  { value: 1, label: '01 - Janeiro' },
  { value: 2, label: '02 - Fevereiro' },
  { value: 3, label: '03 - Março' },
  { value: 4, label: '04 - Abril' },
  { value: 5, label: '05 - Maio' },
  { value: 6, label: '06 - Junho' },
  { value: 7, label: '07 - Julho' },
  { value: 8, label: '08 - Agosto' },
  { value: 9, label: '09 - Setembro' },
  { value: 10, label: '10 - Outubro' },
  { value: 11, label: '11 - Novembro' },
  { value: 12, label: '12 - Dezembro' },
  { value: 0, label: 'Ano Completo (Todos os meses)' }
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

export const GlobalPeriodSelectorModal: React.FC<GlobalPeriodSelectorModalProps> = ({
  isOpen,
  onClose,
  customPeriod,
  onSaveCustomPeriod,
  titleOverride,
  subtitleOverride
}) => {
  const globalPeriodHook = useGlobalPeriod();
  const effectivePeriod = customPeriod || globalPeriodHook.period;

  const [selectedMonth, setSelectedMonth] = useState<number>(effectivePeriod.month);
  const [selectedYear, setSelectedYear] = useState<number>(effectivePeriod.year);
  const [isActive, setIsActive] = useState<boolean>(effectivePeriod.active);

  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(effectivePeriod.month);
      setSelectedYear(effectivePeriod.year);
      setIsActive(effectivePeriod.active);
    }
  }, [isOpen, effectivePeriod]);

  if (!isOpen) return null;

  const handleApply = (activeState = true) => {
    const updated: GlobalPeriodFilter = {
      active: activeState,
      year: selectedYear,
      month: selectedMonth
    };

    if (onSaveCustomPeriod) {
      onSaveCustomPeriod(updated);
    } else {
      globalPeriodHook.updatePeriod(updated);
    }
    onClose();
  };

  const handleDeactivate = () => {
    const updated: GlobalPeriodFilter = {
      ...effectivePeriod,
      active: false
    };

    if (onSaveCustomPeriod) {
      onSaveCustomPeriod(updated);
    } else {
      globalPeriodHook.updatePeriod(updated);
    }
    onClose();
  };

  const monthObj = MONTHS.find(m => m.value === selectedMonth);
  const isIsolated = Boolean(onSaveCustomPeriod);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#131720] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#273040] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 text-white flex justify-between items-start border-b border-amber-500/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                {titleOverride || 'Filtro por Período'}
              </h2>
              <p className="text-xs text-slate-300">
                {subtitleOverride || (isIsolated 
                  ? 'Filtro exclusivo desta aba — não altera as outras áreas do sistema'
                  : 'Sincroniza Mês e Ano para a aplicação')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Status Toggle Banner */}
          <div className={`p-4 rounded-xl border transition-all ${
            isActive 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200' 
              : 'bg-slate-50 dark:bg-[#1B212D] border-slate-200 dark:border-[#273040] text-slate-800 dark:text-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                  {isIsolated ? 'Status do Filtro da Aba' : 'Status do Filtro'}
                </span>
                <span className="text-sm font-bold mt-0.5 block">
                  {isActive ? 'Ativo (Filtrando por Data)' : 'Desativado (Modo Livre - Ver Todos)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs mt-2 text-slate-600 dark:text-slate-400">
              {isActive 
                ? (isIsolated 
                  ? `Os dados desta aba serão restritos a ${monthObj?.label || 'mês selecionado'} de ${selectedYear}.`
                  : `Ao confirmar, os módulos focarão em ${monthObj?.label} / ${selectedYear}.`)
                : 'Quando desativado, você visualiza todos os registros cadastrados.'}
            </p>
          </div>

          {/* Period Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Year Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Exercício / Ano
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {YEARS.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setSelectedYear(y)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      selectedYear === y
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs'
                        : 'bg-white dark:bg-[#1B212D] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#273040] hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Atalhos Rápidos
              </label>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setSelectedMonth(now.getMonth() + 1);
                    setSelectedYear(now.getFullYear());
                    setIsActive(true);
                  }}
                  className="w-full py-1.5 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#273040] hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-700 dark:text-slate-300 transition-colors text-left flex items-center justify-between cursor-pointer"
                >
                  <span>Mês Vigente (Atual)</span>
                  <span className="text-[10px] font-mono text-slate-500">Hoje</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
                    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                    setSelectedMonth(lastMonth);
                    setSelectedYear(year);
                    setIsActive(true);
                  }}
                  className="w-full py-1.5 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#273040] hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-700 dark:text-slate-300 transition-colors text-left flex items-center justify-between cursor-pointer"
                >
                  <span>Mês Anterior (D-30)</span>
                  <span className="text-[10px] font-mono text-slate-500">Mês -1</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
                    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
                    setSelectedMonth(nextMonth);
                    setSelectedYear(year);
                    setIsActive(true);
                  }}
                  className="w-full py-1.5 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#273040] hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-700 dark:text-slate-300 transition-colors text-left flex items-center justify-between cursor-pointer"
                >
                  <span>Próximo Mês (D+30)</span>
                  <span className="text-[10px] font-mono text-slate-500">Mês +1</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(0);
                    setIsActive(true);
                  }}
                  className="w-full py-1.5 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#273040] hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-700 dark:text-slate-300 transition-colors text-left flex items-center justify-between cursor-pointer"
                >
                  <span>Ano Completo ({selectedYear})</span>
                  <span className="text-[10px] font-mono text-slate-500">12 Meses</span>
                </button>
              </div>
            </div>

          </div>

          {/* Month Grid Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Mês de Referência
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MONTHS.filter(m => m.value > 0).map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setSelectedMonth(m.value)}
                  className={`py-2 px-2 text-center text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                    selectedMonth === m.value
                      ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs'
                      : 'bg-white dark:bg-[#1B212D] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#273040] hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {m.label.split(' - ')[1]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedMonth(0)}
                className={`col-span-3 sm:col-span-4 py-2 px-3 text-center text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                  selectedMonth === 0
                    ? 'bg-slate-950 dark:bg-white text-amber-400 dark:text-slate-950 border-slate-950 dark:border-white font-bold'
                    : 'bg-slate-100 dark:bg-[#1B212D] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#273040] hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                Todos os Meses do Ano ({selectedYear})
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-[#1B212D] border-t border-slate-200 dark:border-[#273040] p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          {effectivePeriod.active ? (
            <button
              type="button"
              onClick={handleDeactivate}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-semibold px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              {isIsolated ? 'Ver Todos (Desativar Filtro)' : 'Desativar Filtro Global'}
            </button>
          ) : (
            <span className="text-xs text-slate-500">
              Filtro atualmente inativo (Visualizando Todos)
            </span>
          )}

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-[#131720] border border-slate-300 dark:border-[#273040] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleApply(true)}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-sm transition-colors flex items-center cursor-pointer"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {isIsolated ? 'Aplicar nesta Aba' : 'Ativar para Todo o App'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
