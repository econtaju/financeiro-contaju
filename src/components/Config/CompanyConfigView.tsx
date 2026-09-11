import React, { useState } from 'react';
import { Building, Save, CheckCircle2 } from 'lucide-react';
import { CompanyInfo } from '../../types';
import { storage } from '../../services/storageService';

export const CompanyConfigView: React.FC = () => {
  const [company, setCompany] = useState<CompanyInfo>(storage.getCompany());
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveCompany(company);
    const currentUser = storage.getCurrentUser();
    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'ALTERACAO_DADOS_EMPRESA',
      module: 'Configurações da Empresa',
      recordId: company.id,
      details: `Atualização dos dados cadastrais da empresa ${company.tradeName}.`
    });
    setSuccessMsg('Dados da empresa salvos com sucesso!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dados da Empresa / Escritório</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Configuração cadastral, regime tributário e dados fiscais do escritório contábil.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <form onSubmit={handleSave} className="space-y-4 text-xs max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Razão Social *</label>
              <input
                type="text"
                required
                value={company.legalName}
                onChange={e => setCompany({ ...company, legalName: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nome Fantasia *</label>
              <input
                type="text"
                required
                value={company.tradeName}
                onChange={e => setCompany({ ...company, tradeName: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">CNPJ *</label>
              <input
                type="text"
                required
                value={company.cnpj}
                onChange={e => setCompany({ ...company, cnpj: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Regime Tributário</label>
              <select
                value={company.taxRegime}
                onChange={e => setCompany({ ...company, taxRegime: e.target.value as any })}
                className="w-full rounded border border-slate-300 px-3 py-2 font-medium"
              >
                <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                <option value="LUCRO_REAL">Lucro Real</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">E-mail Financeiro Principal</label>
              <input
                type="email"
                value={company.email || ''}
                onChange={e => setCompany({ ...company, email: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Telefone de Contato</label>
              <input
                type="text"
                value={company.phone || ''}
                onChange={e => setCompany({ ...company, phone: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Endereço Completo</label>
            <input
              type="text"
              value={company.address || ''}
              onChange={e => setCompany({ ...company, address: e.target.value })}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
