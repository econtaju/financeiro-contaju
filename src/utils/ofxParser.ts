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

/**
 * Normaliza e formata datas extraídas de extratos OFX (ex.: 20261014120000[-3:BRT] ou 20261014)
 */
function parseOfxDate(rawDateStr: string): string {
  if (!rawDateStr) {
    return new Date().toISOString().split('T')[0];
  }

  // Remove caracteres de timezone ou colchetes, ex: [-3:BRT]
  const cleanStr = rawDateStr.replace(/\[.*?\]/g, '').trim();

  // Padrão clássico OFX: YYYYMMDD ou YYYYMMDDHHMMSS
  const matchYmd = cleanStr.match(/^(\d{4})(\d{2})(\d{2})/);
  if (matchYmd) {
    const [, yyyy, mm, dd] = matchYmd;
    // Validação básica de intervalo de mês e dia
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
 * Extrai o valor de uma tag simples OFX tanto no formato SGML (sem fechamento) quanto XML
 * Ex: <TRNAMT>-150.00 ou <TRNAMT>-150.00</TRNAMT>
 */
function extractTagValue(block: string, tagName: string): string {
  // Procura pela tag <TAGNAME> até a próxima tag '<' ou quebra de linha
  const regex = new RegExp(`<${tagName}>([^<\r\n]+)`, 'i');
  const match = block.match(regex);
  if (match && match[1]) {
    return match[1].trim();
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
    const rawDesc = cols[descIdx] || 'Lançamento Bancário';
    const rawValStr = (cols[amountIdx] || '0').replace(/R\$\s*/gi, '').replace(/\./g, '').replace(',', '.');
    const val = parseFloat(rawValStr);

    if (isNaN(val) || val === 0) continue;

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
 * Parser de OFX determinístico e ultra-resiliente
 * Compatível com OFX 1.02 SGML (bancos brasileiros que NÃO fecham tags) e OFX 2.x XML
 * Sem risco de backtracking catastrófico ou travamento de interface!
 */
export function parseOFX(ofxContent: string): ParsedOfxTransaction[] {
  if (!ofxContent || typeof ofxContent !== 'string') {
    return [];
  }

  // Se o conteúdo parecer CSV puro (sem tags <OFX> ou <STMTTRN>), tenta o parser de contingência CSV
  if (!ofxContent.includes('<') && (ofxContent.includes(';') || ofxContent.includes(','))) {
    return parseCsvFallback(ofxContent);
  }

  // Se tem tags, mas não tem <STMTTRN> (ex: CSV com HTML ou extrato diferente)
  if (!ofxContent.toUpperCase().includes('<STMTTRN')) {
    const csvResult = parseCsvFallback(ofxContent);
    if (csvResult.length > 0) return csvResult;
  }

  const transactions: ParsedOfxTransaction[] = [];

  // Divide o arquivo por blocos a partir de <STMTTRN> de forma determinística O(n)
  // Cada item do array corresponde a uma transação até o início da próxima
  const rawBlocks = ofxContent.split(/<STMTTRN>/i).slice(1);

  if (rawBlocks.length === 0) {
    // Tenta fallback com split case-sensitive ou busca por tags menores
    const fallbackBlocks = ofxContent.split(/<STMTTRN/i).slice(1);
    if (fallbackBlocks.length === 0) {
      return parseCsvFallback(ofxContent);
    }
  }

  const blocksToProcess = rawBlocks.length > 0 ? rawBlocks : ofxContent.split(/<STMTTRN/i).slice(1);

  for (let idx = 0; idx < blocksToProcess.length; idx++) {
    const block = blocksToProcess[idx];

    // Limpa o bloco cortando se houver fechamento de lista </BANKTRANLIST> ou </OFX>
    const cleanBlock = block.split(/<\/BANKTRANLIST>/i)[0].split(/<\/OFX>/i)[0];

    const trnType = extractTagValue(cleanBlock, 'TRNTYPE');
    const dtPosted = extractTagValue(cleanBlock, 'DTPOSTED');
    const trnAmt = extractTagValue(cleanBlock, 'TRNAMT');
    const fitId = extractTagValue(cleanBlock, 'FITID');
    const memo = extractTagValue(cleanBlock, 'MEMO');
    const name = extractTagValue(cleanBlock, 'NAME');
    const checkNum = extractTagValue(cleanBlock, 'CHECKNUM');
    const refNum = extractTagValue(cleanBlock, 'REFNUM');

    // Parse do Valor Financeiro
    // Trata valores com vírgula ou ponto (ex: -1250,50 ou -1250.50)
    let parsedAmount = 0;
    if (trnAmt) {
      const sanitizedAmt = trnAmt.replace(/[^\d.,+-]/g, '').replace(',', '.');
      parsedAmount = parseFloat(sanitizedAmt);
      if (isNaN(parsedAmount)) parsedAmount = 0;
    }

    // Se o valor for 0, tenta encontrar em tags alternativas
    if (parsedAmount === 0 && !trnAmt) {
      continue;
    }

    // Parse da Data de Compensação
    const formattedDate = parseOfxDate(dtPosted);

    // Formação da Descrição Rica e Limpa
    const descriptionParts: string[] = [];
    if (memo) descriptionParts.push(memo);
    if (name && name !== memo) descriptionParts.push(name);
    if (checkNum && !descriptionParts.some(d => d.includes(checkNum))) {
      descriptionParts.push(`Doc: ${checkNum}`);
    }
    if (refNum && !descriptionParts.some(d => d.includes(refNum))) {
      descriptionParts.push(`Ref: ${refNum}`);
    }

    let finalDesc = descriptionParts.join(' - ').trim();
    if (!finalDesc) {
      finalDesc = parsedAmount < 0 ? 'Pagamento / Débito Bancário' : 'Recebimento / Crédito Bancário';
    }

    // Identificador único (FITID) com fallback seguro
    const finalFitId = fitId || `OFX-${formattedDate.replace(/-/g, '')}-${idx + 1}-${Math.floor(Math.random() * 90000)}`;

    // Natureza da Operação (Débito vs Crédito)
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

  return transactions;
}
