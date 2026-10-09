import { useState, useEffect, useCallback } from 'react';
import { GlobalPeriodFilter } from '../types';
import { storage } from '../services/storageService';

export type ModulePeriodType = 'PAYABLES' | 'RECEIVABLES' | 'DASHBOARD' | 'GLOBAL';

const MONTH_NAMES = [
  'Todos os Meses',
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function useModulePeriod(moduleType: ModulePeriodType = 'GLOBAL') {
  const getFilterFromStorage = useCallback((): GlobalPeriodFilter => {
    switch (moduleType) {
      case 'PAYABLES':
        return storage.getPayablesPeriodFilter();
      case 'RECEIVABLES':
        return storage.getReceivablesPeriodFilter();
      case 'DASHBOARD':
        return storage.getDashboardPeriodFilter();
      case 'GLOBAL':
      default:
        return storage.getGlobalPeriodFilter();
    }
  }, [moduleType]);

  const saveFilterToStorage = useCallback((filter: GlobalPeriodFilter) => {
    switch (moduleType) {
      case 'PAYABLES':
        storage.savePayablesPeriodFilter(filter);
        break;
      case 'RECEIVABLES':
        storage.saveReceivablesPeriodFilter(filter);
        break;
      case 'DASHBOARD':
        storage.saveDashboardPeriodFilter(filter);
        break;
      case 'GLOBAL':
      default:
        storage.saveGlobalPeriodFilter(filter);
        break;
    }
  }, [moduleType]);

  const [period, setPeriod] = useState<GlobalPeriodFilter>(getFilterFromStorage);

  useEffect(() => {
    setPeriod(getFilterFromStorage());
    const unsub = storage.subscribe(() => {
      setPeriod(getFilterFromStorage());
    });
    return unsub;
  }, [getFilterFromStorage]);

  const updatePeriod = (newPeriod: GlobalPeriodFilter) => {
    saveFilterToStorage(newPeriod);
  };

  const toggleActive = (forceActive?: boolean) => {
    const current = getFilterFromStorage();
    const nextActive = forceActive !== undefined ? forceActive : !current.active;
    saveFilterToStorage({
      ...current,
      active: nextActive
    });
  };

  const setMonthAndYear = (month: number, year: number, activate = true) => {
    saveFilterToStorage({
      month,
      year,
      active: activate
    });
  };

  const goToPreviousMonth = () => {
    const current = getFilterFromStorage();
    let nextMonth = current.month === 0 ? 12 : current.month - 1;
    let nextYear = current.year;

    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }

    saveFilterToStorage({
      year: nextYear,
      month: nextMonth,
      active: true
    });
  };

  const goToNextMonth = () => {
    const current = getFilterFromStorage();
    let nextMonth = current.month === 0 ? 1 : current.month + 1;
    let nextYear = current.year;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    saveFilterToStorage({
      year: nextYear,
      month: nextMonth,
      active: true
    });
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    saveFilterToStorage({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      active: true
    });
  };

  const showAllPeriods = () => {
    const current = getFilterFromStorage();
    saveFilterToStorage({
      ...current,
      active: false
    });
  };

  const monthName = MONTH_NAMES[period.month] || 'Mês Inválido';

  const formattedLabel = !period.active
    ? 'Todos os Vencimentos (Sem Filtro)'
    : period.month === 0
    ? `Ano Completo de ${period.year}`
    : `${MONTH_NAMES[period.month]} de ${period.year}`;

  return {
    period,
    updatePeriod,
    toggleActive,
    setMonthAndYear,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    showAllPeriods,
    monthName,
    formattedLabel
  };
}
