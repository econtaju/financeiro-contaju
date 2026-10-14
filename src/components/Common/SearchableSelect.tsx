import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Plus, X } from 'lucide-react';
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
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção...',
  searchPlaceholder = 'Escreva para pesquisar...',
  allowQuickCreate = false,
  quickCreateLabel,
  onQuickCreate,
  disabled = false,
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => {
    if (!searchQuery.trim()) return true;
    return matchesSearch([opt.label, opt.sublabel, opt.badge], searchQuery);
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
        className={`w-full text-left rounded-xl border px-3.5 py-2.5 text-xs flex items-center justify-between transition-all select-none min-h-[38px] ${
          disabled
            ? 'bg-[var(--surface-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)] cursor-not-allowed opacity-55'
            : isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/25 bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-md cursor-pointer'
            : 'border-[var(--border-subtle)] hover:border-amber-500/50 bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:shadow-xs cursor-pointer'
        }`}
      >
        <div className="flex-1 truncate pr-2">
          {selectedOption ? (
            <div className="flex items-center space-x-2 truncate">
              <span className="font-semibold text-[var(--text-primary)] truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-[11px] text-[var(--text-muted)] truncate">({selectedOption.sublabel})</span>
              )}
              {selectedOption.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-card)] text-amber-500 font-bold border border-amber-500/30 font-mono">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[var(--text-muted)] font-medium">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0 text-[var(--text-muted)]">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
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

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-[var(--surface-card)] rounded-2xl border border-amber-500/35 shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Search bar inside dropdown */}
          <div className="p-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex items-center space-x-2">
            <Search className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border-subtle)] p-1.5 text-xs space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const prevOpt = idx > 0 ? filteredOptions[idx - 1] : null;
                const showGroupHeader = opt.group && (!prevOpt || prevOpt.group !== opt.group);

                return (
                  <React.Fragment key={opt.value}>
                    {showGroupHeader && (
                      <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-amber-500 uppercase bg-amber-500/10 border-y border-[var(--border-subtle)] mt-1.5 first:mt-0 rounded-md select-none">
                        {opt.group}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-amber-500/15 font-bold text-amber-400 border border-amber-500/40 shadow-2xs' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-amber-500/10'
                      }`}
                    >
                      <div className="flex-1 truncate pr-2">
                        <div className="truncate font-semibold">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-[11px] text-[var(--text-muted)] truncate font-normal mt-0.5">{opt.sublabel}</div>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {opt.badge && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                    </button>
                  </React.Fragment>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-[var(--text-muted)] text-xs">
                Nenhum resultado encontrado para &quot;{searchQuery}&quot;
              </div>
            )}

            {/* Quick create option if not found or partial */}
            {allowQuickCreate && searchQuery.trim() && !exactMatchExists && (
              <div className="p-1.5 border-t border-[var(--border-subtle)] bg-amber-500/5 mt-1">
                <button
                  type="button"
                  onClick={handleQuickCreateClick}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-500/20 border border-dashed border-amber-500/40 flex items-center space-x-2 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 text-amber-400 shrink-0" />
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
