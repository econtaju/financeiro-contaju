import { 
  AgentDefinition, 
  AgentRoleType, 
  AgentRunRecord, 
  AgentApprovalItem, 
  AgentAuditEvent,
  FinancialTitle,
  BankStatementEntry,
  ChartAccount
} from '../types';
import { storage } from './storageService';
import { AiService } from './aiService';
import { FinancialEngine, formatBRL } from './financialEngine';

export class AgentOrchestratorService {
  /**
   * Retorna os agentes cadastrados no sistema
   */
  public static getAgents(): AgentDefinition[] {
    return storage.getAgentDefinitions();
  }

  /**
   * Salva alterações em agentes
   */
  public static saveAgents(agents: AgentDefinition[]): void {
    storage.saveAgentDefinitions(agents);
  }

  /**
   * Retorna as aprovações pendentes de ação humana
   */
  public static getPendingApprovals(): AgentApprovalItem[] {
    return storage.getAgentApprovals().filter(a => a.status === 'PENDENTE');
  }

  /**
   * Retorna todo o histórico de propostas/aprovações
   */
  public static getAllApprovals(): AgentApprovalItem[] {
    return storage.getAgentApprovals();
  }

  /**
   * Aprova uma ação proposta pela IA e executa de forma segura
   */
  public static approveProposal(approvalId: string, notes?: string): { success: boolean; message: string } {
    const approvals = storage.getAgentApprovals();
    const target = approvals.find(a => a.id === approvalId);
    if (!target) {
      return { success: false, message: 'Proposta não localizada.' };
    }

    if (target.status !== 'PENDENTE') {
      return { success: false, message: `Esta proposta já foi ${target.status.toLowerCase()}.` };
    }

    // Execução controlada conforme o tipo da ação
    try {
      if (target.proposedAction === 'CONCILIAR_EXTRATO') {
        const payload = target.actionPayload;
        // payload: { statementId, titleId, bankAccountId, amount, date }
        if (payload?.statementId && payload?.titleId) {
          const settlementRes = FinancialEngine.postSettlement({
            titleId: payload.titleId,
            settlementDate: payload.date || new Date().toISOString().split('T')[0],
            bankAccountId: payload.bankAccountId,
            principalSettled: Math.abs(payload.amount),
            discount: 0,
            interest: 0,
            fine: 0,
            bankFee: 0,
            notes: `Liquidado após aprovação humana de recomendação do Agente ${target.agentRole}`
          });

          if (!settlementRes.success) {
            return { success: false, message: `Falha na liquidação contábil: ${settlementRes.message}` };
          }

          // Marca o extrato como conciliado
          const stmts = storage.getStatementEntries();
          const updatedStmts = stmts.map(s => 
            s.id === payload.statementId ? {
              ...s,
              reconciliationStatus: 'CONCILIADO' as const,
              matchedTitleId: payload.titleId,
              ruleApplied: `IA APROVADA: ${target.agentRole}`
            } : s
          );
          storage.saveStatementEntries(updatedStmts);
        }
      }

      // Atualiza o status da aprovação para APROVADO
      storage.resolveAgentApproval(approvalId, 'APROVADO', notes);
      return { success: true, message: `Proposta "${target.title}" aprovada e executada com sucesso!` };
    } catch (err: any) {
      return { success: false, message: `Erro ao processar execução: ${err.message}` };
    }
  }

  /**
   * Rejeita uma proposta da IA
   */
  public static rejectProposal(approvalId: string, reason?: string): { success: boolean; message: string } {
    const success = storage.resolveAgentApproval(approvalId, 'REJEITADO', reason);
    if (!success) {
      return { success: false, message: 'Proposta não localizada.' };
    }
    return { success: true, message: 'Proposta rejeitada. Nenhuma alteração foi efetuada nos dados financeiros.' };
  }

