import React, { useState, useMemo } from 'react';
import { RefreshCw, Play, Search, CheckCircle2, Calendar, FileText, Layers, ArrowUpRight, CalendarClock, Sparkles } from 'lucide-react';
import { storage } from '../../services/storageService';
import { formatBRL, formatDateBR } from '../../services/financialEngine';
import { matchesSearch } from '../../utils/searchUtils';
import { Contract } from '../../types';
import { ContractScheduleModal } from '../Modals/ContractScheduleModal';

interface RecurrencesViewProps {
  onOpenBillingModal: () => void;
}

export const RecurrencesView: React.FC<RecurrencesViewProps> = ({ onOpenBillingModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContractForSchedule, setSelectedContractForSchedule] = useState<Contract | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const contracts = storage.getContracts();
  const clients = storage.getCounterparties();
  const allTitles = storage.getTitles();
  const todayCompetence = new Date().toISOString().substring(0, 7);

  const activeRecurrences = useMemo(() => {
    return contracts.filter(c => 
      c.status === 'ATIVO' && 
      c.isRecurring !== false && 
      c.contractType !== 'AVULSO'
    );
  }, [contracts]);

  const totalMonthlyMRR = useMemo(() => {
    return activeRecurrences.reduce((acc, c) => acc + (c.monthlyTotal || 0), 0);
  }, [activeRecurrences]);

  const filteredContracts = useMemo(() => {
    return activeRecurrences.filter(c => {
      const client = clients.find(cl => cl.id === (c.customerId || (c as any).clientId));
      return matchesSearch([
        c.contractNumber,
        client?.name,
        client?.document,
        String(c.dueDay),
        String(c.monthlyTotal)
      ], searchTerm);
    });
  }, [activeRecurrences, clients, searchTerm]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--surface-card)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                Regras de Recorrência & Faturamento Mensal
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Automação de geração de mensalidades e honorários contábeis com base nas vigências contratuais.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenBillingModal}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Gerar Lote de Faturamento</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[var(--surface-card)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
            Contratos Recorrentes Ativos
          </span>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {activeRecurrences.length} contratos
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
            Regras ativas gerando títulos automáticos
          </span>
        </div>

        <div className="bg-[var(--surface-card)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
            MRR Recorrente Contratado
          </span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {formatBRL(totalMonthlyMRR)}
            <span className="text-xs font-normal text-[var(--text-secondary)] ml-1">/mês</span>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
            Receita previsível contratada
          </span>
        </div>

        <div className="bg-[var(--surface-card)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
            Competência Vigente
          </span>
          <div className="text-xl font-bold text-[var(--text-primary)] mt-1 font-mono">
            {todayCompetence}
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
            Pronto para faturamento do mês
          </span>
        </div>
      </div>

      {/* Tabela de Regras Recorrentes */}
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Regras de Emissão Periódica Configuradas ({filteredContracts.length})
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Geração idempotente com verificação automática de duplicidade por competência.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Buscar por contrato ou cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-elevated)]/60 border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Contrato</th>
                <th className="py-3 px-4">Cliente Favorecido</th>
                <th className="py-3 px-4 text-center">Dia Vencimento</th>
                <th className="py-3 px-4 text-right">Honorário Mensal</th>
                <th className="py-3 px-4 text-center">Próximos Meses</th>
                <th className="py-3 px-4 text-center">Início da Vigência</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--text-secondary)]">
                    Nenhum contrato recorrente ativo encontrado.
                  </td>
                </tr>
              ) : (
                filteredContracts.map(c => {
                  const client = clients.find(cl => cl.id === (c.customerId || (c as any).clientId));
                  const scheduledTitles = allTitles.filter(t => t.originType === 'CONTRATO' && t.originId === c.id && t.documentState !== 'CANCELADO');
                  const count = scheduledTitles.length;

                  return (
                    <tr key={c.id} className="hover:bg-[var(--surface-elevated)]/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-700 dark:text-amber-300">
                        {c.contractNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                        {client?.name || 'Cliente'}
                        {client?.document && (
                          <span className="block text-[10px] font-mono text-[var(--text-secondary)]">
                            {client.document}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-[var(--text-primary)]">
                        Dia {c.dueDay}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBRL(c.monthlyTotal || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          <CalendarClock className="w-3.5 h-3.5" />
                          <span>{count} meses programados</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-[var(--text-secondary)] font-mono">
                        {formatDateBR(c.startDate)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedContractForSchedule(c);
                            setIsScheduleModalOpen(true);
                          }}
                          className="px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                          title="Gerenciar e gerar meses futuros deste contrato"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Próximos Meses</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cronograma & Faturamento dos Próximos Meses */}
      <ContractScheduleModal
        contract={selectedContractForSchedule}
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setSelectedContractForSchedule(null);
        }}
      />

    </div>
  );
};
