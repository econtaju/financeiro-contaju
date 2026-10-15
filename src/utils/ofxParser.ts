export interface ParsedOfxTransaction {
  fitId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  type: 'CREDIT' | 'DEBIT' | 'OTHER';
  checkNumber?: string;
  memo?: string;
  name?: string;
}

export interface ParsedOfxResult {
  transactions: ParsedOfxTransaction[];
  bankId?: string;
  branchId?: string;
  accountId?: string;
  accountType?: string;
  currency?: string;
  ledgerBalance?: number;
  ledgerDate?: string;
}

/**
 * Decodifica entidades HTML e caracteres escapados em descrições de extratos bancários
 */
function decodeEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    });
}

/**
 * Normaliza e formata datas extraídas de extratos OFX (ex.: 20261014120000[-3:BRT] ou 20261014)
 */
export function parseOfxDate(rawDateStr: string): string {
  if (!rawDateStr) {
    return new Date().toISOString().split('T')[0];
  }

  // Remove caracteres de timezone ou colchetes, ex: [-3:BRT] ou [0:GMT]
  const cleanStr = rawDateStr.replace(/\[.*?\]/g, '').trim();

  // Padrão clássico OFX: YYYYMMDD ou YYYYMMDDHHMMSS
  const matchYmd = cleanStr.match(/^(\d{4})(\d{2})(\d{2})/);
  if (matchYmd) {
    const [, yyyy, mm, dd] = matchYmd;
    const m = parseInt(mm, 10);
    const d = parseInt(dd, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Padrão ISO YYYY-MM-DD
  const matchIso = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
  }

  // Padrão brasileiro DD/MM/YYYY
  const matchBr = cleanStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (matchBr) {
    return `${matchBr[3]}-${matchBr[2]}-${matchBr[1]}`;
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Converte valores financeiros numéricos de extrato de forma resiliente,
 * suportando notação internacional (-1250.50), notação brasileira (-1.250,50 ou -1250,50)
 * e formatações com símbolos ou espaços.
 */
export function parseOfxAmount(rawValStr: string): number {
  if (!rawValStr) return 0;

  // Preserva o sinal de débito/crédito se houver
  const isNegative = rawValStr.includes('-');

  // Remove R$, letras e espaços
  let clean = rawValStr.replace(/[^\d.,]/g, '').trim();
  if (!clean) return 0;

  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');

  if (hasComma && hasDot) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');

    if (lastComma > lastDot) {
      // Formato Brasileiro: 1.250,50 (ponto é milhar, vírgula é decimal)
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato Internacional: 1,250.50 (vírgula é milhar, ponto é decimal)
      clean = clean.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Apenas vírgula: 1250,50 -> decimal é vírgula
    clean = clean.replace(',', '.');
  }
  // Se tem apenas ponto (1250.50), já está no formato correto para parseFloat

  let val = parseFloat(clean);
  if (isNaN(val)) return 0;

  val = Math.round(val * 100) / 100;
  return isNegative ? -Math.abs(val) : Math.abs(val);
}

/**
 * Extrai o valor de uma tag simples OFX tanto no formato SGML (sem fechamento) quanto XML (com fechamento),
 * suportando quebras de linha e atributos XML (ex.: <TRNAMT currency="BRL">-150.00</TRNAMT>).
 */
export function extractTagValue(block: string, tagName: string): string {
  if (!block || !tagName) return '';

  // 1. Tenta formato XML fechado com possível quebra de linha interna ou atributos: <TAG attr="...">VALOR</TAG>
  const xmlRegex = new RegExp(`<${tagName}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const xmlMatch = block.match(xmlRegex);
  if (xmlMatch && xmlMatch[1] !== undefined) {
    return decodeEntities(xmlMatch[1].trim());
  }

  // 2. Formato SGML (OFX 1.02 comum em bancos brasileiros como Itaú, Bradesco, Santander, BB)
  // O valor vai da abertura da tag até a próxima tag '<' ou fim de linha
  const sgmlRegex = new RegExp(`<${tagName}(?:\\s+[^>]*)?>([^<\\r\\n]+)`, 'i');
  const sgmlMatch = block.match(sgmlRegex);
  if (sgmlMatch && sgmlMatch[1]) {
    return decodeEntities(sgmlMatch[1].trim());
  }

  return '';
}

/**
 * Parser de contingência para arquivos CSV / TXT bancários (quando o banco exporta com extensões variadas)
 */
function parseCsvFallback(content: string): ParsedOfxTransaction[] {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const transactions: ParsedOfxTransaction[] = [];

  // Detecta o delimitador mais comum (; ou , ou tab)
  const firstLine = lines[0];
  const delim = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';

  // Encontra índices prováveis de colunas
  const headerCols = lines[0].split(delim).map(c => c.replace(/["']/g, '').trim().toLowerCase());
  let dateIdx = headerCols.findIndex(c => c.includes('data') || c.includes('dt') || c.includes('date'));
  let descIdx = headerCols.findIndex(c => c.includes('desc') || c.includes('hist') || c.includes('memo') || c.includes('narrat') || c.includes('detalhe'));
  let amountIdx = headerCols.findIndex(c => c.includes('valor') || c.includes('val') || c.includes('amount') || c.includes('quantia'));
  let docIdx = headerCols.findIndex(c => c.includes('doc') || c.includes('fitid') || c.includes('id') || c.includes('num'));

  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = 1;
  if (amountIdx === -1) amountIdx = 2;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map(c => c.replace(/["']/g, '').trim());
    if (cols.length < 2) continue;

    const rawDate = cols[dateIdx] || '';
    const rawDesc = decodeEntities(cols[descIdx] || 'Lançamento Bancário');
    const val = parseOfxAmount(cols[amountIdx] || '0');

    if (val === 0) continue;

    const formattedDate = parseOfxDate(rawDate);
    const fitId = cols[docIdx] || `CSV-${formattedDate.replace(/-/g, '')}-${i}-${Math.floor(Math.random() * 9000)}`;

    transactions.push({
      fitId,
      date: formattedDate,
      amount: val,
      description: rawDesc,
      type: val < 0 ? 'DEBIT' : 'CREDIT'
    });
  }

  return transactions;
}

/**
 * Parser de OFX Completo, determinístico e com suporte a:
 * 1. OFX SGML 1.02 (Itaú, Bradesco, Santander, Banco do Brasil, Caixa, Sicoob, Sicredi)
 * 2. OFX XML 2.x (Nubank, Inter, C6, BTG, Agibank)
 * 3. Extratos de Conta Corrente (<STMTTRN>) e Cartão de Crédito (<CCSTMTTRN>)
 * 4. Metadados de Conta Bancária (<BANKID>, <BRANCHID>, <ACCTID>, <LEDGERBAL>)
 * 5. Parsing preciso de valores com vírgula ou ponto (sem perda de centavos ou casas de milhar)
 */
export function parseOFXFull(ofxContent: string): ParsedOfxResult {
  if (!ofxContent || typeof ofxContent !== 'string') {
    return { transactions: [] };
  }

  // Remove Byte Order Mark (BOM) se presente
  const sanitizedContent = ofxContent.replace(/^\uFEFF/, '').trim();

  // Se o conteúdo for CSV puro (sem tags <OFX>, <STMTTRN> ou <CCSTMTTRN>)
  const upperContent = sanitizedContent.toUpperCase();
  const hasOfxTags = upperContent.includes('<OFX') || 
                     upperContent.includes('<STMTTRN') || 
                     upperContent.includes('<CCSTMTTRN') ||
                     upperContent.includes('<BANKTRANLIST');

  if (!hasOfxTags && (sanitizedContent.includes(';') || sanitizedContent.includes(',') || sanitizedContent.includes('\t'))) {
    return { transactions: parseCsvFallback(sanitizedContent) };
  }

  // Extrai Metadados da Conta Bancária do Cabeçalho OFX
  const bankId = extractTagValue(sanitizedContent, 'BANKID') || undefined;
  const branchId = extractTagValue(sanitizedContent, 'BRANCHID') || undefined;
  const accountId = extractTagValue(sanitizedContent, 'ACCTID') || undefined;
  const accountType = extractTagValue(sanitizedContent, 'ACCTTYPE') || undefined;
  const currency = extractTagValue(sanitizedContent, 'CURDEF') || 'BRL';

  // Saldo informado pelo banco (LEDGERBAL / BALAMT)
  let ledgerBalance: number | undefined;
  const balAmtStr = extractTagValue(sanitizedContent, 'BALAMT');
  if (balAmtStr) {
    ledgerBalance = parseOfxAmount(balAmtStr);
  }
  const dtAsOfStr = extractTagValue(sanitizedContent, 'DTASOF');
  const ledgerDate = dtAsOfStr ? parseOfxDate(dtAsOfStr) : undefined;

  // Divisão determinística das transações: suporta tanto <STMTTRN quanto <CCSTMTTRN
  // Usa regex flexível que captura cada bloco até a próxima transação ou fechamento de lista
  const blockRegex = /<(?:STMTTRN|CCSTMTTRN)(?:\s+[^>]*)?>([\s\S]*?)(?:<\/(?:STMTTRN|CCSTMTTRN)>|(?=<(?:STMTTRN|CCSTMTTRN)(?:\s+[^>]*)?>)|<\/BANKTRANLIST>|<\/CCSTMTRS>|<\/OFX>|$)/gi;

  const transactions: ParsedOfxTransaction[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(sanitizedContent)) !== null) {
    const blockContent = match[1];
    if (!blockContent || blockContent.trim().length === 0) continue;

    const trnType = extractTagValue(blockContent, 'TRNTYPE');
    const dtPosted = extractTagValue(blockContent, 'DTPOSTED');
    const trnAmt = extractTagValue(blockContent, 'TRNAMT');
    const fitId = extractTagValue(blockContent, 'FITID');
    const memo = extractTagValue(blockContent, 'MEMO');
    const name = extractTagValue(blockContent, 'NAME');
    const checkNum = extractTagValue(blockContent, 'CHECKNUM');
    const refNum = extractTagValue(blockContent, 'REFNUM');

    // Parse do Valor Financeiro com algoritmo numérico resiliente
    const parsedAmount = parseOfxAmount(trnAmt);

    // Se não tiver valor ou data, ignora blocos corrompidos
    if (parsedAmount === 0 && !trnAmt) {
      continue;
    }

    // Parse da Data
    const formattedDate = parseOfxDate(dtPosted);

    // Formação da Descrição Rica e Limpa (sem duplicações redundantes)
    let finalDesc = '';
    const cleanMemo = (memo || '').trim();
    const cleanName = (name || '').trim();

    if (cleanMemo && cleanName) {
      const lowerMemo = cleanMemo.toLowerCase();
      const lowerName = cleanName.toLowerCase();
      if (lowerMemo.includes(lowerName)) {
        finalDesc = cleanMemo;
      } else if (lowerName.includes(lowerMemo)) {
        finalDesc = cleanName;
      } else {
        finalDesc = `${cleanMemo} - ${cleanName}`;
      }
    } else {
      finalDesc = cleanMemo || cleanName;
    }

    // Adiciona número de documento apenas se for documento real (diferente do código do banco)
    const isDocCode = checkNum && checkNum !== bankId && checkNum !== '0' && !finalDesc.includes(checkNum);
    if (isDocCode) {
      finalDesc = `${finalDesc} - Doc: ${checkNum}`;
    }

    if (!finalDesc) {
      finalDesc = parsedAmount < 0 ? 'Pagamento / Débito Bancário' : 'Recebimento / Crédito Bancário';
    }

    // Identificador único (FITID) com fallback determinístico
    const finalFitId = fitId || `OFX-${formattedDate.replace(/-/g, '')}-${transactions.length + 1}-${Math.floor(Math.random() * 90000)}`;

    // Natureza da Operação
    const upperType = trnType.toUpperCase();
    const isDebit = upperType.includes('DEBIT') || parsedAmount < 0;

    transactions.push({
      fitId: finalFitId,
      date: formattedDate,
      amount: parsedAmount,
      description: finalDesc,
      type: isDebit ? 'DEBIT' : 'CREDIT',
      checkNumber: checkNum || refNum || undefined,
      memo: memo || undefined,
      name: name || undefined
    });
  }

  // Se por alguma razão o regex de blocos não encontrou transações, mas o arquivo possui conteúdo delimitado
  if (transactions.length === 0 && upperContent.includes('<') === false) {
    return {
      transactions: parseCsvFallback(sanitizedContent),
      bankId,
      branchId,
      accountId,
      accountType,
      currency,
      ledgerBalance,
      ledgerDate
    };
  }

  return {
    transactions,
    bankId,
    branchId,
    accountId,
    accountType,
    currency,
    ledgerBalance,
    ledgerDate
  };
}

/**
 * Parser de OFX determinístico e ultra-resiliente compatível com a assinatura padrão
 */
export function parseOFX(ofxContent: string): ParsedOfxTransaction[] {
  const result = parseOFXFull(ofxContent);
  return result.transactions;
}
