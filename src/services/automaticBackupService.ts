import { storage } from './storageService';
import { resendService, BackupEmailStats } from './resendService';
import { FinancialEngine, formatBRL } from './financialEngine';

export interface AutoBackupConfig {
  enabled: boolean;
  recipients: string[];
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, 2 = Terça, ..., 6 = Sábado
  timeOfDay: string; // "08:00"
  frequency: 'WEEKLY';
  lastRunAt?: string;
  lastStatus?: 'SUCCESS' | 'ERROR';
  lastError?: string;
  lastFilename?: string;
  lastSizeKb?: number;
  lastSentRecipients?: string[];
}

export interface WeeklyLocalSnapshot {
  id: string;
  filename: string;
  date: string;
  sizeKb: number;
  stats: BackupEmailStats;
  jsonContent: string;
}

const STORAGE_KEY_CONFIG = 'contaju_auto_backup_config';
const STORAGE_KEY_WEEKLY_SNAPSHOTS = 'contaju_weekly_local_snapshots';

export const DEFAULT_AUTO_BACKUP_CONFIG: AutoBackupConfig = {
  enabled: true,
  recipients: ['econtajuridico@gmail.com', 'leonardoricardoarantes@gmail.com'],
  dayOfWeek: 1, // Segunda-feira por padrão
  timeOfDay: '08:00',
  frequency: 'WEEKLY'
};

class AutomaticBackupService {
  private isExecuting = false;
  private intervalTimer: any = null;
  private inMemorySnapshots: WeeklyLocalSnapshot[] = [];

