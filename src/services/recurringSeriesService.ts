import { FinancialTitle, Contract, ContractAdjustment } from '../types';
import { storage } from './storageService';
import { FinancialEngine } from './financialEngine';

export interface SeriesDetectionResult {
  isSeries: boolean;
  seriesType: 'RECORRENCIA' | 'PARCELAMENTO' | 'CONTRATO' | 'VENDA';
  seriesTypeLabel: string;
  allSeriesTitles: FinancialTitle[];
  subsequentOpenTitles: FinancialTitle[];
  paidTitlesCount: number;
  totalSeriesCount: number;
  contract?: Contract;
}

export interface SeriesFieldChanges {
  amountChanged: boolean;
  oldAmount: number;
  newAmount: number;
  
  dueDateChanged: boolean;
  oldDueDate: string;
  newDueDate: string;
  oldDueDay: number;
  newDueDay: number;
  dueDayChanged: boolean;
  
  accountChanged: boolean;
  oldAccountId: string;
  newAccountId: string;
  
  bankAccountChanged: boolean;
  oldBankAccountId: string;
  newBankAccountId: string;
  
  hasAnyChange: boolean;
}

export class RecurringSeriesService {
  /**
   * Extrai o identificador base de uma série de títulos.
   * Ex: "PAG-2026-1001 - 1/5" -> "PAG-2026-1001"
   * Ex: "REC-2026-2002 - 2026-10" -> "REC-2026-2002"
   * Ex: "CTR-001 - 03/12" -> "CTR-001"
   */
  public static extractBaseTitleNumber(titleNumber: string): string {
    if (!titleNumber) return '';
    return titleNumber
      .replace(/\s+-\s+\d+\/\d+$/, '')
      .replace(/\s+-\s+\d{4}-\d{2}$/, '')
      .trim();
  }

  /**
   * Detecta quais campos de impacto em série foram alterados na edição do título:
   * - Valor original
   * - Dia do Vencimento
   * - Categoria / Plano de Contas
   * - Conta Bancária Prevista
   */
  public static detectFieldChanges(
    targetTitle: FinancialTitle,
    newValues: {
      originalAmount: number;
      dueDate?: string;
      accountId?: string;
      expectedBankAccountId?: string;
    }
  ): SeriesFieldChanges {
    const oldAmount = Number(targetTitle.originalAmount) || 0;
    const newAmount = Number(newValues.originalAmount) || 0;
    const amountChanged = Math.abs(newAmount - oldAmount) > 0.001;

    const oldDueDate = targetTitle.dueDate || '';
    const newDueDate = newValues.dueDate || '';
    const dueDateChanged = oldDueDate !== newDueDate && Boolean(newDueDate);

    const oldDueDay = oldDueDate ? parseInt(oldDueDate.split('-')[2], 10) : 0;
    const newDueDay = newDueDate ? parseInt(newDueDate.split('-')[2], 10) : 0;
    const dueDayChanged = oldDueDay > 0 && newDueDay > 0 && oldDueDay !== newDueDay;

    const oldAccountId = targetTitle.accountId || '';
    const newAccountId = newValues.accountId || '';
    const accountChanged = Boolean(newAccountId && newAccountId !== oldAccountId);

    const oldBankAccountId = targetTitle.expectedBankAccountId || '';
    const newBankAccountId = newValues.expectedBankAccountId || '';
    const bankAccountChanged = Boolean(newBankAccountId !== oldBankAccountId);

    const hasAnyChange = amountChanged || dueDayChanged || accountChanged || bankAccountChanged;

    return {
      amountChanged,
      oldAmount,
      newAmount,
      dueDateChanged,
      oldDueDate,
      newDueDate,
      oldDueDay,
      newDueDay,
      dueDayChanged,
      accountChanged,
      oldAccountId,
      newAccountId,
      bankAccountChanged,
      oldBankAccountId,
      newBankAccountId,
      hasAnyChange
    };
  }

