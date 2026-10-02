import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  Sun, 
  Moon, 
  CheckCircle2, 
  UserCheck, 
  Briefcase, 
  HelpCircle 
} from 'lucide-react';
import { storage } from '../../services/storageService';
import { User, UserRole } from '../../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const users = storage.getUsers();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(storage.getTheme());

  const handleToggleTheme = () => {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    storage.setTheme(nextTheme);
    setCurrentTheme(nextTheme);
    document.documentElement.classList.toggle('light', nextTheme === 'light');
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail de acesso corporativo.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = storage.login(email, password);
      setIsLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    }, 300);
  };

  const handleSelectQuickUser = (user: User) => {
    setEmail(user.email);
    setPassword(user.password || 'contaju123');
    setErrorMessage(null);
  };

  const handleDirectQuickLogin = (user: User) => {
    setIsLoading(true);
    setErrorMessage(null);
    setTimeout(() => {
      const result = storage.login(user.email, user.password || 'contaju123');
      setIsLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Erro ao realizar login.');
      }
    }, 200);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Administrador Geral',
          badgeClass: 'bg-amber-500/15 text-amber-500 border border-amber-500/30 font-semibold'
        };
      case 'GESTOR_FINANCEIRO':
        return {
          label: 'Gestora Financeira',
          badgeClass: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-semibold'
        };
      case 'OPERADOR':
        return {
          label: 'Operador Financeiro',
          badgeClass: 'bg-blue-500/15 text-blue-500 border border-blue-500/30 font-semibold'
        };
      case 'CONSULTA':
        return {
          label: 'Apenas Consulta',
          badgeClass: 'bg-slate-500/15 text-slate-400 border border-slate-500/30 font-semibold'
        };
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--surface-canvas)] flex flex-col justify-between text-[var(--text-primary)] transition-colors duration-200">
      
      {/* Barra Superior Simples com Alternador de Tema */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
            <Building2 className="w-5 h-5 font-bold" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-[var(--text-primary)]">
              CONTAJU
            </span>
            <span className="text-[10px] block font-semibold text-amber-500 uppercase tracking-widest">
              Gestão Financeira
            </span>
          </div>
        </div>

        <button
          onClick={handleToggleTheme}
          type="button"
          title={`Alternar para modo ${currentTheme === 'dark' ? 'claro' : 'escuro'}`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-xs font-medium cursor-pointer shadow-2xs"
        >
          {currentTheme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span>Modo Escuro</span>
            </>
          )}
        </button>
      </header>

      {/* Conteúdo Central */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col lg:flex-row gap-8 items-stretch justify-center my-auto">
        
        {/* Formulário de Login */}
        <div className="w-full lg:w-1/2 max-w-md mx-auto bg-[var(--surface-card)] p-6 sm:p-8 rounded-3xl border border-[var(--border-subtle)] shadow-xl flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Acesso Seguro
              </span>
              <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                Entrar na Conta
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Informe suas credenciais para gerenciar a tesouraria e conciliações do escritório.
              </p>
            </div>

            {/* Banner de Erro */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-rose-500 dark:text-rose-400 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* E-mail */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1.5">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-secondary)]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@contaju.com.br"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs transition-all font-medium"
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Senha de Acesso
                  </label>
                  <span className="text-[11px] text-amber-500 font-semibold cursor-help" title="A senha padrão inicial é contaju123">
                    Padrão: contaju123
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-secondary)]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botão de Entrar */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Validando Acesso...
                  </span>
                ) : (
                  <>
                    <span>Acessar o Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] text-center">
            <p className="text-[11px] text-[var(--text-secondary)] flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Sessão criptografada e protegida com auditoria local
            </p>
          </div>
        </div>

        {/* Painel Lateral: Acesso Rápido aos Perfis (Ideal para Demonstração e Operação) */}
        <div className="w-full lg:w-1/2 max-w-md mx-auto flex flex-col justify-between bg-[var(--surface-elevated)] p-6 sm:p-8 rounded-3xl border border-[var(--border-subtle)] shadow-md">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-500" />
                  <span>Acesso Rápido aos Perfis</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Clique para entrar diretamente com as permissões de cada função:
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {users.map((u) => {
                const roleBadge = getRoleBadge(u.role);
                const isSelected = email.toLowerCase() === u.email.toLowerCase();

                return (
                  <div
                    key={u.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                        : 'border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-amber-500/40 hover:bg-[var(--surface-card)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectQuickUser(u)}
                      className="flex items-center gap-3 text-left flex-1 cursor-pointer"
                    >
                      {u.avatar ? (
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-10 h-10 rounded-xl object-cover border border-[var(--border-subtle)]"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-xs border border-[var(--border-subtle)]">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {u.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-secondary)] block">
                          {u.email}
                        </span>
                        <div className="mt-1">
                          <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full ${roleBadge.badgeClass}`}>
                            {roleBadge.label}
                          </span>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDirectQuickLogin(u)}
                      title={`Entrar direto como ${u.name}`}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-all shrink-0 cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <span>Entrar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
              <Briefcase className="w-3.5 h-3.5 text-amber-500" />
              <span>Controle de Perfis RBAC</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              O perfil <strong>Administrador</strong> tem acesso irrestrito às parametrizações e auditoria. <strong>Gestor</strong> coordena conciliações e pagamentos, e <strong>Consulta</strong> permite auditoria somente leitura.
            </p>
          </div>
        </div>

      </main>

      {/* Rodapé */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
        <p>
          Contaju Contabilidade & Gestão © {new Date().getFullYear()} — Sistema Financeiro Corporativo.
        </p>
      </footer>

    </div>
  );
};
