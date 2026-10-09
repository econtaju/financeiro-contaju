import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filtra avisos não-fatais emitidos pelo SheetJS (xlsx) como console.error
// (ex: "Bad uncompressed size: ... != 0", "Bad compressed size: ...")
if (typeof window !== 'undefined' && typeof console !== 'undefined') {
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: any[]) => {
    const firstArg = typeof args[0] === 'string' ? args[0] : '';
    if (
      firstArg.includes('Bad uncompressed size:') ||
      firstArg.includes('Bad compressed size:') ||
      firstArg.includes('Bad CRC32 checksum:')
    ) {
      console.warn('[SheetJS Warning]', ...args);
      return;
    }
    originalConsoleError(...args);
  };
}

// Previne rolagem acidental do mouse wheel alterar campos numéricos em todo o sistema
if (typeof window !== 'undefined') {
  window.addEventListener('wheel', () => {
    const active = document.activeElement;
    if (active && active instanceof HTMLInputElement && active.type === 'number') {
      active.blur();
    }
  }, { passive: true });
}

import { AppErrorBoundary } from './components/Common/AppErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

// Registro do Service Worker para suporte a PWA e operação offline
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        // Verifica se há novas atualizações em segundo plano
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] Nova versão disponível em segundo plano.');
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('[PWA] Registro de Service Worker indisponível:', err);
      });
  });
}
