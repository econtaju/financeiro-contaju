/**
 * Engine de Mapeamento, Idempotência e Cruzamento Cadastral:
 * Conta Azul / Planilhas Anuais -> Planilha-Base Unificada (Pagar & Receber)
 * 
 * Capacidades Principais:
 * 1. Separação Automática de Receita ('RECEBER') e Despesa ('PAGAR') por coluna, sinal ou palavras-chave.
 * 2. Agrupamento e Resumos Mensais para importações anuais/plurimensais.
 * 3. Mapeamento de Colunas Extras personalizadas da planilha (metadados customizados).
 * 4. Cruzamento com dados cadastrais atuais do sistema (Clientes, Fornecedores, Plano de Contas e Bancos).
 * 5. Edição Inline e Validação antes da aprovação explícita.
 */

import { FinancialTitle, Counterparty, ChartAccount, BankAccount, TitleType } from '../types';
import { categoryLearningService } from './categoryLearningService';

export interface ExtraColumnDefinition {
  id: string;
  sourceHeader: string;
  label: string;
  type?: 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY';
}

export interface BaseSpreadsheetRow {
  titulo: string;
  tipo: TitleType; // 'PAGAR' | 'RECEBER'
  fornecedor: string; // Contraparte (Fornecedor para pagar ou Cliente para receber)
  descricao: string;
  competencia: string; // AAAA-MM
  emissao: string; // AAAA-MM-DD
  vencimento: string; // AAAA-MM-DD
  dataPagamento?: string; // AAAA-MM-DD (Data de pagamento/baixa/recebimento)
  previsaoCaixa: string; // AAAA-MM-DD
  valorOriginal: number;
  principalBaixado: number;
  saldoAtual: number;
  situacao: 'ABERTO' | 'PARCIAL' | 'LIQUIDADO' | 'ATRASADO' | 'CANCELADO';
  categoria?: string;
  banco?: string;
  centroCusto?: string;
  customFields?: Record<string, any>;
  isManuallyEdited?: boolean;
}

export type ImportDiffAction = 'CRIAR' | 'ATUALIZAR' | 'IGNORAR_IDENTICO' | 'ERRO';
export type TypeDetectionMode = 'AUTO' | 'SIGNAL_BASED' | 'FORCE_PAYABLE' | 'FORCE_RECEIVABLE' | 'MAPPED_COLUMN';

export interface RowDiffField {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
  hasChanged: boolean;
}

export interface AnalyzedImportRow {
  rowNumber: number;
  raw: Record<string, any>;
  normalized: BaseSpreadsheetRow;
  fingerprint: string;
  externalId: string;
  action: ImportDiffAction;
  existingTitle?: FinancialTitle;
  diffs: RowDiffField[];
  errors: string[];
  warnings: string[];
  // Resolução de Contraparte (Cliente ou Fornecedor)
  matchedCounterpartyId?: string;
  suggestedCounterpartyId?: string;
  counterpartyResolution: 'MATCH_EXATO' | 'SUGESTAO' | 'NOVO_SOLICITADO' | 'MANUAL';
  // Resolução de Categoria / Plano de Contas
  matchedChartAccountId?: string;
  suggestedChartAccountId?: string;
  matchedChartAccountName?: string;
  categoryResolution?: 'MATCH_PLANO' | 'CRIAR_NOVO_PLANO' | 'USAR_PADRAO';
  // Inteligência de Memória & Aprendizado de Categorização
  isFromMemory?: boolean;
  memoryConfidence?: number;
  memoryReason?: string;
  // Filtro Estrito de Sinal / Direção
  originalSign?: number; // 1 para positivo, -1 para negativo
  isTypeFilteredOut?: boolean;
  typeFilterReason?: string;
  // Controle de aprovação/seleção na UI
  isSelected: boolean;
}

export interface MonthSummary {
  monthKey: string; // '2026-01' ou 'OUTROS'
  label: string; // 'Janeiro/2026'
  year: number;
  month: number;
  totalTitles: number;
  receivablesCount: number;
  payablesCount: number;
  totalReceivables: number;
  totalPayables: number;
  netBalance: number; // totalReceivables - totalPayables
  totalSettled: number;
  totalOpen: number;
  errorCount: number;
  selectedCount: number;
}

