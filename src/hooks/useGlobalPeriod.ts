import { useState, useEffect } from 'react';
import { GlobalPeriodFilter } from '../types';
import { storage } from '../services/storageService';

export function useGlobalPeriod() {
  const [period, setPeriod] = useState<GlobalPeriodFilter>(() => storage.getGlobalPeriodFilter());

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setPeriod(storage.getGlobalPeriodFilter());
    });
    return unsub;
  }, []);

  const updatePeriod = (newPeriod: GlobalPeriodFilter) => {
    storage.saveGlobalPeriodFilter(newPeriod);
  };

  const toggleActive = (forceActive?: boolean) => {
    const current = storage.getGlobalPeriodFilter();
    const nextActive = forceActive !== undefined ? forceActive : !current.active;
    storage.saveGlobalPeriodFilter({
      ...current,
      active: nextActive
    });
  };

  const setMonthAndYear = (month: number, year: number, activate = true) => {
    storage.saveGlobalPeriodFilter({
      month,
      year,
      active: activate
    });
  };

  return { period, updatePeriod, toggleActive, setMonthAndYear };
}
