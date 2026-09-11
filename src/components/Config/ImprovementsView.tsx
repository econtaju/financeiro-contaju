import React, { useState } from 'react';
import { Lightbulb, Plus, ThumbsUp, CheckCircle2, Clock } from 'lucide-react';
import { ImprovementRequest } from '../../types';
import { storage } from '../../services/storageService';

export const ImprovementsView: React.FC = () => {
  const [requests, setRequests] = useState<ImprovementRequest[]>(storage.getImprovementRequests());
  const currentUser = storage.getCurrentUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ImprovementRequest['category']>('RELATORIOS');
  const [description, setDescription] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newReq: ImprovementRequest = {
      id: `req-${Date.now()}`,
      title,
      category,
      description,
      status: 'EM_ANALISE',
      votes: 1,
      createdAt: new Date().toISOString(),
      requestedBy: currentUser.name
    };

    const updated = [newReq, ...requests];
    storage.saveImprovementRequests(updated);
    setRequests(updated);

    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'SUGESTAO_MELHORIA',
      module: 'Central de Melhorias',
      recordId: newReq.id,
      details: `Nova solicitação de melhoria: "${newReq.title}".`
    });

    setIsModalOpen(false);
    setTitle('');
    setDescription('');
  };

  const handleVote = (id: string) => {
    const updated = requests.map(r => r.id === id ? { ...r, votes: r.votes + 1 } : r);
    storage.saveImprovementRequests(updated);
    setRequests(updated);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Central de Solicitações e Melhorias</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Canal colaborativo para sugerir novos recursos, relatórios, atalhos e aprimoramentos para o sistema.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 transition-colors shadow-2xs flex items-center"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Sugerir Nova Melhoria
        </button>
      </div>

      {/* Grid of requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requests.map(req => (
          <div key={req.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {req.category}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  req.status === 'CONCLUIDO'
                    ? 'bg-emerald-100 text-emerald-800'
                    : req.status === 'EM_ANALISE'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {req.status}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm mt-2">{req.title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{req.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-700 text-[11px]">Sugerido por: <strong>{req.requestedBy}</strong></span>
              <button
                onClick={() => handleVote(req.id)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg flex items-center space-x-1 transition-colors"
                title="Votar nesta sugestão"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="font-bold">{req.votes}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
              <h2 className="text-base font-semibold text-slate-900">Sugerir Melhoria</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">✕</button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Título da Ideia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gráfico de evolução de despesas fixas x variáveis"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 font-medium"
                >
                  <option value="RELATORIOS">Relatórios e Gráficos</option>
                  <option value="USABILIDADE">Usabilidade e Navegação</option>
                  <option value="FISCAL_CONTABIL">Contábil e Fiscal</option>
                  <option value="PERFORMANCE">Performance e Segurança</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Descrição do Benefício</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva como essa alteração facilitará a rotina financeira do escritório..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
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
                  Enviar Sugestão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
