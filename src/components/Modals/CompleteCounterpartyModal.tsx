import React, { useState, useEffect } from 'react';
import { X, UserCheck, Building, Mail, Phone, MapPin, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Counterparty } from '../../types';
import { storage } from '../../services/storageService';
import { CNPJInputField } from '../Common/CNPJInputField';
import { validateFiscalDocument } from '../../utils/cnpjValidator';

interface CompleteCounterpartyModalProps {
  isOpen: boolean;
  counterpartyId: string | null;
  onClose: () => void;
  onSaved: (updated: Counterparty) => void;
}

export const CompleteCounterpartyModal: React.FC<CompleteCounterpartyModalProps> = ({
  isOpen,
  counterpartyId,
  onClose,
  onSaved
}) => {
  const [formData, setFormData] = useState<Partial<Counterparty>>({
    name: '',
    tradeName: '',
    document: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    status: 'ATIVO'
  });
  const [successMsg, setSuccessMsg] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  useEffect(() => {
    if (counterpartyId) {
      const parties = storage.getCounterparties();
      const target = parties.find(p => p.id === counterpartyId);
      if (target) {
        setFormData({ ...target });
        setDocError(null);
      }
    }
  }, [counterpartyId, isOpen]);

  if (!isOpen || !counterpartyId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    if (formData.document?.trim()) {
      const fiscalCheck = validateFiscalDocument(formData.document);
      if (fiscalCheck.status === 'invalid') {
        setDocError(fiscalCheck.message);
        return;
      }
    }
    setDocError(null);

    const all = storage.getCounterparties();
    const updatedList = all.map(p => {
      if (p.id === counterpartyId) {
        return {
          ...p,
          name: formData.name!.trim(),
          tradeName: formData.tradeName?.trim() || '',
          document: formData.document?.trim() || '',
          email: formData.email?.trim() || '',
          phone: formData.phone?.trim() || '',
          address: formData.address?.trim() || '',
          notes: formData.notes?.trim() || '',
          status: (formData.status as any) || 'ATIVO'
        };
      }
      return p;
    });

    storage.saveCounterparties(updatedList);
    const updated = updatedList.find(p => p.id === counterpartyId)!;

    const currentUser = storage.getCurrentUser();
    storage.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'COMPLEMENTACAO_CADASTRO_RAPIDO',
      module: 'Cadastros',
      recordId: counterpartyId,
      details: `Complementação do cadastro de ${updated.name} (CNPJ/CPF: ${updated.document || 'Não informado'}).`
    });

    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onSaved(updated);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white border-b border-amber-500/30">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Finalizar Cadastro de {formData.type === 'CLIENTE' ? 'Cliente' : 'Fornecedor'}
              </h2>
              <p className="text-[11px] text-slate-700">
                Complete os dados cadastrais e fiscais do registro criado rapidamente.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
            <span>Cadastro atualizado com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {docError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center font-medium">
              <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 text-rose-600" />
              <span>{docError}</span>
            </div>
          )}
          
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Razão Social / Nome Completo *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={formData.tradeName || ''}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                placeholder="Ex: Contaju Softwares"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <CNPJInputField
                id="modal-counterparty-cnpj"
                value={formData.document || ''}
                onChange={(maskedVal) => {
                  setFormData(prev => ({ ...prev, document: maskedVal }));
                  if (docError) setDocError(null);
                }}
                label="CNPJ (Cadastro Fiscal) *"
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                E-mail para Faturamento
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com.br"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Endereço Completo
            </label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Av. Paulista, 1000 - Sala 12 - São Paulo/SP"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Observações Adicionais
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Condições comerciais, dados bancários, regime tributário..."
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Completar Mais Tarde
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-slate-950 font-bold bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm transition-colors flex items-center"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
              Salvar Cadastro Completo
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
