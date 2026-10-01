import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, 
  AlertTriangle, 
  AlertCircle, 
  X, 
  Zap, 
  Sliders, 
  Calculator, 
  BookmarkPlus, 
  ArrowRight, 
  ShieldCheck, 
  Scale, 
  FileText, 
  Sparkles, 
  Plus, 
  Wallet,
  Building2,
  Calendar,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { BankStatementEntry, FinancialTitle, Counterparty } from '../../types';
import { FinancialEngine, formatBRL, formatDateBR } from '../../services/financialEngine';
import { storage } from '../../services/storageService';
import { learnAndCreateRuleFromTransaction } from '../../services/reconciliationRulesService';

interface ReconciliationFloatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStatements: BankStatementEntry[];
  selectedTitles: FinancialTitle[];
  counterpartyMap: Map<string, Counterparty>;
  selectedAccountId: string;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const ReconciliationFloatingModal: React.FC<ReconciliationFloatingModalProps> = ({
  isOpen,
  onClose,
  selectedStatements,
  selectedTitles,
  counterpartyMap,
  selectedAccountId,
  onSuccess,
  onError
}) => {
  // Par único ou multi-seleção
  const isMultiSelection = selectedStatements.length > 1 || selectedTitles.length > 1;
  const singleStmt = selectedStatements[0] || null;
  const singleTitle = selectedTitles[0] || null;

  // Valores de ajuste para conciliação unitária
  const [adjPrincipal, setAdjPrincipal] = useState<number>(0);
  const [adjInterest, setAdjInterest] = useState<number>(0);
  const [adjFine, setAdjFine] = useState<number>(0);
  const [adjDiscount, setAdjDiscount] = useState<number>(0);
  const [isManualEditOpen, setIsManualEditOpen] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inicializa valores sempre que o modal abre ou os itens mudam
  useEffect(() => {
    if (isOpen && singleStmt && singleTitle) {
      const titleBal = singleTitle.balancePrincipal > 0 ? singleTitle.balancePrincipal : singleTitle.originalAmount;
      const stmtAbs = Math.round(Math.abs(Number(singleStmt.amount) || 0) * 100) / 100;
      
      setAdjPrincipal(titleBal);
      setAdjInterest(0);
      setAdjFine(0);
      setAdjDiscount(0);
      
      // Abre a edição manual se houver divergência inicial
      const isExact = Math.abs(stmtAbs - titleBal) < 0.005;
      setIsManualEditOpen(!isExact);
    }
  }, [isOpen, singleStmt, singleTitle]);

  // Tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Cálculos para Par Unitário
  const stmtAbsAmount = singleStmt ? Math.round(Math.abs(Number(singleStmt.amount) || 0) * 100) / 100 : 0;
  const currentTitleBalance = singleTitle ? (singleTitle.balancePrincipal > 0 ? singleTitle.balancePrincipal : singleTitle.originalAmount) : 0;
  const totalSettledCalculated = Math.round((adjPrincipal + adjInterest + adjFine - adjDiscount) * 100) / 100;
  const differenceToStatement = Math.round((totalSettledCalculated - stmtAbsAmount) * 100) / 100;
  const isSingleExact = Math.abs(differenceToStatement) < 0.005;

  // Cálculos para Multi-seleção
  const totalStmtsAmount = Math.round(selectedStatements.reduce((sum, s) => sum + Math.abs(Number(s.amount) || 0), 0) * 100) / 100;
  const totalTitlesAmount = Math.round(selectedTitles.reduce((sum, t) => {
    const val = t.balancePrincipal > 0 ? t.balancePrincipal : t.originalAmount;
    return sum + (Number(val) || 0);
  }, 0) * 100) / 100;
  const multiDifference = Math.round((totalStmtsAmount - totalTitlesAmount) * 100) / 100;
  const isMultiExact = Math.abs(multiDifference) < 0.005;

  // Regra Estrita do Usuário: NÃO PODE ACEITAR SE OS VALORES NÃO FOREM CORRIGIDOS E BATEREM 100%
  const canConfirm = isMultiSelection 
    ? (selectedStatements.length > 0 && selectedTitles.length > 0 && isMultiExact) 
    : (Boolean(singleStmt && singleTitle) && isSingleExact);

  // Ações de Ajuste Rápido
  const handleApplyStatementAsPrincipal = () => {
    setAdjPrincipal(stmtAbsAmount);
    setAdjInterest(0);
    setAdjFine(0);
    setAdjDiscount(0);
  };

  const handleApplyDiffAsInterest = () => {
    setAdjPrincipal(currentTitleBalance);
    setAdjInterest(Math.max(0, Math.round((stmtAbsAmount - currentTitleBalance) * 100) / 100));
    setAdjFine(0);
    setAdjDiscount(0);
  };

  const handleApplyDiffAsFine = () => {
    setAdjPrincipal(currentTitleBalance);
    setAdjInterest(0);
    setAdjFine(Math.max(0, Math.round((stmtAbsAmount - currentTitleBalance) * 100) / 100));
    setAdjDiscount(0);
  };

  const handleApplyDiffAsDiscount = () => {
    setAdjPrincipal(currentTitleBalance);
    setAdjInterest(0);
    setAdjFine(0);
    setAdjDiscount(Math.max(0, Math.round((currentTitleBalance - stmtAbsAmount) * 100) / 100));
  };

  // Salvar Regra De-Para
  const handleSaveRule = () => {
    if (!singleStmt || !singleTitle) return;
    try {
      const createdRule = learnAndCreateRuleFromTransaction({
        stmt: singleStmt,
        chartAccountId: singleTitle.accountId,
        counterpartyId: singleTitle.counterpartyId,
        ruleName: `Regra: ${singleStmt.description.slice(0, 24)}`,
        autoReconcile: true
      });
      onSuccess(`Regra De-Para criada com sucesso para o padrão "${createdRule.pattern}"!`);
    } catch (err: any) {
      onError(`Erro ao salvar regra: ${err.message || 'Falha ao salvar'}`);
    }
  };

  // Execução da Conciliação
  const handleConfirmReconciliation = () => {
    if (!canConfirm) {
      onError('A conciliação está bloqueada: os valores precisam bater 100% (diferença R$ 0,00). Realize o ajuste antes de confirmar.');
      return;
    }

    setIsSubmitting(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      if (isMultiSelection) {
        // Execução Multi-Seleção
        let settledCount = 0;
        let alreadySettledCount = 0;
        const successfullySettledTitleIds: string[] = [];

        selectedTitles.forEach(t => {
          if (t.settlementState === 'LIQUIDADO') {
            alreadySettledCount++;
            successfullySettledTitleIds.push(t.id);
          } else {
            const p = t.balancePrincipal > 0 ? t.balancePrincipal : t.originalAmount;
            const rawDate = selectedStatements[0]?.date || today;
            const effectiveDate = rawDate > today ? today : rawDate;

            const res = FinancialEngine.postSettlement({
              titleId: t.id,
              settlementDate: effectiveDate,
              bankAccountId: selectedStatements[0]?.bankAccountId || selectedAccountId,
              principalSettled: p,
              discount: 0,
              interest: 0,
              fine: 0,
              bankFee: 0,
              notes: `Baixa via Janela Flutuante de Conciliação em Lote (${selectedStatements.map(s => s.description).slice(0, 2).join(', ')})`,
              voucherRef: selectedStatements.map(s => s.fitId).filter(Boolean).slice(0, 3).join(';')
            });

            if (res.success) {
              settledCount++;
              successfullySettledTitleIds.push(t.id);
            }
          }
        });

        // Atualiza títulos
        const currentTitles = storage.getTitles();
        const updatedTitles = currentTitles.map(t => {
          if (selectedTitles.some(st => st.id === t.id) && successfullySettledTitleIds.includes(t.id)) {
            return {
              ...t,
              reconciliationStatus: 'CONCILIADO' as const,
              updatedAt: new Date().toISOString()
            };
          }
          return t;
        });
        storage.saveTitles(updatedTitles);

        // Atualiza extratos
        const allStmts = storage.getStatementEntries();
        const updatedStmts = allStmts.map(s => {
          if (selectedStatements.some(ss => ss.id === s.id)) {
            return {
              ...s,
              reconciliationStatus: 'CONCILIADO' as const,
              matchedTitleId: selectedTitles[0]?.id
            };
          }
          return s;
        });
        storage.saveStatementEntries(updatedStmts);

        // Auditoria
        const currentUser = storage.getCurrentUser();
        storage.addAuditLog({
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'CONCILIACAO_LOTE_CONFIRMADA',
          module: 'Conciliação Bancária',
          recordId: selectedStatements.map(s => s.id).join(','),
          details: `Conciliação em Lote confirmada via janela flutuante com valores 100% batendo: ${selectedStatements.length} extratos [${formatBRL(totalStmtsAmount)}] cruzados com ${selectedTitles.length} títulos [${formatBRL(totalTitlesAmount)}].`
        });

        onSuccess(`Conciliação em lote realizada com sucesso com 100% de paridade! (${settledCount} títulos baixados, ${alreadySettledCount} já liquidados vinculados)`);
        onClose();
      } else {
        // Conciliação Unitária
        if (!singleStmt || !singleTitle) return;

        // Se o título já estava liquidado
        if (singleTitle.settlementState === 'LIQUIDADO' || singleTitle.balancePrincipal <= 0.005) {
          const allStmts = storage.getStatementEntries();
          const updatedStmts = allStmts.map(s => s.id === singleStmt.id ? {
            ...s,
            reconciliationStatus: 'CONCILIADO' as const,
            matchedTitleId: singleTitle.id
          } : s);
          storage.saveStatementEntries(updatedStmts);

          const allTitles = storage.getTitles();
          const updatedTitles = allTitles.map(t => t.id === singleTitle.id ? {
            ...t,
            reconciliationStatus: 'CONCILIADO' as const,
            updatedAt: new Date().toISOString()
          } : t);
          storage.saveTitles(updatedTitles);

          const currentUser = storage.getCurrentUser();
          storage.addAuditLog({
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'CONCILIACAO_VINCULO_EXATO',
            module: 'Conciliação Bancária',
            recordId: singleStmt.id,
            details: `Extrato "${singleStmt.description}" (${formatBRL(singleStmt.amount)}) vinculado e conciliado 100% com o título ${singleTitle.titleNumber}.`
          });

          onSuccess(`Lançamento "${singleStmt.description}" conciliado com 100% de paridade com o título ${singleTitle.titleNumber}!`);
          onClose();
          return;
        }

        // Título em aberto - dar baixa com os valores equalizados que batem 100%
        if (adjPrincipal > currentTitleBalance) {
          const allTitles = storage.getTitles();
          const updatedTitles = allTitles.map(t => {
            if (t.id === singleTitle.id) {
              const diffP = adjPrincipal - t.balancePrincipal;
              const newOriginal = Math.round(Math.max(0.01, t.originalAmount + diffP) * 100) / 100;
              return {
                ...t,
                originalAmount: newOriginal,
                balancePrincipal: adjPrincipal,
                updatedAt: new Date().toISOString()
              };
            }
            return t;
          });
          storage.saveTitles(updatedTitles);
        }

        const safeEffectiveDate = singleStmt.date > today ? today : singleStmt.date;
        const safeBankAccountId = singleStmt.bankAccountId || selectedAccountId;

        const settlementResult = FinancialEngine.postSettlement({
          titleId: singleTitle.id,
          settlementDate: safeEffectiveDate,
          bankAccountId: safeBankAccountId,
          principalSettled: adjPrincipal,
          discount: adjDiscount,
          interest: adjInterest,
          fine: adjFine,
          bankFee: 0,
          notes: `Baixa via Janela Flutuante de Conciliação (${singleStmt.description})${
            adjInterest > 0 || adjFine > 0 || adjDiscount > 0 || Math.abs(adjPrincipal - currentTitleBalance) > 0.005
              ? ` [Ajuste 100%: Principal ${formatBRL(adjPrincipal)}${adjInterest > 0 ? `, Juros ${formatBRL(adjInterest)}` : ''}${adjFine > 0 ? `, Multa ${formatBRL(adjFine)}` : ''}${adjDiscount > 0 ? `, Desc ${formatBRL(adjDiscount)}` : ''}]`
              : ''
          }`,
          voucherRef: singleStmt.fitId
        });

        if (!settlementResult.success) {
          onError(`Falha ao liquidar título: ${settlementResult.message}`);
          setIsSubmitting(false);
          return;
        }

        // Marca título como CONCILIADO
        const currentTitles = storage.getTitles();
        const updatedTitles = currentTitles.map(t => t.id === singleTitle.id ? {
          ...t,
          reconciliationStatus: 'CONCILIADO' as const,
          updatedAt: new Date().toISOString()
        } : t);
        storage.saveTitles(updatedTitles);

        // Marca extrato como CONCILIADO
        const allStmts = storage.getStatementEntries();
        const updatedStmts = allStmts.map(s => s.id === singleStmt.id ? { 
          ...s, 
          reconciliationStatus: 'CONCILIADO' as const,
          matchedTitleId: singleTitle.id 
        } : s);
        storage.saveStatementEntries(updatedStmts);

        // Auditoria
        const currentUser = storage.getCurrentUser();
        storage.addAuditLog({
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'CONCILIACAO_100_EXATA',
          module: 'Conciliação Bancária',
          recordId: singleStmt.id,
          details: `Conciliado 100%: Extrato "${singleStmt.description}" (${formatBRL(singleStmt.amount)}) com título ${singleTitle.titleNumber}. Liquidado: Principal ${formatBRL(adjPrincipal)}${adjInterest > 0 ? `, Juros ${formatBRL(adjInterest)}` : ''}${adjDiscount > 0 ? `, Desc ${formatBRL(adjDiscount)}` : ''}. Diferença: R$ 0,00.`
        });

        onSuccess(`Conciliação concluída com sucesso! Extrato e Título 100% conferidos e quitados no ERP.`);
        onClose();
      }
    } catch (err: any) {
      onError(`Erro durante conciliação: ${err.message || 'Falha desconhecida'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const person = singleTitle ? counterpartyMap.get(singleTitle.counterpartyId) : null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#131720] rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-[#273040] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header da Janela Flutuante */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-[#273040] bg-slate-900 text-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {isMultiSelection ? 'Conciliação em Lote (Multi-Seleção)' : 'Conferência e Conciliação Bancária'}
                </h2>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  canConfirm 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                }`}>
                  {canConfirm ? '✓ 100% Batendo' : '⚠ Exige Correção de Valores'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                A conciliação exige 100% de paridade financeira para garantir conformidade e integridade contábil.
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Fechar janela (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          
          {/* ========================================================================= */}
          {/* ALERTA MANDATÓRIO QUANDO OS VALORES NÃO FOREM CORRIGIDOS E NÃO BATEREM 100% */}
          {/* ========================================================================= */}
          {!canConfirm ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/50 text-rose-900 dark:text-rose-200 animate-in fade-in space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/60 flex items-center justify-center text-rose-500 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-extrabold text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <span>ATENÇÃO: A CONCILIAÇÃO NÃO PODE SER ACEITA COM VALORES DIVERGENTES</span>
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    O valor registrado no <strong>Extrato Bancário</strong> não confere exatamente com o <strong>Título do ERP</strong>. A conciliação <strong>está bloqueada</strong> até que a diferença de{' '}
                    <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm underline">
                      {formatBRL(Math.abs(isMultiSelection ? multiDifference : differenceToStatement))}
                    </strong>{' '}
                    seja corrigida ou equalizada (Juros, Multa, Desconto ou Ajuste do Principal) para <strong>bater 100% (Diferença: R$ 0,00)</strong>.
                  </p>
                </div>
              </div>

              {/* Botões Rápidos de Correção em 1 Clique */}
              {!isMultiSelection && (
                <div className="pt-2 border-t border-rose-500/20 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    Corrigir automaticamente para 100%:
                  </span>

                  <button
                    type="button"
                    onClick={handleApplyStatementAsPrincipal}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    title="Ajusta o valor principal para o valor do extrato"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Ajustar Principal para {formatBRL(stmtAbsAmount)}</span>
                  </button>

                  {stmtAbsAmount > currentTitleBalance ? (
                    <>
                      <button
                        type="button"
                        onClick={handleApplyDiffAsInterest}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#1B212D] hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Lança a diferença a maior como juros de mora"
                      >
                        <Plus className="w-3.5 h-3.5 text-sky-500" />
                        <span>Lançar como Juros (+{formatBRL(stmtAbsAmount - currentTitleBalance)})</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleApplyDiffAsFine}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#1B212D] hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Lança a diferença a maior como multa"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Lançar como Multa (+{formatBRL(stmtAbsAmount - currentTitleBalance)})</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyDiffAsDiscount}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#1B212D] hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Lança a diferença a menor como desconto comercial ou tarifa"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                      <span>Lançar como Desconto/Tarifa (-{formatBRL(currentTitleBalance - stmtAbsAmount)})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-900 dark:text-emerald-300 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-500 shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="font-bold text-xs">
                    Valores 100% Batendo e Conferidos (Diferença: R$ 0,00)
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    O valor do extrato e a composição contábil conferem integralmente. A conciliação está liberada para efetivação.
                  </p>
                </div>
              </div>

              {!isMultiSelection && (
                <button
                  type="button"
                  onClick={handleSaveRule}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-[#1B212D] hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  title="Salvar como regra automática para extratos futuros com a mesma descrição"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Lembrar Regra De-Para</span>
                </button>
              )}
            </div>
          )}

          {/* Confronto Visual Lado a Lado (2 Colunas no Modal) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* LADO ESQUERDO: EXTRATO BANCÁRIO */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B212D]/60 border border-slate-200 dark:border-[#273040] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#273040]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Lançamento no Extrato Bancário
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                  {selectedStatements.length} selecionado(s)
                </span>
              </div>

              {isMultiSelection ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedStatements.map(s => (
                    <div key={s.id} className="p-2.5 bg-white dark:bg-[#131720] rounded-lg border border-slate-200 dark:border-[#273040] flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{s.description}</span>
                        <span className="text-[10px] text-slate-500">{formatDateBR(s.date)} • FITID: {s.fitId}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatBRL(Math.abs(s.amount))}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-200 dark:border-[#273040] flex justify-between font-bold text-xs">
                    <span>Total do Extrato:</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">{formatBRL(totalStmtsAmount)}</span>
                  </div>
                </div>
              ) : singleStmt ? (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Descrição Oficial:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{singleStmt.description}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Valor do Extrato:</span>
                      <span className="text-base font-extrabold font-mono text-amber-600 dark:text-amber-400">
                        {singleStmt.amount < 0 ? '-' : '+'} {formatBRL(Math.abs(singleStmt.amount))}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-[#273040] text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Data da Transação:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{formatDateBR(singleStmt.date)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Documento / FITID:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{singleStmt.fitId}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 bg-white dark:bg-[#131720] rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-60" />
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Nenhum extrato bancário selecionado</p>
                  <p className="text-[11px] text-slate-500 mt-1">Marque ou clique em "Conciliar" em uma linha do extrato para confrontar.</p>
                </div>
              )}
            </div>

            {/* LADO DIREITO: TÍTULO(S) DO ERP */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B212D]/60 border border-slate-200 dark:border-[#273040] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#273040]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Lançamento Contábil no ERP
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                  {selectedTitles.length} selecionado(s)
                </span>
              </div>

              {isMultiSelection ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTitles.map(t => {
                    const p = counterpartyMap.get(t.counterpartyId);
                    const val = t.balancePrincipal > 0 ? t.balancePrincipal : t.originalAmount;
                    return (
                      <div key={t.id} className="p-2.5 bg-white dark:bg-[#131720] rounded-lg border border-slate-200 dark:border-[#273040] flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{t.titleNumber} • {p?.name || t.description}</span>
                          <span className="text-[10px] text-slate-500">Vencimento: {formatDateBR(t.dueDate)} • {t.type}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatBRL(val)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-slate-200 dark:border-[#273040] flex justify-between font-bold text-xs">
                    <span>Total dos Títulos:</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">{formatBRL(totalTitlesAmount)}</span>
                  </div>
                </div>
              ) : singleTitle ? (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Título / Favorecido:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {singleTitle.titleNumber} • {person?.name || singleTitle.description}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Saldo em Aberto:</span>
                      <span className="text-base font-extrabold font-mono text-blue-600 dark:text-blue-400">
                        {formatBRL(currentTitleBalance)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-[#273040] text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Vencimento Contratual:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{formatDateBR(singleTitle.dueDate)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Tipo & Status:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {singleTitle.type === 'PAGAR' ? 'Contas a Pagar' : 'Contas a Receber'} ({singleTitle.settlementState})
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 bg-white dark:bg-[#131720] rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <AlertCircle className="w-8 h-8 text-blue-500 mx-auto mb-2 opacity-60" />
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Nenhum título contábil selecionado</p>
                  <p className="text-[11px] text-slate-500 mt-1">Marque ou clique em "Conciliar" em um título na coluna do ERP para confrontar.</p>
                </div>
              )}
            </div>
          </div>

          {/* Painel de Equalização e Composição dos Valores (Apenas se unitário e não liquidado) */}
          {!isMultiSelection && singleTitle && singleTitle.settlementState !== 'LIQUIDADO' && (
            <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Composição Contábil da Baixa para Bater 100%
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Ajuste os campos abaixo até a diferença ser exatamente <strong>R$ 0,00</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Principal */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                    Valor Principal (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjPrincipal || ''}
                    onChange={e => setAdjPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-hidden"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">Saldo ERP: {formatBRL(currentTitleBalance)}</span>
                </div>

                {/* Juros */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <label className="text-[10px] text-sky-400 font-bold uppercase block mb-1">
                    + Juros (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjInterest || ''}
                    onChange={e => setAdjInterest(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-sky-300 font-mono focus:border-sky-400 focus:outline-hidden"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">Acréscimo por atraso</span>
                </div>

                {/* Multa */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <label className="text-[10px] text-indigo-400 font-bold uppercase block mb-1">
                    + Multa (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjFine || ''}
                    onChange={e => setAdjFine(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-indigo-300 font-mono focus:border-indigo-400 focus:outline-hidden"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">Penalidade contratual</span>
                </div>

                {/* Desconto */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <label className="text-[10px] text-emerald-400 font-bold uppercase block mb-1">
                    - Desconto / Tarifa (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjDiscount || ''}
                    onChange={e => setAdjDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:border-emerald-400 focus:outline-hidden"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">Abatimento / tarifa retenção</span>
                </div>
              </div>

              {/* Resumo da Fórmula em Tempo Real */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="text-slate-300">
                  <span>Cálculo: </span>
                  <span className="text-white font-semibold">{formatBRL(adjPrincipal)}</span>
                  {adjInterest > 0 && <span className="text-sky-400"> + {formatBRL(adjInterest)} (Juros)</span>}
                  {adjFine > 0 && <span className="text-indigo-400"> + {formatBRL(adjFine)} (Multa)</span>}
                  {adjDiscount > 0 && <span className="text-emerald-400"> - {formatBRL(adjDiscount)} (Desc)</span>}
                  <span className="text-white font-bold"> = Total: {formatBRL(totalSettledCalculated)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs">Diferença para o Extrato:</span>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                    isSingleExact
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                  }`}>
                    {isSingleExact ? '✓ R$ 0,00 (100% Batendo)' : formatBRL(differenceToStatement)}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé de Ações Fixo com Botão Bloqueado se Divergente */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 sticky bottom-0 z-20">
          <div className="flex items-center gap-2 text-xs">
            {canConfirm ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Valores 100% equalizados e prontos para baixa contábil.
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-rose-500" />
                Conciliação bloqueada: diferença de {formatBRL(Math.abs(isMultiSelection ? multiDifference : differenceToStatement))}.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={!canConfirm || isSubmitting}
              onClick={handleConfirmReconciliation}
              className={`px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-2 ${
                canConfirm && !isSubmitting
                  ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:brightness-105 text-slate-950 cursor-pointer shadow-amber-500/20 active:scale-95'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 border border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-75'
              }`}
            >
              {canConfirm ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isMultiSelection ? `CONFIRMAR CONCILIAÇÃO EM LOTE (${selectedStatements.length} ➔ ${selectedTitles.length})` : 'CONFIRMAR CONCILIAÇÃO E BAIXAR (100% EXATO)'}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-500 stroke-[2.5]" />
                  <span>CONCILIAÇÃO BLOQUEADA (CORRIJA OS VALORES PARA BATER 100%)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
