import React, { useState, useEffect } from 'react';
import { X, Calendar, Check, AlertCircle, Sparkles, Filter } from 'lucide-react';
import { useGlobalPeriod } from '../../hooks/useGlobalPeriod';

interface GlobalPeriodSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  onClose
}) => {
  const { period, updatePeriod } = useGlobalPeriod();
  const [selectedMonth, setSelectedMonth] = useState<number>(period.month);
  const [selectedYear, setSelectedYear] = useState<number>(period.year);
  const [isActive, setIsActive] = useState<boolean>(period.active);

  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(period.month);
      setSelectedYear(period.year);
      setIsActive(period.active);
    }
  }, [isOpen, period]);

  if (!isOpen) return null;

  const handleApply = (activeState = true) => {
    updatePeriod({
      active: activeState,
      year: selectedYear,
      month: selectedMonth
    });
    onClose();
  };

  const handleDeactivate = () => {
    updatePeriod({
      ...period,
      active: false
    });
    onClose();
  };

  const monthObj = MONTHS.find(m => m.value === selectedMonth);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-white shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Filtro Central por Período</h2>
              <p className="text-xs text-indigo-200">Sincroniza Mês e Ano para todo o restante da aplicação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Status Toggle Banner */}
          <div className={`p-4 rounded-xl border transition-all ${
            isActive 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block">
                  Status do Filtro Global
                </span>
                <span className="text-sm font-bold mt-0.5 block">
                  {isActive ? 'Ativo em Toda a Aplicação' : 'Desativado (Modo Livre)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs mt-2 text-slate-600">
              {isActive 
                ? `Ao confirmar, todos os módulos (Dashboard, Contas a Receber, Contas a Pagar, DRE e Extratos) focarão em ${monthObj?.label} / ${selectedYear}.`
                : 'Quando desativado, cada tela gerencia individualmente suas visualizações padrão.'}
            </p>
          </div>

          {/* Period Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Year Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Exercício / Ano
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {YEARS.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setSelectedYear(y)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                      selectedYear === y
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
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
                  className="w-full py-1.5 px-3 text-xs font-medium rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-900 transition-colors text-left flex items-center justify-between"
                >
                  <span>Mês Vigente (Atual)</span>
                  <span className="text-[10px] font-mono text-slate-700">Hoje</span>
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
                  className="w-full py-1.5 px-3 text-xs font-medium rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-900 transition-colors text-left flex items-center justify-between"
                >
                  <span>Mês Anterior (Fechamento)</span>
                  <span className="text-[10px] font-mono text-slate-700">D-30</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(0);
                    setIsActive(true);
                  }}
                  className="w-full py-1.5 px-3 text-xs font-medium rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-900 transition-colors text-left flex items-center justify-between"
                >
                  <span>Ano Completo ({selectedYear})</span>
                  <span className="text-[10px] font-mono text-slate-700">12 Meses</span>
                </button>
              </div>
            </div>

          </div>

          {/* Month Grid Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Mês de Referência
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MONTHS.filter(m => m.value > 0).map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setSelectedMonth(m.value)}
                  className={`py-2 px-2 text-center text-xs font-medium rounded-lg border transition-all ${
                    selectedMonth === m.value
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {m.label.split(' - ')[1]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedMonth(0)}
                className={`col-span-3 sm:col-span-4 py-2 px-3 text-center text-xs font-medium rounded-lg border transition-all ${
                  selectedMonth === 0
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                Todos os Meses do Ano ({selectedYear})
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          {period.active ? (
            <button
              type="button"
              onClick={handleDeactivate}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
            >
              Desativar Filtro Global
            </button>
          ) : (
            <span className="text-xs text-slate-700">
              Filtro atualmente inativo
            </span>
          )}

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleApply(true)}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Ativar para Todo o App
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
