import { 
  BankStatementEntry, 
  FinancialTitle, 
  Counterparty, 
  ReconciliationMatchResult, 
  ReconciliationMatchConfidence 
} from '../types';
import { normalizeForSearch } from '../utils/searchUtils';

// Stop words bancárias irrelevantes em extratos brasileiros
const BANK_STOP_WORDS = new Set([
  'pix', 'ted', 'doc', 'transf', 'transferencia', 'pagto', 'pagamento', 'pgto',
  'eletronico', 'rec', 'recebimento', 'compra', 'debito', 'credito', 'tarifa',
  'bancaria', 'aut', 'terminal', 'banco', 'sa', 'ltda', 'me', 'epp', 'eireli',
  'cia', 'cc', 'ag', 'cta', 'dep', 'deposito', 'liq', 'cobranca', 'bb', 'itau',
  'bradesco', 'santander', 'inter', 'nubank', 'sicoob', 'sicredi', 'caixa',
  'cx', 'extrato', 'lancamento', 'operacao', 'ref', 'chq', 'cheque'
]);

/**
 * Limpa e higieniza histórico de extrato bancário removendo códigos e stop words
 */
export function cleanBankDescription(raw: string): { cleaned: string; tokens: string[]; docDigits: string } {
  if (!raw) return { cleaned: '', tokens: [], docDigits: '' };

  // Extrai dígitos para possível CPF/CNPJ (ex: 8 dígitos ou mais)
  const allDigits = raw.replace(/\D/g, '');
  const docDigits = allDigits.length >= 8 ? allDigits : '';

  // Normaliza string (remove acentos, pontuações e põe em minúsculas)
  const normalized = normalizeForSearch(raw);

  // Divide em palavras e filtra stop words bancárias e palavras com 1 ou 2 letras
  const tokens = normalized
    .split(/\s+/)
    .filter(t => t.length > 2 && !BANK_STOP_WORDS.has(t));

  return {
    cleaned: tokens.join(' '),
    tokens,
    docDigits
  };
}

/**
 * Calcula a similaridade detalhada entre um lançamento do extrato bancário e um título do ERP
 */
