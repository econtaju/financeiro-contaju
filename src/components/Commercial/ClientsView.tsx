import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Eye, 
  Edit2, 
  FileText, 
  TrendingUp, 
  UserPlus, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown,
  ExternalLink,
  Receipt,
  UserMinus,
  UserCheck,
  RotateCcw,
  Ban,
  CheckCircle
} from 'lucide-react';
import { Counterparty, Contract, FinancialTitle } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatDateBR } from '../../services/financialEngine';
import { ClientFinancialHistoryModal } from './ClientFinancialHistoryModal';
import { CNPJInputField } from '../Common/CNPJInputField';
import { validateFiscalDocument } from '../../utils/cnpjValidator';
import { matchesSearch } from '../../utils/searchUtils';

interface ClientsViewProps {
  initialSearch?: string;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ initialSearch = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  React.useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVO' | 'INATIVO'>('ALL');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<Counterparty | null>(null);
  const [selectedContractForModal, setSelectedContractForModal] = useState<string | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Counterparty | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const counterparties = storage.getCounterparties();
  const allClientsList = counterparties.filter(c => c.type === 'CLIENTE' || c.type === 'AMBOS');
  const activeClientsCount = allClientsList.filter(c => c.status === 'ATIVO').length;
  const inactiveClientsCount = allClientsList.filter(c => c.status === 'INATIVO').length;

  const clients = allClientsList.filter(c => {
    if (statusFilter === 'ATIVO' && c.status !== 'ATIVO') return false;
    if (statusFilter === 'INATIVO' && c.status !== 'INATIVO') return false;
    return matchesSearch([c.name, c.tradeName, c.document, c.email, c.phone, c.address, c.notes], searchTerm);
  });

  const contracts = storage.getContracts();
  const titles = storage.getTitles().filter(t => t.type === 'RECEBER');
  const today = new Date().toISOString().split('T')[0];

  const handleToggleClientStatus = (client: Counterparty) => {
    const isActivating = client.status === 'INATIVO';
    const currentUser = storage.getCurrentUser();
    const clientContracts = contracts.filter(c => c.customerId === client.id);
    const activeContracts = clientContracts.filter(c => c.status === 'ATIVO');

    if (isActivating) {
      if (confirm(`Deseja reativar o cliente "${client.name}" na carteira de clientes ativos?`)) {
        const updated = counterparties.map(c => c.id === client.id ? { ...c, status: 'ATIVO' as const } : c);
        storage.saveCounterparties(updated);
        storage.addAuditLog({
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'REATIVACAO_CLIENTE',
          module: 'Comercial & Clientes',
          recordId: client.id,
          details: `Reativação do cliente ${client.name} na carteira ativa.`
        });
        setToastMessage(`Cliente ${client.name} reativado com sucesso na carteira!`);
        setTimeout(() => setToastMessage(''), 4000);
      }
    } else {
      let promptMsg = `Deseja marcar o cliente "${client.name}" como INATIVO?`;
      if (activeContracts.length > 0) {
        promptMsg += `\n\nEste cliente possui ${activeContracts.length} contrato(s) ativo(s) (${activeContracts.map(c => c.contractNumber).join(', ')}). Deseja também inativar esses contratos para retirá-los da renda da carteira (MRR)?`;
      }

      if (confirm(promptMsg)) {
        const updatedCounterparties = counterparties.map(c => c.id === client.id ? { ...c, status: 'INATIVO' as const } : c);
        storage.saveCounterparties(updatedCounterparties);

        const todayStr = new Date().toISOString().split('T')[0];
        if (activeContracts.length > 0) {
          const allContracts = storage.getContracts();
          const updatedContracts = allContracts.map(ct => {
            if (ct.customerId === client.id && ct.status === 'ATIVO') {
              return {
                ...ct,
                status: 'INATIVO' as const,
                cancellationDate: ct.cancellationDate || todayStr,
                cancellationReason: 'Cliente marcado como inativo no cadastro',
                inactivatedAt: new Date().toISOString(),
                inactivatedBy: currentUser.name
              };
            }
            return ct;
          });
          storage.saveContracts(updatedContracts);
        }

        storage.addAuditLog({
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'INATIVACAO_CLIENTE',
          module: 'Comercial & Clientes',
          recordId: client.id,
          details: `Inativação do cliente ${client.name} e respectivos contratos.`
        });
        setToastMessage(`Cliente ${client.name} movido para inativos.`);
        setTimeout(() => setToastMessage(''), 4000);
      }
    }
  };

