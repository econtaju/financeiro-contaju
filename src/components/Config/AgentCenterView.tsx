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
  AlertCircle,
  RefreshCw,
  Key,
  Eye,
  EyeOff,
  Search,
  ArrowUp,
  ArrowDown,
  Check,
  Plus,
  X
} from 'lucide-react';
import { 
  AgentDefinition, 
  AgentApprovalItem, 
  AgentRunRecord, 
  AgentRoleType,
  AiProviderConfig,
  AiModelChainItem
} from '../../types';
import { storage } from '../../services/storageService';
import { AgentOrchestratorService } from '../../services/agentOrchestratorService';
import { AiService } from '../../services/aiService';
import { AiModelCatalogService } from '../../services/aiModelCatalogService';
import { formatBRL, formatDateBR } from '../../services/financialEngine';

export const AgentCenterView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AGENTES' | 'APROVACOES' | 'RUNS' | 'GATEWAY'>(() => {
    const cfg = AiService.getConfig();
    return cfg.apiKey ? 'AGENTES' : 'GATEWAY';
  });
  const [agents, setAgents] = useState<AgentDefinition[]>(() => AgentOrchestratorService.getAgents());
  const [approvals, setApprovals] = useState<AgentApprovalItem[]>(() => AgentOrchestratorService.getAllApprovals());
  const [runs, setRuns] = useState<AgentRunRecord[]>(() => storage.getAgentRuns());
  const [aiConfig, setAiConfig] = useState<AiProviderConfig>(() => AiService.getConfig());
  const [catalogModels, setCatalogModels] = useState<AiModelChainItem[]>(() => AiModelCatalogService.getCachedCatalog());
  const [isSyncingModels, setIsSyncingModels] = useState(false);

  // Estados de Conexão com OpenCode Go
  const [apiKeyInput, setApiKeyInput] = useState(() => aiConfig.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConnectingKey, setIsConnectingKey] = useState(false);
  const [searchModelQuery, setSearchModelQuery] = useState('');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState('ALL');
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs: number; message: string }>>({});

  // Estado de execução de teste do CFO
  const [isRunningCfo, setIsRunningCfo] = useState(false);
  const [cfoResult, setCfoResult] = useState<{ briefing: string; modelUsed: string; failover: boolean } | null>(null);

  // Mensagens de ação
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Sincroniza catálogo de modelos em tempo real na montagem
  useEffect(() => {
    setIsSyncingModels(true);
    AiModelCatalogService.fetchCatalog(true)
      .then(res => {
        if (res.models && res.models.length > 0) {
          setCatalogModels(res.models);
        }
      })
      .catch(() => {})
      .finally(() => setIsSyncingModels(false));
  }, []);

  const handleRefreshCatalog = async () => {
    setIsSyncingModels(true);
    setActionSuccessMsg('');
    setActionErrorMsg('');
    try {
      const res = await AiModelCatalogService.fetchCatalog(true);
      setCatalogModels(res.models);
      setActionSuccessMsg(`Catálogo atualizado com sucesso! ${res.models.length} modelos sincronizados com OpenCode Go.`);
      setTimeout(() => setActionSuccessMsg(''), 5000);
    } catch (err: any) {
      setActionErrorMsg('Não foi possível sincronizar o catálogo online. Usando catálogo local.');
      setTimeout(() => setActionErrorMsg(''), 5000);
    } finally {
      setIsSyncingModels(false);
    }
  };

  // Sincroniza com as alterações no storage
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setAgents(AgentOrchestratorService.getAgents());
      setApprovals(AgentOrchestratorService.getAllApprovals());
      setRuns(storage.getAgentRuns());
      const cfg = AiService.getConfig();
      setAiConfig(cfg);
      if (cfg.apiKey && !apiKeyInput) {
        setApiKeyInput(cfg.apiKey);
      }
    });
    return unsub;
  }, []);

  const handleConnectOpenCodeGo = async () => {
    if (!apiKeyInput.trim()) {
      setActionErrorMsg('Por favor, informe sua Chave de API do OpenCode Go.');
      setTimeout(() => setActionErrorMsg(''), 5000);
      return;
    }
    setIsConnectingKey(true);
    setActionErrorMsg('');
    setActionSuccessMsg('');
    try {
      const res = await AiModelCatalogService.connectAndSync(apiKeyInput.trim());
      setCatalogModels(AiModelCatalogService.getCachedCatalog());
      setAiConfig(AiService.getConfig());
      if (res.success) {
        setActionSuccessMsg(`🎉 ${res.message}`);
        setTimeout(() => setActionSuccessMsg(''), 6000);
      } else {
        setActionErrorMsg(res.message);
        setTimeout(() => setActionErrorMsg(''), 7000);
      }
    } catch (err: any) {
      setActionErrorMsg(`Falha na conexão: ${err.message || 'Erro inesperado'}`);
      setTimeout(() => setActionErrorMsg(''), 6000);
    } finally {
      setIsConnectingKey(false);
    }
  };

  const handleTestSingleModel = async (modelId: string) => {
    setTestingModelId(modelId);
    try {
      const res = await AiService.testModelConnection(modelId, aiConfig.apiKey, aiConfig.endpointUrl);
      setTestResults(prev => ({ ...prev, [modelId]: res }));
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [modelId]: { success: false, latencyMs: 0, message: err.message || 'Falha de conexão' } }));
    } finally {
      setTestingModelId(null);
    }
  };

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

        {/* Painel Central de Conexão com OpenCode Go e Atualização de Modelos */}
        <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-amber-950/20 to-slate-900 border border-purple-500/30 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/40 shrink-0 mt-0.5">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Configuração da Chave de API do OpenCode Go</span>
                  </h3>
                  {aiConfig.apiKey ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Chave Ativa
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      Cole sua chave abaixo
                    </span>
                  )}
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {catalogModels.length} IAs Carregadas
                  </span>
                  {aiConfig.primaryModel && (
                    <span className="text-[11px] text-slate-300">
                      Modelo: <strong className="text-amber-400">{aiConfig.primaryModel}</strong>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  {aiConfig.apiKey 
                    ? 'Sua chave está vinculada e pronta para uso em todas as conciliações e relatórios executivos.' 
                    : 'Insira sua chave OpenCode Go para ativar as IAs no sistema. Ao salvar, todos os modelos disponíveis serão importados automaticamente.'
                  }
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefreshCatalog}
              disabled={isSyncingModels}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50 self-stretch sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingModels ? 'animate-spin text-purple-400' : 'text-slate-300'}`} />
              <span>{isSyncingModels ? 'Sincronizando...' : 'Atualizar Catálogo (37 Modelos)'}</span>
            </button>
          </div>

          {/* Input Direto da Chave e Botão de Salvar/Atualizar */}
          <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Cole sua API Key do OpenCode Go (opencode-zen-... ou sk-...)"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-700 bg-slate-950/80 text-xs font-mono text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white p-1 cursor-pointer"
                title={showApiKey ? 'Ocultar chave' : 'Exibir chave'}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={handleConnectOpenCodeGo}
              disabled={isConnectingKey || !apiKeyInput.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isConnectingKey ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Validando Chave & Modelos...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Salvar Chave & Atualizar Modelos Agora</span>
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
          onClick={() => setActiveTab('GATEWAY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'GATEWAY'
              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
          }`}
        >
          <Key className="w-4 h-4 text-amber-500" />
          <span>Catálogo de Modelos & Conexão ({catalogModels.length})</span>
          {aiConfig.apiKey ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          )}
        </button>

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

      {/* ABA 4: CONEXÃO OPENCODE GO & CATÁLOGO DINÂMICO DE IAS */}
      {activeTab === 'GATEWAY' && (
        <div className="space-y-6">
          {/* Card 1: Conexão e Importação da Chave OpenCode Go */}
          <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span>Ativação & Conexão OpenCode Go</span>
                    {aiConfig.apiKey ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Ativo & Conectado
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Aguardando Chave
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Cole sua chave da API do OpenCode Go abaixo. Ao conectar, o sistema valida a credencial, atualiza e importa todas as IAs disponíveis para uso imediato no sistema.
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] self-start sm:self-auto">
                Endpoint: https://opencode.ai/zen/go/v1
              </span>
            </div>

            {/* Input da Chave e Ação de Conexão Imediata */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Chave da API do OpenCode Go:
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Cole sua chave da API OpenCode Go (ex: sk-... ou opencode_...)"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-xs font-mono text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
                    title={showApiKey ? 'Ocultar chave' : 'Exibir chave'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConnectOpenCodeGo}
                  disabled={isConnectingKey}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isConnectingKey ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Validando & Importando IAs...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Conectar & Importar IAs Agora</span>
                    </>
                  )}
                </button>
              </div>

              {aiConfig.apiKey && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Chave configurada com sucesso. As IAs estão ativas para Conciliação Bancária, Parecer do CFO e Análises Contábeis.</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Cadeia de Contingência Dinâmica (Failover) */}
          <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>Cadeia de Contingência Ativa</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Ordem de execução das IAs. Se o modelo primário retornar sobrecarga ou Rate Limit (429), o próximo assume automaticamente.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setIsSyncingModels(true);
                  try {
                    const res = await AiModelCatalogService.fetchCatalog(true);
                    setCatalogModels(res.models);
                    setActionSuccessMsg(`Catálogo sincronizado: ${res.models.length} modelos identificados.`);
                    setTimeout(() => setActionSuccessMsg(''), 4000);
                  } catch (e: any) {
                    setActionErrorMsg(`Falha na atualização: ${e.message}`);
                    setTimeout(() => setActionErrorMsg(''), 4000);
                  } finally {
                    setIsSyncingModels(false);
                  }
                }}
                disabled={isSyncingModels}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors flex items-center gap-2 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${isSyncingModels ? 'animate-spin' : ''}`} />
                <span>{isSyncingModels ? 'Sincronizando...' : 'Atualizar Lista Oficial'}</span>
              </button>
            </div>

            {/* Modelos da Cadeia Ativa */}
            <div className="space-y-2">
              {[aiConfig.primaryModel, ...(aiConfig.fallbackModels || [])].filter(Boolean).map((modelId, idx) => {
                const isPrimary = idx === 0;
                const meta = catalogModels.find(m => m.id === modelId);
                const testRes = testResults[modelId];
                const isTesting = testingModelId === modelId;

                return (
                  <div
                    key={modelId}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isPrimary 
                        ? 'bg-amber-500/10 border-amber-500/40 text-[var(--text-primary)]' 
                        : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                        isPrimary ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs">{meta?.name || modelId}</span>
                          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            {modelId}
                          </span>
                          {isPrimary && (
                            <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-amber-500 text-slate-950">
                              ⭐ Modelo Primário
                            </span>
                          )}
                        </div>
                        {meta?.description && (
                          <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">{meta.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {testRes && (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                          testRes.success 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}>
                          {testRes.success ? `Ativo (${testRes.latencyMs}ms)` : 'Falhou'}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleTestSingleModel(modelId)}
                        disabled={isTesting || !aiConfig.apiKey}
                        className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer disabled:opacity-50"
                        title="Testar conectividade"
                      >
                        {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" /> : <Play className="w-3.5 h-3.5" />}
                      </button>

                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => {
                            const currentChain = [aiConfig.primaryModel, ...(aiConfig.fallbackModels || [])];
                            const updatedChain = currentChain.filter(m => m !== modelId);
                            const updatedConfig = {
                              ...aiConfig,
                              primaryModel: updatedChain[0] || 'deepseek-v4-pro',
                              fallbackModels: updatedChain.slice(1)
                            };
                            AiService.saveConfig(updatedConfig);
                            setAiConfig(updatedConfig);
                          }}
                          className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-400 cursor-pointer"
                          title="Remover da contingência"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Explorador Completo das IAs da OpenCode Go */}
          <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  <span>IAs Disponíveis no OpenCode Go ({catalogModels.length} modelos)</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Clique em "Tornar Primário" ou "+ Contingência" para configurar quais IAs o aplicativo utilizará nas análises.
                </p>
              </div>

              {/* Busca de Modelo */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  value={searchModelQuery}
                  onChange={(e) => setSearchModelQuery(e.target.value)}
                  placeholder="Pesquisar IA (ex: deepseek, luna, qwen)..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Grid com os Modelos Disponíveis */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {catalogModels
                .filter(m => {
                  if (!searchModelQuery.trim()) return true;
                  const q = searchModelQuery.toLowerCase();
                  return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
                })
                .map((item) => {
                  const isPrimary = aiConfig.primaryModel === item.id;
                  const isFallback = aiConfig.fallbackModels?.includes(item.id);
                  const isTesting = testingModelId === item.id;
                  const testRes = testResults[item.id];

                  return (
                    <div 
                      key={item.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                        isPrimary 
                          ? 'bg-amber-500/10 border-amber-500/40 text-[var(--text-primary)] shadow-xs'
                          : isFallback
                          ? 'bg-blue-500/10 border-blue-500/30 text-[var(--text-primary)]'
                          : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-[var(--text-primary)] truncate block">{item.name}</span>
                            <span className="text-[9px] font-mono text-[var(--text-secondary)] truncate block">{item.id}</span>
                          </div>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--surface-card)] border border-[var(--border-subtle)] shrink-0">
                            {item.provider}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleTestSingleModel(item.id)}
                          disabled={isTesting || !aiConfig.apiKey}
                          className="p-1 rounded-md border border-[var(--border-subtle)] hover:bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer disabled:opacity-40"
                          title="Testar conectividade com esta IA"
                        >
                          {isTesting ? <RefreshCw className="w-3 h-3 animate-spin text-amber-500" /> : <Play className="w-3 h-3" />}
                        </button>

                        <div className="flex items-center gap-1.5 ml-auto">
                          {isPrimary ? (
                            <span className="text-[10px] font-black text-amber-500 px-2 py-0.5">
                              ⭐ Ativo
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated: AiProviderConfig = {
                                    ...aiConfig,
                                    primaryModel: item.id
                                  };
                                  AiService.saveConfig(updated);
                                  setAiConfig(updated);
                                  setActionSuccessMsg(`Modelo primário alterado para ${item.name}.`);
                                  setTimeout(() => setActionSuccessMsg(''), 3000);
                                }}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-md border border-amber-500/50 text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                              >
                                Tornar Primário
                              </button>

                              {!isFallback ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const fallbacks = aiConfig.fallbackModels || [];
                                    if (!fallbacks.includes(item.id)) {
                                      const updated: AiProviderConfig = {
                                        ...aiConfig,
                                        fallbackModels: [...fallbacks, item.id]
                                      };
                                      AiService.saveConfig(updated);
                                      setAiConfig(updated);
                                    }
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[var(--surface-card)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer"
                                >
                                  + Contingência
                                </button>
                              ) : (
                                <span className="text-[9px] font-bold text-blue-400 px-1.5 py-0.5">
                                  ✓ Na Cadeia
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
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