export function calculateReconciliationSimilarity(
  stmt: BankStatementEntry,
  title: FinancialTitle,
  counterparty?: Counterparty
): ReconciliationMatchResult {
  const isStmtDebit = stmt.amount < 0;
  const isTitlePagar = title.type === 'PAGAR';

  // REGRA ELIMINATÓRIA 1: Incompatibilidade contábil (Débito no banco DEVE ser Pagar no ERP, Crédito DEVE ser Receber)
  if (isStmtDebit !== isTitlePagar) {
    return createZeroMatch('Natureza contábil oposta');
  }

  // REGRA ELIMINATÓRIA 2: Título já liquidado (a não ser que já seja o próprio par conciliado)
  if (title.settlementState === 'LIQUIDADO' && stmt.matchedTitleId !== title.id) {
    return createZeroMatch('Título já liquidado');
  }

  // =========================================================================
  // 1. CRITÉRIO VALOR (0 a 50 pontos)
  // =========================================================================
  const stmtAbsAmount = Math.abs(stmt.amount);
  const targetTitleAmount = title.balancePrincipal > 0 ? title.balancePrincipal : title.originalAmount;
  const diffAmount = Math.abs(stmtAbsAmount - targetTitleAmount);

  let amountScore = 0;
  let amountSummary = '';

  if (diffAmount <= 0.01) {
    amountScore = 50;
    amountSummary = 'Mesmo valor';
  } else if (diffAmount <= 0.05) {
    amountScore = 47;
    amountSummary = `Centavos de dif. (R$ ${diffAmount.toFixed(2)})`;
  } else if (diffAmount <= 5.00 || (targetTitleAmount > 0 && diffAmount <= targetTitleAmount * 0.01)) {
    // Tolerância para tarifas bancárias retidas de boletos ou encargos leves
    amountScore = 38;
    amountSummary = `Dif. de R$ ${diffAmount.toFixed(2)} (tarifa/taxa)`;
  } else if (targetTitleAmount > 0 && diffAmount <= targetTitleAmount * 0.05) {
    amountScore = 25;
    amountSummary = `Variação até 5% (R$ ${diffAmount.toFixed(2)})`;
  } else if (targetTitleAmount > 0 && diffAmount <= targetTitleAmount * 0.10) {
    amountScore = 12;
    amountSummary = `Variação até 10% (R$ ${diffAmount.toFixed(2)})`;
  } else {
    amountScore = 0;
    amountSummary = `Diferença grande de valor (R$ ${diffAmount.toFixed(2)})`;
  }

  // =========================================================================
  // 2. CRITÉRIO DATA (0 a 30 pontos)
  // =========================================================================
  // Compara contra a data mais favorável: expectedCashDate ou dueDate
  const stmtDateMs = new Date(stmt.date).getTime();
  const dueDateMs = new Date(title.dueDate).getTime();
  const cashDateMs = title.expectedCashDate ? new Date(title.expectedCashDate).getTime() : dueDateMs;

  const diffDaysDue = Math.abs(stmtDateMs - dueDateMs) / (1000 * 3600 * 24);
  const diffDaysCash = Math.abs(stmtDateMs - cashDateMs) / (1000 * 3600 * 24);
  const minDayDiff = Math.min(diffDaysDue, diffDaysCash);

  let dateScore = 0;
  let dateSummary = '';

  if (minDayDiff <= 0.1) {
    dateScore = 30;
    dateSummary = 'Mesma data';
  } else if (minDayDiff <= 1.1) {
    dateScore = 27;
    dateSummary = '1 dia de diferença';
  } else if (minDayDiff <= 3.1) {
    // Janela de compensação bancária de final de semana (sexta -> segunda)
    dateScore = 22;
    dateSummary = `${Math.round(minDayDiff)} dias dif. (fim de semana)`;
  } else if (minDayDiff <= 5.1) {
    dateScore = 15;
    dateSummary = `${Math.round(minDayDiff)} dias de diferença`;
  } else if (minDayDiff <= 10.1) {
    dateScore = 8;
    dateSummary = `${Math.round(minDayDiff)} dias de diferença`;
  } else if (minDayDiff <= 20.1) {
    dateScore = 3;
    dateSummary = `${Math.round(minDayDiff)} dias de diferença`;
  } else {
    dateScore = 0;
    dateSummary = 'Data distante (>20 dias)';
  }

  // =========================================================================
  // 3. CRITÉRIO DESCRIÇÃO / ENTIDADE / FAVORECIDO / BOLETO (0 a 20 pontos)
  // =========================================================================
  const bankInfo = cleanBankDescription(stmt.description);
  let descriptionScore = 0;
  let descriptionSummary = '';
  let isBoletoMatched = false;

  // 3.0 Checa correspondência por Linha Digitável, Código de Barras ou Nosso Número de Boleto
  const rawBarcode = (title.barcode || '').replace(/\D/g, '');
  const rawDocNum = (title.bankDocumentNumber || '').replace(/\D/g, '');
  const rawStmtDoc = (stmt.documentNumber || '').replace(/\D/g, '');
  const rawStmtDescDigits = stmt.description.replace(/\D/g, '');

  if (rawBarcode && rawBarcode.length >= 8) {
    const barcodeTail = rawBarcode.slice(-10); // últimos 10 dígitos frequentemente presentes no extrato/retorno
    if (
      (rawStmtDoc && (rawStmtDoc.includes(rawBarcode) || rawBarcode.includes(rawStmtDoc) || (rawStmtDoc.length >= 6 && rawBarcode.includes(rawStmtDoc)))) ||
      (rawStmtDescDigits && (rawStmtDescDigits.includes(rawBarcode) || rawStmtDescDigits.includes(barcodeTail)))
    ) {
      descriptionScore = 20;
      descriptionSummary = 'Boleto / Linha Digitável Coincidente';
      isBoletoMatched = true;
    }
  }

  if (!isBoletoMatched && rawDocNum && rawDocNum.length >= 4) {
    if (
      (rawStmtDoc && (rawStmtDoc === rawDocNum || rawStmtDoc.includes(rawDocNum) || rawDocNum.includes(rawStmtDoc))) ||
      (rawStmtDescDigits && rawStmtDescDigits.includes(rawDocNum))
    ) {
      descriptionScore = 20;
      descriptionSummary = `Nosso Número / Doc Bancário ${title.bankDocumentNumber} Confirmado`;
      isBoletoMatched = true;
    }
  }

  // 3.1 Checa correspondência por CNPJ/CPF se houver dígitos no extrato
  if (!isBoletoMatched) {
    const rawDoc = counterparty?.document || (counterparty as any)?.taxId || '';
    if (rawDoc && bankInfo.docDigits) {
      const cleanDoc = rawDoc.replace(/\D/g, '');
      if (cleanDoc && (bankInfo.docDigits.includes(cleanDoc) || cleanDoc.includes(bankInfo.docDigits))) {
        descriptionScore = 20;
        descriptionSummary = `Documento ${rawDoc} identificado`;
      }
    }
  }

  // 3.2 Se não houve match por documento, avalia correspondência textual
  if (descriptionScore === 0) {
    const titleTokens = normalizeForSearch(`${title.description} ${title.titleNumber}`)
      .split(/\s+/)
      .filter(t => t.length > 2);

    const cpTokens = counterparty 
      ? normalizeForSearch(`${counterparty.name} ${counterparty.tradeName || ''}`)
          .split(/\s+/)
          .filter(t => t.length > 2 && !BANK_STOP_WORDS.has(t))
      : [];

    const allTargetTokens = Array.from(new Set([...titleTokens, ...cpTokens]));

    // Conta tokens em comum
    let matchesCount = 0;
    let hasFavorecidoMatch = false;

    for (const bToken of bankInfo.tokens) {
      if (allTargetTokens.some(t => t === bToken || (t.length > 3 && (t.includes(bToken) || bToken.includes(t))))) {
        matchesCount++;
        if (cpTokens.some(ct => ct === bToken || (ct.length > 3 && (ct.includes(bToken) || bToken.includes(ct))))) {
          hasFavorecidoMatch = true;
        }
      }
    }

    if (hasFavorecidoMatch && matchesCount >= 2) {
      descriptionScore = 20;
      descriptionSummary = `Favorecido confirmado (${counterparty?.tradeName || counterparty?.name})`;
    } else if (hasFavorecidoMatch) {
      descriptionScore = 16;
      descriptionSummary = `Favorecido identificado (${counterparty?.tradeName || counterparty?.name})`;
    } else if (matchesCount >= 2) {
      descriptionScore = 14;
      descriptionSummary = 'Descrição semelhante';
    } else if (matchesCount === 1) {
      descriptionScore = 8;
      descriptionSummary = 'Palavra-chave coincidente';
    } else {
      descriptionScore = 0;
      descriptionSummary = 'Sem texto em comum';
    }
  }

  // =========================================================================
  // PONTUAÇÃO CONSOLIDADA E CLASSIFICAÇÃO
  // =========================================================================
  let totalScore = Math.min(100, Math.round(amountScore + dateScore + descriptionScore));

  // Se o boleto / linha digitável bateu e o valor é exato, garantia de 100%
  if (isBoletoMatched && diffAmount <= 0.05) {
    totalScore = 100;
  }

  let confidence: ReconciliationMatchConfidence = 'BAIXA';
  if (totalScore >= 90) {
    confidence = 'MUITO_FORTE';
  } else if (totalScore >= 75) {
    confidence = 'FORTE';
  } else if (totalScore >= 60) {
    confidence = 'POSSIVEL';
  }

  const isHighlighted = totalScore >= 60;

  // Monta resumo visual conciso
  const summaryParts: string[] = [];
  if (isBoletoMatched) {
    summaryParts.push('Boleto / Linha Digitável Confirmada');
  }
  if (amountScore >= 45) summaryParts.push('Mesmo valor');
  else if (amountScore >= 35) summaryParts.push('Valor próximo');

  if (dateScore >= 27) summaryParts.push(dateSummary);
  else if (dateScore >= 20) summaryParts.push(dateSummary);

  if (!isBoletoMatched && descriptionScore >= 14) summaryParts.push(descriptionSummary);

  const summaryBadge = summaryParts.length > 0 ? summaryParts.join(' • ') : 'Pouca aderência';

  return {
    score: totalScore,
    confidence,
    isHighlighted,
    breakdown: {
      amountScore,
      dateScore,
      descriptionScore,
      amountSummary,
      dateSummary,
      descriptionSummary
    },
    summaryBadge
  };
}

