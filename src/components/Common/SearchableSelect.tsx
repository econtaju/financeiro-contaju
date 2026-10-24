import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Plus, X, Layers, Tag } from 'lucide-react';
import { matchesSearch, normalizeForSearch } from '../../utils/searchUtils';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  group?: string;
}

interface SearchableSelectProps {
  id?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowQuickCreate?: boolean;
  quickCreateLabel?: (query: string) => string;
  onQuickCreate?: (query: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  dropdownClassName?: string;
  maxDropdownHeight?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção...',
  searchPlaceholder = 'Escreva para pesquisar por código ou descrição...',
  allowQuickCreate = false,
  quickCreateLabel,
  onQuickCreate,
  disabled = false,
  required = false,
  className = '',
  dropdownClassName = '',
  maxDropdownHeight = 'max-h-[380px] sm:max-h-[440px]',
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => {
    if (!searchQuery.trim()) return true;
    return matchesSearch([opt.label, opt.sublabel, opt.badge, opt.group], searchQuery);
  });

  const exactMatchExists = options.some(
    opt => normalizeForSearch(opt.label) === normalizeForSearch(searchQuery)
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleQuickCreateClick = () => {
    if (onQuickCreate && searchQuery.trim()) {
      onQuickCreate(searchQuery.trim());
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const isLarge = size === 'lg';

  return (
    <div id={id} ref={containerRef} className={`relative ${className}`}>
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={() => {}}
          required={required}
          className="absolute inset-0 opacity-0 pointer-events-none w-full h-full -z-10"
        />
      )}

      {/* Main trigger container */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full text-left rounded-xl sm:rounded-2xl border px-3.5 sm:px-4 py-2.5 sm:py-3 transition-all select-none flex items-center justify-between min-h-[42px] sm:min-h-[46px] ${
          isLarge ? 'text-sm' : 'text-xs sm:text-sm'
        } ${
          disabled
            ? 'bg-slate-100 dark:bg-[#1B212D]/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-[#273040] cursor-not-allowed opacity-60'
            : isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/30 bg-white dark:bg-[#131720] text-slate-900 dark:text-white shadow-lg cursor-pointer'
            : 'border-slate-300 dark:border-[#273040] hover:border-amber-500/60 bg-white dark:bg-[#1B212D] text-slate-900 dark:text-white hover:shadow-xs cursor-pointer'
        }`}
      >
        <div className="flex-1 min-w-0 pr-2">
          {selectedOption ? (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <span className="font-bold text-slate-900 dark:text-white truncate">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 font-mono shrink-0">
                  {selectedOption.badge}
                </span>
              )}
              {selectedOption.sublabel && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden md:inline">
                  • {selectedOption.sublabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-medium">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0 text-slate-400">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="p-0.5 rounded text-amber-500">
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* Dropdown menu expansivo com alta legibilidade e proporção generosa */}
      {isOpen && (
        <div 
          className={`absolute z-50 mt-1.5 left-0 w-full min-w-full sm:min-w-[460px] max-w-[95vw] bg-white dark:bg-[#131720] rounded-2xl sm:rounded-3xl border border-amber-500/40 shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 ${dropdownClassName}`}
        >
          {/* Barra de Pesquisa Superior Ampla */}
          <div className="p-3 border-b border-slate-200 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D]/90 flex items-center gap-2.5">
            <Search className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 shrink-0 hidden xs:inline">
              {filteredOptions.length} {filteredOptions.length === 1 ? 'opção' : 'opções'}
            </span>
          </div>

          {/* Lista de Opções com Altura e Espaçamento Confortáveis */}
          <div className={`${maxDropdownHeight} overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1.5 space-y-0.5`}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const prevOpt = idx > 0 ? filteredOptions[idx - 1] : null;
                const showGroupHeader = opt.group && (!prevOpt || prevOpt.group !== opt.group);

                return (
                  <React.Fragment key={opt.value}>
                    {showGroupHeader && (
                      <div className="sticky top-0 z-10 px-3.5 py-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider text-amber-700 dark:text-amber-400 uppercase bg-slate-100/95 dark:bg-[#19202D]/95 backdrop-blur-sm border-y border-slate-200 dark:border-[#273040] mt-1.5 first:mt-0 rounded-lg select-none shadow-2xs flex items-center justify-between">
                        <span className="truncate">{opt.group}</span>
                        <Layers className="w-3 h-3 text-amber-500 shrink-0" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full text-left px-3.5 py-2.5 sm:py-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected 
                          ? 'bg-amber-500/15 font-bold text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs ring-1 ring-amber-500/30' 
                          : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                          {opt.label}
                        </div>
                        {opt.sublabel && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {opt.badge && (
                          <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  </React.Fragment>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-slate-500 text-xs sm:text-sm">
                Nenhum resultado encontrado para &quot;{searchQuery}&quot;
              </div>
            )}

            {/* Quick create option if not found or partial */}
            {allowQuickCreate && searchQuery.trim() && !exactMatchExists && (
              <div className="p-2 border-t border-slate-200 dark:border-[#273040] bg-amber-500/5 mt-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={handleQuickCreateClick}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 border border-dashed border-amber-500/40 flex items-center space-x-2 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    {quickCreateLabel
                      ? quickCreateLabel(searchQuery.trim())
                      : `+ Cadastrar rápido "${searchQuery.trim()}"`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
