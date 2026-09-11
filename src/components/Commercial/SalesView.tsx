import React, { useState } from 'react';
import { Receipt, Plus, CheckCircle2, AlertCircle, Info, Calendar, DollarSign, Layers } from 'lucide-react';
import { storage } from '../../services/storageService';
import { FinancialEngine, formatBRL, formatDateBR } from '../../services/financialEngine';
import { FinancialTitle } from '../../types';

export const SalesView: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  const counterparties = storage.getCounterparties().filter(c => c.type === 'CLIENTE' || c.type === 'AMBOS');
  const chartAccounts = storage.getChartAccounts().filter(a => a.isAnalytical && a.isActive && (a.nature === 'RECEITA_SERVICO' || a.code.startsWith('1')));
  const services = storage.getServices();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState(counterparties[0]?.id || '');
  const [description, setDescription] = useState('Consultoria Tributária Especial');
  const [competence, setCompetence] = useState(currentMonth);
  const [totalAmount, setTotalAmount] = useState<number>(6000);
  const [installmentsCount, setInstallmentsCount] = useState<number>(3);
  const [firstDueDate, setFirstDueDate] = useState(today);
  const [accountId, setAccountId] = useState(chartAccounts[0]?.id || '');
  const [successMessage, setSuccessMessage] = useState('');

  const installmentValue = installmentsCount > 0 ? totalAmount / installmentsCount : totalAmount;

  const handleGenerateSale = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!customerId || totalAmount <= 0 || installmentsCount <= 0) return;

    if (FinancialEngine.isPeriodClosed(competence)) {
      alert(`O período ${competence} está fechado.`);
      return;
    }

    const titles = storage.getTitles();
    const currentUser = storage.getCurrentUser();
    const newTitles: FinancialTitle[] = [];

    const baseNumber = `VEN-${Date.now().toString().slice(-4)}`;

    for (let i = 1; i <= installmentsCount; i++) {
      // Calculate due date for installment i
      const d = new Date(firstDueDate);
      d.setMonth(d.getMonth() + (i - 1));
      const dueDateStr = d.toISOString().split('T')[0];

      const title: FinancialTitle = {
        id: `tit-sale-${Date.now()}-${i}`,
        companyId: 'comp-1',
        type: 'RECEBER',
        titleNumber: `${baseNumber}/${i.toString().padStart(2, '0')}`,
        counterpartyId: customerId,
        description: `${description} (Parcela ${i}/${installmentsCount})`,
        accountId: accountId || chartAccounts[0]?.id || 'acc-rec-01',
        launchDate: today,
        competence: competence, // Same competence: revenue recognized in full for this period!
        issueDate: today,
        dueDate: dueDateStr,
        expectedCashDate: dueDateStr,
        originalAmount: installmentValue,
        settledPrincipal: 0,
        balancePrincipal: installmentValue,
        accruedInterest: 0,
        accruedFine: 0,
        documentState: 'CONFIRMADO',
        settlementState: 'ABERTO',
        originType: 'VENDA',
        notes: `Faturamento parcelado em ${installmentsCount}x da venda ${baseNumber}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      newTitles.push(title);
    }

    storage.saveTitles([...newTitles, ...titles]);

    const client = counterparties.find(c => c.id === customerId);
    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'VENDA_PARCELADA_GERADA',
      module: 'Vendas e Faturamento',
      recordId: baseNumber,
      details: `Venda ${baseNumber} de ${formatBRL(totalAmount)} em ${installmentsCount}x para ${client?.name}. Competência econômica DRE: ${competence}.`
    });

    setSuccessMessage(`Venda ${baseNumber} gerada com sucesso! ${installmentsCount} parcelas de ${formatBRL(installmentValue)} criadas com competência econômica única em ${competence}.`);
    setIsModalOpen(false);
  };

  const salesTitles = storage.getTitles().filter(t => t.originType === 'VENDA' && t.type === 'RECEBER');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vendas e Faturamento Avulso</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Lançamento de serviços pontuais, legalizações, consultorias e parcelamentos.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 transition-colors shadow-2xs flex items-center"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Faturar Venda / Serviço
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Concept Explanatory Card (Item 4.2 / 8.1) */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-950 flex items-start space-x-3">
        <Info className="w-5 h-5 text-indigo-700 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <span className="font-bold text-indigo-900">
            Regra Fundamental: Competência do Faturamento x Agenda de Caixa
          </span>
          <p className="text-indigo-800/90 leading-relaxed">
            Quando um serviço de R$ 6.000,00 é prestado e faturado em 3x de R$ 2.000,00:
            a <strong>receita econômica total de R$ 6.000,00 pertence ao mês de competência da prestação no DRE</strong>. 
            O contas a receber gera 3 títulos de R$ 2.000,00 distribuídos no cronograma financeiro. 
            Isso protege o DRE de distorções contábeis e projeta a liquidez real no Fluxo de Caixa.
          </p>
        </div>
      </div>

      {/* Sales Titles Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Títulos de Vendas Avulsas Emitidas ({salesTitles.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Título</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Competência (DRE)</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4 text-right">Valor Parcela</th>
                <th className="py-3 px-4 text-right">Saldo</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesTitles.map(t => {
                const client = counterparties.find(c => c.id === t.counterpartyId);
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{t.titleNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{client?.name || 'Cliente'}</td>
                    <td className="py-3 px-4 text-slate-600">{t.description}</td>
                    <td className="py-3 px-4 font-mono text-indigo-700 font-medium">{t.competence}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDateBR(t.dueDate)}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">{formatBRL(t.originalAmount)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatBRL(t.balancePrincipal)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        t.settlementState === 'LIQUIDADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.settlementState}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to create installment sale */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-semibold text-slate-900">
                Faturamento de Venda Avulsa / Parcelada
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateSale} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Cliente *</label>
                <select
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                  required
                >
                  {counterparties.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Descrição do Serviço / Venda *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                  placeholder="Ex: Abertura e Legalização Societária"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Valor Total da Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={totalAmount || ''}
                    onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Número de Parcelas *</label>
                  <select
                    value={installmentsCount}
                    onChange={e => setInstallmentsCount(parseInt(e.target.value) || 1)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 font-medium"
                  >
                    <option value="1">À Vista (1x)</option>
                    <option value="2">2 parcelas</option>
                    <option value="3">3 parcelas</option>
                    <option value="4">4 parcelas</option>
                    <option value="6">6 parcelas</option>
                    <option value="10">10 parcelas</option>
                    <option value="12">12 parcelas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Competência DRE *</label>
                  <input
                    type="month"
                    value={competence}
                    onChange={e => setCompetence(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                    required
                  />
                  <span className="text-[10px] text-slate-700">Reconhecimento da receita</span>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">1º Vencimento *</label>
                  <input
                    type="date"
                    value={firstDueDate}
                    onChange={e => setFirstDueDate(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                    required
                  />
                  <span className="text-[10px] text-slate-700">Demais parcelas em +30d</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Classificação Contábil DRE *</label>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                >
                  {chartAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>

              {/* Installment simulation box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-slate-800 flex items-center">
                  <Layers className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  Simulação do Cronograma Financeiro:
                </div>
                <div className="text-slate-600">
                  {installmentsCount}x de <strong>{formatBRL(installmentValue)}</strong>
                </div>
                <div className="text-[11px] text-slate-700">
                  Total reconhecido no DRE ({competence}): <strong>{formatBRL(totalAmount)}</strong>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm"
                >
                  Confirmar Faturamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
