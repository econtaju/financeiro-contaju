import { storage } from './storageService';
import { CustomerChurnRiskAssessment, ChurnRiskLevel, Contract, FinancialTitle } from '../types';

export class ChurnPredictionEngine {
  /**
   * Avalia o risco de churn e calcula o Health Score (0 a 100) para um cliente específico com contrato ativo
   */
  public static calculateCustomerChurnRisk(customerId: string): CustomerChurnRiskAssessment | null {
    const contracts = storage.getContracts();
    const counterparties = storage.getCounterparties();
    const titles = storage.getTitles();

    const customer = counterparties.find(c => c.id === customerId);
    if (!customer) return null;

    // Busca contratos ativos do cliente
    const activeContracts = contracts.filter(c => c.customerId === customerId && c.status === 'ATIVO');
    if (activeContracts.length === 0) return null;

    const primaryContract = activeContracts[0];
    const monthlyFee = activeContracts.reduce((acc, c) => acc + (c.monthlyTotal || 0), 0);

    const today = new Date().toISOString().split('T')[0];
    const customerTitles = titles.filter(t => t.counterpartyId === customerId && t.type === 'RECEBER' && t.documentState === 'CONFIRMADO');

    // Títulos vencidos e não quitados
    const overdueTitles = customerTitles.filter(t => {
      const balance = t.balancePrincipal || 0;
      return balance > 0 && t.dueDate && t.dueDate < today;
    });

    const overdueCount = overdueTitles.length;
    const overdueAmount = overdueTitles.reduce((acc, t) => acc + (t.balancePrincipal || 0), 0);

    // Maior atraso em dias
    let maxDaysOverdue = 0;
    const todayMs = new Date(today).getTime();
    for (const ot of overdueTitles) {
      if (ot.dueDate) {
        const dueMs = new Date(ot.dueDate).getTime();
        const diffDays = Math.max(0, Math.floor((todayMs - dueMs) / (1000 * 60 * 60 * 24)));
        if (diffDays > maxDaysOverdue) {
          maxDaysOverdue = diffDays;
        }
      }
    }

    // Histórico de pagamentos (pontualidade via liquidações)
    const settlements = storage.getSettlements().filter(s => !s.isReversed);
    const titleSettlementDateMap = new Map<string, string>();
    for (const s of settlements) {
      const cur = titleSettlementDateMap.get(s.titleId);
      if (!cur || s.settlementDate > cur) {
        titleSettlementDateMap.set(s.titleId, s.settlementDate);
      }
    }

    const paidTitles = customerTitles.filter(t => t.settlementState === 'LIQUIDADO');
    let latePaidCount = 0;
    for (const pt of paidTitles) {
      const paymentDate = titleSettlementDateMap.get(pt.id);
      if (pt.dueDate && paymentDate && paymentDate > pt.dueDate) {
        latePaidCount++;
      }
    }
    const historyLatePaymentRate = paidTitles.length > 0 
      ? Math.round((latePaidCount / paidTitles.length) * 100) 
      : 0;

    // Tempo de relacionamento em meses (desde o início do contrato)
    const startDate = primaryContract.startDate || primaryContract.entryDate || primaryContract.createdAt || today;
    const startMs = new Date(startDate).getTime();
    const monthsActive = Math.max(1, Math.floor((todayMs - startMs) / (1000 * 60 * 60 * 24 * 30.4)));

    // Janela de renovação de 12 meses
    const cycleMonths = monthsActive % 12;
    const isRenewalWindow = cycleMonths === 11 || cycleMonths === 0;

    // ==========================================================
    // CÁLCULO DO HEALTH SCORE (0 A 100)
    // ==========================================================
    let score = 100;
    const riskFactors: string[] = [];

    // 1. Penalidade por títulos vencidos em aberto
    if (overdueCount === 1) {
      score -= 15;
      riskFactors.push('Possui 1 fatura vencida em aberto.');
    } else if (overdueCount === 2) {
      score -= 30;
      riskFactors.push('Possui 2 faturas vencidas em aberto.');
    } else if (overdueCount >= 3) {
      score -= 45;
      riskFactors.push(`Possui ${overdueCount} faturas vencidas em aberto com atraso acumulado.`);
    }

    // 2. Penalidade por dias de atraso crítico
    if (maxDaysOverdue > 30) {
      score -= 20;
      riskFactors.push(`Atraso crítico superior a 30 dias (${maxDaysOverdue} dias de mora).`);
    } else if (maxDaysOverdue > 15) {
      score -= 10;
      riskFactors.push(`Atraso moderado superior a 15 dias (${maxDaysOverdue} dias de mora).`);
    }

    // 3. Penalidade por volume financeiro de inadimplência vs mensalidade
    if (monthlyFee > 0 && overdueAmount >= monthlyFee * 1.5) {
      score -= 15;
      riskFactors.push(`Montante vencido (R$ ${overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede 1.5x a mensalidade contratual.`);
    }

    // 4. Penalidade por histórico crônico de atraso
    if (historyLatePaymentRate >= 60 && paidTitles.length >= 3) {
      score -= 15;
      riskFactors.push(`Histórico crônico: ${historyLatePaymentRate}% das faturas foram quitadas com atraso.`);
    } else if (historyLatePaymentRate >= 35 && paidTitles.length >= 3) {
      score -= 8;
      riskFactors.push(`Histórico de atrasos recorrentes (${historyLatePaymentRate}% das faturas).`);
    }

    // 5. Janela de ciclo contratual de 12 meses (revisão de contrato)
    if (isRenewalWindow && score < 85) {
      score -= 8;
      riskFactors.push('Contrato se aproximando do ciclo anual de renovação/rescisão.');
    }

    score = Math.max(5, Math.min(100, Math.round(score)));

    // Determina o nível de risco
    let riskLevel: ChurnRiskLevel = 'SAUDAVEL';
    if (score < 45) {
      riskLevel = 'CRITICO';
    } else if (score < 65) {
      riskLevel = 'ALTO';
    } else if (score < 80) {
      riskLevel = 'MODERADO';
    } else {
      riskLevel = 'SAUDAVEL';
    }

    // Recomendação prática
    let recommendedAction = 'Manter rotina padrão de acompanhamento e emissão.';
    if (riskLevel === 'CRITICO') {
      recommendedAction = 'Acionar alinhamento imediato da diretoria e negociar parcelamento urgente do saldo devedor para evitar perda do contrato.';
    } else if (riskLevel === 'ALTO') {
      recommendedAction = 'Contato telefônico do setor financeiro/comercial para compreender entrave de fluxo de caixa e renegociar data de vencimento.';
    } else if (riskLevel === 'MODERADO') {
      recommendedAction = 'Enviar lembretes preventivos de vencimento e verificar satisfação com os serviços contábeis prestados.';
    }

    return {
      customerId,
      customerName: customer.name || 'Cliente sem nome',
      customerDocument: customer.document,
      contractId: primaryContract.id,
      contractNumber: primaryContract.contractNumber,
      monthlyFee,
      healthScore: score,
      riskLevel,
      overdueTitlesCount: overdueCount,
      overdueAmount,
      maxDaysOverdue,
      historyLatePaymentRate,
      monthsActive,
      isRenewalWindow,
      riskFactors: riskFactors.length > 0 ? riskFactors : ['Cliente adimplente com pagamentos em dia.'],
      recommendedAction
    };
  }

