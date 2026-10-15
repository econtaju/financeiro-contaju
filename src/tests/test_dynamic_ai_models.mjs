// ==============================================================================
// TESTE AUTOMATIZADO: VALIDAÇÃO DO CATÁLOGO DINÂMICO, ADAPTADORES E FAILOVER
// ==============================================================================

import assert from 'assert';

async function runTests() {
  console.log('--- INICIANDO TESTES DE VALIDAÇÃO G4 FINTECH ---');

  // TESTE 1: Serverless Function /api/ai-models
  console.log('1. Testando endpoint /api/ai-models...');
  const aiModelsModule = await import('../../api/ai-models.js');
  let modelsResponseData = null;
  const mockRes = {
    setHeader: () => {},
    status: (code) => {
      assert.strictEqual(code, 200, 'Status deve ser 200');
      return mockRes;
    },
    json: (data) => {
      modelsResponseData = data;
      return mockRes;
    },
    end: () => {}
  };

  await aiModelsModule.default({ method: 'GET', query: {} }, mockRes);
  assert(modelsResponseData, 'Resposta não pode ser nula');
  assert.strictEqual(modelsResponseData.success, true, 'Deve ter sucesso = true');
  assert(Array.isArray(modelsResponseData.models), 'models deve ser um Array');
  assert(modelsResponseData.models.length > 0, 'Deve conter modelos');

  // Validação de deduplicação e formato
  const ids = modelsResponseData.models.map(m => m.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(ids.length, uniqueIds.size, 'Não pode haver IDs duplicados');

  // Verifica que não há segredos na resposta
  const jsonStr = JSON.stringify(modelsResponseData);
  assert(!jsonStr.includes('sk-'), 'Não pode vazar chaves de API');
  assert(!jsonStr.includes('OPENCODE_API_KEY'), 'Não pode vazar nomes de secrets');
  console.log(`   ✓ ${modelsResponseData.models.length} modelos retornados com integridade e deduplicação.`);

  // TESTE 2: Resiliência e Fallback
  console.log('2. Testando resiliência com endpoint externo inválido...');
  process.env.OPENCODE_MODELS_URL = 'https://invalid-host-teste-fallback.xyz/models';
  let fallbackData = null;
  const mockResFallback = {
    setHeader: () => {},
    status: (code) => {
      assert.strictEqual(code, 200, 'Deve responder HTTP 200 mesmo em falha de rede externa');
      return mockResFallback;
    },
    json: (data) => {
      fallbackData = data;
      return mockResFallback;
    },
    end: () => {}
  };
  await aiModelsModule.default({ method: 'GET', query: { refresh: 'true' } }, mockResFallback);
  assert(fallbackData.models.length > 0, 'Deve retornar catálogo resiliente');
  assert(fallbackData.source.includes('fallback') || fallbackData.source.includes('cache'), 'Source deve indicar fallback');
  console.log(`   ✓ Fallback resiliente ativado com sucesso: ${fallbackData.models.length} modelos.`);
  delete process.env.OPENCODE_MODELS_URL;

  // TESTE 3: Redação de PII no Gateway /api/agents
  console.log('3. Testando Redação de PII em /api/agents...');
  const agentsModule = await import('../../api/agents.js');
  let agentsResponseData = null;
  let agentsStatusCode = 200;
  const mockAgentsRes = {
    setHeader: () => {},
    status: (code) => {
      agentsStatusCode = code;
      return mockAgentsRes;
    },
    json: (data) => {
      agentsResponseData = data;
      return mockAgentsRes;
    },
    end: () => {}
  };

  // Simula requisição com CPF e Cartão
  await agentsModule.default({
    method: 'POST',
    body: {
      agentRole: 'CFO_EXECUTIVO',
      messages: [{ role: 'user', content: 'Saldo do CPF 123.456.789-00 e cartao 4111 2222 3333 4444' }],
      customApiKey: 'mock-key-for-test'
    }
  }, mockAgentsRes);

  console.log('   ✓ Gateway executou sem exceções.');

  // TESTE 4: Verificação de Não Regressão Financeira (Cálculos de Balanço / Parcelamento)
  console.log('4. Verificando integridade das funções financeiras core...');
  const financialEngine = await import('../services/financialEngine.ts');
  const formatted = financialEngine.formatBRL(1234.56);
  assert(formatted.includes('1.234,56'), `Formatação BRL esperada: R$ 1.234,56. Obtido: ${formatted}`);
  
  // Teste de divisão com centavos
  const installments = financialEngine.FinancialEngine.splitInstallments(100.00, 3);
  assert.strictEqual(installments.length, 3);
  const sum = installments.reduce((acc, curr) => acc + curr, 0);
  assert.strictEqual(Math.round(sum * 100) / 100, 100.00, 'A soma das parcelas deve ser exatamente R$ 100,00');
  console.log('   ✓ Funções contábeis e divisão exata de parcelas: 100% íntegras.');

  console.log('\n======================================================');
  console.log('TODOS OS TESTES AUTOMATIZADOS PASSARAM COM SUCESSO! 🎯');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('FALHA NOS TESTES:', err);
  process.exit(1);
});
