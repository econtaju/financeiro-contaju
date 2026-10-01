import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  FileJson,
  Users, 
  Building2, 
  Wallet, 
  RefreshCw,
  Info,
  ShieldAlert
} from 'lucide-react';
import { storage } from '../../services/storageService';

export const BackupView: React.FC = () => {
  const [lastBackupInfo, setLastBackupInfo] = useState<{ filename: string; date: string; sizeKb: number } | null>(() => {
    try {
      const saved = localStorage.getItem('contaju_last_backup_info');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<{
    system?: string;
    version?: string;
    exportedAt?: string;
    stats?: Record<string, number>;
  } | null>(null);
  const [restoreJsonContent, setRestoreJsonContent] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Escuta atualizações do storage
  useEffect(() => {
    return storage.subscribe(() => setRefreshKey(k => k + 1));
  }, []);

  // Dados atuais para exibição das estatísticas
  const titles = storage.getTitles();
  const contracts = storage.getContracts();
  const counterparties = storage.getCounterparties();
  const movements = storage.getMovements();
  const bankAccounts = storage.getBankAccounts();
  const company = storage.getCompany();

  // Tratador de Exportação
  const handleExportBackup = () => {
    try {
      const result = storage.downloadBackupFile();
      const backupInfo = {
        filename: result.filename,
        date: new Date().toLocaleString('pt-BR'),
        sizeKb: result.sizeKb
      };
      setLastBackupInfo(backupInfo);
      localStorage.setItem('contaju_last_backup_info', JSON.stringify(backupInfo));

      setNotification({
        type: 'success',
        text: `Arquivo "${result.filename}" (${result.sizeKb} KB) exportado e salvo com sucesso!`
      });
      setTimeout(() => setNotification(null), 6000);
    } catch (err) {
      setNotification({
        type: 'error',
        text: 'Erro ao gerar o arquivo de backup. Verifique as permissões do navegador.'
      });
    }
  };

  // Tratador de Seleção de Arquivo para Restauração
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setNotification({
        type: 'error',
        text: 'Por favor, selecione um arquivo válido no formato .JSON de backup.'
      });
      return;
    }

    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setRestoreJsonContent(text);
        const parsed = JSON.parse(text);

        // Preview dos metadados
        setRestorePreview({
          system: parsed.system || 'Backup Compatível',
          version: parsed.version || '1.0',
          exportedAt: parsed.exportedAt || 'Data não especificada',
          stats: parsed.stats || (parsed.data ? {
            'Títulos': parsed.data.TITLES?.length || 0,
            'Contratos': parsed.data.CONTRACTS?.length || 0,
            'Clientes/Fornecedores': parsed.data.COUNTERPARTIES?.length || 0
          } : undefined)
        });
      } catch (err) {
        setNotification({
          type: 'error',
          text: 'O arquivo selecionado não contém um JSON válido.'
        });
        setRestoreFile(null);
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Execução da Restauração
  const handleConfirmRestore = () => {
    if (!restoreJsonContent) return;
    setIsRestoring(true);

    try {
      const res = storage.importFullBackup(restoreJsonContent);
      if (res.success) {
        setNotification({
          type: 'success',
          text: res.message
        });
        setRestoreFile(null);
        setRestorePreview(null);
        setRestoreJsonContent('');
      } else {
        setNotification({
          type: 'error',
          text: res.message
        });
      }
    } catch {
      setNotification({
        type: 'error',
        text: 'Falha durante a restauração do banco de dados.'
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#131720] p-5 rounded-2xl border border-slate-200 dark:border-[#273040] shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Backup & Segurança da Base de Dados
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  Armazenamento Ativo
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Exporte uma cópia completa de segurança em formato JSON para salvar no seu computador ou restaure dados anteriores.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportBackup}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2 text-xs"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Backup (.JSON)</span>
        </button>
      </div>

      {/* Notificação Flutuante ou Inline */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-semibold ${
          notification.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            : notification.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{notification.text}</span>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid: Estatísticas do Banco de Dados Atual & Último Backup */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Resumo da Base Atual */}
        <div className="md:col-span-2 bg-white dark:bg-[#131720] p-6 rounded-2xl border border-slate-200 dark:border-[#273040] shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#273040] pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Conteúdo Incluído no Backup
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Empresa: {company.tradeName || 'Escritório Contábil'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200/80 dark:border-[#273040]">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Títulos Fin.</span>
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{titles.length}</div>
              <div className="text-[10px] text-slate-500">Pagar e Receber</div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200/80 dark:border-[#273040]">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Contratos</span>
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{contracts.length}</div>
              <div className="text-[10px] text-slate-500">Recorrentes (MRR)</div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200/80 dark:border-[#273040]">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Cadastros</span>
                <Users className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{counterparties.length}</div>
              <div className="text-[10px] text-slate-500">Clientes & Fornecedores</div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200/80 dark:border-[#273040]">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Extratos/Caixa</span>
                <Wallet className="w-3.5 h-3.5 text-cyan-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{movements.length}</div>
              <div className="text-[10px] text-slate-500">Movimentações ativas</div>
            </div>
          </div>

          <div className="p-3.5 bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start space-x-3 text-xs text-amber-900 dark:text-amber-200">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Backup 100% Completo e Portável</p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                O arquivo gerado inclui todas as tabelas: Plano de Contas, Regras de Recorrência, Usuários, Fechamentos, Cartões de Crédito e Histórico de Auditoria.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Status do Último Backup & Ação Rápida */}
        <div className="bg-white dark:bg-[#131720] p-6 rounded-2xl border border-slate-200 dark:border-[#273040] shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-[#273040] pb-3">
              <Clock className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Última Cópia Local Salva
              </h2>
            </div>

            {lastBackupInfo ? (
              <div className="mt-4 space-y-2 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200 dark:border-[#273040] space-y-1">
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate" title={lastBackupInfo.filename}>
                    {lastBackupInfo.filename}
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>Exportado em:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{lastBackupInfo.date}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>Tamanho do arquivo:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{lastBackupInfo.sizeKb} KB</span>
                  </div>
                </div>
                <div className="flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Cópia de segurança disponível no seu dispositivo
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-4 text-xs text-slate-500 dark:text-slate-400">
                <FileJson className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
                <p>Nenhum backup baixado nesta sessão.</p>
                <p className="text-[11px] text-slate-400 mt-1">Clique no botão abaixo para gerar sua primeira cópia.</p>
              </div>
            )}
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full py-2.5 bg-slate-900 dark:bg-[#1B212D] hover:bg-slate-800 dark:hover:bg-[#222938] text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Cópia de Segurança (.JSON)</span>
          </button>
        </div>

      </div>

      {/* Seção 2: Restauração de Backup */}
      <div className="bg-white dark:bg-[#131720] p-6 rounded-2xl border border-slate-200 dark:border-[#273040] shadow-2xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-[#273040] pb-3">
          <Upload className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Restaurar Base de Dados a Partir de um Arquivo .JSON
          </h2>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Caso precise recuperar os dados salvos anteriormente em outro computador ou restabelecer um ponto de restauração, selecione o arquivo JSON de backup exportado pelo sistema.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          
          {/* Upload Drop Area */}
          <div className="border-2 border-dashed border-slate-300 dark:border-[#273040] hover:border-amber-500 dark:hover:border-amber-500/60 rounded-2xl p-6 text-center transition-colors">
            <input
              type="file"
              id="backupFileInput"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="backupFileInput" className="cursor-pointer block space-y-2">
              <FileJson className="w-10 h-10 mx-auto text-amber-500/80" />
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {restoreFile ? restoreFile.name : 'Clique para selecionar o arquivo .JSON de backup'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {restoreFile ? `${(restoreFile.size / 1024).toFixed(1)} KB` : 'Formato suportado: backup-*.json'}
              </div>
            </label>
          </div>

          {/* Preview & Confirmação */}
          <div className="bg-slate-50 dark:bg-[#1B212D] p-5 rounded-2xl border border-slate-200 dark:border-[#273040] space-y-3">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Pré-visualização do Arquivo</span>
              {restorePreview && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50">
                  Estrutura Válida
                </span>
              )}
            </div>

            {restorePreview ? (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Sistema: </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{restorePreview.system}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Versão: </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{restorePreview.version}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Data de Exportação: </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{restorePreview.exportedAt}</span>
                  </div>
                </div>

                {restorePreview.stats && (
                  <div className="pt-2 border-t border-slate-200 dark:border-[#273040] flex flex-wrap gap-2">
                    {Object.entries(restorePreview.stats).map(([k, v]) => (
                      <span key={k} className="text-[10px] bg-white dark:bg-[#131720] px-2 py-1 rounded border border-slate-200 dark:border-[#273040] font-mono text-slate-700 dark:text-slate-300">
                        {k}: <strong>{v}</strong>
                      </span>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-[11px] text-rose-800 dark:text-rose-300 flex items-start space-x-2 mt-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    Atenção: A restauração substituirá os registros atuais pela versão do arquivo importado.
                  </span>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleConfirmRestore}
                    disabled={isRestoring}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center space-x-2"
                  >
                    {isRestoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>Confirmar e Restaurar Dados</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">
                Selecione um arquivo de backup para visualizar os detalhes antes de restaurar.
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
