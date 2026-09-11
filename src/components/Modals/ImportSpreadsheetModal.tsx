import React, { useState, useMemo, useRef } from 'react';
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
  Layers, 
  Building2, 
  Calendar, 
  DollarSign, 
  X,
  FileText,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { storage } from '../../services/storageService';
import { formatBRL, formatDateBR } from '../../services/financialEngine';
import { 
  FinancialTitle, 
  TitleType, 
  Settlement, 
  FinancialMovement, 
  BankAccount, 
  ChartAccount,
  Counterparty
} from '../../types';

interface ImportSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: TitleType;
}

interface ColumnMapping {
  type: string; // 'coluna' ou 'fixo'
  description: string;
  counterparty: string;
  competence: string;
  dueDate: string;
  paymentDate: string;
  originalAmount: string;
  chartAccount: string;
  expectedBank: string;
  settledBank: string;
  documentNumber: string;
}

interface ParsedRow {
  index: number;
  raw: Record<string, any>;
  type: TitleType;
  description: string;
  counterpartyName: string;
  competence: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD
  paymentDate?: string; // YYYY-MM-DD (se já pago)
  originalAmount: number;
  chartAccountCodeOrName: string;
  expectedBankName: string;
  settledBankName: string;
  documentNumber: string;
  isValid: boolean;
  validationErrors: string[];
  isIncluded: boolean;
}

