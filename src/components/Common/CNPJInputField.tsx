import React from 'react';
import { CheckCircle2, AlertTriangle, Building, HelpCircle } from 'lucide-react';
import { validateFiscalDocument, maskCNPJOrCPF } from '../../utils/cnpjValidator';

interface CNPJInputFieldProps {
  id?: string;
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  helpText?: string;
}

export const CNPJInputField: React.FC<CNPJInputFieldProps> = ({
  id = 'fiscal-document-input',
  value,
  onChange,
  label = 'CNPJ (ou CPF) *',
  required = false,
  placeholder = '00.000.000/0000-00',
  disabled = false,
  className = '',
  helpText
}) => {
  const validation = validateFiscalDocument(value || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = maskCNPJOrCPF(raw);
    const valid = validateFiscalDocument(masked);
    onChange(masked, valid.isValid);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block font-semibold text-[var(--text-secondary)] text-xs">
          {label}
        </label>
        {validation.status === 'valid' && (
          <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-in fade-in">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
            {validation.type} Válido
          </span>
        )}
        {validation.status === 'invalid' && (
          <span className="inline-flex items-center text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30 animate-in fade-in">
            <AlertTriangle className="w-3 h-3 mr-1 text-rose-400" />
            {validation.type} Inválido
          </span>
        )}
      </div>

      <div className="relative">
        <input
          id={id}
          type="text"
          required={required}
          disabled={disabled}
          value={value || ''}
          onChange={handleChange}
          maxLength={18}
          placeholder={placeholder}
          className={`w-full rounded-xl border bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 font-mono text-xs focus:outline-none transition-all ${
            validation.status === 'valid'
              ? 'border-emerald-500/60 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400'
              : validation.status === 'invalid'
              ? 'border-rose-500/60 focus:border-rose-400 focus:ring-1 focus:ring-rose-400'
              : 'border-[var(--border-subtle)] focus:border-amber-400'
          }`}
        />
        <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
          <Building className="w-4 h-4 opacity-50" />
        </div>
      </div>

      {/* Helper / validation message */}
      <div className="flex items-center justify-between text-[11px] pt-0.5">
        {validation.status === 'invalid' ? (
          <p className="text-rose-400 font-medium flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
            {validation.message}
          </p>
        ) : validation.status === 'valid' ? (
          <p className="text-emerald-400 font-medium flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1 flex-shrink-0" />
            {validation.message}
          </p>
        ) : (
          <p className="text-[var(--text-muted)] flex items-center">
            {helpText || (validation.digits.length > 0 ? validation.message : 'Digite os 14 números do CNPJ para conferência automática.')}
          </p>
        )}

        {validation.digits.length > 0 && validation.status !== 'valid' && (
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            {validation.digits.length}/14 dígitos
          </span>
        )}
      </div>
    </div>
  );
};
