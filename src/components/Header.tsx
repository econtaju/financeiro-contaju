import React, { useState, useEffect } from 'react';
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
  Moon,
  Bell,
  Search,
  Calculator
} from 'lucide-react';
import { User, UserRole } from '../types';
import { NavigationScreen } from './Sidebar';
import { storage } from '../services/storageService';
import { FinancialEngine, formatBRL } from '../services/financialEngine';
import { useGlobalPeriod } from '../hooks/useGlobalPeriod';
import { GlobalPeriodSelectorModal } from './Common/GlobalPeriodSelectorModal';
import { GlobalSearchModal } from './Common/GlobalSearchModal';
import { GoldenLionLogo } from './Common/GoldenLionLogo';

interface HeaderProps {
  currentUser: User;
  onOpenNewTitleModal: (defaultType: 'RECEBER' | 'PAGAR') => void;
  onOpenTransferModal: () => void;
  onOpenBillingModal: () => void;
  onNavigate?: (screen: NavigationScreen) => void;
  onNavigateWithSearch?: (screen: NavigationScreen, searchFilter: string) => void;
  onToggleCalculator?: () => void;
  isCalculatorOpen?: boolean;
  isCalculatorMinimized?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenNewTitleModal,
  onOpenTransferModal,
  onOpenBillingModal,
  onNavigate,
  onNavigateWithSearch,
  onToggleCalculator,
  isCalculatorOpen = false,
  isCalculatorMinimized = false
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(storage.getTheme());
  const { period } = useGlobalPeriod();
  const company = storage.getCompany();
  const users = storage.getUsers();
  const consolidatedCash = FinancialEngine.getConsolidatedCashBalance();

