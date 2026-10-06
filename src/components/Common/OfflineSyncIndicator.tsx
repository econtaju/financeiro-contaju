import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, X, Bell, ShieldCheck } from 'lucide-react';
import { OfflineSyncService, SyncState, SyncNotificationEvent } from '../../services/offlineSyncService';
import { NotificationService } from '../../services/notificationService';

export const OfflineSyncIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(OfflineSyncService.isOnline());
  const [queueCount, setQueueCount] = useState<number>(0);
  const [syncState, setSyncState] = useState<SyncState>('IDLE');
  const [toastEvent, setToastEvent] = useState<SyncNotificationEvent | null>(null);

  useEffect(() => {
    // Inicializa o serviço
    OfflineSyncService.init();

    // Inscreve no estado do serviço
    const unsubscribe = OfflineSyncService.subscribe((state) => {
      setIsOnline(state.isOnline);
      setQueueCount(state.queueCount);
      setSyncState(state.syncState);

      if (state.lastEvent) {
        setToastEvent(state.lastEvent);
      }
    });

    // Auto-checagem de títulos vencendo hoje se houver permissão
    NotificationService.checkAndNotifyDueToday();

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-dismiss do toast após 4.5 segundos
  useEffect(() => {
    if (!toastEvent) return;
    const timer = setTimeout(() => {
      setToastEvent(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [toastEvent]);

  return (
    <>
      {/* Mini Badge de Estado de Conexão e Sincronização no Header */}
      {!isOnline && (
        <div 
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-[11px] font-bold shadow-2xs animate-pulse select-none"
          title="Você está trabalhando offline. Suas alterações estão salvas no dispositivo e serão enviadas quando a internet retornar."
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="hidden sm:inline">Modo Offline</span>
          {queueCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
              {queueCount}
            </span>
          )}
        </div>
      )}

      {isOnline && syncState === 'SYNCING' && (
        <div 
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-900 dark:text-blue-300 text-[11px] font-bold shadow-2xs select-none"
          title="Sincronizando operações com o servidor em segundo plano..."
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-500 shrink-0 animate-spin" />
          <span className="hidden sm:inline">Sincronizando...</span>
        </div>
      )}

      {/* Notificação Pequena Flutuante (Toast Notificação de Sincronização ou Erro) */}
      {toastEvent && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 max-w-sm w-[calc(100vw-32px)] animate-in fade-in slide-in-from-bottom-3 duration-250 select-none">
          <div className={`p-3.5 rounded-xl border shadow-xl flex items-start justify-between gap-3 backdrop-blur-md ${
            toastEvent.type === 'SUCCESS'
              ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/40'
              : toastEvent.type === 'CONFLICT_RESOLVED'
              ? 'bg-indigo-950/90 text-indigo-100 border-indigo-500/40'
              : toastEvent.type === 'ERROR'
              ? 'bg-rose-950/90 text-rose-100 border-rose-500/40'
              : toastEvent.type === 'NETWORK_RESTORED'
              ? 'bg-blue-950/90 text-blue-100 border-blue-500/40'
              : 'bg-amber-950/90 text-amber-100 border-amber-500/40'
          }`}>
            <div className="flex items-start gap-2.5 min-w-0">
              {toastEvent.type === 'SUCCESS' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              {toastEvent.type === 'CONFLICT_RESOLVED' && (
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              )}
              {toastEvent.type === 'ERROR' && (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              {toastEvent.type === 'NETWORK_RESTORED' && (
                <Wifi className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              )}
              {toastEvent.type === 'OFFLINE_QUEUED' && (
                <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}

              <div className="min-w-0 text-left">
                <p className="text-xs font-bold leading-snug">
                  {toastEvent.type === 'SUCCESS' ? 'Sincronização Concluída'
                    : toastEvent.type === 'CONFLICT_RESOLVED' ? 'Conflito Multi-Dispositivo Resolvido'
                    : toastEvent.type === 'ERROR' ? 'Aviso de Sincronização'
                    : toastEvent.type === 'NETWORK_RESTORED' ? 'Conexão Restaurada'
                    : 'Gravado Offline'}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5 leading-normal">
                  {toastEvent.message}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setToastEvent(null)}
              className="text-white/60 hover:text-white cursor-pointer shrink-0 p-1 -mr-1"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
