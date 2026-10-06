import { storage } from './storageService';
import { FinancialTitle, Settlement } from '../types';
import { ConflictResolutionEngine } from './conflictResolutionEngine';

export type OfflineActionType = 
  | 'CREATE_TITLE'
  | 'UPDATE_TITLE'
  | 'SETTLE_TITLE'
  | 'DELETE_TITLE'
  | 'BATCH_SETTLE';

export interface OfflineQueueItem {
  id: string;
  type: OfflineActionType;
  payload: any;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export type SyncState = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';

export interface SyncNotificationEvent {
  type: 'SUCCESS' | 'ERROR' | 'OFFLINE_QUEUED' | 'NETWORK_RESTORED' | 'CONFLICT_RESOLVED';
  message: string;
  count?: number;
  conflictDetails?: any;
}

type SyncListener = (state: {
  isOnline: boolean;
  queueCount: number;
  syncState: SyncState;
  lastEvent?: SyncNotificationEvent;
}) => void;

export class OfflineSyncService {
  private static STORAGE_KEY = 'contaju_offline_sync_queue';
  private static listeners: Set<SyncListener> = new Set();
  private static syncState: SyncState = 'IDLE';
  private static lastEvent?: SyncNotificationEvent;
  private static isInitialized = false;

  /**
   * Inicializa o monitoramento de rede e listeners de background sync
   */
  public static init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Monitora retorno e perda de conexão
    window.addEventListener('online', () => {
      this.lastEvent = {
        type: 'NETWORK_RESTORED',
        message: 'Conexão restabelecida. Iniciando sincronização em segundo plano...'
      };
      this.notifyListeners();
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.lastEvent = {
        type: 'OFFLINE_QUEUED',
        message: 'Você está offline. Operações serão salvas localmente e sincronizadas ao reconectar.'
      };
      this.notifyListeners();
    });

