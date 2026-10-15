import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Key, AlertCircle } from 'lucide-react';
import { storage } from '../../services/storageService';
import { AiProviderConfig } from '../../types';
import { NavigationScreen } from '../Sidebar';

interface AiHealthStatusPillProps {
  onNavigate?: (screen: NavigationScreen) => void;
}

export const AiHealthStatusPill: React.FC<AiHealthStatusPillProps> = ({ onNavigate }) => {
  const [aiConfig, setAiConfig] = useState<AiProviderConfig>(() => storage.getAiConfig());

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setAiConfig(storage.getAiConfig());
    });
    return unsub;
  }, []);

  const isConnected = Boolean(aiConfig.apiKey && aiConfig.apiKey.trim().length > 0);
  const primaryModel = aiConfig.primaryModel || 'deepseek-v4-pro';

  const handleClick = () => {
    if (onNavigate) {
      onNavigate('IA');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`h-9 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold transition-all shadow-2xs cursor-pointer select-none ${
        isConnected
          ? 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:border-purple-500/50'
          : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:border-amber-500/50'
      }`}
      title={
        isConnected
          ? `OpenCode Go Online | Modelo Primário: ${primaryModel} | Clique para abrir a Central de IA`
          : 'Chave da API do OpenCode Go pendente | Clique para conectar sua IA'
      }
    >
      <div className="relative flex items-center justify-center shrink-0">
        <Bot className={`w-3.5 h-3.5 ${isConnected ? 'text-purple-500 dark:text-purple-400' : 'text-amber-500'}`} />
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
            isConnected ? 'bg-emerald-400 ring-1 ring-[var(--surface-card)]' : 'bg-amber-400 animate-ping'
          }`}
        />
      </div>

      {/* Rótulo adaptativo para desktop e mobile */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 hidden xl:inline">
          IA
        </span>
        <span className="font-mono text-[11px] font-bold truncate max-w-[110px] hidden sm:inline">
          {isConnected ? primaryModel : 'Conectar IA'}
        </span>
        <span className="sm:hidden text-[10px] font-bold">
          {isConnected ? 'IA' : 'Ativar'}
        </span>
      </div>

      <Sparkles className="w-3 h-3 text-purple-400 opacity-60 hidden md:inline shrink-0" />
    </button>
  );
};