  /**
   * Identifica se o título pertence a uma série (recorrência ou parcelamento)
   * e localiza os títulos irmãos seguintes que ainda estão em aberto.
   */
  public static detectSeries(
    targetTitle: FinancialTitle,
    allTitles?: FinancialTitle[]
  ): SeriesDetectionResult {
    const emptyResult: SeriesDetectionResult = {
      isSeries: false,
      seriesType: 'RECORRENCIA',
      seriesTypeLabel: 'Lançamento Único',
      allSeriesTitles: [],
      subsequentOpenTitles: [],
      paidTitlesCount: 0,
      totalSeriesCount: 0
    };

    if (!targetTitle) return emptyResult;

    const titles = allTitles || storage.getTitles();
    const sameTypeTitles = titles.filter(t => t && t.type === targetTitle.type && t.documentState !== 'CANCELADO');

    let relatedTitles: FinancialTitle[] = [];
    let seriesType: 'RECORRENCIA' | 'PARCELAMENTO' | 'CONTRATO' | 'VENDA' = 'RECORRENCIA';
    let seriesTypeLabel = 'Recorrência';
    let relatedContract: Contract | undefined = undefined;

    // 1. Vínculo por Contrato
    if (targetTitle.contractId) {
      relatedTitles = sameTypeTitles.filter(t => t.contractId === targetTitle.contractId);
      const contracts = storage.getContracts();
      relatedContract = contracts.find(c => c.id === targetTitle.contractId);
      seriesType = 'CONTRATO';
      seriesTypeLabel = relatedContract?.contractType === 'AVULSO' ? 'Parcelamento de Contrato' : 'Recorrência de Contrato';
    }
    // 2. Vínculo por Venda
    else if (targetTitle.saleId) {
      relatedTitles = sameTypeTitles.filter(t => t.saleId === targetTitle.saleId);
      seriesType = 'VENDA';
      seriesTypeLabel = 'Parcelas da Venda';
    }
    // 3. Vínculo por Parcelamento Explícito
    else if ((targetTitle.totalInstallments && targetTitle.totalInstallments > 1) || targetTitle.installmentIndex !== undefined) {
      if (targetTitle.originId) {
        relatedTitles = sameTypeTitles.filter(t => t.originId === targetTitle.originId);
      }
      if (relatedTitles.length <= 1) {
        const baseNum = this.extractBaseTitleNumber(targetTitle.titleNumber);
        if (baseNum && baseNum !== targetTitle.titleNumber) {
          relatedTitles = sameTypeTitles.filter(t => t.titleNumber.startsWith(baseNum));
        }
      }
      seriesType = 'PARCELAMENTO';
      seriesTypeLabel = 'Série de Parcelas';
    }
    // 4. Vínculo por Recorrência Explícita (Contas a Pagar)
    else if (targetTitle.originType === 'RECORRENCIA_PAGAR' || (targetTitle.notes && targetTitle.notes.includes('RECORRENTE'))) {
      const baseNum = this.extractBaseTitleNumber(targetTitle.titleNumber);
      if (baseNum && baseNum !== targetTitle.titleNumber) {
        relatedTitles = sameTypeTitles.filter(t => t.titleNumber.startsWith(baseNum) && t.counterpartyId === targetTitle.counterpartyId);
      } else {
        relatedTitles = sameTypeTitles.filter(t => 
          t.counterpartyId === targetTitle.counterpartyId && 
          t.accountId === targetTitle.accountId &&
          (t.originType === 'RECORRENCIA_PAGAR' || (t.notes && t.notes.includes('RECORRENTE')))
        );
      }
      seriesType = 'RECORRENCIA';
      seriesTypeLabel = 'Despesa Recorrente';
    }
    // 5. Heurística por Padrão de Numeração de Título
    else {
      const baseNum = this.extractBaseTitleNumber(targetTitle.titleNumber);
      if (baseNum && baseNum !== targetTitle.titleNumber) {
        relatedTitles = sameTypeTitles.filter(t => 
          t.titleNumber.startsWith(baseNum) && 
          t.counterpartyId === targetTitle.counterpartyId
        );
        const isInstallmentPattern = /\d+\/\d+/.test(targetTitle.titleNumber);
        seriesType = isInstallmentPattern ? 'PARCELAMENTO' : 'RECORRENCIA';
        seriesTypeLabel = isInstallmentPattern ? 'Série de Parcelas' : 'Recorrência Mensal';
      }
    }

    if (relatedTitles.length <= 1) {
      return emptyResult;
    }

    // Ordenar por ordem cronológica segura
    relatedTitles.sort((a, b) => {
      if (a.installmentIndex !== undefined && b.installmentIndex !== undefined) {
        return a.installmentIndex - b.installmentIndex;
      }
      const compA = a.competence || (a.dueDate ? a.dueDate.substring(0, 7) : '');
      const compB = b.competence || (b.dueDate ? b.dueDate.substring(0, 7) : '');
      if (compA !== compB) return compA.localeCompare(compB);
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    });

    // Determinar referência temporal do título atual
    const targetComp = targetTitle.competence || (targetTitle.dueDate ? targetTitle.dueDate.substring(0, 7) : '');
    const targetDue = targetTitle.dueDate || '';
    const targetIdx = relatedTitles.findIndex(t => t.id === targetTitle.id);

    // Contagem de títulos da série que já foram pagos
    const paidTitles = relatedTitles.filter(t => 
      t.settlementState === 'LIQUIDADO' || 
      t.settlementState === 'PARCIAL' || 
      (t.settledPrincipal || 0) > 0
    );

    // Títulos subsequentes elegíveis (estritamente em aberto e de período igual ou posterior)
    const subsequentOpenTitles = relatedTitles.filter((t, idx) => {
      // Não inclui o próprio título que está sendo editado
      if (t.id === targetTitle.id) return false;

      // Restrição 1: Deve ser posterior em termos de sequência ou data
      let isSubsequent = false;
      if (targetIdx >= 0 && idx > targetIdx) {
        isSubsequent = true;
      } else if (t.installmentIndex !== undefined && targetTitle.installmentIndex !== undefined) {
        isSubsequent = t.installmentIndex > targetTitle.installmentIndex;
      } else {
        const tComp = t.competence || (t.dueDate ? t.dueDate.substring(0, 7) : '');
        const tDue = t.dueDate || '';
        isSubsequent = (tComp && targetComp && tComp >= targetComp) || (tDue && targetDue && tDue >= targetDue);
      }

      if (!isSubsequent) return false;

      // Restrição 2 (Mandatória): Não altere meses que já foram pagos!
      const isSettled = t.settlementState === 'LIQUIDADO' || t.settlementState === 'PARCIAL' || (t.settledPrincipal || 0) > 0;
      if (isSettled) return false;

      // Restrição 3: Não deve estar cancelado
      if (t.documentState === 'CANCELADO') return false;

      // Restrição 4: Período não deve estar fechado/travado contabilmente
      const tComp = t.competence || (t.dueDate ? t.dueDate.substring(0, 7) : '');
      if (tComp && FinancialEngine.isPeriodClosed(tComp)) return false;

      return true;
    });

    return {
      isSeries: subsequentOpenTitles.length > 0,
      seriesType,
      seriesTypeLabel,
      allSeriesTitles: relatedTitles,
      subsequentOpenTitles,
      paidTitlesCount: paidTitles.length,
      totalSeriesCount: relatedTitles.length,
      contract: relatedContract
    };
  }

