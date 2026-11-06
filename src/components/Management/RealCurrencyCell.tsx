import React, { useState, useEffect, useRef } from 'react';

export const formatRealCurrency = (value: number, showPrefix: boolean = true): string => {
  if (value === 0) return showPrefix ? 'R$ 0,00' : '0,00';
  const safeVal = typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
  const formatted = safeVal.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return showPrefix ? `R$ ${formatted}` : formatted;
};

export const parseRealCurrency = (input: string): number => {
  if (!input) return 0;
  // Remove R$, espaços e caracteres não numéricos exceto vírgula, ponto e sinal de menos
  let clean = input.replace(/[R$\s]/g, '').trim();
  if (!clean) return 0;

  // Se contiver tanto ponto quanto vírgula (ex: 1.500,50 ou 1,500.50)
  if (clean.includes('.') && clean.includes(',')) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Padrão brasileiro: 1.500,50
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão americano: 1,500.50
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    // Apenas vírgula: 1500,50 -> 1500.50
    clean = clean.replace(',', '.');
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
};

interface RealCurrencyCellProps {
  value: number;
  onChange: (newValue: number) => void;
  isChanged?: boolean;
  className?: string;
  title?: string;
}

export const RealCurrencyCell: React.FC<RealCurrencyCellProps> = ({
  value,
  onChange,
  isChanged,
  className = '',
  title
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincroniza quando o valor numérico externo mudar e o campo não estiver em foco
  useEffect(() => {
    if (!isFocused) {
      if (value === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatRealCurrency(value, true));
      }
    }
  }, [value, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Ao focar, exibe o valor formatado sem o prefixo R$ para facilitar edição
    if (value !== 0) {
      setDisplayValue(formatRealCurrency(value, false));
    } else {
      setDisplayValue('');
    }
    // Seleciona todo o conteúdo após breve delay
    setTimeout(() => {
      e.target.select();
    }, 20);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
  };

  const commitValue = () => {
    const parsed = parseRealCurrency(displayValue);
    onChange(parsed);
    if (parsed === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatRealCurrency(parsed, true));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    commitValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      setDisplayValue(value === 0 ? '' : formatRealCurrency(value, true));
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        placeholder="R$ 0,00"
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        title={title}
        className={`w-full text-right px-2 py-1.5 rounded-lg font-mono text-xs sm:text-[12.5px] font-medium placeholder:text-[var(--text-secondary)]/30 focus:outline-hidden transition-colors ${
          isChanged
            ? 'bg-amber-500/20 border-2 border-amber-500/60 text-amber-300 font-bold focus:border-amber-400'
            : 'bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30'
        } ${className}`}
      />
      {isChanged && (
        <span 
          className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 pointer-events-none" 
          title="Valor modificado"
        />
      )}
    </div>
  );
};
