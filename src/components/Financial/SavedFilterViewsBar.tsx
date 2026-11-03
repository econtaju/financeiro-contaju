import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, 
  Bookmark, 
  Plus, 
  X, 
  Trash2, 
  Check, 
  SlidersHorizontal, 
  RotateCcw, 
  Tag, 
  DollarSign, 
  Filter,
  Sparkles
} from 'lucide-react';
import { ChartAccount, Counterparty, BankAccount } from '../../types';
import { formatBRL } from '../../services/financialEngine';

export interface SavedFilterView {
  id: string;
  name: string;
  icon?: string;
  color: 'rose' | 'emerald' | 'amber' | 'blue' | 'indigo' | 'purple' | 'slate';
  isSystem?: boolean;
  filters: {
    statusFilter?: 'TODOS' | 'ABERTO' | 'VENCIDO' | 'LIQUIDADO' | 'CANCELADO' | 'CONCILIADO';
    quickDateFilter?: 'ALL' | 'HOJE' | 'ESTA_SEMANA' | 'VENCIDO' | 'LIQUIDADO' | 'ESTE_MES';
    categoryFilter?: string;
    counterpartyFilter?: string;
    bankFilter?: string;
    originFilter?: string;
    riskFilter?: 'ALL' | 'BAIXO' | 'MODERADO' | 'ALTO';
    searchTerm?: string;
    minValue?: number | null;
    maxValue?: number | null;
  };
}

export interface CurrentFilterState {
  statusFilter: 'TODOS' | 'ABERTO' | 'VENCIDO' | 'LIQUIDADO' | 'CANCELADO' | 'CONCILIADO';
  quickDateFilter: 'ALL' | 'HOJE' | 'ESTA_SEMANA' | 'VENCIDO' | 'LIQUIDADO' | 'ESTE_MES';
  categoryFilter: string;
  counterpartyFilter: string;
  bankFilter: string;
  originFilter: string;
  riskFilter?: 'ALL' | 'BAIXO' | 'MODERADO' | 'ALTO';
  searchTerm: string;
  minValue?: number | null;
  maxValue?: number | null;
}

interface SavedFilterViewsBarProps {
  moduleType: 'PAYABLES' | 'RECEIVABLES';
  currentFilters: CurrentFilterState;
  onApplyFilters: (filters: Partial<SavedFilterView['filters']>) => void;
  onClearFilter: (filterKey: string) => void;
  onClearAll: () => void;
  chartAccounts: ChartAccount[];
  counterparties: Counterparty[];
  bankAccounts: BankAccount[];
  totalCount: number;
  filteredCount: number;
  onMinValueChange?: (val: number | null) => void;
  onMaxValueChange?: (val: number | null) => void;
}

const COLOR_MAP: Record<SavedFilterView['color'], { bg: string; text: string; border: string; activeRing: string }> = {
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    activeRing: 'ring-2 ring-rose-500 bg-rose-100 dark:bg-rose-900/60'
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    activeRing: 'ring-2 ring-emerald-500 bg-emerald-100 dark:bg-emerald-900/60'
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    activeRing: 'ring-2 ring-amber-500 bg-amber-100 dark:bg-amber-900/60'
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    activeRing: 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/60'
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    activeRing: 'ring-2 ring-indigo-500 bg-indigo-100 dark:bg-indigo-900/60'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    activeRing: 'ring-2 ring-purple-500 bg-purple-100 dark:bg-purple-900/60'
  },
  slate: {
    bg: 'bg-slate-100 dark:bg-slate-800/70',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    activeRing: 'ring-2 ring-slate-500 bg-slate-200 dark:bg-slate-700'
  }
};

