import React, { useState } from 'react';
import { FileSpreadsheet, Download, AlertTriangle, Users, PieChart, Filter } from 'lucide-react';
import { storage } from '../../services/storageService';
import { formatBRL, formatDateBR } from '../../services/financialEngine';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';

export const ReportsView: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'AGING' | 'TOP_CLIENTS' | 'EXPENSE_CATEGORIES'>('AGING');
  const today = new Date().toISOString().split('T')[0];

  const titles = storage.getTitles();
  const counterparties = storage.getCounterparties();
  const chartAccounts = storage.getChartAccounts();

  // 1. Aging List (Inadimplência por faixa de atraso)
  const overdueTitles = titles.filter(t => t.type === 'RECEBER' && t.balancePrincipal > 0 && t.dueDate < today);

  const agingBuckets = {
    '1_30': { label: '1 a 30 dias', total: 0, items: [] as typeof overdueTitles },
    '31_60': { label: '31 a 60 dias', total: 0, items: [] as typeof overdueTitles },
    '61_90': { label: '61 a 90 dias', total: 0, items: [] as typeof overdueTitles },
    '90_plus': { label: 'Acima de 90 dias', total: 0, items: [] as typeof overdueTitles },
  };

  const todayDate = new Date(today);
  overdueTitles.forEach(t => {
    const due = new Date(t.dueDate);
    const diffDays = Math.floor((todayDate.getTime() - due.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 30) {
      agingBuckets['1_30'].total += t.balancePrincipal;
      agingBuckets['1_30'].items.push(t);
    } else if (diffDays <= 60) {
      agingBuckets['31_60'].total += t.balancePrincipal;
      agingBuckets['31_60'].items.push(t);
    } else if (diffDays <= 90) {
      agingBuckets['61_90'].total += t.balancePrincipal;
      agingBuckets['61_90'].items.push(t);
    } else {
      agingBuckets['90_plus'].total += t.balancePrincipal;
      agingBuckets['90_plus'].items.push(t);
    }
  });

  // 2. Top Clients by Revenue
  const clientsMap: Record<string, { name: string; document: string; totalRevenue: number; openBalance: number }> = {};
  titles.filter(t => t.type === 'RECEBER').forEach(t => {
    const c = counterparties.find(cp => cp.id === t.counterpartyId);
    if (!clientsMap[t.counterpartyId]) {
      clientsMap[t.counterpartyId] = {
        name: c?.name || 'Cliente',
        document: c?.document || '',
        totalRevenue: 0,
        openBalance: 0
      };
    }
    clientsMap[t.counterpartyId].totalRevenue += t.originalAmount;
    clientsMap[t.counterpartyId].openBalance += t.balancePrincipal;
  });

  const topClients = Object.values(clientsMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // 3. Expense Breakdown by Category
  const expenseMap: Record<string, { code: string; name: string; total: number }> = {};
  titles.filter(t => t.type === 'PAGAR').forEach(t => {
    const acc = chartAccounts.find(a => a.id === t.accountId);
    const code = acc?.code || '9.9.9';
    const name = acc?.name || 'Outras Despesas';

    if (!expenseMap[code]) {
      expenseMap[code] = { code, name, total: 0 };
    }
    expenseMap[code].total += t.originalAmount;
  });

  const expenseCategories = Object.values(expenseMap).sort((a, b) => b.total - a.total);

  const handleExport = () => {
    if (activeReport === 'AGING') {
      const headers = ['Título', 'Cliente', 'Vencimento', 'Dias em Atraso', 'Saldo Vencido'];
      const rows = overdueTitles.map(t => {
        const c = counterparties.find(cp => cp.id === t.counterpartyId);
        const due = new Date(t.dueDate);
        const diffDays = Math.floor((todayDate.getTime() - due.getTime()) / (1000 * 3600 * 24));
        return [t.titleNumber, c?.name || 'Cliente', t.dueDate, diffDays, t.balancePrincipal];
      });
      exportToExcel(`relatorio-aging-${today}`, 'Inadimplência Aging', headers, rows);
    } else if (activeReport === 'TOP_CLIENTS') {
      const headers = ['Cliente', 'Documento', 'Faturamento Total', 'Saldo em Aberto'];
      const rows = topClients.map(c => [c.name, c.document, c.totalRevenue, c.openBalance]);
      exportToExcel(`ranking-clientes-${today}`, 'Top Clientes', headers, rows);
    } else {
      const headers = ['Código', 'Conta / Categoria', 'Total Despesas'];
      const rows = expenseCategories.map(e => [e.code, e.name, e.total]);
      exportToExcel(`despesas-por-categoria-${today}`, 'Despesas', headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Relatórios Gerenciais Especializados</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Análise aprofundada de inadimplência (Aging List), concentração de carteira e composição de despesas.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors flex items-center shadow-2xs"
        >
          <Download className="w-4 h-4 mr-1.5 text-slate-600" />
          Exportar Relatório Ativo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 text-xs">
        <button
          onClick={() => setActiveReport('AGING')}
          className={`pb-3 px-4 font-semibold transition-colors border-b-2 ${
            activeReport === 'AGING'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Faixas de Atraso (Aging List)
        </button>
        <button
          onClick={() => setActiveReport('TOP_CLIENTS')}
          className={`pb-3 px-4 font-semibold transition-colors border-b-2 ${
            activeReport === 'TOP_CLIENTS'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Ranking de Faturamento por Cliente
        </button>
        <button
          onClick={() => setActiveReport('EXPENSE_CATEGORIES')}
          className={`pb-3 px-4 font-semibold transition-colors border-b-2 ${
            activeReport === 'EXPENSE_CATEGORIES'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Despesas por Categoria Analítica
        </button>
      </div>

      {/* 1. AGING LIST */}
      {activeReport === 'AGING' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {Object.entries(agingBuckets).map(([key, bucket]) => (
              <div key={key} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-xs text-slate-700 font-medium">{bucket.label}</span>
                <div className="text-lg font-bold text-rose-700 mt-1">{formatBRL(bucket.total)}</div>
                <span className="text-[11px] text-slate-700">{bucket.items.length} títulos vencidos</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Títulos em Atraso Detalhados ({overdueTitles.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Título</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4">Vencimento</th>
                    <th className="py-2.5 px-4 text-center">Dias em Atraso</th>
                    <th className="py-2.5 px-4 text-right">Saldo Vencido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overdueTitles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-700">
                        Nenhum título em atraso na carteira! Parabéns pela adimplência.
                      </td>
                    </tr>
                  ) : (
                    overdueTitles.map(t => {
                      const c = counterparties.find(cp => cp.id === t.counterpartyId);
                      const due = new Date(t.dueDate);
                      const diffDays = Math.floor((todayDate.getTime() - due.getTime()) / (1000 * 3600 * 24));

                      return (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-medium text-slate-900">{t.titleNumber}</td>
                          <td className="py-2.5 px-4 text-slate-800 font-medium">{c?.name || 'Cliente'}</td>
                          <td className="py-2.5 px-4 text-slate-600">{formatDateBR(t.dueDate)}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-rose-700">
                            +{diffDays} dias
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-rose-700">
                            {formatBRL(t.balancePrincipal)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. TOP CLIENTS */}
      {activeReport === 'TOP_CLIENTS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Ranking de Clientes por Faturamento Emitido
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Posição</th>
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4">Documento</th>
                  <th className="py-2.5 px-4 text-right">Faturamento Acumulado</th>
                  <th className="py-2.5 px-4 text-right">Saldo em Aberto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topClients.map((client, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-700">#{idx + 1}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{client.name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">{client.document}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-indigo-700">
                      {formatBRL(client.totalRevenue)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">
                      {formatBRL(client.openBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. EXPENSE CATEGORIES */}
      {activeReport === 'EXPENSE_CATEGORIES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Despesas e Custos por Categoria do Plano de Contas
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Código Contábil</th>
                  <th className="py-2.5 px-4">Conta / Rubrica</th>
                  <th className="py-2.5 px-4 text-right">Total Provisionado (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenseCategories.map(exp => (
                  <tr key={exp.code} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-700">{exp.code}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{exp.name}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-rose-700">
                      {formatBRL(exp.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
