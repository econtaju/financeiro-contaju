import React, { useState, useRef } from 'react';
import { Network, Plus, Search, Layers, Edit2, CornerDownRight, FolderPlus, FilePlus2, CheckCircle2, Copy, Sparkles } from 'lucide-react';
import { ChartOfAccount, OperationNature, CashFlowCategory } from '../../types';
import { storage } from '../../services/storageService';
import { matchesSearch } from '../../utils/searchUtils';

export interface DRELineDefinition {
  id: string;
  label: string;
  dreLine: string;
  nature: OperationNature;
  multiplier: 1 | -1;
  cashFlowCategory: CashFlowCategory;
  defaultParentId?: string;
}

export const DRE_LINE_DEFINITIONS: DRELineDefinition[] = [
  {
    id: '1.1',
    label: '1.1 - Receita Bruta de Serviços / Vendas',
    dreLine: 'RECEITA_BRUTA',
    nature: 'RECEITA_SERVICO',
    multiplier: 1,
    cashFlowCategory: 'OPERACIONAL',
    defaultParentId: 'grp-1.1'
  },
  {
    id: '1.2',
    label: '1.2 - Deduções da Receita e Impostos sobre Faturamento',
    dreLine: 'DEDUCOES_TRIBUTOS',
    nature: 'DEDUCAO_RECEITA',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    defaultParentId: 'grp-1.2'
  },
  {
    id: '2.1',
    label: '2.1 / 3.0 - Custos dos Serviços Prestados (CSP / CPV)',
    dreLine: 'CUSTOS_SERVICOS',
    nature: 'CUSTO_SERVICO',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    defaultParentId: 'grp-2.1'
  },
  {
    id: '3.1',
    label: '3.1 / 4.1 - Despesas Operacionais com Pessoal & Encargos',
    dreLine: 'DESPESAS_PESSOAL',
    nature: 'DESPESA_PESSOAL',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    defaultParentId: 'grp-3.1'
  },
  {
    id: '3.2',
    label: '3.2 / 4.2 - Despesas Gerais e Administrativas',
    dreLine: 'DESPESAS_ADMINISTRATIVAS',
    nature: 'DESPESA_ADMINISTRATIVA',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    defaultParentId: 'grp-3.2'
  },
  {
    id: '3.3',
    label: '3.3 / 4.3 - Despesas Comerciais e Marketing',
    dreLine: 'DESPESAS_COMERCIAIS',
    nature: 'DESPESA_COMERCIAL',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    defaultParentId: 'grp-3.3'
  },
  {
    id: '4.1',
    label: '4.1 / 5.2 - Receitas Financeiras (Rendimentos / Juros Ativos)',
    dreLine: 'RECEITAS_FINANCEIRAS',
    nature: 'RECEITA_FINANCEIRA',
    multiplier: 1,
    cashFlowCategory: 'OPERACIONAL',
    defaultParentId: 'grp-4.1'
  },
  {
    id: '4.2',
    label: '4.2 / 5.1 - Despesas Financeiras & Tarifas Bancárias',
    dreLine: 'DESPESAS_FINANCEIRAS',
    nature: 'DESPESA_FINANCEIRA',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    defaultParentId: 'grp-4.2'
  },
  {
    id: '5.1',
    label: '5.1 / 6.0 - Tributos sobre o Lucro (IRPJ / CSLL)',
    dreLine: 'TRIBUTOS_LUCRO',
    nature: 'TRIBUTO_LUCRO',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    defaultParentId: 'grp-5'
  },
  {
    id: '6.1',
    label: '6.1 - Outras Receitas e Despesas Operacionais',
    dreLine: 'OUTRAS_OPERACIONAIS',
    nature: 'DESPESA_OPERACIONAL',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    defaultParentId: 'grp-3.2'
  },
  {
    id: 'NAO_APLICAVEL',
    label: 'Não Aplicável à DRE (Apenas Patrimonial / Balanço / Caixa)',
    dreLine: 'NAO_APLICAVEL',
    nature: 'CONTROLE_ESPECIFICO',
    multiplier: 1,
    cashFlowCategory: 'OPERACIONAL',
    defaultParentId: undefined
  }
];

/**
 * Converte qualquer texto digitado para o padrão contábil Title Case inteligente:
 * Primeira letra maiúscula e próximas minúsculas, mantendo conectivos em minúsculas
 * e siglas fiscais/bancárias consagradas em maiúsculas.
 */