/**
 * Cria resultado com score zero para casos eliminatórios
 */
function createZeroMatch(reason: string): ReconciliationMatchResult {
  return {
    score: 0,
    confidence: 'BAIXA',
    isHighlighted: false,
    breakdown: {
      amountScore: 0,
      dateScore: 0,
      descriptionScore: 0,
      amountSummary: reason,
      dateSummary: '-',
      descriptionSummary: '-'
    },
    summaryBadge: reason
  };
}

/**
 * Classifica e ordena títulos do ERP em relação a um extrato bancário selecionado.
 * Prioriza candidatos com score >= 60% e mantém os demais acessíveis.
 */
export function rankCandidateTitles(
  stmt: BankStatementEntry,
  titles: FinancialTitle[],
  counterparties: Counterparty[]
): Array<{ title: FinancialTitle; match: ReconciliationMatchResult }> {
  const counterpartyMap = new Map<string, Counterparty>();
  for (const cp of counterparties) {
    counterpartyMap.set(cp.id, cp);
  }

  const targetType = stmt.amount < 0 ? 'PAGAR' : 'RECEBER';

  // Filtra títulos do mesmo tipo que ainda estão em aberto (ou que já foram vinculados a este extrato)
  const candidateTitles = titles.filter(t => {
    if (t.type !== targetType) return false;
    if (t.settlementState === 'LIQUIDADO' && stmt.matchedTitleId !== t.id) return false;
    return true;
  });

  const scored = candidateTitles.map(t => {
    const cp = counterpartyMap.get(t.counterpartyId);
    const match = calculateReconciliationSimilarity(stmt, t, cp);
    return { title: t, match };
  });

  // Ordena prioritariamente por:
  // 1. Destaque (score >= 60% vem primeiro)
  // 2. Maior score para menor score
  // 3. Data de vencimento mais próxima em caso de empate
  scored.sort((a, b) => {
    if (a.match.isHighlighted && !b.match.isHighlighted) return -1;
    if (!a.match.isHighlighted && b.match.isHighlighted) return 1;
    if (b.match.score !== a.match.score) return b.match.score - a.match.score;
    return a.title.dueDate.localeCompare(b.title.dueDate);
  });

  return scored;
}

/**
 * Classifica e ordena extratos bancários em relação a um título selecionado no ERP (bidirecionalidade).
 */
export function rankCandidateStatements(
  title: FinancialTitle,
  statements: BankStatementEntry[],
  counterparty?: Counterparty
): Array<{ statement: BankStatementEntry; match: ReconciliationMatchResult }> {
  const scored = statements.map(s => {
    const match = calculateReconciliationSimilarity(s, title, counterparty);
    return { statement: s, match };
  });

  // Ordena prioritariamente por destaque (score >= 60%), maior score, e data mais recente
  scored.sort((a, b) => {
    if (a.match.isHighlighted && !b.match.isHighlighted) return -1;
    if (!a.match.isHighlighted && b.match.isHighlighted) return 1;
    if (b.match.score !== a.match.score) return b.match.score - a.match.score;
    return b.statement.date.localeCompare(a.statement.date);
  });

  return scored;
}