export const ImportSpreadsheetModal: React.FC<ImportSpreadsheetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultType
}) => {
  // Stepper: 1: Upload & Preset, 2: Mapping, 3: Validation & Preview, 4: Results
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // File and sheet state
  const [fileName, setFileName] = useState<string>('');
  const [rawSheetData, setRawSheetData] = useState<Record<string, any>[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<'CONTAJU' | 'CONTA_AZUL' | 'ASAAS' | 'OMIE' | 'CUSTOM'>('CONTAJU');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Database lookups
  const bankAccounts = useMemo(() => storage.getBankAccounts(), []);
  const chartAccounts = useMemo(() => storage.getChartAccounts(), []);
  const counterparties = useMemo(() => storage.getCounterparties(), []);
  const customers = useMemo(() => counterparties.filter(c => c.type === 'CLIENTE' || c.type === 'AMBOS'), [counterparties]);
  const suppliers = useMemo(() => counterparties.filter(c => c.type === 'FORNECEDOR' || c.type === 'AMBOS'), [counterparties]);
  const defaultBank = bankAccounts[0]?.id || '';
  const defaultRevenueAccount = chartAccounts.find(a => a.nature === 'RECEITA_SERVICO' && a.isAnalytical)?.id || chartAccounts[0]?.id || '';
  const defaultExpenseAccount = chartAccounts.find(a => a.nature === 'DESPESA_ADMINISTRATIVA' && a.isAnalytical)?.id || chartAccounts[0]?.id || '';

  // Default fallbacks if column is missing or empty
  const [defaultTitleType, setDefaultTitleType] = useState<TitleType | 'AUTO'>(defaultType || 'AUTO');
  const [fallbackBankAccountId, setFallbackBankAccountId] = useState<string>(defaultBank);
  const [fallbackChartAccountId, setFallbackChartAccountId] = useState<string>(defaultRevenueAccount);

  // Column Mappings (Spreadsheet Column Name -> System Field)
  const [mapping, setMapping] = useState<ColumnMapping>({
    type: '',
    description: '',
    counterparty: '',
    competence: '',
    dueDate: '',
    paymentDate: '',
    originalAmount: '',
    chartAccount: '',
    expectedBank: '',
    settledBank: '',
    documentNumber: ''
  });

  // Parsed and validated rows
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    totalImported: number;
    receivablesCount: number;
    payablesCount: number;
    settledCount: number;
    newCounterpartiesCount: number;
  } | null>(null);

  // -------------------------------------------------------------
  // Helper: Parse Dates and Currency from spreadsheet cells
  // -------------------------------------------------------------
  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    
    // Check if it's already a JS Date object
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Check if it's an Excel serial number (e.g. 45543)
    if (typeof val === 'number') {
      const utc_days = Math.floor(val - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      const y = date_info.getUTCFullYear();
      const m = String(date_info.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date_info.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const str = String(val).trim();
    // Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    // Format DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const parts = str.split('/');
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
    // Format MM/YYYY
    if (/^\d{1,2}\/\d{4}$/.test(str)) {
      const parts = str.split('/');
      const m = parts[0].padStart(2, '0');
      const y = parts[1];
      return `${y}-${m}-01`;
    }

    return '';
  };

  const parseCompetence = (val: any, fallbackDateStr?: string): string => {
    if (!val && fallbackDateStr) {
      return fallbackDateStr.substring(0, 7);
    }
    const parsed = parseExcelDate(val);
    if (parsed) {
      return parsed.substring(0, 7);
    }
    const str = String(val || '').trim();
    if (/^\d{4}-\d{2}$/.test(str)) return str;
    if (/^\d{1,2}\/\d{4}$/.test(str)) {
      const [m, y] = str.split('/');
      return `${y}-${m.padStart(2, '0')}`;
    }
    if (fallbackDateStr) {
      return fallbackDateStr.substring(0, 7);
    }
    return new Date().toISOString().substring(0, 7);
  };

  const parseNumber = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val)
      .replace(/[^\d,-]/g, '')
      .replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.abs(num);
  };

  // -------------------------------------------------------------
  // Template Generation & Download
  // -------------------------------------------------------------
  const handleDownloadTemplate = () => {
    const headers = [
      'Tipo (RECEBER ou PAGAR)',
      'Documento',
      'Cliente ou Fornecedor',
      'Descricao',
      'Competencia (AAAA-MM ou MM/AAAA)',
      'Data de Vencimento (DD/MM/AAAA)',
      'Data de Pagamento (DD/MM/AAAA)',
      'Valor Original (R$)',
      'Plano de Contas / Categoria',
      'Banco Previsto',
      'Banco Utilizado'
    ];

    const sampleRows = [
      [
        'RECEBER',
        'FAT-2026/001',
        'Alpha Tecnologia Ltda',
        'Honorários de Assessoria Contábil Mensal',
        '2026-09',
        '25/09/2026',
        '', // Em aberto
        '3500.00',
        '1.1.01 - Honorários de Consultoria',
        'Banco Itaú',
        ''
      ],
      [
        'RECEBER',
        'NF-1042',
        'Beta Logística e Transportes',
        'Serviços Avulsos de Auditoria Tributária',
        '2026-09',
        '15/09/2026',
        '15/09/2026', // Já pago/liquidado
        '2800.00',
        '1.1.01 - Honorários de Consultoria',
        'Banco Itaú',
        'Banco Itaú'
      ],
      [
        'PAGAR',
        'DOC-9921',
        'Google Cloud Brasil',
        'Hospedagem de Servidores e Infraestrutura',
        '2026-09',
        '20/09/2026',
        '20/09/2026', // Já liquidado
        '840.50',
        '4.2.02 - Sistemas e Softwares',
        'Bradesco Cartões',
        'Bradesco Cartões'
      ],
      [
        'PAGAR',
        'ALU-09/26',
        'Imobiliária Central SPE',
        'Aluguel do Escritório Central',
        '2026-09',
        '30/09/2026',
        '', // Em aberto
        '4200.00',
        '4.1.01 - Aluguel e Condomínio',
        'Banco Itaú',
        ''
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    // Set column widths
    ws['!cols'] = [
      { wch: 22 },
      { wch: 15 },
      { wch: 28 },
      { wch: 38 },
      { wch: 26 },
      { wch: 26 },
      { wch: 26 },
      { wch: 18 },
      { wch: 32 },
      { wch: 20 },
      { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Importacao');
    XLSX.writeFile(wb, 'Modelo_Importacao_Contas_Contaju.xlsx');
  };

  // -------------------------------------------------------------
  // Preset Mapping Applicator
  // -------------------------------------------------------------
  const applyPresetMapping = (headers: string[], preset: 'CONTAJU' | 'CONTA_AZUL' | 'ASAAS' | 'OMIE' | 'CUSTOM') => {
    setSelectedPreset(preset);

    const findHeader = (candidates: string[]) => {
      const match = headers.find(h => {
        const lower = h.toLowerCase().trim();
        return candidates.some(c => lower.includes(c.toLowerCase()));
      });
      return match || '';
    };

    if (preset === 'CONTAJU') {
      setMapping({
        type: findHeader(['tipo']),
        description: findHeader(['descricao', 'descrição', 'historico']),
        counterparty: findHeader(['cliente', 'fornecedor', 'contraparte']),
        competence: findHeader(['competencia', 'competência', 'periodo']),
        dueDate: findHeader(['vencimento', 'venc']),
        paymentDate: findHeader(['data de pagamento', 'pagamento', 'liquidacao', 'baixa']),
        originalAmount: findHeader(['valor original', 'valor']),
        chartAccount: findHeader(['plano de contas', 'categoria', 'conta contabil']),
        expectedBank: findHeader(['banco previsto', 'banco']),
        settledBank: findHeader(['banco utilizado', 'conta de liquidacao']),
        documentNumber: findHeader(['documento', 'numero', 'título'])
      });
    } else if (preset === 'CONTA_AZUL') {
      setMapping({
        type: findHeader(['tipo', 'natureza', 'operacao']),
        description: findHeader(['descricao', 'descrição', 'detalhes']),
        counterparty: findHeader(['cliente/fornecedor', 'contato', 'nome', 'cliente', 'fornecedor']),
        competence: findHeader(['competencia', 'competência', 'data competencia']),
        dueDate: findHeader(['data de vencimento', 'vencimento', 'data venc']),
        paymentDate: findHeader(['data de pagamento', 'data baixa', 'data pagamento']),
        originalAmount: findHeader(['valor', 'valor total', 'valor previsto']),
        chartAccount: findHeader(['categoria', 'centro de custo', 'classificacao']),
        expectedBank: findHeader(['conta bancaria', 'conta', 'banco']),
        settledBank: findHeader(['conta bancaria', 'conta']),
        documentNumber: findHeader(['numero do documento', 'documento', 'num'])
      });
    } else if (preset === 'ASAAS') {
      setMapping({
        type: findHeader(['tipo', 'operacao']),
        description: findHeader(['descricao', 'descrição', 'identificador']),
        counterparty: findHeader(['cliente', 'sacado', 'pagador']),
        competence: findHeader(['competencia', 'competência']),
        dueDate: findHeader(['vencimento', 'data vencimento']),
        paymentDate: findHeader(['data de pagamento', 'data credito', 'data da baixa']),
        originalAmount: findHeader(['valor', 'valor liquido', 'valor da cobranca']),
        chartAccount: findHeader(['categoria', 'classificacao']),
        expectedBank: findHeader(['conta bancaria', 'forma de recebimento']),
        settledBank: findHeader(['conta bancaria', 'banco']),
        documentNumber: findHeader(['identificador', 'numero', 'nosso numero'])
      });
    } else if (preset === 'OMIE') {
      setMapping({
        type: findHeader(['tipo', 'operacao']),
        description: findHeader(['historico', 'descricao', 'observacao']),
        counterparty: findHeader(['razao social', 'cliente / fornecedor', 'cliente', 'fornecedor']),
        competence: findHeader(['periodo', 'competencia', 'competência']),
        dueDate: findHeader(['dt. vencimento', 'vencimento', 'data de vencimento']),
        paymentDate: findHeader(['dt. liquidacao', 'data da liquidacao', 'pagamento']),
        originalAmount: findHeader(['valor liquido', 'valor documento', 'valor']),
        chartAccount: findHeader(['categoria', 'conta corrente / categoria']),
        expectedBank: findHeader(['conta corrente', 'banco']),
        settledBank: findHeader(['conta corrente', 'banco']),
        documentNumber: findHeader(['numero documento', 'documento', 'nf'])
      });
    } else {
      // Auto-detect based on fuzzy keywords
      setMapping({
        type: findHeader(['tipo', 'natureza']),
        description: findHeader(['descricao', 'descrição', 'historico', 'item']),
        counterparty: findHeader(['cliente', 'fornecedor', 'sacado', 'favorecido', 'nome']),
        competence: findHeader(['competencia', 'competência', 'mes']),
        dueDate: findHeader(['vencimento', 'due date', 'venc']),
        paymentDate: findHeader(['pagamento', 'liquidacao', 'data baixa', 'quitacao']),
        originalAmount: findHeader(['valor', 'total', 'amount', 'preco']),
        chartAccount: findHeader(['plano', 'categoria', 'conta', 'classificacao']),
        expectedBank: findHeader(['banco previsto', 'banco', 'conta']),
        settledBank: findHeader(['banco utilizado', 'banco baixa', 'banco']),
        documentNumber: findHeader(['documento', 'numero', 'nf', 'titulo'])
      });
    }
  };

  // -------------------------------------------------------------
  // File Upload Handler
  // -------------------------------------------------------------
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array
        const json: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { 
          defval: '',
          raw: false
        });

        if (json.length === 0) {
          alert('A planilha importada está vazia ou não possui linhas de dados.');
          return;
        }

        // Get headers from first row keys
        const headers = Object.keys(json[0]);
        setAvailableHeaders(headers);
        setRawSheetData(json);

        // Apply smart preset based on filename or auto-detect
        let autoPreset: 'CONTAJU' | 'CONTA_AZUL' | 'ASAAS' | 'OMIE' | 'CUSTOM' = 'CONTAJU';
        const lowerName = file.name.toLowerCase();
        if (lowerName.includes('azul')) autoPreset = 'CONTA_AZUL';
        else if (lowerName.includes('asaas')) autoPreset = 'ASAAS';
        else if (lowerName.includes('omie')) autoPreset = 'OMIE';

        applyPresetMapping(headers, autoPreset);
        setStep(2);
      } catch (err) {
        console.error('Erro ao ler planilha:', err);
        alert('Não foi possível ler o arquivo. Certifique-se de que é uma planilha válida (.xlsx, .xls ou .csv).');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // -------------------------------------------------------------
  // Step 2 -> 3: Process and Validate Mapped Rows
  // -------------------------------------------------------------
  const handleProcessValidation = () => {
    if (!mapping.dueDate && !mapping.originalAmount) {
      alert('Selecione pelo menos as colunas de "Data de Vencimento" e "Valor Original" para continuar.');
      return;
    }

    const processed: ParsedRow[] = rawSheetData.map((row, idx) => {
      const errors: string[] = [];

      // 1. Resolve Title Type
      let type: TitleType = 'RECEBER';
      if (defaultTitleType !== 'AUTO') {
        type = defaultTitleType;
      } else if (mapping.type && row[mapping.type]) {
        const rawType = String(row[mapping.type]).toUpperCase().trim();
        if (rawType.includes('PAGAR') || rawType.includes('DESPESA') || rawType.includes('SAÍDA') || rawType.includes('SAIDA') || rawType === 'D') {
          type = 'PAGAR';
        } else {
          type = 'RECEBER';
        }
      }

      // 2. Resolve Description
      const description = mapping.description && row[mapping.description] 
        ? String(row[mapping.description]).trim() 
        : `Lançamento importado #${idx + 1}`;

      // 3. Resolve Counterparty
      const counterpartyName = mapping.counterparty && row[mapping.counterparty]
        ? String(row[mapping.counterparty]).trim()
        : (type === 'RECEBER' ? 'Cliente Não Informado' : 'Fornecedor Não Informado');

      // 4. Resolve Dates
      const rawDueDate = mapping.dueDate ? row[mapping.dueDate] : '';
      const dueDate = parseExcelDate(rawDueDate);
      if (!dueDate) {
        errors.push('Data de vencimento inválida ou não informada');
      }

      const rawPaymentDate = mapping.paymentDate ? row[mapping.paymentDate] : '';
      const paymentDate = parseExcelDate(rawPaymentDate);

      const rawCompetence = mapping.competence ? row[mapping.competence] : '';
      const competence = parseCompetence(rawCompetence, dueDate || paymentDate);

      // 5. Resolve Original Amount
      const rawAmount = mapping.originalAmount ? row[mapping.originalAmount] : 0;
      const originalAmount = parseNumber(rawAmount);
      if (originalAmount <= 0) {
        errors.push('Valor original deve ser maior que zero');
      }

      // 6. Resolve Categories and Banks
      const chartAccountCodeOrName = mapping.chartAccount && row[mapping.chartAccount]
        ? String(row[mapping.chartAccount]).trim()
        : '';

      const expectedBankName = mapping.expectedBank && row[mapping.expectedBank]
        ? String(row[mapping.expectedBank]).trim()
        : '';

      const settledBankName = mapping.settledBank && row[mapping.settledBank]
        ? String(row[mapping.settledBank]).trim()
        : '';

      const documentNumber = mapping.documentNumber && row[mapping.documentNumber]
        ? String(row[mapping.documentNumber]).trim()
        : `IMP-${new Date().getFullYear()}-${String(idx + 1).padStart(4, '0')}`;

      const isValid = errors.length === 0;

      return {
        index: idx,
        raw: row,
        type,
        description,
        counterpartyName,
        competence,
        dueDate,
        paymentDate: paymentDate || undefined,
        originalAmount,
        chartAccountCodeOrName,
        expectedBankName,
        settledBankName,
        documentNumber,
        isValid,
        validationErrors: errors,
        isIncluded: isValid
      };
    });

    setParsedRows(processed);
    setStep(3);
  };

  // Toggle individual row inclusion
  const toggleRowInclusion = (index: number) => {
    setParsedRows(prev => prev.map(r => r.index === index ? { ...r, isIncluded: !r.isIncluded } : r));
  };

  const toggleAllRows = (included: boolean) => {
    setParsedRows(prev => prev.map(r => r.isValid ? { ...r, isIncluded: included } : r));
  };

  // -------------------------------------------------------------
  // Step 3 -> 4: Commit Import to Storage
  // -------------------------------------------------------------
  const handleExecuteImport = () => {
    const includedRows = parsedRows.filter(r => r.isIncluded && r.isValid);
    if (includedRows.length === 0) {
      alert('Nenhuma linha válida selecionada para importação.');
      return;
    }

    setIsImporting(true);

    try {
      const currentTitles = storage.getTitles();
      const currentCounterparties = storage.getCounterparties();
      const currentBankAccounts = storage.getBankAccounts();
      const currentChartAccounts = storage.getChartAccounts();
      const currentSettlements = storage.getSettlements();
      const currentMovements = storage.getMovements();
      const currentUser = storage.getCurrentUser();
      const nowIso = new Date().toISOString();

      let newCustomersAdded = 0;
      let newSuppliersAdded = 0;
      let receivablesCount = 0;
      let payablesCount = 0;
      let settledCount = 0;

      const newTitles: FinancialTitle[] = [];
      const newSettlements: Settlement[] = [];
      const newMovements: FinancialMovement[] = [];

      // Process each row
      for (const row of includedRows) {
        if (row.type === 'RECEBER') receivablesCount++;
        else payablesCount++;

        // 1. Match or Create Counterparty
        let counterpartyId = '';
        if (row.type === 'RECEBER') {
          const matched = currentCounterparties.find(c => 
            (c.type === 'CLIENTE' || c.type === 'AMBOS') &&
            c.name.toLowerCase().trim() === row.counterpartyName.toLowerCase().trim()
          );
          if (matched) {
            counterpartyId = matched.id;
          } else {
            // Auto-create customer
            const newCustId = `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const newCust: Counterparty = {
              id: newCustId,
              type: 'CLIENTE',
              name: row.counterpartyName,
              tradeName: row.counterpartyName,
              document: '00.000.000/0000-00',
              email: 'contato@cliente.com.br',
              phone: '(11) 99999-0000',
              address: 'Cadastrado via importação de planilha',
              status: 'ATIVO',
              notes: 'Cadastrado automaticamente na importação de planilha externa.',
              createdAt: nowIso
            };
            currentCounterparties.push(newCust);
            newCustomersAdded++;
            counterpartyId = newCustId;
          }
        } else {
          const matched = currentCounterparties.find(s => 
            (s.type === 'FORNECEDOR' || s.type === 'AMBOS') &&
            s.name.toLowerCase().trim() === row.counterpartyName.toLowerCase().trim()
          );
          if (matched) {
            counterpartyId = matched.id;
          } else {
            // Auto-create supplier
            const newSupId = `forn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const newSup: Counterparty = {
              id: newSupId,
              type: 'FORNECEDOR',
              name: row.counterpartyName,
              tradeName: row.counterpartyName,
              document: '00.000.000/0000-00',
              email: 'financeiro@fornecedor.com.br',
              phone: '(11) 99999-0000',
              address: 'Cadastrado via importação de planilha',
              status: 'ATIVO',
              notes: 'Cadastrado automaticamente na importação de planilha externa.',
              createdAt: nowIso
            };
            currentCounterparties.push(newSup);
            newSuppliersAdded++;
            counterpartyId = newSupId;
          }
        }

        // 2. Match Chart Account
        let accountId = fallbackChartAccountId;
        if (row.chartAccountCodeOrName) {
          const matchedAcc = currentChartAccounts.find(a => 
            a.code.toLowerCase() === row.chartAccountCodeOrName.toLowerCase() ||
            a.name.toLowerCase().includes(row.chartAccountCodeOrName.toLowerCase())
          );
          if (matchedAcc) {
            accountId = matchedAcc.id;
          }
        }

        // 3. Match Expected Bank Account
        let expectedBankId = fallbackBankAccountId;
        if (row.expectedBankName) {
          const matchedBank = currentBankAccounts.find(b => 
            b.name.toLowerCase().includes(row.expectedBankName.toLowerCase()) ||
            b.institution.toLowerCase().includes(row.expectedBankName.toLowerCase())
          );
          if (matchedBank) {
            expectedBankId = matchedBank.id;
          }
        }

        // 4. Match Settled Bank Account (if paid)
        let settledBankId = expectedBankId;
        if (row.settledBankName) {
          const matchedBank = currentBankAccounts.find(b => 
            b.name.toLowerCase().includes(row.settledBankName.toLowerCase()) ||
            b.institution.toLowerCase().includes(row.settledBankName.toLowerCase())
          );
          if (matchedBank) {
            settledBankId = matchedBank.id;
          }
        }

        const isSettled = !!row.paymentDate;
        const titleId = `tit-imp-${Date.now()}-${row.index}-${Math.floor(Math.random() * 1000)}`;

        const newTitle: FinancialTitle = {
          id: titleId,
          companyId: 'comp-1',
          type: row.type,
          titleNumber: row.documentNumber,
          counterpartyId,
          description: row.description,
          accountId,
          launchDate: nowIso.split('T')[0],
          competence: row.competence,
          issueDate: nowIso.split('T')[0],
          dueDate: row.dueDate,
          expectedCashDate: row.dueDate,
          originalAmount: row.originalAmount,
          settledPrincipal: isSettled ? row.originalAmount : 0,
          balancePrincipal: isSettled ? 0 : row.originalAmount,
          accruedInterest: 0,
          accruedFine: 0,
          documentState: 'CONFIRMADO',
          settlementState: isSettled ? 'LIQUIDADO' : 'ABERTO',
          originType: 'MANUAL',
          expectedBankAccountId: expectedBankId,
          notes: `Importado de planilha externa (${fileName}).`,
          createdAt: nowIso,
          updatedAt: nowIso
        };

        newTitles.push(newTitle);

        // 5. If title is already paid, record Settlement and Bank Movement
        if (isSettled && row.paymentDate) {
          settledCount++;
          const settlementId = `set-imp-${Date.now()}-${row.index}`;
          const settlement: Settlement = {
            id: settlementId,
            titleId: titleId,
            settlementNumber: `BX-IMP-${Math.floor(Math.random() * 90000 + 10000)}`,
            settlementDate: row.paymentDate,
            bankAccountId: settledBankId,
            components: {
              principalSettled: row.originalAmount,
              discount: 0,
              interest: 0,
              fine: 0,
              bankFee: 0,
              netFinancialAmount: row.originalAmount
            },
            notes: `Baixa automática realizada na importação da planilha (${fileName}).`,
            isReversed: false,
            createdAt: nowIso,
            createdBy: currentUser.name
          };
          newSettlements.push(settlement);

          // Bank Movement in Statement
          newMovements.push({
            id: `mov-imp-${Date.now()}-${row.index}`,
            bankAccountId: settledBankId,
            date: row.paymentDate,
            direction: row.type === 'RECEBER' ? 'ENTRADA' : 'SAIDA',
            amount: row.originalAmount,
            originType: 'BAIXA_TITULO',
            originReferenceId: settlementId,
            description: `Baixa importada ${row.documentNumber} - ${row.description}`,
            counterpartyId,
            accountId,
            cashFlowCategory: 'OPERACIONAL',
            createdAt: nowIso
          });
        }
      }

      // Persist to storage
      storage.saveCounterparties(currentCounterparties);
      storage.saveTitles([...newTitles, ...currentTitles]);
      if (newSettlements.length > 0) {
        storage.saveSettlements([...newSettlements, ...currentSettlements]);
      }
      if (newMovements.length > 0) {
        storage.saveMovements([...newMovements, ...currentMovements]);
      }

      // Audit Log Entry
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CRIACAO_TITULO',
        module: 'Importação de Planilha',
        recordId: `import-${Date.now()}`,
        details: `Importação em lote de ${newTitles.length} títulos da planilha "${fileName}". Foram criadas ${settledCount} baixas financeiras com movimentação bancária.`
      });

      setImportSummary({
        totalImported: newTitles.length,
        receivablesCount,
        payablesCount,
        settledCount,
        newCounterpartiesCount: newCustomersAdded + newSuppliersAdded
      });

      setStep(4);
    } catch (err) {
      console.error('Erro na importação:', err);
      alert('Ocorreu um erro ao importar os títulos. Verifique o formato dos dados.');
    } finally {
      setIsImporting(false);
    }
  };

  // -------------------------------------------------------------
  // Summary Metrics for Preview (Step 3)
  // -------------------------------------------------------------
  const previewMetrics = useMemo(() => {
    const included = parsedRows.filter(r => r.isIncluded && r.isValid);
    const totalCount = included.length;
    const recCount = included.filter(r => r.type === 'RECEBER').length;
    const payCount = included.filter(r => r.type === 'PAGAR').length;
    const recAmount = included.filter(r => r.type === 'RECEBER').reduce((a, b) => a + b.originalAmount, 0);
    const payAmount = included.filter(r => r.type === 'PAGAR').reduce((a, b) => a + b.originalAmount, 0);
    const settledCount = included.filter(r => !!r.paymentDate).length;
    const openCount = totalCount - settledCount;

    return {
      totalCount,
      recCount,
      payCount,
      recAmount,
      payAmount,
      settledCount,
      openCount
    };
  }, [parsedRows]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden text-[var(--text-primary)]">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                  Importação de Planilha Financeira
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Conta Azul, Asaas, Omie & Excel
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Migre títulos a pagar e receber de outros sistemas com mapeamento de colunas e baixa automática.
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
        <div className="px-5 py-3 bg-[var(--surface-card)] border-b border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 1 ? 'bg-cyan-400 text-[#071321]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
            }`}>
              1
            </span>
            <span className={step === 1 ? 'text-cyan-400 font-bold' : 'text-[var(--text-secondary)]'}>
              Arquivo & Preset
            </span>
          </div>

          <div className="h-0.5 flex-1 max-w-[60px] bg-[var(--border-subtle)] mx-2" />

          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 2 ? 'bg-cyan-400 text-[#071321]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
            }`}>
              2
            </span>
            <span className={step === 2 ? 'text-cyan-400 font-bold' : 'text-[var(--text-secondary)]'}>
              Mapeamento de Campos
            </span>
          </div>

          <div className="h-0.5 flex-1 max-w-[60px] bg-[var(--border-subtle)] mx-2" />

          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= 3 ? 'bg-cyan-400 text-[#071321]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
            }`}>
              3
            </span>
            <span className={step === 3 ? 'text-cyan-400 font-bold' : 'text-[var(--text-secondary)]'}>
              Validação & Prévia
            </span>
          </div>

          <div className="h-0.5 flex-1 max-w-[60px] bg-[var(--border-subtle)] mx-2" />

          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 4 ? 'bg-emerald-400 text-[#071321]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
            }`}>
              4
            </span>
            <span className={step === 4 ? 'text-emerald-400 font-bold' : 'text-[var(--text-secondary)]'}>
              Conclusão
            </span>
          </div>
        </div>

        {/* Modal Body Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* ========================================================= */}
          {/* STEP 1: UPLOAD & PRESET SELECTION */}
          {/* ========================================================= */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Presets Grid */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center">
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                  Origem dos Dados / Modelo do Sistema Anterior:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { id: 'CONTAJU', name: 'Modelo Contaju', desc: 'Template oficial completo' },
                    { id: 'CONTA_AZUL', name: 'Conta Azul', desc: 'Extrato Contas Pagar/Receber' },
                    { id: 'ASAAS', name: 'Asaas', desc: 'Cobranças e Pagamentos' },
                    { id: 'OMIE', name: 'Omie', desc: 'Relatório Contas Financeiro' },
                    { id: 'CUSTOM', name: 'Personalizado', desc: 'Mapeamento livre de colunas' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPreset(p.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedPreset === p.id
                          ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-xs'
                          : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-cyan-500/40'
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
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  isDragOver
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-cyan-500/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>

                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Arraste sua planilha aqui ou clique para selecionar
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
                  Formatos suportados: <strong>.xlsx</strong> (Excel), <strong>.xls</strong> e <strong>.csv</strong> (Google Sheets / Exportações).
                </p>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-5 py-2 bg-cyan-400 hover:bg-cyan-300 text-[#071321] rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(99,217,255,0.25)]"
                >
                  Selecionar Arquivo do Computador
                </button>
              </div>

              {/* Template Download Banner */}
              <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">
                      Ainda não tem a planilha no formato ideal?
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Baixe o modelo oficial com todas as colunas e exemplos práticos para Contas a Pagar e Receber.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Baixar Planilha Modelo (.xlsx)
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: COLUMN MAPPING */}
          {/* ========================================================= */}
          {step === 2 && (
            <div className="space-y-6">
              {/* File Info Bar */}
              <div className="bg-[var(--surface-elevated)] p-3.5 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">{fileName}</span>
                  <span className="text-xs text-[var(--text-secondary)]">({rawSheetData.length} linhas encontradas)</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-[var(--text-secondary)]">Preset:</span>
                  <select
                    value={selectedPreset}
                    onChange={(e) => applyPresetMapping(availableHeaders, e.target.value as any)}
                    aria-label="Preset de mapeamento"
                    className="px-2.5 py-1 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs font-bold text-cyan-400 focus:outline-hidden"
                  >
                    <option value="CONTAJU">Modelo Contaju</option>
                    <option value="CONTA_AZUL">Conta Azul</option>
                    <option value="ASAAS">Asaas</option>
                    <option value="OMIE">Omie</option>
                    <option value="CUSTOM">Personalizado</option>
                  </select>
                </div>
              </div>

              {/* Global Defaults when column is missing or empty */}
              <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-3">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center">
                  <Settings2 className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                  Regras Gerais & Valores Padrão (para campos não informados na linha):
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Tipo de Lançamento:
                    </label>
                    <select
                      value={defaultTitleType}
                      onChange={e => setDefaultTitleType(e.target.value as any)}
                      aria-label="Tipo padrão de lançamento"
                      className="w-full px-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg text-xs font-bold text-[var(--text-primary)] focus:border-cyan-400 focus:outline-hidden"
                    >
                      <option value="AUTO">Detectar pela coluna mapeada</option>
                      <option value="RECEBER">Forçar Contas a Receber (Todos)</option>
                      <option value="PAGAR">Forçar Contas a Pagar (Todos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Plano de Contas Padrão:
                    </label>
                    <select
                      value={fallbackChartAccountId}
                      onChange={e => setFallbackChartAccountId(e.target.value)}
                      aria-label="Plano de contas padrão"
                      className="w-full px-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg text-xs font-bold text-[var(--text-primary)] focus:border-cyan-400 focus:outline-hidden"
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
                      Banco Previsto / Baixa Padrão:
                    </label>
                    <select
                      value={fallbackBankAccountId}
                      onChange={e => setFallbackBankAccountId(e.target.value)}
                      aria-label="Conta bancária padrão"
                      className="w-full px-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg text-xs font-bold text-[var(--text-primary)] focus:border-cyan-400 focus:outline-hidden"
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

              {/* Column Mapping Table */}
              <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <div className="p-3 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Mapeamento das Colunas da Planilha Importada
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Associe as colunas encontradas aos campos do Contaju
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--surface-card)]">
                        <th className="py-2.5 px-4 w-60">Campo no Contaju</th>
                        <th className="py-2.5 px-4 w-72">Coluna Correspondente na Planilha</th>
                        <th className="py-2.5 px-4">Exemplo da 1ª Linha Detectada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {[
                        { 
                          key: 'type', 
                          label: 'Tipo (Receber / Pagar)', 
                          req: false,
                          desc: 'Identifica se é receita ou despesa' 
                        },
                        { 
                          key: 'dueDate', 
                          label: 'Data de Vencimento', 
                          req: true,
                          desc: 'Data limite para liquidação' 
                        },
                        { 
                          key: 'originalAmount', 
                          label: 'Valor Original (R$)', 
                          req: true,
                          desc: 'Valor monetário do título' 
                        },
                        { 
                          key: 'counterparty', 
                          label: 'Cliente / Fornecedor', 
                          req: true,
                          desc: 'Nome da contraparte' 
                        },
                        { 
                          key: 'description', 
                          label: 'Descrição do Lançamento', 
                          req: true,
                          desc: 'Histórico do documento' 
                        },
                        { 
                          key: 'competence', 
                          label: 'Competência (Mês Gerador)', 
                          req: false,
                          desc: 'Mês econômico (ex: 2026-09)' 
                        },
                        { 
                          key: 'paymentDate', 
                          label: 'Data de Pagamento (se quitado)', 
                          req: false,
                          desc: 'Se preenchida, gera baixa automática no banco' 
                        },
                        { 
                          key: 'chartAccount', 
                          label: 'Plano de Contas / Categoria', 
                          req: false,
                          desc: 'Classificação contábil' 
                        },
                        { 
                          key: 'expectedBank', 
                          label: 'Banco Previsto', 
                          req: false,
                          desc: 'Conta para conciliação prevista' 
                        },
                        { 
                          key: 'settledBank', 
                          label: 'Banco Utilizado (Baixa)', 
                          req: false,
                          desc: 'Conta onde o dinheiro foi movimentado' 
                        },
                        { 
                          key: 'documentNumber', 
                          label: 'Número do Documento', 
                          req: false,
                          desc: 'NF, Boleto ou Recibo' 
                        }
                      ].map(field => {
                        const currentMappedCol = (mapping as any)[field.key] || '';
                        const sampleVal = currentMappedCol && rawSheetData[0] ? rawSheetData[0][currentMappedCol] : '';

                        return (
                          <tr key={field.key} className="hover:bg-[var(--surface-elevated)]/40 transition-colors">
                            <td className="py-2 px-4">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-[var(--text-primary)]">{field.label}</span>
                                {field.req && (
                                  <span className="text-[10px] text-rose-400 font-bold">*Obrigatório</span>
                                )}
                              </div>
                              <p className="text-[10px] text-[var(--text-secondary)]">{field.desc}</p>
                            </td>

                            <td className="py-2 px-4">
                              <select
                                value={currentMappedCol}
                                onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                aria-label={`Mapeamento para ${field.label}`}
                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-hidden ${
                                  currentMappedCol
                                    ? 'bg-cyan-500/10 border-cyan-400/40 text-cyan-300'
                                    : field.req
                                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                      : 'bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                                }`}
                              >
                                <option value="">-- Não mapeado (Ignorar / Usar padrão) --</option>
                                {availableHeaders.map(h => (
                                  <option key={h} value={h}>
                                    Coluna: {h}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="py-2 px-4 font-mono text-[11px] text-[var(--text-secondary)]">
                              {sampleVal !== undefined && sampleVal !== '' ? (
                                <span className="text-[var(--text-primary)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded border border-[var(--border-subtle)] truncate max-w-xs inline-block">
                                  {String(sampleVal)}
                                </span>
                              ) : (
                                <span className="italic text-[var(--text-secondary)]/50">Sem valor na 1ª linha</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: VALIDATION & PREVIEW GRID */}
          {/* ========================================================= */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary Metrics Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[var(--surface-card)] p-3 rounded-xl border border-[var(--border-subtle)]">
                  <span className="text-[11px] text-[var(--text-secondary)] block">Total Selecionado</span>
                  <span className="text-xl font-bold text-cyan-400 font-mono">{previewMetrics.totalCount} títulos</span>
                </div>

                <div className="bg-[var(--surface-card)] p-3 rounded-xl border border-[var(--border-subtle)]">
                  <span className="text-[11px] text-emerald-400 block font-semibold flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-1" /> A Receber
                  </span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {formatBRL(previewMetrics.recAmount)}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)] block">{previewMetrics.recCount} títulos</span>
                </div>

                <div className="bg-[var(--surface-card)] p-3 rounded-xl border border-[var(--border-subtle)]">
                  <span className="text-[11px] text-rose-400 block font-semibold flex items-center">
                    <TrendingDown className="w-3.5 h-3.5 mr-1" /> A Pagar
                  </span>
                  <span className="text-lg font-bold text-rose-400 font-mono">
                    {formatBRL(previewMetrics.payAmount)}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)] block">{previewMetrics.payCount} títulos</span>
                </div>

                <div className="bg-[var(--surface-card)] p-3 rounded-xl border border-[var(--border-subtle)]">
                  <span className="text-[11px] text-cyan-300 block font-semibold flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Baixas Imediatas
                  </span>
                  <span className="text-lg font-bold text-cyan-300 font-mono">{previewMetrics.settledCount} pagos</span>
                  <span className="text-[10px] text-[var(--text-secondary)] block">{previewMetrics.openCount} em aberto</span>
                </div>
              </div>

              {/* Table Action Bar */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => toggleAllRows(true)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] font-bold text-[var(--text-primary)] hover:bg-[var(--surface-card)]"
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllRows(false)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Desmarcar Todos
                  </button>
                </div>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Verifique os dados antes de gravar. Linhas com data de pagamento serão baixadas automaticamente no banco.
                </span>
              </div>

              {/* Preview Table */}
              <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[950px]">
                  <thead className="sticky top-0 bg-[var(--surface-elevated)] z-10 border-b border-[var(--border-subtle)]">
                    <tr className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">Sel.</th>
                      <th className="py-2.5 px-2.5 w-24">Tipo</th>
                      <th className="py-2.5 px-3">Contraparte</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-2.5 text-center w-24">Competência</th>
                      <th className="py-2.5 px-2.5 text-center w-24">Vencimento</th>
                      <th className="py-2.5 px-2.5 text-center w-24">Pagamento</th>
                      <th className="py-2.5 px-3 text-right w-28">Valor (R$)</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-[11px]">
                    {parsedRows.map(row => (
                      <tr 
                        key={row.index} 
                        className={`hover:bg-[var(--surface-elevated)]/50 transition-colors ${
                          !row.isValid ? 'bg-rose-500/5 opacity-70' : !row.isIncluded ? 'opacity-40' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-sans">
                          <input
                            type="checkbox"
                            checked={row.isIncluded}
                            disabled={!row.isValid}
                            onChange={() => toggleRowInclusion(row.index)}
                            aria-label={`Incluir linha ${row.index + 1}`}
                            className="rounded border-[var(--border-subtle)] text-cyan-400 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        <td className="py-2 px-2.5 font-sans">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.type === 'RECEBER'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {row.type}
                          </span>
                        </td>

                        <td className="py-2 px-3 font-sans font-medium text-[var(--text-primary)] truncate max-w-[160px]">
                          {row.counterpartyName}
                        </td>

                        <td className="py-2 px-3 font-sans text-[var(--text-secondary)] truncate max-w-[180px]">
                          {row.description}
                        </td>

                        <td className="py-2 px-2.5 text-center text-[var(--text-primary)]">
                          {row.competence}
                        </td>

                        <td className="py-2 px-2.5 text-center text-[var(--text-primary)]">
                          {formatDateBR(row.dueDate)}
                        </td>

                        <td className="py-2 px-2.5 text-center font-sans">
                          {row.paymentDate ? (
                            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-full border border-cyan-500/30 font-mono">
                              {formatDateBR(row.paymentDate)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-secondary)]">Em Aberto</span>
                          )}
                        </td>

                        <td className="py-2 px-3 text-right font-bold text-[var(--text-primary)]">
                          {formatBRL(row.originalAmount)}
                        </td>

                        <td className="py-2 px-3 font-sans">
                          {row.isValid ? (
                            <span className="text-emerald-400 text-[10px] font-bold flex items-center">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Válido
                            </span>
                          ) : (
                            <span className="text-rose-400 text-[10px] font-bold flex items-center" title={row.validationErrors.join(', ')}>
                              <XCircle className="w-3 h-3 mr-1" /> {row.validationErrors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
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
                  Importação Concluída com Sucesso!
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
                  Os lançamentos foram processados, validados e integrados à base de dados do Contaju.
                </p>
              </div>

              {/* Summary Card */}
              <div className="max-w-lg mx-auto bg-[var(--surface-elevated)] p-5 rounded-2xl border border-[var(--border-subtle)] text-left space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-secondary)] font-medium">Total de Títulos Importados:</span>
                  <span className="font-bold text-cyan-400 font-mono text-sm">{importSummary.totalImported}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-secondary)] font-medium">Contas a Receber:</span>
                  <span className="font-bold text-emerald-400 font-mono">{importSummary.receivablesCount}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-secondary)] font-medium">Contas a Pagar:</span>
                  <span className="font-bold text-rose-400 font-mono">{importSummary.payablesCount}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-secondary)] font-medium">Baixas Automáticas no Banco (Liquidados):</span>
                  <span className="font-bold text-cyan-300 font-mono">{importSummary.settledCount}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)] font-medium">Novos Clientes/Fornecedores Cadastrados:</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono">{importSummary.newCounterpartiesCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex justify-between items-center">
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
                className="px-5 py-2 bg-cyan-400 hover:bg-cyan-300 text-[#071321] rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(99,217,255,0.25)] flex items-center"
              >
                Validar e Pré-Visualizar Dados
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
                disabled={isImporting || previewMetrics.totalCount === 0}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] flex items-center disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Processando Importação...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Confirmar e Importar {previewMetrics.totalCount} Títulos
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
                  onSuccess();
                  onClose();
                }}
                className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-[#071321] rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(99,217,255,0.25)]"
              >
                Concluir e Visualizar Títulos
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