  /**
   * Avalia todos os clientes com contratos ativos e retorna ordenado por maior risco (menor Health Score)
   */
  public static getAllCustomerRiskAssessments(): CustomerChurnRiskAssessment[] {
    const contracts = storage.getContracts();
    const activeContracts = contracts.filter(c => c.status === 'ATIVO');
    const customerIds = Array.from(new Set(activeContracts.map(c => c.customerId)));

    const assessments: CustomerChurnRiskAssessment[] = [];
    for (const cId of customerIds) {
      const assessment = this.calculateCustomerChurnRisk(cId);
      if (assessment) {
        assessments.push(assessment);
      }
    }

    // Ordena do menor score para o maior (mais críticos primeiro)
    return assessments.sort((a, b) => a.healthScore - b.healthScore);
  }

  /**
   * Retorna resumo consolidado de risco da carteira
   */
  public static getPortfolioRiskSummary() {
    const all = this.getAllCustomerRiskAssessments();
    const totalActive = all.length;
    
    const critico = all.filter(a => a.riskLevel === 'CRITICO');
    const alto = all.filter(a => a.riskLevel === 'ALTO');
    const moderado = all.filter(a => a.riskLevel === 'MODERADO');
    const saudavel = all.filter(a => a.riskLevel === 'SAUDAVEL');

    const totalAtRiskFee = [...critico, ...alto].reduce((acc, a) => acc + a.monthlyFee, 0);
    const avgScore = totalActive > 0 
      ? Math.round(all.reduce((acc, a) => acc + a.healthScore, 0) / totalActive) 
      : 100;

    return {
      totalActiveCustomers: totalActive,
      criticoCount: critico.length,
      altoCount: alto.length,
      moderadoCount: moderado.length,
      saudavelCount: saudavel.length,
      totalAtRiskMonthlyFee: totalAtRiskFee,
      averageHealthScore: avgScore,
      assessments: all
    };
  }
}
