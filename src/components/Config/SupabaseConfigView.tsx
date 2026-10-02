import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Key,
  Globe,
  UploadCloud,
  DownloadCloud,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
  Code2,
  FileText,
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseCustomConfig,
  testSupabaseConnection,
  isSupabaseConfigured,
  ConnectionTestResult
} from '../../services/supabaseClient';
import { supabaseSync, SyncResult } from '../../services/supabaseSyncService';
import { storage } from '../../services/storageService';

export const SupabaseConfigView: React.FC = () => {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [urlInput, setUrlInput] = useState(config.url);
  const [keyInput, setKeyInput] = useState(config.anonKey);
  const [autoSyncInput, setAutoSyncInput] = useState(config.autoSync);
  const [showKey, setShowKey] = useState(false);

  // Status de Teste
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // Status de Sincronização
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncType, setSyncType] = useState<'push' | 'pull' | null>(null);

  // Notificações e feedback
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlViewer, setShowSqlViewer] = useState(false);
  const [sqlContent, setSqlContent] = useState<string>('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const lastSyncTime = supabaseSync.getLastSyncTime();

  useEffect(() => {
    const current = getSupabaseConfig();
    setConfig(current);
    setUrlInput(current.url);
    setKeyInput(current.anonKey);
    setAutoSyncInput(current.autoSync);
  }, []);

  const handleSaveConfig = () => {
    try {
      saveSupabaseConfig(urlInput.trim(), keyInput.trim(), autoSyncInput);
      const updated = getSupabaseConfig();
      setConfig(updated);
      setTestResult(null);
      setNotice({
        type: 'success',
        text: 'Configurações do Supabase salvas com sucesso!'
      });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setNotice({
        type: 'error',
        text: 'Erro ao salvar configurações do Supabase.'
      });
    }
  };

  const handleClearConfig = () => {
    clearSupabaseCustomConfig();
    const updated = getSupabaseConfig();
    setConfig(updated);
    setUrlInput(updated.url);
    setKeyInput(updated.anonKey);
    setAutoSyncInput(updated.autoSync);
    setTestResult(null);
    setNotice({
      type: 'info',
      text: 'Configurações personalizadas foram limpas.'
    });
    setTimeout(() => setNotice(null), 4000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Salva temporariamente para testar
      if (urlInput.trim() !== config.url || keyInput.trim() !== config.anonKey) {
        saveSupabaseConfig(urlInput.trim(), keyInput.trim(), autoSyncInput);
        setConfig(getSupabaseConfig());
      }
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: `Falha ao executar teste: ${err instanceof Error ? err.message : String(err)}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePushToSupabase = async () => {
    if (!isSupabaseConfigured()) {
      setNotice({
        type: 'error',
        text: 'Configure a URL e a Anon Key antes de sincronizar.'
      });
      return;
    }

    setIsSyncing(true);
    setSyncType('push');
    setSyncResult(null);
    try {
      const res = await supabaseSync.syncAllToSupabase();
      setSyncResult(res);
      if (res.success) {
        setNotice({
          type: 'success',
          text: `Sucesso! ${res.stats?.totalRecords || 0} registros foram sincronizados com o Supabase.`
        });
      } else {
        setNotice({
          type: 'error',
          text: res.message
        });
      }
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: `Erro ao enviar dados: ${err instanceof Error ? err.message : String(err)}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSupabase = async () => {
    if (!isSupabaseConfigured()) {
      setNotice({
        type: 'error',
        text: 'Configure a URL e a Anon Key antes de puxar dados.'
      });
      return;
    }

    if (!window.confirm('Atenção: Ao baixar dados do Supabase, o armazenamento local será atualizado com as informações remotas. Deseja continuar?')) {
      return;
    }

    setIsSyncing(true);
    setSyncType('pull');
    setSyncResult(null);
    try {
      const res = await supabaseSync.pullAllFromSupabase();
      setSyncResult(res);
      if (res.success) {
        setNotice({
          type: 'success',
          text: `Sucesso! ${res.stats?.totalRecords || 0} registros foram baixados do Supabase.`
        });
      } else {
        setNotice({
          type: 'error',
          text: res.message
        });
      }
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        text: `Erro ao puxar dados: ${err instanceof Error ? err.message : String(err)}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySchemaSql = async () => {
    try {
      // Carrega o conteúdo do schema
      const sql = await getSqlSchemaString();
      await navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      setNotice({
        type: 'success',
        text: 'Script SQL (schema.sql) copiado para a área de transferência! Cole no SQL Editor do Supabase.'
      });
      setTimeout(() => setCopiedSql(false), 3000);
      setTimeout(() => setNotice(null), 5000);
    } catch {
      setNotice({
        type: 'error',
        text: 'Não foi possível copiar o script SQL para a área de transferência.'
      });
    }
  };

  const handleToggleViewSql = async () => {
    if (!showSqlViewer) {
      const sql = await getSqlSchemaString();
      setSqlContent(sql);
    }
    setShowSqlViewer(!showSqlViewer);
  };

  // Helper para carregar o SQL
  async function getSqlSchemaString(): Promise<string> {
    try {
      const resp = await fetch('/supabase/schema.sql');
      if (resp.ok) {
        return await resp.text();
      }
    } catch {
      // fallback
    }
    // Fallback instrução padrão caso arquivo estático não seja servido via HTTP
    return `-- Abra o arquivo supabase/schema.sql na raiz do projeto para visualizar o schema completo de todas as 24 tabelas, RLS e triggers.`;
  }

  const isConfigured = Boolean(config.url && config.anonKey);

  return (
    <div className="space-y-6">
      {/* Notificação Flutuante */}
      {notice && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : notice.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : notice.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-xs opacity-75 hover:opacity-100 underline ml-4"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header do Supabase */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--surface-card)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  Banco de Dados Supabase (PostgreSQL Cloud)
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                  OFICIAL
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Conecte seu sistema financeiro a um banco de dados relacional na nuvem com PostgreSQL, alta disponibilidade e backups automatizados.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              isConfigured
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
            }`}
          >
            {isConfigured ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Configurado ({config.source === 'env' ? '.env' : 'Navegador'})
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Pendente de Configuração
              </>
            )}
          </span>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[var(--surface-input)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] flex items-center gap-1.5 transition-colors"
          >
            <span>Painel Supabase</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Cards de Métricas / Diagnóstico Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Status da Conexão</span>
            <Server className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                testResult?.success ? 'bg-emerald-500 animate-pulse' : isConfigured ? 'bg-blue-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {testResult?.success
                ? 'Conectado e Operacional'
                : isConfigured
                ? 'Credenciais Carregadas'
                : 'Aguardando Credenciais'}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
            {testResult?.latencyMs ? `Latência: ${testResult.latencyMs}ms` : 'Clique em "Testar Conexão"'}
          </p>
        </div>

        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Última Sincronização</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-sm font-bold text-[var(--text-primary)]">
            {lastSyncTime ? new Date(lastSyncTime).toLocaleString('pt-BR') : 'Nenhuma realizada'}
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
            {config.autoSync ? 'Sincronização contínua ativada' : 'Sincronização manual'}
          </p>
        </div>

        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Tabelas Relacionais</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-sm font-bold text-[var(--text-primary)]">
            24 Tabelas Mapeadas
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
            Schema pronto com RLS e Triggers
          </p>
        </div>

        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Origem dos Dados</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-sm font-bold text-[var(--text-primary)]">
            Híbrido (Offline-First)
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
            Cache local + Nuvem Supabase
          </p>
        </div>
      </div>

      {/* Formulário de Credenciais */}
      <div className="bg-[var(--surface-card)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              Credenciais do Projeto Supabase
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Obtidas em <strong>Project Settings &gt; API</strong> no painel do Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearConfig}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-rose-600 hover:border-rose-400 transition-colors"
            >
              Limpar Campos
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                Project URL (VITE_SUPABASE_URL)
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">Ex: https://xxxx.supabase.co</span>
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://seu-projeto.supabase.co"
              className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-[var(--surface-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                Anon / Public Key (VITE_SUPABASE_ANON_KEY)
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">Chave pública (anon)</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full text-xs font-mono px-3.5 py-2.5 pr-10 rounded-xl bg-[var(--surface-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-md"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Checkbox Auto-Sync */}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSyncInput}
              onChange={e => setAutoSyncInput(e.target.checked)}
              className="rounded-md border-[var(--border-subtle)] text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-medium text-[var(--text-primary)]">
              Sincronização em Segundo Plano Automática (Auto-Sync após alterações)
            </span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveConfig}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Salvar Credenciais
            </button>
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2 rounded-xl bg-[var(--surface-input)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
            </button>
          </div>
        </div>

        {/* Feedback do Teste de Conexão */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 mt-3 animate-in fade-in duration-200 ${
              testResult.success
                ? testResult.databaseFound === false
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                {testResult.success ? (
                  testResult.databaseFound === false ? (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                {testResult.message}
              </span>
              {testResult.latencyMs && (
                <span className="text-[10px] font-mono opacity-80">{testResult.latencyMs}ms</span>
              )}
            </div>

            {testResult.missingTables && testResult.missingTables.length > 0 && (
              <div className="pt-1 text-[11px] leading-relaxed">
                <p>
                  <strong>Ação Recomendada:</strong> As tabelas ainda não foram criadas no banco de dados.
                  Clique no botão <strong>"Copiar Script SQL (schema.sql)"</strong> abaixo, acesse o{' '}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-bold"
                  >
                    SQL Editor do Supabase
                  </a>
                  , cole e clique em <strong>Run</strong>.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Operações de Sincronização Bidirecional */}
      <div className="bg-[var(--surface-card)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-500" />
            Sincronização de Dados e Migração
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Envie sua base de dados atual para a nuvem do Supabase ou puxe dados do servidor remoto.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Card Push */}
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-amber-500" />
                  Enviar Local &gt; Supabase (Push / Seed)
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                  Recomendado na Inicialização
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Migra todos os títulos, contas bancárias, clientes, contratos, faturamento e planos para o Supabase PostgreSQL usando comandos <code>UPSERT</code> sem sobrescrever dados acidentalmente.
              </p>
            </div>

            <button
              onClick={handlePushToSupabase}
              disabled={isSyncing}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <UploadCloud className={`w-4 h-4 ${isSyncing && syncType === 'push' ? 'animate-bounce' : ''}`} />
              <span>{isSyncing && syncType === 'push' ? 'Enviando Dados...' : 'Migrar / Enviar para o Supabase'}</span>
            </button>
          </div>

          {/* Card Pull */}
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <DownloadCloud className="w-4 h-4 text-emerald-500" />
                  Puxar Supabase &gt; Local (Pull)
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                  Restauração Remota
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Baixa os dados centralizados do Supabase para atualizar o cache local do seu navegador, ideal ao acessar em outro computador ou equipe.
              </p>
            </div>

            <button
              onClick={handlePullFromSupabase}
              disabled={isSyncing}
              className="w-full py-2.5 rounded-xl bg-[var(--surface-input)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] disabled:opacity-50 text-[var(--text-primary)] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <DownloadCloud className={`w-4 h-4 ${isSyncing && syncType === 'pull' ? 'animate-bounce' : ''}`} />
              <span>{isSyncing && syncType === 'pull' ? 'Baixando Dados...' : 'Puxar Dados do Supabase'}</span>
            </button>
          </div>
        </div>

        {/* Estatísticas da Sincronização */}
        {syncResult && (
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-[var(--text-primary)]">{syncResult.message}</span>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{syncResult.durationMs}ms</span>
            </div>

            {syncResult.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
                <div className="bg-[var(--surface-card)] p-2 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-tertiary)] block">Títulos Financeiros:</span>
                  <span className="font-bold text-[var(--text-primary)]">{syncResult.stats.titles}</span>
                </div>
                <div className="bg-[var(--surface-card)] p-2 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-tertiary)] block">Contratos:</span>
                  <span className="font-bold text-[var(--text-primary)]">{syncResult.stats.contracts}</span>
                </div>
                <div className="bg-[var(--surface-card)] p-2 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-tertiary)] block">Clientes/Fornec.:</span>
                  <span className="font-bold text-[var(--text-primary)]">{syncResult.stats.counterparties}</span>
                </div>
                <div className="bg-[var(--surface-card)] p-2 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-tertiary)] block">Contas Bancárias:</span>
                  <span className="font-bold text-[var(--text-primary)]">{syncResult.stats.bankAccounts}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Seção do Script SQL (schema.sql) */}
      <div className="bg-[var(--surface-card)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-500" />
              Script SQL de Criação de Tabelas (DDL)
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Script completo pronto para ser executado no SQL Editor do Supabase contendo 24 tabelas, índices, triggers e RLS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleViewSql}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-input)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showSqlViewer ? 'Ocultar Script' : 'Visualizar SQL'}</span>
            </button>

            <button
              onClick={handleCopySchemaSql}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copiado!' : 'Copiar Script SQL'}</span>
            </button>
          </div>
        </div>

        {/* Guia Rápido 1-2-3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] space-y-1">
            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Copiar o Script SQL</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] pl-6 leading-relaxed">
              Clique no botão acima "Copiar Script SQL" para ter todas as tabelas em seu clipboard.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] space-y-1">
            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Executar no Supabase</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] pl-6 leading-relaxed">
              No painel do Supabase, acesse a aba <strong>SQL Editor</strong>, cole o código e clique em <strong>Run</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] space-y-1">
            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Testar e Sincronizar</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] pl-6 leading-relaxed">
              Retorne a esta página, clique em <strong>Testar Conexão</strong> e depois em <strong>Migrar / Enviar</strong>.
            </p>
          </div>
        </div>

        {/* Visualizador de SQL Expandido */}
        {showSqlViewer && (
          <div className="mt-3 p-4 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 text-xs font-mono max-h-96 overflow-y-auto space-y-1 select-all">
            <pre className="whitespace-pre-wrap">{sqlContent}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
