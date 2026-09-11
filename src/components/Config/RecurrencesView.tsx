import React, { useState } from 'react';
import { RefreshCw, Play, Plus, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL } from '../../services/financialEngine';

interface RecurrencesViewProps {
  onOpenBillingModal: () => void;
}

export const RecurrencesView: React.FC<RecurrencesViewProps> = ({ onOpenBillingModal }) => {
  const contracts = storage.getContracts();
  const clients = storage.getCounterparties();
  const todayCompetence = new Date().toISOString().substring(0, 7);

  const activeRecurrences = contracts.filter(c => c.status === 'ATIVO');
  const totalMonthlyMRR = activeRecurrences.reduce((acc, c) => acc + (c.monthlyTotal || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Regras de Recorrência e Faturamento</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Automação de geração de mensalidades contábeis com base nas vigências e vencimentos contratuais.
          </p>
        </div>

        <button
          onClick={onOpenBillingModal}
          className="px-3.5 py-2 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 transition-colors shadow-2xs flex items-center"
        >
          <Play className="w-4 h-4 mr-1.5 fill-current" />
          Gerar Lote de Faturamento
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-700 font-medium">Contratos Recorrentes Ativos</span>
          <div className="text-xl font-bold text-indigo-700 mt-1">
            {activeRecurrences.length} contratos
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-700 font-medium">MRR Recorrente Contratado</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {formatBRL(totalMonthlyMRR)} /mês
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-700 font-medium">Competência Vigente</span>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {todayCompetence}
          </div>
        </div>
      </div>

      {/* Table of active contract recurring rules */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Regras de Emissão Periódica Configuradas
          </h2>
          <span className="text-[11px] text-slate-700">Geração idempotente com verificação automática de duplicidade</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Contrato</th>
                <th className="py-3 px-4">Cliente Favorecido</th>
                <th className="py-3 px-4 text-center">Dia Vencimento</th>
                <th className="py-3 px-4 text-right">Honorário Mensal</th>
                <th className="py-3 px-4 text-center">Vigência Início</th>
                <th className="py-3 px-4 text-center">Status da Regra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeRecurrences.map(c => {
                const client = clients.find(cl => cl.id === (c.customerId || (c as any).clientId));
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{c.contractNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{client?.name || 'Cliente'}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      Dia {c.dueDay}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-700">
                      {formatBRL(c.monthlyTotal || 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600 font-mono">
                      {c.startDate}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        AUTOMÁTICA ATIVA
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