// Normaliza texto para comparações seguras
export function normalizeText(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

// Converte datas em diversos formatos para AAAA-MM-DD
export function normalizeToISODate(val: any, fallbackDate?: string): string {
  if (!val && val !== 0) return fallbackDate || '';

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return fallbackDate || '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof val === 'number') {
    // Número serial Excel
    const utcDays = Math.floor(val - 25569);
    const dateInfo = new Date(utcDays * 86400 * 1000);
    if (isNaN(dateInfo.getTime())) return fallbackDate || '';
    const y = dateInfo.getUTCFullYear();
    const m = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateInfo.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();
  if (!str) return fallbackDate || '';

  // Número serial Excel vindo como string numérica (ex: "46054")
  if (/^\d{5}$/.test(str)) {
    const num = Number(str);
    const utcDays = Math.floor(num - 25569);
    const dateInfo = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dateInfo.getTime())) {
      const y = dateInfo.getUTCFullYear();
      const m = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dateInfo.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Isola a parte da data caso contenha hora (ex: "15/01/2026 00:00:00" ou "2026-01-15T03:00:00.000Z")
  const datePart = str.split(' ')[0].split('T')[0];

  // AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }
  // DD/MM/AAAA
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(datePart)) {
    const [d, m, y] = datePart.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // DD-MM-AAAA
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(datePart)) {
    const [d, m, y] = datePart.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Fallback com Date.parse para outros formatos ISO válidos
  const parsedTimestamp = Date.parse(str);
  if (!isNaN(parsedTimestamp)) {
    const d = new Date(parsedTimestamp);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return fallbackDate || '';
}

// Mapeamento de meses em português para conversão de competência
const PT_MONTHS_MAP: Record<string, string> = {
  jan: '01', janeiro: '01',
  fev: '02', fevereiro: '02',
  mar: '03', marco: '03', março: '03',
  abr: '04', abril: '04',
  mai: '05', maio: '05',
  jun: '06', junho: '06',
  jul: '07', julho: '07',
  ago: '08', agosto: '08',
  set: '09', setembro: '09',
  out: '10', outubro: '10',
  nov: '11', novembro: '11',
  dez: '12', dezembro: '12'
};

// Converte competência para AAAA-MM com suporte abrangente a formatos brasileiros e Excel
export function normalizeToCompetence(val: any, fallbackDate?: string): string {
  if (val !== undefined && val !== null) {
    if (val instanceof Date) {
      if (!isNaN(val.getTime())) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      }
    }

    if (typeof val === 'number') {
      const iso = normalizeToISODate(val);
      if (iso && iso.length >= 7) return iso.substring(0, 7);
    }

    const str = String(val).trim();
    if (str) {
      // AAAA-MM
      if (/^\d{4}-\d{2}$/.test(str)) return str;

      // MM/AAAA ou M/AAAA
      if (/^\d{1,2}\/\d{4}$/.test(str)) {
        const [m, y] = str.split('/');
        return `${y}-${m.padStart(2, '0')}`;
      }

      // MM-AAAA ou M-AAAA
      if (/^\d{1,2}-\d{4}$/.test(str)) {
        const [m, y] = str.split('-');
        return `${y}-${m.padStart(2, '0')}`;
      }

      // AAAA/MM ou AAAA.MM
      if (/^\d{4}[\/\.]\d{1,2}$/.test(str)) {
        const parts = str.split(/[\/\.]/);
        return `${parts[0]}-${parts[1].padStart(2, '0')}`;
      }

      // MM/AA (ex: 02/26 -> 2026-02)
      if (/^\d{1,2}\/\d{2}$/.test(str)) {
        const [m, y] = str.split('/');
        const fullYear = Number(y) < 50 ? `20${y}` : `19${y}`;
        return `${fullYear}-${m.padStart(2, '0')}`;
      }

      // Suporte a texto em português: "fev/2026", "fevereiro/2026", "fev/26", "fev 2026", "fevereiro 2026", etc.
      const lower = normalizeText(str);
      for (const [monthKey, monthNum] of Object.entries(PT_MONTHS_MAP)) {
        if (lower.includes(monthKey)) {
          const matchYear = lower.match(/\b(20\d{2}|19\d{2})\b/);
          if (matchYear) {
            return `${matchYear[1]}-${monthNum}`;
          }
          const matchShortYear = lower.match(/[\/\-\s](\d{2})\b/);
          if (matchShortYear) {
            const y = Number(matchShortYear[1]);
            const fullYear = y < 50 ? `20${y}` : `19${y}`;
            return `${fullYear}-${monthNum}`;
          }
          // Se só tem o nome do mês sem ano, utiliza o ano do vencimento/fallback ou do ano atual
          const refYear = fallbackDate && fallbackDate.length >= 4 ? fallbackDate.substring(0, 4) : new Date().getFullYear().toString();
          return `${refYear}-${monthNum}`;
        }
      }

      // Número serial Excel como string (ex: "46054")
      if (/^\d{5}$/.test(str)) {
        const iso = normalizeToISODate(Number(str));
        if (iso && iso.length >= 7) return iso.substring(0, 7);
      }

      // Data completa (ex: DD/MM/AAAA ou AAAA-MM-DD)
      const iso = normalizeToISODate(val);
      if (iso && iso.length >= 7) {
        return iso.substring(0, 7);
      }
    }
  }

  // Fallback contábil canônico: utiliza a data de vencimento informada
  if (fallbackDate && fallbackDate.length >= 7) {
    return fallbackDate.substring(0, 7);
  }

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Converte valores para número com 2 casas decimais (magnitude absoluta) com suporte a BRL e US
export function normalizeCurrency(val: any): number {
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : Math.round(Math.abs(val) * 100) / 100;
  }
  if (!val) return 0;
  let str = String(val).trim();
  // Remove símbolos de moeda e espaços
  str = str.replace(/[R$\s]/gi, '');
  if (!str) return 0;

  // Suporte a formatos mistos com vírgula e ponto
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // 1.250,50 -> Formato Brasileiro
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,250.50 -> Formato US
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // 1250,50 -> Vírgula como separador decimal
    str = str.replace(',', '.');
  }

  // Remove caracteres estranhos exceto dígitos, menos e ponto
  str = str.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : Math.round(Math.abs(parsed) * 100) / 100;
}

// Verifica se um valor bruto possui sinal negativo explícito
export function isNegativeRawValue(val: any): boolean {
  if (typeof val === 'number') return val < 0;
  if (!val) return false;
  const str = String(val).trim();
  return str.startsWith('-') || str.includes('(') || str.endsWith('-') || /-\s*\d/.test(str);
}

// Detecta se a linha representa Receita ('RECEBER') ou Despesa ('PAGAR')
export function detectTitleType(
  rawTypeValue: any,
  rawAmount: any,
  categoryValue: any,
  mode: TypeDetectionMode,
  defaultFallback: TitleType = 'PAGAR'
): TitleType {
  if (mode === 'FORCE_PAYABLE') return 'PAGAR';
  if (mode === 'FORCE_RECEIVABLE') return 'RECEBER';

  if (mode === 'SIGNAL_BASED') {
    return isNegativeRawValue(rawAmount) ? 'PAGAR' : 'RECEBER';
  }

  // Modo AUTO ou MAPPED_COLUMN:
  // 1. Checa a coluna de tipo explicitamente se existir
  if (rawTypeValue !== undefined && rawTypeValue !== null && String(rawTypeValue).trim() !== '') {
    const normType = normalizeText(rawTypeValue);
    if (
      normType.includes('receit') ||
      normType.includes('receber') ||
      normType.includes('entrad') ||
      normType.includes('credit') ||
      normType === 'cr' ||
      normType === 'r' ||
      normType.includes('vend') ||
      normType.includes('fatur') ||
      normType.includes('inflow') ||
      normType.includes('cliente')
    ) {
      return 'RECEBER';
    }

    if (
      normType.includes('despes') ||
      normType.includes('pagar') ||
      normType.includes('said') ||
      normType.includes('debit') ||
      normType === 'cp' ||
      normType === 'd' ||
      normType === 'p' ||
      normType.includes('compr') ||
      normType.includes('fornec') ||
      normType.includes('custo') ||
      normType.includes('outflow')
    ) {
      return 'PAGAR';
    }
  }

  // 2. Checa o sinal numérico se negativo
  if (isNegativeRawValue(rawAmount)) {
    return 'PAGAR';
  }

  // 3. Checa a categoria da despesa/receita
  if (categoryValue) {
    const normCat = normalizeText(categoryValue);
    if (
      normCat.includes('receit') ||
      normCat.includes('venda') ||
      normCat.includes('servico prestado') ||
      normCat.includes('honorarios recebidos') ||
      normCat.includes('faturamento') ||
      normCat.includes('mensalidade') ||
      normCat.includes('aporte')
    ) {
      return 'RECEBER';
    }
    if (
      normCat.includes('despes') ||
      normCat.includes('custo') ||
      normCat.includes('imposto') ||
      normCat.includes('aluguel') ||
      normCat.includes('folha') ||
      normCat.includes('salario') ||
      normCat.includes('fornecedor') ||
      normCat.includes('tarifa')
    ) {
      return 'PAGAR';
    }
  }

  return defaultFallback;
}

