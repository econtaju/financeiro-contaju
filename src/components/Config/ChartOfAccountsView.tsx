import React, { useState } from 'react';
import { Network, Plus, Search, Layers, Edit2 } from 'lucide-react';
import { ChartOfAccount } from '../../types';
import { storage } from '../../services/storageService';
import { matchesSearch } from '../../utils/searchUtils';

export const ChartOfAccountsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);

  const accounts = storage.getChartAccounts().sort((a, b) => a.code.localeCompare(b.code));

  const [formData, setFormData] = useState<Partial<ChartOfAccount>>({
    code: '',
    name: '',
    nature: 'CREDORA',
    isSynthetic: false,
    dreLineMapping: '6.1',
    status: 'ATIVO'
  });

  const filtered = accounts.filter(a => 
    matchesSearch([a.code, a.name, a.nature, a.dreLineMapping], searchTerm)
  );

  const handleOpenNew = () => {
    setEditingAccount(null);
    setFormData({
      code: '',
      name: '',
      nature: 'DEVEDORA',
      isSynthetic: false,
      dreLineMapping: '6.1',
      status: 'ATIVO'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (a: ChartOfAccount) => {
    setEditingAccount(a);
    setFormData(a);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return;

    const all = storage.getChartAccounts();
    const currentUser = storage.getCurrentUser();

    if (editingAccount) {
      const updated = all.map(a => a.id === editingAccount.id ? { ...a, ...formData } as ChartOfAccount : a);
      storage.saveChartAccounts(updated);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'EDICAO_PLANO_CONTAS',
        module: 'Plano de Contas',
        recordId: editingAccount.id,
        details: `Atualização da conta contábil ${formData.code} - ${formData.name}.`
      });
    } else {
      const isSynth = Boolean(formData.isSynthetic);
      const newAcc: ChartOfAccount = {
        id: `acc-${Date.now()}`,
        code: formData.code!,
        name: formData.name!,
        nature: (formData.nature as any) || 'DESPESA_ADMINISTRATIVA',
        dremap: {
          include: true,
          line: formData.dreLineMapping || '4.2',
          multiplier: 1
        },
        cashFlowCategory: 'OPERACIONAL',
        isAnalytical: !isSynth,
        isSynthetic: isSynth,
        isActive: true,
        dreLineMapping: formData.dreLineMapping || '6.1',
        status: 'ATIVO'
      };
      storage.saveChartAccounts([...all, newAcc]);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CRIACAO_PLANO_CONTAS',
        module: 'Plano de Contas',
        recordId: newAcc.id,
        details: `Criação da conta contábil ${newAcc.code} - ${newAcc.name}.`
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
            <Network className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Plano de Contas Gerencial</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Estrutura hierárquica contábil vinculada diretamente às linhas da DRE e centros de custo.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-3.5 py-2 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 transition-colors shadow-2xs flex items-center"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Conta Contábil
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300"
          />
        </div>
        <span className="text-xs text-slate-700">{filtered.length} contas cadastradas</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Código Estrutural</th>
                <th className="py-3 px-4">Descrição da Conta</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Natureza</th>
                <th className="py-3 px-4">Mapeamento DRE</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(acc => {
                const isSynthetic = acc.isSynthetic ?? !acc.isAnalytical;
                const level = acc.code.split('.').length;

                return (
                  <tr key={acc.id} className={isSynthetic ? 'bg-slate-50/70 font-bold text-slate-900' : 'hover:bg-slate-50 text-slate-700'}>
                    <td className="py-2.5 px-4 font-mono text-slate-900">
                      {acc.code}
                    </td>
                    <td className="py-2.5 px-4" style={{ paddingLeft: `${level * 14}px` }}>
                      {acc.name}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        isSynthetic ? 'bg-slate-200 text-slate-800' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {isSynthetic ? 'Sintética (Grupo)' : 'Analítica (Lançamento)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700">
                      {acc.nature}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-indigo-700 font-medium">
                      Linha {acc.dreLineMapping || acc.dremap?.line || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {acc.status || (acc.isActive ? 'ATIVO' : 'INATIVO')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleEdit(acc)}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-semibold text-slate-900">
                {editingAccount ? 'Editar Conta' : 'Nova Conta Contábil'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Código Estrutural *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 4.1.05"
                    value={formData.code || ''}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Natureza</label>
                  <select
                    value={formData.nature || 'DEVEDORA'}
                    onChange={e => setFormData({ ...formData, nature: e.target.value as any })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  >
                    <option value="CREDORA">Credora (Receitas/Passivo)</option>
                    <option value="DEVEDORA">Devedora (Despesas/Ativo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nome da Conta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Softwares e Ferramentas em Nuvem"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mapeamento Linha DRE</label>
                  <input
                    type="text"
                    placeholder="Ex: 6.1"
                    value={formData.dreLineMapping || ''}
                    onChange={e => setFormData({ ...formData, dreLineMapping: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 font-mono"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center space-x-2 text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isSynthetic)}
                      onChange={e => setFormData({ ...formData, isSynthetic: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Conta Sintética (Grupo)</span>
                  </label>
                </div>
              </div>

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
