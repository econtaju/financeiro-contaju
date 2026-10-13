import { ChartAccount, OperationNature, CashFlowCategory } from '../types';

export interface StrategicGroupDefinition {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  nature: OperationNature;
  dreLine: string;
  dreLabel: string;
  multiplier: 1 | -1;
  cashFlowCategory: CashFlowCategory;
  badgeColor: string;
  rootSection: 'RECEITA' | 'CUSTO' | 'DESPESA' | 'FINANCEIRO' | 'TRIBUTO' | 'ATIVO' | 'PASSIVO' | 'CONTROLE';
  prefix: string;
}

export const STRATEGIC_DRE_GROUPS: StrategicGroupDefinition[] = [
  // 1. RECEITAS E DEDUÇÕES
  {
    id: 'grp-1.1',
    code: '1.1',
    name: 'Receitas de Serviços e Vendas',
    parentId: 'grp-1',
    nature: 'RECEITA_SERVICO',
    dreLine: 'RECEITA_BRUTA',
    dreLabel: '1.1 - Receita Bruta de Serviços',
    multiplier: 1,
    cashFlowCategory: 'OPERACIONAL',
    badgeColor: 'emerald',
    rootSection: 'RECEITA',
    prefix: '1.1'
  },
  {
    id: 'grp-1.2',
    code: '1.2',
    name: 'Deduções da Receita e Impostos sobre Faturamento',
    parentId: 'grp-1',
    nature: 'DEDUCAO_RECEITA',
    dreLine: 'DEDUCOES_TRIBUTOS',
    dreLabel: '1.2 - Deduções e Impostos sobre Faturamento',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    badgeColor: 'rose',
    rootSection: 'RECEITA',
    prefix: '1.2'
  },

  // 2. CUSTOS DOS SERVIÇOS PRESTADOS
  {
    id: 'grp-2.1',
    code: '2.1',
    name: 'Custos dos Serviços Prestados (CSP / CPV)',
    parentId: 'grp-2',
    nature: 'CUSTO_SERVICO',
    dreLine: 'CUSTOS_SERVICOS',
    dreLabel: '2.1 - Custos dos Serviços Prestados',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    badgeColor: 'amber',
    rootSection: 'CUSTO',
    prefix: '2.1'
  },

  // 3. DESPESAS OPERACIONAIS
  {
    id: 'grp-3.1',
    code: '3.1',
    name: 'Despesas com Pessoal & Encargos',
    parentId: 'grp-3',
    nature: 'DESPESA_PESSOAL',
    dreLine: 'DESPESAS_PESSOAL',
    dreLabel: '3.1 - Despesas com Pessoal & Encargos',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    badgeColor: 'purple',
    rootSection: 'DESPESA',
    prefix: '3.1'
  },
  {
    id: 'grp-3.2',
    code: '3.2',
    name: 'Despesas Administrativas',
    parentId: 'grp-3',
    nature: 'DESPESA_ADMINISTRATIVA',
    dreLine: 'DESPESAS_ADMINISTRATIVAS',
    dreLabel: '3.2 - Despesas Administrativas',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    badgeColor: 'blue',
    rootSection: 'DESPESA',
    prefix: '3.2'
  },
  {
    id: 'grp-3.3',
    code: '3.3',
    name: 'Despesas Comerciais e Marketing',
    parentId: 'grp-3',
    nature: 'DESPESA_COMERCIAL',
    dreLine: 'DESPESAS_COMERCIAIS',
    dreLabel: '3.3 - Despesas Comerciais e Marketing',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    badgeColor: 'orange',
    rootSection: 'DESPESA',
    prefix: '3.3'
  },
  {
    id: 'grp-3.4',
    code: '3.4',
    name: 'Despesas Gerais Operacionais',
    parentId: 'grp-3',
    nature: 'DESPESA_OPERACIONAL',
    dreLine: 'DESPESAS_GERAIS',
    dreLabel: '3.4 - Despesas Gerais Operacionais',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    badgeColor: 'indigo',
    rootSection: 'DESPESA',
    prefix: '3.4'
  },

  // 4. RESULTADO FINANCEIRO
  {
    id: 'grp-4.1',
    code: '4.1',
    name: 'Receitas Financeiras (Juros / Rendimentos)',
    parentId: 'grp-4',
    nature: 'RECEITA_FINANCEIRA',
    dreLine: 'RECEITAS_FINANCEIRAS',
    dreLabel: '4.1 - Receitas Financeiras',
    multiplier: 1,
    cashFlowCategory: 'OPERACIONAL',
    badgeColor: 'teal',
    rootSection: 'FINANCEIRO',
    prefix: '4.1'
  },
  {
    id: 'grp-4.2',
    code: '4.2',
    name: 'Despesas Financeiras & Tarifas Bancárias',
    parentId: 'grp-4',
    nature: 'DESPESA_FINANCEIRA',
    dreLine: 'DESPESAS_FINANCEIRAS',
    dreLabel: '4.2 - Despesas Financeiras & Tarifas',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    badgeColor: 'red',
    rootSection: 'FINANCEIRO',
    prefix: '4.2'
  },

  // 5. TRIBUTOS SOBRE O LUCRO
  {
    id: 'grp-5',
    code: '5.1',
    name: 'Tributos sobre o Lucro (IRPJ / CSLL)',
    parentId: null,
    nature: 'TRIBUTO_LUCRO',
    dreLine: 'TRIBUTOS_LUCRO',
    dreLabel: '5.1 - Tributos sobre o Lucro (IRPJ / CSLL)',
    multiplier: -1,
    cashFlowCategory: 'OPERACIONAL',
    badgeColor: 'pink',
    rootSection: 'TRIBUTO',
    prefix: '5.1'
  },

  // 6. ATIVOS E INVESTIMENTOS
  {
    id: 'grp-6',
    code: '6.1',
    name: 'Investimentos, Imobilizado e Ativos',
    parentId: null,
    nature: 'INVESTIMENTO_ATIVO',
    dreLine: 'NAO_APLICAVEL',
    dreLabel: '6.1 - Ativos & Investimentos (Balanço Patrimonial)',
    multiplier: 1,
    cashFlowCategory: 'INVESTIMENTO',
    badgeColor: 'cyan',
    rootSection: 'ATIVO',
    prefix: '6.1'
  },

  // 7. FINANCIAMENTOS E SÓCIOS
  {
    id: 'grp-7',
    code: '7.1',
    name: 'Financiamentos, Empréstimos e Sócios',
    parentId: null,
    nature: 'FINANCIAMENTO_SOCIO',
    dreLine: 'NAO_APLICAVEL',
    dreLabel: '7.1 - Financiamentos & Sócios (Balanço Patrimonial)',
    multiplier: 1,
    cashFlowCategory: 'FINANCIAMENTO',
    badgeColor: 'violet',
    rootSection: 'PASSIVO',
    prefix: '7.1'
  },

  // 8. CONTROLES ESPECÍFICOS
  {
    id: 'grp-8',
    code: '8.1',
    name: 'Controles Específicos e Transitórias',
    parentId: null,
    nature: 'CONTROLE_ESPECIFICO',
    dreLine: 'NAO_APLICAVEL',
    dreLabel: '8.1 - Controles Específicos & Transitórias',
    multiplier: 1,
    cashFlowCategory: 'TRANSFERENCIA_INTERNA',
    badgeColor: 'slate',
    rootSection: 'CONTROLE',
    prefix: '8.1'
  }
];

