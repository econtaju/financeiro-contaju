import React, { useState } from 'react';
import { Blocks, Key, Globe, CheckCircle2, RefreshCw, Server, Send } from 'lucide-react';

export const IntegrationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'API' | 'WEBHOOK' | 'BANCOS'>('BANCOS');
  const [apiKey, setApiKey] = useState('ctj_live_89f4b7a6c9e0d1f3');
  const [webhookUrl, setWebhookUrl] = useState('https://app.contabil.com.br/webhooks/financeiro');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <Blocks className="w-5 h-5 text-indigo-700" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Módulos e Integrações de Sistema</h1>
          </div>
          <p className="text-xs text-slate-700 mt-0.5">
            Conectores bancários (OFX/Open Finance), Emissor de NFS-e, APIs REST e Webhooks para automações.
          </p>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                ATIVO
              </span>
              <span className="text-xs font-mono text-slate-700">OFX 2.1</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm mt-2">Extrato Bancário OFX / CSV</h3>
            <p className="text-xs text-slate-600 mt-1">
              Importação padronizada de extratos de todos os bancos brasileiros com reconciliação automática.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
            Processamento Ativo
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                PRONTO
              </span>
              <span className="text-xs font-mono text-slate-700">REST API</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm mt-2">API de Cobrança e Boletos</h3>
            <p className="text-xs text-slate-600 mt-1">
              Geração de boletos registrados e QR Code Pix dinâmico integrado ao faturamento do escritório.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-indigo-700 font-medium">
            <CheckCircle2 className="w-4 h-4 mr-1 text-indigo-600" />
            Integrado ao Módulo de Recebíveis
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                CONFIGURÁVEL
              </span>
              <span className="text-xs font-mono text-slate-700">NFS-e</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm mt-2">Emissão de NFS-e Municipal</h3>
            <p className="text-xs text-slate-600 mt-1">
              Comunicação direta com o padrão ABRASF da prefeitura para transmissão de notas fiscais de serviço.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-amber-700 font-medium">
            Aguardando Certificado A1
          </div>
        </div>
      </div>

      {/* Developer API & Webhooks Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Credenciais de API e Webhooks
        </h2>

        <div className="space-y-3 text-xs max-w-xl">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Chave de API (Secret Key)</label>
            <div className="flex space-x-2">
              <input
                type="text"
                readOnly
                value={apiKey}
                className="w-full rounded border border-slate-300 px-3 py-1.5 font-mono bg-slate-50 text-slate-800"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">URL de Destino do Webhook</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-1.5 font-mono"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={() => alert('Webhook configurado e testado com sucesso!')}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Salvar e Testar Webhook
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
