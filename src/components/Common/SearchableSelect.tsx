import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Plus, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
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
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
      (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  });

  const exactMatchExists = options.some(
    opt => opt.label.trim().toLowerCase() === searchQuery.trim().toLowerCase()
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
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white text-slate-900 cursor-pointer'
            : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 cursor-pointer'
        }`}
      >
        <div className="flex-1 truncate pr-2">
          {selectedOption ? (
            <div className="flex items-center space-x-2 truncate">
              <span className="font-medium text-slate-900 truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-[11px] text-slate-700 truncate">({selectedOption.sublabel})</span>
              )}
              {selectedOption.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0 text-slate-400">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:text-slate-600 rounded"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Search bar inside dropdown */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 p-1 text-xs">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-2.5 py-2 rounded flex items-center justify-between hover:bg-slate-100 transition-colors ${
                      isSelected ? 'bg-indigo-50/80 font-semibold text-indigo-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex-1 truncate pr-2">
                      <div className="truncate text-slate-800 font-medium">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[10px] text-slate-700 truncate">{opt.sublabel}</div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {opt.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-center text-slate-700 text-xs">
                Nenhum resultado encontrado para &quot;{searchQuery}&quot;
              </div>
            )}

            {/* Quick create option if not found or partial */}
            {allowQuickCreate && searchQuery.trim() && !exactMatchExists && (
              <div className="p-1 border-t border-slate-100 bg-indigo-50/40">
                <button
                  type="button"
                  onClick={handleQuickCreateClick}
                  className="w-full text-left px-2.5 py-2 rounded text-xs font-semibold text-indigo-700 hover:bg-indigo-100/70 flex items-center space-x-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4 text-indigo-600" />
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
