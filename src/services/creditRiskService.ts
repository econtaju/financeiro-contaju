import { FinancialTitle, Settlement, Counterparty } from '../types';
import { storage } from './storageService';

export type RiskLevel = 'BAIXO' | 'MODERADO' | 'ALTO' | 'NOVO';

export interface CustomerRiskProfile {
  counterpartyId: string;
  customerName: string;
  tradeName?: string;
  document: string;
  phone?: string;
  totalBilledCount: number;
  totalBilledAmount: number;
  settledCount: number;
  settledOnTimeCount: number;
  settledDelayedCount: number;
  openCount: number;
  openAmount: number;
  overdueCount: number;
  overdueAmount: number;
  averageDelayDays: number;
  punctualityScore: number; // 0 to 100
  riskLevel: RiskLevel;
  riskBadgeLabel: string;
  riskColorClasses: {
    badge: string;
    text: string;
    border: string;
    bg: string;
  };
  recommendedAction: string;
  suggestedWhatsAppMessage: string;
}

/**
 * Motor Preditivo de Risco de Inadimplência e Pontualidade de Clientes
 */
export class CreditRiskService {
  /**
   * Avalia o perfil de risco histórico e preditivo de um cliente específico
   */
  public static evaluateCustomerRisk(
    counterpartyId: string,
    allTitles?: FinancialTitle[],
    allSettlements?: Settlement[],
    referenceDateStr?: string
  ): CustomerRiskProfile {
    const today = referenceDateStr || new Date().toISOString().split('T')[0];
    const counterparties = storage.getCounterparties();
    const customer = counterparties.find(c => c.id === counterpartyId);
    
    const titles = allTitles || storage.getTitles();
    const settlements = allSettlements || storage.getSettlements();

    const customerTitles = titles.filter(t => t.counterpartyId === counterpartyId && t.type === 'RECEBER');
    
    const totalBilledCount = customerTitles.length;
    const totalBilledAmount = customerTitles.reduce((acc, t) => acc + t.originalAmount, 0);

    let settledCount = 0;
    let settledOnTimeCount = 0;
    let settledDelayedCount = 0;
    let totalDelayDays = 0;

    let openCount = 0;
    let openAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    for (const title of customerTitles) {
      if (title.settlementState === 'LIQUIDADO') {
        settledCount++;
        // Localiza a baixa correspondente
        const st = settlements.find(s => s.titleId === title.id && !s.isReversed);
        const settledDate = st?.settlementDate || title.updatedAt?.split('T')[0] || title.dueDate;
        
        if (settledDate <= title.dueDate) {
          settledOnTimeCount++;
        } else {
          settledDelayedCount++;
          const diffMs = new Date(settledDate).getTime() - new Date(title.dueDate).getTime();
          const delayDays = Math.max(1, Math.round(diffMs / (1000 * 3600 * 24)));
          totalDelayDays += delayDays;
        }
      } else {
        openCount++;
        const balance = title.balancePrincipal > 0 ? title.balancePrincipal : title.originalAmount;
        openAmount += balance;

        if (title.dueDate < today) {
          overdueCount++;
          overdueAmount += balance;
        }
      }
    }

    const averageDelayDays = settledDelayedCount > 0 ? Math.round(totalDelayDays / settledDelayedCount) : 0;

    // Cálculo do Score de Pontualidade (0 a 100)
    let punctualityScore = 100;
    let riskLevel: RiskLevel = 'BAIXO';

    if (settledCount === 0 && openCount <= 1 && overdueCount === 0) {
      riskLevel = 'NOVO';
      punctualityScore = 75; // Score neutro para início
    } else {
      const onTimeRatio = settledCount > 0 ? (settledOnTimeCount / settledCount) : 1;
      let baseScore = Math.round(onTimeRatio * 100);

      // Penalização por atraso médio
      if (averageDelayDays > 0) {
        baseScore -= Math.min(30, averageDelayDays * 3);
      }

      // Penalização grave por títulos atualmente vencidos em aberto
      if (overdueCount > 0) {
        baseScore -= (overdueCount * 25);
      }

      punctualityScore = Math.max(10, Math.min(100, baseScore));

      if (overdueCount > 0 || punctualityScore < 60 || averageDelayDays >= 8) {
        riskLevel = 'ALTO';
      } else if (settledDelayedCount > 0 || punctualityScore < 85 || averageDelayDays >= 2) {
        riskLevel = 'MODERADO';
      } else {
        riskLevel = 'BAIXO';
      }
    }

    // Cores e Rótulos Semânticos Padronizados
    let riskBadgeLabel = '🟢 Baixo Risco (Pontual)';
    let riskColorClasses = {
      badge: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500',
      bg: 'bg-emerald-50/40 dark:bg-emerald-950/20'
    };
    let recommendedAction = 'Cliente pontual. Manter régua regular de cobrança automática.';

    if (riskLevel === 'ALTO') {
      riskBadgeLabel = overdueCount > 0 
        ? `🔴 Alto Risco (${overdueCount} vencido${overdueCount > 1 ? 's' : ''})` 
        : '🔴 Alto Risco de Inadimplência';
      riskColorClasses = {
        badge: 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-500',
        bg: 'bg-rose-50/50 dark:bg-rose-950/30'
      };
      recommendedAction = 'Cobrança ativa prioritária: acionar contato direto via WhatsApp/telefone e pausar faturamentos futuros.';
    } else if (riskLevel === 'MODERADO') {
      riskBadgeLabel = `🟡 Risco Moderado (${averageDelayDays > 0 ? `atraso médio ${averageDelayDays}d` : `${punctualityScore}% pontual`})`;
      riskColorClasses = {
        badge: 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500',
        bg: 'bg-amber-50/50 dark:bg-amber-950/30'
      };
      recommendedAction = 'Ação Preventiva: enviar lembrete amigável D-2 antes do vencimento com link PIX copia-e-cola.';
    } else if (riskLevel === 'NOVO') {
      riskBadgeLabel = '⚪ Cliente Novo (Sem Histórico)';
      riskColorClasses = {
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-400',
        bg: 'bg-slate-50 dark:bg-slate-800/40'
      };
      recommendedAction = 'Acompanhar pontualidade no primeiro ciclo de faturamento.';
    }

    const customerDisplayName = customer?.tradeName || customer?.name || 'Cliente';
    const suggestedWhatsAppMessage = riskLevel === 'ALTO'
      ? `Olá ${customerDisplayName}, tudo bem? Identificamos pendência financeira em aberto no valor de R$ ${openAmount.toFixed(2)}. Poderia nos confirmar a previsão de pagamento ou se precisa da 2ª via atualizada? Estamos à disposição!`
      : `Olá ${customerDisplayName}! Lembramos que o vencimento da sua fatura está se aproximando no valor de R$ ${openAmount.toFixed(2)}. Chave PIX: financeiro@contaju.com.br. Agradecemos pela parceria!`;

    return {
      counterpartyId,
      customerName: customer?.name || 'Cliente Desconhecido',
      tradeName: customer?.tradeName,
      document: customer?.document || '',
      phone: customer?.phone,
      totalBilledCount,
      totalBilledAmount,
      settledCount,
      settledOnTimeCount,
      settledDelayedCount,
      openCount,
      openAmount,
      overdueCount,
      overdueAmount,
      averageDelayDays,
      punctualityScore,
      riskLevel,
      riskBadgeLabel,
      riskColorClasses,
      recommendedAction,
      suggestedWhatsAppMessage
    };
  }

