import { useState, useEffect } from 'react';
import { DashboardConfig } from '../types';
import { storage } from '../services/storageService';

export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(() => storage.getDashboardConfig());

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setConfig(storage.getDashboardConfig());
    });
    return unsub;
  }, []);

  const updateConfig = (newConfig: DashboardConfig) => {
    storage.saveDashboardConfig(newConfig);
  };

  const toggleKpi = (kpiId: string) => {
    const current = storage.getDashboardConfig();
    const exists = current.visibleKpis.includes(kpiId);
    const updated = exists 
      ? current.visibleKpis.filter(id => id !== kpiId)
      : [...current.visibleKpis, kpiId];
    storage.saveDashboardConfig({ ...current, visibleKpis: updated });
  };

  const toggleWidget = (widgetId: string) => {
    const current = storage.getDashboardConfig();
    const exists = current.visibleWidgets.includes(widgetId);
    const updated = exists 
      ? current.visibleWidgets.filter(id => id !== widgetId)
      : [...current.visibleWidgets, widgetId];
    storage.saveDashboardConfig({ ...current, visibleWidgets: updated });
  };

  const resetToDefault = () => {
    storage.saveDashboardConfig({
      visibleKpis: [
        'faturamento_bruto',
        'resultado_liquido',
        'mrr',
        'clientes_ativos',
        'crescimento_clientes',
        'inadimplencia',
        'saldo_disponivel',
        'entradas_caixa',
        'saidas_caixa',
        'contas_receber_aberto',
        'contas_pagar_aberto'
      ],
      visibleWidgets: [
        'widget_faturamento_resumo',
        'widget_saldos_consolidados',
        'widget_resumo_clientes',
        'widget_gap_caixa',
        'widget_proximos_receber',
        'widget_proximos_pagar'
      ]
    });
  };

  return { config, updateConfig, toggleKpi, toggleWidget, resetToDefault };
}
