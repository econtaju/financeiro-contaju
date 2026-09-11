import React, { useState } from 'react';
import { History, Search, Download, FileSpreadsheet, Shield } from 'lucide-react';
import { storage } from '../../services/storageService';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';
import { formatDateBR } from '../../services/financialEngine';

export const AuditView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const logs = storage.getAuditLogs().sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const modules = Array.from(new Set(logs.map(l => l.module)));

  const filteredLogs = logs.filter(l => {
    if (moduleFilter !== 'ALL' && l.module !== moduleFilter) return false;
    if (searchTerm) {
      const match = l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    l.userName.toLowerCase().includes(searchTerm.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  const handleExportExcel = () => {
    const headers = ['Data/Hora', 'Usuário', 'Perfil', 'Módulo', 'Ação', 'Registro ID', 'Detalhes'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      l.userName,
      l.userRole,
      l.module,
      l.action,
      l.recordId || '-',
      l.details
    ]);
    exportToExcel('trilha-auditoria', 'Auditoria', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['Data/Hora', 'Usuário', 'Perfil', 'Módulo', 'Ação', 'Registro ID', 'Detalhes'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      l.userName,
      l.userRole,
      l.module,
      l.action,
      l.recordId || '-',
      l.details
    ]);
    exportToCSV('trilha-auditoria', headers, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Trilha de Auditoria e Governança</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Registro imutável de todas as ações, baixas, estornos, emissões e alterações realizadas no sistema.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors flex items-center shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-700" />
            Excel
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors flex items-center shadow-2xs"
          >
            <Download className="w-4 h-4 mr-1.5 text-slate-600" />
            CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs">
          <label className="font-semibold text-slate-700">Módulo:</label>
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="rounded border border-slate-300 px-2.5 py-1.5 bg-white text-xs font-medium"
          >
            <option value="ALL">Todos os Módulos</option>
            {modules.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por usuário, ação ou detalhe..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Perfil</th>
                <th className="py-3 px-4">Módulo</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Detalhes do Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {l.timestamp.replace('T', ' ').substring(0, 19)}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {l.userName}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      {l.userRole}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-indigo-700 whitespace-nowrap">
                    {l.module}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-800 text-[11px] whitespace-nowrap">
                    {l.action}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {l.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