// Normaliza status/situação de acordo com o padrão canônico com detecção precisa de quitações
export function normalizeStatus(
  rawStatus: any,
  saldoAtual: number,
  valorOriginal: number,
  vencimento: string,
  dataPagamento?: string,
  principalBaixado?: number,
  hasRawSaldo?: boolean
): 'ABERTO' | 'PARCIAL' | 'LIQUIDADO' | 'ATRASADO' | 'CANCELADO' {
  const norm = normalizeText(rawStatus);

  // 1. Cancelamentos e estornos
  if (norm.includes('cancel') || norm.includes('estorn')) {
    return 'CANCELADO';
  }

  // 2. Termos explícitos de quitação / pagamento / recebimento (suporte a variações de gênero, número e sinônimos)
  const isPaidTerm = 
    norm.includes('liquid') || 
    norm.includes('pago') || 
    norm.includes('paga') || 
    norm.includes('quit') || 
    norm.includes('recebid') || 
    norm.includes('recebeu') ||
    norm.includes('baixad') || 
    norm.includes('baixa') ||
    norm.includes('compensad') ||
    norm.includes('conciliad') ||
    norm.includes('efetivad') ||
    norm.includes('realizad') ||
    norm.includes('concluid') ||
    norm.includes('finalizad') ||
    norm === 'sim' ||
    norm === 'yes' ||
    norm === 'ok' ||
    norm === 'true' ||
    norm === '1' ||
    norm === 'p';

  if (isPaidTerm && !norm.includes('parcial') && !norm.includes('nao') && !norm.includes('pendente')) {
    return 'LIQUIDADO';
  }

  // 3. Se há data de pagamento/baixa válida informada na planilha, o título foi liquidado
  if (dataPagamento && dataPagamento.trim() !== '') {
    return 'LIQUIDADO';
  }

  // 4. Se o principal baixado for igual ou superior ao valor original
  if (principalBaixado !== undefined && principalBaixado > 0) {
    if (valorOriginal > 0 && principalBaixado >= valorOriginal - 0.05) {
      return 'LIQUIDADO';
    }
    if (principalBaixado > 0 && valorOriginal > 0 && principalBaixado < valorOriginal - 0.05) {
      return 'PARCIAL';
    }
  }

  // 5. Se o saldo declarado na planilha for zero (e havia coluna de saldo preenchida)
  if (hasRawSaldo && valorOriginal > 0 && saldoAtual <= 0.01) {
    return 'LIQUIDADO';
  }

  // 6. Termos explícitos de pagamento parcial
  if (norm.includes('parcial')) {
    return 'PARCIAL';
  }

  // 7. Atrasado se a data de vencimento já passou
  const today = new Date().toISOString().split('T')[0];
  if (vencimento && vencimento < today && saldoAtual > 0.01) {
    return 'ATRASADO';
  }

  return 'ABERTO';
}

// Formata rótulo amigável para mês/ano (ex: 2026-01 -> "Janeiro/2026")
export function formatMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey === 'OUTROS' || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return 'Outros / Sem Mês';
  }
  const [y, m] = monthKey.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const idx = parseInt(m, 10) - 1;
  return `${monthNames[idx] || m}/${y}`;
}

// Extrai a chave de mês canônica (AAAA-MM) de forma defensiva e segura.
// Prioriza a competência contábil e usa o vencimento como fallback. Nunca quebra com undefined/null.
export function getRowMonthKey(norm?: Partial<BaseSpreadsheetRow> | null): string {
  if (!norm) return 'OUTROS';
  if (norm.competencia && typeof norm.competencia === 'string' && /^\d{4}-\d{2}$/.test(norm.competencia.trim())) {
    return norm.competencia.trim();
  }
  if (norm.vencimento && typeof norm.vencimento === 'string') {
    const match = norm.vencimento.trim().match(/^(\d{4}-\d{2})/);
    if (match) return match[1];
  }
  return 'OUTROS';
}

// Calcula resumos consolidados por mês para auditoria e aprovação
export function calculateMonthlySummaries(rows: AnalyzedImportRow[]): MonthSummary[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const map: Record<string, {
    totalTitles: number;
    receivablesCount: number;
    payablesCount: number;
    totalReceivables: number;
    totalPayables: number;
    totalSettled: number;
    totalOpen: number;
    errorCount: number;
    selectedCount: number;
  }> = {};

  for (const row of rows) {
    if (!row || !row.normalized) continue;

    // Agrupa preferencialmente por competência; se não houver, usa mês do vencimento via getRowMonthKey seguro
    const mKey = getRowMonthKey(row.normalized);

    if (!map[mKey]) {
      map[mKey] = {
        totalTitles: 0,
        receivablesCount: 0,
        payablesCount: 0,
        totalReceivables: 0,
        totalPayables: 0,
        totalSettled: 0,
        totalOpen: 0,
        errorCount: 0,
        selectedCount: 0
      };
    }

    const item = map[mKey];
    item.totalTitles++;
    if (row.isSelected) item.selectedCount++;
    if (row.action === 'ERRO') item.errorCount++;

    const val = (typeof row.normalized.valorOriginal === 'number' && !isNaN(row.normalized.valorOriginal)) ? row.normalized.valorOriginal : 0;
    const settled = (typeof row.normalized.principalBaixado === 'number' && !isNaN(row.normalized.principalBaixado)) ? row.normalized.principalBaixado : 0;
    const open = (typeof row.normalized.saldoAtual === 'number' && !isNaN(row.normalized.saldoAtual)) ? row.normalized.saldoAtual : 0;

    if (row.normalized.tipo === 'RECEBER') {
      item.receivablesCount++;
      item.totalReceivables += val;
    } else {
      item.payablesCount++;
      item.totalPayables += val;
    }

    item.totalSettled += settled;
    item.totalOpen += open;
  }

  const result: MonthSummary[] = Object.keys(map)
    .sort((a, b) => a.localeCompare(b))
    .map(key => {
      const data = map[key];
      const [yStr, mStr] = key.split('-');
      const y = parseInt(yStr, 10) || 0;
      const m = parseInt(mStr, 10) || 0;

      return {
        monthKey: key,
        label: formatMonthLabel(key),
        year: y,
        month: m,
        totalTitles: data.totalTitles,
        receivablesCount: data.receivablesCount,
        payablesCount: data.payablesCount,
        totalReceivables: Math.round(data.totalReceivables * 100) / 100,
        totalPayables: Math.round(data.totalPayables * 100) / 100,
        netBalance: Math.round((data.totalReceivables - data.totalPayables) * 100) / 100,
        totalSettled: Math.round(data.totalSettled * 100) / 100,
        totalOpen: Math.round(data.totalOpen * 100) / 100,
        errorCount: data.errorCount,
        selectedCount: data.selectedCount
      };
    });

  return result;
}

