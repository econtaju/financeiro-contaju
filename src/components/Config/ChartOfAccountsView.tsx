import React, { useState, useRef } from 'react';
import { Network, Plus, Search, Layers, Edit2, CornerDownRight, FolderPlus, FilePlus2, CheckCircle2 } from 'lucide-react';
import { ChartOfAccount } from '../../types';
import { storage } from '../../services/storageService';
import { matchesSearch } from '../../utils/searchUtils';

export function getNextChildCode(parentCode: string, allAccounts: ChartOfAccount[]): string {
  const cleanParent = parentCode.trim();
  const prefix = `${cleanParent}.`;
  
  // Buscar filhos diretos: contas cujo código começa com "prefix" e não têm outro ponto após "prefix"
  const directChildren = allAccounts.filter(a => {
    if (!a.code.startsWith(prefix)) return false;
    const remainder = a.code.slice(prefix.length);
    return remainder.length > 0 && !remainder.includes('.');
  });

  if (directChildren.length === 0) {
    const parentSegments = cleanParent.split('.').length;
    // Se for grupo raiz (ex: "4"), filhos normalmente são "4.1". Se for nível 2 ou mais, "4.1.01"
    return parentSegments === 1 ? `${cleanParent}.1` : `${cleanParent}.01`;
  }

  let maxNum = 0;
  let padLength = 2;

  for (const child of directChildren) {
    const remainder = child.code.slice(prefix.length);
    const parsed = parseInt(remainder, 10);
    if (!isNaN(parsed)) {
      if (parsed > maxNum) maxNum = parsed;
      if (remainder.length > padLength) padLength = remainder.length;
    }
  }

  const nextNum = maxNum + 1;
  const nextSuffix = String(nextNum).padStart(padLength, '0');
  return `${cleanParent}.${nextSuffix}`;
}

