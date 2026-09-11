import React, { useState } from 'react';
import { Lock, Unlock, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PeriodClosure } from '../../types';
import { storage } from '../../services/storageService';
import { formatDateBR } from '../../services/financialEngine';

export const PeriodClosureView: React.FC = () => {
  const [closures, setClosures] = useState<PeriodClosure[]>(storage.getPeriodClosures());
  const currentUser = storage.getCurrentUser();
  const [newCompetence, setNewCompetence] = useState<string>('2026-08');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');

  const handleClosePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetence) return;

    if (closures.some(c => c.competence === newCompetence)) {
      alert(`A competência ${newCompetence} já possui registro de fechamento.`);
      return;
    }

    const newClosure: PeriodClosure = {
      id: `closure-${Date.now()}`,
      yearMonth: newCompetence,
      competence: newCompetence,
      closedAt: new Date().toISOString(),
      closedBy: currentUser.name,
      isClosed: true,
      notes: notes || `Fechamento contábil e financeiro formal da competência ${newCompetence}.`
    };

    const updated = [newClosure, ...closures];
    storage.savePeriodClosures(updated);
    setClosures(updated);

    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'TRAVA_FECHAMENTO_PERIODO',
      module: 'Fechamento de Período',
      recordId: newClosure.id,
      details: `Bloqueio e trava contábil da competência ${newCompetence} pelo usuário ${currentUser.name}.`
    });

    setMsg(`Competência ${newCompetence} fechada e travada com sucesso!`);
    setNotes('');
  };

  const handleReopen = (closure: PeriodClosure) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Apenas usuários com papel de ADMIN podem reabrir períodos contábeis fechados.');
      return;
    }

    if (confirm(`Atenção: Deseja realmente reabrir a competência ${closure.competence}? Todas as alterações retroativas serão auditadas.`)) {
      const updated = closures.filter(c => c.id !== closure.id);
      storage.savePeriodClosures(updated);
      setClosures(updated);

      storage.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'REABERTURA_PERIODO',
        module: 'Fechamento de Período',
        recordId: closure.id,
        details: `Reabertura e destravamento da competência ${closure.competence} pelo usuário ${currentUser.name}.`
      });

      setMsg(`Competência ${closure.competence} reaberta.`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fechamento de Período e Trava Contábil</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Bloqueio de lançamentos e baixas retroativas para garantir a integridade dos relatórios contábeis e fiscais.
          </p>
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Trava Rule Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <span className="font-bold text-amber-900">
            Regra Rígida de Integridade (Anti-Retroatividade)
          </span>
          <p className="text-amber-900/90 leading-relaxed">
            Uma vez fechado o período, o motor financeiro rejeita qualquer operação de emissão, liquidação ou estorno cuja data de competência pertença ao intervalo bloqueado. 
            Isso resguarda o DRE e os impostos já apurados e transmitidos pelo escritório.
          </p>
        </div>
      </div>

      {/* Form: Close new period */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Travar Nova Competência
        </h2>
        
        <form onSubmit={handleClosePeriod} className="space-y-3 text-xs max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Mês / Ano da Competência *</label>
              <input
                type="month"
                required
                value={newCompetence}
                onChange={e => setNewCompetence(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Responsável pelo Fechamento</label>
              <input
                type="text"
                readOnly
                value={`${currentUser.name} (${currentUser.role})`}
                className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Parecer / Justificativa do Fechamento</label>
            <input
              type="text"
              placeholder="Ex: Conciliações bancárias finalizadas e tributos Simples Nacional apurados."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-1.5"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Executar Fechamento e Travar Mês
            </button>
          </div>
        </form>
      </div>

      {/* Closed Periods List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Competências Fechadas e Bloqueadas ({closures.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Competência</th>
                <th className="py-3 px-4">Data do Fechamento</th>
                <th className="py-3 px-4">Parecer / Notas</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {closures.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-700">
                    Nenhum período foi travado até o momento.
                  </td>
                </tr>
              ) : (
                closures.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                      {c.competence}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {formatDateBR(c.closedAt.split('T')[0])}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {c.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 inline-flex items-center">
                        <Lock className="w-3 h-3 mr-1" />
                        BLOQUEADO
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {currentUser.role === 'ADMIN' && (
                        <button
                          onClick={() => handleReopen(c)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded transition-colors inline-flex items-center"
                        >
                          <Unlock className="w-3.5 h-3.5 mr-1" />
                          Reabrir Período
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