// Gera um fingerprint estável para controle de idempotência
export function generateTitleFingerprint(
  tipo: TitleType,
  externalRef: string,
  contraparte: string,
  vencimento: string,
  valorOriginal: number
): string {
  const normType = tipo;
  const normRef = normalizeText(externalRef);
  const normParty = normalizeText(contraparte);
  const normDate = vencimento.trim();
  const normVal = valorOriginal.toFixed(2);
  return `${normType}__${normRef}__${normParty}__${normDate}__${normVal}`;
}

// Dicionário de cabeçalhos comuns do Conta Azul e ERPs brasileiros
export const CONTA_AZUL_COLUMN_PATTERNS = {
  tipo: ['tipo', 'natureza', 'tipo de lançamento', 'tipo de lancamento', 'tipo de título', 'tipo de titulo', 'operação', 'operacao', 'fluxo', 'movimentação', 'movimentacao', 'e/s', 'entrada/saída', 'd/c', 'cr/cp', 'r/d'],
  titulo: ['código de referência', 'codigo de referencia', 'código', 'codigo', 'número do documento', 'numero do documento', 'número', 'numero', 'título', 'titulo', 'documento', 'doc', 'nº documento', 'no documento', 'ref', 'identificador', 'nosso número'],
  fornecedor: ['nome do fornecedor', 'fornecedor', 'cliente', 'nome do cliente', 'cliente/fornecedor', 'fornecedor / cliente', 'cliente / fornecedor', 'contato', 'favorecido', 'sacado', 'contraparte', 'pagador', 'recebedor', 'beneficiário', 'beneficiario', 'razão social', 'razao social'],
  descricao: ['descrição da despesa', 'descricao da despesa', 'descrição da receita', 'descricao da receita', 'descrição', 'descricao', 'histórico', 'historico', 'detalhes', 'detalhe', 'item', 'serviço', 'servico', 'observação', 'observacao', 'obs'],
  competencia: [
    'competência da despesa', 'competência da receita',
    'data da competência', 'data de competência', 'data da competencia', 'data de competencia',
    'data competência', 'data competencia', 'dt competência', 'dt competencia', 'dt. competência', 'dt. competencia',
    'mês da competência', 'mes da competencia', 'mês competência', 'mes competencia',
    'competência', 'competencia', 'mês/ano', 'mes/ano', 'mês ref', 'mes ref',
    'mês de referência', 'mes de referencia', 'mês', 'mes', 'período', 'periodo',
    'competência (mês/ano)', 'competencia (mes/ano)', 'competencia ref', 'competência ref'
  ],
  emissao: [
    'data de emissão', 'data de emissao', 'data emissão', 'data emissao',
    'dt emissão', 'dt emissao', 'dt. emissão', 'dt. emissao',
    'emissão', 'emissao', 'data do documento', 'data documento'
  ],
  vencimento: ['data de vencimento', 'data vencimento', 'dt vencimento', 'dt. vencimento', 'dt venc', 'dt. venc', 'vencimento', 'vcto', 'vcto.', 'dt vcto', 'dt. vcto', 'data do vencimento', 'data limite'],
  dataPagamento: ['data de pagamento', 'data do pagamento', 'data pagamento', 'dt pagamento', 'dt. pagamento', 'data pagto', 'dt pagto', 'dt. pagto', 'data da baixa', 'data baixa', 'dt baixa', 'dt. baixa', 'data de liquidação', 'data liquidação', 'data de quitação', 'data quitação', 'data de recebimento', 'data do recebimento', 'data recebimento', 'dt recebimento', 'pago em', 'recebido em'],
  previsaoCaixa: ['data prevista de pagamento', 'data prevista de recebimento', 'data prevista', 'dt prevista', 'previsão de pagamento', 'previsao de pagamento', 'previsão de recebimento', 'previsao de recebimento', 'previsão caixa', 'previsao caixa', 'previsão', 'previsao'],
  valorOriginal: ['valor original', 'valor total', 'valor da parcela', 'valor bruto', 'valor do documento', 'valor documento', 'valor previsto', 'valor (r$)', 'valor r$', 'valor', 'total (r$)', 'total'],
  principalBaixado: ['principal baixado', 'valor pago', 'valor recebido', 'valor baixado', 'total pago', 'total recebido', 'valor liquidado', 'total baixado', 'total liquidado', 'vlr pago', 'vl pago', 'vl. pago', 'vlr. pago', 'vlr baixado', 'vl baixado', 'vl. baixado', 'valor quitado'],
  saldoAtual: ['saldo atual', 'saldo em aberto', 'valor em aberto', 'saldo a pagar', 'saldo a receber', 'saldo devedor', 'saldo restante', 'saldo (r$)', 'saldo'],
  situacao: ['situação', 'situacao', 'status da despesa', 'status da receita', 'status da parcela', 'status do pagamento', 'status pagamento', 'status', 'estado', 'pago?', 'paga?', 'foi pago?', 'liquidado?', 'condição', 'condicao', 'posição', 'posicao', 'fase', 'etapa', 'situação da parcela', 'situacao da parcela', 'pago', 'paga'],
  categoria: ['categoria', 'plano de contas', 'classificação', 'classificacao', 'conta contábil', 'conta contabil', 'subcategoria', 'rubrica', 'grupo de contas'],
  banco: ['conta bancária', 'conta bancaria', 'conta', 'banco', 'forma de pagamento', 'meio de pagamento', 'forma pagto'],
  centroCusto: ['centro de custo', 'centro de custos', 'cc', 'unidade', 'projeto', 'departamento']
};