  /**
   * Executa a atualização da série.
   * - Atualiza o título alvo com os novos campos (valor, vencimento, plano de contas, banco).
   * - Se applyToSubsequent for true:
   *   - Atualiza em lote todos os títulos subsequentes em aberto com novo valor.
   *   - Se dia de vencimento foi alterado, recalcula o dia correspondente em cada mês futuro com segurança.
   *   - Se plano de contas/banco foram alterados, sincroniza nas parcelas futuras.
   *   - Se vinculado a contrato recorrente:
   *     - Sincroniza monthlyTotal e paymentDueDay do contrato.
   *     - Cria histórico de reajuste (ContractAdjustment) completo na ficha do contrato.
   * - Retorna dados do contrato e reajuste para permitir notificação imediata (WhatsApp/E-mail).
   */
  public static executeSeriesUpdate(params: {
    targetTitleId: string;
    newAmount: number;
    updates: Partial<FinancialTitle>;
    applyToSubsequent: boolean;
    subsequentTitleIds: string[];
    contractId?: string;
    propagateDueDay?: boolean;
    propagateAccount?: boolean;
    propagateBankAccount?: boolean;
    currentUser: { name: string; role: any };
  }): {
    success: boolean;
    updatedCount: number;
    subsequentCount: number;
    contract?: Contract;
    adjustment?: ContractAdjustment;
  } {
    const { 
      targetTitleId, 
      newAmount, 
      updates, 
      applyToSubsequent, 
      subsequentTitleIds, 
      contractId, 
      propagateDueDay = true,
      propagateAccount = true,
      propagateBankAccount = true,
      currentUser 
    } = params;

    const currentTitles = storage.getTitles();
    const currentTarget = currentTitles.find(t => t.id === targetTitleId);
    const settledAmount = currentTarget?.settledPrincipal || 0;
    const targetBalance = Math.max(0, Number(newAmount) - settledAmount);

    // 1. Atualizar o título atual
    storage.updateTitle(targetTitleId, {
      ...updates,
      originalAmount: Number(newAmount),
      balancePrincipal: targetBalance
    });

    let subsequentCount = 0;
    let updatedContractResult: Contract | undefined = undefined;
    let createdAdjustmentResult: ContractAdjustment | undefined = undefined;

    // Extrair o novo dia do vencimento se informado
    let newDueDay: number | undefined = undefined;
    if (updates.dueDate) {
      const parts = updates.dueDate.split('-');
      if (parts.length === 3) {
        newDueDay = parseInt(parts[2], 10);
      }
    }

    // 2. Se o usuário optou por propagar para os meses seguintes em aberto
    if (applyToSubsequent && subsequentTitleIds.length > 0) {
      const allTitles = storage.getTitles();
      const targetIdsSet = new Set(subsequentTitleIds);

      const updatedTitles = allTitles.map(t => {
        if (targetIdsSet.has(t.id)) {
          // Proteção estrita: jamais alterar títulos já quitados ou com baixas
          if (t.settlementState === 'LIQUIDADO' || t.settlementState === 'PARCIAL' || (t.settledPrincipal || 0) > 0) {
            return t;
          }
          if (t.documentState === 'CANCELADO') {
            return t;
          }
          const tComp = t.competence || (t.dueDate ? t.dueDate.substring(0, 7) : '');
          if (tComp && FinancialEngine.isPeriodClosed(tComp)) {
            return t;
          }

          subsequentCount++;

          // Calcular nova data de vencimento preservando o mês da parcela futura
          let calculatedDueDate = t.dueDate;
          if (propagateDueDay && newDueDay && t.dueDate) {
            const [tYear, tMonth] = t.dueDate.split('-').map(Number);
            if (tYear && tMonth) {
              const daysInMonth = new Date(tYear, tMonth, 0).getDate();
              const safeDay = Math.min(newDueDay, daysInMonth);
              calculatedDueDate = `${tYear}-${String(tMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
            }
          }

          return {
            ...t,
            originalAmount: Number(newAmount),
            balancePrincipal: Number(newAmount),
            dueDate: calculatedDueDate,
            expectedCashDate: calculatedDueDate,
            accountId: propagateAccount && updates.accountId ? updates.accountId : t.accountId,
            expectedBankAccountId: propagateBankAccount && updates.expectedBankAccountId !== undefined 
              ? updates.expectedBankAccountId 
              : t.expectedBankAccountId,
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });

      storage.saveTitles(updatedTitles);

      // 3. Se pertencer a um contrato ativo, atualizar dados do contrato e registrar histórico de reajuste
      if (contractId) {
        const contracts = storage.getContracts();
        const contractIndex = contracts.findIndex(c => c.id === contractId);
        if (contractIndex >= 0) {
          const oldContract = contracts[contractIndex];
          const oldAmount = oldContract.monthlyTotal || 0;
          const percentage = oldAmount > 0 
            ? Math.round(((Number(newAmount) - oldAmount) / oldAmount) * 10000) / 100 
            : 0;

          // Registrar histórico do reajuste na linha do tempo do contrato
          const newAdjustment: ContractAdjustment = {
            id: `adj-${Date.now()}`,
            date: updates.dueDate || new Date().toISOString().split('T')[0],
            previousAmount: oldAmount,
            newAmount: Number(newAmount),
            percentage,
            reason: 'REAJUSTE_ANUAL',
            reasonLabel: 'Reajuste via Contas a Receber',
            notes: `Reajuste de valor de R$ ${oldAmount.toFixed(2)} para R$ ${Number(newAmount).toFixed(2)} registrado na edição do lançamento ${currentTarget?.titleNumber || targetTitleId}.`,
            appliedAt: new Date().toISOString(),
            appliedBy: currentUser.name
          };

          const updatedContract: Contract = {
            ...oldContract,
            monthlyTotal: Number(newAmount),
            dueDay: (propagateDueDay && newDueDay) ? newDueDay : oldContract.dueDay,
            items: oldContract.items && oldContract.items.length === 1
              ? [{ ...oldContract.items[0], unitPrice: Number(newAmount), total: Number(newAmount) }]
              : (oldContract.items || []),
            adjustments: [newAdjustment, ...(oldContract.adjustments || [])]
          };

          contracts[contractIndex] = updatedContract;
          storage.saveContracts(contracts);
          updatedContractResult = updatedContract;
          createdAdjustmentResult = newAdjustment;
        }
      }

      // Log de auditoria para a alteração em lote da série
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'EDICAO_EM_LOTE',
        module: 'Série Recorrente / Parcelada',
        recordId: targetTitleId,
        details: `Atualização em lote da série: ${subsequentCount} lançamento(s) futuro(s) em aberto atualizados (Valor: R$ ${newAmount.toFixed(2)}${newDueDay ? `, Vencimento: dia ${newDueDay}` : ''}).`
      });
    }

    return {
      success: true,
      updatedCount: 1 + subsequentCount,
      subsequentCount,
      contract: updatedContractResult,
      adjustment: createdAdjustmentResult
    };
  }
}
