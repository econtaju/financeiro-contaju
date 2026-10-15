import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  CheckCheck, 
  Briefcase, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Server, 
  Zap, 
  Lock, 
  ChevronRight, 
  Activity, 
  Layers, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  AgentDefinition, 
  AgentApprovalItem, 
  AgentRunRecord, 
  AgentRoleType,
  AiProviderConfig 
} from '../../types';
import { storage } from '../../services/storageService';
import { AgentOrchestratorService } from '../../services/agentOrchestratorService';
import { AiService, KNOWN_OPENCODE_MODELS } from '../../services/aiService';
import { formatBRL, formatDateBR } from '../../services/financialEngine';

export const AgentCenterView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AGENTES' | 'APROVACOES' | 'RUNS' | 'GATEWAY'>('AGENTES');
  const [agents, setAgents] = useState<AgentDefinition[]>(() => AgentOrchestratorService.getAgents());
  const [approvals, setApprovals] = useState<AgentApprovalItem[]>(() => AgentOrchestratorService.getAllApprovals());
  const [runs, setRuns] = useState<AgentRunRecord[]>(() => storage.getAgentRuns());
  const [aiConfig, setAiConfig] = useState<AiProviderConfig>(() => AiService.getConfig());

  // Estado de execução de teste do CFO
  const [isRunningCfo, setIsRunningCfo] = useState(false);
  const [cfoResult, setCfoResult] = useState<{ briefing: string; modelUsed: string; failover: boolean } | null>(null);

  // Mensagens de ação
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Sincroniza com as alterações no storage
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setAgents(AgentOrchestratorService.getAgents());
      setApprovals(AgentOrchestratorService.getAllApprovals());
      setRuns(storage.getAgentRuns());
      setAiConfig(AiService.getConfig());
    });
    return unsub;
  }, []);

  const pendingApprovalsCount = approvals.filter(a => a.status === 'PENDENTE').length;

  const handleApprove = (id: string) => {
    setActionErrorMsg('');
    setActionSuccessMsg('');
    const res = AgentOrchestratorService.approveProposal(id);
    if (res.success) {
      setActionSuccessMsg(res.message);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } else {
      setActionErrorMsg(res.message);
      setTimeout(() => setActionErrorMsg(''), 5000);
    }
  };

  const handleReject = (id: string) => {
    setActionErrorMsg('');
    setActionSuccessMsg('');
    const res = AgentOrchestratorService.rejectProposal(id);
    if (res.success) {
      setActionSuccessMsg(res.message);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } else {
      setActionErrorMsg(res.message);
      setTimeout(() => setActionErrorMsg(''), 5000);
    }
  };

  const handleRunCfoAnalysis = async () => {
    setIsRunningCfo(true);
    setActionErrorMsg('');
    try {
      const res = await AgentOrchestratorService.runCfoAnalysis();
      if (res.success) {
        setCfoResult({
          briefing: res.briefing,
          modelUsed: res.modelUsed,
          failover: res.failoverOccurred
        });
      } else {
        setActionErrorMsg(res.briefing || 'Não foi possível gerar a análise.');
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Falha de comunicação.');
    } finally {
      setIsRunningCfo(false);
    }
  };

  const getAgentRoleIcon = (role: AgentRoleType) => {
    switch (role) {
      case 'CFO_EXECUTIVO':
        return <Briefcase className="w-5 h-5 text-amber-500" />;
      case 'AUDITOR_CONCILIACAO':
        return <CheckCheck className="w-5 h-5 text-emerald-500" />;
      case 'ANALISTA_INADIMPLENCIA':
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'GUARDIAO_CONTABIL':
        return <ShieldCheck className="w-5 h-5 text-blue-500" />;
      default:
        return <Bot className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner de Governança e Gateway Seguro */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 border border-slate-700/60 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Gateway Serverless Ativo
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                Zero Segredos no Cliente (PII Redacted)
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Bot className="w-7 h-7 text-amber-400" />
              Central de Agentes Financeiros & IA
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Agentes especialistas para apoio à gestão financeira. As consultas e análises operam de forma autônoma sob isolamento de tenant; qualquer baixa contábil exige autorização humana prévia.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunCfoAnalysis}
              disabled={isRunningCfo}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isRunningCfo ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  Analisando Caixa...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Parecer do CFO
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notificações de Ação */}
        {actionSuccessMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
        {actionErrorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{actionErrorMsg}</span>
          </div>
        )}
      </div>

      {/* Navegação entre Abas da Central */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('AGENTES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'AGENTES'
              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
          }`}
        >
          <Bot className="w-4 h-4" />
          Agentes Especialistas ({agents.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('APROVACOES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'APROVACOES'
              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
          }`}
        >
          <CheckCheck className="w-4 h-4" />
          Aprovações Human-in-the-Loop
          {pendingApprovalsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RUNS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'RUNS'
              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
          }`}
        >
          <Activity className="w-4 h-4" />
          Trilha de Auditoria & Execuções ({runs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GATEWAY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'GATEWAY'
              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
          }`}
        >
          <Server className="w-4 h-4" />
          Gateway & Modelos Server-Side
        </button>
      </div>

      {/* ABA 1: AGENTES ESPECIALISTAS */}
      {activeTab === 'AGENTES' && (
        <div className="space-y-6">
          {/* Parecer do CFO Gerado em Tempo Real */}
          {cfoResult && (
            <div className="p-6 rounded-2xl bg-[var(--surface-elevated)] border border-amber-500/30 shadow-lg relative">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Parecer Executivo da Diretoria Financeira (CFO)
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                  <span>Modelo: <strong>{cfoResult.modelUsed}</strong></span>
                  {cfoResult.failover && (
                    <span className="text-amber-400 font-bold">(Failover Acionado)</span>
                  )}
                  <button 
                    type="button" 
                    onClick={() => setCfoResult(null)}
                    className="p-1 hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-line text-[var(--text-primary)]">
                {cfoResult.briefing}
              </div>
            </div>
          )}

          {/* Cards dos 4 Especialistas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map(agent => (
              <div 
                key={agent.id}
                className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] hover:border-amber-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                        {getAgentRoleIcon(agent.role)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{agent.name}</h4>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                          Papel: {agent.role}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      agent.isActive 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-slate-500/10 text-slate-400'
                    }`}>
                      {agent.isActive ? 'Disponível' : 'Inativo'}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                    {agent.description}
                  </p>

                  <div className="space-y-1.5 mb-4">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                      Ferramentas Autorizadas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.allowedTools.map((tool, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-secondary)]">
                    Modelo: <strong>{agent.defaultModel}</strong>
                  </span>
                  <span className="text-amber-500 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Requer Aprovação Humana
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 2: APROVAÇÕES PENDENTES (HUMAN-IN-THE-LOOP) */}
      {activeTab === 'APROVACOES' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 shrink-0 text-amber-500" />
            <span>
              <strong>Princípio de Integridade Contábil:</strong> As propostas listadas abaixo foram calculadas e sugeridas pelos agentes especialistas. Nenhuma movimentação bancária ou baixa de título é efetivada sem a sua revisão e aprovação explícita.
            </span>
          </div>

          {approvals.length === 0 ? (
            <div className="p-12 text-center bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)]">
              <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">Nenhuma proposta pendente</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Todas as recomendações de conciliação e títulos estão em dia.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map(appr => (
                <div 
                  key={appr.id}
                  className="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        appr.status === 'PENDENTE' 
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : appr.status === 'APROVADO'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {appr.status}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        Agente: <strong>{appr.agentRole}</strong> • Confiança: <strong>{appr.confidenceScore}%</strong>
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[var(--text-primary)]">{appr.title}</h4>
                    <p className="text-xs text-[var(--text-secondary)]">{appr.description}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] italic bg-[var(--surface-elevated)] p-2 rounded-lg">
                      💡 Justificativa Contábil: {appr.reasoning}
                    </p>
                  </div>

                  {appr.status === 'PENDENTE' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReject(appr.id)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeitar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(appr.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aprovar & Executar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: TRILHA DE AUDITORIA & EXECUÇÕES */}
      {activeTab === 'RUNS' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                Histórico de Execuções dos Agentes
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">{runs.length} chamadas registradas</span>
            </div>

            {runs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                Nenhuma execução registrada até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[var(--surface-elevated)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)]">
                      <th className="p-3">Data/Hora</th>
                      <th className="p-3">Agente</th>
                      <th className="p-3">Tarefa</th>
                      <th className="p-3">Modelo</th>
                      <th className="p-3">Latência</th>
                      <th className="p-3">Failover</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {runs.map(run => (
                      <tr key={run.id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                        <td className="p-3 text-[var(--text-secondary)] font-mono">
                          {new Date(run.startedAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3 font-bold text-[var(--text-primary)]">
                          {run.agentRole}
                        </td>
                        <td className="p-3 text-[var(--text-primary)]">
                          {run.taskType}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-amber-500">
                          {run.modelUsed}
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {run.latencyMs}ms
                        </td>
                        <td className="p-3">
                          {run.failoverOccurred ? (
                            <span className="text-amber-400 font-bold">Sim</span>
                          ) : (
                            <span className="text-[var(--text-secondary)]">Não</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            run.status === 'SUCESSO' 
                              ? 'bg-emerald-500/15 text-emerald-400' 
                              : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {run.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: GATEWAY & MODELOS SERVER-SIDE */}
      {activeTab === 'GATEWAY' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-subtle)]">
              <Server className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Cadeia de Contingência de Modelos de IA (Failover)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Se o modelo primário estiver temporariamente indisponível ou retornar Rate Limit (HTTP 429), o gateway comuta instantaneamente para o próximo especialista.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {KNOWN_OPENCODE_MODELS.map((item, idx) => {
                const isPrimary = aiConfig.primaryModel === item.id;
                const isFallback = aiConfig.fallbackModels?.includes(item.id);

                return (
                  <div 
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      isPrimary 
                        ? 'bg-amber-500/10 border-amber-500/40 text-[var(--text-primary)]'
                        : isFallback
                        ? 'bg-[var(--surface-elevated)] border-indigo-500/30 text-[var(--text-primary)]'
                        : 'bg-[var(--surface-elevated)]/50 border-[var(--border-subtle)] text-[var(--text-secondary)] opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{item.name}</span>
                        {isPrimary && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-amber-500 text-slate-950">
                            Primário
                          </span>
                        )}
                        {isFallback && !isPrimary && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Contingência
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated: AiProviderConfig = {
                          ...aiConfig,
                          primaryModel: item.id
                        };
                        AiService.saveConfig(updated);
                        setAiConfig(updated);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[var(--border-subtle)] hover:border-amber-500 hover:text-amber-500 transition-colors cursor-pointer shrink-0"
                    >
                      {isPrimary ? 'Ativo' : 'Tornar Primário'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