// Encontra correspondência nos cabeçalhos da planilha com salvaguardas e ordenação
export function detectColumnMatch(headers: string[], patterns: string[]): string {
  const sortedPatterns = [...patterns].sort((a, b) => b.length - a.length);

  // 1. Match exato
  for (const h of headers) {
    const normH = normalizeText(h);
    if (sortedPatterns.some(p => normH === normalizeText(p))) {
      return h;
    }
  }

  // 2. Match parcial seguro
  for (const p of sortedPatterns) {
    const normP = normalizeText(p);
    if (normP.length < 3) continue;

    for (const h of headers) {
      const normH = normalizeText(h);

      // Salvaguarda: Não deixar "valorOriginal" casar com "valor pago" ou "valor baixado"
      if ((normP === 'valor' || normP === 'total' || normP === 'valor total') && (normH.includes('pago') || normH.includes('baixad') || normH.includes('recebid') || normH.includes('liquid'))) {
        continue;
      }
      // Salvaguarda: Não deixar "vencimento" casar com "data de pagamento" ou "data da baixa"
      if ((normP === 'vencimento' || normP === 'venc') && (normH.includes('pagamento') || normH.includes('baixa') || normH.includes('emissao') || normH.includes('quitacao') || normH.includes('liquidacao'))) {
        continue;
      }

      if (normH.includes(normP)) {
        return h;
      }
    }
  }

  return '';
}

