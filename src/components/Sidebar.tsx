import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FileText, 
  Receipt, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeftRight, 
  Landmark, 
  CheckCheck, 
  BarChart3, 
  LineChart, 
  FileSpreadsheet, 
  Building, 
  Truck, 
  Network, 
  Clock, 
  ShieldCheck, 
  Sliders, 
  Lightbulb, 
  History, 
  LockKeyhole,
  Scale,
  Target,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  CreditCard
} from 'lucide-react';
import { storage } from '../services/storageService';
import { GoldenLionLogo } from './Common/GoldenLionLogo';

export type NavigationScreen = 
  | 'DASHBOARD'
  | 'CLIENTES'
  | 'SERVICOS'
  | 'CONTRATOS'
  | 'VENDAS_FATURAMENTO'
  | 'CONTAS_RECEBER'
  | 'CONTAS_PAGAR'
  | 'CARTAO_CREDITO'
  | 'MOVIMENTACOES'
  | 'BANCOS_CONTAS'
  | 'CONCILIACAO'
  | 'DRE'
  | 'FLUXO_CAIXA'
  | 'PLANEJAMENTO_ORCAMENTARIO'
  | 'COMPARE_DRE_CAIXA'
  | 'RELATORIOS'
  | 'EMPRESA'
  | 'FORNECEDORES'
  | 'PLANO_CONTAS'
  | 'RECORRENCIAS'
  | 'USUARIOS_PERMISSOES'
  | 'FECHAMENTO_PERIODO'
  | 'MODULOS_INTEGRACOES'
  | 'MELHORIAS'
  | 'AUDITORIA';

