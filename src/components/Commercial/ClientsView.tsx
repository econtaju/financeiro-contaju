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
  Receipt
} from 'lucide-react';
import { Counterparty, Contract, FinancialTitle } from '../../types';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatDateBR } from '../../services/financialEngine';
import { ClientFinancialHistoryModal } from './ClientFinancialHistoryModal';

export const ClientsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Counterparty | null>(null);
  const [selectedContractForModal, setSelectedContractForModal] = useState<string | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Counterparty | null>(null);

  const counterparties = storage.getCounterparties();
  const clients = counterparties.filter(c => 
    (c.type === 'CLIENTE' || c.type === 'AMBOS') &&
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.document.includes(searchTerm) ||
     (c.tradeName && c.tradeName.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const contracts = storage.getContracts();
  const titles = storage.getTitles().filter(t => t.type === 'RECEBER');
  const today = new Date().toISOString().split('T')[0];

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
    setFormData(client);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

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
            <Users className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Banco de Clientes Contaju</h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Gestão unificada da carteira de clientes com histórico de pagamentos, contratos ativos e encerrados, atrasos e movimentações.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-[#071321] rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(99,217,255,0.25)] flex items-center"
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
            <Users className="w-4 h-4 text-cyan-400" />
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
          <div className="flex justify-between items-center text-xs text-indigo-400 font-medium">
            <span>Cobertura de Contratos</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-mono">
            {clientMetrics.clientsWithActiveContracts} <span className="text-sm font-normal text-[var(--text-secondary)]">/ {clientMetrics.activeClients}</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex justify-between pt-0.5">
            <span>Contratos recorrentes:</span>
            <span className="font-semibold text-indigo-400">{clientMetrics.contractCoveragePercentage}% da carteira</span>
          </div>
        </div>

        <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-1">
          <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] font-medium">
            <span>Saldo em Aberto (Receber)</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-mono">
            {formatBRL(totalOpenReceivables)}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex justify-between pt-0.5">
            <span>Ticket médio contratual:</span>
            <span className="font-semibold text-cyan-400">{formatBRL(clientMetrics.averageTicketPerClient)}/mês</span>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-[var(--surface-card)] p-4 rounded-xl border border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          Total de clientes na carteira: <strong className="text-[var(--text-primary)] font-mono">{clients.length}</strong>
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
                const closedContracts = clientContracts.filter(c => c.status === 'ENCERRADO' || c.status === 'SUSPENSO');
                
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
                            className="w-full text-[11px] font-medium py-1.5 pl-2.5 pr-6 rounded-lg bg-[var(--surface-elevated)] text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer appearance-none transition-colors"
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
                          <ChevronDown className="w-3.5 h-3.5 text-cyan-400 absolute right-2 top-2 pointer-events-none" />
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
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        client.status === 'ATIVO' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                      }`}>
                        {client.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenClientHistory(client)}
                        className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors inline-flex items-center text-xs font-semibold"
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
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Razão Social / Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={formData.tradeName || ''}
                    onChange={e => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">CNPJ / CPF *</label>
                  <input
                    type="text"
                    required
                    value={formData.document || ''}
                    onChange={e => setFormData({ ...formData, document: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 font-mono focus:outline-none focus:border-cyan-400"
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
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Endereço Comercial</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">Status</label>
                  <select
                    value={formData.status || 'ATIVO'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'ATIVO' | 'INATIVO' })}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-cyan-400"
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
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:border-cyan-400"
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
                  className="px-5 py-2 text-xs font-bold text-[#071321] bg-cyan-400 hover:bg-cyan-300 rounded-xl shadow-[0_0_12px_rgba(99,217,255,0.25)] transition-all"
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
