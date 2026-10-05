import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Building, Sparkles, Loader2 } from 'lucide-react';
import { validateFiscalDocument, maskCNPJOrCPF } from '../../utils/cnpjValidator';
import { lookupCNPJ, CNPJCompanyData } from '../../services/cnpjLookupService';

interface CNPJInputFieldProps {
  id?: string;
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  onDataFetched?: (data: CNPJCompanyData) => void;
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
  onDataFetched,
  label = 'CNPJ (ou CPF) *',
  required = false,
  placeholder = '00.000.000/0000-00',
  disabled = false,
  className = '',
  helpText
}) => {
  const [isLoadingReceita, setIsLoadingReceita] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const validation = validateFiscalDocument(value || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = maskCNPJOrCPF(raw);
    const valid = validateFiscalDocument(masked);
    setFetchError(null);
    onChange(masked, valid.isValid);
  };

  const handleLookupReceita = async () => {
    if (!validation.isValid || validation.type !== 'CNPJ') return;
    setIsLoadingReceita(true);
    setFetchError(null);
    try {
      const data = await lookupCNPJ(value);
      if (data && onDataFetched) {
        onDataFetched(data);
      } else if (!data) {
        setFetchError('CNPJ não localizado na base pública da Receita Federal.');
      }
    } catch {
      setFetchError('Falha temporária ao consultar dados na Receita Federal.');
    } finally {
      setIsLoadingReceita(false);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block font-semibold text-[var(--text-secondary)] text-xs">
          {label}
        </label>
        <div className="flex items-center space-x-2">
          {validation.status === 'valid' && validation.type === 'CNPJ' && onDataFetched && (
            <button
              type="button"
              disabled={isLoadingReceita || disabled}
              onClick={handleLookupReceita}
              className="inline-flex items-center text-[10px] font-bold text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 rounded-full border border-amber-500/40 transition-colors cursor-pointer shadow-2xs"
              title="Buscar Razão Social, CEP, Endereço e CNAE na Receita Federal"
            >
              {isLoadingReceita ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin text-amber-400" />
                  Buscando Receita...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1 text-amber-400" />
                  Auto-Preencher Receita
                </>
              )}
            </button>
          )}

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
        {fetchError ? (
          <p className="text-amber-400 font-medium flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
            {fetchError}
          </p>
        ) : validation.status === 'invalid' ? (
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
