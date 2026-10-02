import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Settings2, 
  RefreshCw, 
  SlidersHorizontal, 
  Building2, 
  Calendar, 
  X,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Eye,
  GitCompare,
  UserCheck,
  Info,
  Plus,
  Edit3,
  Columns,
  GitMerge,
  Filter,
  Layers,
  Sparkles,
  Brain,
  Zap,
  CheckCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { storage } from '../../services/storageService';
import { categoryLearningService } from '../../services/categoryLearningService';
import { formatBRL, formatDateBR } from '../../services/financialEngine';
import { 
  FinancialTitle, 
  TitleType, 
  Settlement, 
  FinancialMovement, 
  Counterparty,
  ChartAccount,
  BankAccount
} from '../../types';
import {
  analyzeContaAzulSpreadsheet,
  downloadBaseSpreadsheetTemplate,
  downloadContaAzulSampleTemplate,
  detectColumnMatch,
  calculateMonthlySummaries,
  CONTA_AZUL_COLUMN_PATTERNS,
  AnalyzedImportRow,
  BaseSpreadsheetRow,
  ExtraColumnDefinition,
  TypeDetectionMode,
  ImportDiffAction,
  MonthSummary,
  generateTitleFingerprint,
  normalizeText
} from '../../services/contaAzulMappingEngine';
import { ImportMonthlySummaryBar } from './ImportMonthlySummaryBar';
import { ImportExtraColumnModal } from './ImportExtraColumnModal';
import { ImportEditRowModal } from './ImportEditRowModal';
import { ImportCrossReferenceModal } from './ImportCrossReferenceModal';

interface ImportSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onImportCompleted?: () => void;
  defaultType?: TitleType;
}

interface ColumnMapping {
  tipo: string;
  titulo: string;
  fornecedor: string;
  descricao: string;
  competencia: string;
  emissao: string;
  vencimento: string;
  dataPagamento: string;
  previsaoCaixa: string;
  valorOriginal: string;
  principalBaixado: string;
  saldoAtual: string;
  situacao: string;
  categoria: string;
  banco: string;
  centroCusto: string;
}