  /**
   * Executa a análise estratégica do Agente CFO Virtual
   */
  public static async runCfoAnalysis(): Promise<{
    success: boolean;
    briefing: string;
    modelUsed: string;
    failoverOccurred: boolean;
  }> {
    const titles = storage.getTitles().filter(t => t.documentState !== 'CANCELADO');
    const bankAccounts = storage.getBankAccounts().filter(b => b.status === 'ATIVO');
    const totalBalance = bankAccounts.reduce((acc, b) => acc + (b.currentBalance || 0), 0);

    const today = new Date().toISOString().split('T')[0];
    const openReceivablesToday = titles
      .filter(t => t.type === 'RECEBER' && t.dueDate === today && t.balancePrincipal > 0)
      .reduce((acc, t) => acc + t.balancePrincipal, 0);

    const openPayablesToday = titles
      .filter(t => t.type === 'PAGAR' && t.dueDate === today && t.balancePrincipal > 0)
      .reduce((acc, t) => acc + t.balancePrincipal, 0);

    const overdueReceivables = titles.filter(t => t.type === 'RECEBER' && t.dueDate < today && t.balancePrincipal > 0);
    const totalOverdue = overdueReceivables.reduce((acc, t) => acc + t.balancePrincipal, 0);
    const totalReceivables = titles.filter(t => t.type === 'RECEBER').reduce((acc, t) => acc + t.originalAmount, 0);
    const delinquencyRate = totalReceivables > 0 ? (totalOverdue / totalReceivables) * 100 : 0;

    const company = storage.getCompany();

    const prompt = `Gere o relatório executivo oficial do CFO para a empresa "${company.tradeName || company.companyName}".
Indicadores Atuais:
- Saldo Consolidado em Bancos: ${formatBRL(totalBalance)}
- Contas a Receber com vencimento hoje: ${formatBRL(openReceivablesToday)}
- Contas a Pagar com vencimento hoje: ${formatBRL(openPayablesToday)}
- Saldo Projetado ao final do dia: ${formatBRL(totalBalance + openReceivablesToday - openPayablesToday)}
- Volume Total Vencido em Atraso: ${formatBRL(totalOverdue)} (${overdueReceivables.length} títulos)
- Taxa Geral de Inadimplência: ${delinquencyRate.toFixed(1)}%

Estruture seu parecer em 3 seções:
1. **Diagnóstico Imediato de Liquidez**: Avalie o caixa frente às obrigações do dia.
2. **Alertas e Gestão de Risco**: Destaque a inadimplência e títulos críticos.
3. **Recomendações Práticas do CFO**: Ações sugeridas para otimização do capital de giro.`;

    const res = await AiService.executeWithFailover([
      { role: 'system', content: 'Você é o CFO Executivo Virtual do Contaju. Escreva com autoridade e clareza.' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.3,
      featureName: 'Parecer CFO Executivo',
      agentRole: 'CFO_EXECUTIVO'
    });

    return {
      success: res.success,
      briefing: res.content || 'Não foi possível gerar a análise no momento.',
      modelUsed: res.modelUsed,
      failoverOccurred: res.failoverOccurred
    };
  }

  /**
   * Executa a auditoria de conciliação bancária gerando propostas formais
   */
  public static async runReconciliationAudit(statement: BankStatementEntry): Promise<{
    success: boolean;
    suggestionMessage: string;
    approvalCreated?: AgentApprovalItem;
  }> {
    const titles = storage.getTitles().filter(t => t.documentState !== 'CANCELADO');
    const chartAccounts = storage.getChartAccounts().filter(a => a.isAnalytical);
    const counterparties = storage.getPersons();

    const isDebit = statement.amount < 0;
    const targetType = isDebit ? 'PAGAR' : 'RECEBER';
    const absAmount = Math.abs(statement.amount);

    const candidates = titles.filter(t => t.type === targetType && t.balancePrincipal > 0);

    const res = await AiService.analyzeReconciliationTransaction(
      statement,
      candidates,
      chartAccounts,
      counterparties
    );

    if (!res.success) {
      return { success: false, suggestionMessage: res.error || 'Falha ao analisar transação.' };
    }

    // Se encontrou título correspondente, cria uma proposta formal para aprovação do gestor
    let approvalItem: AgentApprovalItem | undefined;
    if (res.suggestedTitleId && res.action === 'CONCILIAR_EXISTENTE') {
      const title = titles.find(t => t.id === res.suggestedTitleId);
      if (title) {
        approvalItem = {
          id: `appr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          runId: `run-${Date.now()}`,
          agentRole: 'AUDITOR_CONCILIACAO',
          companyId: 'comp-1',
          title: `Conciliar ${title.titleNumber} (${formatBRL(absAmount)})`,
          description: `Vincular extrato "${statement.description}" do dia ${statement.date} com o título ${title.titleNumber} (${title.description}). Confiança: ${res.confidenceScore}%.`,
          proposedAction: 'CONCILIAR_EXTRATO',
          actionPayload: {
            statementId: statement.id,
            titleId: title.id,
            bankAccountId: statement.bankAccountId,
            amount: statement.amount,
            date: statement.date
          },
          status: 'PENDENTE',
          confidenceScore: res.confidenceScore,
          reasoning: res.reasoning,
          createdAt: new Date().toISOString()
        };

        storage.addAgentApproval(approvalItem);
      }
    }

    return {
      success: true,
      suggestionMessage: res.reasoning,
      approvalCreated: approvalItem
    };
  }
}