  /**
   * Diagnóstico consolidado de risco da carteira de recebíveis
   */
  public static getPortfolioRiskOverview(referenceDateStr?: string) {
    const titles = storage.getTitles().filter(t => t.type === 'RECEBER' && t.documentState !== 'CANCELADO');
    const settlements = storage.getSettlements();
    const counterparties = storage.getCounterparties().filter(c => c.type === 'CLIENTE' || c.type === 'AMBOS');

    const customerProfiles: Record<string, CustomerRiskProfile> = {};

    for (const cp of counterparties) {
      customerProfiles[cp.id] = this.evaluateCustomerRisk(cp.id, titles, settlements, referenceDateStr);
    }

    let lowRiskOpenAmount = 0;
    let moderateRiskOpenAmount = 0;
    let highRiskOpenAmount = 0;

    const openTitles = titles.filter(t => t.settlementState !== 'LIQUIDADO');

    for (const t of openTitles) {
      const amount = t.balancePrincipal > 0 ? t.balancePrincipal : t.originalAmount;
      const profile = customerProfiles[t.counterpartyId];
      if (!profile || profile.riskLevel === 'BAIXO' || profile.riskLevel === 'NOVO') {
        lowRiskOpenAmount += amount;
      } else if (profile.riskLevel === 'MODERADO') {
        moderateRiskOpenAmount += amount;
      } else if (profile.riskLevel === 'ALTO') {
        highRiskOpenAmount += amount;
      }
    }

    return {
      customerProfiles,
      totalOpenAmount: lowRiskOpenAmount + moderateRiskOpenAmount + highRiskOpenAmount,
      lowRiskOpenAmount,
      moderateRiskOpenAmount,
      highRiskOpenAmount,
      highRiskCustomerCount: Object.values(customerProfiles).filter(p => p.riskLevel === 'ALTO' && p.openCount > 0).length,
      moderateRiskCustomerCount: Object.values(customerProfiles).filter(p => p.riskLevel === 'MODERADO' && p.openCount > 0).length
    };
  }
}
