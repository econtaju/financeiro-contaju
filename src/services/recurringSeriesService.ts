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
  
  descriptionChanged?: boolean;
  oldDescription?: string;
  newDescription?: string;

  counterpartyChanged?: boolean;
  oldCounterpartyId?: string;
  newCounterpartyId?: string;

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
   * Normaliza descrições de títulos removendo sufixos de parcelamento, recorrência e meses
   * para permitir comparação semântica confiável entre competências diferentes.
   */
  public static normalizeDescription(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s*\[recorrente[^\]]*\]/gi, '')
      .replace(/\s*-?\s*\d{4}-\d{2}\b/g, '')
      .replace(/\s*-?\s*\d{1,2}\/\d{4}\b/g, '')
      .replace(/\s*\(\d{1,2}\/\d{1,2}\)/g, '')
      .replace(/\s*-?\s*\d{1,2}\/\d{1,2}(?!\d)/g, '')
      .replace(/\s*parcela\s*\d+/gi, '')
      .replace(/\s*m[eê]s\s*\d+/gi, '')
      .replace(/\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b(\s*\/?\s*\d{2,4})?/gi, '')
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
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
      description?: string;
      counterpartyId?: string;
      dueDate?: string;
      accountId?: string;
      expectedBankAccountId?: string;
    }
  ): SeriesFieldChanges {
    const oldAmount = Number(targetTitle.originalAmount) || 0;
    const newAmount = Number(newValues.originalAmount) || 0;
    const amountChanged = Math.abs(newAmount - oldAmount) > 0.001;

    const oldDescription = targetTitle.description || '';
    const newDescription = newValues.description !== undefined ? newValues.description : oldDescription;
    const descriptionChanged = Boolean(newDescription && newDescription.trim() !== oldDescription.trim());

    const oldCounterpartyId = targetTitle.counterpartyId || '';
    const newCounterpartyId = newValues.counterpartyId !== undefined ? newValues.counterpartyId : oldCounterpartyId;
    const counterpartyChanged = Boolean(newCounterpartyId && newCounterpartyId !== oldCounterpartyId);

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

    const hasAnyChange = amountChanged || descriptionChanged || counterpartyChanged || dueDayChanged || accountChanged || bankAccountChanged;

    return {
      amountChanged,
      oldAmount,
      newAmount,
      descriptionChanged,
      oldDescription,
      newDescription,
      counterpartyChanged,
      oldCounterpartyId,
      newCounterpartyId,
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

    // 6. Heurística Inteligente por Similaridade (Mesmo Nome, Mesma Descrição e Valores em Meses Futuros)
    if (relatedTitles.length <= 1) {
      const targetDescNorm = this.normalizeDescription(targetTitle.description);
      const targetAmount = Number(targetTitle.originalAmount) || 0;
      const targetComp = targetTitle.competence || (targetTitle.dueDate ? targetTitle.dueDate.substring(0, 7) : '');

      const candidates = sameTypeTitles.filter(t => {
        if (t.id === targetTitle.id) return true;

        const tComp = t.competence || (t.dueDate ? t.dueDate.substring(0, 7) : '');

        const sameCounterparty = Boolean(
          targetTitle.counterpartyId && t.counterpartyId && targetTitle.counterpartyId === t.counterpartyId
        );

        const tDescNorm = this.normalizeDescription(t.description);
        const descMatch = (targetDescNorm.length >= 3 && tDescNorm.length >= 3) && (
          tDescNorm === targetDescNorm ||
          tDescNorm.includes(targetDescNorm) ||
          targetDescNorm.includes(tDescNorm)
        );

        const tAmount = Number(t.originalAmount) || 0;
        const amountMatch = Math.abs(tAmount - targetAmount) <= 0.10;

        // Caso 1: Mesma contraparte + mesma descrição normalizada
        if (sameCounterparty && descMatch) return true;

        // Caso 2: Mesma descrição normalizada + mesmo valor
        if (descMatch && amountMatch) return true;

        // Caso 3: Mesma contraparte + mesmo valor + mesma categoria
        if (sameCounterparty && amountMatch && t.accountId === targetTitle.accountId && targetDescNorm.length >= 2) return true;

        // Caso 4: Mesma contraparte + mesmo valor em competência diferente (ex.: lançamentos manuais contínuos)
        if (sameCounterparty && amountMatch && targetAmount > 0 && tComp && targetComp && tComp !== targetComp) return true;

        return false;
      });

      if (candidates.length > 1) {
        relatedTitles = candidates;
        seriesType = 'RECORRENCIA';
        seriesTypeLabel = 'Recorrência Mensal Similar';
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
    individualOverrides?: Record<string, { amount?: number; dueDate?: string; description?: string }>;
    contractId?: string;
    propagateDueDay?: boolean;
    propagateAccount?: boolean;
    propagateBankAccount?: boolean;
    propagateDescription?: boolean;
    propagateCounterparty?: boolean;
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
      individualOverrides,
      contractId, 
      propagateDueDay = true,
      propagateAccount = true,
      propagateBankAccount = true,
      propagateDescription = true,
      propagateCounterparty = true,
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

          const override = individualOverrides?.[t.id];

          // Calcular nova data de vencimento preservando o mês da parcela futura (ou usando override manual)
          let calculatedDueDate = override?.dueDate || t.dueDate;
          if (!override?.dueDate && propagateDueDay && newDueDay && t.dueDate) {
            const [tYear, tMonth] = t.dueDate.split('-').map(Number);
            if (tYear && tMonth) {
              const daysInMonth = new Date(tYear, tMonth, 0).getDate();
              const safeDay = Math.min(newDueDay, daysInMonth);
              calculatedDueDate = `${tYear}-${String(tMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
            }
          }

          // Calcular nova descrição preservando sufixos se houver (ou usando override manual)
          let calculatedDescription = t.description;
          if (override?.description !== undefined && override.description.trim()) {
            calculatedDescription = override.description.trim();
          } else if (propagateDescription && updates.description) {
            const suffixMatch = t.description.match(/\s*(\(\d+\/\d+\)|\[Recorrente[^\]]*\]|-\s*\d+\/\d+)$/i);
            if (suffixMatch) {
              const baseNewDesc = updates.description.replace(/\s*(\(\d+\/\d+\)|\[Recorrente[^\]]*\]|-\s*\d+\/\d+)$/i, '').trim();
              calculatedDescription = `${baseNewDesc} ${suffixMatch[1]}`;
            } else {
              calculatedDescription = updates.description;
            }
          }

          const finalSubAmount = override?.amount !== undefined ? Number(override.amount) : Number(newAmount);

          return {
            ...t,
            description: calculatedDescription,
            counterpartyId: propagateCounterparty && updates.counterpartyId ? updates.counterpartyId : t.counterpartyId,
            originalAmount: finalSubAmount,
            balancePrincipal: finalSubAmount,
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

  /**
   * Localiza títulos similares em meses futuros com mesma descrição, contraparte ou valor,
   * útil para checagem prévia na criação, edição ou exclusão.
   */
  public static findSimilarFutureTitles(params: {
    type: 'RECEBER' | 'PAGAR';
    counterpartyId?: string;
    description: string;
    amount: number;
    referenceDateOrCompetence?: string;
    excludeTitleId?: string;
    includeSameCompetence?: boolean;
  }): FinancialTitle[] {
    const {
      type,
      counterpartyId,
      description,
      amount,
      referenceDateOrCompetence,
      excludeTitleId,
      includeSameCompetence = false
    } = params;
    const allTitles = storage.getTitles();
    const refComp = referenceDateOrCompetence ? referenceDateOrCompetence.substring(0, 7) : '';

    const targetDescNorm = this.normalizeDescription(description);

    return allTitles.filter(t => {
      if (!t || t.type !== type || t.documentState === 'CANCELADO') return false;
      if (excludeTitleId && t.id === excludeTitleId) return false;
      
      const tComp = t.competence || (t.dueDate ? t.dueDate.substring(0, 7) : '');
      if (refComp && tComp) {
        if (includeSameCompetence ? tComp < refComp : tComp <= refComp) return false;
      }

      const isSettled = t.settlementState === 'LIQUIDADO' || t.settlementState === 'PARCIAL' || (t.settledPrincipal || 0) > 0;
      if (isSettled) return false;

      if (tComp && FinancialEngine.isPeriodClosed(tComp)) return false;

      const tDescNorm = this.normalizeDescription(t.description);
      const sameCounterparty = Boolean(counterpartyId && t.counterpartyId && counterpartyId === t.counterpartyId);
      const descMatch = (targetDescNorm.length >= 3 && tDescNorm.length >= 3) && (
        tDescNorm === targetDescNorm ||
        tDescNorm.includes(targetDescNorm) ||
        targetDescNorm.includes(tDescNorm)
      );
      const amountMatch = Math.abs((Number(t.originalAmount) || 0) - amount) <= 0.10;

      if (sameCounterparty && descMatch) return true;
      if (descMatch && amountMatch) return true;
      if (sameCounterparty && amountMatch && amount > 0 && tComp && (!refComp || tComp !== refComp)) return true;

      return false;
    }).sort((a, b) => (a.competence || a.dueDate || '').localeCompare(b.competence || b.dueDate || ''));
  }

  /**
   * Atualiza títulos existentes selecionados (ex: após vínculo de continuidade na criação).
   */
  public static updateExistingTitlesBatch(params: {
    updatesByTitleId: Record<string, {
      description?: string;
      originalAmount?: number;
      dueDate?: string;
      accountId?: string;
      expectedBankAccountId?: string;
      counterpartyId?: string;
    }>;
    currentUser: { name: string; role: any };
  }): number {
    const { updatesByTitleId, currentUser } = params;
    const ids = Object.keys(updatesByTitleId);
    if (ids.length === 0) return 0;

    const allTitles = storage.getTitles();
    let updatedCount = 0;

    const updated = allTitles.map(t => {
      const patch = updatesByTitleId[t.id];
      if (!patch) return t;
      if (t.settlementState === 'LIQUIDADO' || t.settlementState === 'PARCIAL' || (t.settledPrincipal || 0) > 0) return t;
      if (t.documentState === 'CANCELADO') return t;
      const tComp = t.competence || (t.dueDate ? t.dueDate.substring(0, 7) : '');
      if (tComp && FinancialEngine.isPeriodClosed(tComp)) return t;

      updatedCount++;
      const nextAmount = patch.originalAmount !== undefined ? Number(patch.originalAmount) : t.originalAmount;
      const nextDueDate = patch.dueDate || t.dueDate;

      return {
        ...t,
        description: patch.description !== undefined ? patch.description : t.description,
        counterpartyId: patch.counterpartyId || t.counterpartyId,
        accountId: patch.accountId || t.accountId,
        expectedBankAccountId: patch.expectedBankAccountId !== undefined ? patch.expectedBankAccountId : t.expectedBankAccountId,
        originalAmount: nextAmount,
        balancePrincipal: Math.max(0, nextAmount - (t.settledPrincipal || 0)),
        dueDate: nextDueDate,
        expectedCashDate: nextDueDate,
        updatedAt: new Date().toISOString()
      };
    });

    if (updatedCount > 0) {
      storage.saveTitles(updated);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'VINCULO_EDICAO_CONTINUIDADE',
        module: 'Continuidade Financeira',
        recordId: ids[0],
        details: `${updatedCount} lançamento(s) posterior(es) similar(es) atualizado(s) por vínculo de continuidade.`
      });
    }

    return updatedCount;
  }
}
