import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Key, 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Play, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Clock, 
  Zap, 
  Check, 
  X, 
  Plus, 
  Sliders, 
  Activity,
  FileCheck,
  TrendingUp,
  Server
} from 'lucide-react';
import { AiProviderConfig, AiModelChainItem } from '../../types';
import { AiService, KNOWN_OPENCODE_MODELS } from '../../services/aiService';
import { storage } from '../../services/storageService';
import { formatBRL, formatDateBR } from '../../services/financialEngine';

export const AiConfigView: React.FC = () => {
  const [config, setConfig] = useState<AiProviderConfig>(() => AiService.getConfig());
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  
  // Estado de teste de conexão por modelo
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, {
    success: boolean;
    latencyMs: number;
    message: string;
    statusCode?: number;
  }>>({});

  const [availableModels] = useState<AiModelChainItem[]>(KNOWN_OPENCODE_MODELS);
  const [customModelInput, setCustomModelInput] = useState('');

  // Sincroniza estado com o storage
  useEffect(() => {
    setConfig(AiService.getConfig());
  }, []);

  const handleSave = () => {
    AiService.saveConfig(config);
    setSaveSuccessMsg('Configurações da IA salvas com sucesso!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Move modelo para cima ou para baixo na cadeia
  const handleMoveModel = (index: number, direction: 'UP' | 'DOWN') => {
    const allModels = [config.primaryModel, ...config.fallbackModels];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= allModels.length) return;

    const updated = [...allModels];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setConfig({
      ...config,
      primaryModel: updated[0],
      fallbackModels: updated.slice(1)
    });
  };

  // Remove modelo da cadeia
  const handleRemoveModel = (modelIdToRemove: string) => {
    const allModels = [config.primaryModel, ...config.fallbackModels];
    if (allModels.length <= 1) {
      alert('A cadeia de contingência deve possuir ao menos 1 modelo.');
      return;
    }

    const filtered = allModels.filter(m => m !== modelIdToRemove);
    setConfig({
      ...config,
      primaryModel: filtered[0],
      fallbackModels: filtered.slice(1)
    });
  };

  // Adiciona modelo à cadeia
  const handleAddModel = (modelIdToAdd: string) => {
    const allModels = [config.primaryModel, ...config.fallbackModels];
    if (allModels.includes(modelIdToAdd)) return;

    setConfig({
      ...config,
      fallbackModels: [...config.fallbackModels, modelIdToAdd]
    });
  };

  // Adiciona modelo customizado digitado
  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customModelInput.trim();
    if (!clean) return;
    handleAddModel(clean);
    setCustomModelInput('');
  };

  // Testa conexão com um modelo específico
  const handleTestConnection = async (modelId: string) => {
    setTestingModelId(modelId);
    try {
      const res = await AiService.testModelConnection(modelId, config.apiKey, config.endpointUrl);
      setTestResults(prev => ({ ...prev, [modelId]: res }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [modelId]: { success: false, latencyMs: 0, message: err.message || 'Erro inesperado' }
      }));
    } finally {
      setTestingModelId(null);
    }
  };

  // Testa todos os modelos da cadeia sequencialmente
  const handleTestAllModels = async () => {
    const chain = [config.primaryModel, ...config.fallbackModels];
    for (const model of chain) {
      await handleTestConnection(model);
    }
  };

  const chainList = [config.primaryModel, ...config.fallbackModels];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in">
      
      {/* Header com identidade executiva */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#131720] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-xs">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Inteligência Artificial & Conector OpenCode
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                Multi-Model Failover Ativo
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Conecte suas IAs da OpenCode e defina a ordem de contingência para garantir produtividade máxima sem interrupções.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Salvar Configurações</span>
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center text-xs text-emerald-800 dark:text-emerald-300 font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Card 1: Credenciais e Conexão da OpenCode */}
      <div className="bg-white dark:bg-[#131720] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Credenciais da API OpenCode
            </h2>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {config.enabled ? 'Recursos de IA Habilitados' : 'Recursos de IA Desativados'}
            </span>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              API Key da OpenCode:
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="Ex: opencode_sk_live_..."
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#19202D] text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                title={showApiKey ? 'Ocultar chave' : 'Exibir chave'}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              Sua chave é armazenada de forma segura no seu navegador/banco e nunca é compartilhada externamente.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Endpoint da API OpenCode:
              </label>
              <button
                type="button"
                onClick={() => setConfig({ ...config, endpointUrl: 'https://api.opencode.ai/v1' })}
                className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-semibold"
              >
                Restaurar Padrão
              </button>
            </div>
            <input
              type="text"
              value={config.endpointUrl}
              onChange={(e) => setConfig({ ...config, endpointUrl: e.target.value })}
              placeholder="https://api.opencode.ai/v1"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#19202D] text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              Compatível com o protocolo padrão OpenAI / OpenCode Chat Completions.
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Cadeia de Modelos & Contingência (Failover Engine) */}
      <div className="bg-white dark:bg-[#131720] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-amber-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Cadeia de Contingência dos Modelos (Ordem de Execução)</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                O sistema tentará os modelos nesta ordem. Se o primeiro falhar por indisponibilidade ou rate limit, o segundo assume automaticamente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestAllModels}
            disabled={!config.apiKey || Boolean(testingModelId)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 hover:bg-purple-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-purple-500" />
            <span>Testar Toda a Cadeia</span>
          </button>
        </div>

        {/* Lista de Modelos da Cadeia Atual */}
        <div className="space-y-2.5">
          {chainList.map((modelId, index) => {
            const isPrimary = index === 0;
            const meta = availableModels.find(m => m.id === modelId);
            const testResult = testResults[modelId];
            const isTesting = testingModelId === modelId;

            return (
              <div 
                key={modelId}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                  isPrimary
                    ? 'border-amber-500/50 bg-amber-50/20 dark:bg-amber-950/15 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#18202F]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isPrimary
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {index + 1}º
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {meta?.name || modelId}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {modelId}
                      </span>
                      {isPrimary ? (
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500 text-slate-950 shadow-2xs">
                          ⭐ Modelo Primário
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                          Contingência #{index}
                        </span>
                      )}
                    </div>
                    {meta?.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {meta.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status do Teste & Controles de Reordenação */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {testResult && (
                    <div className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                      testResult.success
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                    }`}>
                      {testResult.success ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Ativo ({testResult.latencyMs}ms)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          <span title={testResult.message}>Falhou</span>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleTestConnection(modelId)}
                    disabled={!config.apiKey || isTesting}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
                    title={`Testar conectividade com ${modelId}`}
                  >
                    {isTesting ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveModel(index, 'UP')}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Aumentar prioridade"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveModel(index, 'DOWN')}
                    disabled={index === chainList.length - 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Diminuir prioridade"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveModel(modelId)}
                    disabled={chainList.length <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remover modelo da cadeia"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Adicionar outros modelos à cadeia */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Adicionar Modelos Conhecidos da OpenCode à Cadeia:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableModels
              .filter(m => !chainList.includes(m.id))
              .map(model => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => handleAddModel(model.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 hover:text-amber-500 dark:hover:bg-amber-500/15 dark:hover:text-amber-300 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{model.name}</span>
                </button>
              ))}
          </div>

          <form onSubmit={handleAddCustomModel} className="flex gap-2 pt-2">
            <input
              type="text"
              value={customModelInput}
              onChange={(e) => setCustomModelInput(e.target.value)}
              placeholder="Ou digite o ID de outro modelo suportado pela OpenCode (ex: mistral-large, gemini-2.0-flash)"
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#19202D] text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customModelInput.trim()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white cursor-pointer disabled:opacity-40"
            >
              Adicionar
            </button>
          </form>
        </div>
      </div>

      {/* Card 3: Auditoria do Último Evento de Failover */}
      {config.lastFailoverEvent && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-300/60 dark:border-amber-800/60 p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>Última Contingência Automática Executada com Sucesso</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
              <span className="text-[10px] text-slate-500 block">Horário</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {new Date(config.lastFailoverEvent.timestamp).toLocaleTimeString('pt-BR')}
              </span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
              <span className="text-[10px] text-slate-500 block">Modelo Indisponível</span>
              <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                {config.lastFailoverEvent.fromModel}
              </span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
              <span className="text-[10px] text-slate-500 block">Modelo que Assumiu</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {config.lastFailoverEvent.toModel}
              </span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
              <span className="text-[10px] text-slate-500 block">Motivo / Recurso</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block" title={config.lastFailoverEvent.reason}>
                {config.lastFailoverEvent.feature} ({config.lastFailoverEvent.reason})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Card 4: Casos de Uso e Recursos de Produtividade */}
      <div className="bg-white dark:bg-[#131720] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Recursos Inteligentes de Produtividade no Sistema
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161C26] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Conciliação Bancária</span>
              </div>
              <input
                type="checkbox"
                checked={config.enableAutoReconciliation}
                onChange={(e) => setConfig({ ...config, enableAutoReconciliation: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Decodifica MEMOs criptográficos de extratos bancários e sugere a categoria da DRE e favorecido com 1 clique.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161C26] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Briefing Diário</span>
              </div>
              <input
                type="checkbox"
                checked={config.enableDailyBriefing}
                onChange={(e) => setConfig({ ...config, enableDailyBriefing: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Gera resumo executivo matinal no Dashboard com saldo projetado, compromissos prioritários e metas de liquidez.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161C26] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Antifraude & Auditoria</span>
              </div>
              <input
                type="checkbox"
                checked={config.enableAnomalyDetection}
                onChange={(e) => setConfig({ ...config, enableAnomalyDetection: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Detecta potenciais pagamentos duplicados de fornecedores e divergências entre extratos bancários e ERP.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
