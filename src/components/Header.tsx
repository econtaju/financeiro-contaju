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
  Calculator,
  Menu,
  LogOut
} from 'lucide-react';
import { User, UserRole } from '../types';
import { NavigationScreen } from './Sidebar';
import { storage } from '../services/storageService';
import { FinancialEngine, formatBRL } from '../services/financialEngine';
import { useGlobalPeriod } from '../hooks/useGlobalPeriod';
import { GlobalPeriodSelectorModal } from './Common/GlobalPeriodSelectorModal';
import { GlobalSearchModal } from './Common/GlobalSearchModal';
import { GoldenLionLogo } from './Common/GoldenLionLogo';
import { PWAInstallButton } from './Common/PWAInstallButton';
import { OfflineSyncIndicator } from './Common/OfflineSyncIndicator';

interface HeaderProps {
  currentUser: User;
  onOpenNewTitleModal: (defaultType: 'RECEBER' | 'PAGAR') => void;
  onOpenTransferModal: () => void;
  onOpenBillingModal: () => void;
  onOpenMobileSidebar?: () => void;
  onNavigate?: (screen: NavigationScreen) => void;
  onNavigateWithSearch?: (screen: NavigationScreen, searchFilter: string) => void;
  onToggleCalculator?: () => void;
  isCalculatorOpen?: boolean;
  isCalculatorMinimized?: boolean;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenNewTitleModal,
  onOpenTransferModal,
  onOpenBillingModal,
  onOpenMobileSidebar,
  onNavigate,
  onNavigateWithSearch,
  onToggleCalculator,
  isCalculatorOpen = false,
  isCalculatorMinimized = false,
  onLogout
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
    window.location.reload();
  };

  const handleExportBackup = () => {
    const backupJson = storage.exportFullBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-contaju-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowUserMenu(false);
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

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Gestor Geral (Acesso Total)';
      case 'ADMIN': return 'Administrador';
      case 'GESTOR_FINANCEIRO': return 'Gestor';
      case 'OPERADOR': return 'Operador';
      case 'CONSULTA': return 'Consulta';
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-amber-500/25 text-amber-300 border-amber-500/60 font-black shadow-xs';
      case 'ADMIN': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'GESTOR_FINANCEIRO': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'OPERADOR': return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
      case 'CONSULTA': return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <header className="bg-[var(--surface-card)] border-b border-[var(--border-subtle)] text-[var(--text-primary)] sticky top-0 z-30 transition-colors w-full">
      <div className="w-full px-2.5 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16 gap-1.5 sm:gap-3">
          
          {/* Esquerda: Menu Hamburguer Mobile + Marca Contaju */}
          <div className="flex items-center space-x-1 sm:space-x-2.5 shrink-0">
            {onOpenMobileSidebar && (
              <button
                onClick={onOpenMobileSidebar}
                className="lg:hidden w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] active:scale-95 transition-all cursor-pointer"
                aria-label="Abrir menu de navegação"
                title="Abrir menu lateral"
              >
                <Menu className="w-5 h-5 text-amber-400" />
              </button>
            )}

            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <GoldenLionLogo size="sm" />
              <div className="hidden xs:block sm:block">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-[var(--text-primary)] text-sm sm:text-base tracking-tight">
                    <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">CONTAJU</span>
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] truncate max-w-[90px] sm:max-w-xs">{company.tradeName}</p>
              </div>
            </div>
          </div>

          {/* Centro: Barra de Busca Global no Desktop ou Atalho Rápido no Mobile */}
          <div className="flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-md mx-1 sm:mx-2">
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="w-full h-9 min-h-[38px] flex items-center justify-between px-2 sm:px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] hover:border-amber-500/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs group"
              title="Buscar clientes, contratos, faturas, serviços (Ctrl+K ou ⌘K)"
            >
              <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0 truncate">
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500/80 group-hover:text-amber-500 transition-colors shrink-0" />
                <span className="text-[11px] sm:text-xs truncate">Buscar...</span>
              </div>
              <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-[var(--text-secondary)] px-1.5 py-0.5 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] shrink-0">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          </div>

          {/* Centro-Direita: Disponibilidade & Período (Desktop) */}
          <div className="hidden xl:flex items-center gap-2 shrink-0">
            <div className="h-9 flex items-center gap-2 bg-[var(--surface-elevated)] px-3 rounded-lg border border-[var(--border-subtle)] whitespace-nowrap">
              <Wallet className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[var(--text-secondary)] text-[11px]">Disponibilidade:</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">{formatBRL(consolidatedCash)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className={`h-9 flex items-center gap-2 px-3 rounded-lg border transition-all text-xs whitespace-nowrap shrink-0 cursor-pointer ${
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
                    : 'Geral'}
                </span>
              </div>
            </button>
          </div>

          {/* Botão de Período Compacto em telas médias */}
          <div className="hidden md:flex xl:hidden items-center shrink-0">
            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className="h-8 flex items-center gap-1.5 px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-xs text-[var(--text-primary)] cursor-pointer"
              title="Filtrar Período"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-[11px]">
                {period.active 
                  ? (period.month === 0 ? `${period.year}` : `${String(period.month).padStart(2, '0')}/${period.year}`)
                  : 'Geral'}
              </span>
            </button>
          </div>

          {/* Ações Rápidas & Controles (Responsivo) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            
            {/* Quick Actions (Desktop Grande) */}
            <div className="hidden 2xl:flex items-center gap-1.5">
              <button
                onClick={() => onOpenNewTitleModal('RECEBER')}
                className="h-9 inline-flex items-center px-2.5 text-xs font-bold rounded-lg text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800/60 dark:hover:bg-emerald-900/60 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
                title="Novo lançamento a receber"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1 text-emerald-700 dark:text-emerald-400" />
                + Receber
              </button>

              <button
                onClick={() => onOpenNewTitleModal('PAGAR')}
                className="h-9 inline-flex items-center px-2.5 text-xs font-bold rounded-lg text-rose-900 bg-rose-100 hover:bg-rose-200 border border-rose-300 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800/60 dark:hover:bg-rose-900/60 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
                title="Novo lançamento a pagar"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1 text-rose-700 dark:text-rose-400" />
                + Pagar
              </button>

              <button
                onClick={onOpenTransferModal}
                className="h-9 inline-flex items-center px-2.5 text-xs font-semibold rounded-lg text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:bg-slate-800/80 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                title="Transferência entre contas bancárias"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 mr-1 text-slate-600 dark:text-slate-400" />
                Transferir
              </button>
            </div>

            {/* Indicador de Conexão e Sincronização em Segundo Plano */}
            <OfflineSyncIndicator />

            {/* Botão de Instalação do App PWA no Desktop / Navegador */}
            <PWAInstallButton variant="header" />

            {/* Calculadora Flutuante */}
            {onToggleCalculator && (
              <button
                onClick={onToggleCalculator}
                className={`h-9 min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center px-2 sm:px-2.5 rounded-lg border transition-all text-xs font-semibold shadow-xs shrink-0 cursor-pointer ${
                  isCalculatorOpen && !isCalculatorMinimized
                    ? 'border-amber-500 bg-amber-500/15 text-amber-400 shadow-amber-500/10'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-amber-400'
                }`}
                title="Calculadora (Alt+C)"
              >
                <Calculator className="w-4 h-4 text-amber-500" />
              </button>
            )}

            {/* Notificações com Alerta Visual */}
            <button
              onClick={() => onNavigate && onNavigate('NOTIFICACOES')}
              className="h-9 w-9 min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center relative rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-amber-400 transition-all text-xs font-semibold shadow-xs shrink-0 cursor-pointer"
              title="Central de Notificações e Alertas"
            >
              <Bell className="w-4 h-4" />
              {totalAlerts > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-slate-950 ring-2 ring-[var(--surface-card)] animate-pulse">
                  {totalAlerts > 9 ? '9+' : totalAlerts}
                </span>
              )}
            </button>

            {/* Alternador de Tema Dark / Light RESPONSIVO */}
            <button
              onClick={toggleTheme}
              className="h-9 min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center px-2 sm:px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:border-amber-500/50 hover:text-amber-400 transition-all text-xs font-semibold shadow-xs shrink-0 cursor-pointer"
              title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro (Leão Dourado)'}
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-amber-600 animate-in spin-in-180 duration-300" />
              )}
              <span className="hidden xl:inline ml-1.5 font-bold text-[11px]">
                {theme === 'dark' ? 'Claro' : 'Grafite'}
              </span>
            </button>

            {/* Menu de Usuário & Backup */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="h-9 min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] flex items-center space-x-1.5 sm:space-x-2 px-1.5 sm:px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
                title="Perfil e Configurações"
              >
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-semibold text-[var(--text-primary)] leading-tight truncate max-w-[90px]">{currentUser.name}</div>
                  <span className={`text-[9px] font-semibold px-1 py-0.2 rounded border ${getRoleBadgeColor(currentUser.role)}`}>
                    {getRoleLabel(currentUser.role)}
                  </span>
                </div>
              </button>

              {/* Dropdown de Usuário com Adaptação Completa ao Tema */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-24px)] bg-[var(--surface-card)] rounded-xl shadow-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-2 border-b border-[var(--border-subtle)]">
                    <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Alternar Usuário de Teste</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">Valide as permissões e alçadas do sistema</p>
                  </div>

                  <div className="py-1 max-h-48 overflow-y-auto">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSwitchUser(u.id)}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer ${
                          u.id === currentUser.id ? 'bg-amber-500/10 font-bold text-amber-400' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <UserCircle className="w-4 h-4 text-amber-500/80" />
                          <div>
                            <div className="text-[var(--text-primary)]">{u.name}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">{u.email}</div>
                          </div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getRoleBadgeColor(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-[var(--border-subtle)] pt-1.5 mt-1 px-3.5 py-1 space-y-1">
                    <button
                      onClick={handleExportBackup}
                      className="w-full text-left text-xs text-[var(--text-secondary)] hover:text-amber-400 flex items-center py-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 mr-2 text-amber-500" />
                      Exportar Backup JSON
                    </button>

                    <label className="w-full text-left text-xs text-[var(--text-secondary)] hover:text-amber-400 flex items-center py-1.5 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 mr-2 text-amber-500" />
                      Restaurar Backup JSON
                      <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                    </label>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        storage.logout();
                        if (onLogout) onLogout();
                      }}
                      className="w-full text-left text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 flex items-center py-1.5 cursor-pointer transition-colors border-t border-[var(--border-subtle)] mt-1 pt-1.5 font-bold"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-2 text-rose-500" />
                      Encerrar Sessão (Sair)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botão Direto de Logout / Trocar Usuário (Desktop/Tablet) */}
            <button
              onClick={() => {
                storage.logout();
                if (onLogout) onLogout();
              }}
              className="hidden sm:flex h-9 min-h-[40px] items-center justify-center px-2 sm:px-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 transition-all text-xs font-bold shadow-xs shrink-0 cursor-pointer gap-1"
              title="Encerrar Sessão / Trocar de Usuário"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[11px]">Sair</span>
            </button>

          </div>

        </div>
      </div>

      {/* Modais Globais do Header */}
      {isPeriodModalOpen && (
        <GlobalPeriodSelectorModal
          isOpen={isPeriodModalOpen}
          onClose={() => setIsPeriodModalOpen(false)}
        />
      )}

      {isSearchModalOpen && (
        <GlobalSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onNavigate={(screen, searchFilter) => {
            setIsSearchModalOpen(false);
            if (onNavigateWithSearch && searchFilter) {
              onNavigateWithSearch(screen, searchFilter);
            } else if (onNavigate) {
              onNavigate(screen);
            }
          }}
        />
      )}
    </header>
  );
};
