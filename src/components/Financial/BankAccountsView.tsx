import React, { useState } from 'react';
import { Landmark, Plus, ArrowLeftRight, Edit2, Wallet, CheckCircle2, Building, Calculator, Coins } from 'lucide-react';
import { BankAccount } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL } from '../../services/financialEngine';
import { CashCalculatorModal } from './CashCalculatorModal';

interface BankAccountsViewProps {
  onOpenTransferModal: () => void;
}

export const BankAccountsView: React.FC<BankAccountsViewProps> = ({ onOpenTransferModal }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isCashCalcOpen, setIsCashCalcOpen] = useState(false);
  const [selectedCashAccount, setSelectedCashAccount] = useState<BankAccount | null>(null);

  const accounts = storage.getBankAccounts();
  const consolidated = FinancialEngine.getConsolidatedCashBalance();

  const handleOpenCashCalculator = (acc?: BankAccount) => {
    if (acc) {
      setSelectedCashAccount(acc);
    } else {
      // Find first physical cash account or fallback to first account
      const cashAcc = accounts.find(a => a.type === 'CAIXA_FISICO') || accounts[0];
      setSelectedCashAccount(cashAcc);
    }
    setIsCashCalcOpen(true);
  };

  const [formData, setFormData] = useState<Partial<BankAccount>>({
    name: '',
    bankCode: '000',
    agency: '',
    accountNumber: '',
    type: 'CORRENTE',
    initialBalance: 0,
    status: 'ATIVO'
  });

  const handleOpenNew = () => {
    setEditingAccount(null);
    setFormData({
      name: '',
      bankCode: '341',
      agency: '1234',
      accountNumber: '56789-0',
      type: 'CORRENTE',
      initialBalance: 0,
      status: 'ATIVO'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (acc: BankAccount) => {
    setEditingAccount(acc);
    setFormData(acc);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const all = storage.getBankAccounts();
    const currentUser = storage.getCurrentUser();

    if (editingAccount) {
      const updated = all.map(a => a.id === editingAccount.id ? { ...a, ...formData } as BankAccount : a);
      storage.saveBankAccounts(updated);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'EDICAO_CONTA_BANCARIA',
        module: 'Bancos e Contas',
        recordId: editingAccount.id,
        details: `Atualização de dados da conta ${formData.name}.`
      });
    } else {
      const newAcc: BankAccount = {
        id: `acc-${Date.now()}`,
        name: formData.name!,
        institution: formData.institution || formData.name || 'Banco',
        bankCode: formData.bankCode || '000',
        agency: formData.agency || '',
        accountNumber: formData.accountNumber || '',
        type: formData.type as any || 'CORRENTE',
        currency: 'BRL',
        initialBalance: Number(formData.initialBalance) || 0,
        currentBalance: Number(formData.initialBalance) || 0,
        baseDate: new Date().toISOString().split('T')[0],
        includeInCashFlow: true,
        status: formData.status as any || 'ATIVO',
        color: '#4338ca'
      };
      storage.saveBankAccounts([...all, newAcc]);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CADASTRO_CONTA_BANCARIA',
        module: 'Bancos e Contas',
        recordId: newAcc.id,
        details: `Cadastro de nova conta bancária ${newAcc.name} (Saldo inicial: ${formatBRL(newAcc.initialBalance)}).`
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <Landmark className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bancos e Contas de Caixa</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Gestão de contas correntes, aplicações de liquidez imediata e caixas físicos.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            id="btn-open-cash-calculator"
            onClick={() => handleOpenCashCalculator()}
            className="px-3.5 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors flex items-center shadow-2xs"
          >
            <Calculator className="w-4 h-4 mr-1.5 text-emerald-700" />
            Calculadora de Caixa Físico
          </button>
          <button
            onClick={onOpenTransferModal}
            className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors flex items-center shadow-2xs"
          >
            <ArrowLeftRight className="w-4 h-4 mr-1.5 text-indigo-600" />
            Nova Transferência
          </button>
          <button
            onClick={handleOpenNew}
            className="px-3.5 py-2 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 transition-colors shadow-2xs flex items-center"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Cadastrar Conta
          </button>
        </div>
      </div>

      {/* Consolidated Total Card */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-xl p-6 text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs text-indigo-200 uppercase font-semibold tracking-wider">
            Disponibilidade Líquida Consolidada
          </span>
          <div className="text-3xl font-extrabold mt-1 tracking-tight">
            {formatBRL(consolidated)}
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            Total disponível em todas as contas ativas do escritório
          </p>
        </div>
        <div className="bg-white/10 px-4 py-2.5 rounded-lg backdrop-blur-xs border border-white/20 text-xs">
          <span className="text-indigo-200 block">Contas cadastradas:</span>
          <span className="font-bold text-white text-base">{accounts.length} contas ativas</span>
        </div>
      </div>

      {/* Grid of Bank Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map(acc => {
          const balance = FinancialEngine.getAccountBalance(acc.id);
          return (
            <div key={acc.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="flex justify-between items-start">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <button
                    onClick={() => handleEdit(acc)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                    title="Editar Conta"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mt-3">{acc.name}</h3>
                <div className="text-[11px] text-slate-700 space-y-0.5 mt-1 font-mono">
                  {acc.agency && <div>Agência: {acc.agency}</div>}
                  {acc.accountNumber && <div>Conta: {acc.accountNumber}</div>}
                  <div className="uppercase text-[10px] font-sans font-medium text-indigo-700 pt-0.5">{acc.type}</div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-700 block">Saldo Atual em Caixa:</span>
                <span className={`text-lg font-bold ${balance >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                  {formatBRL(balance)}
                </span>

                {acc.type === 'CAIXA_FISICO' && (
                  <button
                    id={`btn-count-cash-${acc.id}`}
                    onClick={() => handleOpenCashCalculator(acc)}
                    className="mt-3 w-full py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                    Contar Cédulas & Moedas
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cash Calculator Modal */}
      {selectedCashAccount && (
        <CashCalculatorModal
          isOpen={isCashCalcOpen}
          onClose={() => setIsCashCalcOpen(false)}
          bankAccount={selectedCashAccount}
          onSuccess={() => {}}
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-semibold text-slate-900">
                {editingAccount ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nome da Conta / Banco *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Itaú Unibanco PJ"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tipo de Conta</label>
                  <select
                    value={formData.type || 'CORRENTE'}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  >
                    <option value="CORRENTE">Conta Corrente</option>
                    <option value="POUPANCA">Poupança / Aplicação</option>
                    <option value="CAIXA_FISICO">Caixa Físico</option>
                    <option value="PAGAMENTO">Conta de Pagamento</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Cód. Banco</label>
                  <input
                    type="text"
                    value={formData.bankCode || ''}
                    onChange={e => setFormData({ ...formData, bankCode: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Agência</label>
                  <input
                    type="text"
                    value={formData.agency || ''}
                    onChange={e => setFormData({ ...formData, agency: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Número da Conta</label>
                  <input
                    type="text"
                    value={formData.accountNumber || ''}
                    onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 font-mono"
                  />
                </div>
              </div>

              {!editingAccount && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Saldo Inicial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.initialBalance || ''}
                    onChange={e => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 font-bold"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