export function getNextSiblingCode(siblingCode: string, allAccounts: ChartOfAccount[]): string {
  const cleanCode = siblingCode.trim();
  const lastDotIndex = cleanCode.lastIndexOf('.');

  if (lastDotIndex === -1) {
    // Raiz (sem ponto, ex: 1, 2, 3...)
    const roots = allAccounts.filter(a => !a.code.includes('.'));
    let maxNum = 0;
    for (const r of roots) {
      const parsed = parseInt(r.code, 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    }
    return String(maxNum + 1);
  }

  const parentCode = cleanCode.slice(0, lastDotIndex);
  return getNextChildCode(parentCode, allAccounts);
}

interface ModalCreationContext {
  mode: 'NEW' | 'CHILD' | 'SIBLING';
  referenceAccount?: ChartOfAccount;
}

export const ChartOfAccountsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  const [creationContext, setCreationContext] = useState<ModalCreationContext>({ mode: 'NEW' });
  const nameInputRef = useRef<HTMLInputElement>(null);

  const accounts = storage.getChartAccounts().sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

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
    setCreationContext({ mode: 'NEW' });
    setFormData({
      code: '',
      name: '',
      nature: 'DEVEDORA',
      isSynthetic: false,
      dreLineMapping: '6.1',
      status: 'ATIVO'
    });
    setIsModalOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 80);
  };

  const handleCreateChild = (parent: ChartOfAccount) => {
    const nextCode = getNextChildCode(parent.code, accounts);
    setEditingAccount(null);
    setCreationContext({ mode: 'CHILD', referenceAccount: parent });
    setFormData({
      code: nextCode,
      name: '',
      parentId: parent.id,
      nature: parent.nature,
      isSynthetic: false,
      dreLineMapping: parent.dreLineMapping || parent.dremap?.line || '6.1',
      status: 'ATIVO'
    });
    setIsModalOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 80);
  };

  const handleCreateSibling = (sibling: ChartOfAccount) => {
    const nextCode = getNextSiblingCode(sibling.code, accounts);
    setEditingAccount(null);
    setCreationContext({ mode: 'SIBLING', referenceAccount: sibling });
    setFormData({
      code: nextCode,
      name: '',
      parentId: sibling.parentId,
      nature: sibling.nature,
      isSynthetic: false,
      dreLineMapping: sibling.dreLineMapping || sibling.dremap?.line || '6.1',
      status: 'ATIVO'
    });
    setIsModalOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 80);
  };

  const handleEdit = (a: ChartOfAccount) => {
    setEditingAccount(a);
    setCreationContext({ mode: 'NEW', referenceAccount: a });
    setFormData(a);
    setIsModalOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 80);
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
        id: `acc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: formData.code.trim(),
        name: formData.name.trim(),
        parentId: formData.parentId || null,
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

      let updatedList = [...all, newAcc];

      // Se foi criada uma sublinha (CHILD) sob uma conta que era analítica, transformamos a conta pai em sintética
      if (creationContext.mode === 'CHILD' && creationContext.referenceAccount) {
        const parentId = creationContext.referenceAccount.id;
        updatedList = updatedList.map(a => {
          if (a.id === parentId && !a.isSynthetic) {
            return {
              ...a,
              isSynthetic: true,
              isAnalytical: false
            };
          }
          return a;
        });
      }

      storage.saveChartAccounts(updatedList);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CRIACAO_PLANO_CONTAS',
        module: 'Plano de Contas',
        recordId: newAcc.id,
        details: `Criação da conta contábil ${newAcc.code} - ${newAcc.name} (${creationContext.mode}).`
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--surface-card)] p-5 rounded-xl border border-[var(--border-subtle)] shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <Network className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Plano de Contas Gerencial</h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Estrutura hierárquica contábil. Crie novas linhas (mesmo nível) ou sublinhas (subnível) diretamente na tabela com numeração automática contínua.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Conta Raiz
        </button>
      </div>

      {/* Search */}
      <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-2xs flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código ou descrição (sem restrição de acentos ou traços)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-input)] text-[var(--text-primary)] focus:outline-hidden focus:border-amber-500"
          />
        </div>
        <span className="text-xs text-[var(--text-secondary)]">{filtered.length} contas cadastradas</span>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Código Estrutural</th>
                <th className="py-3 px-4">Descrição da Conta</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Natureza</th>
                <th className="py-3 px-4">Mapeamento DRE</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map(acc => {
                const isSynthetic = acc.isSynthetic ?? !acc.isAnalytical;
                const level = acc.code.split('.').length;

                return (
                  <tr key={acc.id} className={isSynthetic ? 'bg-[var(--surface-elevated)]/60 font-bold text-[var(--text-primary)]' : 'hover:bg-[var(--surface-elevated)] text-[var(--text-primary)]'}>
                    <td className="py-2.5 px-4 font-mono text-[var(--text-primary)] font-bold">
                      {acc.code}
                    </td>
                    <td className="py-2.5 px-4" style={{ paddingLeft: `${Math.max(16, level * 16)}px` }}>
                      <div className="flex items-center gap-1.5">
                        {level > 1 && <span className="text-slate-400 font-mono text-[10px]">└</span>}
                        <span>{acc.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        isSynthetic ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}>
                        {isSynthetic ? 'Sintética (Grupo)' : 'Analítica (Lançamento)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[var(--text-secondary)]">
                      {acc.nature}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[var(--text-primary)] font-medium">
                      Linha {acc.dreLineMapping || acc.dremap?.line || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {acc.status || (acc.isActive ? 'ATIVO' : 'INATIVO')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botão para criar Sublinha diretamente abaixo desta conta */}
                        <button
                          type="button"
                          onClick={() => handleCreateChild(acc)}
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title={`Criar sublinha filha sob ${acc.code} com numeração sequencial automática`}
                        >
                          <CornerDownRight className="w-3 h-3 text-amber-500" />
                          <span>+ Sublinha</span>
                        </button>

                        {/* Botão para criar Linha no mesmo nível */}
                        <button
                          type="button"
                          onClick={() => handleCreateSibling(acc)}
                          className="px-2 py-1 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title={`Criar nova linha no mesmo nível de ${acc.code} com numeração sequencial automática`}
                        >
                          <Plus className="w-3 h-3 text-slate-400" />
                          <span>+ Linha</span>
                        </button>

                        {/* Botão de Edição */}
                        <button
                          type="button"
                          onClick={() => handleEdit(acc)}
                          className="p-1 text-[var(--text-secondary)] hover:text-amber-400 hover:bg-[var(--surface-elevated)] rounded cursor-pointer"
                          title="Editar detalhes desta conta"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
          <div className="bg-[var(--surface-card)] rounded-xl shadow-2xl max-w-md w-full border border-[var(--border-subtle)]">
            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  {editingAccount ? (
                    <>
                      <Edit2 className="w-4 h-4 text-amber-500" />
                      <span>Editar Conta Contábil</span>
                    </>
                  ) : creationContext.mode === 'CHILD' ? (
                    <>
                      <CornerDownRight className="w-4 h-4 text-amber-500" />
                      <span>Nova Sublinha Contábil</span>
                    </>
                  ) : creationContext.mode === 'SIBLING' ? (
                    <>
                      <Plus className="w-4 h-4 text-amber-500" />
                      <span>Nova Linha Contábil</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-amber-500" />
                      <span>Nova Conta Contábil</span>
                    </>
                  )}
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  {creationContext.mode === 'CHILD' && creationContext.referenceAccount
                    ? `Inserindo subconta filha sob "${creationContext.referenceAccount.code} - ${creationContext.referenceAccount.name}"`
                    : creationContext.mode === 'SIBLING' && creationContext.referenceAccount
                    ? `Inserindo conta irmã no mesmo grupo de "${creationContext.referenceAccount.code} - ${creationContext.referenceAccount.name}"`
                    : 'Defina o código e o nome da conta no plano contábil'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3.5 text-xs">
              {/* Alerta de Código Sequencial Gerado */}
              {!editingAccount && (creationContext.mode === 'CHILD' || creationContext.mode === 'SIBLING') && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-amber-600 dark:text-amber-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    Código <strong>{formData.code}</strong> gerado automaticamente na posição correta da hierarquia. Apenas digite a descrição abaixo!
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">Código Estrutural *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 4.1.05"
                    value={formData.code || ''}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-input)] text-[var(--text-primary)] px-3 py-1.5 font-mono font-bold focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">Natureza</label>
                  <select
                    value={formData.nature || 'DEVEDORA'}
                    onChange={e => setFormData({ ...formData, nature: e.target.value as any })}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-input)] text-[var(--text-primary)] px-3 py-1.5 focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="CREDORA">Credora (Receitas/Passivo)</option>
                    <option value="DEVEDORA">Devedora (Despesas/Ativo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--text-secondary)] mb-1">Nome / Descrição da Conta *</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  placeholder="Ex: Softwares e Ferramentas em Nuvem"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-input)] text-[var(--text-primary)] px-3 py-1.5 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">Mapeamento Linha DRE</label>
                  <input
                    type="text"
                    placeholder="Ex: 6.1"
                    value={formData.dreLineMapping || ''}
                    onChange={e => setFormData({ ...formData, dreLineMapping: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-input)] text-[var(--text-primary)] px-3 py-1.5 font-mono focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center space-x-2 text-[var(--text-primary)] font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isSynthetic)}
                      onChange={e => setFormData({ ...formData, isSynthetic: e.target.checked })}
                      className="rounded border-[var(--border-subtle)] text-amber-500 focus:ring-amber-500"
                    />
                    <span>Conta Sintética (Grupo)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  {editingAccount ? 'Salvar Alterações' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
