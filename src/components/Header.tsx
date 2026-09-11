import React, { useState } from 'react';
import { 
  Building2, 
  Wallet, 
  UserCircle, 
  PlusCircle, 
  ArrowLeftRight, 
  Sparkles, 
  RotateCcw, 
  Download, 
  Upload, 
  Shield, 
  CalendarClock,
  Calendar,
  Filter,
  Sun,
  Moon
} from 'lucide-react';
import { User, UserRole } from '../types';
import { storage } from '../services/storageService';
import { FinancialEngine, formatBRL } from '../services/financialEngine';
import { useGlobalPeriod } from '../hooks/useGlobalPeriod';
import { GlobalPeriodSelectorModal } from './Common/GlobalPeriodSelectorModal';
import { GoldenLionLogo } from './Common/GoldenLionLogo';

interface HeaderProps {
  currentUser: User;
  onOpenNewTitleModal: (defaultType: 'RECEBER' | 'PAGAR') => void;
  onOpenTransferModal: () => void;
  onOpenBillingModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenNewTitleModal,
  onOpenTransferModal,
  onOpenBillingModal
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(storage.getTheme());
  const { period } = useGlobalPeriod();
  const company = storage.getCompany();
  const users = storage.getUsers();
  const consolidatedCash = FinancialEngine.getConsolidatedCashBalance();

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    storage.setTheme(nextTheme);
    document.documentElement.classList.toggle('light', nextTheme === 'light');
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const handleSwitchUser = (userId: string) => {
    storage.setCurrentUserId(userId);
    setShowUserMenu(false);
  };

  const handleExportBackup = () => {
    const json = storage.exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contaju-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = storage.importFullBackup(content);
        if (ok) {
          alert('Backup restaurado com sucesso!');
          window.location.reload();
        } else {
          alert('Arquivo de backup inválido.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    if (confirm('Deseja restaurar os dados originais de demonstração da Contaju? Todas as alterações manuais serão reinicializadas.')) {
      storage.resetToDefault();
      window.location.reload();
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'GESTOR_FINANCEIRO': return 'Gestor Financeiro';
      case 'OPERADOR': return 'Operador';
      case 'CONSULTA': return 'Consulta';
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'GESTOR_FINANCEIRO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'OPERADOR': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CONSULTA': return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="bg-[var(--surface-card)] border-b border-[var(--border-subtle)] text-[var(--text-primary)] sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Brand & Company info */}
          <div className="flex items-center space-x-3">
            <GoldenLionLogo size="md" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[var(--text-primary)] text-base tracking-tight flex items-center gap-1.5">
                  <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">CONTAJU</span>
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-500 font-semibold px-2 py-0.5 rounded border border-amber-500/30">
                  LEÃO DOURADO
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] truncate max-w-xs">{company.tradeName}</p>
            </div>
          </div>

          {/* Center: Consolidated Cash Balance Indicator & Global Period Filter */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-[var(--surface-elevated)] px-3.5 py-1.5 rounded-lg border border-[var(--border-subtle)]">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <div className="text-xs">
                <span className="text-[var(--text-secondary)] block text-[11px]">Disponibilidade:</span>
                <span className="font-bold text-[var(--text-primary)] font-mono text-sm">{formatBRL(consolidatedCash)}</span>
              </div>
            </div>

            {/* Global Period Filter Button */}
            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all text-xs ${
                period.active 
                  ? 'bg-amber-500/10 border-amber-400/40 text-amber-400 shadow-xs' 
                  : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-amber-500/40'
              }`}
              title="Filtrar por Mês e Ano Central (sincroniza todo o sistema)"
            >
              <Calendar className={`w-4 h-4 ${period.active ? 'text-amber-400 animate-pulse' : 'text-[var(--text-secondary)]'}`} />
              <div className="text-left">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block font-semibold">
                  {period.active ? 'Filtro Central Ativo' : 'Período Geral'}
                </span>
                <span className="font-bold text-[var(--text-primary)]">
                  {period.active 
                    ? (period.month === 0 ? `Ano ${period.year}` : `${String(period.month).padStart(2, '0')}/${period.year}`)
                    : 'Todos os Meses'}
                </span>
              </div>
            </button>
          </div>

          {/* Actions & User Selector */}
          <div className="flex items-center space-x-2.5">
            
            {/* Quick Actions */}
            <div className="hidden lg:flex items-center space-x-2">
              <button
                onClick={() => onOpenNewTitleModal('RECEBER')}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                title="Novo lançamento a receber"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                + Receber
              </button>

              <button
                onClick={() => onOpenNewTitleModal('PAGAR')}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                title="Novo lançamento a pagar"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                + Pagar
              </button>

              <button
                onClick={onOpenTransferModal}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                title="Transferência entre contas bancárias"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
                Transferência
              </button>

              <button
                onClick={onOpenBillingModal}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-indigo-700 hover:bg-indigo-800 transition-colors shadow-sm"
                title="Gerar faturamento mensal de contratos"
              >
                <CalendarClock className="w-3.5 h-3.5 mr-1" />
                Faturar Mês
              </button>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#273040] bg-slate-100 dark:bg-[#1B212D] text-slate-800 dark:text-[#F8FAFC] hover:border-amber-500/50 hover:text-amber-500 transition-all text-xs font-semibold shadow-xs"
              title={theme === 'dark' ? 'Mudar para Tema Claro (Alto Contraste)' : 'Mudar para Tema Escuro (Leão Dourado)'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-amber-600 animate-in spin-in-180 duration-300" />
              )}
              <span className="hidden sm:inline font-bold text-[11px]">
                {theme === 'dark' ? 'Tema Claro' : 'Tema Grafite/Ouro'}
              </span>
            </button>

            {/* User Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-medium text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-medium text-slate-800 leading-tight">{currentUser.name}</div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadgeColor(currentUser.role)}`}>
                    {getRoleLabel(currentUser.role)}
                  </span>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Alternar Usuário de Teste</p>
                    <p className="text-[11px] text-slate-700">Valide as permissões e alçadas do sistema</p>
                  </div>

                  <div className="py-1">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSwitchUser(u.id)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                          u.id === currentUser.id ? 'bg-indigo-50 font-medium text-indigo-900' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <UserCircle className="w-4 h-4 text-slate-400" />
                          <div>
                            <div>{u.name}</div>
                            <div className="text-[10px] text-slate-700">{u.email}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getRoleBadgeColor(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-1 mt-1 px-3 py-1 space-y-1">
                    <button
                      onClick={handleExportBackup}
                      className="w-full text-left text-xs text-slate-600 hover:text-slate-900 flex items-center py-1"
                    >
                      <Download className="w-3.5 h-3.5 mr-2 text-slate-400" />
                      Exportar Backup JSON
                    </button>

                    <label className="w-full text-left text-xs text-slate-600 hover:text-slate-900 flex items-center py-1 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 mr-2 text-slate-400" />
                      Restaurar Backup JSON
                      <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                    </label>

                    <button
                      onClick={handleResetDemo}
                      className="w-full text-left text-xs text-rose-600 hover:text-rose-800 flex items-center py-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-2 text-rose-400" />
                      Reinicializar Dados Demo
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Global Period Filter Modal */}
      <GlobalPeriodSelectorModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
      />
    </header>
  );
};
