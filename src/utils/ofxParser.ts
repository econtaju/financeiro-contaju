export interface ParsedOfxTransaction {
  fitId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  type: 'CREDIT' | 'DEBIT' | 'OTHER';
}

export function parseOFX(ofxContent: string): ParsedOfxTransaction[] {
  const transactions: ParsedOfxTransaction[] = [];

  // Match each <STMTTRN>...</STMTTRN> block
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;

  while ((match = trnRegex.exec(ofxContent)) !== null) {
    const block = match[1];

    const trnTypeMatch = block.match(/<TRNTYPE>([^<\r\n]+)/i);
    const dtPostedMatch = block.match(/<DTPOSTED>([^<\r\n]+)/i);
    const trnAmtMatch = block.match(/<TRNAMT>([^<\r\n]+)/i);
    const fitIdMatch = block.match(/<FITID>([^<\r\n]+)/i);
    const memoMatch = block.match(/<MEMO>([^<\r\n]+)/i);
    const nameMatch = block.match(/<NAME>([^<\r\n]+)/i);

    let rawDate = dtPostedMatch ? dtPostedMatch[1].trim() : '';
    // Format YYYYMMDD to YYYY-MM-DD
    let formattedDate = new Date().toISOString().split('T')[0];
    if (rawDate.length >= 8) {
      const yyyy = rawDate.substring(0, 4);
      const mm = rawDate.substring(4, 6);
      const dd = rawDate.substring(6, 8);
      formattedDate = `${yyyy}-${mm}-${dd}`;
    }

    const rawAmount = trnAmtMatch ? parseFloat(trnAmtMatch[1].trim().replace(',', '.')) : 0;
    const desc = (memoMatch ? memoMatch[1].trim() : (nameMatch ? nameMatch[1].trim() : 'Lançamento OFX')).trim();
    const fitId = fitIdMatch ? fitIdMatch[1].trim() : `OFX-${Math.floor(Math.random() * 900000)}`;

    const typeStr = trnTypeMatch ? trnTypeMatch[1].trim().toUpperCase() : (rawAmount >= 0 ? 'CREDIT' : 'DEBIT');

    transactions.push({
      fitId,
      date: formattedDate,
      amount: rawAmount,
      description: desc,
      type: typeStr.includes('DEBIT') || rawAmount < 0 ? 'DEBIT' : 'CREDIT'
    });
  }

  return transactions;
}