export function formatAccountDescription(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  const LOWERCASE_WORDS = new Set([
    'de', 'da', 'do', 'dos', 'das',
    'e', 'em', 'para', 'com', 'por', 'ou',
    'na', 'no', 'nas', 'nos',
    'a', 'o', 'as', 'os', 'ao', 'aos',
    'sobre', 'sob', 'sem', 'ate', 'até'
  ]);

  const UPPERCASE_ACRONYMS: Record<string, string> = {
    'ti': 'TI',
    'rh': 'RH',
    'bpo': 'BPO',
    'pix': 'PIX',
    'erp': 'ERP',
    'crm': 'CRM',
    'mei': 'MEI',
    'me': 'ME',
    'epp': 'EPP',
    'ltda': 'LTDA',
    'sa': 'S/A',
    's/a': 'S/A',
    'eireli': 'EIRELI',
    'cnpj': 'CNPJ',
    'cpf': 'CPF',
    'irpf': 'IRPF',
    'irpj': 'IRPJ',
    'csll': 'CSLL',
    'pis': 'PIS',
    'cofins': 'COFINS',
    'icms': 'ICMS',
    'iss': 'ISS',
    'fgts': 'FGTS',
    'inss': 'INSS',
    'dre': 'DRE',
    'dfc': 'DFC',
    'dfp': 'DFP',
    'cpv': 'CPV',
    'csp': 'CSP',
    'iof': 'IOF',
    'ted': 'TED',
    'doc': 'DOC',
    'saas': 'SaaS',
    'aws': 'AWS',
    'gcp': 'GCP',
    'pj': 'PJ',
    'pf': 'PF'
  };

  const words = trimmed.split(/\s+/);
  const formatted = words.map((word, index) => {
    // Normalizar para checagem mantendo acentuações
    const cleanWord = word.toLowerCase().replace(/[^a-zA-Z0-9áàâãéèêíïóôõöúçñ/]/g, '');
    
    // 1. Sigla contábil ou fiscal em maiúsculas
    if (UPPERCASE_ACRONYMS[cleanWord]) {
      return word.replace(new RegExp(cleanWord, 'i'), UPPERCASE_ACRONYMS[cleanWord]);
    }

    // 2. Conectivos mantidos em minúsculas (a menos que seja a primeira palavra)
    if (index > 0 && LOWERCASE_WORDS.has(cleanWord)) {
      return word.toLowerCase();
    }

    // 3. Primeira maiúscula e próximas minúsculas
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return formatted.join(' ');
}

export function getNextChildCode(parentCode: string, allAccounts: ChartOfAccount[]): string {
  const cleanParent = parentCode.trim();
  const prefix = `${cleanParent}.`;
  
  const directChildren = allAccounts.filter(a => {
    if (!a.code.startsWith(prefix)) return false;
    const remainder = a.code.slice(prefix.length);
    return remainder.length > 0 && !remainder.includes('.');
  });

  if (directChildren.length === 0) {
    const parentSegments = cleanParent.split('.').length;
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
  mode: 'NEW' | 'CHILD' | 'SIBLING' | 'CLONE';
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
    nature: 'CREDORA' as any,
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
      nature: 'DESPESA_ADMINISTRATIVA' as any,
      isSynthetic: false,
      dreLineMapping: '3.2',
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
      dreLineMapping: parent.dreLineMapping || parent.dremap?.line || '3.2',
      cashFlowCategory: parent.cashFlowCategory || 'OPERACIONAL',
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
      dreLineMapping: sibling.dreLineMapping || sibling.dremap?.line || '3.2',
      cashFlowCategory: sibling.cashFlowCategory || 'OPERACIONAL',
      status: 'ATIVO'
    });
    setIsModalOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 80);
  };

  // Clonar linha existente herdando todos os vínculos contábeis da DRE, focando apenas na nova descrição
  const handleCloneAccount = (source: ChartOfAccount) => {
    const nextCode = getNextSiblingCode(source.code, accounts);
    setEditingAccount(null);
    setCreationContext({ mode: 'CLONE', referenceAccount: source });
    setFormData({
      code: nextCode,
      name: '',
      parentId: source.parentId,
      nature: source.nature,
      isSynthetic: source.isSynthetic ?? !source.isAnalytical,
      dreLineMapping: source.dreLineMapping || source.dremap?.line || '3.2',
      cashFlowCategory: source.cashFlowCategory || 'OPERACIONAL',
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

  const handleDRELineChange = (lineId: string) => {
    const def = DRE_LINE_DEFINITIONS.find(d => d.id === lineId);
    if (def) {
      setFormData(prev => ({
        ...prev,
        dreLineMapping: def.id,
        nature: def.nature,
        cashFlowCategory: def.cashFlowCategory,
        parentId: prev.parentId || def.defaultParentId || prev.parentId
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        dreLineMapping: lineId
      }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return;

    // Formatação em Title Case inteligente obrigatória no salvamento
    const formattedName = formatAccountDescription(formData.name.trim());

    const all = storage.getChartAccounts();
    const currentUser = storage.getCurrentUser();

    // Encontrar definição da DRE correspondente
    const dreDef = DRE_LINE_DEFINITIONS.find(d => d.id === formData.dreLineMapping);

    if (editingAccount) {
      const updated = all.map(a => a.id === editingAccount.id ? { 
        ...a, 
        ...formData,
        name: formattedName,
        nature: formData.nature || dreDef?.nature || a.nature,
        cashFlowCategory: formData.cashFlowCategory || dreDef?.cashFlowCategory || a.cashFlowCategory || 'OPERACIONAL',
        dremap: {
          include: formData.dreLineMapping !== 'NAO_APLICAVEL',
          line: dreDef?.dreLine || formData.dreLineMapping || 'OUTRAS_OPERACIONAIS',
          multiplier: dreDef?.multiplier ?? 1
        }
      } as ChartOfAccount : a);
      storage.saveChartAccounts(updated);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'EDICAO_PLANO_CONTAS',
        module: 'Plano de Contas',
        recordId: editingAccount.id,
        details: `Atualização da conta contábil ${formData.code} - ${formattedName}.`
      });
    } else {
      const isSynth = Boolean(formData.isSynthetic);
      const newAcc: ChartOfAccount = {
        id: `acc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: formData.code.trim(),
        name: formattedName,
        parentId: formData.parentId || dreDef?.defaultParentId || null,
        nature: (formData.nature as any) || dreDef?.nature || 'DESPESA_ADMINISTRATIVA',
        dremap: {
          include: formData.dreLineMapping !== 'NAO_APLICAVEL',
          line: dreDef?.dreLine || formData.dreLineMapping || 'OUTRAS_OPERACIONAIS',
          multiplier: dreDef?.multiplier ?? 1
        },
        cashFlowCategory: (formData.cashFlowCategory as any) || dreDef?.cashFlowCategory || 'OPERACIONAL',
        isAnalytical: !isSynth,
        isSynthetic: isSynth,
        isActive: true,
        dreLineMapping: formData.dreLineMapping || '3.2',
        status: 'ATIVO'
      };

      let updatedList = [...all, newAcc];

      // Se foi criada uma sublinha (CHILD) sob uma conta que era analítica, transformamos o pai em sintético
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
        details: `Criação da conta contábil ${newAcc.code} - ${newAcc.name} (Modo: ${creationContext.mode}).`
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
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Plano de Contas Gerencial & Mapeamento DRE</h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Estrutura hierárquica contábil vinculada à DRE. Crie linhas, sublinhas ou <strong>clone linhas existentes</strong> herdando todos os vínculos contábeis com auto-formatação.
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
                <th className="py-3 px-4">Natureza Contábil</th>
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
                        {/* Botão de Clonar Linha Abaixo */}
                        <button
                          type="button"
                          onClick={() => handleCloneAccount(acc)}
                          className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title={`Clonar linha com parâmetros contábeis e mapeamento DRE idênticos a ${acc.code}, mudando apenas a descrição`}
                        >
                          <Copy className="w-3 h-3 text-amber-500" />
                          <span>Clonar</span>
                        </button>

                        {/* Botão para criar Sublinha diretamente abaixo desta conta */}
                        <button
                          type="button"
                          onClick={() => handleCreateChild(acc)}
                          className="px-2 py-1 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title={`Criar sublinha filha sob ${acc.code} com numeração sequencial automática`}
                        >
                          <CornerDownRight className="w-3 h-3 text-amber-500" />
                          <span>+ Sublinha</span>
                        </button>

                        {/* Botão para criar Linha no mesmo nível */}
                        <button
                          type="button"
                          onClick={() => handleCreateSibling(acc)}
                          className="px-2 py-1 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
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

      {/* Modal de Criação / Edição / Clonagem */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-xl shadow-2xl max-w-lg w-full border border-[var(--border-subtle)]">
            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  {editingAccount ? (
                    <>
                      <Edit2 className="w-4 h-4 text-amber-500" />
                      <span>Editar Conta Contábil</span>
                    </>
                  ) : creationContext.mode === 'CLONE' ? (
                    <>
                      <Copy className="w-4 h-4 text-amber-500" />
                      <span>Clonar Conta Contábil</span>
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
                  {creationContext.mode === 'CLONE' && creationContext.referenceAccount
                    ? `Clonando estrutura de "${creationContext.referenceAccount.code} - ${creationContext.referenceAccount.name}". Apenas informe o novo nome.`
                    : creationContext.mode === 'CHILD' && creationContext.referenceAccount
                    ? `Inserindo subconta filha sob "${creationContext.referenceAccount.code} - ${creationContext.referenceAccount.name}"`
                    : creationContext.mode === 'SIBLING' && creationContext.referenceAccount
                    ? `Inserindo conta irmã no mesmo grupo de "${creationContext.referenceAccount.code} - ${creationContext.referenceAccount.name}"`
                    : 'Defina o código e o nome da conta no plano contábil com vínculo à DRE'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {/* Alerta de Modo Clonagem / Código Sequencial */}
              {!editingAccount && creationContext.mode === 'CLONE' && creationContext.referenceAccount && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-amber-700 dark:text-amber-300">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div className="text-[11px] leading-relaxed">
                    <strong>Linha clonada com sucesso!</strong> Código sequencial <strong>{formData.code}</strong> atribuído e vínculos com DRE (Linha {formData.dreLineMapping}) e Natureza herdados. Digite apenas a descrição da nova conta abaixo.
                  </div>
                </div>
              )}

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
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">Natureza Operacional</label>
                  <select
                    value={formData.nature || 'DESPESA_ADMINISTRATIVA'}
                    onChange={e => setFormData({ ...formData, nature: e.target.value as any })}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-input)] text-[var(--text-primary)] px-3 py-1.5 focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="RECEITA_SERVICO">Receita de Serviços (Credora)</option>
                    <option value="DEDUCAO_RECEITA">Dedução da Receita (Devedora)</option>
                    <option value="CUSTO_SERVICO">Custo dos Serviços (Devedora)</option>
                    <option value="DESPESA_PESSOAL">Despesa com Pessoal (Devedora)</option>
                    <option value="DESPESA_ADMINISTRATIVA">Despesa Administrativa (Devedora)</option>
                    <option value="DESPESA_COMERCIAL">Despesa Comercial (Devedora)</option>
                    <option value="DESPESA_OPERACIONAL">Outra Despesa Operacional (Devedora)</option>
                    <option value="RECEITA_FINANCEIRA">Receita Financeira (Credora)</option>
                    <option value="DESPESA_FINANCEIRA">Despesa Financeira (Devedora)</option>
                    <option value="TRIBUTO_LUCRO">Tributo sobre o Lucro (Devedora)</option>
                    <option value="CONTROLE_ESPECIFICO">Controle / Balanço Patrimonial</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-[var(--text-secondary)]">
                    Nome / Descrição da Conta *
                  </label>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    Auto-formatação (Title Case inteligente)
                  </span>
                </div>
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  placeholder="Ex: Licenças de Softwares e Serviços de TI"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  onBlur={e => {
                    const formatted = formatAccountDescription(e.target.value);
                    if (formatted && formatted !== e.target.value) {
                      setFormData(prev => ({ ...prev, name: formatted }));
                    }
                  }}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-input)] text-[var(--text-primary)] px-3 py-2 focus:border-amber-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                  Independentemente de como for digitado, formata automaticamente com inicial maiúscula, conectivos em minúsculas e siglas (TI, RH, PIX, ERP, etc.) em maiúsculas.
                </p>
              </div>

              <div>
                <label className="block font-medium text-[var(--text-secondary)] mb-1">
                  Padrão de Vínculo Contábil com a DRE Gerencial *
                </label>
                <select
                  value={formData.dreLineMapping || '3.2'}
                  onChange={e => handleDRELineChange(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-input)] text-[var(--text-primary)] px-3 py-2 font-medium focus:border-amber-500 focus:outline-hidden"
                >
                  {DRE_LINE_DEFINITIONS.map(def => (
                    <option key={def.id} value={def.id}>
                      {def.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                  Vincula a linha econômica correspondente na DRE e configura automaticamente a categoria de fluxo de caixa.
                </p>
              </div>

              <div className="flex items-center pt-2">
                <label className="flex items-center space-x-2 text-[var(--text-primary)] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.isSynthetic)}
                    onChange={e => setFormData({ ...formData, isSynthetic: e.target.checked })}
                    className="rounded border-[var(--border-subtle)] text-amber-500 focus:ring-amber-500"
                  />
                  <span>Conta Sintética de Agrupamento (Totalizadora, sem lançamentos diretos)</span>
                </label>
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
                  {editingAccount ? 'Salvar Alterações' : creationContext.mode === 'CLONE' ? 'Concluir Clonagem' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