/**
 * Retorna o próximo código sequencial para uma conta filha dentro do grupo pai.
 */
export function calculateNextChildCode(parentPrefix: string, accounts: ChartAccount[]): string {
  const cleanPrefix = parentPrefix.trim();
  const prefixDot = `${cleanPrefix}.`;
  
  // Buscar todas as contas que começam com este prefixo direto
  const siblings = accounts.filter(a => {
    if (!a.code.startsWith(prefixDot)) return false;
    const remainder = a.code.slice(prefixDot.length);
    // Filtrar apenas descendentes diretos (sem outros pontos)
    return remainder.length > 0 && !remainder.includes('.');
  });

  if (siblings.length === 0) {
    return `${cleanPrefix}.01`;
  }

  let maxNum = 0;
  for (const s of siblings) {
    const remainder = s.code.slice(prefixDot.length);
    const num = parseInt(remainder, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  const suffix = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
  return `${cleanPrefix}.${suffix}`;
}

/**
 * Encontra a definição estratégica DRE a partir de um código ou parentId.
 */
export function findStrategicGroupByAccount(account: ChartAccount): StrategicGroupDefinition | undefined {
  if (account.parentId) {
    const foundByParent = STRATEGIC_DRE_GROUPS.find(g => g.id === account.parentId);
    if (foundByParent) return foundByParent;
  }

  // Tenta casar pelo código estrutural
  for (const group of STRATEGIC_DRE_GROUPS) {
    if (account.code.startsWith(group.prefix + '.')) {
      return group;
    }
  }

  // Tenta casar pela linha DRE
  if (account.dreLineMapping) {
    const foundByDre = STRATEGIC_DRE_GROUPS.find(g => g.dreLine === account.dreLineMapping || g.code === account.dreLineMapping);
    if (foundByDre) return foundByDre;
  }

  // Tenta casar pela natureza
  return STRATEGIC_DRE_GROUPS.find(g => g.nature === account.nature);
}

/**
 * Renumera sequencialmente todas as filhas diretas de um determinado grupo / prefixo.
 * Mantém a ordem em que as contas aparecem no array de entrada.
 */
export function renumberDirectChildren(
  accounts: ChartAccount[], 
  parentPrefix: string, 
  parentId?: string | null
): ChartAccount[] {
  const prefixDot = `${parentPrefix}.`;
  
  // Filtrar as contas que pertencem a este grupo
  const targetAccounts = accounts.filter(a => {
    if (parentId && a.parentId === parentId) return true;
    if (a.code.startsWith(prefixDot)) {
      const rem = a.code.slice(prefixDot.length);
      return !rem.includes('.');
    }
    return false;
  });

  if (targetAccounts.length === 0) return accounts;

  // Mapa de nova numeração
  const updatedCodeMap = new Map<string, string>();
  targetAccounts.forEach((acc, index) => {
    const num = index + 1;
    const suffix = num < 10 ? `0${num}` : `${num}`;
    const newCode = `${parentPrefix}.${suffix}`;
    updatedCodeMap.set(acc.id, newCode);
  });

  return accounts.map(a => {
    if (updatedCodeMap.has(a.id)) {
      return {
        ...a,
        code: updatedCodeMap.get(a.id)!
      };
    }
    return a;
  });
}

/**
 * Reordena uma conta arrastada (source) para antes ou depois de outra conta (target),
 * ou para dentro de um novo grupo pai, e renumera sequencialmente a ordem inteira.
 */
export function reorderAndRenumberAccounts(
  accounts: ChartAccount[],
  sourceId: string,
  targetId: string,
  placement: 'BEFORE' | 'AFTER' = 'BEFORE'
): ChartAccount[] {
  const sourceIndex = accounts.findIndex(a => a.id === sourceId);
  const targetIndex = accounts.findIndex(a => a.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceId === targetId) {
    return accounts;
  }

  const sourceAccount = accounts[sourceIndex];
  const targetAccount = accounts[targetIndex];

  // Determinar o grupo pai de destino
  let destinationParentId = targetAccount.parentId;
  let destinationPrefix = '';

  // Se o target for uma conta sintética de grupo (ex: grp-3.2 com code 3.2)
  if (targetAccount.isSynthetic || !targetAccount.isAnalytical) {
    destinationParentId = targetAccount.id;
    destinationPrefix = targetAccount.code;
  } else {
    // É uma conta analítica irmã
    const targetGroup = findStrategicGroupByAccount(targetAccount);
    destinationPrefix = targetGroup ? targetGroup.prefix : targetAccount.code.substring(0, targetAccount.code.lastIndexOf('.'));
  }

  // Atualizar a conta fonte com os dados do novo grupo de destino
  const destinationGroup = STRATEGIC_DRE_GROUPS.find(g => g.id === destinationParentId || g.prefix === destinationPrefix);
  
  const updatedSourceAccount: ChartAccount = {
    ...sourceAccount,
    parentId: destinationParentId || (destinationGroup ? destinationGroup.id : sourceAccount.parentId),
    nature: destinationGroup ? destinationGroup.nature : sourceAccount.nature,
    cashFlowCategory: destinationGroup ? destinationGroup.cashFlowCategory : sourceAccount.cashFlowCategory,
    dreLineMapping: destinationGroup ? destinationGroup.dreLine : sourceAccount.dreLineMapping,
    dremap: {
      include: destinationGroup ? destinationGroup.dreLine !== 'NAO_APLICAVEL' : true,
      line: destinationGroup ? destinationGroup.dreLine : (sourceAccount.dremap?.line || 'OUTRAS_OPERACIONAIS'),
      multiplier: destinationGroup ? destinationGroup.multiplier : 1
    }
  };

  // Remover a conta fonte e inseri-la na nova posição
  const listWithoutSource = accounts.filter(a => a.id !== sourceId);
  const adjustedTargetIndex = listWithoutSource.findIndex(a => a.id === targetId);

  const insertIndex = placement === 'BEFORE' 
    ? adjustedTargetIndex 
    : adjustedTargetIndex + 1;

  const reorderedList = [
    ...listWithoutSource.slice(0, insertIndex),
    updatedSourceAccount,
    ...listWithoutSource.slice(insertIndex)
  ];

  // Agora renumerar o grupo de destino
  let result = renumberDirectChildren(reorderedList, destinationPrefix, destinationParentId);

  // Se a conta mudou de grupo, renumerar também o grupo de origem para evitar lacunas
  const sourceGroup = findStrategicGroupByAccount(sourceAccount);
  if (sourceGroup && sourceGroup.prefix !== destinationPrefix) {
    result = renumberDirectChildren(result, sourceGroup.prefix, sourceAccount.parentId);
  }

  return result;
}

/**
 * Move uma conta diretamente para um novo grupo pai escolhido no menu suspenso,
 * recalculando seu código, natureza e mapeamento DRE automaticamente.
 */
export function moveAccountToStrategicGroup(
  accounts: ChartAccount[],
  accountId: string,
  targetGroupIdOrPrefix: string
): { updatedAccounts: ChartAccount[]; newAccountCode: string } {
  const targetGroup = STRATEGIC_DRE_GROUPS.find(
    g => g.id === targetGroupIdOrPrefix || g.prefix === targetGroupIdOrPrefix || g.code === targetGroupIdOrPrefix
  );

  if (!targetGroup) {
    return { updatedAccounts: accounts, newAccountCode: '' };
  }

  const account = accounts.find(a => a.id === accountId);
  if (!account) {
    return { updatedAccounts: accounts, newAccountCode: '' };
  }

  const oldGroup = findStrategicGroupByAccount(account);

  // Calcular novo código sequencial para este grupo
  const newCode = calculateNextChildCode(targetGroup.prefix, accounts);

  // Atualizar a conta
  const updatedAccount: ChartAccount = {
    ...account,
    code: newCode,
    parentId: targetGroup.id,
    nature: targetGroup.nature,
    cashFlowCategory: targetGroup.cashFlowCategory,
    dreLineMapping: targetGroup.dreLine,
    dremap: {
      include: targetGroup.dreLine !== 'NAO_APLICAVEL',
      line: targetGroup.dreLine,
      multiplier: targetGroup.multiplier
    }
  };

  let updatedList = accounts.map(a => a.id === accountId ? updatedAccount : a);

  // Renumerar ambos os grupos para garantir sequência perfeita
  updatedList = renumberDirectChildren(updatedList, targetGroup.prefix, targetGroup.id);
  if (oldGroup && oldGroup.prefix !== targetGroup.prefix) {
    updatedList = renumberDirectChildren(updatedList, oldGroup.prefix, account.parentId);
  }

  // Retornar a conta com o código final
  const finalAcc = updatedList.find(a => a.id === accountId);

  return {
    updatedAccounts: updatedList,
    newAccountCode: finalAcc?.code || newCode
  };
}

/**
 * Move uma conta 1 posição acima ou abaixo dentro do mesmo grupo e renumera na hora.
 */
export function moveAccountOneStep(
  accounts: ChartAccount[],
  accountId: string,
  direction: 'UP' | 'DOWN'
): ChartAccount[] {
  const account = accounts.find(a => a.id === accountId);
  if (!account) return accounts;

  const group = findStrategicGroupByAccount(account);
  const prefix = group ? group.prefix : account.code.substring(0, account.code.lastIndexOf('.'));

  // Obter irmãos deste mesmo grupo na ordem atual
  const prefixDot = `${prefix}.`;
  const siblingIndices = accounts
    .map((a, idx) => ({ account: a, index: idx }))
    .filter(item => {
      if (account.parentId && item.account.parentId === account.parentId) return true;
      return item.account.code.startsWith(prefixDot);
    });

  const currentPos = siblingIndices.findIndex(item => item.account.id === accountId);
  if (currentPos === -1) return accounts;

  const targetPos = direction === 'UP' ? currentPos - 1 : currentPos + 1;
  if (targetPos < 0 || targetPos >= siblingIndices.length) {
    // Já está no topo ou no final do grupo
    return accounts;
  }

  const targetAccountId = siblingIndices[targetPos].account.id;
  const placement = direction === 'UP' ? 'BEFORE' : 'AFTER';

  return reorderAndRenumberAccounts(accounts, accountId, targetAccountId, placement);
}

/**
 * Renumera todo o plano de contas alinhando-o rigorosamente com a DRE.
 * Percorre cada um dos grupos estratégicos e reordena os códigos das filhas sequencialmente.
 */
export function renumberAllChartAccounts(accounts: ChartAccount[]): {
  updatedAccounts: ChartAccount[];
  renumberedCount: number;
} {
  let updatedList = [...accounts];
  let changed = 0;

  for (const group of STRATEGIC_DRE_GROUPS) {
    const prefixDot = `${group.prefix}.`;
    
    // Contas filhas deste grupo
    const children = updatedList.filter(a => {
      if (a.isSynthetic) return false;
      if (a.parentId === group.id) return true;
      if (a.code.startsWith(prefixDot)) {
        const rem = a.code.slice(prefixDot.length);
        return !rem.includes('.');
      }
      return false;
    });

    children.forEach((child, idx) => {
      const num = idx + 1;
      const suffix = num < 10 ? `0${num}` : `${num}`;
      const expectedCode = `${group.prefix}.${suffix}`;

      if (child.code !== expectedCode || child.parentId !== group.id) {
        changed++;
        updatedList = updatedList.map(a => a.id === child.id ? {
          ...a,
          code: expectedCode,
          parentId: group.id,
          nature: group.nature,
          cashFlowCategory: group.cashFlowCategory,
          dreLineMapping: group.dreLine,
          dremap: {
            include: group.dreLine !== 'NAO_APLICAVEL',
            line: group.dreLine,
            multiplier: group.multiplier
          }
        } : a);
      }
    });
  }

  // Ordenar a lista final por código contábil natural
  updatedList.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  return {
    updatedAccounts: updatedList,
    renumberedCount: changed
  };
}