    // Ouve mensagens do Service Worker (Background Sync)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'BACKGROUND_SYNC_TRIGGERED') {
          this.processQueue();
        }
      });
    }

    // Processa fila pendente na inicialização se já estiver online
    if (navigator.onLine && this.getQueue().length > 0) {
      setTimeout(() => this.processQueue(), 1500);
    }
  }

  /**
   * Verifica se o navegador está online no momento
   */
  public static isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Obtém os itens pendentes na fila offline
   */
  public static getQueue(): OfflineQueueItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Salva a fila no localStorage
   */
  private static saveQueue(queue: OfflineQueueItem[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn('[OfflineSyncService] Falha ao persistir fila offline:', err);
    }
  }

  /**
   * Enfileira uma ação para ser sincronizada
   */
  public static enqueue(type: OfflineActionType, payload: any): void {
    const queue = this.getQueue();
    const item: OfflineQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0
    };

    queue.push(item);
    this.saveQueue(queue);

    this.lastEvent = {
      type: 'OFFLINE_QUEUED',
      message: 'Operação registrada com segurança no dispositivo. Sincronização pendente.',
      count: queue.length
    };
    this.notifyListeners();

    // Se estiver online, tenta processar imediatamente
    if (this.isOnline()) {
      this.processQueue();
    } else {
      // Solicita Background Sync se disponível no Service Worker
      this.requestBackgroundSync();
    }
  }

  /**
   * Solicita registro de tag no Background Sync do Service Worker
   */
  private static async requestBackgroundSync(): Promise<void> {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg: any = await navigator.serviceWorker.ready;
        if (reg?.sync) {
          await reg.sync.register('contaju-sync-queue');
        }
      } catch {
        // Silencioso se navegador não suportar Background Sync API
      }
    }
  }

  /**
   * Processa a fila de sincronização
   */
  public static async processQueue(): Promise<{ success: boolean; processedCount: number; errorsCount: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) {
      this.syncState = 'IDLE';
      this.notifyListeners();
      return { success: true, processedCount: 0, errorsCount: 0 };
    }

    if (!this.isOnline()) {
      return { success: false, processedCount: 0, errorsCount: queue.length };
    }

    this.syncState = 'SYNCING';
    this.notifyListeners();

    let processedCount = 0;
    let errorsCount = 0;
    const remainingQueue: OfflineQueueItem[] = [];

    for (const item of queue) {
      try {
        await this.executeQueueItem(item);
        processedCount++;
      } catch (err: any) {
        console.error(`[OfflineSyncService] Erro ao sincronizar item ${item.id}:`, err);
        errorsCount++;
        item.attempts += 1;
        item.lastError = err?.message || 'Erro desconhecido';
        
        // Mantém na fila se tiver menos de 5 tentativas
        if (item.attempts < 5) {
          remainingQueue.push(item);
        }
      }
    }

    this.saveQueue(remainingQueue);

    // Se configurado, sincroniza com a nuvem
    if (processedCount > 0) {
      try {
        const hasUrl = localStorage.getItem('contaju_supabase_url') || (import.meta.env.VITE_SUPABASE_URL as string | undefined);
        const hasKey = localStorage.getItem('contaju_supabase_anon_key') || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
        if (hasUrl && hasKey) {
          const { supabaseSync } = await import('./supabaseSyncService');
          await supabaseSync.syncAllToSupabase();
        }
      } catch (e) {
        console.warn('[OfflineSyncService] Nuvem temporariamente inacessível, dados preservados localmente:', e);
      }
    }

    if (errorsCount === 0 && processedCount > 0) {
      this.syncState = 'SUCCESS';
      this.lastEvent = {
        type: 'SUCCESS',
        message: processedCount === 1 
          ? 'Tudo pronto! 1 lançamento foi sincronizado com sucesso.'
          : `Tudo pronto! ${processedCount} operações foram sincronizadas com sucesso.`,
        count: processedCount
      };
    } else if (errorsCount > 0) {
      this.syncState = 'ERROR';
      this.lastEvent = {
        type: 'ERROR',
        message: `Atenção: ${errorsCount} operação(ões) não puderam ser sincronizadas. Nova tentativa em breve.`,
        count: errorsCount
      };
    } else {
      this.syncState = 'IDLE';
    }

    this.notifyListeners();

    // Volta para IDLE após 5 segundos
    setTimeout(() => {
      if (this.syncState === 'SUCCESS') {
        this.syncState = 'IDLE';
        this.notifyListeners();
      }
    }, 5000);

    return { success: errorsCount === 0, processedCount, errorsCount };
  }

  /**
   * Notifica a aplicação sobre resolução de conflitos entre múltiplos dispositivos
   */
  public static notifyConflictResolved(message: string, count: number, details?: any): void {
    this.lastEvent = {
      type: 'CONFLICT_RESOLVED',
      message,
      count,
      conflictDetails: details
    };
    this.notifyListeners();

    setTimeout(() => {
      if (this.lastEvent?.type === 'CONFLICT_RESOLVED') {
        this.lastEvent = undefined;
        this.notifyListeners();
      }
    }, 6000);
  }

  /**
   * Executa uma ação específica da fila com resolução semântica de conflitos
   */
  private static async executeQueueItem(item: OfflineQueueItem): Promise<void> {
    switch (item.type) {
      case 'CREATE_TITLE': {
        const title: FinancialTitle = item.payload;
        const titles = storage.getTitles();
        const existing = titles.find(t => t.id === title.id);
        if (!existing) {
          storage.saveTitles([title, ...titles]);
        } else {
          // Já existe: resolve possível conflito concorrente
          const settlements = storage.getSettlements().filter(s => s.titleId === title.id);
          const { resolved, conflictReport } = ConflictResolutionEngine.resolveTitle(existing, title, settlements);
          const updated = titles.map(t => t.id === title.id ? resolved : t);
          storage.saveTitles(updated);
          if (conflictReport) {
            this.notifyConflictResolved(
              `Título #${resolved.titleNumber} sincronizado: conflito resolvido preservando a versão mais recente.`,
              1,
              conflictReport
            );
          }
        }
        break;
      }
      case 'UPDATE_TITLE': {
        const title: FinancialTitle = item.payload;
        const titles = storage.getTitles();
        const existing = titles.find(t => t.id === title.id);
        if (existing) {
          const settlements = storage.getSettlements().filter(s => s.titleId === title.id);
          const { resolved, conflictReport } = ConflictResolutionEngine.resolveTitle(existing, title, settlements);
          const updated = titles.map(t => t.id === title.id ? resolved : t);
          storage.saveTitles(updated);
          if (conflictReport) {
            this.notifyConflictResolved(
              `Título #${resolved.titleNumber} atualizado com resolução de concorrência Last-Write-Wins.`,
              1,
              conflictReport
            );
          }
        } else {
          storage.saveTitles([title, ...titles]);
        }
        break;
      }
      case 'SETTLE_TITLE': {
        const { settlement } = item.payload;
        if (settlement) {
          const currentSettlements = storage.getSettlements();
          const { mergedSettlements } = ConflictResolutionEngine.mergeSettlements(currentSettlements, [settlement]);
          storage.saveSettlements(mergedSettlements);

          // Atualiza o saldo do título de forma atômica e consistente
          const titles = storage.getTitles();
          const targetTitle = titles.find(t => t.id === settlement.titleId);
          if (targetTitle) {
            const validSettlements = mergedSettlements.filter(s => s.titleId === targetTitle.id && !s.isReversed);
            const totalSettled = validSettlements.reduce((sum, s) => sum + (s.components?.principalSettled || 0), 0);
            const balance = Math.max(0, Number(((targetTitle.originalAmount || 0) - totalSettled).toFixed(2)));
            const updatedTitle: FinancialTitle = {
              ...targetTitle,
              settledPrincipal: Number(totalSettled.toFixed(2)),
              balancePrincipal: balance,
              settlementState: balance <= 0.001 && targetTitle.originalAmount > 0 ? 'LIQUIDADO' : totalSettled > 0 ? 'PARCIAL' : targetTitle.settlementState,
              updatedAt: new Date().toISOString()
            };
            storage.saveTitles(titles.map(t => t.id === updatedTitle.id ? updatedTitle : t));
          }
        }
        break;
      }
      case 'DELETE_TITLE': {
        const { titleId } = item.payload;
        const titles = storage.getTitles().filter(t => t.id !== titleId);
        storage.saveTitles(titles);
        break;
      }
      case 'BATCH_SETTLE': {
        const { settlements } = item.payload;
        if (Array.isArray(settlements) && settlements.length > 0) {
          const currentSettlements = storage.getSettlements();
          const { mergedSettlements } = ConflictResolutionEngine.mergeSettlements(currentSettlements, settlements);
          storage.saveSettlements(mergedSettlements);

          // Recalcula saldos de todos os títulos afetados
          const affectedTitleIds = new Set(settlements.map(s => s.titleId));
          const titles = storage.getTitles();
          const updatedTitles: FinancialTitle[] = titles.map(t => {
            if (!affectedTitleIds.has(t.id)) return t;
            const validSettlements = mergedSettlements.filter(s => s.titleId === t.id && !s.isReversed);
            const totalSettled = validSettlements.reduce((sum, s) => sum + (s.components?.principalSettled || 0), 0);
            const balance = Math.max(0, Number(((t.originalAmount || 0) - totalSettled).toFixed(2)));
            return {
              ...t,
              settledPrincipal: Number(totalSettled.toFixed(2)),
              balancePrincipal: balance,
              settlementState: balance <= 0.001 && t.originalAmount > 0 ? 'LIQUIDADO' : totalSettled > 0 ? 'PARCIAL' : t.settlementState,
              updatedAt: new Date().toISOString()
            };
          });
          storage.saveTitles(updatedTitles);
        }
        break;
      }
      default:
        break;
    }
  }

  /**
   * Adiciona um ouvinte de estado de sincronização
   */
  public static subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Notifica estado imediato
    listener({
      isOnline: this.isOnline(),
      queueCount: this.getQueue().length,
      syncState: this.syncState,
      lastEvent: this.lastEvent
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(): void {
    const state = {
      isOnline: this.isOnline(),
      queueCount: this.getQueue().length,
      syncState: this.syncState,
      lastEvent: this.lastEvent
    };

    this.listeners.forEach(fn => fn(state));
  }
}