export const SavedFilterViewsBar: React.FC<SavedFilterViewsBarProps> = ({
  moduleType,
  currentFilters,
  onApplyFilters,
  onClearFilter,
  onClearAll,
  chartAccounts,
  counterparties,
  bankAccounts,
  totalCount,
  filteredCount,
  onMinValueChange,
  onMaxValueChange
}) => {
  const storageKey = moduleType === 'PAYABLES' ? 'contaju_payables_saved_views' : 'contaju_receivables_saved_views';

  // Presets nativos do sistema
  const systemPresets = useMemo<SavedFilterView[]>(() => {
    if (moduleType === 'PAYABLES') {
      return [
        {
          id: 'sys-pay-week',
          name: 'Esta Semana',
          icon: '⚡',
          color: 'rose',
          isSystem: true,
          filters: {
            statusFilter: 'ABERTO',
            quickDateFilter: 'ESTA_SEMANA',
            categoryFilter: 'ALL',
            counterpartyFilter: 'ALL',
            bankFilter: 'ALL',
            originFilter: 'ALL',
            searchTerm: ''
          }
        },
        {
          id: 'sys-pay-vencidos',
          name: 'Vencidos',
          icon: '🚨',
          color: 'amber',
          isSystem: true,
          filters: {
            statusFilter: 'VENCIDO',
            quickDateFilter: 'VENCIDO',
            categoryFilter: 'ALL',
            counterpartyFilter: 'ALL',
            bankFilter: 'ALL',
            originFilter: 'ALL',
            searchTerm: ''
          }
        },
        {
          id: 'sys-pay-cards',
          name: 'Cartão Crédito',
          icon: '💳',
          color: 'purple',
          isSystem: true,
          filters: {
            statusFilter: 'ABERTO',
            quickDateFilter: 'ALL',
            categoryFilter: 'ALL',
            counterpartyFilter: 'ALL',
            bankFilter: 'ALL',
            originFilter: 'CARTAO_CREDITO',
            searchTerm: ''
          }
        },
        {
          id: 'sys-pay-contracts',
          name: 'Recorrências',
          icon: '🏷️',
          color: 'blue',
          isSystem: true,
          filters: {
            statusFilter: 'ABERTO',
            quickDateFilter: 'ALL',
            categoryFilter: 'ALL',
            counterpartyFilter: 'ALL',
            bankFilter: 'ALL',
            originFilter: 'CONTRATO',
            searchTerm: ''
          }
        },
        {
          id: 'sys-pay-unclassified',
          name: 'Sem Categoria',
          icon: '⚠️',
          color: 'slate',
          isSystem: true,
          filters: {
            statusFilter: 'TODOS',
            quickDateFilter: 'ALL',
            categoryFilter: 'SEM_CATEGORIA',
            counterpartyFilter: 'ALL',
            bankFilter: 'ALL',
            originFilter: 'ALL',
            searchTerm: ''
          }
        }
      ];
    } else {
      return [
        {
          id: 'sys-rec-week',
          name: 'Esta Semana',
          icon: '⚡',
          color: 'emerald',
          isSystem: true,
          filters: {
            statusFilter: 'ABERTO',
            quickDateFilter: 'ESTA_SEMANA',
            categoryFilter: 'ALL',
            counterpartyFilter: 'ALL',
            bankFilter: 'ALL',
            originFilter: 'ALL',
            riskFilter: 'ALL',
            searchTerm: ''
          }
        },
        {
          id: 'sys-rec-vencidos',
          name: 'Inadimplentes',
          icon: '🚨',
          color: 'rose',
          isSystem: true,
          filters: {
            statusFilter: 'VENCIDO',
            quickDateFilter: 'VENCIDO',
            categoryFilter: 'ALL',
            counterpartyFilter: 'ALL',
            bankFilter: 'ALL',
            originFilter: 'ALL',
            riskFilter: 'ALL',
            searchTerm: ''
          }
        },
        {
          id: 'sys-rec-contracts',
          name: 'Contratos / Mensalidades',
          icon: '🏷️',
          color: 'indigo',
          isSystem: true,
          filters: {
            statusFilter: 'ABERTO',
            quickDateFilter: 'ALL',
            categoryFilter: 'ALL',
            counterpartyFilter: 'ALL',
            bankFilter: 'ALL',
            originFilter: 'CONTRATO',
            riskFilter: 'ALL',
            searchTerm: ''
          }
        },
        {
          id: 'sys-rec-high-risk',
          name: 'Alto Risco',
          icon: '🛡️',
          color: 'amber',
          isSystem: true,
          filters: {
            statusFilter: 'ABERTO',
            quickDateFilter: 'ALL',
            categoryFilter: 'ALL',
            counterpartyFilter: 'ALL',
            bankFilter: 'ALL',
            originFilter: 'ALL',
            riskFilter: 'ALTO',
            searchTerm: ''
          }
        },
        {
          id: 'sys-rec-unclassified',
          name: 'Sem Categoria',
          icon: '⚠️',
          color: 'slate',
          isSystem: true,
          filters: {
            statusFilter: 'TODOS',
            quickDateFilter: 'ALL',
            categoryFilter: 'SEM_CATEGORIA',
            counterpartyFilter: 'ALL',
            bankFilter: 'ALL',
            originFilter: 'ALL',
            riskFilter: 'ALL',
            searchTerm: ''
          }
        }
      ];
    }
  }, [moduleType]);

  // Visões customizadas salvas pelo usuário
  const [customViews, setCustomViews] = useState<SavedFilterView[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal para salvar nova visão
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewColor, setNewViewColor] = useState<SavedFilterView['color']>(moduleType === 'PAYABLES' ? 'rose' : 'emerald');

  // Drawer / painel de faixa de valor
  const [showValueRange, setShowValueRange] = useState(false);
  const [minValInput, setMinValInput] = useState<string>(currentFilters.minValue ? String(currentFilters.minValue) : '');
  const [maxValInput, setMaxValInput] = useState<string>(currentFilters.maxValue ? String(currentFilters.maxValue) : '');

  // Sincronizar inputs de valor se prop mudar externamente
  useEffect(() => {
    setMinValInput(currentFilters.minValue ? String(currentFilters.minValue) : '');
    setMaxValInput(currentFilters.maxValue ? String(currentFilters.maxValue) : '');
  }, [currentFilters.minValue, currentFilters.maxValue]);

  const handleApplyValueRange = () => {
    const min = minValInput.trim() !== '' ? parseFloat(minValInput.replace(',', '.')) : null;
    const max = maxValInput.trim() !== '' ? parseFloat(maxValInput.replace(',', '.')) : null;
    if (onMinValueChange) onMinValueChange(isNaN(min as number) ? null : min);
    if (onMaxValueChange) onMaxValueChange(isNaN(max as number) ? null : max);
  };

  const handleClearValueRange = () => {
    setMinValInput('');
    setMaxValInput('');
    if (onMinValueChange) onMinValueChange(null);
    if (onMaxValueChange) onMaxValueChange(null);
  };

  // Salvar no localStorage sempre que customViews mudar
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(customViews));
    } catch (err) {
      console.error('Erro ao salvar visões de filtro:', err);
    }
  }, [customViews, storageKey]);

  // Verificar se uma visão corresponde exatamente aos filtros atuais
  const isViewActive = (view: SavedFilterView): boolean => {
    const f = view.filters;
    if (f.statusFilter && f.statusFilter !== currentFilters.statusFilter) return false;
    if (f.quickDateFilter && f.quickDateFilter !== currentFilters.quickDateFilter) return false;
    if (f.categoryFilter && f.categoryFilter !== currentFilters.categoryFilter) return false;
    if (f.counterpartyFilter && f.counterpartyFilter !== currentFilters.counterpartyFilter) return false;
    if (f.bankFilter && f.bankFilter !== currentFilters.bankFilter) return false;
    if (f.originFilter && f.originFilter !== currentFilters.originFilter) return false;
    if (f.riskFilter && f.riskFilter !== currentFilters.riskFilter) return false;
    if (f.searchTerm !== undefined && f.searchTerm !== currentFilters.searchTerm) return false;
    if (f.minValue !== undefined && f.minValue !== currentFilters.minValue) return false;
    if (f.maxValue !== undefined && f.maxValue !== currentFilters.maxValue) return false;
    return true;
  };

  // Salvar nova visão customizada
  const handleSaveCurrentView = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;

    const newView: SavedFilterView = {
      id: `custom-${Date.now()}`,
      name: newViewName.trim(),
      icon: '⭐',
      color: newViewColor,
      isSystem: false,
      filters: {
        statusFilter: currentFilters.statusFilter,
        quickDateFilter: currentFilters.quickDateFilter,
        categoryFilter: currentFilters.categoryFilter,
        counterpartyFilter: currentFilters.counterpartyFilter,
        bankFilter: currentFilters.bankFilter,
        originFilter: currentFilters.originFilter,
        riskFilter: currentFilters.riskFilter,
        searchTerm: currentFilters.searchTerm,
        minValue: currentFilters.minValue || null,
        maxValue: currentFilters.maxValue || null
      }
    };

    setCustomViews(prev => [newView, ...prev]);
    setNewViewName('');
    setIsSaveModalOpen(false);
  };

  // Excluir visão customizada
  const handleDeleteCustomView = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomViews(prev => prev.filter(v => v.id !== id));
  };

  // Identificar filtros ativos para gerar tags/chips
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; value: string }[] = [];

    if (currentFilters.statusFilter !== 'TODOS' && currentFilters.statusFilter !== 'ABERTO') {
      const statusLabels: Record<string, string> = {
        VENCIDO: 'Vencidos',
        LIQUIDADO: moduleType === 'PAYABLES' ? 'Pagos' : 'Recebidos',
        CANCELADO: 'Cancelados',
        CONCILIADO: 'Conciliados'
      };
      chips.push({
        key: 'statusFilter',
        label: 'Situação',
        value: statusLabels[currentFilters.statusFilter] || currentFilters.statusFilter
      });
    }

    if (currentFilters.quickDateFilter !== 'ALL') {
      const dateLabels: Record<string, string> = {
        HOJE: 'Hoje',
        ESTA_SEMANA: 'Esta Semana',
        ESTE_MES: 'Este Mês',
        VENCIDO: 'Vencidos',
        LIQUIDADO: moduleType === 'PAYABLES' ? 'Pagos' : 'Recebidos'
      };
      chips.push({
        key: 'quickDateFilter',
        label: 'Prazo',
        value: dateLabels[currentFilters.quickDateFilter] || currentFilters.quickDateFilter
      });
    }

    if (currentFilters.categoryFilter !== 'ALL') {
      let val = 'Não Classificado';
      if (currentFilters.categoryFilter !== 'SEM_CATEGORIA') {
        const acc = chartAccounts.find(a => a && a.id === currentFilters.categoryFilter);
        val = acc ? `${acc.code} ${acc.name}` : currentFilters.categoryFilter;
      }
      chips.push({
        key: 'categoryFilter',
        label: 'Plano de Contas',
        value: val
      });
    }

    if (currentFilters.counterpartyFilter !== 'ALL') {
      const cp = counterparties.find(c => c && c.id === currentFilters.counterpartyFilter);
      chips.push({
        key: 'counterpartyFilter',
        label: moduleType === 'PAYABLES' ? 'Fornecedor' : 'Cliente',
        value: cp ? cp.name : currentFilters.counterpartyFilter
      });
    }

    if (currentFilters.bankFilter !== 'ALL') {
      const bk = bankAccounts.find(b => b && b.id === currentFilters.bankFilter);
      chips.push({
        key: 'bankFilter',
        label: 'Conta/Caixa',
        value: bk ? bk.name : currentFilters.bankFilter
      });
    }

    if (currentFilters.originFilter !== 'ALL') {
      const originLabels: Record<string, string> = {
        CARTAO_CREDITO: '💳 Cartão de Crédito',
        CONTRATO: '🏷️ Contrato / Recorrência',
        TAXA_BALANCO: '📊 Taxa de Balanço',
        VENDA: '🛒 Vendas / PDV',
        MANUAL: '✍️ Manual',
        OUTROS: '📄 Outros'
      };
      chips.push({
        key: 'originFilter',
        label: 'Origem',
        value: originLabels[currentFilters.originFilter] || currentFilters.originFilter
      });
    }

    if (currentFilters.riskFilter && currentFilters.riskFilter !== 'ALL') {
      chips.push({
        key: 'riskFilter',
        label: 'Risco Inadimplência',
        value: currentFilters.riskFilter
      });
    }

    if (currentFilters.searchTerm.trim() !== '') {
      chips.push({
        key: 'searchTerm',
        label: 'Busca',
        value: `"${currentFilters.searchTerm.trim()}"`
      });
    }

    if (currentFilters.minValue != null || currentFilters.maxValue != null) {
      let rangeText = '';
      if (currentFilters.minValue != null && currentFilters.maxValue != null) {
        rangeText = `${formatBRL(currentFilters.minValue)} até ${formatBRL(currentFilters.maxValue)}`;
      } else if (currentFilters.minValue != null) {
        rangeText = `≥ ${formatBRL(currentFilters.minValue)}`;
      } else if (currentFilters.maxValue != null) {
        rangeText = `≤ ${formatBRL(currentFilters.maxValue)}`;
      }
      chips.push({
        key: 'valueRange',
        label: 'Valor',
        value: rangeText
      });
    }

    return chips;
  }, [currentFilters, chartAccounts, counterparties, bankAccounts, moduleType]);

  const hasAnyCustomFilter = activeChips.length > 0;

  return (
    <div className="space-y-2.5">
      {/* Linha de Visões Salvas / Favoritos */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 dark:bg-[#161C26] p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
        
        {/* Label e Carrossel Horizontal de Tags Salvas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none touch-pan-x flex-1 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider pl-1 pr-1">
            <Bookmark className="w-3.5 h-3.5 text-amber-500" />
            <span>Visões:</span>
          </div>

          {/* Presets do Sistema */}
          {systemPresets.map(preset => {
            const active = isViewActive(preset);
            const style = COLOR_MAP[preset.color] || COLOR_MAP.slate;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyFilters(preset.filters)}
                className={`min-h-[30px] px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs ${
                  active
                    ? `${style.activeRing} text-slate-900 dark:text-white font-bold border ${style.border}`
                    : `${style.bg} ${style.text} hover:opacity-90 border ${style.border}`
                }`}
                title={`Aplicar visão pré-definida: ${preset.name}`}
              >
                <span>{preset.icon}</span>
                <span>{preset.name}</span>
                {active && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}

          {/* Visões Salvas do Usuário */}
          {customViews.map(view => {
            const active = isViewActive(view);
            const style = COLOR_MAP[view.color] || COLOR_MAP.indigo;

            return (
              <div
                key={view.id}
                onClick={() => onApplyFilters(view.filters)}
                className={`min-h-[30px] pl-2.5 pr-1.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs border ${style.border} ${
                  active
                    ? `${style.activeRing} text-slate-900 dark:text-white font-bold`
                    : `${style.bg} ${style.text} hover:opacity-90`
                }`}
                title={`Aplicar sua visão salva: ${view.name}`}
              >
                <span>{view.icon || '⭐'}</span>
                <span>{view.name}</span>
                {active && <Check className="w-3 h-3" />}
                <button
                  type="button"
                  onClick={(e) => handleDeleteCustomView(view.id, e)}
                  className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer ml-1 text-slate-400 hover:text-red-500"
                  title="Remover esta visão salva"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Botões de Ação: Salvar Filtro Atual & Faixa de Valor */}
        <div className="flex items-center gap-2 shrink-0 justify-end">
          <button
            type="button"
            onClick={() => setShowValueRange(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 text-[11px] cursor-pointer shadow-2xs ${
              showValueRange || currentFilters.minValue != null || currentFilters.maxValue != null
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Filtrar por valor monetário mínimo e máximo"
          >
            <DollarSign className="w-3 h-3 text-emerald-500" />
            <span>Faixa de Valor</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            disabled={!hasAnyCustomFilter}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 text-[11px] shadow-2xs cursor-pointer ${
              hasAnyCustomFilter
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-xs'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
            }`}
            title={hasAnyCustomFilter ? "Salvar os filtros atuais como uma nova visão favorita" : "Selecione filtros para salvar uma nova visão"}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Salvar Visão</span>
          </button>
        </div>
      </div>

      {/* Faixa de Valor (Drawer Rápido) */}
      {showValueRange && (
        <div className="p-3 bg-white dark:bg-[#131720] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center gap-3 text-xs animate-fade-in shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
            Filtrar por Valor:
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">De R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={minValInput}
              onChange={(e) => setMinValInput(e.target.value)}
              className="w-24 px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Até R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="Sem limite"
              value={maxValInput}
              onChange={(e) => setMaxValInput(e.target.value)}
              className="w-24 px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyValueRange}
            className="px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            Aplicar Valor
          </button>

          {(currentFilters.minValue != null || currentFilters.maxValue != null || minValInput || maxValInput) && (
            <button
              type="button"
              onClick={handleClearValueRange}
              className="px-2 py-1 text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
            >
              Limpar Faixa
            </button>
          )}
        </div>
      )}

      {/* Tags de Filtros Ativos (Active Filter Pills) */}
      {hasAnyCustomFilter && (
        <div className="flex flex-wrap items-center gap-1.5 py-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Filtros ativos:
          </span>

          {activeChips.map(chip => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-[#1A222F] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all hover:border-slate-300"
            >
              <span className="text-slate-600 dark:text-slate-300 font-semibold">{chip.label}:</span>
              <span className="font-bold text-slate-900 dark:text-white max-w-[200px] truncate">{chip.value}</span>
              <button
                type="button"
                onClick={() => onClearFilter(chip.key)}
                className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors cursor-pointer ml-0.5"
                title={`Remover filtro de ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-semibold transition-colors cursor-pointer"
            title="Redefinir e limpar todos os filtros aplicados"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar Todos</span>
          </button>

          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium ml-auto">
            Exibindo <strong className="text-slate-900 dark:text-white font-bold">{filteredCount}</strong> de {totalCount} títulos
          </span>
        </div>
      )}

      {/* Modal para Salvar Nova Visão */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#1B212D] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <Star className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Salvar Visão Personalizada
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrentView} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Visão / Favorito:
                </label>
                <input
                  type="text"
                  required
                  placeholder={moduleType === 'PAYABLES' ? 'Ex: Fornecedores TI Vencidos' : 'Ex: Contratos Mensais em Aberto'}
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Cor da Tag:
                </label>
                <div className="flex items-center gap-2">
                  {(['rose', 'emerald', 'amber', 'blue', 'indigo', 'purple', 'slate'] as const).map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewViewColor(color)}
                      className={`w-7 h-7 rounded-full cursor-pointer transition-transform flex items-center justify-center ${
                        color === 'rose' ? 'bg-rose-500' :
                        color === 'emerald' ? 'bg-emerald-500' :
                        color === 'amber' ? 'bg-amber-500' :
                        color === 'blue' ? 'bg-blue-500' :
                        color === 'indigo' ? 'bg-indigo-500' :
                        color === 'purple' ? 'bg-purple-500' : 'bg-slate-500'
                      } ${newViewColor === color ? 'scale-125 ring-2 ring-offset-2 ring-slate-900 dark:ring-white' : 'opacity-70 hover:opacity-100'}`}
                    >
                      {newViewColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumo dos filtros que serão guardados */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Filtros que serão salvos nesta visão:
                </span>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1 max-h-36 overflow-y-auto text-[11px]">
                  {activeChips.map(c => (
                    <div key={c.key} className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span className="font-medium">{c.label}:</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Salvar Visão</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
