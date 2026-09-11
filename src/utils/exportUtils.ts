import * as XLSX from 'xlsx';

/**
 * Neutralizes potentially unsafe spreadsheet formula injection
 */
export function sanitizeCellValue(val: unknown): unknown {
  if (typeof val === 'string') {
    if (val.startsWith('=') || val.startsWith('+') || val.startsWith('-') || val.startsWith('@')) {
      return `'${val}`;
    }
  }
  return val;
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const sanitizedRows = rows.map(row => row.map(sanitizeCellValue));
  const csvContent = [
    headers.join(';'),
    ...sanitizedRows.map(row => row.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(';'))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(filename: string, sheetName: string, headers: string[], rows: (string | number)[][]) {
  const sanitizedRows = rows.map(row => row.map(sanitizeCellValue));
  const data = [headers, ...sanitizedRows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
