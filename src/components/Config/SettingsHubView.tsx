import React, { useState, useEffect } from 'react';
import {
  Building,
  Truck,
  Network,
  Clock,
  ShieldCheck,
  LockKeyhole,
  Sliders,
  Bell,
  Lightbulb,
  History,
  Database,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { storage } from '../../services/storageService';
import { NavigationScreen } from '../Sidebar';

import { CompanyConfigView } from './CompanyConfigView';
import { SuppliersView } from './SuppliersView';
import { ChartOfAccountsView } from './ChartOfAccountsView';
import { RecurrencesView } from './RecurrencesView';
import { UsersPermissionsView } from './UsersPermissionsView';
import { PeriodClosureView } from './PeriodClosureView';
import { IntegrationsView } from './IntegrationsView';
import { NotificationsConfigView } from './NotificationsConfigView';
import { ImprovementsView } from './ImprovementsView';
import { AuditView } from './AuditView';
import { BackupView } from './BackupView';

export type ConfigSubTab =
  | 'EMPRESA'
  | 'FORNECEDORES'
  | 'PLANO_CONTAS'
  | 'RECORRENCIAS'
  | 'USUARIOS_PERMISSOES'
  | 'FECHAMENTO_PERIODO'
  | 'MODULOS_INTEGRACOES'
  | 'NOTIFICACOES'
  | 'MELHORIAS'
  | 'AUDITORIA'
  | 'BACKUP';

interface SettingsHubViewProps {
  initialTab?: ConfigSubTab;
  onNavigateToScreen?: (screen: NavigationScreen) => void;
  onOpenBillingModal?: () => void;
}

interface TabDefinition {
  id: ConfigSubTab;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const SettingsHubView: React.FC<SettingsHubViewProps> = ({
  initialTab = 'EMPRESA',
  onNavigateToScreen,
  onOpenBillingModal
}) => {
  const [activeTab, setActiveTab] = useState<ConfigSubTab>(initialTab);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    return storage.subscribe(() => setRefreshTrigger(prev => prev + 1));
  }, []);

  // Calcular alertas para o badge de Notificações
  const titles = storage.getTitles();
  const today = new Date().toISOString().split('T')[0];
  const stmts = storage.getStatementEntries();
  const pendingReconciliation = stmts.filter(
    s => s.reconciliationStatus === 'PENDENTE' || s.reconciliationStatus === 'SUGESTAO'
  ).length;

  const contracts = storage.getContracts().filter(c => c.status === 'ATIVO');
  const expiringContractsCount = contracts.filter(c => {
    if (!c.endDate) return false;
    const diffDays = Math.ceil((new Date(c.endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;
  const payablesTodayCount = titles.filter(t => t.type === 'PAGAR' && t.balancePrincipal > 0 && t.dueDate === today).length;
  const totalNotificationAlerts = expiringContractsCount + payablesTodayCount + pendingReconciliation;

  const tabs: TabDefinition[] = [
    {
      id: 'EMPRESA',
      label: 'Dados da Empresa',
      shortLabel: 'Empresa',
      description: 'CNPJ, endereço, regime tributário e certificado digital',
      icon: Building
    },
    {
      id: 'FORNECEDORES',
      label: 'Fornecedores',
      shortLabel: 'Fornecedores',
      description: 'Gestão de fornecedores, prestadores e parceiros',
      icon: Truck
    },
    {
      id: 'PLANO_CONTAS',
      label: 'Plano de Contas',
      shortLabel: 'Plano de Contas',
      description: 'Estrutura analítica e sintética de receitas e despesas',
      icon: Network
    },
    {
      id: 'RECORRENCIAS',
      label: 'Regras de Recorrência',
      shortLabel: 'Recorrências',
      description: 'Faturamento recorrente automático e 13º honorário',
      icon: Clock
    },
    {
      id: 'USUARIOS_PERMISSOES',
      label: 'Usuários e Permissões',
      shortLabel: 'Usuários',
      description: 'Perfis de acesso, segurança RBAC e usuários ativos',
      icon: ShieldCheck
    },
    {
      id: 'FECHAMENTO_PERIODO',
      label: 'Fechamento de Período',
      shortLabel: 'Fechamento',
      description: 'Trava contábil mensal e checklist de 5 travas',
      icon: LockKeyhole
    },
    {
      id: 'MODULOS_INTEGRACOES',
      label: 'Módulos e Integrações',
      shortLabel: 'Módulos',
      description: 'Ativação de funcionalidades e conexão bancária/APIs',
      icon: Sliders
    },
    {
      id: 'NOTIFICACOES',
      label: 'Notificações e Alertas',
      shortLabel: 'Notificações',
      description: 'Monitoramento de vencimentos, contratos e conciliações',
      icon: Bell,
      badge: totalNotificationAlerts > 0 ? totalNotificationAlerts : undefined
    },
    {
      id: 'MELHORIAS',
      label: 'Solicitações de Melhorias',
      shortLabel: 'Melhorias',
      description: 'Sugestões, ideias e backlog evolutivo da plataforma',
      icon: Lightbulb
    },
    {
      id: 'AUDITORIA',
      label: 'Trilha de Auditoria',
      shortLabel: 'Auditoria',
      description: 'Rastreabilidade completa de ações e registros no sistema',
      icon: History
    },
    {
      id: 'BACKUP',
      label: 'Backup e Segurança',
      shortLabel: 'Backup',
      description: 'Exportação, importação e integridade do banco de dados',
      icon: Database
    }
  ];

  const handleInternalNavigate = (target: string) => {
    const isSubTab = tabs.some(t => t.id === target);
    if (isSubTab) {
      setActiveTab(target as ConfigSubTab);
    } else if (onNavigateToScreen) {
      onNavigateToScreen(target as NavigationScreen);
    }
  };

  const currentTabObj = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className="space-y-5">
      {/* Header Unificado de Configurações */}
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-xs shrink-0 font-bold">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                  Configurações do Sistema
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-700">
                  {currentTabObj.label}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {currentTabObj.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-[var(--text-secondary)] bg-[var(--surface-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)]">
            <span>Seção Ativa:</span>
            <strong className="text-[var(--text-primary)] font-semibold">{currentTabObj.label}</strong>
          </div>
        </div>

        {/* Abas Internas / Barra de Navegação Horizontal */}
        <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] overflow-x-auto pb-1 scrollbar-thin">
          <div className="flex items-center gap-1.5 min-w-max">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)] border-[var(--border-subtle)]'
                  }`}
                  title={tab.description}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white dark:text-slate-900' : 'text-[var(--text-secondary)]'}`} />
                  <span>{tab.shortLabel}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isActive
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-amber-500 text-slate-950'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo Renderizado da Aba Interna Selecionada */}
      <div className="animate-in fade-in duration-150">
        {activeTab === 'EMPRESA' && <CompanyConfigView />}
        {activeTab === 'FORNECEDORES' && <SuppliersView />}
        {activeTab === 'PLANO_CONTAS' && <ChartOfAccountsView />}
        {activeTab === 'RECORRENCIAS' && (
          <RecurrencesView onOpenBillingModal={onOpenBillingModal || (() => {})} />
        )}
        {activeTab === 'USUARIOS_PERMISSOES' && <UsersPermissionsView />}
        {activeTab === 'FECHAMENTO_PERIODO' && (
          <PeriodClosureView onNavigate={handleInternalNavigate} />
        )}
        {activeTab === 'MODULOS_INTEGRACOES' && <IntegrationsView />}
        {activeTab === 'NOTIFICACOES' && (
          <NotificationsConfigView onNavigate={handleInternalNavigate} />
        )}
        {activeTab === 'MELHORIAS' && <ImprovementsView />}
        {activeTab === 'AUDITORIA' && <AuditView />}
        {activeTab === 'BACKUP' && <BackupView />}
      </div>
    </div>
  );
};
