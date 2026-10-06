import React from 'react';
import { 
  LayoutDashboard, 
  TrendingDown, 
  TrendingUp, 
  BarChart3, 
  Menu 
} from 'lucide-react';
import { NavigationScreen } from '../Sidebar';

export interface BottomNavBarProps {
  currentScreen: NavigationScreen;
  onNavigate: (screen: NavigationScreen) => void;
  onOpenDrawer: () => void;
  overduePayablesCount?: number;
  overdueReceivablesCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentScreen,
  onNavigate,
  onOpenDrawer,
  overduePayablesCount = 0,
  overdueReceivablesCount = 0,
}) => {
  const isDreActive = currentScreen === 'DRE' || currentScreen === 'FLUXO_CAIXA' || currentScreen === 'RELATORIOS';
  const isOtherActive = ![
    'DASHBOARD', 'CONTAS_PAGAR', 'CONTAS_RECEBER', 'DRE', 'FLUXO_CAIXA', 'RELATORIOS'
  ].includes(currentScreen);

  const navItems = [
    {
      id: 'DASHBOARD' as NavigationScreen,
      label: 'Início',
      icon: LayoutDashboard,
      isActive: currentScreen === 'DASHBOARD',
      onClick: () => onNavigate('DASHBOARD'),
    },
    {
      id: 'CONTAS_PAGAR' as NavigationScreen,
      label: 'Pagar',
      icon: TrendingDown,
      isActive: currentScreen === 'CONTAS_PAGAR',
      badge: overduePayablesCount > 0 ? overduePayablesCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
      onClick: () => onNavigate('CONTAS_PAGAR'),
    },
    {
      id: 'CONTAS_RECEBER' as NavigationScreen,
      label: 'Receber',
      icon: TrendingUp,
      isActive: currentScreen === 'CONTAS_RECEBER',
      badge: overdueReceivablesCount > 0 ? overdueReceivablesCount : undefined,
      badgeColor: 'bg-emerald-500 text-white',
      onClick: () => onNavigate('CONTAS_RECEBER'),
    },
    {
      id: 'DRE' as NavigationScreen,
      label: 'DRE',
      icon: BarChart3,
      isActive: isDreActive,
      onClick: () => onNavigate('DRE'),
    },
  ];

  return (
    <nav 
      aria-label="Navegação inferior mobile"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] select-none shadow-[0_-4px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] transition-colors"
    >
      <div className="flex items-center justify-around h-16 px-1 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] min-w-[40px] rounded-xl transition-all cursor-pointer relative active:scale-95 ${
                item.isActive 
                  ? 'text-amber-500 dark:text-amber-400 font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${item.isActive ? 'scale-110 text-amber-500 dark:text-amber-400 stroke-[2.3]' : 'stroke-[1.8]'}`} />
                {item.badge !== undefined && (
                  <span className={`absolute -top-1.5 -right-2 text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-xs ring-1 ring-white dark:ring-[#121620] ${item.badgeColor}`}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 leading-tight ${item.isActive ? 'font-bold text-amber-500 dark:text-amber-400' : 'font-medium'}`}>
                {item.label}
              </span>
              {item.isActive && (
                <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 mt-0.5 animate-pulse" />
              )}
            </button>
          );
        })}

        {/* Botão de Menu Completo / Gaveta */}
        <button
          onClick={onOpenDrawer}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] min-w-[40px] rounded-xl transition-all cursor-pointer relative active:scale-95 ${
            isOtherActive 
              ? 'text-amber-500 dark:text-amber-400 font-bold' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Abrir menu lateral completo"
        >
          <div className="relative">
            <Menu className={`w-5 h-5 transition-transform ${isOtherActive ? 'scale-110 text-amber-500 dark:text-amber-400 stroke-[2.3]' : 'stroke-[1.8]'}`} />
          </div>
          <span className={`text-[10px] tracking-tight mt-0.5 leading-tight ${isOtherActive ? 'font-bold text-amber-500 dark:text-amber-400' : 'font-medium'}`}>
            Menu
          </span>
          {isOtherActive && (
            <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 mt-0.5 animate-pulse" />
          )}
        </button>
      </div>
    </nav>
  );
};
