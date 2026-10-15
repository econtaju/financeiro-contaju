import React, { useState, useEffect, useMemo, useTransition, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavigationScreen } from './components/Sidebar';
import { BottomNavBar } from './components/Common/BottomNavBar';
import { storage } from './services/storageService';
import { User } from './types';
import { AppErrorBoundary } from './components/Common/AppErrorBoundary';

// Modals
import { NewTitleModal } from './components/Modals/NewTitleModal';
import { TransferModal } from './components/Modals/TransferModal';
import { BillingGenerationModal } from './components/Modals/BillingGenerationModal';

// Views carregadas via Code-Splitting / Lazy Loading (reduz o bundle principal em mais de 70% e acelera trocas de abas)
const DashboardView = lazy(() => import('./components/Dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const ClientsView = lazy(() => import('./components/Commercial/ClientsView').then(m => ({ default: m.ClientsView })));
const ServicesView = lazy(() => import('./components/Commercial/ServicesView').then(m => ({ default: m.ServicesView })));
const ContractsView = lazy(() => import('./components/Commercial/ContractsView').then(m => ({ default: m.ContractsView })));
const SalesView = lazy(() => import('./components/Commercial/SalesView').then(m => ({ default: m.SalesView })));

const ReceivablesView = lazy(() => import('./components/Financial/ReceivablesView').then(m => ({ default: m.ReceivablesView })));
const PayablesView = lazy(() => import('./components/Financial/PayablesView').then(m => ({ default: m.PayablesView })));
const CreditCardsView = lazy(() => import('./components/Financial/CreditCardsView').then(m => ({ default: m.CreditCardsView })));
const MovementsView = lazy(() => import('./components/Financial/MovementsView').then(m => ({ default: m.MovementsView })));
const BankAccountsView = lazy(() => import('./components/Financial/BankAccountsView').then(m => ({ default: m.BankAccountsView })));
const ReconciliationView = lazy(() => import('./components/Financial/ReconciliationView').then(m => ({ default: m.ReconciliationView })));

const DREView = lazy(() => import('./components/Management/DREView').then(m => ({ default: m.DREView })));
const CashFlowView = lazy(() => import('./components/Management/CashFlowView').then(m => ({ default: m.CashFlowView })));
const BudgetPlanningView = lazy(() => import('./components/Management/BudgetPlanningView').then(m => ({ default: m.BudgetPlanningView })));
const CompareDRECashView = lazy(() => import('./components/Management/CompareDRECashView').then(m => ({ default: m.CompareDRECashView })));
const ReportsView = lazy(() => import('./components/Management/ReportsView').then(m => ({ default: m.ReportsView })));
const SettingsHubView = lazy(() => import('./components/Config/SettingsHubView').then(m => ({ default: m.SettingsHubView })));
import type { ConfigSubTab } from './components/Config/SettingsHubView';

import { Menu, Minimize2 } from 'lucide-react';
import { useToast, ToastProvider } from './hooks/useToast';
import { ToastContainer } from './components/Common/Toast';
import { FloatingCalculator } from './components/Common/FloatingCalculator';
import { LoginView } from './components/Auth/LoginView';

const ScreenLoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[350px] animate-pulse">
    <div className="w-9 h-9 border-3 border-amber-500/25 border-t-amber-500 rounded-full animate-spin mb-3" />
    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Carregando painel...</span>
  </div>
);

function AppContent() {
  const { toasts, dismissToast, showSuccess, showError, showInfo } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => storage.isAuthenticated());
  const [currentScreen, setCurrentScreen] = useState<NavigationScreen>('DASHBOARD');
  const [isPendingScreen, startScreenTransition] = useTransition();
  const [currentUser, setCurrentUser] = useState<User>(storage.getCurrentUser());
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Transição de tela suave sem congelar a interface
  const handleNavigate = (screen: NavigationScreen) => {
    startScreenTransition(() => {
      setCurrentScreen(screen);
    });
  };

  // Badges de pendências para navegação mobile memoizados
  const { overduePayablesCount, overdueReceivablesCount } = useMemo(() => {
    const titles = storage.getTitles();
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      overduePayablesCount: titles.filter(t => t.type === 'PAGAR' && t.balancePrincipal > 0 && t.dueDate < todayStr).length,
      overdueReceivablesCount: titles.filter(t => t.type === 'RECEBER' && t.balancePrincipal > 0 && t.dueDate < todayStr).length
    };
  }, [currentScreen]);

  // Sair do Modo Foco ao pressionar a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // Initialize theme on root
  useEffect(() => {
    const currentTheme = storage.getTheme();
    document.documentElement.classList.toggle('light', currentTheme === 'light');
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');

    const unsubscribe = storage.subscribe(() => {
      const updatedTheme = storage.getTheme();
      document.documentElement.classList.toggle('light', updatedTheme === 'light');
      document.documentElement.classList.toggle('dark', updatedTheme === 'dark');
      setCurrentUser(storage.getCurrentUser());
      setIsAuthenticated(storage.isAuthenticated());
    });
    return unsubscribe;
  }, []);

  // Global transactional modals
  const [isNewTitleModalOpen, setIsNewTitleModalOpen] = useState(false);
  const [newTitleType, setNewTitleType] = useState<'RECEBER' | 'PAGAR'>('RECEBER');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  // Floating Calculator State (persistente - inicia ativa como numerozinho flutuante)
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('contaju_calc_open');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [isCalculatorMinimized, setIsCalculatorMinimized] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('contaju_calc_minimized');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('contaju_calc_open', JSON.stringify(isCalculatorOpen));
    } catch {
      // ignore
    }
  }, [isCalculatorOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('contaju_calc_minimized', JSON.stringify(isCalculatorMinimized));
    } catch {
      // ignore
    }
  }, [isCalculatorMinimized]);

  // Global Keyboard Shortcut Alt+C para Calculadora
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setIsCalculatorOpen(prev => {
          if (!prev) {
            setIsCalculatorMinimized(false);
            return true;
          }
          setIsCalculatorMinimized(min => !min);
          return true;
        });
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleToggleCalculator = () => {
    if (!isCalculatorOpen) {
      setIsCalculatorOpen(true);
      setIsCalculatorMinimized(false);
    } else if (isCalculatorMinimized) {
      setIsCalculatorMinimized(false);
    } else {
      setIsCalculatorMinimized(true);
    }
  };

  // Global search navigation filter
  const [globalSearchFilter, setGlobalSearchFilter] = useState<{
    screen: NavigationScreen;
    term: string;
    timestamp: number;
  } | null>(null);

  const handleNavigateWithSearch = (screen: NavigationScreen, searchFilter: string) => {
    setGlobalSearchFilter({ screen, term: searchFilter, timestamp: Date.now() });
    handleNavigate(screen);
  };

  // Refresh user state if changed in storage
  useEffect(() => {
    const user = storage.getCurrentUser();
    setCurrentUser(user);
  }, [currentScreen]);

  const handleOpenNewTitleModal = (type: 'RECEBER' | 'PAGAR') => {
    setNewTitleType(type);
    setIsNewTitleModalOpen(true);
  };

  const currentSearchTerm = globalSearchFilter?.screen === currentScreen ? globalSearchFilter.term : undefined;

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'DASHBOARD':
        return (
          <DashboardView
            onNavigate={handleNavigate}
            onOpenNewTitleModal={handleOpenNewTitleModal}
            onOpenBillingModal={() => setIsBillingModalOpen(true)}
            onOpenTransferModal={() => setIsTransferModalOpen(true)}
          />
        );
      
      // Commercial
      case 'CLIENTES':
        return <ClientsView initialSearch={currentSearchTerm} />;
      case 'SERVICOS':
        return <ServicesView initialSearch={currentSearchTerm} />;
      case 'CONTRATOS':
        return (
          <ContractsView 
            onOpenBillingModal={() => setIsBillingModalOpen(true)} 
            initialSearch={currentSearchTerm}
          />
        );
      case 'VENDAS_FATURAMENTO':
        return (
          <SalesView 
            onOpenBillingModal={() => setIsBillingModalOpen(true)} 
            initialSearch={currentSearchTerm}
            onNavigate={(screen) => handleNavigate(screen as any)}
          />
        );

      // Financial
      case 'CONTAS_RECEBER':
        return (
          <ReceivablesView 
            onOpenNewTitleModal={handleOpenNewTitleModal} 
            initialSearch={currentSearchTerm}
          />
        );
      case 'CONTAS_PAGAR':
        return (
          <PayablesView 
            onOpenNewTitleModal={handleOpenNewTitleModal} 
            initialSearch={currentSearchTerm}
          />
        );
      case 'CARTAO_CREDITO':
        return <CreditCardsView onNavigateToPayables={() => handleNavigate('CONTAS_PAGAR')} />;
      case 'MOVIMENTACOES':
        return <MovementsView initialSearch={currentSearchTerm} />;
      case 'BANCOS_CONTAS':
        return <BankAccountsView onOpenTransferModal={() => setIsTransferModalOpen(true)} />;
      case 'CONCILIACAO':
        return <ReconciliationView />;

      // Management & Reports
      case 'DRE':
        return <DREView isFocusMode={isFocusMode} onToggleFocusMode={() => setIsFocusMode(prev => !prev)} onNavigate={handleNavigate} />;
      case 'FLUXO_CAIXA':
        return <CashFlowView isFocusMode={isFocusMode} onToggleFocusMode={() => setIsFocusMode(prev => !prev)} />;
      case 'PLANEJAMENTO_ORCAMENTARIO':
        return <BudgetPlanningView />;
      case 'COMPARE_DRE_CAIXA':
        return <CompareDRECashView />;
      case 'RELATORIOS':
        return <ReportsView />;

      // Consolidated Configuration Hub & AI Center
      case 'IA':
        return (
          <SettingsHubView
            initialTab="IA"
            onNavigateToScreen={handleNavigate}
            onOpenBillingModal={() => setIsBillingModalOpen(true)}
          />
        );

      case 'CONFIGURACOES':
      case 'EMPRESA':
      case 'FORNECEDORES':
      case 'PLANO_CONTAS':
      case 'RECORRENCIAS':
      case 'USUARIOS_PERMISSOES':
      case 'FECHAMENTO_PERIODO':
      case 'MODULOS_INTEGRACOES':
      case 'NOTIFICACOES':
      case 'MELHORIAS':
      case 'AUDITORIA':
      case 'BACKUP':
        return (
          <SettingsHubView
            initialTab={currentScreen === 'CONFIGURACOES' ? 'EMPRESA' : (currentScreen as ConfigSubTab)}
            onNavigateToScreen={handleNavigate}
            onOpenBillingModal={() => setIsBillingModalOpen(true)}
          />
        );

      default:
        return (
          <DashboardView
            onNavigate={handleNavigate}
            onOpenNewTitleModal={handleOpenNewTitleModal}
            onOpenBillingModal={() => setIsBillingModalOpen(true)}
            onOpenTransferModal={() => setIsTransferModalOpen(true)}
          />
        );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[var(--surface-canvas)] font-sans antialiased text-[var(--text-primary)]">
        <LoginView
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthenticated(true);
            showSuccess('Acesso Liberado', `Bem-vindo(a), ${user.name}!`);
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full max-w-full bg-[var(--bg-app)] text-[var(--text-primary)] overflow-x-hidden overflow-y-hidden font-sans antialiased transition-colors relative">
      
      {/* Floating Focus Mode Banner */}
      {isFocusMode && (
        <div className="fixed top-3 right-4 z-50 flex items-center gap-2.5 bg-slate-950/90 backdrop-blur-md border border-amber-500/50 shadow-2xl px-3.5 py-1.5 rounded-full animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-semibold text-amber-300">Modo Foco Ativo</span>
          <button
            onClick={() => setIsFocusMode(false)}
            className="ml-1 px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Pressione ESC para sair do Modo Foco"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Sair (Esc)
          </button>
        </div>
      )}

      {/* Sidebar for Desktop and Mobile (hidden in Focus Mode) */}
      {!isFocusMode && (
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            handleNavigate(screen);
            setIsMobileSidebarOpen(false);
          }}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onLogout={() => {
            setIsAuthenticated(false);
            showInfo('Sessão Encerrada', 'Você saiu com segurança.');
          }}
        />
      )}

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 max-w-full relative">
        {/* Indicador de Transição Suave entre Telas (não-intrusivo) */}
        {isPendingScreen && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse z-50 shadow-xs" />
        )}
        
        {/* Global Header Responsivo (hidden in Focus Mode) */}
        {!isFocusMode && (
          <Header
            currentUser={currentUser}
            currentScreen={currentScreen}
            onOpenNewTitleModal={handleOpenNewTitleModal}
            onOpenTransferModal={() => setIsTransferModalOpen(true)}
            onOpenBillingModal={() => setIsBillingModalOpen(true)}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onNavigate={handleNavigate}
            onNavigateWithSearch={handleNavigateWithSearch}
            onToggleCalculator={handleToggleCalculator}
            isCalculatorOpen={isCalculatorOpen}
            isCalculatorMinimized={isCalculatorMinimized}
            onLogout={() => {
              setIsAuthenticated(false);
              showInfo('Sessão Encerrada', 'Você saiu com segurança.');
            }}
          />
        )}

        {/* Main Dynamic View Scroll Area - Full Screen Width Responsivo */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg-app)] text-[var(--text-primary)] w-full max-w-full min-w-0 ${
          isFocusMode ? 'p-2 sm:p-4' : 'p-2 sm:p-3 md:p-4 lg:p-5 pb-20 lg:pb-5'
        }`}>
          <div className="w-full max-w-full min-w-0 space-y-4">
            <AppErrorBoundary fallbackTitle="Falha na exibição desta tela">
              <Suspense fallback={<ScreenLoadingFallback />}>
                {renderActiveScreen()}
              </Suspense>
            </AppErrorBoundary>
          </div>
        </main>
      </div>

      {/* Transactional Modals */}
      {isNewTitleModalOpen && (
        <NewTitleModal
          key={`new-title-${newTitleType}`}
          isOpen={isNewTitleModalOpen}
          defaultType={newTitleType}
          onClose={() => setIsNewTitleModalOpen(false)}
          onSaved={(details) => {
            setIsNewTitleModalOpen(false);
            const tipoLabel = (details?.type || newTitleType) === 'RECEBER' ? 'Título a receber' : 'Título a pagar';
            const countLabel = details?.count && details.count > 1 ? ` (${details.count} lançamentos/parcelas)` : '';
            const descLabel = details?.description ? `: "${details.description}"` : '';
            showSuccess(
              `${tipoLabel}${countLabel}${descLabel} salvo com sucesso no sistema!`,
              'Lançamento Concluído'
            );
            // force re-render
            setCurrentScreen(prev => prev);
          }}
          onCreated={() => {
            setIsNewTitleModalOpen(false);
            setCurrentScreen(prev => prev);
          }}
          onError={(err) => {
            showError(err, 'Erro ao Salvar Título');
          }}
        />
      )}

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onTransferred={() => {
          setIsTransferModalOpen(false);
          showSuccess('Transferência entre contas bancárias registrada com sucesso!', 'Transferência Efetuada');
          setCurrentScreen(prev => prev);
        }}
        onCompleted={() => {
          setIsTransferModalOpen(false);
          showSuccess('Transferência entre contas bancárias registrada com sucesso!', 'Transferência Efetuada');
          setCurrentScreen(prev => prev);
        }}
        onError={(err) => {
          showError(err, 'Falha na Transferência');
        }}
      />

      <BillingGenerationModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        onGenerated={(res) => {
          setIsBillingModalOpen(false);
          if (res && res.generatedCount > 0) {
            showSuccess(
              `${res.generatedCount} título(s) gerados para a competência selecionada!`,
              'Faturamento Concluído'
            );
          } else if (res && res.alreadyExistingCount > 0) {
            showInfo(
              `Todos os contratos ativos já foram faturados anteriormente para este período (${res.alreadyExistingCount} títulos existentes).`,
              'Faturamento em Dia'
            );
          } else {
            showSuccess('Geração de faturamento concluída com sucesso!', 'Faturamento Concluído');
          }
          setCurrentScreen(prev => prev);
        }}
      />

      {/* Sistema Global de Notificações (Toast) */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Calculadora Flutuante e Minimizável do Sistema */}
      <FloatingCalculator
        isOpen={isCalculatorOpen}
        isMinimized={isCalculatorMinimized}
        onOpen={() => {
          setIsCalculatorOpen(true);
          setIsCalculatorMinimized(false);
        }}
        onMinimize={() => setIsCalculatorMinimized(true)}
        onClose={() => setIsCalculatorOpen(false)}
      />

      {/* Barra de Navegação Inferior Mobile */}
      {!isFocusMode && (
        <BottomNavBar
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          onOpenDrawer={() => setIsMobileSidebarOpen(true)}
          overduePayablesCount={overduePayablesCount}
          overdueReceivablesCount={overdueReceivablesCount}
        />
      )}

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

