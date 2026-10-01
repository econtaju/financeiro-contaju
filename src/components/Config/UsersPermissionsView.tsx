import React, { useState } from 'react';
import { ShieldCheck, Plus, Check, X, UserCheck, AlertCircle, Users, Mail, Shield } from 'lucide-react';
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
    { module: 'Conciliação Bancária (OFX / Extrato)', admin: true, gestor: true, operador: false, consulta: false },
    { module: 'DRE & Relatórios Gerenciais', admin: true, gestor: true, operador: false, consulta: true },
    { module: 'Fechamento e Trava de Competência', admin: true, gestor: true, operador: false, consulta: false },
    { module: 'Configurações Globais & Auditoria', admin: true, gestor: false, operador: false, consulta: false },
  ];

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      role: (formData.role as UserRole) || 'OPERADOR',
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--surface-card)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                Usuários e Perfis de Acesso (RBAC)
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Controle granular de privilégios, segregação de funções e gestão de operadores do escritório.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Grid de Usuários Ativos */}
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex justify-between items-center">
          <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <span>Colaboradores Cadastrados ({users.length})</span>
          </h2>
          <span className="text-[11px] text-[var(--text-secondary)]">
            Você está logado como: <strong>{currentUser.name}</strong> ({currentUser.role})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-elevated)]/60 border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Nome do Usuário</th>
                <th className="py-3 px-4">E-mail Corporativo</th>
                <th className="py-3 px-4 text-center">Perfil / Papel</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-[var(--surface-elevated)]/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center text-[10px]">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                      {u.id === currentUser.id && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-300">
                          (Você)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">
                    {u.email}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      u.role === 'ADMIN' 
                        ? 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30'
                        : u.role === 'GESTOR_FINANCEIRO'
                        ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                        : 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                      ✓ {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matriz de Permissões por Perfil */}
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex justify-between items-center">
          <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <span>Matriz de Permissões de Acesso por Perfil</span>
          </h2>
          <span className="text-[11px] text-[var(--text-secondary)]">
            Segregação de controle interno
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-elevated)]/60 border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Módulo Funcional</th>
                <th className="py-3 px-4 text-center">ADMIN</th>
                <th className="py-3 px-4 text-center">GESTOR</th>
                <th className="py-3 px-4 text-center">OPERADOR</th>
                <th className="py-3 px-4 text-center">CONSULTA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {permissionsMatrix.map((p, idx) => (
                <tr key={idx} className="hover:bg-[var(--surface-elevated)]/40 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-[var(--text-primary)]">
                    {p.module}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {p.admin ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-rose-500 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {p.gestor ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-rose-500 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {p.operador ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-rose-500 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {p.consulta ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-rose-500 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação de Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-[var(--border-subtle)] animate-in fade-in zoom-in-95">
            <div className="p-5 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Novo Usuário do Sistema</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: João da Silva"
                  className="w-full rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">E-mail Corporativo *</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@escritorio.com.br"
                  className="w-full rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Perfil de Acesso (RBAC) *</label>
                <select
                  value={formData.role || 'OPERADOR'}
                  onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-3 py-2 font-bold text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="ADMIN">ADMIN — Administrador (Controle Total & Fechamentos)</option>
                  <option value="GESTOR_FINANCEIRO">GESTOR — Gestor Financeiro (Sem Config Global)</option>
                  <option value="OPERADOR">OPERADOR — Operador (Emissão de Títulos e Baixas)</option>
                  <option value="CONSULTA">CONSULTA — Somente Leitura / Auditor</option>
                </select>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-all cursor-pointer"
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