interface SidebarProps {
  currentScreen: NavigationScreen;
  onNavigate: (screen: NavigationScreen) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavigationScreen;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  isOpenMobile,
  onCloseMobile
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    return localStorage.getItem('contaju_sidebar_minimized') === 'true';
  });
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-minimize after 15 seconds of inactivity if not pinned and not already minimized
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isMinimized && !isPinned) {
      idleTimerRef.current = setTimeout(() => {
        setIsMinimized(true);
        localStorage.setItem('contaju_sidebar_minimized', 'true');
      }, 15000); // 15 segundos
    }
  }, [isMinimized, isPinned]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  const toggleMinimized = () => {
    setIsMinimized(prev => {
      const next = !prev;
      localStorage.setItem('contaju_sidebar_minimized', String(next));
      return next;
    });
  };

  // Compute badges for alerts
  const titles = storage.getTitles();
  const today = new Date().toISOString().split('T')[0];
  const overdueReceivables = titles.filter(t => t.type === 'RECEBER' && t.balancePrincipal > 0 && t.dueDate < today).length;
  const overduePayables = titles.filter(t => t.type === 'PAGAR' && t.balancePrincipal > 0 && t.dueDate < today).length;
  
  const stmts = storage.getStatementEntries();
  const pendingReconciliation = stmts.filter(s => s.reconciliationStatus === 'PENDENTE' || s.reconciliationStatus === 'SUGESTAO').length;

  const groups: NavGroup[] = [
    {
      title: 'Visão Geral',
      items: [
        { id: 'DASHBOARD', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Comercial',
      items: [
        { id: 'CLIENTES', label: 'Clientes', shortLabel: 'Clientes', icon: Users },
        { id: 'SERVICOS', label: 'Serviços', shortLabel: 'Serviços', icon: Briefcase },
        { id: 'CONTRATOS', label: 'Contratos Recorrentes', shortLabel: 'Contratos', icon: FileText },
        { id: 'VENDAS_FATURAMENTO', label: 'Vendas e Faturamento', shortLabel: 'Vendas', icon: Receipt }
      ]
    },
    {
      title: 'Financeiro',
      items: [
        { 
          id: 'CONTAS_RECEBER', 
          label: 'Contas a Receber', 
          shortLabel: 'A Receber',
          icon: TrendingUp,
          badge: overdueReceivables > 0 ? overdueReceivables : undefined,
          badgeColor: 'bg-amber-100 text-amber-800'
        },
        { 
          id: 'CONTAS_PAGAR', 
          label: 'Contas a Pagar', 
          shortLabel: 'A Pagar',
          icon: TrendingDown,
          badge: overduePayables > 0 ? overduePayables : undefined,
          badgeColor: 'bg-rose-100 text-rose-800'
        },
        {
          id: 'CARTAO_CREDITO',
          label: 'Cartões de Crédito',
          shortLabel: 'Cartões',
          icon: CreditCard
        },
        { id: 'MOVIMENTACOES', label: 'Movimentações', shortLabel: 'Moviment.', icon: ArrowLeftRight },
        { id: 'BANCOS_CONTAS', label: 'Bancos e Contas', shortLabel: 'Bancos', icon: Landmark },
        { 
          id: 'CONCILIACAO', 
          label: 'Conciliação Bancária', 
          shortLabel: 'Conciliação',
          icon: CheckCheck,
          badge: pendingReconciliation > 0 ? pendingReconciliation : undefined,
          badgeColor: 'bg-blue-100 text-blue-800'
        }
      ]
    },
    {
      title: 'Gestão',
      items: [
        { id: 'DRE', label: 'DRE Gerencial', shortLabel: 'DRE', icon: BarChart3 },
        { id: 'FLUXO_CAIXA', label: 'Fluxo de Caixa', shortLabel: 'Fluxo', icon: LineChart },
        { id: 'PLANEJAMENTO_ORCAMENTARIO', label: 'Planejamento Orçamentário', shortLabel: 'Orçamento', icon: Target },
        { id: 'COMPARE_DRE_CAIXA', label: 'Comparar DRE x Caixa', shortLabel: 'DRE x Caixa', icon: Scale },
        { id: 'RELATORIOS', label: 'Relatórios Gerenciais', shortLabel: 'Relatórios', icon: FileSpreadsheet }
      ]
    },
    {
      title: 'Configurações',
      items: [
        { id: 'EMPRESA', label: 'Dados da Empresa', shortLabel: 'Empresa', icon: Building },
        { id: 'FORNECEDORES', label: 'Fornecedores', shortLabel: 'Forneced.', icon: Truck },
        { id: 'PLANO_CONTAS', label: 'Plano de Contas', shortLabel: 'Plano C.', icon: Network },
        { id: 'RECORRENCIAS', label: 'Regras de Recorrência', shortLabel: 'Recorrência', icon: Clock },
        { id: 'USUARIOS_PERMISSOES', label: 'Usuários e Permissões', shortLabel: 'Usuários', icon: ShieldCheck },
        { id: 'FECHAMENTO_PERIODO', label: 'Fechamento de Período', shortLabel: 'Fechamento', icon: LockKeyhole },
        { id: 'MODULOS_INTEGRACOES', label: 'Módulos e Integrações', shortLabel: 'Módulos', icon: Sliders },
        { id: 'MELHORIAS', label: 'Solicitações de Melhorias', shortLabel: 'Melhorias', icon: Lightbulb },
        { id: 'AUDITORIA', label: 'Trilha de Auditoria', shortLabel: 'Auditoria', icon: History }
      ]
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside 
        onMouseEnter={resetIdleTimer}
        onMouseMove={resetIdleTimer}
        className={`
          fixed lg:static top-0 bottom-0 left-0 z-40
          ${isMinimized ? 'w-20' : 'w-64'} 
          bg-[var(--surface-card)] text-[var(--text-primary)] flex flex-col flex-shrink-0
          transition-all duration-300 ease-in-out border-r border-[var(--border-subtle)] select-none
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        
        {/* Office Branding & Minimize Header */}
        <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between min-h-[58px]">
          {!isMinimized ? (
            <>
              <div className="flex items-center space-x-2.5 truncate">
                <GoldenLionLogo size="sm" />
                <div className="truncate">
                  <div className="font-bold text-[var(--text-primary)] text-sm tracking-tight truncate flex items-center gap-1.5">
                    <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">CONTAJU</span>
                    <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 font-mono">ERP</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] font-mono flex items-center">
                    BRL • SP
                    {!isPinned && (
                      <span className="ml-1.5 text-[9px] text-amber-500/90 bg-amber-500/10 px-1 py-0.2 rounded" title="Minimiza após 15s sem uso">
                        auto 15s
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsPinned(p => !p)}
                  className={`p-1.5 rounded-md text-xs transition-colors hidden lg:flex items-center justify-center ${
                    isPinned 
                      ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
                  }`}
                  title={isPinned ? "Menu fixado aberto (não recolhe após 15s)" : "Fixar menu aberto (pausar auto-recolhimento)"}
                >
                  {isPinned ? <Pin className="w-3.5 h-3.5 text-amber-400" /> : <PinOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={toggleMinimized}
                  className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors hidden lg:flex items-center justify-center"
                  title="Recolher menu lateral"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={onCloseMobile} 
                  className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
                >
                  ✕
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex flex-col items-center justify-center">
              <button
                onClick={toggleMinimized}
                className="hover:scale-105 transition-transform relative group p-0.5"
                title="Expandir menu lateral"
              >
                <GoldenLionLogo size="sm" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 text-black font-bold rounded-full text-[10px] flex items-center justify-center shadow-xs">
                  <ChevronRight className="w-3 h-3 stroke-[3]" />
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Nav Groups */}
        <nav className="flex-1 overflow-y-auto px-1.5 py-3 space-y-4 text-xs scrollbar-thin">
          {groups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {!isMinimized ? (
                <h3 className="px-3 text-[10px] font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
                  {group.title}
                </h3>
              ) : (
                <div className="w-8 h-px bg-[var(--border-subtle)] mx-auto my-1.5 opacity-60" />
              )}

              <div className="space-y-1 pt-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentScreen === item.id;

                  if (isMinimized) {
                    // Minimized display: Centered Icon + Micro Label underneath
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          onCloseMobile();
                        }}
                        title={`${item.label}${item.badge ? ` (${item.badge})` : ''}`}
                        className={`
                          w-full flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all relative group
                          ${isActive 
                            ? 'bg-amber-500/15 text-amber-400 font-semibold border-l-2 border-amber-400 shadow-2xs' 
                            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] border-l-2 border-transparent'
                          }
                        `}
                      >
                        <div className="relative">
                          <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} />
                          {item.badge !== undefined && (
                            <span className="absolute -top-1.5 -right-2 text-[9px] font-bold px-1 py-0.2 rounded-full bg-rose-500 text-white shadow-xs">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] leading-tight text-center font-medium mt-1 truncate max-w-[68px] ${
                          isActive ? 'text-amber-300 font-bold' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                        }`}>
                          {item.shortLabel}
                        </span>
                      </button>
                    );
                  }

                  // Expanded display: Full Label and Row
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onCloseMobile();
                      }}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-md font-medium text-xs transition-all
                        ${isActive 
                          ? 'border-l-2 border-amber-400 bg-amber-500/15 text-amber-400 font-semibold shadow-2xs' 
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] border-l-2 border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor || 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Info / Toggle */}
        <div className={`p-2.5 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-center ${
          isMinimized ? 'justify-center flex-col gap-1 text-center' : 'justify-between'
        }`}>
          {!isMinimized ? (
            <>
              <span>v1.0.0 Gerencial</span>
              <button
                onClick={toggleMinimized}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium p-1 rounded hover:bg-[var(--surface-elevated)]"
                title="Minimizar barra lateral"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Recolher</span>
              </button>
            </>
          ) : (
            <button
              onClick={toggleMinimized}
              className="p-1.5 rounded-lg text-cyan-400 hover:bg-[var(--surface-elevated)] hover:text-cyan-300 transition-colors flex items-center justify-center"
              title="Expandir barra lateral"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </aside>
    </>
  );
};

