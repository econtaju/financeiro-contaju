import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavigationScreen } from './components/Sidebar';
import { storage } from './services/storageService';
import { User } from './types';

// Modals
import { NewTitleModal } from './components/Modals/NewTitleModal';
import { TransferModal } from './components/Modals/TransferModal';
import { BillingGenerationModal } from './components/Modals/BillingGenerationModal';

// Views
import { DashboardView } from './components/Dashboard/DashboardView';
import { ClientsView } from './components/Commercial/ClientsView';
import { ServicesView } from './components/Commercial/ServicesView';
import { ContractsView } from './components/Commercial/ContractsView';
import { SalesView } from './components/Commercial/SalesView';

import { ReceivablesView } from './components/Financial/ReceivablesView';
import { PayablesView } from './components/Financial/PayablesView';
import { CreditCardsView } from './components/Financial/CreditCardsView';
import { MovementsView } from './components/Financial/MovementsView';
import { BankAccountsView } from './components/Financial/BankAccountsView';
import { ReconciliationView } from './components/Financial/ReconciliationView';

import { DREView } from './components/Management/DREView';
import { CashFlowView } from './components/Management/CashFlowView';
import { BudgetPlanningView } from './components/Management/BudgetPlanningView';
import { CompareDRECashView } from './components/Management/CompareDRECashView';
import { ReportsView } from './components/Management/ReportsView';

import { CompanyConfigView } from './components/Config/CompanyConfigView';
import { SuppliersView } from './components/Config/SuppliersView';
import { ChartOfAccountsView } from './components/Config/ChartOfAccountsView';
import { RecurrencesView } from './components/Config/RecurrencesView';
import { UsersPermissionsView } from './components/Config/UsersPermissionsView';
import { PeriodClosureView } from './components/Config/PeriodClosureView';
import { IntegrationsView } from './components/Config/IntegrationsView';
import { ImprovementsView } from './components/Config/ImprovementsView';
import { AuditView } from './components/Config/AuditView';

import { Menu } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<NavigationScreen>('DASHBOARD');
  const [currentUser, setCurrentUser] = useState<User>(storage.getCurrentUser());
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
    });
    return unsubscribe;
  }, []);

  // Global transactional modals
  const [isNewTitleModalOpen, setIsNewTitleModalOpen] = useState(false);
  const [newTitleType, setNewTitleType] = useState<'RECEBER' | 'PAGAR'>('RECEBER');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  // Refresh user state if changed in storage
  useEffect(() => {
    const user = storage.getCurrentUser();
    setCurrentUser(user);
  }, [currentScreen]);

  const handleOpenNewTitleModal = (type: 'RECEBER' | 'PAGAR') => {
    setNewTitleType(type);
    setIsNewTitleModalOpen(true);
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'DASHBOARD':
        return (
          <DashboardView
            onNavigate={(screen) => setCurrentScreen(screen)}
            onOpenNewTitleModal={handleOpenNewTitleModal}
            onOpenBillingModal={() => setIsBillingModalOpen(true)}
            onOpenTransferModal={() => setIsTransferModalOpen(true)}
          />
        );
      
      // Commercial
      case 'CLIENTES':
        return <ClientsView />;
      case 'SERVICOS':
        return <ServicesView />;
      case 'CONTRATOS':
        return <ContractsView onOpenBillingModal={() => setIsBillingModalOpen(true)} />;
      case 'VENDAS_FATURAMENTO':
        return <SalesView onOpenBillingModal={() => setIsBillingModalOpen(true)} />;

      // Financial
      case 'CONTAS_RECEBER':
        return <ReceivablesView onOpenNewTitleModal={handleOpenNewTitleModal} />;
      case 'CONTAS_PAGAR':
        return <PayablesView onOpenNewTitleModal={handleOpenNewTitleModal} />;
      case 'CARTAO_CREDITO':
        return <CreditCardsView onNavigateToPayables={() => setCurrentScreen('CONTAS_PAGAR')} />;
      case 'MOVIMENTACOES':
        return <MovementsView />;
      case 'BANCOS_CONTAS':
        return <BankAccountsView onOpenTransferModal={() => setIsTransferModalOpen(true)} />;
      case 'CONCILIACAO':
        return <ReconciliationView />;

      // Management & Reports
      case 'DRE':
        return <DREView />;
      case 'FLUXO_CAIXA':
        return <CashFlowView />;
      case 'PLANEJAMENTO_ORCAMENTARIO':
        return <BudgetPlanningView />;
      case 'COMPARE_DRE_CAIXA':
        return <CompareDRECashView />;
      case 'RELATORIOS':
        return <ReportsView />;

      // Configuration
      case 'EMPRESA':
        return <CompanyConfigView />;
      case 'FORNECEDORES':
        return <SuppliersView />;
      case 'PLANO_CONTAS':
        return <ChartOfAccountsView />;
      case 'RECORRENCIAS':
        return <RecurrencesView onOpenBillingModal={() => setIsBillingModalOpen(true)} />;
      case 'USUARIOS_PERMISSOES':
        return <UsersPermissionsView />;
      case 'FECHAMENTO_PERIODO':
        return <PeriodClosureView />;
      case 'MODULOS_INTEGRACOES':
        return <IntegrationsView />;
      case 'MELHORIAS':
        return <ImprovementsView />;
      case 'AUDITORIA':
        return <AuditView />;

      default:
        return (
          <DashboardView
            onNavigate={(screen) => setCurrentScreen(screen)}
            onOpenNewTitleModal={handleOpenNewTitleModal}
            onOpenBillingModal={() => setIsBillingModalOpen(true)}
            onOpenTransferModal={() => setIsTransferModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden font-sans antialiased transition-colors">
      
      {/* Sidebar for Desktop and Mobile */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          setCurrentScreen(screen);
          setIsMobileSidebarOpen(false);
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        
        {/* Mobile Header Bar with Hamburger */}
        <div className="md:hidden bg-[var(--surface-card)] text-[var(--text-primary)] p-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
            aria-label="Abrir menu lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm text-cyan-400">Contaju Gestão Financeira</span>
          <div className="w-7 h-7 rounded-lg bg-[#101827] border border-cyan-400/40 text-cyan-400 flex items-center justify-center font-bold text-xs">
            {currentUser.name.substring(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Global Header */}
        <Header
          currentUser={currentUser}
          onOpenNewTitleModal={handleOpenNewTitleModal}
          onOpenTransferModal={() => setIsTransferModalOpen(true)}
          onOpenBillingModal={() => setIsBillingModalOpen(true)}
        />

        {/* Main Dynamic View Scroll Area - Full Screen Width */}
        <main className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 md:p-4 bg-[var(--bg-app)] text-[var(--text-primary)] w-full min-w-0">
          <div className="w-full min-w-0 space-y-4">
            {renderActiveScreen()}
          </div>
        </main>
      </div>

      {/* Transactional Modals */}
      <NewTitleModal
        isOpen={isNewTitleModalOpen}
        defaultType={newTitleType}
        onClose={() => setIsNewTitleModalOpen(false)}
        onCreated={() => {
          setIsNewTitleModalOpen(false);
          // force re-render
          setCurrentScreen(prev => prev);
        }}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onTransferred={() => {
          setIsTransferModalOpen(false);
          setCurrentScreen(prev => prev);
        }}
      />

      <BillingGenerationModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        onGenerated={() => {
          setIsBillingModalOpen(false);
          setCurrentScreen(prev => prev);
        }}
      />

    </div>
  );
}
