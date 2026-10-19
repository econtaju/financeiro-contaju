import { AgentOrchestratorService } from '../src/services/agentOrchestratorService';
import { storage } from '../src/services/storageService';
import { AgentDefinition } from '../src/types';

console.log('========================================================================');
console.log('🧪 TESTE DE PERSISTÊNCIA E CUSTOMIZAÇÃO DE PROMPTS E MODELOS DE AGENTES');
console.log('========================================================================\n');

// 1. Carrega os agentes atuais
const initialAgents = AgentOrchestratorService.getAgents();
console.log(`📋 Total de agentes carregados: ${initialAgents.length}`);
initialAgents.forEach(a => {
  console.log(`- Agente: [${a.role}] ${a.name} | Modelo: ${a.defaultModel} | Ferramentas: ${a.allowedTools.length}`);
});

// 2. Modifica o CFO com novo modelo e novo prompt
const cfo = initialAgents.find(a => a.role === 'CFO_EXECUTIVO');
if (!cfo) {
  console.error('❌ CFO não encontrado!');
  process.exit(1);
}

const updatedCfo: AgentDefinition = {
  ...cfo,
  name: 'CFO Executivo Estratégico AI',
  defaultModel: 'deepseek-v4-pro',
  systemPrompt: 'Você é o CFO Estratégico da ContaJu. Priorize sempre liquidez de 30 dias e redução de despesas fixas.',
  allowedTools: [
    ...cfo.allowedTools,
    'consultar_projecao_ebitda'
  ]
};

// 3. Salva a alteração
AgentOrchestratorService.saveAgents(
  initialAgents.map(a => a.id === updatedCfo.id ? updatedCfo : a)
);
console.log('\n💾 Alteração salva com sucesso via AgentOrchestratorService.saveAgents!');

// 4. Recarrega do storage para confirmar persistência
const reloadedAgents = AgentOrchestratorService.getAgents();
const reloadedCfo = reloadedAgents.find(a => a.role === 'CFO_EXECUTIVO');

if (!reloadedCfo) {
  console.error('❌ Erro: CFO não recarregado!');
  process.exit(1);
}

console.log('\n🔍 Conferência pós-salvamento:');
console.log(`- Nome: ${reloadedCfo.name}`);
console.log(`- Modelo atribuído: ${reloadedCfo.defaultModel} (Esperado: deepseek-v4-pro)`);
console.log(`- Prompt configurado: "${reloadedCfo.systemPrompt}"`);
console.log(`- Ferramentas autorizadas: ${reloadedCfo.allowedTools.join(', ')}`);

if (reloadedCfo.defaultModel !== 'deepseek-v4-pro') {
  console.error('❌ Erro: Modelo não foi persistido!');
  process.exit(1);
}

if (!reloadedCfo.systemPrompt.includes('Priorize sempre liquidez de 30 dias')) {
  console.error('❌ Erro: Prompt customizado não foi persistido!');
  process.exit(1);
}

if (!reloadedCfo.allowedTools.includes('consultar_projecao_ebitda')) {
  console.error('❌ Erro: Nova capacidade/ferramenta não foi persistida!');
  process.exit(1);
}

console.log('\n✅ SUCESSO: Todas as alterações de Prompts, Modelos e Ferramentas foram persistidas com integridade contábil garantida!');