export const ImportSpreadsheetModal: React.FC<ImportSpreadsheetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onImportCompleted,
  defaultType
}) => {
  // Stepper: 1: Upload & Preset, 2: Mapping, 3: Validation, Idempotency & Diff, 4: Results
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // File and sheet state
  const [fileName, setFileName] = useState<string>('');
  const [rawSheetData, setRawSheetData] = useState<Record<string, any>[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<'CONTA_AZUL' | 'PLANILHA_BASE' | 'CONTAJU' | 'CUSTOM'>('CONTA_AZUL');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Database lookups
  const bankAccounts = useMemo(() => storage.getBankAccounts(), []);
  const chartAccounts = useMemo(() => storage.getChartAccounts(), []);
  const counterparties = useMemo(() => storage.getCounterparties(), []);
  
  const defaultBank = bankAccounts[0]?.id || '';
  const defaultExpenseAccount = chartAccounts.find(a => a.nature === 'DESPESA_ADMINISTRATIVA' && a.isAnalytical)?.id || chartAccounts[0]?.id || '';
  const defaultRevenueAccount = chartAccounts.find(a => a.nature === 'RECEITA_SERVICO' && a.isAnalytical)?.id || chartAccounts[0]?.id || '';

  // Modo de Separação de Tipo (Receita vs Despesa)
  const [typeDetectionMode, setTypeDetectionMode] = useState<TypeDetectionMode>('AUTO');
  const [fallbackDefaultType, setFallbackDefaultType] = useState<TitleType>(defaultType || 'PAGAR');
  const [fallbackBankAccountId, setFallbackBankAccountId] = useState<string>(defaultBank);
  const [fallbackExpenseAccountId, setFallbackExpenseAccountId] = useState<string>(defaultExpenseAccount);
  const [fallbackRevenueAccountId, setFallbackRevenueAccountId] = useState<string>(defaultRevenueAccount);

  // Sincroniza tipo padrão e limpa estado ao reabrir
  useEffect(() => {
    if (isOpen) {
      if (defaultType) {
        setFallbackDefaultType(defaultType);
      }
    } else {
      if (step === 4) {
        setStep(1);
        setRawSheetData([]);
        setAnalyzedRows([]);
        setFileName('');
        setImportSummary(null);
        setExtraColumns([]);
      }
    }
  }, [isOpen, defaultType]);

  // Colunas Extras Customizadas
  const [extraColumns, setExtraColumns] = useState<ExtraColumnDefinition[]>([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);

  // Modais de Edição e Cruzamento
  const [editingRow, setEditingRow] = useState<AnalyzedImportRow | null>(null);
  const [showCrossReferenceModal, setShowCrossReferenceModal] = useState(false);

  // Mapeamento Canônico
  const [mapping, setMapping] = useState<ColumnMapping>({
    tipo: '',
    titulo: '',
    fornecedor: '',
    descricao: '',
    competencia: '',
    emissao: '',
    vencimento: '',
    dataPagamento: '',
    previsaoCaixa: '',
    valorOriginal: '',
    principalBaixado: '',
    saldoAtual: '',
    situacao: '',
    categoria: '',
    banco: '',
    centroCusto: ''
  });

  // Linhas analisadas pela engine de mapeamento e idempotência
  const [analyzedRows, setAnalyzedRows] = useState<AnalyzedImportRow[]>([]);
  const [filterAction, setFilterAction] = useState<string>('TODOS');
  const [filterType, setFilterType] = useState<'TODOS' | 'RECEBER' | 'PAGAR'>('TODOS');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedDiffRow, setSelectedDiffRow] = useState<AnalyzedImportRow | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Resoluções manuais de contrapartes feitas pelo usuário no Step 3
  const [partyOverrides, setPartyOverrides] = useState<Record<number, { action: 'USE_EXISTING' | 'CREATE_NEW', partyId?: string }>>({});

  const [importSummary, setImportSummary] = useState<{
    createdCount: number;
    updatedCount: number;
    ignoredCount: number;
    settledCount: number;
    newPartiesCount: number;
    receivablesCount: number;
    payablesCount: number;
    totalReceivables: number;
    totalPayables: number;
  } | null>(null);

  // -------------------------------------------------------------
  // Preset Mapping Applicator
  // -------------------------------------------------------------
  const applyPresetMapping = (headers: string[], preset: 'CONTA_AZUL' | 'PLANILHA_BASE' | 'CONTAJU' | 'CUSTOM') => {
    setSelectedPreset(preset);

    const findMatch = (patterns: string[]) => detectColumnMatch(headers, patterns);

    if (preset === 'PLANILHA_BASE') {
      // 11 colunas canônicas da planilha base + tipo e centro de custo
      setMapping({
        tipo: findMatch(['Tipo', 'Natureza', 'Operação']),
        titulo: findMatch(['Título', 'Titulo']),
        fornecedor: findMatch(['Fornecedor', 'Fornecedor / Cliente', 'Cliente/Fornecedor', 'Cliente']),
        descricao: findMatch(['Descrição', 'Descricao']),
        competencia: findMatch(['Competência', 'Competencia']),
        emissao: findMatch(['Emissão', 'Emissao']),
        vencimento: findMatch(['Vencimento', 'Data Vencimento']),
        dataPagamento: findMatch(['Data Pagamento', 'Data da Baixa', 'Data Quitação', 'Pago em']),
        previsaoCaixa: findMatch(['Previsão Caixa', 'Previsao Caixa', 'Previsão']),
        valorOriginal: findMatch(['Valor Original', 'Valor']),
        principalBaixado: findMatch(['Principal Baixado', 'Valor Pago', 'Valor Baixado']),
        saldoAtual: findMatch(['Saldo Atual', 'Saldo']),
        situacao: findMatch(['Situação', 'Situacao', 'Status']),
        categoria: findMatch(['Categoria', 'Plano de Contas']),
        banco: findMatch(['Banco', 'Conta Bancária']),
        centroCusto: findMatch(['Centro de Custo', 'Centro de Custos', 'CC'])
      });
    } else if (preset === 'CONTA_AZUL') {
      // Padrão completo do Conta Azul (com detecção de tipo de lançamento)
      setMapping({
        tipo: findMatch(CONTA_AZUL_COLUMN_PATTERNS.tipo),
        titulo: findMatch(CONTA_AZUL_COLUMN_PATTERNS.titulo),
        fornecedor: findMatch(CONTA_AZUL_COLUMN_PATTERNS.fornecedor),
        descricao: findMatch(CONTA_AZUL_COLUMN_PATTERNS.descricao),
        competencia: findMatch(CONTA_AZUL_COLUMN_PATTERNS.competencia),
        emissao: findMatch(CONTA_AZUL_COLUMN_PATTERNS.emissao),
        vencimento: findMatch(CONTA_AZUL_COLUMN_PATTERNS.vencimento),
        dataPagamento: findMatch(CONTA_AZUL_COLUMN_PATTERNS.dataPagamento),
        previsaoCaixa: findMatch(CONTA_AZUL_COLUMN_PATTERNS.previsaoCaixa),
        valorOriginal: findMatch(CONTA_AZUL_COLUMN_PATTERNS.valorOriginal),
        principalBaixado: findMatch(CONTA_AZUL_COLUMN_PATTERNS.principalBaixado),
        saldoAtual: findMatch(CONTA_AZUL_COLUMN_PATTERNS.saldoAtual),
        situacao: findMatch(CONTA_AZUL_COLUMN_PATTERNS.situacao),
        categoria: findMatch(CONTA_AZUL_COLUMN_PATTERNS.categoria),
        banco: findMatch(CONTA_AZUL_COLUMN_PATTERNS.banco),
        centroCusto: findMatch(CONTA_AZUL_COLUMN_PATTERNS.centroCusto)
      });
    } else if (preset === 'CONTAJU') {
      setMapping({
        tipo: findMatch(['tipo', 'natureza', 'fluxo']),
        titulo: findMatch(['documento', 'número', 'título']),
        fornecedor: findMatch(['fornecedor', 'cliente', 'contraparte']),
        descricao: findMatch(['descrição', 'descricao', 'historico']),
        competencia: findMatch(['competência', 'competencia']),
        emissao: findMatch(['emissão', 'emissao']),
        vencimento: findMatch(['vencimento', 'data de vencimento']),
        dataPagamento: findMatch(['data de pagamento', 'data pagamento', 'data da baixa']),
        previsaoCaixa: findMatch(['previsão', 'previsao caixa']),
        valorOriginal: findMatch(['valor original', 'valor']),
        principalBaixado: findMatch(['valor pago', 'principal baixado']),
        saldoAtual: findMatch(['saldo atual', 'saldo']),
        situacao: findMatch(['situação', 'situacao', 'status']),
        categoria: findMatch(['plano de contas', 'categoria']),
        banco: findMatch(['banco previsto', 'banco']),
        centroCusto: findMatch(['centro de custo', 'unidade'])
      });
    } else {
      // Auto-detect genérico
      setMapping({
        tipo: findMatch(CONTA_AZUL_COLUMN_PATTERNS.tipo),
        titulo: findMatch(CONTA_AZUL_COLUMN_PATTERNS.titulo),
        fornecedor: findMatch(CONTA_AZUL_COLUMN_PATTERNS.fornecedor),
        descricao: findMatch(CONTA_AZUL_COLUMN_PATTERNS.descricao),
        competencia: findMatch(CONTA_AZUL_COLUMN_PATTERNS.competencia),
        emissao: findMatch(CONTA_AZUL_COLUMN_PATTERNS.emissao),
        vencimento: findMatch(CONTA_AZUL_COLUMN_PATTERNS.vencimento),
        dataPagamento: findMatch(CONTA_AZUL_COLUMN_PATTERNS.dataPagamento),
        previsaoCaixa: findMatch(CONTA_AZUL_COLUMN_PATTERNS.previsaoCaixa),
        valorOriginal: findMatch(CONTA_AZUL_COLUMN_PATTERNS.valorOriginal),
        principalBaixado: findMatch(CONTA_AZUL_COLUMN_PATTERNS.principalBaixado),
        saldoAtual: findMatch(CONTA_AZUL_COLUMN_PATTERNS.saldoAtual),
        situacao: findMatch(CONTA_AZUL_COLUMN_PATTERNS.situacao),
        categoria: findMatch(CONTA_AZUL_COLUMN_PATTERNS.categoria),
        banco: findMatch(CONTA_AZUL_COLUMN_PATTERNS.banco),
        centroCusto: findMatch(CONTA_AZUL_COLUMN_PATTERNS.centroCusto)
      });
    }
  };

  // -------------------------------------------------------------
  // Leitura do Arquivo com Tratamento Seguro e Multi-Aba / Banner
  // -------------------------------------------------------------
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;

      try {
        console.error = (...args: any[]) => {
          try {
            const msg = args.map(a => (typeof a === 'string' ? a : String(a))).join(' ');
            if (msg.includes('Bad uncompressed size') || msg.includes('zip') || msg.includes('sheetJS')) {
              return;
            }
          } catch (_) {}
          originalConsoleError.apply(console, args);
        };
        console.warn = (...args: any[]) => {
          try {
            const msg = args.map(a => (typeof a === 'string' ? a : String(a))).join(' ');
            if (msg.includes('Bad uncompressed size')) return;
          } catch (_) {}
          originalConsoleWarn.apply(console, args);
        };

        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // Detecção inteligente da melhor aba e da linha exata onde começam os cabeçalhos
        let bestSheetName = workbook.SheetNames[0];
        let bestWorksheet = workbook.Sheets[bestSheetName];
        let bestHeaderRowIndex = 0;
        let highestScore = -1;

        const financialKeywords = [
          'venc', 'valor', 'pago', 'pagto', 'baix', 'saldo', 'fornec', 'client',
          'situac', 'status', 'descri', 'tipo', 'titul', 'doc', 'emiss', 'compet',
          'liquid', 'aberto', 'banco', 'categoria', 'plano'
        ];

        for (const sName of workbook.SheetNames) {
          const ws = workbook.Sheets[sName];
          if (!ws || !ws['!ref']) continue;

          // Lê primeiras 30 linhas como matriz bruta
          const rowsMatrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, range: 0 });
          const scanLimit = Math.min(rowsMatrix.length, 30);

          let sheetBestRow = 0;
          let sheetMaxMatch = 0;

          for (let r = 0; r < scanLimit; r++) {
            const rowArr = rowsMatrix[r];
            if (!Array.isArray(rowArr) || rowArr.length === 0) continue;

            let rowMatches = 0;
            const textCells = rowArr.map(c => normalizeText(String(c || '')));

            for (const cellTxt of textCells) {
              if (!cellTxt) continue;
              const hasKeyword = financialKeywords.some(kw => cellTxt.includes(kw));
              if (hasKeyword) {
                rowMatches += 5;
              } else if (cellTxt.length >= 2) {
                rowMatches += 1;
              }
            }

            if (rowMatches > sheetMaxMatch) {
              sheetMaxMatch = rowMatches;
              sheetBestRow = r;
            }
          }

          const totalRowsInSheet = rowsMatrix.length;
          const sheetScore = sheetMaxMatch * 100 + totalRowsInSheet;

          if (sheetScore > highestScore) {
            highestScore = sheetScore;
            bestSheetName = sName;
            bestWorksheet = ws;
            bestHeaderRowIndex = sheetBestRow;
          }
        }

        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(bestWorksheet, { 
          range: bestHeaderRowIndex,
          defval: '',
          raw: false 
        });

        if (jsonData.length === 0) {
          alert('A planilha selecionada está vazia ou não contém dados legíveis.');
          return;
        }

        // Extrai e normaliza lista de cabeçalhos válidos
        const rawHeaders = Object.keys(jsonData[0] || {});
        const headers = rawHeaders.filter(h => h && !h.startsWith('__EMPTY'));
        const finalHeaders = headers.length > 0 ? headers : rawHeaders;

        setAvailableHeaders(finalHeaders);
        setRawSheetData(jsonData);

        applyPresetMapping(finalHeaders, selectedPreset);
        setStep(2);
      } catch (err) {
        console.error('Erro ao ler planilha:', err);
        alert('Não foi possível ler o arquivo. Certifique-se de que é uma planilha válida (.xlsx, .xls ou .csv).');
      } finally {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // -------------------------------------------------------------
  // Step 2 -> 3: Process and Validate Mapped Rows
  // -------------------------------------------------------------
  const handleProcessValidation = () => {
    if (!mapping.vencimento && !mapping.valorOriginal) {
      alert('Selecione pelo menos as colunas de "Data de Vencimento" e "Valor Original" para continuar.');
      return;
    }

    const existingTitles = storage.getTitles();
    const currentCounterparties = storage.getCounterparties();
    const currentAccounts = storage.getChartAccounts();

    const analyzed = analyzeContaAzulSpreadsheet(
      rawSheetData,
      availableHeaders,
      mapping as any,
      existingTitles,
      currentCounterparties,
      currentAccounts,
      fallbackExpenseAccountId,
      fallbackRevenueAccountId,
      typeDetectionMode,
      extraColumns,
      fallbackDefaultType
    );

    setAnalyzedRows(analyzed);
    setPartyOverrides({});
    setSelectedMonth('ALL');
    setStep(3);
  };

  // -------------------------------------------------------------
  // Resumo Mensal Dinâmico
  // -------------------------------------------------------------
  const monthlySummaries: MonthSummary[] = useMemo(() => {
    return calculateMonthlySummaries(analyzedRows);
  }, [analyzedRows]);

  // -------------------------------------------------------------
  // Resoluções Manuais e Edições de Linha (Step 3)
  // -------------------------------------------------------------
  const handleSetRowType = (rowNumber: number, newType: TitleType) => {
    setAnalyzedRows(prev => prev.map(r => {
      if (r.rowNumber !== rowNumber) return r;

      const norm = { ...r.normalized, tipo: newType, isManuallyEdited: true };
      const newFingerprint = generateTitleFingerprint(newType, norm.titulo, norm.fornecedor, norm.vencimento, norm.valorOriginal);
      
      return {
        ...r,
        normalized: norm,
        fingerprint: newFingerprint,
        matchedChartAccountId: newType === 'RECEBER' ? fallbackRevenueAccountId : fallbackExpenseAccountId
      };
    }));
  };

  const handleSaveRow = (
    rowNumber: number, 
    updatedNormalized: BaseSpreadsheetRow, 
    resolvedPartyId?: string, 
    resolvedAccountId?: string
  ) => {
    setAnalyzedRows(prev => prev.map(r => {
      if (r.rowNumber !== rowNumber) return r;

      const newFingerprint = generateTitleFingerprint(
        updatedNormalized.tipo,
        updatedNormalized.titulo,
        updatedNormalized.fornecedor,
        updatedNormalized.vencimento,
        updatedNormalized.valorOriginal
      );

      // Revalida se existe erro remanescente
      const errors: string[] = [];
      if (!updatedNormalized.vencimento) errors.push('Vencimento inválido');
      if (updatedNormalized.valorOriginal <= 0) errors.push('Valor original deve ser superior a R$ 0,00');
      if (!updatedNormalized.fornecedor) errors.push('Contraparte não informada');

      const action: ImportDiffAction = errors.length > 0 
        ? 'ERRO' 
        : (r.action === 'ERRO' || r.action === 'IGNORAR_IDENTICO')
          ? (r.existingTitle ? 'ATUALIZAR' : 'CRIAR')
          : r.action;

      return {
        ...r,
        normalized: updatedNormalized,
        fingerprint: newFingerprint,
        action,
        errors,
        matchedCounterpartyId: resolvedPartyId || r.matchedCounterpartyId,
        matchedChartAccountId: resolvedAccountId || r.matchedChartAccountId,
        isSelected: action !== 'ERRO'
      };
    }));
  };

  const handleToggleRowStatus = (rowNumber: number) => {
    setAnalyzedRows(prev => prev.map(r => {
      if (r.rowNumber !== rowNumber) return r;

      const isCurrentlyPaid = r.normalized.situacao === 'LIQUIDADO';
      const newSituacao = isCurrentlyPaid ? 'ABERTO' : 'LIQUIDADO';
      const valorOriginal = r.normalized.valorOriginal;
      const principalBaixado = isCurrentlyPaid ? 0 : valorOriginal;
      const saldoAtual = isCurrentlyPaid ? valorOriginal : 0;

      const updatedNormalized: BaseSpreadsheetRow = {
        ...r.normalized,
        situacao: newSituacao,
        principalBaixado,
        saldoAtual,
        isManuallyEdited: true
      };

      const newFingerprint = generateTitleFingerprint(
        updatedNormalized.tipo,
        updatedNormalized.titulo,
        updatedNormalized.fornecedor,
        updatedNormalized.vencimento,
        updatedNormalized.valorOriginal
      );

      return {
        ...r,
        normalized: updatedNormalized,
        fingerprint: newFingerprint
      };
    }));
  };

  // Filtros de Categoria e Memória Inteligente (Step 3)
  const [filterCategoryMode, setFilterCategoryMode] = useState<'TODOS' | 'MEMORIA' | 'MANUAL' | 'FILTRADOS_SINAL'>('TODOS');
  const [batchCategoryId, setBatchCategoryId] = useState<string>('');

  const handleChangeRowCategory = (rowNumber: number, newAccountId: string) => {
    const targetAccount = chartAccounts.find(a => a.id === newAccountId);
    if (!targetAccount) return;

    setAnalyzedRows(prev => prev.map(r => {
      if (r.rowNumber !== rowNumber) return r;
      return {
        ...r,
        matchedChartAccountId: targetAccount.id,
        matchedChartAccountName: targetAccount.name,
        normalized: {
          ...r.normalized,
          categoria: targetAccount.name,
          isManuallyEdited: true
        },
        categoryResolution: 'MATCH_PLANO',
        isFromMemory: false,
        memoryReason: 'Ajustado manualmente nesta sessão (será gravado na memória de IA)'
      };
    }));
  };

  const handleApplyBatchCategory = () => {
    if (!batchCategoryId) {
      alert('Por favor, selecione uma categoria para aplicar aos lançamentos marcados.');
      return;
    }
    const targetAccount = chartAccounts.find(a => a.id === batchCategoryId);
    if (!targetAccount) return;

    let count = 0;
    setAnalyzedRows(prev => prev.map(r => {
      if (!r.isSelected || r.action === 'ERRO' || r.isTypeFilteredOut) return r;
      count++;
      return {
        ...r,
        matchedChartAccountId: targetAccount.id,
        matchedChartAccountName: targetAccount.name,
        normalized: {
          ...r.normalized,
          categoria: targetAccount.name,
          isManuallyEdited: true
        },
        categoryResolution: 'MATCH_PLANO',
        isFromMemory: false,
        memoryReason: `Atribuído em lote para "${targetAccount.name}"`
      };
    }));
  };

  // Métricas do Preview (Step 3)
  const previewMetrics = useMemo(() => {
    const total = analyzedRows.length;
    const toCreate = analyzedRows.filter(r => r.action === 'CRIAR' && r.isSelected).length;
    const toUpdate = analyzedRows.filter(r => r.action === 'ATUALIZAR' && r.isSelected).length;
    const ignored = analyzedRows.filter(r => r.action === 'IGNORAR_IDENTICO').length;
    const errors = analyzedRows.filter(r => r.action === 'ERRO').length;
    const memoryCount = analyzedRows.filter(r => r.isFromMemory && !r.isTypeFilteredOut).length;
    const filteredOutCount = analyzedRows.filter(r => r.isTypeFilteredOut).length;
    const manualCategoryCount = analyzedRows.filter(r => !r.isFromMemory && !r.isTypeFilteredOut && r.action !== 'ERRO').length;
    
    const selectedActive = analyzedRows.filter(r => r.isSelected && r.action !== 'ERRO' && !r.isTypeFilteredOut);
    const totalReceivables = selectedActive
      .filter(r => r.normalized.tipo === 'RECEBER')
      .reduce((acc, r) => acc + r.normalized.valorOriginal, 0);

    const totalPayables = selectedActive
      .filter(r => r.normalized.tipo === 'PAGAR')
      .reduce((acc, r) => acc + r.normalized.valorOriginal, 0);

    const paidValue = selectedActive.reduce((acc, r) => acc + r.normalized.principalBaixado, 0);

    return { 
      total, 
      toCreate, 
      toUpdate, 
      ignored, 
      errors, 
      memoryCount,
      filteredOutCount,
      manualCategoryCount,
      totalReceivables, 
      totalPayables, 
      netBalance: totalReceivables - totalPayables,
      paidValue 
    };
  }, [analyzedRows]);

  // Linhas filtradas para exibição no Step 3 (por status, tipo, mês e categoria)
  const displayedRows = useMemo(() => {
    return analyzedRows.filter(r => {
      // Filtro por Mês
      if (selectedMonth !== 'ALL') {
        const rowMonth = r.normalized.competencia || r.normalized.vencimento.substring(0, 7);
        if (rowMonth !== selectedMonth) return false;
      }

      // Filtro por Status
      if (filterAction !== 'TODOS' && r.action !== filterAction) {
        return false;
      }

      // Filtro por Tipo (Receita vs Despesa)
      if (filterType !== 'TODOS' && r.normalized.tipo !== filterType) {
        return false;
      }

      // Filtro por Categoria / Memória IA
      if (filterCategoryMode === 'MEMORIA' && !r.isFromMemory) {
        return false;
      }
      if (filterCategoryMode === 'MANUAL' && (r.isFromMemory || r.isTypeFilteredOut)) {
        return false;
      }
      if (filterCategoryMode === 'FILTRADOS_SINAL' && !r.isTypeFilteredOut) {
        return false;
      }

      return true;
    });
  }, [analyzedRows, filterAction, filterType, selectedMonth, filterCategoryMode]);

  // Toggle seleção individual
  const toggleRow = (rowNumber: number) => {
    setAnalyzedRows(prev => prev.map(r => r.rowNumber === rowNumber ? { ...r, isSelected: !r.isSelected } : r));
  };

  const toggleAll = (selected: boolean) => {
    setAnalyzedRows(prev => prev.map(r => {
      if (r.action === 'ERRO' || r.action === 'IGNORAR_IDENTICO') return r;
      // Se tiver filtro de mês ou tipo, aplica apenas aos visíveis
      const isVisible = displayedRows.some(d => d.rowNumber === r.rowNumber);
      return isVisible ? { ...r, isSelected: selected } : r;
    }));
  };

  // Ações de Lote no Mês
  const handleApproveMonth = (monthKey: string) => {
    setAnalyzedRows(prev => prev.map(r => {
      const rowMonth = r.normalized.competencia || r.normalized.vencimento.substring(0, 7);
      if (monthKey === 'ALL' || rowMonth === monthKey) {
        if (r.action !== 'ERRO') return { ...r, isSelected: true };
      }
      return r;
    }));
  };

  const handleDeselectMonth = (monthKey: string) => {
    setAnalyzedRows(prev => prev.map(r => {
      const rowMonth = r.normalized.competencia || r.normalized.vencimento.substring(0, 7);
      if (monthKey === 'ALL' || rowMonth === monthKey) {
        return { ...r, isSelected: false };
      }
      return r;
    }));
  };

  const handleSetMonthType = (monthKey: string, newType: 'RECEBER' | 'PAGAR') => {
    setAnalyzedRows(prev => prev.map(r => {
      const rowMonth = r.normalized.competencia || r.normalized.vencimento.substring(0, 7);
      if (monthKey === 'ALL' || rowMonth === monthKey) {
        const norm = { ...r.normalized, tipo: newType, isManuallyEdited: true };
        const newFingerprint = generateTitleFingerprint(newType, norm.titulo, norm.fornecedor, norm.vencimento, norm.valorOriginal);
        return {
          ...r,
          normalized: norm,
          fingerprint: newFingerprint,
          matchedChartAccountId: newType === 'RECEBER' ? fallbackRevenueAccountId : fallbackExpenseAccountId
        };
      }
      return r;
    }));
  };

  // Adicionar Coluna Extra
  const handleAddExtraColumn = (col: ExtraColumnDefinition) => {
    setExtraColumns(prev => [...prev, col]);
    // Atualiza imediatamente as linhas analisadas capturando os dados brutos dessa coluna
    setAnalyzedRows(prev => prev.map(r => {
      const rawVal = r.raw[col.sourceHeader];
      const custom = { ...(r.normalized.customFields || {}), [col.id]: rawVal };
      return {
        ...r,
        normalized: {
          ...r.normalized,
          customFields: custom
        }
      };
    }));
  };

  // Atualização após criação de entidades via Modal de Cruzamento
  const handleRefreshEntities = () => {
    const existingTitles = storage.getTitles();
    const currentCounterparties = storage.getCounterparties();
    const currentAccounts = storage.getChartAccounts();

    // Re-analisa com novos cadastros
    const reAnalyzed = analyzeContaAzulSpreadsheet(
      rawSheetData,
      availableHeaders,
      mapping as any,
      existingTitles,
      currentCounterparties,
      currentAccounts,
      fallbackExpenseAccountId,
      fallbackRevenueAccountId,
      typeDetectionMode,
      extraColumns,
      fallbackDefaultType
    );

    // Preserva edições manuais prévias realizadas pelo usuário
    const preserved = reAnalyzed.map(newRow => {
      const prevRow = analyzedRows.find(pr => pr.rowNumber === newRow.rowNumber);
      if (!prevRow) return newRow;
      if (prevRow.normalized.isManuallyEdited) {
        return {
          ...newRow,
          normalized: prevRow.normalized,
          fingerprint: prevRow.fingerprint,
          matchedCounterpartyId: prevRow.matchedCounterpartyId || newRow.matchedCounterpartyId,
          matchedChartAccountId: prevRow.matchedChartAccountId || newRow.matchedChartAccountId,
          action: prevRow.action === 'ERRO' && newRow.action !== 'ERRO' ? newRow.action : prevRow.action,
          isSelected: prevRow.isSelected
        };
      }
      return {
        ...newRow,
        isSelected: prevRow.action === 'ERRO' && newRow.action !== 'ERRO' ? true : prevRow.isSelected
      };
    });

    setAnalyzedRows(preserved);
  };

  // -------------------------------------------------------------
  // Step 3 -> 4: Execução da Gravação Transacional Idempotente
  // -------------------------------------------------------------
  const handleExecuteImport = () => {
    const selectedRows = analyzedRows.filter(r => r.isSelected && r.action !== 'ERRO');
    if (selectedRows.length === 0) {
      alert('Nenhuma linha elegível selecionada para importação.');
      return;
    }

    setIsImporting(true);

    try {
      const currentTitles = storage.getTitles();
      const currentCounterparties = storage.getCounterparties();
      const currentSettlements = storage.getSettlements();
      const currentMovements = storage.getMovements();
      const currentUser = storage.getCurrentUser();
      const nowIso = new Date().toISOString();

      let createdCount = 0;
      let updatedCount = 0;
      let settledCount = 0;
      let newPartiesCount = 0;
      let receivablesCount = 0;
      let payablesCount = 0;
      let totalReceivables = 0;
      let totalPayables = 0;

      const updatedTitlesList = [...currentTitles];
      const newSettlements: Settlement[] = [];
      const newMovements: FinancialMovement[] = [];

      // Mapeamento de contrapartes novas criadas nesta execução para reaproveitamento
      const createdPartyMap: Record<string, string> = {};

      for (const row of selectedRows) {
        const isRevenue = row.normalized.tipo === 'RECEBER';
        if (isRevenue) {
          receivablesCount++;
          totalReceivables += row.normalized.valorOriginal;
        } else {
          payablesCount++;
          totalPayables += row.normalized.valorOriginal;
        }

        // 1. Resolução da Contraparte (Cliente para Receita, Fornecedor para Despesa)
        let resolvedPartyId = row.matchedCounterpartyId;
        const override = partyOverrides[row.rowNumber];

        if (override?.action === 'USE_EXISTING' && override.partyId) {
          resolvedPartyId = override.partyId;
        } else if (override?.action === 'CREATE_NEW' || (!resolvedPartyId && row.counterpartyResolution === 'NOVO_SOLICITADO')) {
          const normName = row.normalized.fornecedor.trim();
          if (createdPartyMap[normName]) {
            resolvedPartyId = createdPartyMap[normName];
          } else {
            const newPartyId = `cp-imp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const newParty: Counterparty = {
              id: newPartyId,
              type: isRevenue ? 'CLIENTE' : 'FORNECEDOR',
              name: normName,
              tradeName: normName,
              document: '00.000.000/0000-00',
              email: `contato@${normName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'empresa'}.com.br`,
              phone: '(11) 99999-0000',
              status: 'ATIVO',
              notes: `Cadastrado na importação de planilha (${fileName}) como ${isRevenue ? 'Cliente' : 'Fornecedor'}.`,
              createdAt: nowIso
            };
            currentCounterparties.push(newParty);
            createdPartyMap[normName] = newPartyId;
            resolvedPartyId = newPartyId;
            newPartiesCount++;
          }
        } else if (!resolvedPartyId && row.suggestedCounterpartyId) {
          resolvedPartyId = row.suggestedCounterpartyId;
        }

        if (!resolvedPartyId) {
          resolvedPartyId = counterparties[0]?.id || 'cp-1';
        }

        // 2. Classificação / Plano de Contas e Banco
        const defaultAccountForType = isRevenue ? fallbackRevenueAccountId : fallbackExpenseAccountId;
        const accountId = row.matchedChartAccountId || defaultAccountForType;
        const expectedBankId = fallbackBankAccountId;

        if (row.action === 'CRIAR') {
          // Criação de Novo Título
          const titleId = `tit-imp-${Date.now()}-${row.rowNumber}-${Math.floor(Math.random() * 1000)}`;
          const newTitle: FinancialTitle = {
            id: titleId,
            companyId: 'comp-1',
            type: row.normalized.tipo,
            titleNumber: row.normalized.titulo,
            externalId: row.externalId,
            fingerprint: row.fingerprint,
            importSource: selectedPreset === 'PLANILHA_BASE' ? 'PLANILHA_BASE' : 'CONTA_AZUL',
            categoryName: row.normalized.categoria,
            customFields: row.normalized.customFields,
            counterpartyId: resolvedPartyId,
            description: row.normalized.descricao,
            accountId,
            launchDate: nowIso.split('T')[0],
            competence: row.normalized.competencia,
            issueDate: row.normalized.emissao,
            dueDate: row.normalized.vencimento,
            expectedCashDate: row.normalized.previsaoCaixa,
            originalAmount: row.normalized.valorOriginal,
            settledPrincipal: row.normalized.principalBaixado,
            balancePrincipal: row.normalized.saldoAtual,
            accruedInterest: 0,
            accruedFine: 0,
            documentState: row.normalized.situacao === 'CANCELADO' ? 'CANCELADO' : 'CONFIRMADO',
            settlementState: row.normalized.situacao === 'LIQUIDADO' ? 'LIQUIDADO' : row.normalized.situacao === 'PARCIAL' ? 'PARCIAL' : 'ABERTO',
            originType: 'MANUAL',
            expectedBankAccountId: expectedBankId,
            notes: `Importado de planilha (${fileName}). Título: ${row.normalized.titulo}.`,
            createdAt: nowIso,
            updatedAt: nowIso
          };

          updatedTitlesList.unshift(newTitle);
          createdCount++;

          // Se já possui baixa de principal, registra Settlement e Movimento Bancário
          if (row.normalized.principalBaixado > 0) {
            settledCount++;
            const settlementId = `set-imp-${Date.now()}-${row.rowNumber}`;
            const settlementDate = row.normalized.dataPagamento || row.normalized.previsaoCaixa || row.normalized.vencimento;

            newSettlements.push({
              id: settlementId,
              titleId,
              settlementNumber: `BX-IMP-${Math.floor(Math.random() * 90000 + 10000)}`,
              settlementDate,
              bankAccountId: expectedBankId,
              components: {
                principalSettled: row.normalized.principalBaixado,
                discount: 0,
                interest: 0,
                fine: 0,
                bankFee: 0,
                netFinancialAmount: row.normalized.principalBaixado
              },
              notes: `Baixa importada (${fileName}).`,
              isReversed: false,
              createdAt: nowIso,
              createdBy: currentUser.name
            });

            newMovements.push({
              id: `mov-imp-${Date.now()}-${row.rowNumber}`,
              bankAccountId: expectedBankId,
              date: settlementDate,
              direction: isRevenue ? 'ENTRADA' : 'SAIDA',
              amount: row.normalized.principalBaixado,
              originType: 'BAIXA_TITULO',
              originReferenceId: settlementId,
              description: `Baixa importada ${row.normalized.titulo} - ${row.normalized.fornecedor}`,
              counterpartyId: resolvedPartyId,
              accountId,
              cashFlowCategory: 'OPERACIONAL',
              createdAt: nowIso
            });
          }
        } else if (row.action === 'ATUALIZAR' && row.existingTitle) {
          // Atualização de Título Existente (Diff confirmado)
          const idx = updatedTitlesList.findIndex(t => t.id === row.existingTitle?.id);
          if (idx !== -1) {
            const currentT = updatedTitlesList[idx];
            const updatedT: FinancialTitle = {
              ...currentT,
              type: row.normalized.tipo,
              externalId: row.externalId,
              fingerprint: row.fingerprint,
              categoryName: row.normalized.categoria || currentT.categoryName,
              customFields: { ...(currentT.customFields || {}), ...(row.normalized.customFields || {}) },
              competence: row.normalized.competencia,
              dueDate: row.normalized.vencimento,
              expectedCashDate: row.normalized.previsaoCaixa,
              originalAmount: row.normalized.valorOriginal,
              settledPrincipal: row.normalized.principalBaixado,
              balancePrincipal: row.normalized.saldoAtual,
              settlementState: row.normalized.situacao === 'LIQUIDADO' ? 'LIQUIDADO' : row.normalized.situacao === 'PARCIAL' ? 'PARCIAL' : 'ABERTO',
              documentState: row.normalized.situacao === 'CANCELADO' ? 'CANCELADO' : 'CONFIRMADO',
              updatedAt: nowIso,
              notes: `${currentT.notes || ''} [Atualizado via importação ${fileName} em ${nowIso.split('T')[0]}]`
            };

            updatedTitlesList[idx] = updatedT;
            updatedCount++;

            // Se o principal baixado aumentou, registra a baixa complementar
            if (row.normalized.principalBaixado > currentT.settledPrincipal) {
              const diffAmount = row.normalized.principalBaixado - currentT.settledPrincipal;
              settledCount++;
              const settlementId = `set-imp-upd-${Date.now()}-${row.rowNumber}`;
              const settlementDate = row.normalized.dataPagamento || row.normalized.previsaoCaixa || row.normalized.vencimento;

              newSettlements.push({
                id: settlementId,
                titleId: currentT.id,
                settlementNumber: `BX-UPD-${Math.floor(Math.random() * 90000 + 10000)}`,
                settlementDate,
                bankAccountId: currentT.expectedBankAccountId || expectedBankId,
                components: {
                  principalSettled: diffAmount,
                  discount: 0,
                  interest: 0,
                  fine: 0,
                  bankFee: 0,
                  netFinancialAmount: diffAmount
                },
                notes: `Baixa atualizada via reimportação (${fileName}).`,
                isReversed: false,
                createdAt: nowIso,
                createdBy: currentUser.name
              });

              newMovements.push({
                id: `mov-imp-upd-${Date.now()}-${row.rowNumber}`,
                bankAccountId: currentT.expectedBankAccountId || expectedBankId,
                date: settlementDate,
                direction: isRevenue ? 'ENTRADA' : 'SAIDA',
                amount: diffAmount,
                originType: 'BAIXA_TITULO',
                originReferenceId: settlementId,
                description: `Baixa complementar importada ${row.normalized.titulo} - ${row.normalized.fornecedor}`,
                counterpartyId: resolvedPartyId,
                accountId,
                cashFlowCategory: 'OPERACIONAL',
                createdAt: nowIso
              });
            }
          }
        }
      }

      // Persistência Transacional
      storage.saveCounterparties(currentCounterparties);
      storage.saveTitles(updatedTitlesList);
      if (newSettlements.length > 0) {
        storage.saveSettlements([...newSettlements, ...currentSettlements]);
      }
      if (newMovements.length > 0) {
        storage.saveMovements([...newMovements, ...currentMovements]);
      }

      // Aprendizado Contínuo com os dados confirmados pelo usuário
      try {
        const rowsToLearn = selectedRows.map(r => {
          const acc = chartAccounts.find(a => a.id === r.matchedChartAccountId);
          return {
            fornecedor: r.normalized.fornecedor,
            descricao: r.normalized.descricao,
            tipo: r.normalized.tipo,
            chartAccountId: r.matchedChartAccountId || '',
            chartAccountName: acc?.name || r.normalized.categoria || ''
          };
        }).filter(r => r.chartAccountId && r.chartAccountName);

        categoryLearningService.learnBatch(rowsToLearn);
      } catch (e) {
        console.warn('Falha ao gravar aprendizado de categorias:', e);
      }

      // Registro de Auditoria
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CRIACAO_TITULO',
        module: 'Mapeamento Conta Azul -> Planilha-Base',
        recordId: `import-${Date.now()}`,
        details: `Importação transacional de ${selectedRows.length} títulos da planilha "${fileName}". ${createdCount} criados (${receivablesCount} receitas, ${payablesCount} despesas), ${updatedCount} atualizados, ${settledCount} baixas e ${newPartiesCount} novas contrapartes cadastradas.`
      });

      setImportSummary({
        createdCount,
        updatedCount,
        ignoredCount: previewMetrics.ignored,
        settledCount,
        newPartiesCount,
        receivablesCount,
        payablesCount,
        totalReceivables,
        totalPayables
      });

      setStep(4);
    } catch (err) {
      console.error('Erro na gravação transacional:', err);
      alert('Ocorreu um erro durante a gravação dos dados importados. Verifique o console.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl max-w-6xl w-full flex flex-col max-h-[95vh] overflow-hidden text-[var(--text-primary)]">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                  Importação de Planilhas: Receitas & Despesas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Separação por Mês & Cruzamento Cadastral
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Mapeamento flexível, resumos mensais em tempo real, edição inline antes da aprovação e campos personalizados.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Wizard Progress Bar */}
        <div className="px-5 py-2.5 bg-[var(--surface-card)] border-b border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold shrink-0">
          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 1 ? 'bg-amber-400 text-[#0f172a]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
            }`}>
              1
            </span>
            <span className={step === 1 ? 'text-amber-400 font-bold' : 'text-[var(--text-secondary)]'}>
              Arquivo & Preset
            </span>
          </div>

          <div className="h-0.5 flex-1 max-w-[50px] bg-[var(--border-subtle)] mx-2" />

          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 2 ? 'bg-amber-400 text-[#0f172a]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
            }`}>
              2
            </span>
            <span className={step === 2 ? 'text-amber-400 font-bold' : 'text-[var(--text-secondary)]'}>
              Mapeamento de Colunas
            </span>
          </div>

          <div className="h-0.5 flex-1 max-w-[50px] bg-[var(--border-subtle)] mx-2" />

          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 3 ? 'bg-amber-400 text-[#0f172a]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
            }`}>
              3
            </span>
            <span className={step === 3 ? 'text-amber-400 font-bold' : 'text-[var(--text-secondary)]'}>
              Conferência de Categorias & Memória IA
            </span>
          </div>

          <div className="h-0.5 flex-1 max-w-[50px] bg-[var(--border-subtle)] mx-2" />

          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 4 ? 'bg-emerald-400 text-[#0f172a]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
            }`}>
              4
            </span>
            <span className={step === 4 ? 'text-emerald-400 font-bold' : 'text-[var(--text-secondary)]'}>
              Importação Concluída
            </span>
          </div>
        </div>

        {/* Modal Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {/* ========================================================= */}
          {/* STEP 1: UPLOAD & PRESET SELECTION */}
          {/* ========================================================= */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Presets Grid */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center">
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                  Origem do Arquivo / Formato da Planilha:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'CONTA_AZUL', name: 'Conta Azul', desc: 'Mapeamento automático de receitas e despesas' },
                    { id: 'PLANILHA_BASE', name: 'Planilha-Base Anual', desc: 'Modelo operacional unificado' },
                    { id: 'CONTAJU', name: 'Modelo Contaju', desc: 'Template com plano de contas integrado' },
                    { id: 'CUSTOM', name: 'Personalizado', desc: 'Mapeamento flexível de qualquer layout' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPreset(p.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedPreset === p.id
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-xs'
                          : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-amber-500/40'
                      }`}
                    >
                      <p className="font-bold text-xs text-[var(--text-primary)]">{p.name}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Drag & Drop Box */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  isDragOver 
                    ? 'border-amber-400 bg-amber-500/10 scale-[0.99]' 
                    : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-amber-500/50 hover:bg-[var(--surface-card)]'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
                  <Upload className="w-7 h-7" />
                </div>

                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                  Arraste e solte sua planilha aqui, ou clique para selecionar
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                  Formatos suportados: .xlsx, .xls e .csv. Planilhas com Contas a Pagar, Contas a Receber ou ambas unificadas anualmente.
                </p>
              </div>

              {/* Modelos Oficiais para Download */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        Planilha-Base Anual (Receitas & Despesas)
                      </h4>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        Template oficial com múltiplos meses, colunas de tipo, saldos e centro de custo.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadBaseSpreadsheetTemplate(XLSX)}
                    className="px-3 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center transition-colors shrink-0 ml-2"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Baixar Modelo
                  </button>
                </div>

                <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        Exemplo Anual Exportado Conta Azul
                      </h4>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        Demonstração com múltiplos meses e lançamentos de receitas e despesas.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadContaAzulSampleTemplate(XLSX)}
                    className="px-3 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center transition-colors shrink-0 ml-2"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Baixar Exemplo
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: COLUMN MAPPING & REVENUE/EXPENSE CONFIG */}
          {/* ========================================================= */}
          {step === 2 && (
            <div className="space-y-5">
              {/* File Info Bar */}
              <div className="bg-[var(--surface-elevated)] p-3.5 rounded-xl border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">{fileName}</span>
                  <span className="text-xs text-[var(--text-secondary)]">({rawSheetData.length} linhas detectadas)</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-[var(--text-secondary)]">Preset:</span>
                  <select
                    value={selectedPreset}
                    onChange={(e) => applyPresetMapping(availableHeaders, e.target.value as any)}
                    aria-label="Preset de mapeamento"
                    className="px-2.5 py-1 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs font-bold text-amber-400 focus:outline-hidden"
                  >
                    <option value="CONTA_AZUL">Conta Azul (Recomendado)</option>
                    <option value="PLANILHA_BASE">Planilha-Base Anual</option>
                    <option value="CONTAJU">Modelo Contaju</option>
                    <option value="CUSTOM">Personalizado</option>
                  </select>
                </div>
              </div>

              {/* Configuração de Separação de Receitas e Despesas */}
              <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    Separação Inteligente: Receitas vs. Despesas
                  </h4>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Define como o sistema classifica cada linha da planilha
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Método de Identificação de Tipo:
                    </label>
                    <select
                      value={typeDetectionMode}
                      onChange={e => setTypeDetectionMode(e.target.value as TypeDetectionMode)}
                      className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-bold text-amber-400 focus:border-amber-400 focus:outline-hidden"
                    >
                      <option value="AUTO">Automático (Coluna Tipo / Palavras-chave / Sinais)</option>
                      <option value="SIGNAL_BASED">Baseado em Sinal (+ Receitas / - Despesas)</option>
                      <option value="FORCE_PAYABLE">Forçar todas como Contas a Pagar (Despesas)</option>
                      <option value="FORCE_RECEIVABLE">Forçar todas como Contas a Receber (Receitas)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Classificação Fallback (quando não identificado na linha):
                    </label>
                    <select
                      value={fallbackDefaultType}
                      onChange={e => setFallbackDefaultType(e.target.value as TitleType)}
                      className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-bold text-[var(--text-primary)] focus:border-amber-400 focus:outline-hidden"
                    >
                      <option value="PAGAR">Contas a Pagar (Despesa / Fornecedor)</option>
                      <option value="RECEBER">Contas a Receber (Receita / Cliente)</option>
                    </select>
                  </div>
                </div>

                {/* Contas Padrão para Receitas e Despesas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-subtle)]">
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-400 block mb-1">
                      Plano de Contas Padrão (Receitas):
                    </label>
                    <select
                      value={fallbackRevenueAccountId}
                      onChange={e => setFallbackRevenueAccountId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[var(--surface-elevated)] border border-emerald-500/30 rounded-lg text-xs font-medium text-[var(--text-primary)] focus:outline-hidden"
                    >
                      {chartAccounts.filter(a => a.isAnalytical).map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-rose-400 block mb-1">
                      Plano de Contas Padrão (Despesas):
                    </label>
                    <select
                      value={fallbackExpenseAccountId}
                      onChange={e => setFallbackExpenseAccountId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[var(--surface-elevated)] border border-rose-500/30 rounded-lg text-xs font-medium text-[var(--text-primary)] focus:outline-hidden"
                    >
                      {chartAccounts.filter(a => a.isAnalytical).map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Conta Bancária Padrão (Baixas):
                    </label>
                    <select
                      value={fallbackBankAccountId}
                      onChange={e => setFallbackBankAccountId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg text-xs font-medium text-[var(--text-primary)] focus:outline-hidden"
                    >
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.institution})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tabela de Mapeamento Canônico */}
              <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <div className="p-3 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                      Mapeamento de Cabeçalhos da Planilha
                    </span>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      Vincule as colunas do seu arquivo aos campos do sistema
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddColumnModal(true)}
                    className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    + Adicionar Coluna Extra da Planilha
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)]">
                        <th className="py-2.5 px-4 w-44">Campo no Sistema</th>
                        <th className="py-2.5 px-4 w-64">Coluna na Planilha Importada</th>
                        <th className="py-2.5 px-4">Regra de Tratamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {[
                        { key: 'tipo', label: 'Tipo / Operação', req: false, treatment: 'Receita vs. Despesa (crédito/débito, entrada/saída)' },
                        { key: 'titulo', label: 'Título / Referência', req: false, treatment: 'Identificador único ou gerado automaticamente' },
                        { key: 'fornecedor', label: 'Fornecedor / Cliente', req: true, treatment: 'Cruzamento com clientes/fornecedores cadastrados' },
                        { key: 'descricao', label: 'Descrição', req: false, treatment: 'Histórico descritivo do lançamento' },
                        { key: 'competencia', label: 'Competência', req: false, treatment: 'Formato AAAA-MM para relatórios mensais' },
                        { key: 'emissao', label: 'Data de Emissão', req: false, treatment: 'Data do documento contábil' },
                        { key: 'vencimento', label: 'Data de Vencimento', req: true, treatment: 'Data limite para pagamento ou recebimento' },
                        { key: 'dataPagamento', label: 'Data do Pagamento / Baixa', req: false, treatment: 'Data da quitação ou liquidação efetiva' },
                        { key: 'previsaoCaixa', label: 'Previsão de Caixa', req: false, treatment: 'Data de realização financeira projetada' },
                        { key: 'valorOriginal', label: 'Valor Original', req: true, treatment: 'Valor bruto contratado ou faturado' },
                        { key: 'principalBaixado', label: 'Principal Baixado', req: false, treatment: 'Valor já liquidado / pago / recebido' },
                        { key: 'saldoAtual', label: 'Saldo em Aberto', req: false, treatment: 'Valor restante calculado (Original - Baixado)' },
                        { key: 'situacao', label: 'Situação / Status', req: false, treatment: 'Aberto, Parcial, Liquidado ou Cancelado' },
                        { key: 'categoria', label: 'Categoria / DRE', req: false, treatment: 'Cruzamento com Plano de Contas' },
                        { key: 'centroCusto', label: 'Centro de Custo', req: false, treatment: 'Unidade de negócio ou centro de custos' },
                        { key: 'banco', label: 'Banco / Conta', req: false, treatment: 'Conta bancária de liquidação' }
                      ].map(field => {
                        const currentMappedCol = (mapping as any)[field.key] || '';
                        return (
                          <tr key={field.key} className="hover:bg-[var(--surface-elevated)]/40 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-[var(--text-primary)]">
                              <span className="flex items-center">
                                {field.label}
                                {field.req && <span className="text-rose-400 ml-1 font-bold">*</span>}
                              </span>
                            </td>

                            <td className="py-2.5 px-4">
                              <select
                                value={currentMappedCol}
                                onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                aria-label={`Mapeamento para ${field.label}`}
                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-hidden ${
                                  currentMappedCol
                                    ? 'bg-amber-500/10 border-amber-400/40 text-amber-300'
                                    : field.req
                                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                      : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                                }`}
                              >
                                <option value="">-- Não mapeado / Gerar automaticamente --</option>
                                {availableHeaders.map(h => (
                                  <option key={h} value={h}>
                                    Coluna: {h}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="py-2.5 px-4 text-[11px] text-[var(--text-secondary)]">
                              {field.treatment}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Colunas Extras Configuradas */}
              {extraColumns.length > 0 && (
                <div className="bg-[var(--surface-card)] p-3 rounded-xl border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center">
                      <Columns className="w-3.5 h-3.5 mr-1" />
                      Colunas Extras Ativas ({extraColumns.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddColumnModal(true)}
                      className="text-[11px] text-amber-400 hover:underline font-semibold"
                    >
                      + Adicionar Mais
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {extraColumns.map(col => (
                      <div key={col.id} className="px-2.5 py-1 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs flex items-center space-x-2">
                        <span className="font-bold text-[var(--text-primary)]">{col.label}:</span>
                        <span className="text-[var(--text-secondary)] font-mono">{col.sourceHeader}</span>
                        <button
                          type="button"
                          onClick={() => setExtraColumns(prev => prev.filter(c => c.id !== col.id))}
                          className="text-rose-400 hover:text-rose-300 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Card Informativo do Filtro Rigoroso de Direção e Sinal */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                fallbackDefaultType === 'RECEBER'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                <div className="p-2 rounded-lg bg-[var(--surface-elevated)] shrink-0">
                  {fallbackDefaultType === 'RECEBER' ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-rose-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-sm">
                      {fallbackDefaultType === 'RECEBER'
                        ? 'Filtro de Contas a Receber: Apenas Valores Positivos (Recebimentos)'
                        : 'Filtro de Contas a Pagar: Apenas Despesas & Saídas Financeiras'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Filtro Ativo
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {fallbackDefaultType === 'RECEBER'
                      ? 'Neste módulo, o sistema aceitará estritamente valores positivos e créditos de recebimento. Lançamentos com valores negativos ou classificados como despesas serão automaticamente descartados para evitar poluição da carteira.'
                      : 'Neste módulo, o sistema aceitará estritamente despesas e saídas a pagar. Valores com sinal negativo na planilha serão interpretados como valor devido a pagar. Créditos e recebimentos serão descartados.'}
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: CONFERÊNCIA DE CATEGORIAS, MEMÓRIA IA & APROVAÇÃO */}
          {/* ========================================================= */}
          {step === 3 && (
            <div className="space-y-4">
              
              {/* Banner de Conferência de Categorias & Memória IA */}
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[var(--surface-card)] to-amber-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        Conferência de Categorias & Memória de IA
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Aprendizado Contínuo Ativo
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Verifique e ajuste em qual categoria do Plano de Contas cada lançamento está sendo encaixado. As confirmações e correções feitas aqui são memorizadas para as próximas importações!
                    </p>
                  </div>
                </div>

                {/* Atribuição de Categoria em Lote */}
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0 bg-[var(--surface-elevated)] p-1.5 rounded-xl border border-[var(--border-subtle)]">
                  <select
                    value={batchCategoryId}
                    onChange={(e) => setBatchCategoryId(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-xs font-medium text-[var(--text-primary)] focus:outline-hidden max-w-[210px]"
                  >
                    <option value="">Aplicar categoria em lote...</option>
                    {chartAccounts.filter(a => a.isAnalytical).map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code ? `${acc.code} - ` : ''}{acc.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyBatchCategory}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    title="Aplica a categoria escolhida a todos os lançamentos marcados"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Aplicar Marcados</span>
                  </button>
                </div>
              </div>

              {/* Cards de Métricas Inteligentes e Diagnóstico */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] block uppercase font-bold">Total a Importar</span>
                    <span className="text-base font-black text-[var(--text-primary)]">{previewMetrics.toCreate + previewMetrics.toUpdate}</span>
                  </div>
                  <Layers className="w-5 h-5 text-amber-400/60" />
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-400 block uppercase font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-xs shadow-emerald-400" />
                      Memória de IA
                    </span>
                    <span className="text-base font-black text-emerald-400">
                      {previewMetrics.memoryCount} <span className="text-xs font-normal text-emerald-300/80">({previewMetrics.total > 0 ? Math.round((previewMetrics.memoryCount / previewMetrics.total) * 100) : 0}%)</span>
                    </span>
                  </div>
                  <Brain className="w-5 h-5 text-emerald-400/80" />
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] block uppercase font-bold">Revisão / Padrão</span>
                    <span className="text-base font-black text-amber-400">{previewMetrics.manualCategoryCount}</span>
                  </div>
                  <Edit3 className="w-5 h-5 text-amber-400/60" />
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] block uppercase font-bold">
                      {previewMetrics.filteredOutCount > 0 ? '🚫 Descartados por Sinal' : 'Valor Total'}
                    </span>
                    <span className="text-xs font-black text-[var(--text-primary)] font-mono block truncate">
                      {previewMetrics.filteredOutCount > 0 
                        ? `${previewMetrics.filteredOutCount} ignorados` 
                        : formatBRL(fallbackDefaultType === 'RECEBER' ? previewMetrics.totalReceivables : previewMetrics.totalPayables)}
                    </span>
                  </div>
                  <Filter className="w-5 h-5 text-slate-400" />
                </div>
              </div>

              {/* Barra de Resumo Mensal Dinâmico & Abas por Mês */}
              <ImportMonthlySummaryBar
                monthlySummaries={monthlySummaries}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                onApproveMonth={handleApproveMonth}
                onDeselectMonth={handleDeselectMonth}
                onSetMonthType={handleSetMonthType}
              />

              {/* Barra de Ações, Filtros e Ferramentas Cadastrais */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-[var(--surface-card)] p-3 rounded-xl border border-[var(--border-subtle)] text-xs">
                
                {/* Filtros Combinados (Status, Tipo e Memória de Categoria) */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Filtro por Tipo */}
                  <div className="flex items-center space-x-1 bg-[var(--surface-elevated)] p-1 rounded-lg border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setFilterType('TODOS')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        filterType === 'TODOS'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('RECEBER')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors ${
                        filterType === 'RECEBER'
                          ? 'bg-emerald-500 text-white font-bold shadow-xs'
                          : 'text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      <span>Receitas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('PAGAR')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors ${
                        filterType === 'PAGAR'
                          ? 'bg-rose-500 text-white font-bold shadow-xs'
                          : 'text-rose-400 hover:bg-rose-500/10'
                      }`}
                    >
                      <TrendingDown className="w-3 h-3" />
                      <span>Despesas</span>
                    </button>
                  </div>

                  {/* Filtro de Memória / Categoria */}
                  <div className="flex items-center space-x-1 bg-[var(--surface-elevated)] p-1 rounded-lg border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setFilterCategoryMode('TODOS')}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                        filterCategoryMode === 'TODOS'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Todas Categorias
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategoryMode('MEMORIA')}
                      className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors ${
                        filterCategoryMode === 'MEMORIA'
                          ? 'bg-emerald-500 text-white font-bold shadow-xs'
                          : 'text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title="Exibir apenas lançamentos pré-enquadrados pela inteligência do sistema"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                      <span>Memória IA ({previewMetrics.memoryCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterCategoryMode('MANUAL')}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                        filterCategoryMode === 'MANUAL'
                          ? 'bg-blue-500 text-white font-bold shadow-xs'
                          : 'text-blue-400 hover:bg-blue-500/10'
                      }`}
                    >
                      Padrão/Manual ({previewMetrics.manualCategoryCount})
                    </button>
                    {previewMetrics.filteredOutCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterCategoryMode('FILTRADOS_SINAL')}
                        className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors ${
                          filterCategoryMode === 'FILTRADOS_SINAL'
                            ? 'bg-rose-500 text-white font-bold shadow-xs'
                            : 'text-rose-400 hover:bg-rose-500/10'
                        }`}
                        title="Lançamentos descartados por sinal ou tipo incompatível com o módulo"
                      >
                        <span>🚫 Descartados ({previewMetrics.filteredOutCount})</span>
                      </button>
                    )}
                  </div>

                  {/* Filtro por Ação / Diff */}
                  <div className="flex items-center space-x-1 bg-[var(--surface-elevated)] p-1 rounded-lg border border-[var(--border-subtle)]">
                    {[
                      { id: 'TODOS', label: 'Todos' },
                      { id: 'CRIAR', label: 'Novos' },
                      { id: 'ATUALIZAR', label: 'Diff' },
                      { id: 'IGNORAR_IDENTICO', label: 'Idênticos' },
                      { id: 'ERRO', label: 'Erros' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilterAction(f.id)}
                        className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                          filterAction === f.id
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botões de Ação Rápida */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCrossReferenceModal(true)}
                    className="px-2.5 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-lg font-bold flex items-center transition-colors"
                    title="Cruzar clientes, fornecedores e categorias com os cadastros do app"
                  >
                    <GitMerge className="w-3.5 h-3.5 mr-1" />
                    Cruzar Dados com o App
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddColumnModal(true)}
                    className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-lg font-bold flex items-center transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    + Coluna Extra
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleAll(true)}
                    className="px-2.5 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] font-bold text-[var(--text-primary)] hover:bg-[var(--surface-card)] rounded-lg"
                  >
                    Marcar Visíveis
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleAll(false)}
                    className="px-2.5 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              {/* Tabela de Validação Canônica com Edição Inline */}
              <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[1100px]">
                  <thead className="sticky top-0 bg-[var(--surface-elevated)] z-10 border-b border-[var(--border-subtle)]">
                    <tr className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">Sel.</th>
                      <th className="py-2.5 px-2.5 w-20">Ação</th>
                      <th className="py-2.5 px-2.5 w-28 text-center">Tipo</th>
                      <th className="py-2.5 px-3">Título</th>
                      <th className="py-2.5 px-3">Contraparte</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-2 text-center w-20">Comp.</th>
                      <th className="py-2.5 px-2 text-center w-24">Vencimento</th>
                      <th className="py-2.5 px-3 text-right w-24">Original</th>
                      <th className="py-2.5 px-3 text-right w-24">Baixado</th>
                      <th className="py-2.5 px-3 text-right w-24">Saldo</th>
                      <th className="py-2.5 px-2.5 text-center w-24">Situação</th>
                      <th className="py-2.5 px-3 min-w-[240px]">Plano de Contas & Memória IA</th>
                      {extraColumns.map(col => (
                        <th key={col.id} className="py-2.5 px-3 text-[var(--text-secondary)]">
                          {col.label}
                        </th>
                      ))}
                      <th className="py-2.5 px-2.5 text-center w-20">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-[11px]">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={13 + extraColumns.length} className="py-8 text-center text-xs text-[var(--text-secondary)] font-sans">
                          Nenhum registro encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map(row => {
                        const isRevenue = row.normalized.tipo === 'RECEBER';

                        return (
                          <tr 
                            key={row.rowNumber} 
                            className={`hover:bg-[var(--surface-elevated)]/50 transition-colors ${
                              row.isTypeFilteredOut ? 'bg-rose-500/5 opacity-40' :
                              row.action === 'ERRO' ? 'bg-rose-500/5 opacity-70' :
                              row.action === 'IGNORAR_IDENTICO' ? 'opacity-50' : 
                              !row.isSelected ? 'opacity-40' : ''
                            }`}
                          >
                            {/* Checkbox de Seleção para Aprovação */}
                            <td className="py-2 px-3 text-center font-sans">
                              <input
                                type="checkbox"
                                checked={row.isSelected}
                                disabled={row.action === 'ERRO' || row.action === 'IGNORAR_IDENTICO' || row.isTypeFilteredOut}
                                onChange={() => toggleRow(row.rowNumber)}
                                aria-label={`Selecionar linha ${row.rowNumber}`}
                                className="rounded border-[var(--border-subtle)] text-amber-400 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>

                            {/* Badge de Ação */}
                            <td className="py-2 px-2.5 font-sans">
                              {row.action === 'CRIAR' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  Novo
                                </span>
                              )}
                              {row.action === 'ATUALIZAR' && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDiffRow(row)}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 flex items-center space-x-1"
                                >
                                  <span>Diff</span>
                                  <Eye className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {row.action === 'IGNORAR_IDENTICO' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30" title="Registro idêntico já cadastrado no banco">
                                  Idêntico
                                </span>
                              )}
                              {row.action === 'ERRO' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30" title={row.errors.join('; ')}>
                                  Erro
                                </span>
                              )}
                            </td>

                            {/* Seletor/Toggle Rápido de Tipo: Receita vs Despesa */}
                            <td className="py-2 px-2.5 text-center font-sans">
                              <button
                                type="button"
                                onClick={() => handleSetRowType(row.rowNumber, isRevenue ? 'PAGAR' : 'RECEBER')}
                                title="Clique para alternar entre Receita e Despesa"
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center justify-center space-x-1 mx-auto transition-all ${
                                  isRevenue
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                                }`}
                              >
                                {isRevenue ? (
                                  <>
                                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                                    <span>Receita</span>
                                  </>
                                ) : (
                                  <>
                                    <TrendingDown className="w-3 h-3 text-rose-400" />
                                    <span>Despesa</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Título */}
                            <td className="py-2 px-3 font-sans font-bold text-[var(--text-primary)] truncate max-w-[130px]">
                              {row.normalized.titulo}
                            </td>

                            {/* Contraparte */}
                            <td className="py-2 px-3 font-sans font-medium text-[var(--text-primary)] truncate max-w-[160px]">
                              <div>{row.normalized.fornecedor}</div>
                              {row.counterpartyResolution === 'NOVO_SOLICITADO' && (
                                <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                                  Novo ({isRevenue ? 'Cliente' : 'Fornecedor'})
                                </span>
                              )}
                              {row.counterpartyResolution === 'SUGESTAO' && (
                                <span className="text-[9px] text-blue-400 font-bold bg-blue-500/10 px-1 py-0.2 rounded border border-blue-500/20">
                                  Sugerido
                                </span>
                              )}
                            </td>

                            {/* Descrição */}
                            <td className="py-2 px-3 font-sans text-[var(--text-secondary)] truncate max-w-[180px]">
                              {row.normalized.descricao}
                            </td>

                            {/* Competência */}
                            <td className="py-2 px-2 text-center text-[var(--text-secondary)]">
                              {row.normalized.competencia}
                            </td>

                            {/* Vencimento */}
                            <td className="py-2 px-2 text-center font-bold text-[var(--text-primary)]">
                              {formatDateBR(row.normalized.vencimento)}
                            </td>

                            {/* Valor Original */}
                            <td className={`py-2 px-3 text-right font-bold ${isRevenue ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                              {formatBRL(row.normalized.valorOriginal)}
                            </td>

                            {/* Principal Baixado */}
                            <td className="py-2 px-3 text-right text-blue-400">
                              {row.normalized.principalBaixado > 0 ? formatBRL(row.normalized.principalBaixado) : '-'}
                            </td>

                            {/* Saldo Restante */}
                            <td className="py-2 px-3 text-right font-bold text-[var(--text-primary)]">
                              {formatBRL(row.normalized.saldoAtual)}
                            </td>

                            {/* Situação (Clique para alternar) */}
                            <td className="py-2 px-2.5 text-center font-sans">
                              <button
                                type="button"
                                onClick={() => handleToggleRowStatus(row.rowNumber)}
                                title="Clique para alternar entre LIQUIDADO (Pago) e ABERTO"
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all hover:scale-105 active:scale-95 border cursor-pointer ${
                                  row.normalized.situacao === 'LIQUIDADO' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30' :
                                  row.normalized.situacao === 'PARCIAL' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30' :
                                  row.normalized.situacao === 'ATRASADO' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30' :
                                  'bg-slate-500/20 text-slate-300 border-slate-500/40 hover:bg-slate-500/30'
                                }`}
                              >
                                {row.normalized.situacao}
                              </button>
                            </td>

                            {/* Plano de Contas & Memória IA */}
                            <td className="py-2 px-3 font-sans min-w-[240px]">
                              {row.isTypeFilteredOut ? (
                                <span 
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 block truncate"
                                  title={row.typeFilterReason}
                                >
                                  🚫 Descartado ({row.normalized.tipo === 'RECEBER' ? 'Receita' : 'Despesa'})
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {/* Circulozinho Indicador de Memória / IA */}
                                  {row.isFromMemory ? (
                                    <span 
                                      title={`🧠 Enquadrado pela Memória de IA do Sistema!\nMotivo: ${row.memoryReason || 'Padrão anterior similar'}\nConfiança: ${Math.round((row.memoryConfidence || 0.9) * 100)}%`}
                                      className="relative flex h-3.5 w-3.5 shrink-0 cursor-help"
                                    >
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-emerald-300 shadow-xs shadow-emerald-500/50 items-center justify-center text-[7px] text-slate-950 font-black">
                                        ✓
                                      </span>
                                    </span>
                                  ) : row.normalized.isManuallyEdited ? (
                                    <span 
                                      title="✏️ Categoria ajustada manualmente nesta sessão. Será gravada na memória de IA ao concluir a importação!"
                                      className="inline-flex rounded-full h-3 w-3 bg-blue-500 border border-blue-300 shrink-0 cursor-help"
                                    />
                                  ) : (
                                    <span 
                                      title="⚙️ Categoria padrão do plano de contas. Altere para enquadrar na categoria correta."
                                      className="inline-flex rounded-full h-2.5 w-2.5 bg-slate-500 border border-slate-400 shrink-0 cursor-help"
                                    />
                                  )}

                                  <select
                                    value={row.matchedChartAccountId || ''}
                                    onChange={(e) => handleChangeRowCategory(row.rowNumber, e.target.value)}
                                    aria-label={`Categoria da linha ${row.rowNumber}`}
                                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium border transition-colors focus:outline-hidden ${
                                      row.isFromMemory
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 focus:border-emerald-400'
                                        : row.normalized.isManuallyEdited
                                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 focus:border-blue-400'
                                          : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-amber-400'
                                    }`}
                                  >
                                    {chartAccounts.filter(a => a.isAnalytical).map(acc => (
                                      <option key={acc.id} value={acc.id}>
                                        {acc.code ? `${acc.code} - ` : ''}{acc.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </td>

                            {/* Colunas Extras */}
                            {extraColumns.map(col => (
                              <td key={col.id} className="py-2 px-3 text-[var(--text-secondary)] truncate max-w-[120px]">
                                {row.normalized.customFields?.[col.id] !== undefined 
                                  ? String(row.normalized.customFields[col.id]) 
                                  : '-'}
                              </td>
                            ))}

                            {/* Botão de Edição */}
                            <td className="py-2 px-2.5 text-center font-sans">
                              <button
                                type="button"
                                onClick={() => setEditingRow(row)}
                                className="p-1 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-amber-400 border border-amber-500/30 hover:border-amber-400 transition-colors"
                                title="Editar campos e valores desta linha antes da importação"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: RESULTS & SUCCESS SUMMARY */}
          {/* ========================================================= */}
          {step === 4 && importSummary && (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg animate-in zoom-in">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  Importação Aprovada e Concluída com Sucesso!
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
                  Os títulos foram integrados com controle de idempotência, separação de receitas/despesas e vínculos cadastrais.
                </p>
              </div>

              {/* Summary Card */}
              <div className="max-w-lg mx-auto bg-[var(--surface-elevated)] p-5 rounded-2xl border border-[var(--border-subtle)] text-left space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-emerald-400 font-semibold flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-1" />
                    Receitas Criadas ({importSummary.receivablesCount}):
                  </span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    {formatBRL(importSummary.totalReceivables)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-rose-400 font-semibold flex items-center">
                    <TrendingDown className="w-3.5 h-3.5 mr-1" />
                    Despesas Criadas ({importSummary.payablesCount}):
                  </span>
                  <span className="font-bold text-rose-400 font-mono text-sm">
                    {formatBRL(importSummary.totalPayables)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-secondary)] font-medium">Títulos Atualizados (Diff Confirmado):</span>
                  <span className="font-bold text-amber-400 font-mono text-sm">{importSummary.updatedCount}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-secondary)] font-medium">Títulos Ignorados (Idênticos / Idempotentes):</span>
                  <span className="font-bold text-blue-400 font-mono text-sm">{importSummary.ignoredCount}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-secondary)] font-medium">Baixas Financeiras Gravadas:</span>
                  <span className="font-bold text-amber-300 font-mono text-sm">{importSummary.settledCount}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)] font-medium">Novos Cadastros Criados no App:</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono text-sm">{importSummary.newPartiesCount}</span>
                </div>
              </div>

              {/* Card de Confirmação do Aprendizado de IA */}
              <div className="max-w-lg mx-auto p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-emerald-500/10 border border-emerald-500/30 text-left flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[var(--text-primary)]">
                      Motor de Inteligência e Aprendizado Atualizado
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Memória Salva
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Todas as categorias confirmadas ou corrigidas nesta importação foram memorizadas pelo sistema. Nas próximas importações de planilhas, lançamentos similares virão enquadrados automaticamente com o selo de memória!
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex justify-between items-center shrink-0">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancelar
              </button>
              <span className="text-xs text-[var(--text-secondary)]">
                Selecione uma planilha para prosseguir
              </span>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl text-xs font-bold flex items-center transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Voltar
              </button>

              <button
                type="button"
                onClick={handleProcessValidation}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-[#0f172a] rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] flex items-center"
              >
                Analisar Dados & Ver Resumos Mensais
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isImporting}
                className="px-4 py-2 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl text-xs font-bold flex items-center transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Ajustar Mapeamento
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || (previewMetrics.toCreate === 0 && previewMetrics.toUpdate === 0)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] flex items-center disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Gravando Transações...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Aprovar e Importar ({previewMetrics.toCreate + previewMetrics.toUpdate} Títulos Selecionados)
                  </>
                )}
              </button>
            </>
          )}

          {step === 4 && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (onSuccess) onSuccess();
                  if (onImportCompleted) onImportCompleted();
                  onClose();
                }}
                className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#0f172a] rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)]"
              >
                Concluir e Visualizar Títulos Financeiros
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Modal / Drawer de Comparação Antes vs Depois (Diff) */}
      {selectedDiffRow && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl max-w-xl w-full p-5 space-y-4 text-left text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center space-x-2">
                <GitCompare className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  Auditoria de Alteração: {selectedDiffRow.normalized.titulo}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDiffRow(null)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-[var(--text-secondary)]">
              Este registro já existe na base de dados. Veja os campos alterados pelo arquivo importado:
            </p>

            <div className="bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)] uppercase">
                    <th className="py-2 px-3">Campo</th>
                    <th className="py-2 px-3">Antes (No Banco)</th>
                    <th className="py-2 px-3">Depois (Na Planilha)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                  {selectedDiffRow.diffs.map(d => (
                    <tr key={d.field} className={d.hasChanged ? 'bg-amber-500/10' : ''}>
                      <td className="py-2 px-3 font-sans font-bold text-[var(--text-primary)]">
                        {d.label}
                      </td>
                      <td className="py-2 px-3 text-[var(--text-secondary)]">
                        {String(d.oldValue ?? '-')}
                      </td>
                      <td className={`py-2 px-3 ${d.hasChanged ? 'text-amber-400 font-bold' : 'text-[var(--text-primary)]'}`}>
                        {String(d.newValue ?? '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDiffRow(null)}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition-colors shadow-xs"
              >
                Fechar Auditoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Incluir Coluna Extra */}
      <ImportExtraColumnModal
        isOpen={showAddColumnModal}
        onClose={() => setShowAddColumnModal(false)}
        availableHeaders={availableHeaders}
        alreadyMappedHeaders={Object.values(mapping).filter(Boolean)}
        onAddColumn={handleAddExtraColumn}
      />

      {/* Modal para Edição de Linha Individual */}
      <ImportEditRowModal
        isOpen={!!editingRow}
        onClose={() => setEditingRow(null)}
        row={editingRow}
        counterparties={counterparties}
        chartAccounts={chartAccounts}
        bankAccounts={bankAccounts}
        extraColumns={extraColumns}
        onSaveRow={handleSaveRow}
      />

      {/* Modal de Cruzamento e Criação de Dados Cadastrais */}
      <ImportCrossReferenceModal
        isOpen={showCrossReferenceModal}
        onClose={() => setShowCrossReferenceModal(false)}
        analyzedRows={analyzedRows}
        counterparties={counterparties}
        chartAccounts={chartAccounts}
        onEntitiesCreated={handleRefreshEntities}
      />

    </div>
  );
};
