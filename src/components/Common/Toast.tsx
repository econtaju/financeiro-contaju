import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastNotification, ToastType } from '../../types/toast';

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

export const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  };

  const getIconAndColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
          accentBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
          borderAccent: 'border-emerald-500/30 dark:border-emerald-500/40',
          progressColor: 'bg-emerald-500',
          badgeText: 'text-emerald-700 dark:text-emerald-400',
          defaultTitle: 'Sucesso'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
          accentBg: 'bg-rose-500/10 dark:bg-rose-500/15',
          borderAccent: 'border-rose-500/30 dark:border-rose-500/40',
          progressColor: 'bg-rose-500',
          badgeText: 'text-rose-700 dark:text-rose-400',
          defaultTitle: 'Erro'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
          accentBg: 'bg-amber-500/10 dark:bg-amber-500/15',
          borderAccent: 'border-amber-500/30 dark:border-amber-500/40',
          progressColor: 'bg-amber-500',
          badgeText: 'text-amber-700 dark:text-amber-400',
          defaultTitle: 'Atenção'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
          accentBg: 'bg-sky-500/10 dark:bg-sky-500/15',
          borderAccent: 'border-sky-500/30 dark:border-sky-500/40',
          progressColor: 'bg-sky-500',
          badgeText: 'text-sky-700 dark:text-sky-400',
          defaultTitle: 'Informação'
        };
    }
  };

  const style = getIconAndColors(toast.type);
  const title = toast.title || (toast.message.length > 50 ? style.defaultTitle : undefined);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`pointer-events-auto w-full relative overflow-hidden rounded-xl border bg-[var(--surface-card)] text-[var(--text-primary)] shadow-2xl backdrop-blur-md transition-all duration-200 ${
        style.borderAccent
      } ${
        isExiting
          ? 'opacity-0 translate-x-4 scale-95'
          : 'animate-in fade-in slide-in-from-top-3 duration-250'
      }`}
    >
      <div className="p-3.5 sm:p-4 flex items-start gap-3">
        {/* Ícone com fundo temático */}
        <div className={`p-2 rounded-lg shrink-0 ${style.accentBg}`}>
          {style.icon}
        </div>

        {/* Conteúdo textual */}
        <div className="flex-1 min-w-0 pr-1">
          {title && (
            <h4 className="text-xs font-bold tracking-tight text-[var(--text-primary)] mb-0.5 flex items-center gap-1.5">
              <span>{title}</span>
            </h4>
          )}
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed break-words">
            {toast.message}
          </p>

          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                handleDismiss();
              }}
              className="mt-2 text-xs font-semibold text-amber-500 hover:text-amber-400 underline decoration-amber-500/40 underline-offset-2 transition-colors cursor-pointer"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Botão de Fechar */}
        <button
          onClick={handleDismiss}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md hover:bg-[var(--surface-elevated)] transition-colors shrink-0 cursor-pointer"
          aria-label="Fechar notificação"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Barra de progresso opcional caso haja duração definida */}
      {toast.duration && toast.duration > 0 && (
        <div className="h-0.5 w-full bg-[var(--border-subtle)] overflow-hidden">
          <div
            className={`h-full ${style.progressColor} opacity-75 origin-left`}
            style={{
              animation: `toastProgress ${toast.duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[99999] pointer-events-none flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm sm:max-w-md"
      aria-label="Notificações do Sistema"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
