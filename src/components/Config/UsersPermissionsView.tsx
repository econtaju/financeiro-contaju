import React, { useState } from 'react';
import { ShieldCheck, Plus, Check, X, UserCheck, AlertCircle } from 'lucide-react';
import { User, UserRole } from '../../types';
import { storage } from '../../services/storageService';

export const UsersPermissionsView: React.FC = () => {
  const [users, setUsers] = useState<User[]>(storage.getUsers());
  const currentUser = storage.getCurrentUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'OPERADOR',
    status: 'ATIVO'
  });

  const permissionsMatrix = [
    { module: 'Dashboard & Indicadores', admin: true, gestor: true, operador: true, consulta: true },
    { module: 'Visualização de Contratos & Clientes', admin: true, gestor: true, operador: true, consulta: true },
    { module: 'Cadastro e Edição de Contratos/Vendas', admin: true, gestor: true, operador: true, consulta: false },
    { module: 'Emissão de Títulos (Pagar / Receber)', admin: true, gestor: true, operador: true, consulta: false },
    { module: 'Baixa e Liquidação de Títulos', admin: true, gestor: true, operador: true, consulta: false },
    { module: 'Transferências entre Contas Bancárias', admin: true, gestor: true, operador: false, consulta: false },
    { module: 'Conciliação Bancária (OFX)', admin: true, gestor: true, operador: false, consulta: false },
    { module: 'DRE & Relatórios Gerenciais', admin: true, gestor: true, operador: false, consulta: true },
    { module: 'Fechamento e Trava de Período', admin: true, gestor: true, operador: false, consulta: false },
    { module: 'Configurações Globais & Auditoria', admin: true, gestor: false, operador: false, consulta: false },
  ];

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      role: formData.role as UserRole || 'OPERADOR',
      status: 'ATIVO',
      createdAt: new Date().toISOString()
    };

    const updated = [...users, newUser];
    storage.saveUsers(updated);
    setUsers(updated);

    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CRIACAO_USUARIO',
      module: 'Usuários e Permissões',
      recordId: newUser.id,
      details: `Criação do usuário ${newUser.name} com papel ${newUser.role}.`
    });

    setIsModalOpen(false);
    setFormData({ name: '', email: '', role: 'OPERADOR', status: 'ATIVO' });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Usuários e Perfis de Acesso (RBAC)</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Gestão de usuários, papéis de segurança e matriz de controle de permissões por módulo.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 transition-colors shadow-2xs flex items-center"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Usuário
        </button>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Usuários Cadastrados ({users.length})</h2>
          <span className="text-[11px] text-slate-700">Você está logado como: <strong className="text-indigo-900">{currentUser.name} ({currentUser.role})</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Papel (Perfil)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900 flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : u.role === 'GESTOR_FINANCEIRO'
                        ? 'bg-indigo-100 text-indigo-800'
                        : u.role === 'OPERADOR'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        storage.setCurrentUser(u);
                        window.location.reload();
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-[11px]"
                    >
                      Alternar para este perfil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Matriz de Permissões por Perfil de Acesso
          </h2>
          <p className="text-[11px] text-slate-700 mt-0.5">
            Mapeamento formal dos privilégios de execução no sistema.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Funcionalidade / Módulo</th>
                <th className="py-3 px-4 text-center">ADMIN</th>
                <th className="py-3 px-4 text-center">GESTOR FINANCEIRO</th>
                <th className="py-3 px-4 text-center">OPERADOR</th>
                <th className="py-3 px-4 text-center">CONSULTA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionsMatrix.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-medium text-slate-800">{p.module}</td>
                  
                  <td className="py-2.5 px-4 text-center">
                    {p.admin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-rose-500 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {p.gestor ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-rose-500 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {p.operador ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-rose-500 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {p.consulta ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-rose-500 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-semibold text-slate-900">Novo Usuário</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">E-mail Corporativo *</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Perfil de Acesso</label>
                <select
                  value={formData.role || 'OPERADOR'}
                  onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 font-medium"
                >
                  <option value="ADMIN">Administrador (Controle Total)</option>
                  <option value="GESTOR_FINANCEIRO">Gestor Financeiro (Sem Config Global)</option>
                  <option value="OPERADOR">Operador (Emissão e Baixas)</option>
                  <option value="CONSULTA">Somente Consulta / Auditor</option>
                </select>
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
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