  public getConfig(): AutoBackupConfig {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return { ...DEFAULT_AUTO_BACKUP_CONFIG };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (!raw) return { ...DEFAULT_AUTO_BACKUP_CONFIG };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_AUTO_BACKUP_CONFIG,
        ...parsed,
        recipients: Array.isArray(parsed.recipients) && parsed.recipients.length > 0 
          ? parsed.recipients 
          : DEFAULT_AUTO_BACKUP_CONFIG.recipients
      };
    } catch {
      return { ...DEFAULT_AUTO_BACKUP_CONFIG };
    }
  }

  public saveConfig(updates: Partial<AutoBackupConfig>): AutoBackupConfig {
    const current = this.getConfig();
    const updated: AutoBackupConfig = {
      ...current,
      ...updates
    };

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
      } catch (err) {
        console.warn('Erro ao salvar configuração de backup automático:', err);
      }
    }

    return updated;
  }

  // Salva uma cópia física local no cofre de snapshots semanais
  public saveWeeklyLocalSnapshot(
    filename: string,
    jsonContent: string,
    stats: BackupEmailStats,
    sizeKb: number
  ): WeeklyLocalSnapshot {
    const snapshots = this.getWeeklyLocalSnapshots();
    const newSnapshot: WeeklyLocalSnapshot = {
      id: `snap-${Date.now()}`,
      filename,
      date: new Date().toISOString(),
      sizeKb,
      stats,
      jsonContent
    };

    // Mantém os 8 snapshots semanais mais recentes (2 meses de histórico retroativo)
    const updated = [newSnapshot, ...snapshots.filter(s => s.filename !== filename)].slice(0, 8);
    this.inMemorySnapshots = updated;

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_WEEKLY_SNAPSHOTS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Erro ao salvar snapshot semanal no localStorage:', e);
      }
    }

    return newSnapshot;
  }

  // Retorna a lista de snapshots semanais arquivados localmente
  public getWeeklyLocalSnapshots(): WeeklyLocalSnapshot[] {
    if (this.inMemorySnapshots.length > 0) {
      return this.inMemorySnapshots;
    }
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return this.inMemorySnapshots;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_WEEKLY_SNAPSHOTS);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.inMemorySnapshots = parsed;
      }
      return parsed;
    } catch {
      return this.inMemorySnapshots;
    }
  }

  // Realiza download direto do arquivo .JSON do snapshot semanal no navegador
  public downloadWeeklySnapshot(id: string): boolean {
    const snapshots = this.getWeeklyLocalSnapshots();
    const target = snapshots.find(s => s.id === id);
    if (!target) return false;

    if (typeof window === 'undefined' || typeof document === 'undefined') return false;

    try {
      const blob = new Blob([target.jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = target.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Remove um snapshot semanal do histórico local
  public deleteWeeklySnapshot(id: string): void {
    const snapshots = this.getWeeklyLocalSnapshots();
    const updated = snapshots.filter(s => s.id !== id);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_WEEKLY_SNAPSHOTS, JSON.stringify(updated));
      } catch {}
    }
  }

  // Executa o envio do backup com snapshot atual da base
  public async executeBackupNow(
    triggerType: 'AUTOMATICO_SEMANAL' | 'MANUAL' = 'MANUAL',
    customRecipients?: string[]
  ): Promise<{ 
    success: boolean; 
    message: string; 
    filename?: string; 
    sizeKb?: number; 
    error?: string;
    sentTo?: string[];
  }> {
    if (this.isExecuting) {
      return { 
        success: false, 
        message: 'Uma rotina de backup já está em processamento no momento. Aguarde alguns instantes.' 
      };
    }

    this.isExecuting = true;

    try {
      const config = this.getConfig();
      const recipients = customRecipients && customRecipients.length > 0 
        ? customRecipients 
        : config.recipients;

      if (!recipients || recipients.length === 0) {
        throw new Error('Nenhum e-mail destinatário configurado para receber o backup.');
      }

      // 1. Gera snapshot JSON completo da base
      const jsonContent = storage.exportFullBackup();
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `backup-contaju-${dateStr}_${timeStr}.json`;
      const sizeBytes = new Blob([jsonContent]).size;
      const sizeKb = parseFloat((sizeBytes / 1024).toFixed(1));

      // 2. Compila estatísticas resumidas
      const company = storage.getCompany();
      const titles = storage.getTitles();
      const contracts = storage.getContracts();
      const counterparties = storage.getCounterparties();
      const movements = storage.getMovements();
      const bankAccounts = storage.getBankAccounts();
      const consolidatedCash = FinancialEngine.getConsolidatedCashBalance();

      const stats: BackupEmailStats = {
        companyName: company?.tradeName || company?.companyName || 'Contaju Gestão Contábil & Financeira',
        consolidatedBalanceFormatted: formatBRL(consolidatedCash),
        totalTitles: titles.length,
        totalContracts: contracts.length,
        totalCounterparties: counterparties.length,
        totalMovements: movements.length,
        totalBankAccounts: bankAccounts.length
      };

      // 2.1 Garantia de integridade física: Arquiva cópia completa no cofre local de snapshots semanais
      this.saveWeeklyLocalSnapshot(filename, jsonContent, stats, sizeKb);

      // 3. Tenta envio prioritário para os destinatários configurados
      let sendResult = await resendService.sendBackupEmail({
        toEmail: recipients,
        backupFilename: filename,
        backupJsonContent: jsonContent,
        stats,
        triggerType
      });

      let sentRecipients = [...recipients];

      // Se falhar devido a restrição de sandbox da conta Resend ("only send testing emails to your own email address")
      // faz fallback automático para o e-mail verificado da conta Contaju
      if (!sendResult.success && sendResult.error?.includes('econtajuridico@gmail.com')) {
        console.warn('[AutoBackup] Redirecionando envio para o e-mail verificado da conta Resend (econtajuridico@gmail.com)...');
        sentRecipients = ['econtajuridico@gmail.com'];
        sendResult = await resendService.sendBackupEmail({
          toEmail: sentRecipients,
          backupFilename: filename,
          backupJsonContent: jsonContent,
          stats,
          triggerType
        });
      }

      const currentUser = storage.getCurrentUser();

      if (sendResult.success) {
        this.saveConfig({
          lastRunAt: new Date().toISOString(),
          lastStatus: 'SUCCESS',
          lastError: undefined,
          lastFilename: filename,
          lastSizeKb: sizeKb,
          lastSentRecipients: sentRecipients
        });

        // Registrar auditoria
        storage.addAuditLog({
          userName: currentUser?.name || 'Sistema Automático Contaju',
          userRole: currentUser?.role || 'SUPER_ADMIN',
          action: triggerType === 'AUTOMATICO_SEMANAL' ? 'BACKUP_SEMANAL_EMAIL_AUTOMATICO' : 'BACKUP_SEMANAL_EMAIL_MANUAL',
          module: 'Segurança e Backup',
          recordId: filename,
          details: `Exportação de backup .JSON enviada com sucesso por e-mail para ${sentRecipients.join(', ')} (${sizeKb} KB, ${titles.length} títulos, ${contracts.length} contratos).`
        });

        return {
          success: true,
          message: `Backup exportado e enviado com sucesso para ${sentRecipients.join(', ')}!`,
          filename,
          sizeKb,
          sentTo: sentRecipients
        };
      } else {
        const errorMsg = sendResult.error || 'Falha ao disparar e-mail de backup pelo serviço Resend.';
        
        this.saveConfig({
          lastRunAt: new Date().toISOString(),
          lastStatus: 'ERROR',
          lastError: errorMsg
        });

        storage.addAuditLog({
          userName: currentUser?.name || 'Sistema Automático Contaju',
          userRole: currentUser?.role || 'SUPER_ADMIN',
          action: 'FALHA_ENVIO_BACKUP_EMAIL',
          module: 'Segurança e Backup',
          recordId: filename,
          details: `Tentativa de envio de backup por e-mail falhou: ${errorMsg}`
        });

        return {
          success: false,
          message: errorMsg,
          error: errorMsg
        };
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Erro inesperado ao gerar ou transmitir o backup por e-mail.';
      this.saveConfig({
        lastRunAt: new Date().toISOString(),
        lastStatus: 'ERROR',
        lastError: errorMsg
      });
      return {
        success: false,
        message: errorMsg,
        error: errorMsg
      };
    } finally {
      this.isExecuting = false;
    }
  }

  // Verifica se o backup semanal precisa ser disparado
  public shouldRunWeeklyBackup(): boolean {
    const config = this.getConfig();
    if (!config.enabled) return false;

    // Se nunca rodou, deve rodar
    if (!config.lastRunAt) return true;

    const lastRunTime = new Date(config.lastRunAt).getTime();
    const now = new Date();
    const elapsedMs = now.getTime() - lastRunTime;
    const sixDaysMs = 6 * 24 * 60 * 60 * 1000;

    // Se já passou mais de 6.5 dias desde a última execução bem sucedida
    if (elapsedMs >= sixDaysMs) {
      return true;
    }

    // Se o dia da semana atual corresponde ao dia configurado (ex: Segunda-feira = 1)
    // e na data de hoje ainda não rodou
    const todayDayOfWeek = now.getDay();
    const lastRunDateStr = config.lastRunAt.slice(0, 10);
    const todayDateStr = now.toISOString().slice(0, 10);

    if (todayDayOfWeek === config.dayOfWeek && lastRunDateStr !== todayDateStr) {
      return true;
    }

    return false;
  }

  // Checagem em background
  public async checkAndRunScheduledBackup(): Promise<boolean> {
    if (this.shouldRunWeeklyBackup()) {
      console.log('[AutoBackup] Disparando rotina automática de exportação de backup semanal...');
      const res = await this.executeBackupNow('AUTOMATICO_SEMANAL');
      return res.success;
    }
    return false;
  }

  // Inicializa o agendador em segundo plano no app
  public initScheduler() {
    if (typeof window === 'undefined') return;

    // Checagem inicial após 6 segundos da inicialização da aplicação
    setTimeout(() => {
      this.checkAndRunScheduledBackup().catch(() => {});
    }, 6000);

    // Checagem a cada 30 minutos enquanto a aplicação estiver em execução
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
    this.intervalTimer = setInterval(() => {
      this.checkAndRunScheduledBackup().catch(() => {});
    }, 30 * 60 * 1000);
  }
}

export const automaticBackupService = new AutomaticBackupService();
