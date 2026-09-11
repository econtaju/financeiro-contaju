import React, { useState, useEffect } from 'react';
import { X, Edit3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FinancialTitle, Counterparty } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL } from '../../services/financialEngine';
import { SearchableSelect, SelectOption } from '../Common/SearchableSelect';
import { CompleteCounterpartyModal } from './CompleteCounterpartyModal';

interface EditTitleModalProps {
  isOpen: boolean;
  title: FinancialTitle | null;
  onClose: () => void;
  onSaved: () => void;
}

export const EditTitleModal: React.FC<EditTitleModalProps> = ({
  isOpen,
  title,
  onClose,
  onSaved
}) => {
  const [description, setDescription] = useState('');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [competence, setCompetence] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expectedCashDate, setExpectedCashDate] = useState('');
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [expectedBankAccountId, setExpectedBankAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Quick counterparty creation state
  const [quickCreatedId, setQuickCreatedId] = useState<string | null>(null);
  const [openCompleteModal, setOpenCompleteModal] = useState(false);
  const [openCompleteAfterSave, setOpenCompleteAfterSave] = useState(true);

  useEffect(() => {
    if (title) {
      setDescription(title.description || '');
      setCounterpartyId(title.counterpartyId || '');
      setAccountId(title.accountId || '');
      setCompetence(title.competence || '');
      setDueDate(title.dueDate || '');
      setExpectedCashDate(title.expectedCashDate || title.dueDate || '');
      setOriginalAmount(title.originalAmount || 0);
      setExpectedBankAccountId(title.expectedBankAccountId || '');
      setNotes(title.notes || '');
      setErrorMessage('');
    }
  }, [title, isOpen]);

  if (!isOpen || !title) return null;

  const isReceber = title.type === 'RECEBER';
  const hasSettlements = title.settledPrincipal > 0;

  const counterparties = storage.getCounterparties().filter(c => {
    if (isReceber) return c.type === 'CLIENTE' || c.type === 'AMBOS';
    return c.type === 'FORNECEDOR' || c.type === 'AMBOS';
  });

  const chartAccounts = storage.getChartAccounts().filter(a => a.isAnalytical && a.isActive);
  const bankAccounts = storage.getBankAccounts().filter(a => a.status === 'ATIVO');

  const counterpartyOptions: SelectOption[] = counterparties.map(c => ({
    value: c.id,
    label: c.name,
    sublabel: c.document ? `Doc: ${c.document}` : (c.tradeName || undefined),
    badge: c.status === 'ATIVO' ? undefined : 'Inativo'
  }));

  const chartAccountOptions: SelectOption[] = chartAccounts.map(a => ({
    value: a.id,
    label: `${a.code} - ${a.name}`,
    sublabel: a.nature ? `Natureza: ${a.nature}` : undefined
  }));

  const bankAccountOptions: SelectOption[] = [
    { value: '', label: 'Indiferente / Não definida' },
    ...bankAccounts.map(b => ({
      value: b.id,
      label: b.name,
      sublabel: `${b.institution} - Saldo R$ ${FinancialEngine.getAccountBalance(b.id).toFixed(2)}`
    }))
  ];

  const handleQuickCreateCounterparty = (name: string) => {
    const newId = `cp-${Date.now()}`;
    const newParty: Counterparty = {
      id: newId,
      name,
      type: isReceber ? 'CLIENTE' : 'FORNECEDOR',
      document: '',
      email: '',
      phone: '',
      status: 'ATIVO',
      createdAt: new Date().toISOString(),
      notes: 'Cadastro rápido criado via edição de título.'
    };
    storage.addCounterparty(newParty);
    setCounterpartyId(newId);
    setQuickCreatedId(newId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!counterpartyId) {
      setErrorMessage(isReceber ? 'Selecione o cliente.' : 'Selecione o fornecedor.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Informe a descrição do lançamento.');
      return;
    }
    if (!accountId) {
      setErrorMessage('Selecione uma conta analítica do plano de contas.');
      return;
    }
    if (originalAmount <= 0) {
      setErrorMessage('O valor do título deve ser superior a zero.');
      return;
    }

    if (hasSettlements && originalAmount < title.settledPrincipal) {
      setErrorMessage(
        `O valor original (${formatBRL(originalAmount)}) não pode ser inferior ao valor já baixado (${formatBRL(title.settledPrincipal)}).`
      );
      return;
    }

    if (FinancialEngine.isPeriodClosed(competence) && competence !== title.competence) {
      setErrorMessage(`O período de competência ${competence} está fechado para alterações.`);
      return;
    }

    const currentUser = storage.getCurrentUser();
    if (currentUser.role === 'CONSULTA') {
      setErrorMessage('Perfil de consulta não possui permissão para editar títulos.');
      return;
    }

    const newBalance = originalAmount - title.settledPrincipal;

    storage.updateTitle(title.id, {
      description: description.trim(),
      counterpartyId,
      accountId,
      competence,
      dueDate,
      expectedCashDate: expectedCashDate || dueDate,
      originalAmount: Number(originalAmount),
      balancePrincipal: newBalance,
      expectedBankAccountId: expectedBankAccountId || undefined,
      notes
    });

    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EDICAO_TITULO',
      module: isReceber ? 'Contas a Receber' : 'Contas a Pagar',
      recordId: title.id,
      details: `Edição do título ${title.titleNumber} (${description}). Valor: ${formatBRL(originalAmount)}, Vencimento: ${dueDate}.`
    });

    if (quickCreatedId && openCompleteAfterSave) {
      setOpenCompleteModal(true);
    } else {
      onSaved();
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
          
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-2">
              <Edit3 className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Editar Lançamento: <span className="font-mono text-indigo-700">{title.titleNumber}</span>
                </h2>
                <p className="text-[11px] text-slate-700">
                  Duplo clique ativado • {isReceber ? 'Conta a Receber' : 'Conta a Pagar'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {hasSettlements && (
            <div className="mx-6 mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
              ⚠️ Este lançamento possui baixas parciais ({formatBRL(title.settledPrincipal)} baixados de {formatBRL(title.originalAmount)}). O valor original não pode ser reduzido abaixo do total já baixado.
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {isReceber ? 'Cliente *' : 'Fornecedor *'}
                </label>
                <SearchableSelect
                  options={counterpartyOptions}
                  value={counterpartyId}
                  onChange={setCounterpartyId}
                  placeholder="Pesquise ou cadastre..."
                  searchPlaceholder="Digite o nome..."
                  allowQuickCreate={true}
                  quickCreateLabel={(q) => `+ Cadastrar rápido "${q}"`}
                  onQuickCreate={handleQuickCreateCounterparty}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Valor Original (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={originalAmount || ''}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    onChange={(e) => setOriginalAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#131720] pl-9 pr-3 py-2 font-bold text-slate-900 dark:text-amber-400 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Descrição do Título *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Classificação (Plano de Contas) *
              </label>
              <SearchableSelect
                options={chartAccountOptions}
                value={accountId}
                onChange={setAccountId}
                placeholder="Selecione a conta analítica..."
                searchPlaceholder="Buscar por código ou descrição..."
                required
              />
            </div>

            {/* Datas */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-600 text-[11px] mb-1 font-medium">
                  Competência *
                </label>
                <input
                  type="month"
                  value={competence}
                  onChange={(e) => setCompetence(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[11px] mb-1 font-medium">
                  Vencimento *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[11px] mb-1 font-medium">
                  Previsão de Caixa
                </label>
                <input
                  type="date"
                  value={expectedCashDate}
                  onChange={(e) => setExpectedCashDate(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Conta Bancária Prevista
                </label>
                <SearchableSelect
                  options={bankAccountOptions}
                  value={expectedBankAccountId}
                  onChange={setExpectedBankAccountId}
                  placeholder="Selecione o banco..."
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {quickCreatedId && (
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="completeAfterEdit"
                  checked={openCompleteAfterSave}
                  onChange={(e) => setOpenCompleteAfterSave(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="completeAfterEdit" className="text-slate-700 cursor-pointer text-xs">
                  Abrir modal para completar cadastro de cliente/fornecedor após salvar
                </label>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Salvar Alterações
              </button>
            </div>

          </form>

        </div>
      </div>

      {openCompleteModal && quickCreatedId && (
        <CompleteCounterpartyModal
          isOpen={true}
          counterpartyId={quickCreatedId}
          onClose={() => {
            setOpenCompleteModal(false);
            onSaved();
            onClose();
          }}
          onSaved={() => {
            setOpenCompleteModal(false);
            onSaved();
            onClose();
          }}
        />
      )}
    </>
  );
};
