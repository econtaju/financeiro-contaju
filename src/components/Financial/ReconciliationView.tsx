import React, { useState, useRef } from 'react';
import { 
  CheckCheck, 
  Upload, 
  Search, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Link2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Sliders,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { BankStatementEntry, FinancialTitle } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatDateBR } from '../../services/financialEngine';
import { parseOFX } from '../../utils/ofxParser';

export const ReconciliationView: React.FC = () => {
  const accounts = storage.getBankAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || 'acc-1');
  const [statementFilter, setStatementFilter] = useState<'ALL' | 'PENDENTE' | 'SUGESTAO' | 'CONCILIADO'>('PENDENTE');
  const [searchStmt, setSearchStmt] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [toleranceThreshold, setToleranceThreshold] = useState<number>(95); // % de aproximação mínima
  const [successMsg, setSuccessMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Active selections for two-column pairing
  const [selectedStmtId, setSelectedStmtId] = useState<string | null>(null);
  const [selectedTitleId, setSelectedTitleId] = useState<string | null>(null);

  // Right column tab: 'SELECT_EXISTING' or 'CREATE_NEW'
  const [rightColumnTab, setRightColumnTab] = useState<'SELECT_EXISTING' | 'CREATE_NEW'>('SELECT_EXISTING');

  // Form states for creating a new ERP title from bank statement
  const [newTitleDesc, setNewTitleDesc] = useState('');
  const [newTitleAmount, setNewTitleAmount] = useState<number>(0);
  const [newTitleType, setNewTitleType] = useState<'PAGAR' | 'RECEBER'>('PAGAR');
  const [newTitleCategory, setNewTitleCategory] = useState('');
  const [newTitleEntity, setNewTitleEntity] = useState('');
  const [newTitleDate, setNewTitleDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const statements = storage.getStatementEntries();
  const titles = storage.getTitles();
  const chartAccounts = storage.getChartAccounts().filter(a => a.isAnalytical && a.isActive);
  const persons = storage.getPersons();

  const currentAccount = accounts.find(a => a.id === selectedAccountId);

  // Filtered bank statements for the selected account
  const accountStatements = statements.filter(s => s.bankAccountId === selectedAccountId);
  const filteredStatements = accountStatements.filter(s => {
    if (statementFilter !== 'ALL' && s.reconciliationStatus !== statementFilter) return false;
    if (searchStmt) {
      const q = searchStmt.toLowerCase();
      const match = s.description.toLowerCase().includes(q) || s.fitId.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const selectedStmt = statements.find(s => s.id === selectedStmtId);
  const selectedTitle = titles.find(t => t.id === selectedTitleId);

  // When selected statement changes, update defaults for creating a new ERP title
  const handleSelectStatement = (stmt: BankStatementEntry) => {
    setSelectedStmtId(stmt.id);
    setNewTitleDesc(stmt.description);
    setNewTitleAmount(Math.abs(stmt.amount));
    setNewTitleType(stmt.amount < 0 ? 'PAGAR' : 'RECEBER');
    setNewTitleDate(stmt.date);

    // If it has a suggestion, auto-select that title on the right
    if (stmt.suggestedTitleId) {
      setSelectedTitleId(stmt.suggestedTitleId);
      setRightColumnTab('SELECT_EXISTING');
    } else {
      // If already reconciled, select matched title
      if (stmt.matchedTitleId) {
        setSelectedTitleId(stmt.matchedTitleId);
      }
    }
  };

  // Calculate approximation score (%) between a statement entry and a title
  const calculateMatchScore = (stmt: BankStatementEntry, title: FinancialTitle): number => {
    const isStmtDebit = stmt.amount < 0;
    const isTitlePagar = title.type === 'PAGAR';

    // Type must match (debit = pagar, credit = receber)
    if (isStmtDebit !== isTitlePagar) return 0;

    const stmtAbsAmount = Math.abs(stmt.amount);
    const titleAmount = title.balancePrincipal > 0 ? title.balancePrincipal : title.originalAmount;

    // Amount difference ratio
    const diff = Math.abs(stmtAbsAmount - titleAmount);
    let amountScore = 0;
    if (diff < 0.02) {
      amountScore = 70; // exact amount gives 70 points
    } else if (diff <= titleAmount * 0.05) {
      // within 5% variation
      amountScore = 55;
    } else if (diff <= titleAmount * 0.15) {
      // within 15% variation
      amountScore = 30;
    } else {
      return 0; // too divergent in value
    }

    // Date difference
    const stmtTime = new Date(stmt.date).getTime();
    const titleTime = new Date(title.dueDate).getTime();
    const dayDiff = Math.abs(stmtTime - titleTime) / (1000 * 3600 * 24);

    let dateScore = 0;
    if (dayDiff <= 1) {
      dateScore = 25; // same or adjacent day
    } else if (dayDiff <= 3) {
      dateScore = 20;
    } else if (dayDiff <= 7) {
      dateScore = 15;
    } else if (dayDiff <= 15) {
      dateScore = 5;
    }

    // Text description similarity bonus
    let textScore = 0;
    const stmtLower = stmt.description.toLowerCase();
    const titleLower = title.description.toLowerCase();
    const words = stmtLower.split(/\s+/).filter(w => w.length > 3);
    for (const w of words) {
      if (titleLower.includes(w)) {
        textScore += 5;
      }
    }
    if (textScore > 10) textScore = 10;

    const totalScore = amountScore + dateScore + textScore;
    return Math.min(100, Math.round(totalScore));
  };

  // Run auto-matching rule engine with approximation percentage
  const handleRunAutoMatch = () => {
    const allStatements = storage.getStatementEntries();
    let suggestionsCount = 0;

    const updated = allStatements.map(stmt => {
      if (stmt.bankAccountId !== selectedAccountId) return stmt;
      if (stmt.reconciliationStatus === 'CONCILIADO') return stmt;

      // Filter titles for the target type
      const targetType = stmt.amount < 0 ? 'PAGAR' : 'RECEBER';
      const candidateTitles = titles.filter(t => t.type === targetType && t.settlementState !== 'LIQUIDADO');

      let bestScore = 0;
      let bestTitleId: string | null = null;

      for (const t of candidateTitles) {
        const score = calculateMatchScore(stmt, t);
        if (score > bestScore) {
          bestScore = score;
          bestTitleId = t.id;
        }
      }

      if (bestScore >= toleranceThreshold && bestTitleId) {
        suggestionsCount++;
        return {
          ...stmt,
          reconciliationStatus: 'SUGESTAO' as const,
          suggestedTitleId: bestTitleId,
          ruleApplied: `TAXA_APROX_${bestScore}%`
        };
      }

      return stmt;
    });

    storage.saveStatementEntries(updated);
    setSuccessMsg(`Processamento concluído: ${suggestionsCount} correspondências sugeridas com taxa ≥ ${toleranceThreshold}%.`);
    setRefreshKey(k => k + 1);
  };

  // Confirm reconciliation between selected statement and selected title
  const handleConfirmPairing = () => {
    if (!selectedStmt || !selectedTitle) {
      alert('Selecione um lançamento do extrato na coluna esquerda e um título na coluna direita para conciliar.');
      return;
    }

    // Post settlement if the title is still open
    if (selectedTitle.balancePrincipal > 0) {
      FinancialEngine.postSettlement({
        titleId: selectedTitle.id,
        settlementDate: selectedStmt.date,
        bankAccountId: selectedStmt.bankAccountId,
        principalSettled: Math.min(selectedTitle.balancePrincipal, Math.abs(selectedStmt.amount)),
        discount: 0,
        interest: 0,
        fine: 0,
        bankFee: 0,
        notes: `Baixa via Conciliação Bancária Extrato (${selectedStmt.description})`,
        voucherRef: selectedStmt.fitId
      });
    }

    // Update statement entry
    const all = storage.getStatementEntries();
    const updated = all.map(s => s.id === selectedStmt.id ? { 
      ...s, 
      reconciliationStatus: 'CONCILIADO' as const,
      matchedTitleId: selectedTitle.id 
    } : s);
    storage.saveStatementEntries(updated);

    // Save audit log
    const currentUser = storage.getCurrentUser();
    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CONCILIACAO_MANUAL',
      module: 'Conciliação Bancária',
      recordId: selectedStmt.id,
      details: `Conciliado extrato "${selectedStmt.description}" (${formatBRL(selectedStmt.amount)}) com título ${selectedTitle.titleNumber}`
    });

    setSuccessMsg(`Lançamento "${selectedStmt.description}" conciliado com sucesso com o título ${selectedTitle.titleNumber}!`);
    setSelectedStmtId(null);
    setSelectedTitleId(null);
    setRefreshKey(k => k + 1);
  };

  // Create a brand new title and immediately reconcile with selected statement
  const handleCreateTitleAndReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStmt) {
      alert('Selecione um lançamento na coluna da esquerda antes de criar o título.');
      return;
    }

    const titleNumber = `TIT-${newTitleType === 'PAGAR' ? 'PAG' : 'REC'}-${Date.now().toString().slice(-6)}`;
    const newTitle: FinancialTitle = {
      id: `title-${Date.now()}`,
      companyId: 'comp-1',
      titleNumber,
      type: newTitleType,
      counterpartyId: newTitleEntity || (newTitleType === 'PAGAR' ? 'cli-1' : 'cli-2'),
      expectedBankAccountId: selectedAccountId,
      accountId: newTitleCategory || (newTitleType === 'PAGAR' ? 'acc-4.1.01' : 'acc-3.1.01'),
      description: newTitleDesc,
      launchDate: newTitleDate || selectedStmt.date,
      competence: (newTitleDate || selectedStmt.date).substring(0, 7),
      issueDate: newTitleDate || selectedStmt.date,
      dueDate: newTitleDate || selectedStmt.date,
      expectedCashDate: newTitleDate || selectedStmt.date,
      originalAmount: newTitleAmount,
      settledPrincipal: 0,
      balancePrincipal: newTitleAmount,
      accruedInterest: 0,
      accruedFine: 0,
      documentState: 'CONFIRMADO',
      settlementState: 'ABERTO',
      originType: 'MANUAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save new title into ERP
    const currentTitles = storage.getTitles();
    storage.saveTitles([newTitle, ...currentTitles]);

    // Perform immediate settlement
    FinancialEngine.postSettlement({
      titleId: newTitle.id,
      settlementDate: selectedStmt.date,
      bankAccountId: selectedStmt.bankAccountId,
      principalSettled: newTitleAmount,
      discount: 0,
      interest: 0,
      fine: 0,
      bankFee: 0,
      notes: `Lançado e baixado automaticamente via Conciliação Bancária (${selectedStmt.description})`,
      voucherRef: selectedStmt.fitId
    });

    // Mark statement as reconciled
    const all = storage.getStatementEntries();
    const updated = all.map(s => s.id === selectedStmt.id ? { 
      ...s, 
      reconciliationStatus: 'CONCILIADO' as const,
      matchedTitleId: newTitle.id 
    } : s);
    storage.saveStatementEntries(updated);

    const currentUser = storage.getCurrentUser();
    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CRIACAO_E_CONCILIACAO',
      module: 'Conciliação Bancária',
      recordId: newTitle.id,
      details: `Novo título ${titleNumber} criado e conciliado imediatamente com extrato "${selectedStmt.description}"`
    });

    setSuccessMsg(`Novo lançamento ${titleNumber} criado e conciliado com sucesso no extrato bancário!`);
    setSelectedStmtId(null);
    setSelectedTitleId(null);
    setRightColumnTab('SELECT_EXISTING');
    setRefreshKey(k => k + 1);
  };

  // Upload and parse real OFX file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseOFX(content);

      if (parsed.length === 0) {
        alert('Nenhuma transação financeira reconhecida no arquivo selecionado. Certifique-se de enviar um arquivo OFX válido.');
        return;
      }

      const currentStatements = storage.getStatementEntries();
      const batchId = `batch-ofx-${Date.now()}`;

      const newEntries: BankStatementEntry[] = parsed.map((p, idx) => ({
        id: `stmt-ofx-${Date.now()}-${idx}`,
        importBatchId: batchId,
        bankAccountId: selectedAccountId,
        fitId: p.fitId,
        date: p.date,
        amount: p.amount,
        description: p.description,
        reconciliationStatus: 'PENDENTE'
      }));

      storage.saveStatementEntries([...newEntries, ...currentStatements]);
      setSuccessMsg(`Arquivo OFX "${file.name}" importado com sucesso! ${newEntries.length} transações adicionadas à conta.`);
      setRefreshKey(k => k + 1);
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Quick simulation sample OFX
  const handleSimulateOFX = () => {
    const today = new Date().toISOString().split('T')[0];
    const newEntries: BankStatementEntry[] = [
      {
        id: `stmt-imp-${Date.now()}-1`,
        importBatchId: `batch-${Date.now()}`,
        bankAccountId: selectedAccountId,
        fitId: `FITID-${Math.floor(Math.random() * 900000)}`,
        date: today,
        amount: 3200.00,
        description: 'TED RECEBIDA - ALPHA ENGENHARIA LTDA',
        reconciliationStatus: 'PENDENTE'
      },
      {
        id: `stmt-imp-${Date.now()}-2`,
        importBatchId: `batch-${Date.now()}`,
        bankAccountId: selectedAccountId,
        fitId: `FITID-${Math.floor(Math.random() * 900000)}`,
        date: today,
        amount: -450.00,
        description: 'PAGTO ELETRONICO - INTERNET FIBRA OPTICA',
        reconciliationStatus: 'PENDENTE'
      },
      {
        id: `stmt-imp-${Date.now()}-3`,
        importBatchId: `batch-${Date.now()}`,
        bankAccountId: selectedAccountId,
        fitId: `FITID-${Math.floor(Math.random() * 900000)}`,
        date: today,
        amount: -89.90,
        description: 'TARIFA BANCARIA PACOTE CONTA PJ',
        reconciliationStatus: 'PENDENTE'
      }
    ];

    storage.saveStatementEntries([...newEntries, ...statements]);
    setSuccessMsg(`3 lançamentos de extrato bancário inseridos para teste de conciliação.`);
    setRefreshKey(k => k + 1);
  };

  // KPI calculations
  const pendingCount = accountStatements.filter(s => s.reconciliationStatus === 'PENDENTE').length;
  const suggestionCount = accountStatements.filter(s => s.reconciliationStatus === 'SUGESTAO').length;
  const reconciledCount = accountStatements.filter(s => s.reconciliationStatus === 'CONCILIADO').length;

  // Filter ERP titles for right column
  const openTitles = titles.filter(t => {
    if (t.settlementState === 'LIQUIDADO') return false;
    if (searchTitle) {
      const q = searchTitle.toLowerCase();
      const match = t.titleNumber.toLowerCase().includes(q) || 
                    t.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    // If a statement is selected, we can prioritize matching titles
    return true;
  });

  // Calculate matching score for current pair
  const currentPairScore = (selectedStmt && selectedTitle) 
    ? calculateMatchScore(selectedStmt, selectedTitle) 
    : 0;

  return (
    <div className="space-y-6" key={refreshKey}>
      
      {/* Hidden file input for real OFX */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".ofx,.csv,.txt" 
        className="hidden" 
      />

      {/* Header com identidade visual Leão Dourado */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-[#131720] p-5 rounded-2xl border border-slate-200 dark:border-[#273040] shadow-2xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-black border border-amber-500/50 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <CheckCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Conciliação Bancária em 2 Colunas
                <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  Motor de Aproximação com Confirmação Manual
                </span>
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Confronte o extrato bancário oficial (esquerda) com os lançamentos do ERP ou crie novos títulos na hora (direita).
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bank Account Selector */}
          <div className="flex items-center bg-slate-50 dark:bg-[#1B212D] border border-slate-300 dark:border-[#273040] rounded-xl px-3 py-1.5 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 mr-2">Conta:</span>
            <select
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setSelectedStmtId(null);
              }}
              className="bg-transparent font-bold text-slate-900 dark:text-amber-400 focus:outline-none"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id} className="bg-white dark:bg-[#131720] text-slate-900 dark:text-white">
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-white dark:bg-[#1B212D] border border-slate-300 dark:border-[#273040] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center shadow-2xs"
            title="Importar extrato OFX ou CSV do banco"
          >
            <Upload className="w-4 h-4 mr-1.5 text-amber-500" />
            Importar OFX
          </button>

          <button
            onClick={handleSimulateOFX}
            className="px-3 py-2 bg-white dark:bg-[#1B212D] border border-slate-300 dark:border-[#273040] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-medium transition-colors flex items-center shadow-2xs"
            title="Gerar dados de demonstração de extrato"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Exemplo OFX
          </button>

          <div className="flex items-center bg-slate-50 dark:bg-[#1B212D] border border-slate-300 dark:border-[#273040] rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-500 mr-1.5 font-medium">Tolerância:</span>
            <select
              value={toleranceThreshold}
              onChange={(e) => setToleranceThreshold(Number(e.target.value))}
              className="bg-transparent font-bold text-amber-500 focus:outline-none"
            >
              <option value={100} className="bg-white dark:bg-[#131720]">100% (Exato)</option>
              <option value={95} className="bg-white dark:bg-[#131720]">≥ 95% (Alta)</option>
              <option value={85} className="bg-white dark:bg-[#131720]">≥ 85% (Média)</option>
              <option value={70} className="bg-white dark:bg-[#131720]">≥ 70% (Ampla)</option>
            </select>
          </div>

          <button
            onClick={handleRunAutoMatch}
            className="px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-black rounded-xl text-xs font-bold hover:brightness-105 transition-all shadow-md flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-black stroke-[2.5]" />
            Localizar Sugestões (%)
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          <div className="flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#131720] p-4 rounded-xl border border-slate-200 dark:border-[#273040] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Sugestões de Correspondência</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500 mt-1">
            {suggestionCount} aguardando
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Identificados com base na regra de aproximação</p>
        </div>

        <div className="bg-white dark:bg-[#131720] p-4 rounded-xl border border-slate-200 dark:border-[#273040] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Extrato Pendente de Vínculo</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-500 mt-1">
            {pendingCount} itens
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Selecione para vincular a título ou criar novo</p>
        </div>

        <div className="bg-white dark:bg-[#131720] p-4 rounded-xl border border-slate-200 dark:border-[#273040] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Auditados e Conciliados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500 mt-1">
            {reconciledCount} itens
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Saldo bancário e contábil 100% conferidos</p>
        </div>
      </div>

      {/* CENTRAL CONNECTOR BAR (quando há seleção ou sugestão) */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Painel de Ligação e Auditoria
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
              <span>{selectedStmt ? selectedStmt.description : 'Selecione um extrato na esquerda'}</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
              <span>{selectedTitle ? `${selectedTitle.titleNumber} (${formatBRL(selectedTitle.balancePrincipal)})` : 'Selecione um título na direita'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {selectedStmt && selectedTitle && (
            <div className="text-center px-3 py-1 bg-black/40 rounded-xl border border-amber-500/30">
              <span className="text-[10px] text-slate-400 block font-semibold">Taxa de Aproximação</span>
              <span className={`text-base font-extrabold ${currentPairScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {currentPairScore}%
              </span>
            </div>
          )}

          <button
            onClick={handleConfirmPairing}
            disabled={!selectedStmt || !selectedTitle}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
              selectedStmt && selectedTitle
                ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-black hover:brightness-110 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            CONCILIAR ESTE PAGAMENTO (CONFIRMAR)
          </button>
        </div>
      </div>

      {/* TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* ======================================================== */}
        {/* COLUNA ESQUERDA: EXTRATO BANCÁRIO / OFX                  */}
        {/* ======================================================== */}
        <div className="bg-white dark:bg-[#131720] rounded-2xl border border-slate-200 dark:border-[#273040] shadow-2xs overflow-hidden flex flex-col">
          
          {/* Header da Coluna 1 */}
          <div className="p-4 border-b border-slate-200 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  1. Extrato Bancário / OFX ({filteredStatements.length})
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecione o lançamento que deseja auditar ou conciliar
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 bg-white dark:bg-[#131720] p-1 rounded-xl border border-slate-200 dark:border-[#273040] text-[11px]">
              <button
                onClick={() => setStatementFilter('PENDENTE')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  statementFilter === 'PENDENTE'
                    ? 'bg-amber-500 text-black'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Pendentes ({pendingCount})
              </button>
              <button
                onClick={() => setStatementFilter('SUGESTAO')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  statementFilter === 'SUGESTAO'
                    ? 'bg-amber-500 text-black'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Sugestões ({suggestionCount})
              </button>
              <button
                onClick={() => setStatementFilter('CONCILIADO')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  statementFilter === 'CONCILIADO'
                    ? 'bg-amber-500 text-black'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Conciliados ({reconciledCount})
              </button>
              <button
                onClick={() => setStatementFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  statementFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-slate-100 dark:border-[#273040]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar no extrato por texto ou FITID..."
                value={searchStmt}
                onChange={e => setSearchStmt(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#273040] bg-white dark:bg-[#1B212D] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Statement List */}
          <div className="divide-y divide-slate-100 dark:divide-[#273040] max-h-[580px] overflow-y-auto">
            {filteredStatements.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Nenhum lançamento no extrato para o filtro selecionado.
              </div>
            ) : (
              filteredStatements.map(stmt => {
                const isSelected = selectedStmtId === stmt.id;
                const isCredit = stmt.amount > 0;
                const suggestedTitle = titles.find(t => t.id === stmt.suggestedTitleId);
                const matchedTitle = titles.find(t => t.id === stmt.matchedTitleId);

                return (
                  <div
                    key={stmt.id}
                    onClick={() => handleSelectStatement(stmt)}
                    className={`p-4 transition-all cursor-pointer border-l-4 ${
                      isSelected
                        ? 'bg-amber-500/10 dark:bg-amber-500/15 border-l-amber-500'
                        : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-[#1B212D]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {formatDateBR(stmt.date)}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {stmt.fitId}
                          </span>
                          {stmt.reconciliationStatus === 'SUGESTAO' && (
                            <span className="text-[10px] bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2 py-0.2 rounded-full font-bold flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              {stmt.ruleApplied || 'Sugestão'}
                            </span>
                          )}
                          {stmt.reconciliationStatus === 'CONCILIADO' && (
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 px-2 py-0.2 rounded-full font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Conciliado
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {stmt.description}
                        </div>
                      </div>

                      <div className={`text-right font-extrabold text-sm whitespace-nowrap ${
                        isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isCredit ? '+' : ''} {formatBRL(stmt.amount)}
                      </div>
                    </div>

                    {/* Vínculo info */}
                    {stmt.reconciliationStatus === 'SUGESTAO' && suggestedTitle && (
                      <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Link2 className="w-3.5 h-3.5 text-amber-500" />
                          <span>Sugestão: <strong>{suggestedTitle.titleNumber}</strong> ({suggestedTitle.description})</span>
                        </div>
                        <span className="font-bold text-amber-500">
                          {formatBRL(suggestedTitle.balancePrincipal)}
                        </span>
                      </div>
                    )}

                    {stmt.reconciliationStatus === 'CONCILIADO' && matchedTitle && (
                      <div className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Auditado com {matchedTitle.titleNumber}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>


        {/* ======================================================== */}
        {/* COLUNA DIREITA: TÍTULOS DO ERP OU CRIAR NOVO LANÇAMENTO  */}
        {/* ======================================================== */}
        <div className="bg-white dark:bg-[#131720] rounded-2xl border border-slate-200 dark:border-[#273040] shadow-2xs overflow-hidden flex flex-col">
          
          {/* Header com Abas da Coluna 2 */}
          <div className="p-4 border-b border-slate-200 dark:border-[#273040] bg-slate-50 dark:bg-[#1B212D] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  2. Lançamentos no ERP & Contas
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Vincule a um título existente ou crie o lançamento na hora
              </p>
            </div>

            {/* Alternador de Modo da Direita */}
            <div className="flex items-center bg-white dark:bg-[#131720] p-1 rounded-xl border border-slate-200 dark:border-[#273040] text-xs">
              <button
                onClick={() => setRightColumnTab('SELECT_EXISTING')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  rightColumnTab === 'SELECT_EXISTING'
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Selecionar Existente
              </button>
              <button
                onClick={() => setRightColumnTab('CREATE_NEW')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                  rightColumnTab === 'CREATE_NEW'
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Novo e Conciliar
              </button>
            </div>
          </div>

          {/* MODO 1: SELECIONAR TÍTULO EXISTENTE */}
          {rightColumnTab === 'SELECT_EXISTING' && (
            <div>
              {/* Search Bar */}
              <div className="p-3 border-b border-slate-100 dark:border-[#273040]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nº título ou favorecido..."
                    value={searchTitle}
                    onChange={e => setSearchTitle(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#273040] bg-white dark:bg-[#1B212D] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Lista de Títulos do ERP */}
              <div className="divide-y divide-slate-100 dark:divide-[#273040] max-h-[580px] overflow-y-auto">
                {openTitles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Nenhum título em aberto localizado no ERP.
                  </div>
                ) : (
                  openTitles.map(t => {
                    const isSelected = selectedTitleId === t.id;
                    const person = persons.find(p => p.id === t.counterpartyId);
                    const matchScore = selectedStmt ? calculateMatchScore(selectedStmt, t) : 0;

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTitleId(t.id)}
                        className={`p-4 transition-all cursor-pointer border-l-4 ${
                          isSelected
                            ? 'bg-amber-500/10 dark:bg-amber-500/15 border-l-amber-500'
                            : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-[#1B212D]/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                t.type === 'PAGAR'
                                  ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                                  : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                              }`}>
                                {t.type === 'PAGAR' ? 'A PAGAR' : 'A RECEBER'}
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                                {t.titleNumber}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Venc: {formatDateBR(t.dueDate)}
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                              {t.description}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Favorecido: {person?.name || 'Não informado'}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-sm text-slate-900 dark:text-white">
                              {formatBRL(t.balancePrincipal)}
                            </div>
                            {selectedStmt && matchScore > 0 && (
                              <span className={`inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                matchScore >= 90
                                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                              }`}>
                                {matchScore}% compatível
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* MODO 2: CRIAR NOVO TÍTULO E CONCILIAR JÁ */}
          {rightColumnTab === 'CREATE_NEW' && (
            <form onSubmit={handleCreateTitleAndReconcile} className="p-6 space-y-4 text-xs max-h-[580px] overflow-y-auto">
              
              {!selectedStmt && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 font-medium flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-amber-500 flex-shrink-0" />
                  Selecione um lançamento do extrato bancário na coluna da esquerda para preencher os dados automaticamente.
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Tipo de Título *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTitleType('PAGAR')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      newTitleType === 'PAGAR'
                        ? 'bg-rose-500 text-white border-rose-600'
                        : 'bg-white dark:bg-[#1B212D] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#273040]'
                    }`}
                  >
                    Contas a Pagar (Despesa)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTitleType('RECEBER')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      newTitleType === 'RECEBER'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white dark:bg-[#1B212D] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#273040]'
                    }`}
                  >
                    Contas a Receber (Receita)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Descrição da Operação *
                </label>
                <input
                  type="text"
                  required
                  value={newTitleDesc}
                  onChange={e => setNewTitleDesc(e.target.value)}
                  placeholder="Ex: Tarifa de Manutenção de Conta, Abastecimento..."
                  className="w-full rounded-xl border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#1B212D] px-3.5 py-2 font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Valor (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      value={newTitleAmount || ''}
                      onChange={e => setNewTitleAmount(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#1B212D] pl-9 pr-3 py-2 font-bold text-slate-900 dark:text-amber-400 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Data de Competência *
                  </label>
                  <input
                    type="date"
                    required
                    value={newTitleDate}
                    onChange={e => setNewTitleDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#1B212D] px-3 py-2 font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Classificação Contábil (Plano de Contas)
                </label>
                <select
                  value={newTitleCategory}
                  onChange={e => setNewTitleCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#1B212D] px-3 py-2 font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                >
                  <option value="">Selecione a categoria contábil...</option>
                  {chartAccounts.map(ca => (
                    <option key={ca.id} value={ca.id}>{ca.code} - {ca.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Cliente / Fornecedor / Favorecido
                </label>
                <select
                  value={newTitleEntity}
                  onChange={e => setNewTitleEntity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-[#273040] bg-white dark:bg-[#1B212D] px-3 py-2 font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                >
                  <option value="">Selecione a pessoa ou fornecedor...</option>
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-[#273040]">
                <button
                  type="submit"
                  disabled={!selectedStmt}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                    selectedStmt
                      ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-black hover:brightness-105 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  Criar Lançamento no ERP e Conciliar Imediatamente
                </button>
              </div>

            </form>
          )}

        </div>

      </div>

    </div>
  );
};
