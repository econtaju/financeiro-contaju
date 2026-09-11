import React, { useState } from 'react';
import { FileText, Plus, Search, CalendarClock, AlertCircle, CheckCircle, Edit2, Play } from 'lucide-react';
import { Contract } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatDateBR } from '../../services/financialEngine';
import { SearchableSelect } from '../Common/SearchableSelect';

interface ContractsViewProps {
  onOpenBillingModal: () => void;
}

export const ContractsView: React.FC<ContractsViewProps> = ({ onOpenBillingModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const contracts = storage.getContracts();
  const counterparties = storage.getCounterparties().filter(c => c.type === 'CLIENTE' || c.type === 'AMBOS');
  const services = storage.getServices();
  const bankAccounts = storage.getBankAccounts();

  const filteredContracts = contracts.filter(c => {
    const client = counterparties.find(cp => cp.id === c.customerId);
    const clientMatch = client?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    return clientMatch || c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) || c.description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const mrr = FinancialEngine.calculateMRR();

  const [formData, setFormData] = useState<Partial<Contract>>({
    contractNumber: '',
    customerId: counterparties[0]?.id || '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    billingFrequency: 'MENSAL',
    dueDay: 10,
    dueRule: 'NEXT_MONTH',
    billingMethod: 'BOLETO',
    monthlyTotal: 0,
    status: 'ATIVO',
    notes: ''
  });

  const handleOpenNew = () => {
    setEditingContract(null);
    setFormData({
      contractNumber: `CTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
      customerId: counterparties[0]?.id || '',
      description: 'Honorários Contábeis e Fiscais',
      startDate: new Date().toISOString().split('T')[0],
      billingFrequency: 'MENSAL',
      dueDay: 10,
      dueRule: 'NEXT_MONTH',
      billingMethod: 'BOLETO',
      monthlyTotal: 2500,
      status: 'ATIVO',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (c: Contract) => {
    setEditingContract(c);
    setFormData(c);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.contractNumber) return;

    const all = storage.getContracts();
    const currentUser = storage.getCurrentUser();

    if (editingContract) {
      const updated = all.map(c => c.id === editingContract.id ? { ...c, ...formData } as Contract : c);
      storage.saveContracts(updated);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'EDICAO_CONTRATO',
        module: 'Contratos Recorrentes',
        recordId: editingContract.id,
        details: `Alteração do contrato ${formData.contractNumber}.`
      });
    } else {
      const newContract: Contract = {
        id: `ctr-${Date.now()}`,
        companyId: 'comp-1',
        contractNumber: formData.contractNumber!,
        customerId: formData.customerId!,
        description: formData.description || 'Honorários Contábeis',
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        billingFrequency: 'MENSAL',
        dueDay: Number(formData.dueDay) || 10,
        dueRule: formData.dueRule as 'SAME_MONTH' | 'NEXT_MONTH' || 'NEXT_MONTH',
        billingMethod: formData.billingMethod as any || 'BOLETO',
        monthlyTotal: Number(formData.monthlyTotal) || 0,
        periodicity: 'MENSAL',
        items: [
          {
            id: `item-${Date.now()}`,
            serviceId: services[0]?.id || 'srv-1',
            description: formData.description || 'Honorários Contábeis',
            quantity: 1,
            unitPrice: Number(formData.monthlyTotal) || 0,
            accountId: services[0]?.defaultAccountId || 'acc-rec-01',
            total: Number(formData.monthlyTotal) || 0
          }
        ],
        status: formData.status as any || 'ATIVO',
        notes: formData.notes || '',
        createdAt: new Date().toISOString()
      };
      storage.saveContracts([...all, newContract]);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CADASTRO_CONTRATO',
        module: 'Contratos Recorrentes',
        recordId: newContract.id,
        details: `Cadastro de novo contrato ${newContract.contractNumber} (${formatBRL(newContract.monthlyTotal)}/mês).`
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contratos Recorrentes (MRR)</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Parametrização de mensalidades, regras de vencimento, reajustes e faturamento em lote.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenBillingModal}
            className="px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors shadow-2xs flex items-center"
          >
            <CalendarClock className="w-4 h-4 mr-1.5" />
            Processar Faturamento Mensal
          </button>
          <button
            onClick={handleOpenNew}
            className="px-3.5 py-2 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 transition-colors shadow-2xs flex items-center"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Contrato
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-700 font-medium">MRR da Carteira</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{formatBRL(mrr)}</div>
          <span className="text-[11px] text-slate-700">Receita recorrente mensal contratada</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-700 font-medium">Contratos Ativos</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {contracts.filter(c => c.status === 'ATIVO').length} contratos
          </div>
          <span className="text-[11px] text-slate-700">Com faturamento recorrente habilitado</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-700 font-medium">Ticket Médio Mensal</span>
          <div className="text-xl font-bold text-purple-700 mt-1">
            {contracts.length > 0 ? formatBRL(mrr / contracts.filter(c => c.status === 'ATIVO').length) : 'R$ 0,00'}
          </div>
          <span className="text-[11px] text-slate-700">Valor médio por cliente ativo</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, número ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white dark:bg-[#131720] rounded-xl border border-slate-200 dark:border-[#273040] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#1B212D] border-b border-slate-200 dark:border-[#273040] text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Contrato / Objeto</th>
                <th className="py-3 px-4">Cliente / Contratante</th>
                <th className="py-3 px-4">Data de Início</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Forma</th>
                <th className="py-3 px-4 text-right">Mensalidade</th>
                <th className="py-3 px-4 text-center">Último Faturamento</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#273040]">
              {filteredContracts.map(c => {
                const client = counterparties.find(cp => cp.id === c.customerId);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-[#1B212D]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{c.contractNumber}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">{c.description}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{client?.name || 'Cliente'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{client?.document}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center text-slate-800 dark:text-slate-200 font-medium">
                        <CalendarClock className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                        {c.startDate ? formatDateBR(c.startDate) : 'Não inf.'}
                      </div>
                      <span className="text-[10px] text-slate-500">Início da vigência</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Todo dia {c.dueDay}</span>
                      <div className="text-[10px] text-slate-500">
                        {c.dueRule === 'NEXT_MONTH' ? 'Mês seguinte (D+1)' : 'Mesmo mês (D+0)'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{c.billingMethod}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-amber-400 text-sm">
                      {formatBRL(c.monthlyTotal)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                      {c.lastGeneratedCompetence || 'Pendente'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        c.status === 'ATIVO' 
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleEdit(c)}
                        className="p-1.5 text-slate-600 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-[#1B212D] rounded-lg transition-colors"
                        title="Editar Contrato"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Redesenhado com Alinhamento Perfeito e Estilo Leão Dourado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131720] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-[#273040] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header com identidade dourada */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-black border border-amber-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {editingContract ? 'Editar Contrato Recorrente' : 'Novo Contrato de Prestação de Serviços'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Definição de vigência, cliente contratante, vencimento e honorários mensais
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 text-xs">
              
              {/* Bloco 1: Identificação e Cliente (Grid Perfeitamente Alinhado) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B212D]/60 border border-slate-200 dark:border-[#273040] space-y-3">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  1. Identificação & Contratante
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      Nº do Contrato *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: CTR-2026-001"
                      value={formData.contractNumber || ''}
                      onChange={e => setFormData({ ...formData, contractNumber: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#131720] px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      Cliente Contratante *
                    </label>
                    <SearchableSelect
                      label=""
                      required
                      options={counterparties.map(c => ({
                        value: c.id,
                        label: c.name,
                        sublabel: c.document ? `Doc: ${c.document}` : undefined
                      }))}
                      value={formData.customerId || ''}
                      onChange={val => setFormData({ ...formData, customerId: val })}
                      placeholder="Pesquise o cliente..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    Objeto do Contrato / Descrição dos Honorários *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Assessoria Contábil, Fiscal e Gestão Financeira"
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#131720] px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Bloco 2: Vigência & Prazos (com Data de Início obrigatória) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B212D]/60 border border-slate-200 dark:border-[#273040] space-y-3">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  2. Vigência & Prazos de Vencimento
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      Data de Início do Contrato *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={formData.startDate || ''}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#131720] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Início da vigência jurídica</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      Dia do Vencimento Mensal *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      value={formData.dueDay || 10}
                      onChange={e => setFormData({ ...formData, dueDay: parseInt(e.target.value) || 10 })}
                      className="w-full rounded-lg border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#131720] px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Dia fixo (Ex: 10, 15, 20)</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      Regra da Competência
                    </label>
                    <select
                      value={formData.dueRule || 'NEXT_MONTH'}
                      onChange={e => setFormData({ ...formData, dueRule: e.target.value as any })}
                      className="w-full rounded-lg border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#131720] px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    >
                      <option value="NEXT_MONTH">Mês Seguinte (D+1)</option>
                      <option value="SAME_MONTH">Mesmo Mês (D+0)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block">Ex: fatura Jan vence em Fev</span>
                  </div>
                </div>
              </div>

              {/* Bloco 3: Valores Financeiros & Faturamento */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B212D]/60 border border-slate-200 dark:border-[#273040] space-y-3">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  3. Condições Financeiras & Cobrança
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      Valor Mensal (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        value={formData.monthlyTotal || ''}
                        onChange={e => setFormData({ ...formData, monthlyTotal: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#131720] pl-9 pr-3.5 py-2 text-xs font-bold text-slate-900 dark:text-amber-400 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Honorário mensal contratado</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      Forma de Cobrança
                    </label>
                    <select
                      value={formData.billingMethod || 'BOLETO'}
                      onChange={e => setFormData({ ...formData, billingMethod: e.target.value as any })}
                      className="w-full rounded-lg border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#131720] px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    >
                      <option value="BOLETO">Boleto Bancário</option>
                      <option value="PIX">PIX Cobrança</option>
                      <option value="TRANSFERENCIA">Transferência / TED</option>
                      <option value="OUTRO">Outro Meio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      Status do Contrato
                    </label>
                    <select
                      value={formData.status || 'ATIVO'}
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full rounded-lg border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#131720] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    >
                      <option value="ATIVO">ATIVO (Gera Faturamento)</option>
                      <option value="SUSPENSO">SUSPENSO (Pausado)</option>
                      <option value="ENCERRADO">ENCERRADO</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-[#273040]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1B212D] rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-black bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:brightness-105 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4 text-black stroke-[2.5]" />
                  Salvar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
