import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Previne rolagem acidental do mouse wheel alterar campos numéricos em todo o sistema
if (typeof window !== 'undefined') {
  window.addEventListener('wheel', () => {
    const active = document.activeElement;
    if (active && active instanceof HTMLInputElement && active.type === 'number') {
      active.blur();
    }
  }, { passive: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