  // Client metrics and KPIs
  const clientMetrics = FinancialEngine.calculateClientMetrics();
  const totalOpenReceivables = titles.reduce((acc, t) => acc + t.balancePrincipal, 0);

  const [formData, setFormData] = useState<Partial<Counterparty>>({
    name: '',
    tradeName: '',
    document: '',
    email: '',
    phone: '',
    address: '',
    status: 'ATIVO',
    notes: ''
  });

  const handleOpenNew = () => {
    setEditingClient(null);
    setDocError(null);
    setFormData({
      name: '',
      tradeName: '',
      document: '',
      email: '',
      phone: '',
      address: '',
      status: 'ATIVO',
      notes: ''
    });
    setIsFormOpen(true);
  };

  const handleEdit = (client: Counterparty) => {
    setEditingClient(client);
    setDocError(null);
    setFormData(client);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    // Validação estrita de CNPJ / CPF para integridade fiscal
    if (formData.document?.trim()) {
      const fiscalCheck = validateFiscalDocument(formData.document);
      if (fiscalCheck.status === 'invalid') {
        setDocError(fiscalCheck.message);
        return;
      }
    }
    setDocError(null);

    const all = storage.getCounterparties();
    const currentUser = storage.getCurrentUser();

    if (editingClient) {
      const updated = all.map(c => c.id === editingClient.id ? { ...c, ...formData } as Counterparty : c);
      storage.saveCounterparties(updated);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'EDICAO_CLIENTE',
        module: 'Comercial & Clientes',
        recordId: editingClient.id,
        details: `Atualização de dados cadastrais do cliente ${formData.name}.`
      });
    } else {
      const newClient: Counterparty = {
        id: `cli-${Date.now()}`,
        type: 'CLIENTE',
        name: formData.name!,
        tradeName: formData.tradeName || '',
        document: formData.document || '',
        email: formData.email || '',
        phone: formData.phone || '',
        address: formData.address || '',
        status: formData.status as 'ATIVO' | 'INATIVO' || 'ATIVO',
        notes: formData.notes || '',
        createdAt: new Date().toISOString().split('T')[0]
      };
      storage.saveCounterparties([...all, newClient]);
      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CADASTRO_CLIENTE',
        module: 'Comercial & Clientes',
        recordId: newClient.id,
        details: `Cadastro do novo cliente ${newClient.name} (${newClient.document}).`
      });
    }

    setIsFormOpen(false);
  };

  const handleOpenClientHistory = (client: Counterparty, contractId?: string) => {
    setSelectedClient(client);
    setSelectedContractForModal(contractId);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--surface-card)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Banco de Clientes Contaju</h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Gestão unificada da carteira de clientes com histórico de pagamentos, contratos ativos e encerrados, atrasos e movimentações.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#071321] rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] flex items-center"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Cliente
        </button>
      </div>

      {/* KPI Cards de Clientes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-1">
          <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] font-medium">
            <span>Clientes Ativos</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-mono">
            {clientMetrics.activeClients}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex justify-between pt-0.5">
            <span>Base total:</span>
            <span className="font-semibold text-[var(--text-primary)]">{clientMetrics.totalClients} ({clientMetrics.activePercentage}% ativos)</span>
          </div>
        </div>

        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-1">
          <div className="flex justify-between items-center text-xs text-emerald-400 font-medium">
            <span>Crescimento de Clientes</span>
            <UserPlus className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight font-mono">
            +{clientMetrics.newClientsPeriod} novos
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex justify-between pt-0.5">
            <span>Taxa de expansão:</span>
            <span className="font-semibold text-emerald-400">{clientMetrics.growthRate > 0 ? '+' : ''}{clientMetrics.growthRate}% no mês</span>
          </div>
        </div>

        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-1">
          <div className="flex justify-between items-center text-xs text-amber-500 font-medium">
            <span>Cobertura de Contratos</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-mono">
            {clientMetrics.clientsWithActiveContracts} <span className="text-sm font-normal text-[var(--text-secondary)]">/ {clientMetrics.activeClients}</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex justify-between pt-0.5">
            <span>Contratos recorrentes:</span>
            <span className="font-semibold text-amber-500">{clientMetrics.contractCoveragePercentage}% da carteira</span>
          </div>
        </div>

        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-1">
          <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] font-medium">
            <span>Saldo em Aberto (Receber)</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-mono">
            {formatBRL(totalOpenReceivables)}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex justify-between pt-0.5">
            <span>Ticket médio contratual:</span>
            <span className="font-semibold text-amber-400">{formatBRL(clientMetrics.averageTicketPerClient)}/mês</span>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center text-xs text-emerald-800 dark:text-emerald-300 font-semibold animate-in fade-in">
          <CheckCircle className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          <span className="flex-1">{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">✕</button>
        </div>
      )}

      {/* Filter and Search com Abas de Status */}
      <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-amber-400 text-[#071321] shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'
            }`}
          >
            <span>Todos</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              statusFilter === 'ALL' ? 'bg-[#071321]/20 text-[#071321]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
            }`}>
              {allClientsList.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('ATIVO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'ATIVO'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
                : 'text-[var(--text-secondary)] hover:bg-emerald-500/10 hover:text-emerald-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>Ativos</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              statusFilter === 'ATIVO' ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-400'
            }`}>
              {activeClientsCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('INATIVO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              statusFilter === 'INATIVO'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-slate-500/10 hover:text-slate-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            <span>Inativos</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              statusFilter === 'INATIVO' ? 'bg-white/20 text-white' : 'bg-slate-500/15 text-slate-400'
            }`}>
              {inactiveClientsCount}
            </span>
          </button>
        </div>

        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Cliente / Razão Social</th>
                <th className="py-3 px-4">CNPJ / CPF</th>
                <th className="py-3 px-4 min-w-[200px]">Contratos Ativos (Vínculo)</th>
                <th className="py-3 px-4">Contatos</th>
                <th className="py-3 px-4 text-right">Saldo em Aberto</th>
                <th className="py-3 px-4 text-center">Inadimplência</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {clients.map(client => {
                const clientTitles = titles.filter(t => t.counterpartyId === client.id);
                const openBalance = clientTitles.reduce((acc, t) => acc + t.balancePrincipal, 0);
                const clientContracts = contracts.filter(c => c.customerId === client.id);
                const activeContracts = clientContracts.filter(c => c.status === 'ATIVO');
                const cancelledOrInactiveContracts = clientContracts.filter(c => c.status === 'CANCELADO' || c.status === 'INATIVO');
                const closedContracts = clientContracts.filter(c => c.status === 'ENCERRADO' || c.status === 'SUSPENSO');
                const lastCancelledContract = cancelledOrInactiveContracts.find(c => c.cancellationDate);
                
                const clientDelays = clientTitles.filter(t => t.balancePrincipal > 0 && t.dueDate < today);
                const totalDelayDays = clientDelays.reduce((acc, t) => {
                  const diff = Math.max(0, Math.floor((new Date(today).getTime() - new Date(t.dueDate).getTime()) / 86400000));
                  return acc + diff;
                }, 0);
                const maxDelayDays = clientDelays.reduce((max, t) => {
                  const diff = Math.max(0, Math.floor((new Date(today).getTime() - new Date(t.dueDate).getTime()) / 86400000));
                  return Math.max(max, diff);
                }, 0);

                return (
                  <tr key={client.id} className="hover:bg-[var(--surface-elevated)]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">{client.name}</div>
                      {client.tradeName && (
                        <div className="text-[11px] text-[var(--text-secondary)]">{client.tradeName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">{client.document || '-'}</td>
                    
                    {/* MENU DROPDOWN DE VINCULAÇÃO COM CONTRATOS ATIVOS */}
                    <td className="py-3 px-4">
                      {activeContracts.length > 0 ? (
                        <div className="relative">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleOpenClientHistory(client, e.target.value);
                              }
                            }}
                            className="w-full text-[11px] font-medium py-1.5 pl-2.5 pr-6 rounded-lg bg-[var(--surface-elevated)] text-amber-300 border border-amber-500/30 hover:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer appearance-none transition-colors"
                            defaultValue=""
                          >
                            <option value="" disabled>
                              📋 Contratos Ativos ({activeContracts.length}) ▾
                            </option>
                            {activeContracts.map(ct => (
                              <option key={ct.id} value={ct.id}>
                                {ct.contractNumber} • {formatBRL(ct.monthlyTotal)}/mês (Dia {ct.dueDay})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-2 top-2 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2 py-0.5 rounded">
                            Sem contrato ativo
                          </span>
                          {closedContracts.length > 0 && (
                            <span className="text-[10px] text-slate-400" title={`${closedContracts.length} contrato(s) encerrado(s)`}>
                              ({closedContracts.length} encerrado)
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 space-y-0.5">
                      {client.email && (
                        <div className="flex items-center text-[var(--text-secondary)] text-[11px]">
                          <Mail className="w-3 h-3 mr-1 text-[var(--text-secondary)]" />
                          {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center text-[var(--text-secondary)] text-[11px]">
                          <Phone className="w-3 h-3 mr-1 text-[var(--text-secondary)]" />
                          {client.phone}
                        </div>
                      )}
                    </td>
                    
                    <td className="py-3 px-4 text-right font-bold font-mono text-[var(--text-primary)]">
                      {formatBRL(openBalance)}
                    </td>

                    {/* Inadimplência / Atrasos */}
                    <td className="py-3 px-4 text-center">
                      {clientDelays.length > 0 ? (
                        <span 
                          onClick={() => handleOpenClientHistory(client)}
                          className="cursor-pointer inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors"
                          title={`${clientDelays.length} título(s) vencido(s). Máximo de ${maxDelayDays} dias.`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>{clientDelays.length} vencido(s) ({maxDelayDays}d)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Em dia</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                          client.status === 'ATIVO' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${client.status === 'ATIVO' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                          {client.status}
                        </span>

                        {lastCancelledContract?.cancellationDate && (
                          <span 
                            className="text-[9px] text-rose-400 font-medium"
                            title={lastCancelledContract.cancellationReason ? `Motivo: ${lastCancelledContract.cancellationReason}` : undefined}
                          >
                            Parou em {formatDateBR(lastCancelledContract.cancellationDate)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5">
                      {client.status === 'ATIVO' ? (
                        <button
                          onClick={() => handleToggleClientStatus(client)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors inline-flex items-center text-xs"
                          title="Inativar este cliente e respectivos contratos"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleClientStatus(client)}
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors inline-flex items-center text-xs"
                          title="Reativar este cliente na carteira ativa"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenClientHistory(client)}
                        className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors inline-flex items-center text-xs font-semibold"
                        title="Ver histórico de pagamentos, contratos e movimentações"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        <span>Ficha</span>
                      </button>
                      <button
                        onClick={() => handleEdit(client)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] rounded-lg transition-colors"
                        title="Editar cadastro"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPREHENSIVE CLIENT FINANCIAL FILE & FULL HISTORY MODAL */}
      {selectedClient && (
        <ClientFinancialHistoryModal
          client={selectedClient}
          initialContractId={selectedContractForModal}
          onClose={() => {
            setSelectedClient(null);
            setSelectedContractForModal(undefined);
          }}
          onEditClient={handleEdit}
        />
      )}

      {/* New / Edit Client Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[var(--border-subtle)] text-[var(--text-primary)]">
            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente Contaju'}
              </h2>
              <button 
                onClick={() => setIsFormOpen(false)} 
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3.5 text-xs">
              {docError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center font-medium">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{docError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Razão Social / Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={formData.tradeName || ''}
                    onChange={e => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <CNPJInputField
                    id="client-cnpj-input"
                    value={formData.document || ''}
                    onChange={(maskedVal) => {
                      setFormData(prev => ({ ...prev, document: maskedVal }));
                      if (docError) setDocError(null);
                    }}
                    onDataFetched={(receita) => {
                      setFormData(prev => ({
                        ...prev,
                        name: receita.razaoSocial || prev.name,
                        tradeName: receita.nomeFantasia || prev.tradeName,
                        document: receita.formattedCnpj,
                        address: receita.enderecoCompleto || prev.address,
                        phone: receita.telefone || prev.phone,
                        email: receita.email || prev.email,
                        notes: prev.notes ? `${prev.notes}\n[CNAE: ${receita.cnaeCodigo} - ${receita.cnaeDescricao}]` : `CNAE: ${receita.cnaeCodigo} - ${receita.cnaeDescricao}. Situação: ${receita.situacaoCadastral}.`
                      }));
                    }}
                    label="CNPJ (Cadastro Fiscal) *"
                    required
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">E-mail Financeiro</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Endereço Comercial</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">Status</label>
                  <select
                    value={formData.status || 'ATIVO'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'ATIVO' | 'INATIVO' })}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-amber-400"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="INATIVO">INATIVO</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">Observações</label>
                  <input
                    type="text"
                    value={formData.notes || ''}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-[#071321] bg-amber-400 hover:bg-amber-300 rounded-xl shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-all"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
