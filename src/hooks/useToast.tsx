import React, { createContext, useContext, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { ToastNotification, ShowToastOptions, ToastType, ToastContextType } from '../types/toast';

// Gerador simples de IDs únicos para notificações
let toastCounter = 0;
const generateToastId = () => `toast-${Date.now()}-${++toastCounter}`;

// Store global para permitir acionamento de toasts tanto via Hook quanto via API imperativa (toast.success(...))
type Listener = () => void;
class ToastStore {
  private toasts: ToastNotification[] = [];
  private listeners: Set<Listener> = new Set();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  getSnapshot = (): ToastNotification[] => {
    return this.toasts;
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  show = (options: ShowToastOptions | string): string => {
    const opts: ShowToastOptions = typeof options === 'string' ? { message: options } : options;
    const id = generateToastId();
    const duration = opts.duration !== undefined ? opts.duration : 4500;

    const newToast: ToastNotification = {
      id,
      type: opts.type || 'info',
      title: opts.title,
      message: opts.message,
      duration,
      action: opts.action,
      createdAt: Date.now()
    };

    // Manter no máximo 6 toasts ativos simultaneamente para não poluir a tela
    this.toasts = [...this.toasts.slice(-5), newToast];
    this.notify();

    // Auto-dismiss após duration (se duration > 0)
    if (duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      this.timers.set(id, timer);
    }

    return id;
  };

  dismiss = (id: string) => {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    const prevLen = this.toasts.length;
    this.toasts = this.toasts.filter(t => t.id !== id);
    if (this.toasts.length !== prevLen) {
      this.notify();
    }
  };

  clear = () => {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.toasts = [];
    this.notify();
  };

  success = (message: string, title?: string, duration?: number): string => {
    return this.show({ type: 'success', message, title, duration });
  };

  error = (message: string, title?: string, duration?: number): string => {
    return this.show({ type: 'error', message, title, duration });
  };

  warning = (message: string, title?: string, duration?: number): string => {
    return this.show({ type: 'warning', message, title, duration });
  };

  info = (message: string, title?: string, duration?: number): string => {
    return this.show({ type: 'info', message, title, duration });
  };
}

export const globalToastStore = new ToastStore();

// Atalho imperativo universal: toast.success('...'), toast.error('...')
export const toast = {
  show: (options: ShowToastOptions | string) => globalToastStore.show(options),
  success: (message: string, title?: string, duration?: number) => globalToastStore.success(message, title, duration),
  error: (message: string, title?: string, duration?: number) => globalToastStore.error(message, title, duration),
  warning: (message: string, title?: string, duration?: number) => globalToastStore.warning(message, title, duration),
  info: (message: string, title?: string, duration?: number) => globalToastStore.info(message, title, duration),
  dismiss: (id: string) => globalToastStore.dismiss(id),
  clear: () => globalToastStore.clear()
};

// React Context para componentes que preferem injeção via Provider
const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const toasts = useSyncExternalStore(
    globalToastStore.subscribe,
    globalToastStore.getSnapshot,
    globalToastStore.getSnapshot
  );

  const showToast = useCallback((options: ShowToastOptions | string) => globalToastStore.show(options), []);
  const showSuccess = useCallback((message: string, title?: string, duration?: number) => globalToastStore.success(message, title, duration), []);
  const showError = useCallback((message: string, title?: string, duration?: number) => globalToastStore.error(message, title, duration), []);
  const showWarning = useCallback((message: string, title?: string, duration?: number) => globalToastStore.warning(message, title, duration), []);
  const showInfo = useCallback((message: string, title?: string, duration?: number) => globalToastStore.info(message, title, duration), []);
  const dismissToast = useCallback((id: string) => globalToastStore.dismiss(id), []);
  const clearToasts = useCallback(() => globalToastStore.clear(), []);

  const value: ToastContextType = {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissToast,
    clearToasts
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

/**
 * Custom Hook `useToast` para gerenciamento e disparo de notificações Toast.
 * Pode ser usado dentro de componentes com ou sem ToastProvider, garantindo total reatividade.
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);

  // Se estiver dentro de um ToastProvider, use o contexto
  // Caso contrário, sincroniza diretamente com o store global via useSyncExternalStore
  const toasts = useSyncExternalStore(
    globalToastStore.subscribe,
    globalToastStore.getSnapshot,
    globalToastStore.getSnapshot
  );

  if (context) {
    return context;
  }

  return {
    toasts,
    showToast: (options) => globalToastStore.show(options),
    showSuccess: (message, title, duration) => globalToastStore.success(message, title, duration),
    showError: (message, title, duration) => globalToastStore.error(message, title, duration),
    showWarning: (message, title, duration) => globalToastStore.warning(message, title, duration),
    showInfo: (message, title, duration) => globalToastStore.info(message, title, duration),
    dismissToast: (id) => globalToastStore.dismiss(id),
    clearToasts: () => globalToastStore.clear()
  };
}
