import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  X, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  PieChart, 
  DollarSign 
} from 'lucide-react';
import { DREMatrix } from '../../services/reportingEngine';
import { DRECashReconciliationSummary } from '../../services/reconciliationEngine';
import { formatBRL } from '../../services/financialEngine';
import { exportOnePageDRESummaryPDF } from '../../utils/pdfExportUtils';
import { storage } from '../../services/storageService';

interface DREOnePageSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  dreData: DREMatrix;
  effectiveYear: number;
  kpis: {
    grossRev: number;
    netRev: number;
    costs: number;
    grossProfit: number;
    opExpenses: number;
    opResult: number;
    finResult: number;
    netResult: number;
  };
  reconciliation: DRECashReconciliationSummary;
}

export const DREOnePageSummaryModal: React.FC<DREOnePageSummaryModalProps> = ({
  isOpen,
  onClose,
  dreData,
  effectiveYear,
  kpis,
  reconciliation
}) => {
  const [copied, setCopied] = useState(false);
  const company = storage.getCompany();

  if (!isOpen) return null;

  const grossMargin = kpis.netRev > 0 ? (kpis.grossProfit / kpis.netRev) * 100 : 0;
  const opMargin = kpis.netRev > 0 ? (kpis.opResult / kpis.netRev) * 100 : 0;
  const netMargin = kpis.netRev > 0 ? (kpis.netResult / kpis.netRev) * 100 : 0;

  // Filtrar linhas sintéticas para a tabela condensada
  const syntheticLines = dreData.lines.filter(l => l.level === 0 || l.isSummary);

  // Top ofensores de despesas
  const expenseLines = dreData.lines
    .filter(l => !l.isHeader && !l.isSummary && l.level > 0 && l.totalYear > 0)
    .sort((a, b) => b.totalYear - a.totalYear)
    .slice(0, 3);

  const handleDownloadPDF = () => {
    exportOnePageDRESummaryPDF(
      dreData,
      effectiveYear,
      company.companyName || company.tradeName,
      reconciliation,
      kpis
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `
CONTAJU • SUMÁRIO EXECUTIVO DRE (${effectiveYear})
Empresa: ${company.companyName || company.tradeName || 'Contaju Gestão'} (CNPJ: ${company.cnpj || '00.000.000/0001-00'})
--------------------------------------------------
• Receita Líquida: ${formatBRL(kpis.netRev)}
• Lucro Bruto: ${formatBRL(kpis.grossProfit)} (Margem: ${grossMargin.toFixed(1)}%)
• EBITDA Operacional: ${formatBRL(kpis.opResult)} (Margem: ${opMargin.toFixed(1)}%)
• Resultado Líquido: ${formatBRL(kpis.netResult)} (Margem: ${netMargin.toFixed(1)}%)
--------------------------------------------------
CONCILIAÇÃO CAIXA X COMPETÊNCIA:
• Realização de Receitas em Caixa: ${reconciliation.overallRevenueRealizationRate}%
• Vendas Pendentes de Recebimento: ${formatBRL(reconciliation.totalPendingRevenue)}
• Geração Operacional de Caixa: ${formatBRL(reconciliation.netOperatingCashGenerated)}
• Diagnóstico: ${reconciliation.riskTitle} (${reconciliation.riskLevel})
--------------------------------------------------
Gerado em ${new Date().toLocaleDateString('pt-BR')} via Contaju.
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-[var(--border-subtle)] flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:w-full">
        
        {/* Barra de Ações Superior (Oculta na impressão) */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex flex-wrap justify-between items-center gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Relatório Executivo One-Pager
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">Pronto para Reunião de Diretoria & Conselho</span>
              </div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Síntese Gerencial da DRE em Folha Única ({effectiveYear})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-xl border border-[var(--border-subtle)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copiar Resumo em Texto para WhatsApp ou E-mail"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copiado!' : 'Copiar Resumo'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-xl border border-[var(--border-subtle)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Imprimir visualização formatada"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Baixar PDF Executivo em Folha Única"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar PDF One-Pager</span>
            </button>

            <button 
              onClick={onClose} 
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--surface-card)] cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Folha do One-Pager (Simulação de Página Executiva A4) */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-xs bg-slate-900/50 dark:bg-[#0c1017]">
          
          {/* Header Corporativo do Relatório */}
          <div className="border-b-2 border-amber-500 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  CONTAJU • GESTÃO FINANCEIRA INTELIGENTE
                </span>
                <span className="text-[10px] text-slate-400 font-mono">CONFIDENCIAL</span>
              </div>
              <h1 className="text-xl font-black text-slate-100 mt-1">
                {company.companyName || company.tradeName || 'Contaju Soluções e Gestão'}
              </h1>
              <div className="text-[11px] text-slate-400 mt-0.5">
                CNPJ: {company.cnpj || '00.000.000/0001-00'} • Regime Contábil: <strong>Competência</strong>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-400 space-y-0.5">
              <div>Exercício Fiscal: <strong className="text-amber-400 text-sm font-mono">{effectiveYear}</strong></div>
              <div>Data de Emissão: <strong className="text-slate-200">{new Date().toLocaleDateString('pt-BR')}</strong></div>
              <div>Finalidade: <strong className="text-slate-200">Apresentação para Diretoria & Conselho</strong></div>
            </div>
          </div>

          {/* Bloco 1: 4 KPIs Executivos Vitais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* KPI 1: Receita Líquida */}
            <div className="p-3.5 rounded-xl border border-slate-700/80 bg-slate-800/40">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Receita Líquida</span>
              <div className="text-base sm:text-lg font-mono font-black text-slate-100 mt-1">
                {formatBRL(kpis.netRev)}
              </div>
              <span className="text-[10px] text-slate-400">100% da Base Operacional</span>
            </div>

            {/* KPI 2: Lucro Bruto */}
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10">
              <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">(=) Lucro Bruto</span>
              <div className="text-base sm:text-lg font-mono font-black text-amber-300 mt-1">
                {formatBRL(kpis.grossProfit)}
              </div>
              <span className="text-[10px] text-amber-400/90 font-medium">Margem Bruta: {grossMargin.toFixed(1)}%</span>
            </div>

            {/* KPI 3: EBITDA */}
            <div className="p-3.5 rounded-xl border border-slate-700/80 bg-slate-800/40">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">(=) EBITDA Operacional</span>
              <div className="text-base sm:text-lg font-mono font-black text-slate-100 mt-1">
                {formatBRL(kpis.opResult)}
              </div>
              <span className="text-[10px] text-slate-400">Margem EBITDA: {opMargin.toFixed(1)}%</span>
            </div>

            {/* KPI 4: Resultado Líquido */}
            <div className={`p-3.5 rounded-xl border ${
              kpis.netResult >= 0 ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                kpis.netResult >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                (=) Resultado Líquido
              </span>
              <div className={`text-base sm:text-lg font-mono font-black mt-1 ${
                kpis.netResult >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}>
                {kpis.netResult >= 0 ? '+' : ''}{formatBRL(kpis.netResult)}
              </div>
              <span className={`text-[10px] font-medium ${
                kpis.netResult >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'
              }`}>
                Margem Líquida: {netMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Bloco 2: Estrutura da DRE Sintética e Painel de Diagnóstico Lado a Lado */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Lado Esquerdo: DRE Sintética Estruturada (7 colunas) */}
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-700">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  DRE Sintética do Exercício ({effectiveYear})
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Valores em R$ • % AV</span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-2.5">Cód</th>
                      <th className="py-2 px-2.5">Descrição</th>
                      <th className="py-2 px-2.5 text-right">Total (R$)</th>
                      <th className="py-2 px-2.5 text-right">% AV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {syntheticLines.map(line => {
                      const av = kpis.grossRev > 0 ? (line.totalYear / kpis.grossRev) * 100 : 0;
                      const isSub = line.name.includes('(=)') || line.name.includes('LUCRO') || line.name.includes('RESULTADO');
                      return (
                        <tr key={line.id} className={isSub ? 'bg-amber-500/5 font-bold' : ''}>
                          <td className="py-1.5 px-2.5 text-[10px] text-amber-400 font-bold">{line.code || '-'}</td>
                          <td className={`py-1.5 px-2.5 font-sans ${isSub ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                            {line.name}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-bold text-slate-200">
                            {formatBRL(line.totalYear)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right text-slate-400 text-[11px]">
                            {line.totalYear !== 0 ? `${av.toFixed(1)}%` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Linha 9: Resultado Líquido */}
                    <tr className="bg-amber-500/20 font-black border-t-2 border-amber-500">
                      <td className="py-2 px-2.5 text-amber-400 font-extrabold">9</td>
                      <td className="py-2 px-2.5 font-sans text-amber-300 uppercase">(=) RESULTADO LÍQUIDO</td>
                      <td className={`py-2 px-2.5 text-right font-black ${
                        kpis.netResult >= 0 ? 'text-amber-300' : 'text-rose-400'
                      }`}>
                        {kpis.netResult >= 0 ? '+' : ''}{formatBRL(kpis.netResult)}
                      </td>
                      <td className="py-2 px-2.5 text-right text-amber-300 font-bold">
                        {kpis.grossRev > 0 ? `${((kpis.netResult / kpis.grossRev) * 100).toFixed(1)}%` : '0%'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lado Direito: Diagnóstico de Caixa x Competência & Top Gastos (5 colunas) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Card 1: Conciliação Caixa x Competência (Sugestão 2) */}
              <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                  <span className="font-bold text-xs text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Conciliação Caixa vs Competência
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                    reconciliation.riskLevel === 'CRITICO' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    reconciliation.riskLevel === 'ALERTA' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {reconciliation.riskTitle}
                  </span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Taxa de Realização de Receitas:</span>
                    <strong className="font-mono text-slate-100">{reconciliation.overallRevenueRealizationRate}%</strong>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        reconciliation.overallRevenueRealizationRate >= 80 ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(reconciliation.overallRevenueRealizationRate, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-1">
                    <span className="text-slate-400">Vendas Retidas em Aberto:</span>
                    <strong className="font-mono text-amber-300">{formatBRL(reconciliation.totalPendingRevenue)}</strong>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Geração Operacional de Caixa:</span>
                    <strong className={`font-mono ${
                      reconciliation.netOperatingCashGenerated >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatBRL(reconciliation.netOperatingCashGenerated)}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Descasamento (Gap de Liquidez):</span>
                    <strong className="font-mono text-slate-300">{formatBRL(reconciliation.cashGap)}</strong>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-black/20 text-[10px] text-slate-400 border border-slate-700/50">
                  <span className="font-bold text-slate-300">Recomendação Estratégica: </span>
                  {reconciliation.recommendedAction}
                </div>
              </div>

              {/* Card 2: Top Ofensores de Custos e Despesas */}
              <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 space-y-2.5">
                <span className="font-bold text-xs text-slate-200 uppercase tracking-tight flex items-center gap-1.5 pb-1.5 border-b border-slate-700">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  Top 3 Maiores Contas de Custo / Despesa
                </span>

                <div className="space-y-2">
                  {expenseLines.map((exp, idx) => {
                    const av = kpis.grossRev > 0 ? (exp.totalYear / kpis.grossRev) * 100 : 0;
                    return (
                      <div key={exp.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800 text-[11px]">
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-slate-200 truncate">
                            {idx + 1}. {exp.name}
                          </div>
                          <span className="text-[10px] text-slate-400">Part. Faturamento: {av.toFixed(1)}%</span>
                        </div>
                        <div className="text-right font-mono font-bold text-rose-300 shrink-0">
                          {formatBRL(exp.totalYear)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* Rodapé Interno da Página */}
          <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400">
            <span>Documento Sintético Oficial • Contaju Intelligence v2.6 • Exercício {effectiveYear}</span>
            <span>Página 1 de 1 • Gerado em {new Date().toLocaleTimeString('pt-BR')}</span>
          </div>

        </div>

      </div>
    </div>
  );
};
