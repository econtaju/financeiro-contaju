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
  ShieldAlert,
  Mail,
  Send,
  Calendar,
  Check,
  Sparkles,
  Play,
  Lock,
  Archive,
  FolderDown,
  Shield,
  RotateCcw,
  Trash2,
  History,
  Search
} from 'lucide-react';
import { storage, DeletedRecordVaultEntry } from '../../services/storageService';
import { automaticBackupService, AutoBackupConfig, WeeklyLocalSnapshot } from '../../services/automaticBackupService';

export const BackupView: React.FC = () => {
  const [lastBackupInfo, setLastBackupInfo] = useState<{ filename: string; date: string; sizeKb: number } | null>(() => {
    try {
      const saved = localStorage.getItem('contaju_last_backup_info');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [autoConfig, setAutoConfig] = useState<AutoBackupConfig>(() => automaticBackupService.getConfig());
  const [recipientsInput, setRecipientsInput] = useState<string>(() => autoConfig.recipients.join(', '));
  const [selectedDay, setSelectedDay] = useState<number>(autoConfig.dayOfWeek);
  const [selectedTime, setSelectedTime] = useState<string>(autoConfig.timeOfDay);
  const [isSendingEmailNow, setIsSendingEmailNow] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [weeklySnapshots, setWeeklySnapshots] = useState<WeeklyLocalSnapshot[]>(() => automaticBackupService.getWeeklyLocalSnapshots());

  const [vaultEntries, setVaultEntries] = useState<DeletedRecordVaultEntry[]>(() => storage.getDeletedVault());
  const [safetySnapshot, setSafetySnapshot] = useState<{ label: string; timestamp: string; data: string } | null>(() => storage.getSafetySnapshot());
  const [vaultFilter, setVaultFilter] = useState<'ALL' | 'PENDING' | 'RESTORED'>('ALL');
  const [vaultSearch, setVaultSearch] = useState('');
  const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false);
  const [restoringEntryId, setRestoringEntryId] = useState<string | null>(null);

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

  // Escuta atualizações do storage e configurações
  useEffect(() => {
    return storage.subscribe(() => {
      setRefreshKey(k => k + 1);
      const latestConfig = automaticBackupService.getConfig();
      setAutoConfig(latestConfig);
      setWeeklySnapshots(automaticBackupService.getWeeklyLocalSnapshots());
      setVaultEntries(storage.getDeletedVault());
      setSafetySnapshot(storage.getSafetySnapshot());
    });
  }, []);

  const handleRestoreVaultEntry = (entry: DeletedRecordVaultEntry) => {
    setRestoringEntryId(entry.id);
    try {
      const res = storage.restoreFromDeletedVault(entry.id);
      if (res.success) {
        setNotification({
          type: 'success',
          text: res.message
        });
        setVaultEntries(storage.getDeletedVault());
      } else {
        setNotification({
          type: 'error',
          text: res.message
        });
      }
    } finally {
      setRestoringEntryId(null);
    }
  };

  const handleDeleteVaultEntry = (entryId: string) => {
    if (window.confirm('Tem certeza que deseja remover este item permanentemente do cofre de segurança?')) {
      storage.deleteVaultEntry(entryId);
      setVaultEntries(storage.getDeletedVault());
      setNotification({
        type: 'info',
        text: 'Registro removido permanentemente do cofre.'
      });
    }
  };

  const handleClearVault = () => {
    if (window.confirm('Atenção: Deseja realmente esvaziar todo o cofre de segurança? Registros arquivados não poderão mais ser recuperados por esta tela.')) {
      storage.clearDeletedVault();
      setVaultEntries([]);
      setNotification({
        type: 'info',
        text: 'Cofre de segurança esvaziado com sucesso.'
      });
    }
  };

  const handleRestoreSafetySnapshot = () => {
    if (!safetySnapshot) return;
    if (window.confirm(`Tem certeza que deseja reverter o sistema para o ponto de emergência "${safetySnapshot.label}" criado em ${new Date(safetySnapshot.timestamp).toLocaleString('pt-BR')}? Os dados serão restaurados para o momento anterior à operação.`)) {
      setIsRestoringSnapshot(true);
      try {
        const res = storage.restoreSafetySnapshot();
        if (res.success) {
          setNotification({
            type: 'success',
            text: `Base de dados restaurada com sucesso para o ponto de emergência! ${res.keysRestored || 0} áreas foram recuperadas.`
          });
          setSafetySnapshot(storage.getSafetySnapshot());
        } else {
          setNotification({
            type: 'error',
            text: res.message
          });
        }
      } finally {
        setIsRestoringSnapshot(false);
      }
    }
  };

  const handleToggleAutoBackup = () => {
    const nextState = !autoConfig.enabled;
    const updated = automaticBackupService.saveConfig({ enabled: nextState });
    setAutoConfig(updated);
    setNotification({
      type: 'info',
      text: nextState 
        ? 'Rotina de backup semanal por e-mail ATIVADA com sucesso! O sistema fará os envios automaticamente.'
        : 'Rotina de backup semanal por e-mail desativada.'
    });
  };

  const handleSaveEmailConfig = () => {
    setIsSavingConfig(true);
    const splitRecipients = recipientsInput
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0 && e.includes('@'));

    if (splitRecipients.length === 0) {
      setNotification({
        type: 'error',
        text: 'Por favor, informe ao menos um e-mail válido para receber o backup.'
      });
      setIsSavingConfig(false);
      return;
    }

    const updated = automaticBackupService.saveConfig({
      recipients: splitRecipients,
      dayOfWeek: selectedDay,
      timeOfDay: selectedTime
    });
    setAutoConfig(updated);
    setRecipientsInput(updated.recipients.join(', '));
    setIsSavingConfig(false);
    setNotification({
      type: 'success',
      text: 'Configuração da rotina semanal de backup salva com sucesso!'
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleTriggerEmailBackupNow = async () => {
    setIsSendingEmailNow(true);
    try {
      const splitRecipients = recipientsInput
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(e => e.length > 0 && e.includes('@'));

      const res = await automaticBackupService.executeBackupNow(
        'MANUAL',
        splitRecipients.length > 0 ? splitRecipients : undefined
      );

      const latestConfig = automaticBackupService.getConfig();
      setAutoConfig(latestConfig);
      setWeeklySnapshots(automaticBackupService.getWeeklyLocalSnapshots());

      if (res.success) {
        setNotification({
          type: 'success',
          text: `🎉 Sucesso! Backup "${res.filename}" (${res.sizeKb} KB) enviado com sucesso para ${res.sentTo?.join(', ')}!`
        });
      } else {
        setNotification({
          type: 'error',
          text: `Falha ao transmitir backup por e-mail: ${res.message}`
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: `Erro inesperado: ${err?.message || err}`
      });
    } finally {
      setIsSendingEmailNow(false);
    }
  };

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
                <FileText className="w-3.5 h-3.5 text-amber-400" />
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

      {/* Painel de Blindagem e Proteção Ativa do Banco de Dados */}
      <div className="bg-white dark:bg-[#131720] p-6 rounded-2xl border border-slate-200 dark:border-[#273040] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-[#273040] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Blindagem Ativa do Banco de Dados
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  5 Camadas Ativas
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mecanismos de integridade e segurança que protegem suas informações contra exclusões acidentais, falhas e corrupção.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="p-3.5 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200/80 dark:border-[#273040] space-y-1.5">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
              <span className="flex items-center gap-1.5 font-bold">
                <Lock className="w-4 h-4" />
                Trava Contábil de Fechamento
              </span>
              <span className="text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-600 font-bold">Ativa</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Obrigações e lançamentos de meses fechados pela contabilidade são estritamente blindados contra exclusão física.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200/80 dark:border-[#273040] space-y-1.5">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-semibold text-xs">
              <span className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4" />
                Trava de Conciliação Bancária
              </span>
              <span className="text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded text-blue-600 font-bold">Ativa</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Títulos confirmados contra o extrato bancário não podem ser apagados diretamente, garantindo paridade com o saldo real.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200/80 dark:border-[#273040] space-y-1.5">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-semibold text-xs">
              <span className="flex items-center gap-1.5 font-bold">
                <Archive className="w-4 h-4" />
                Cofre de Registros (Soft Delete)
              </span>
              <span className="text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-600 font-bold">Ativa</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Ao remover títulos ou contratos, uma cópia completa é arquivada no cofre de segurança para auditoria e recuperação.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200/80 dark:border-[#273040] space-y-1.5">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-semibold text-xs">
              <span className="flex items-center gap-1.5 font-bold">
                <Database className="w-4 h-4" />
                Espelhamento IndexedDB
              </span>
              <span className="text-[10px] bg-purple-500/10 px-1.5 py-0.5 rounded text-purple-600 font-bold">Ativa</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Redundância local assíncrona automática em IndexedDB, protegendo contra limpezas acidentais de cache no navegador.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-[#1B212D] rounded-xl border border-slate-200/80 dark:border-[#273040] space-y-1.5 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
              <span className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Sincronização em Nuvem Não-Destrutiva (Upsert Only)
              </span>
              <span className="text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-600 font-bold">Ativa</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              O motor de sincronização com o banco de dados Supabase utiliza exclusivamente operações aditivas (upsert) baseadas em ID único e carimbo de data (LWW), prevenindo que qualquer falha de conexão limpe registros em lote na nuvem.
            </p>
          </div>
        </div>
      </div>

      {/* Seção: Lixeira Contábil & Cofre de Registros Excluídos */}
      <div className="bg-white dark:bg-[#131720] p-6 rounded-2xl border border-indigo-500/30 dark:border-indigo-500/20 shadow-md space-y-6 relative overflow-hidden">
        {/* Glow de fundo sutil */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/10 via-transparent to-transparent rounded-bl-full pointer-events-none" />

        {/* Header da Lixeira / Cofre */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-[#273040] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 text-indigo-500 border border-indigo-500/30 shadow-xs">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Lixeira Contábil & Cofre de Registros Excluídos
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
                  {vaultEntries.length} {vaultEntries.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Todos os lançamentos e contratos excluídos são protegidos aqui. Restaure qualquer item com 1 clique.
              </p>
            </div>
          </div>

          {vaultEntries.length > 0 && (
            <button
              onClick={handleClearVault}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
              title="Esvaziar permanentemente o cofre"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Esvaziar Cofre</span>
            </button>
          )}
        </div>

        {/* Card do Snapshot de Emergência Rápido (Se existir) */}
        {safetySnapshot && (
          <div className="p-4 bg-gradient-to-r from-indigo-50/80 via-slate-50 to-indigo-50/50 dark:from-indigo-950/20 dark:via-[#1B212D] dark:to-indigo-950/10 rounded-xl border border-indigo-200/80 dark:border-indigo-900/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                <History className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Ponto de Restauração de Emergência
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    Disponível
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-800 dark:text-slate-200">{safetySnapshot.label}</strong> • Criado em {new Date(safetySnapshot.timestamp).toLocaleString('pt-BR')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Permite reverter a base integralmente para o estado exato antes da última operação em lote.
                </p>
              </div>
            </div>

            <button
              onClick={handleRestoreSafetySnapshot}
              disabled={isRestoringSnapshot}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isRestoringSnapshot ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>Reverter Base para este Ponto</span>
            </button>
          </div>
        )}

        {/* Barra de Filtros e Busca do Cofre */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={vaultSearch}
              onChange={(e) => setVaultSearch(e.target.value)}
              placeholder="Buscar por descrição, número, usuário ou motivo..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-[#1B212D] border border-slate-200 dark:border-[#273040] rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-100 dark:bg-[#1B212D] p-1 rounded-xl border border-slate-200 dark:border-[#273040]">
            <button
              onClick={() => setVaultFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                vaultFilter === 'ALL'
                  ? 'bg-white dark:bg-[#131720] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Todos ({vaultEntries.length})
            </button>
            <button
              onClick={() => setVaultFilter('PENDING')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                vaultFilter === 'PENDING'
                  ? 'bg-white dark:bg-[#131720] text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              No Cofre ({vaultEntries.filter(e => !e.restoredAt).length})
            </button>
            <button
              onClick={() => setVaultFilter('RESTORED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                vaultFilter === 'RESTORED'
                  ? 'bg-white dark:bg-[#131720] text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Restaurados ({vaultEntries.filter(e => Boolean(e.restoredAt)).length})
            </button>
          </div>
        </div>

        {/* Listagem de Registros Excluídos */}
        {(() => {
          const filtered = vaultEntries.filter(entry => {
            if (vaultFilter === 'PENDING' && entry.restoredAt) return false;
            if (vaultFilter === 'RESTORED' && !entry.restoredAt) return false;
            if (!vaultSearch.trim()) return true;
            const query = vaultSearch.toLowerCase();
            const desc = (entry.data?.description || entry.data?.titleNumber || entry.data?.contractNumber || entry.reason || '').toLowerCase();
            const who = (entry.deletedBy || '').toLowerCase();
            return desc.includes(query) || who.includes(query) || (entry.recordId || '').toLowerCase().includes(query);
          });

          return filtered.length > 0 ? (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filtered.map((entry) => {
                const isRestored = Boolean(entry.restoredAt);
                const data = entry.data || {};
                const titleType = data.type; // 'PAGAR' ou 'RECEBER'
                const amount = Number(data.originalAmount || data.amount || data.totalAmount || 0);

                return (
                  <div
                    key={entry.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isRestored
                        ? 'bg-slate-50/70 dark:bg-[#1B212D]/40 border-slate-200/80 dark:border-[#273040] opacity-80'
                        : 'bg-white dark:bg-[#1B212D] border-slate-200 dark:border-[#273040] hover:border-indigo-300 dark:hover:border-indigo-800'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        entry.recordType === 'CONTRACT'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : entry.recordType === 'SALE'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : titleType === 'RECEBER'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        <FileText className="w-4 h-4" />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            entry.recordType === 'CONTRACT'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                              : entry.recordType === 'SALE'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                              : titleType === 'RECEBER'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}>
                            {entry.recordType === 'CONTRACT'
                              ? 'Contrato'
                              : entry.recordType === 'SALE'
                              ? 'Venda'
                              : titleType === 'RECEBER'
                              ? 'A Receber'
                              : 'A Pagar'}
                          </span>

                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {data.description || data.clientName || data.titleNumber || 'Registro sem descrição'}
                          </span>

                          {data.titleNumber && (
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              #{data.titleNumber}
                            </span>
                          )}

                          {amount > 0 && (
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white ml-auto md:ml-0">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Excluído em: <strong>{new Date(entry.deletedAt).toLocaleString('pt-BR')}</strong></span>
                          <span>Por: <strong>{entry.deletedBy}</strong></span>
                          {entry.reason && <span className="italic">Motivo: "{entry.reason}"</span>}
                        </div>

                        {isRestored && (
                          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Restaurado em {new Date(entry.restoredAt!).toLocaleString('pt-BR')} por {entry.restoredBy || 'Sistema'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-[#273040] w-full md:w-auto justify-end">
                      {!isRestored ? (
                        <button
                          onClick={() => handleRestoreVaultEntry(entry)}
                          disabled={restoringEntryId === entry.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Restaurar este registro de volta para a base ativa"
                        >
                          {restoringEntryId === entry.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          <span>Restaurar Registro</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                          Ativo na Base
                        </span>
                      )}

                      <button
                        onClick={() => handleDeleteVaultEntry(entry.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Excluir permanentemente do cofre"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 dark:bg-[#1B212D]/40 rounded-xl border border-dashed border-slate-200 dark:border-[#273040] space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Archive className="w-8 h-8 mx-auto text-slate-400 opacity-50" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {vaultSearch.trim() || vaultFilter !== 'ALL'
                  ? 'Nenhum registro encontrado para os filtros selecionados.'
                  : 'O cofre de segurança está vazio.'}
              </p>
              <p className="text-[11px]">
                Quando qualquer título ou contrato for excluído pelo sistema, ele será arquivado aqui para recuperação imediata.
              </p>
            </div>
          );
        })()}
      </div>

      {/* Seção Nova: Rotina Automática de Exportação Semanal por E-mail (.JSON) */}
      <div className="bg-white dark:bg-[#131720] p-6 rounded-2xl border border-amber-500/30 dark:border-amber-500/20 shadow-md space-y-6 relative overflow-hidden">
        {/* Glow de fundo dourado sutil */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent rounded-bl-full pointer-events-none" />

        {/* Header do Card */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-[#273040] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-500 border border-amber-500/30 shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Rotina Automática de Backup Semanal via E-mail
                </h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  autoConfig.enabled
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-500/10 text-slate-500 border-slate-500/30'
                }`}>
                  {autoConfig.enabled ? 'Ativo na Nuvem' : 'Pausado'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Exporta automaticamente toda a base de dados do sistema em formato <strong>.JSON</strong> e envia anexada por e-mail toda semana.
              </p>
            </div>
          </div>

          {/* Toggle Switch Ativado / Desativado */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {autoConfig.enabled ? 'Rotina Ativada' : 'Rotina Desativada'}
            </span>
            <button
              type="button"
              onClick={handleToggleAutoBackup}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoConfig.enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={autoConfig.enabled}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  autoConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Configurações da Rotina */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna 1 & 2: Formulário de Configuração */}
          <div className="lg:col-span-2 space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>E-mails Destinatários (separados por vírgula):</span>
                <span className="text-[11px] font-normal text-slate-400">
                  Ex: econtajuridico@gmail.com, leonardo@empresa.com
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipientsInput}
                  onChange={(e) => setRecipientsInput(e.target.value)}
                  placeholder="econtajuridico@gmail.com, seu-email@exemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                💡 O arquivo <span className="font-mono text-amber-500 font-bold">.JSON</span> será enviado como anexo oficial para os endereços informados acima.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  Dia da Semana para Envio:
                </label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value={1}>Segunda-feira (Recomendado - Abertura de Semana)</option>
                  <option value={2}>Terça-feira</option>
                  <option value={3}>Quarta-feira</option>
                  <option value={4}>Quinta-feira</option>
                  <option value={5}>Sexta-feira (Fechamento Semanal)</option>
                  <option value={6}>Sábado</option>
                  <option value={0}>Domingo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Horário Preferencial de Disparo:
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveEmailConfig}
                disabled={isSavingConfig}
                className="px-4 py-2 bg-slate-900 dark:bg-[#1B212D] hover:bg-slate-800 dark:hover:bg-[#252c3c] text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Configuração Semanal</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerEmailBackupNow}
                disabled={isSendingEmailNow}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingEmailNow ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gerando e Enviando por E-mail...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Disparar Envio Agora (Teste Imediato)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Coluna 3: Painel do Último Envio Realizado */}
          <div className="bg-slate-50 dark:bg-[#1B212D] p-4 rounded-xl border border-slate-200 dark:border-[#273040] flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Status do Último Envio
                </span>
                {autoConfig.lastStatus === 'SUCCESS' && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Entregue com Sucesso
                  </span>
                )}
                {autoConfig.lastStatus === 'ERROR' && (
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                    Falha no Envio
                  </span>
                )}
              </div>

              {autoConfig.lastRunAt ? (
                <div className="space-y-2 text-xs">
                  <div className="text-[11px] text-slate-500 flex justify-between border-b border-slate-200/50 dark:border-[#273040] pb-1.5">
                    <span>Data/Hora:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(autoConfig.lastRunAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {autoConfig.lastFilename && (
                    <div className="text-[11px] text-slate-500 flex justify-between border-b border-slate-200/50 dark:border-[#273040] pb-1.5">
                      <span>Arquivo:</span>
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-400 truncate max-w-[140px]" title={autoConfig.lastFilename}>
                        {autoConfig.lastFilename}
                      </span>
                    </div>
                  )}

                  {autoConfig.lastSizeKb && (
                    <div className="text-[11px] text-slate-500 flex justify-between border-b border-slate-200/50 dark:border-[#273040] pb-1.5">
                      <span>Tamanho:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {autoConfig.lastSizeKb} KB
                      </span>
                    </div>
                  )}

                  {autoConfig.lastSentRecipients && autoConfig.lastSentRecipients.length > 0 && (
                    <div className="text-[11px] text-slate-500 pt-1">
                      <span className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">Enviado para:</span>
                      <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 break-all bg-white dark:bg-[#131720] p-1.5 rounded-lg border border-slate-200 dark:border-[#273040] block">
                        {autoConfig.lastSentRecipients.join(', ')}
                      </span>
                    </div>
                  )}

                  {autoConfig.lastError && (
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                      <strong>Erro:</strong> {autoConfig.lastError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  <Mail className="w-7 h-7 mx-auto mb-1.5 opacity-40 text-amber-500" />
                  <p>Nenhum envio registrado ainda.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Clique em "Disparar Envio Agora" para fazer seu primeiro teste.</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200/50 dark:border-[#273040] text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Frequência: Semanal (A cada 7 dias)</span>
              <span className="font-semibold text-amber-500">Serviço Ativo</span>
            </div>
          </div>

        </div>
      </div>

      {/* Seção: Histórico de Snapshots Semanais Salvos no Dispositivo */}
      <div className="bg-white dark:bg-[#131720] p-6 rounded-2xl border border-slate-200 dark:border-[#273040] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-[#273040] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <FolderDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Snapshots Semanais Arquivados no Dispositivo
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {weeklySnapshots.length} cópia(s) disponível(is)
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cópias semanais completas gravadas localmente para download instantâneo mesmo sem acesso à internet ou ao e-mail.
              </p>
            </div>
          </div>
        </div>

        {weeklySnapshots.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-[#273040] border border-slate-200 dark:border-[#273040] rounded-xl overflow-hidden">
            {weeklySnapshots.map((snap) => (
              <div key={snap.id} className="p-3.5 bg-slate-50/50 dark:bg-[#1B212D]/60 hover:bg-slate-100/60 dark:hover:bg-[#1B212D] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-mono font-bold text-slate-900 dark:text-white truncate" title={snap.filename}>
                      {snap.filename}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {snap.sizeKb} KB
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Exportado: <strong>{new Date(snap.date).toLocaleString('pt-BR')}</strong></span>
                    <span>•</span>
                    <span>Títulos: <strong>{snap.stats?.totalTitles ?? 0}</strong></span>
                    <span>•</span>
                    <span>Contratos: <strong>{snap.stats?.totalContracts ?? 0}</strong></span>
                    <span>•</span>
                    <span>Clientes: <strong>{snap.stats?.totalCounterparties ?? 0}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const ok = automaticBackupService.downloadWeeklySnapshot(snap.id);
                      if (ok) {
                        setNotification({
                          type: 'success',
                          text: `Download do snapshot "${snap.filename}" iniciado com sucesso!`
                        });
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Baixar este arquivo JSON de backup"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Arquivo</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-slate-50 dark:bg-[#1B212D]/40 rounded-xl border border-dashed border-slate-200 dark:border-[#273040] space-y-1 text-xs text-slate-500 dark:text-slate-400">
            <Archive className="w-8 h-8 mx-auto text-slate-400 mb-1 opacity-50" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Nenhum snapshot semanal arquivado no momento.</p>
            <p className="text-[11px]">Um novo snapshot é gerado e arquivado a cada ciclo semanal ou quando você clica em "Disparar Envio Agora".</p>
          </div>
        )}
      </div>

      {/* Seção 2: Restauração de Backup */}
      <div className="bg-white dark:bg-[#131720] p-6 rounded-2xl border border-slate-200 dark:border-[#273040] shadow-2xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-[#273040] pb-3">
          <Upload className="w-4 h-4 text-amber-400" />
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
