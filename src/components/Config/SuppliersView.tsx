import React, { useState } from 'react';
import { Truck, Plus, Search, Edit2, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Counterparty } from '../../types';
import { storage } from '../../services/storageService';
import { formatBRL } from '../../services/financialEngine';
import { CNPJInputField } from '../Common/CNPJInputField';
import { validateFiscalDocument } from '../../utils/cnpjValidator';
import { matchesSearch } from '../../utils/searchUtils';

export const SuppliersView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Counterparty | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const counterparties = storage.getCounterparties();
  const suppliers = counterparties.filter(c => c.type === 'FORNECEDOR' || c.type === 'AMBOS');
  const titles = storage.getTitles();

  const [formData, setFormData] = useState<Partial<Counterparty>>({
    name: '',
    document: '',
    type: 'FORNECEDOR',
    email: '',
    phone: '',
    status: 'ATIVO',
    notes: ''
  });

  const filtered = suppliers.filter(s => 
    matchesSearch([s.name, s.tradeName, s.document, s.email, s.phone, s.notes], searchTerm)
  );

  const handleOpenNew = () => {
    setEditingSupplier(null);
    setDocError(null);
    setFormData({
      name: '',
      document: '',
      type: 'FORNECEDOR',
      email: '',
      phone: '',
      status: 'ATIVO',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (s: Counterparty) => {
    setEditingSupplier(s);
    setDocError(null);
    setFormData(s);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    if (formData.document?.trim()) {
      const fiscalCheck = validateFiscalDocument(formData.document);
      if (fiscalCheck.status === 'invalid') {
        setDocError(fiscalCheck.message);
        return;
      }
    }
    setDocError(null);

    const all = storage.getCounterparties();
    const currentUser = storage.getCurrentUser();

    if (editingSupplier) {
      const updated = all.map(s => s.id === editingSupplier.id ? { ...s, ...formData } as Counterparty : s);
      storage.saveCounterparties(updated);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'EDICAO_FORNECEDOR',
        module: 'Fornecedores',
        recordId: editingSupplier.id,
        details: `Atualização de cadastro do fornecedor ${formData.name}.`
      });
    } else {
      const newSup: Counterparty = {
        id: `sup-${Date.now()}`,
        name: formData.name!,
        document: formData.document || '',
        type: 'FORNECEDOR',
        email: formData.email || '',
        phone: formData.phone || '',
        status: formData.status as any || 'ATIVO',
        notes: formData.notes || '',
        createdAt: new Date().toISOString()
      };
      storage.saveCounterparties([...all, newSup]);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CADASTRO_FORNECEDOR',
        module: 'Fornecedores',
        recordId: newSup.id,
        details: `Cadastro de novo fornecedor ${newSup.name}.`
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
            <Truck className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fornecedores e Prestadores</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Cadastro de fornecedores de software, materiais, infraestrutura, tributos e parceiros operacionais.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-3.5 py-2 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors shadow-2xs flex items-center"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Fornecedor
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por razão social ou CNPJ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300"
          />
        </div>
        <span className="text-xs text-slate-700">{filtered.length} fornecedores</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4">CNPJ / CPF</th>
                <th className="py-3 px-4">Contato</th>
                <th className="py-3 px-4 text-right">Saldo a Pagar</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => {
                const openBalance = titles
                  .filter(t => t.counterpartyId === s.id && t.type === 'PAGAR')
                  .reduce((acc, t) => acc + t.balancePrincipal, 0);

                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      {s.notes && <div className="text-[10px] text-slate-700">{s.notes}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{s.document}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{s.email}</div>
                      <div className="text-[11px] text-slate-700">{s.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-700">
                      {formatBRL(openBalance)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleEdit(s)}
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
                {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3 text-xs">
              {docError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center font-medium">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 text-rose-600" />
                  <span>{docError}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Razão Social / Nome *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div>
                <CNPJInputField
                  id="supplier-cnpj-input"
                  value={formData.document || ''}
                  onChange={(maskedVal) => {
                    setFormData(prev => ({ ...prev, document: maskedVal }));
                    if (docError) setDocError(null);
                  }}
                  onDataFetched={(receita) => {
                    setFormData(prev => ({
                      ...prev,
                      name: receita.razaoSocial || prev.name,
                      tradeName: receita.nomeFantasia || prev.tradeName,
                      document: receita.formattedCnpj,
                      address: receita.enderecoCompleto || prev.address,
                      phone: receita.telefone || prev.phone,
                      email: receita.email || prev.email,
                      notes: prev.notes ? `${prev.notes}\n[CNAE: ${receita.cnaeCodigo} - ${receita.cnaeDescricao}]` : `CNAE: ${receita.cnaeCodigo} - ${receita.cnaeDescricao}. Situação: ${receita.situacaoCadastral}.`
                    }));
                  }}
                  label="CNPJ (Cadastro Fiscal) *"
                  required
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Observações</label>
                <input
                  type="text"
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