// Analisa e normaliza todas as linhas da planilha com suporte a Receitas e Despesas
export function analyzeContaAzulSpreadsheet(
  rows: Record<string, any>[],
  headers: string[],
  columnMapping: Record<string, string>,
  existingTitles: FinancialTitle[],
  existingCounterparties: Counterparty[],
  existingChartAccounts: ChartAccount[],
  defaultExpenseAccountId: string,
  defaultRevenueAccountId: string,
  typeDetectionMode: TypeDetectionMode = 'AUTO',
  extraColumns: ExtraColumnDefinition[] = [],
  fallbackDefaultType: TitleType = 'PAGAR'
): AnalyzedImportRow[] {
  const result: AnalyzedImportRow[] = [];

  const safeExistingTitles = (Array.isArray(existingTitles) ? existingTitles : []).filter(Boolean);
  const safeCounterparties = (Array.isArray(existingCounterparties) ? existingCounterparties : []).filter(Boolean);
  const safeChartAccounts = (Array.isArray(existingChartAccounts) ? existingChartAccounts : []).filter(Boolean);

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2; // Cabeçalho na linha 1
    const errors: string[] = [];
    const warnings: string[] = [];

    // Ignora linhas totalmente vazias ou linhas de rodapé/totais
    const rowValues = Object.values(raw || {}).map(v => String(v !== undefined && v !== null ? v : '').trim()).filter(Boolean);
    if (rowValues.length === 0) return;
    const firstCell = String(rowValues[0] || '').toLowerCase();
    if (firstCell.startsWith('total') || firstCell.startsWith('totais') || firstCell.startsWith('soma de') || firstCell === 'total geral') {
      return;
    }

    const isExplicitlyIgnored = (fieldKey: string) => columnMapping[fieldKey] === '__DONT_IMPORT__';

    const getVal = (fieldKey: string) => {
      const colName = columnMapping[fieldKey];
      if (colName === '__DONT_IMPORT__') return undefined;
      return colName ? raw[colName] : undefined;
    };

    // 1. Vencimento e Data de Pagamento
    const rawVenc = getVal('vencimento');
    let vencimento = isExplicitlyIgnored('vencimento') ? '' : normalizeToISODate(rawVenc);

    const rawDataPagto = getVal('dataPagamento');
    const dataPagamento = isExplicitlyIgnored('dataPagamento') ? '' : normalizeToISODate(rawDataPagto);

    // 2. Emissão
    const rawEmissao = getVal('emissao');
    const emissao = isExplicitlyIgnored('emissao') ? '' : normalizeToISODate(rawEmissao, vencimento);

    // Fallback inteligente de vencimento se a coluna estiver em branco ou ausente
    if (!vencimento && !isExplicitlyIgnored('vencimento')) {
      vencimento = dataPagamento || emissao || normalizeToISODate(getVal('previsaoCaixa'));
      if (vencimento) {
        warnings.push(`Data de vencimento inferida: ${vencimento}`);
      } else {
        errors.push('Data de vencimento ausente ou em formato inválido');
      }
    }

    // 3. Competência (mês/ano)
    const rawComp = getVal('competencia');
    const competencia = isExplicitlyIgnored('competencia') 
      ? '' 
      : normalizeToCompetence(rawComp, vencimento || emissao);

    // 4. Previsão de Caixa
    const rawPrev = getVal('previsaoCaixa');
    const previsaoCaixa = isExplicitlyIgnored('previsaoCaixa') 
      ? '' 
      : normalizeToISODate(rawPrev, dataPagamento || vencimento);

    // 5. Valores
    const rawValOriginal = getVal('valorOriginal');
    let valorOriginal = normalizeCurrency(rawValOriginal);

    const rawBaixado = getVal('principalBaixado');
    let principalBaixado = isExplicitlyIgnored('principalBaixado') ? 0 : normalizeCurrency(rawBaixado);

    if (valorOriginal <= 0) {
      if (principalBaixado > 0) {
        valorOriginal = principalBaixado;
        warnings.push(`Valor original inferido a partir do valor baixado/pago: R$ ${valorOriginal.toFixed(2)}`);
      } else {
        errors.push('Valor original deve ser superior a R$ 0,00');
      }
    }

    let saldoAtual = 0;
    const rawSaldo = getVal('saldoAtual');
    const hasRawSaldo = rawSaldo !== undefined && rawSaldo !== '' && rawSaldo !== null && !isExplicitlyIgnored('saldoAtual');
    if (hasRawSaldo) {
      saldoAtual = normalizeCurrency(rawSaldo);
    } else {
      saldoAtual = Math.max(0, Math.round((valorOriginal - principalBaixado) * 100) / 100);
    }

    // 6. Separação de Tipo (Receita vs Despesa) e Filtro de Sinal
    const isRawNegative = isNegativeRawValue(rawValOriginal);
    const originalSign = isRawNegative ? -1 : 1;
    const rawTipo = getVal('tipo');
    const rawCat = isExplicitlyIgnored('categoria') ? '' : getVal('categoria');
    
    let tipo: TitleType = detectTitleType(
      rawTipo,
      rawValOriginal,
      rawCat,
      typeDetectionMode,
      fallbackDefaultType
    );

    if (isRawNegative) {
      tipo = 'PAGAR';
    }

    // Filtro de Módulo:
    // No Contas a Receber: só importa valores positivos e que sejam aprovados de receber (rejeita negativos/despesas).
    // No Contas a Pagar: o padrão é Despesa/Pagar; só descarta se tiver tipo EXPLICITAMENTE mapeado como receita na planilha.
    let isTypeFilteredOut = false;
    let typeFilterReason: string | undefined;

    if (fallbackDefaultType === 'RECEBER') {
      if (isRawNegative || tipo === 'PAGAR') {
        isTypeFilteredOut = true;
        typeFilterReason = 'Lançamento com valor negativo ou saída (despesa). No módulo de Contas a Receber, apenas valores positivos e recebimentos são aceitos.';
        warnings.push('Filtro de Recebimento: Linha de valor negativo/despesa desconsiderada.');
      }
    } else if (fallbackDefaultType === 'PAGAR') {
      const explicitTipoNorm = normalizeText(rawTipo);
      const isExplicitRevenue = explicitTipoNorm.includes('receit') || explicitTipoNorm.includes('entrada') || explicitTipoNorm === 'cr';
      if (isExplicitRevenue && tipo === 'RECEBER') {
        isTypeFilteredOut = true;
        typeFilterReason = 'Lançamento com tipo explícito de receita na planilha. No módulo de Contas a Pagar, apenas despesas e saídas são aceitas.';
        warnings.push('Filtro de Pagamento: Linha de receita desconsiderada.');
      } else {
        // Assegura que em Contas a Pagar a linha seja tratada como despesa
        tipo = 'PAGAR';
      }
    }

    // 7. Fornecedor / Cliente (Contraparte)
    const rawForn = getVal('fornecedor');
    const rawDesc = getVal('descricao');
    let contraparteName = rawForn ? String(rawForn).trim() : '';
    if (!contraparteName && !isExplicitlyIgnored('fornecedor')) {
      const fallbackName = rawDesc ? String(rawDesc).trim() : (rawCat ? String(rawCat).trim() : '');
      if (fallbackName) {
        contraparteName = fallbackName;
        warnings.push(`Contraparte ausente; utilizando: "${fallbackName}"`);
      } else {
        contraparteName = tipo === 'RECEBER' ? 'Cliente Não Informado' : 'Fornecedor Não Informado';
        warnings.push(`Contraparte preenchida como "${contraparteName}"`);
      }
    }

    // 8. Descrição
    let descricao = rawDesc ? String(rawDesc).trim() : '';
    if (!descricao && !isExplicitlyIgnored('descricao')) {
      descricao = `${tipo === 'RECEBER' ? 'Receita' : 'Despesa'} ${contraparteName || 'Lançamento'} - Venc. ${vencimento || 'A definir'}`;
    }

    // 9. Título / Código de Referência (garantindo unicidade por linha)
    const rawTit = getVal('titulo');
    let titulo = rawTit ? String(rawTit).trim() : '';
    let externalId = titulo;

    if (!titulo && !isExplicitlyIgnored('titulo')) {
      const partySlug = normalizeText(contraparteName).replace(/[^a-z0-9]/g, '').substring(0, 8);
      const valCentavos = Math.round(valorOriginal * 100);
      const prefix = tipo === 'RECEBER' ? 'REC' : 'DESP';
      titulo = `CA-${prefix}-${partySlug || 'LANC'}-${(vencimento || 'DATA').replace(/-/g, '')}-${valCentavos}-${rowNum}`;
      externalId = titulo;
      warnings.push(`Identificador gerado automaticamente: ${titulo}`);
    }

    // 10. Situação Rigorosa e Alinhamento de Quitação
    const rawSit = getVal('situacao');
    let situacao = normalizeStatus(
      rawSit,
      saldoAtual,
      valorOriginal,
      vencimento,
      dataPagamento,
      principalBaixado,
      hasRawSaldo
    );

    // Se Data de Pagamento estiver preenchida e válida na planilha, considera como LIQUIDADO automaticamente
    if (dataPagamento && /^\d{4}-\d{2}-\d{2}$/.test(dataPagamento) && situacao !== 'CANCELADO') {
      situacao = 'LIQUIDADO';
      principalBaixado = valorOriginal;
      saldoAtual = 0;
    }

    // Se o status for LIQUIDADO (ou pago), garantir que o valor pago seja igual ao valor original e saldo zerado
    if (situacao === 'LIQUIDADO') {
      if (principalBaixado <= 0) {
        principalBaixado = valorOriginal;
      }
      saldoAtual = 0;
    } else if (situacao === 'PARCIAL') {
      if (principalBaixado <= 0 && saldoAtual > 0 && saldoAtual < valorOriginal) {
        principalBaixado = Math.round((valorOriginal - saldoAtual) * 100) / 100;
      } else if (principalBaixado > 0 && (!hasRawSaldo || saldoAtual <= 0)) {
        saldoAtual = Math.max(0, Math.round((valorOriginal - principalBaixado) * 100) / 100);
      }
    } else if (situacao === 'ABERTO' || situacao === 'ATRASADO') {
      if (!hasRawSaldo || saldoAtual <= 0) {
        saldoAtual = valorOriginal;
      }
      principalBaixado = 0;
    }

    // 11. Cruzamento com Contrapartes Atuais do Sistema
    let matchedCounterpartyId: string | undefined;
    let suggestedCounterpartyId: string | undefined;
    let counterpartyResolution: 'MATCH_EXATO' | 'SUGESTAO' | 'NOVO_SOLICITADO' | 'MANUAL' = 'NOVO_SOLICITADO';

    if (contraparteName) {
      const normParty = normalizeText(contraparteName);
      
      // Busca match exato
      const exactMatch = safeCounterparties.find(c => 
        (c?.name && normalizeText(c.name) === normParty) || 
        (c?.tradeName && normalizeText(c.tradeName) === normParty)
      );

      if (exactMatch) {
        matchedCounterpartyId = exactMatch.id;
        counterpartyResolution = 'MATCH_EXATO';
      } else {
        // Busca similar/parcial
        const partialMatch = safeCounterparties.find(c => {
          const cName = normalizeText(c?.name || '');
          return (cName && normParty && (cName.includes(normParty) || normParty.includes(cName)));
        });

        if (partialMatch) {
          suggestedCounterpartyId = partialMatch.id;
          counterpartyResolution = 'SUGESTAO';
          warnings.push(`Similar encontrado no sistema: "${partialMatch.name}". Confirme ou cadastre.`);
        } else {
          counterpartyResolution = 'NOVO_SOLICITADO';
          warnings.push(`"${contraparteName}" ainda não cadastrado no app.`);
        }
      }
    }

    // 12. Cruzamento com Plano de Contas Atual & Motor de Inteligência de Memória
    let matchedChartAccountId: string | undefined;
    let suggestedChartAccountId: string | undefined;
    let matchedChartAccountName: string | undefined;
    let categoryResolution: 'MATCH_PLANO' | 'CRIAR_NOVO_PLANO' | 'USAR_PADRAO' = 'USAR_PADRAO';
    let isFromMemory = false;
    let memoryConfidence: number | undefined;
    let memoryReason: string | undefined;

    const rawCategoryName = rawCat ? String(rawCat).trim() : '';

    // 12.1. Primeiro verifica se a planilha trouxe uma categoria que casa com o Plano de Contas
    if (rawCategoryName) {
      const normCat = normalizeText(rawCategoryName);
      const exactAccount = safeChartAccounts.find(a => 
        a && a.isAnalytical && normalizeText(a.name || '') === normCat
      );

      if (exactAccount) {
        matchedChartAccountId = exactAccount.id;
        matchedChartAccountName = exactAccount.name;
        categoryResolution = 'MATCH_PLANO';
      } else {
        const partialAccount = safeChartAccounts.find(a => 
          a && a.isAnalytical && (normalizeText(a.name || '').includes(normCat) || normCat.includes(normalizeText(a.name || '')))
        );
        if (partialAccount) {
          suggestedChartAccountId = partialAccount.id;
          matchedChartAccountId = partialAccount.id;
          matchedChartAccountName = partialAccount.name;
          categoryResolution = 'MATCH_PLANO';
        }
      }
    }

    // 12.2. Se não encontrou match exato ou a planilha veio sem categoria, consulta o Motor de Memória e Inteligência
    if (!matchedChartAccountId) {
      const prediction = categoryLearningService.predictCategory(
        contraparteName,
        descricao,
        tipo,
        safeChartAccounts,
        safeExistingTitles
      );

      if (prediction) {
        matchedChartAccountId = prediction.chartAccountId;
        matchedChartAccountName = prediction.chartAccountName;
        isFromMemory = true;
        memoryConfidence = prediction.confidence;
        memoryReason = prediction.reason;
        categoryResolution = 'MATCH_PLANO';
      }
    }

    // 12.3. Fallback para Plano de Contas padrão se ainda não definido
    if (!matchedChartAccountId) {
      const fallbackId = tipo === 'RECEBER' ? defaultRevenueAccountId : defaultExpenseAccountId;
      matchedChartAccountId = suggestedChartAccountId || fallbackId;
      const fallbackAcc = safeChartAccounts.find(a => a && a.id === matchedChartAccountId);
      matchedChartAccountName = fallbackAcc?.name || (tipo === 'RECEBER' ? 'Receita de Serviços' : 'Despesas Gerais');
      if (rawCategoryName && !suggestedChartAccountId) {
        categoryResolution = 'CRIAR_NOVO_PLANO';
        warnings.push(`Categoria "${rawCategoryName}" não encontrada no Plano de Contas. Será criada automaticamente ou associada ao padrão.`);
      }
    } else if (!matchedChartAccountName) {
      const acc = safeChartAccounts.find(a => a && a.id === matchedChartAccountId);
      matchedChartAccountName = acc?.name || rawCategoryName;
    }

    // 13. Captura de Colunas Extras Personalizadas da Planilha
    const customFields: Record<string, any> = {};
    for (const extraCol of extraColumns) {
      if (extraCol.sourceHeader && raw[extraCol.sourceHeader] !== undefined) {
        customFields[extraCol.id] = raw[extraCol.sourceHeader];
      }
    }

    // Centro de custo mapeado diretamente
    const rawCc = getVal('centroCusto');
    const centroCusto = rawCc ? String(rawCc).trim() : (customFields['centroCusto'] ? String(customFields['centroCusto']) : undefined);

    const fingerprint = generateTitleFingerprint(tipo, titulo, contraparteName, vencimento, valorOriginal);

    const normalized: BaseSpreadsheetRow = {
      titulo,
      tipo,
      fornecedor: contraparteName,
      descricao,
      competencia,
      emissao,
      vencimento,
      dataPagamento: dataPagamento || undefined,
      previsaoCaixa,
      valorOriginal,
      principalBaixado,
      saldoAtual,
      situacao,
      categoria: rawCategoryName || undefined,
      banco: getVal('banco') ? String(getVal('banco')).trim() : undefined,
      centroCusto,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined
    };

    // 14. Detecção de Idempotência e Diff com Títulos Atuais do Sistema
    let action: ImportDiffAction = 'CRIAR';
    let existingTitle: FinancialTitle | undefined;
    const diffs: RowDiffField[] = [];

    existingTitle = safeExistingTitles.find(t => 
      t && (
        (t.externalId && externalId && t.externalId === externalId) ||
        (t.fingerprint && fingerprint && t.fingerprint === fingerprint) ||
        (rawTit && t.titleNumber === titulo && t.type === tipo && (matchedCounterpartyId ? t.counterpartyId === matchedCounterpartyId : true))
      )
    );

    if (errors.length > 0) {
      action = 'ERRO';
    } else if (existingTitle) {
      const fieldDiff = (field: string, label: string, oldVal: any, newVal: any) => {
        const hasChanged = String(oldVal || '') !== String(newVal || '');
        diffs.push({ field, label, oldValue: oldVal, newValue: newVal, hasChanged });
        return hasChanged;
      };

      const diffType = fieldDiff('type', 'Tipo', existingTitle.type, tipo);
      const diffVal = fieldDiff('originalAmount', 'Valor Original', existingTitle.originalAmount, valorOriginal);
      const diffPaid = fieldDiff('settledPrincipal', 'Principal Baixado', existingTitle.settledPrincipal, principalBaixado);
      const diffBalance = fieldDiff('balancePrincipal', 'Saldo Atual', existingTitle.balancePrincipal, saldoAtual);
      const diffDue = fieldDiff('dueDate', 'Vencimento', existingTitle.dueDate, vencimento);
      const diffCash = fieldDiff('expectedCashDate', 'Previsão Caixa', existingTitle.expectedCashDate || existingTitle.dueDate, previsaoCaixa);
      const diffComp = fieldDiff('competence', 'Competência', existingTitle.competence, competencia);
      const diffStatus = fieldDiff('settlementState', 'Situação', existingTitle.settlementState, situacao);

      const anyChange = diffType || diffVal || diffPaid || diffBalance || diffDue || diffCash || diffComp || diffStatus;

      if (anyChange) {
        action = 'ATUALIZAR';
      } else {
        action = 'IGNORAR_IDENTICO';
      }
    } else {
      action = 'CRIAR';
    }

    result.push({
      rowNumber: rowNum,
      raw,
      normalized,
      fingerprint,
      externalId,
      action,
      existingTitle,
      diffs,
      errors,
      warnings,
      matchedCounterpartyId,
      suggestedCounterpartyId,
      counterpartyResolution,
      matchedChartAccountId,
      suggestedChartAccountId,
      matchedChartAccountName,
      categoryResolution,
      isFromMemory,
      memoryConfidence,
      memoryReason,
      originalSign,
      isTypeFilteredOut,
      typeFilterReason,
      isSelected: action !== 'ERRO' && action !== 'IGNORAR_IDENTICO' && !isTypeFilteredOut
    });
  });

  return result;
}

