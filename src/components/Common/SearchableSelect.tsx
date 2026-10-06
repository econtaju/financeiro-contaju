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
          className="sr-only"
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
        className={`w-full text-left rounded-lg border px-3 py-2 text-xs flex items-center justify-between transition-colors select-none ${
          disabled
            ? 'bg-[var(--surface-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)] cursor-not-allowed opacity-60'
            : isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-[var(--surface-elevated)] text-[var(--text-primary)] cursor-pointer'
            : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:border-[var(--border-highlight)] cursor-pointer'
        }`}
      >
        <div className="flex-1 truncate pr-2">
          {selectedOption ? (
            <div className="flex items-center space-x-2 truncate">
              <span className="font-medium text-[var(--text-primary)] truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-[11px] text-[var(--text-muted)] truncate">({selectedOption.sublabel})</span>
              )}
              {selectedOption.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-mono">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[var(--text-muted)]">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0 text-[var(--text-muted)]">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:text-[var(--text-primary)] rounded cursor-pointer"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 text-amber-500 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Search bar inside dropdown */}
          <div className="p-2 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto divide-y divide-[var(--border-subtle)] p-1 text-xs">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const prevOpt = idx > 0 ? filteredOptions[idx - 1] : null;
                const showGroupHeader = opt.group && (!prevOpt || prevOpt.group !== opt.group);

                return (
                  <React.Fragment key={opt.value}>
                    {showGroupHeader && (
                      <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-amber-500 uppercase bg-amber-500/10 border-y border-[var(--border-subtle)] mt-1 first:mt-0 select-none">
                        {opt.group}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full text-left px-2.5 py-2 rounded flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-amber-500/15 font-semibold text-amber-400 border border-amber-500/30' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
                      }`}
                    >
                      <div className="flex-1 truncate pr-2">
                        <div className="truncate font-medium">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-[var(--text-muted)] truncate">{opt.sublabel}</div>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {opt.badge && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                    </button>
                  </React.Fragment>
                );
              })
            ) : (
              <div className="px-3 py-3 text-center text-[var(--text-muted)] text-xs">
                Nenhum resultado encontrado para &quot;{searchQuery}&quot;
              </div>
            )}

            {/* Quick create option if not found or partial */}
            {allowQuickCreate && searchQuery.trim() && !exactMatchExists && (
              <div className="p-1 border-t border-[var(--border-subtle)] bg-amber-500/5">
                <button
                  type="button"
                  onClick={handleQuickCreateClick}
                  className="w-full text-left px-2.5 py-2 rounded text-xs font-semibold text-amber-400 hover:bg-amber-500/15 flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
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