  // Keyboard shortcut Ctrl+K / Cmd+K para abrir busca global
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Contagem de notificações em tempo real
  const titles = storage.getTitles();
  const todayStr = new Date().toISOString().split('T')[0];
  const contracts = storage.getContracts().filter(c => c.status === 'ATIVO');
  const expiringContractsCount = contracts.filter(c => {
    if (!c.endDate) return false;
    const diffDays = Math.ceil((new Date(c.endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;
  const payablesTodayCount = titles.filter(t => t.type === 'PAGAR' && t.balancePrincipal > 0 && t.dueDate === todayStr).length;
  const pendingReconciliationCount = storage.getStatementEntries().filter(
    s => s.reconciliationStatus === 'PENDENTE' || s.reconciliationStatus === 'SUGESTAO'
  ).length;
  const totalAlerts = expiringContractsCount + payablesTodayCount + pendingReconciliationCount;

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
      case 'ADMIN': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'GESTOR_FINANCEIRO': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'OPERADOR': return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
      case 'CONSULTA': return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <header className="bg-[var(--surface-card)] border-b border-[var(--border-subtle)] text-[var(--text-primary)] sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Brand & Company info */}
          <div className="flex items-center space-x-3 shrink-0">
            <GoldenLionLogo size="md" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[var(--text-primary)] text-base tracking-tight">
                  <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">CONTAJU</span>
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] truncate max-w-xs">{company.tradeName}</p>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-2 sm:mx-4">
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="w-full h-9 flex items-center justify-between px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] hover:border-amber-500/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs group"
              title="Buscar clientes, contratos, faturas, serviços (Ctrl+K ou ⌘K)"
            >
              <div className="flex items-center space-x-2 truncate">
                <Search className="w-4 h-4 text-amber-500/80 group-hover:text-amber-500 transition-colors shrink-0" />
                <span className="text-xs truncate">Buscar clientes, contratos, faturas...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-[var(--text-secondary)] px-1.5 py-0.5 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] shrink-0">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          </div>

          {/* Center: Consolidated Cash Balance Indicator & Global Period Filter */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <div className="h-9 flex items-center gap-2 bg-[var(--surface-elevated)] px-3 rounded-lg border border-[var(--border-subtle)] whitespace-nowrap">
              <Wallet className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[var(--text-secondary)] text-[11px]">Disponibilidade:</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">{formatBRL(consolidatedCash)}</span>
              </div>
            </div>

            {/* Global Period Filter Button */}
            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className={`h-9 flex items-center gap-2 px-3 rounded-lg border transition-all text-xs whitespace-nowrap shrink-0 ${
                period.active 
                  ? 'bg-amber-500/10 border-amber-400/40 text-amber-400 shadow-xs' 
                  : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-amber-500/40'
              }`}
              title="Filtrar por Mês e Ano Central (sincroniza todo o sistema)"
            >
              <Calendar className={`w-4 h-4 shrink-0 ${period.active ? 'text-amber-400 animate-pulse' : 'text-[var(--text-secondary)]'}`} />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                  {period.active ? 'Filtro:' : 'Período:'}
                </span>
                <span className="font-bold text-[var(--text-primary)]">
                  {period.active 
                    ? (period.month === 0 ? `Ano ${period.year}` : `${String(period.month).padStart(2, '0')}/${period.year}`)
                    : 'Geral (Todos)'}
                </span>
              </div>
            </button>
          </div>

          {/* Actions & User Selector */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Quick Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => onOpenNewTitleModal('RECEBER')}
                className="h-9 inline-flex items-center px-3 text-xs font-bold rounded-lg text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800/60 dark:hover:bg-emerald-900/60 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
                title="Novo lançamento a receber"
              >
                <PlusCircle className="w-4 h-4 mr-1.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                + Receber
              </button>

              <button
                onClick={() => onOpenNewTitleModal('PAGAR')}
                className="h-9 inline-flex items-center px-3 text-xs font-bold rounded-lg text-rose-900 bg-rose-100 hover:bg-rose-200 border border-rose-300 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800/60 dark:hover:bg-rose-900/60 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
                title="Novo lançamento a pagar"
              >
                <PlusCircle className="w-4 h-4 mr-1.5 shrink-0 text-rose-700 dark:text-rose-400" />
                + Pagar
              </button>

              <button
                onClick={onOpenTransferModal}
                className="h-9 inline-flex items-center px-3 text-xs font-semibold rounded-lg text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:bg-slate-800/80 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                title="Transferência entre contas bancárias"
              >
                <ArrowLeftRight className="w-4 h-4 mr-1.5 shrink-0 text-slate-600 dark:text-slate-400" />
                Transferência
              </button>

              <button
                onClick={onOpenBillingModal}
                className="h-9 inline-flex items-center px-3 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs whitespace-nowrap cursor-pointer"
                title="Gerar faturamento mensal de contratos"
              >
                <CalendarClock className="w-4 h-4 mr-1.5 shrink-0" />
                Faturar Mês
              </button>
            </div>

            {/* Floating Calculator Toggle Button */}
            {onToggleCalculator && (
              <button
                onClick={onToggleCalculator}
                className={`h-9 flex items-center space-x-1.5 px-2.5 rounded-lg border transition-all text-xs font-semibold shadow-xs shrink-0 cursor-pointer ${
                  isCalculatorOpen && !isCalculatorMinimized
                    ? 'border-amber-500 bg-amber-500/15 text-amber-400 shadow-amber-500/10'
                    : isCalculatorOpen && isCalculatorMinimized
                    ? 'border-amber-500/40 bg-slate-100 dark:bg-[#1B212D] text-amber-500 hover:border-amber-500'
                    : 'border-slate-300 dark:border-[#273040] bg-slate-100 dark:bg-[#1B212D] text-slate-700 dark:text-[#F8FAFC] hover:border-amber-500/50 hover:text-amber-500'
                }`}
                title="Calculadora do Sistema (Atalho: Alt+C)"
              >
                <Calculator className={`w-4 h-4 shrink-0 ${isCalculatorOpen ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`} />
                <span className="hidden xl:inline text-[11px] font-bold">
                  Calc
                </span>
              </button>
            )}

            {/* Notification Bell */}
            <button
              onClick={() => onNavigate && onNavigate('NOTIFICACOES')}
              className="h-9 w-9 flex items-center justify-center relative rounded-lg border border-slate-300 dark:border-[#273040] bg-slate-100 dark:bg-[#1B212D] text-slate-700 dark:text-[#F8FAFC] hover:border-amber-500/50 hover:text-amber-500 transition-all text-xs font-semibold shadow-xs shrink-0"
              title="Abrir Central de Notificações e Alertas Operacionais"
            >
              <Bell className="w-4 h-4" />
              {totalAlerts > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-slate-950 ring-2 ring-white dark:ring-[#1B212D] animate-pulse">
                  {totalAlerts > 9 ? '9+' : totalAlerts}
                </span>
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="h-9 flex items-center space-x-1.5 px-3 rounded-lg border border-slate-300 dark:border-[#273040] bg-slate-100 dark:bg-[#1B212D] text-slate-800 dark:text-[#F8FAFC] hover:border-amber-500/50 hover:text-amber-500 transition-all text-xs font-semibold shadow-xs shrink-0 whitespace-nowrap"
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
            <div className="relative shrink-0">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="h-9 flex items-center space-x-2 px-2.5 rounded-lg border border-slate-200 dark:border-[#273040] hover:bg-slate-50 dark:hover:bg-[#1B212D] transition-colors whitespace-nowrap"
              >
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center font-bold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-medium text-[var(--text-primary)] leading-tight">{currentUser.name}</div>
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

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onNavigateToItem={(screen, searchFilter) => {
          if (onNavigateWithSearch) {
            onNavigateWithSearch(screen, searchFilter);
          } else if (onNavigate) {
            onNavigate(screen);
          }
        }}
      />
    </header>
  );
};