/**
 * Gera e faz o download do modelo oficial com suporte a Receitas, Despesas e múltiplos meses
 */
export function downloadBaseSpreadsheetTemplate(XLSX: any) {
  const headers = [
    'Tipo',
    'Título',
    'Fornecedor / Cliente',
    'Descrição',
    'Competência',
    'Emissão',
    'Vencimento',
    'Previsão Caixa',
    'Valor Original',
    'Principal Baixado',
    'Saldo Atual',
    'Situação',
    'Categoria',
    'Centro de Custo'
  ];

  const sampleRows = [
    [
      'Receita',
      'FAT-2026-01/01',
      'TechCorp Soluções Empresariais',
      'Honorários de Consultoria Estratégica - Jan/2026',
      '2026-01',
      '2026-01-05',
      '2026-01-20',
      '2026-01-20',
      12500.00,
      12500.00,
      0.00,
      'LIQUIDADO',
      'Receita de Serviços de Consultoria',
      'Projetos Especiais'
    ],
    [
      'Despesa',
      'NF-9821/01',
      'AWS Amazon Web Services',
      'Servidores em Nuvem e Bancos de Dados - Jan/2026',
      '2026-01',
      '2026-01-01',
      '2026-01-20',
      '2026-01-20',
      1450.00,
      1450.00,
      0.00,
      'LIQUIDADO',
      'Hospedagem e Servidores',
      'Tecnologia'
    ],
    [
      'Receita',
      'FAT-2026-02/01',
      'Inovare Indústria e Comércio',
      'Mensalidade de Gestão Financeira BPO - Fev/2026',
      '2026-02',
      '2026-02-01',
      '2026-02-15',
      '2026-02-15',
      8900.00,
      0.00,
      8900.00,
      'ABERTO',
      'Receita de Honorários BPO',
      'Operação BPO'
    ],
    [
      'Despesa',
      'DOC-4402',
      'Imobiliária Paulista Prime',
      'Aluguel do Escritório Operacional - Fev/2026',
      '2026-02',
      '2026-02-01',
      '2026-02-25',
      '2026-02-25',
      3800.00,
      0.00,
      3800.00,
      'ABERTO',
      'Aluguel e Condomínio',
      'Administrativo'
    ],
    [
      'Despesa',
      'FAT-8831',
      'Google Workspace & Cloud',
      'Assinaturas de E-mails Corporativos - Mar/2026',
      '2026-03',
      '2026-03-05',
      '2026-03-15',
      '2026-03-15',
      620.50,
      0.00,
      620.50,
      'ABERTO',
      'Softwares e Licenças',
      'Tecnologia'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 12 }, // Tipo
    { wch: 16 }, // Título
    { wch: 32 }, // Fornecedor / Cliente
    { wch: 44 }, // Descrição
    { wch: 14 }, // Competência
    { wch: 14 }, // Emissão
    { wch: 14 }, // Vencimento
    { wch: 16 }, // Previsão Caixa
    { wch: 16 }, // Valor Original
    { wch: 18 }, // Principal Baixado
    { wch: 16 }, // Saldo Atual
    { wch: 14 }, // Situação
    { wch: 28 }, // Categoria
    { wch: 20 }  // Centro de Custo
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pagar e Receber');
  XLSX.writeFile(wb, 'planilha-base-anual-pagar-e-receber-modelo.xlsx');
}

/**
 * Gera e faz o download de exemplo do arquivo exportado diretamente pelo Conta Azul
 */
export function downloadContaAzulSampleTemplate(XLSX: any) {
  const headers = [
    'Tipo de lançamento',
    'Código de referência',
    'Cliente / Fornecedor',
    'Descrição',
    'Competência',
    'Data de emissão',
    'Data de vencimento',
    'Previsão de pagamento',
    'Valor original',
    'Principal baixado',
    'Saldo em aberto',
    'Status',
    'Categoria',
    'Conta bancária',
    'Centro de custo'
  ];

  const sampleRows = [
    [
      'Receita',
      'CA-REC-2026-01',
      'Varejão do Brás Ltda',
      'Faturamento de Contrato Mensal',
      '01/2026',
      '05/01/2026',
      '20/01/2026',
      '20/01/2026',
      'R$ 15.000,00',
      'R$ 15.000,00',
      'R$ 0,00',
      'Liquidado',
      'Receitas de Serviços',
      'Banco Itaú',
      'Vendas'
    ],
    [
      'Despesa',
      'CA-DESP-2026-01',
      'Dell Computadores do Brasil',
      'Locação de Servidores e Estações de Trabalho',
      '01/2026',
      '01/01/2026',
      '22/01/2026',
      '22/01/2026',
      'R$ 4.200,00',
      'R$ 4.200,00',
      'R$ 0,00',
      'Liquidado',
      'TI e Softwares',
      'Banco Itaú',
      'Tecnologia'
    ],
    [
      'Receita',
      'CA-REC-2026-02',
      'Alpha Logística e Transportes',
      'Serviço Especializado de Análise Fiscal',
      '02/2026',
      '01/02/2026',
      '18/02/2026',
      '18/02/2026',
      'R$ 9.800,00',
      'R$ 0,00',
      'R$ 9.800,00',
      'Em Aberto',
      'Receitas de Consultoria',
      'Banco Santander',
      'Consultoria'
    ],
    [
      'Despesa',
      'CA-DESP-2026-02',
      'Consultoria Contábil Silva & Ramos',
      'Assessoria Tributária Especializada',
      '02/2026',
      '05/02/2026',
      '15/02/2026',
      '15/02/2026',
      'R$ 2.500,00',
      'R$ 0,00',
      'R$ 2.500,00',
      'Em Aberto',
      'Serviços de Terceiros',
      'Banco Itaú',
      'Administrativo'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 22 },
    { wch: 35 },
    { wch: 42 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 24 },
    { wch: 18 },
    { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Conta_Azul_Anual');
  XLSX.writeFile(wb, 'conta-azul-anual-pagar-e-receber-exemplo.xlsx');
}
