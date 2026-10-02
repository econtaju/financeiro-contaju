import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Check, 
  X, 
  Users, 
  Shield, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Lock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { storage } from '../../services/storageService';

export const UsersPermissionsView: React.FC = () => {
  const [users, setUsers] = useState<User[]>(storage.getUsers());
  const currentUser = storage.getCurrentUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUserToReset, setSelectedUserToReset] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'OPERADOR',
    status: 'ATIVO',
    password: 'contaju123'
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
      password: formData.password || 'contaju123',
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
      details: `Criação do usuário ${newUser.name} com perfil ${newUser.role} e credencial de acesso.`
    });

    setIsModalOpen(false);
    setFormData({ name: '', email: '', role: 'OPERADOR', status: 'ATIVO', password: 'contaju123' });
    setToastMessage(`Usuário ${newUser.name} cadastrado com sucesso!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenResetModal = (user: User) => {
    setSelectedUserToReset(user);
    setNewPassword('contaju123');
    setIsResetModalOpen(true);
  };

  const handleSaveResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToReset || !newPassword.trim()) return;

    storage.updateUserPassword(selectedUserToReset.id, newPassword.trim());
    setUsers(storage.getUsers());

    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'ALTERACAO_SENHA',
      module: 'Usuários e Permissões',
      recordId: selectedUserToReset.id,
      details: `Senha de acesso redefinida para o colaborador ${selectedUserToReset.name}.`
    });

    setIsResetModalOpen(false);
    setSelectedUserToReset(null);
    setToastMessage(`Senha do usuário ${selectedUserToReset.name} redefinida com sucesso!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Informativo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

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
                Controle granular de privilégios, segregação de funções e gestão de credenciais de operadores.
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
            Logado como: <strong>{currentUser.name}</strong> ({currentUser.role})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-elevated)]/60 border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Nome do Usuário</th>
                <th className="py-3 px-4">E-mail Corporativo</th>
                <th className="py-3 px-4 text-center">Perfil / Papel</th>
                <th className="py-3 px-4 text-center">Credencial</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-[var(--surface-elevated)]/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center text-[10px] shrink-0 border border-amber-500/30">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span>{u.name}</span>
                        {u.id === currentUser.id && (
                          <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-900 dark:text-amber-300">
                            (Você)
                          </span>
                        )}
                      </div>
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
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                        : u.role === 'OPERADOR'
                        ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30'
                        : 'bg-slate-500/15 text-slate-800 dark:text-slate-300 border border-slate-500/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                      <Lock className="w-3 h-3 text-amber-500" />
                      <span>{u.password || 'contaju123'}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                      ✓ {u.status || 'ATIVO'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenResetModal(u)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-[var(--border-subtle)] hover:border-amber-500 hover:text-amber-500 text-[var(--text-secondary)] transition-all cursor-pointer inline-flex items-center gap-1"
                      title="Redefinir Senha do Usuário"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Redefinir Senha</span>
                    </button>
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
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
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
                  placeholder="usuario@contaju.com.br"
                  className="w-full rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Senha Inicial de Acesso</label>
                <input
                  type="text"
                  value={formData.password || 'contaju123'}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="contaju123"
                  className="w-full rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-primary)] font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                  Padrão sugerido: contaju123 (o colaborador poderá alterar após o acesso).
                </span>
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

      {/* Modal de Redefinição de Senha */}
      {isResetModalOpen && selectedUserToReset && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-[var(--border-subtle)] animate-in fade-in zoom-in-95">
            <div className="p-5 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Redefinir Senha</h3>
              </div>
              <button 
                onClick={() => setIsResetModalOpen(false)} 
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} className="p-5 space-y-4 text-xs">
              <div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Redefinindo senha para o usuário:
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                  {selectedUserToReset.name} ({selectedUserToReset.email})
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Nova Senha *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    className="w-full rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-3 py-2 pr-10 text-[var(--text-primary)] font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
