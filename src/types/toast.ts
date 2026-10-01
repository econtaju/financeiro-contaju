export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastNotification {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // em milissegundos (padrão: 4500ms; 0 para fixo)
  action?: ToastAction;
  createdAt: number;
}

export interface ShowToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: ToastAction;
}

export interface ToastContextType {
  toasts: ToastNotification[];
  showToast: (options: ShowToastOptions | string) => string;
  showSuccess: (message: string, title?: string, duration?: number) => string;
  showError: (message: string, title?: string, duration?: number) => string;
  showWarning: (message: string, title?: string, duration?: number) => string;
  showInfo: (message: string, title?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}
