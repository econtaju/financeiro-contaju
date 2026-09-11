import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle, UserPlus } from 'lucide-react';
import { TitleType, FinancialTitle, Counterparty } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine } from '../../services/financialEngine';
import { SearchableSelect, SelectOption } from '../Common/SearchableSelect';
import { CompleteCounterpartyModal } from './CompleteCounterpartyModal';

interface NewTitleModalProps {
  isOpen: boolean;
  defaultType: TitleType;
  onClose: () => void;
  onSaved: () => void;
}

export const NewTitleModal: React.FC<NewTitleModalProps> = ({
  isOpen,
  defaultType,
  onClose,
  onSaved
}) => {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  const [type, setType] = useState<TitleType>(defaultType);
  const [titleNumber, setTitleNumber] = useState(`${defaultType === 'RECEBER' ? 'REC' : 'PAG'}-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`);
  const [counterpartyId, setCounterpartyId] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  
  // Independent dates (Prompt Item 4.1)
  const [launchDate, setLaunchDate] = useState(today);
  const [competence, setCompetence] = useState(currentMonth);
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [expectedCashDate, setExpectedCashDate] = useState(today);
  
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [expectedBankAccountId, setExpectedBankAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Quick counterparty creation state
  const [quickCreatedId, setQuickCreatedId] = useState<string | null>(null);
  const [openCompleteModal, setOpenCompleteModal] = useState(false);
  const [openCompleteAfterSave, setOpenCompleteAfterSave] = useState(true);

  if (!isOpen) return null;

  const counterparties = storage.getCounterparties().filter(c => {
    if (type === 'RECEBER') return c.type === 'CLIENTE' || c.type === 'AMBOS';
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
      sublabel: b.institution
    }))
  ];

  const handleQuickCreateCounterparty = (name: string) => {
    const newId = `cp-${Date.now()}`;
    const newParty: Counterparty = {
      id: newId,
      name,
      type: type === 'RECEBER' ? 'CLIENTE' : 'FORNECEDOR',
      document: '',
      email: '',
      phone: '',
      status: 'ATIVO',
      createdAt: new Date().toISOString(),
      notes: 'Cadastro rápido realizado direto na criação de título.'
    };
    storage.addCounterparty(newParty);
    setCounterpartyId(newId);
    setQuickCreatedId(newId);
    setOpenCompleteAfterSave(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!counterpartyId) {
      setErrorMessage(type === 'RECEBER' ? 'Selecione ou cadastre o cliente.' : 'Selecione ou cadastre o fornecedor.');
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

    if (FinancialEngine.isPeriodClosed(competence)) {
      setErrorMessage(`O período de competência ${competence} está fechado para novos lançamentos.`);
      return;
    }

    const currentUser = storage.getCurrentUser();
    if (currentUser.role === 'CONSULTA') {
      setErrorMessage('Perfil de consulta não possui permissão para cadastrar títulos.');
      return;
    }

    const newTitle: FinancialTitle = {
      id: `tit-${Date.now()}`,
      companyId: 'comp-1',
      type,
      titleNumber,
      counterpartyId,
      description: description.trim(),
      accountId,
      launchDate,
      competence,
      issueDate,
      dueDate,
      expectedCashDate: expectedCashDate || dueDate,
      originalAmount: Number(originalAmount),
      settledPrincipal: 0,
      balancePrincipal: Number(originalAmount),
      accruedInterest: 0,
      accruedFine: 0,
      documentState: 'CONFIRMADO',
      settlementState: 'ABERTO',
      originType: 'MANUAL',
      expectedBankAccountId: expectedBankAccountId || undefined,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const titles = storage.getTitles();
    storage.saveTitles([newTitle, ...titles]);

    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'NOVO_TITULO_MANUAL',
      module: type === 'RECEBER' ? 'Contas a Receber' : 'Contas a Pagar',
      recordId: newTitle.id,
      details: `Criação do título ${newTitle.titleNumber} (${description}) no valor de R$ ${originalAmount.toFixed(2)}. Competência: ${competence}, Vencimento: ${dueDate}.`
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
              <PlusCircle className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Novo Lançamento Financeiro
              </h2>
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

          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            
            {/* Tipo de Título */}
            <div className="flex items-center space-x-4 pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-700">Tipo:</span>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="titleType"
                  checked={type === 'RECEBER'}
                  onChange={() => {
                    setType('RECEBER');
                    setTitleNumber(`REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`);
                  }}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-emerald-700">Conta a Receber (Receita / Direito)</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="titleType"
                  checked={type === 'PAGAR'}
                  onChange={() => {
                    setType('PAGAR');
                    setTitleNumber(`PAG-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`);
                  }}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-rose-700">Conta a Pagar (Custo / Despesa)</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Número do Título / Documento *
                </label>
                <input
                  type="text"
                  value={titleNumber}
                  onChange={(e) => setTitleNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {type === 'RECEBER' ? 'Cliente *' : 'Fornecedor *'}
                </label>
                <SearchableSelect
                  options={counterpartyOptions}
                  value={counterpartyId}
                  onChange={setCounterpartyId}
                  placeholder="Pesquise ou cadastre..."
                  searchPlaceholder="Escreva o nome para pesquisar..."
                  allowQuickCreate={true}
                  quickCreateLabel={(q) => `+ Cadastrar rápido "${q}"`}
                  onQuickCreate={handleQuickCreateCounterparty}
                  required
                />
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
                placeholder="Ex: Consultoria mensal, Licença de software, Fatura de internet..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Classificação (Plano de Contas) *
                </label>
                <SearchableSelect
                  options={chartAccountOptions}
                  value={accountId}
                  onChange={setAccountId}
                  placeholder="Selecione conta analítica..."
                  searchPlaceholder="Buscar conta analítica..."
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Valor Original (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={originalAmount || ''}
                  onChange={(e) => setOriginalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-900 text-xs"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            {/* Independent Dates Section (Item 4.1) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Datas e Competência Econômica</span>
                <span className="text-[10px] text-slate-700">DRE x Agenda x Caixa</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-medium">
                    Competência (DRE) *
                  </label>
                  <input
                    type="month"
                    value={competence}
                    onChange={(e) => setCompetence(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
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
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      if (!expectedCashDate || expectedCashDate === dueDate) {
                        setExpectedCashDate(e.target.value);
                      }
                    }}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
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
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-medium">
                    Data de Lançamento
                  </label>
                  <input
                    type="date"
                    value={launchDate}
                    onChange={(e) => setLaunchDate(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-medium">
                    Data de Emissão (Doc)
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Conta Bancária Prevista
                </label>
                <SearchableSelect
                  options={bankAccountOptions}
                  value={expectedBankAccountId}
                  onChange={setExpectedBankAccountId}
                  placeholder="Indiferente / Não definida"
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
                  placeholder="Detalhes adicionais..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            </div>

            {quickCreatedId && (
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span className="text-[11px] text-indigo-900 font-medium">
                    Novo {type === 'RECEBER' ? 'cliente' : 'fornecedor'} cadastrado rapidamente!
                  </span>
                </div>
                <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-indigo-800 font-medium">
                  <input
                    type="checkbox"
                    checked={openCompleteAfterSave}
                    onChange={(e) => setOpenCompleteAfterSave(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Completar cadastro após salvar</span>
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
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                Salvar Título
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
