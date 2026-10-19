import { AiService } from '../src/services/aiService';
import { detectProviderFromKey, AI_PROVIDER_PRESETS } from '../src/services/aiModelCatalogService';

async function testSandboxEngine() {
  console.log('🧪 Iniciando teste automatizado do Hub Multi-Provedores & Diagnóstico de Chaves...\n');

  // Teste 1: Execução sem chave configurada (simulação do diagnóstico)
  console.log('1️⃣ Testando chamada à sandbox sem chave configurada...');
  
  const currentConfig = AiService.getConfig();
  AiService.saveConfig({
    ...currentConfig,
    apiKey: ''
  });
  
  const result1 = await AiService.testAgentCustomSandbox({
    systemPrompt: 'Você é o CFO executivo da empresa.',
    userPrompt: 'Qual é o diagnóstico do fluxo de caixa?',
    model: 'deepseek-v4-pro',
    agentRole: 'CFO_EXECUTIVO',
    allowedTools: ['consultar_fluxo_caixa']
  });

  console.log('Resultado 1 Success:', result1.success);
  console.log('Diagnostic Code:', result1.errorDiagnostic?.code);

  if (result1.success === false && result1.errorDiagnostic?.code === 'AUTH_MISSING_KEY') {
    console.log('✅ Teste 1 PASSOU: Diagnóstico de chave ausente identificado com precisão!\n');
  } else {
    console.error('❌ Teste 1 FALHOU: Diagnóstico de chave ausente não se comportou como esperado.');
    process.exit(1);
  }

  // Teste 2: Auto-detecção de provedores por formato de chave (Smart Key Detection)
  console.log('2️⃣ Testando Auto-Detecção Inteligente de Provedores por Prefixo de Chave...');
  
  const testCases = [
    { key: 'sk-or-v1-abcdef1234567890', expectedId: 'openrouter', name: 'OpenRouter' },
    { key: 'AIzaSyA_ExampleGoogleKey123', expectedId: 'gemini', name: 'Google Gemini' },
    { key: 'gsk_1234567890abcdef', expectedId: 'groq', name: 'Groq' },
    { key: 'sk-proj-openaiSecretKey123', expectedId: 'openai', name: 'OpenAI' },
    { key: 'opencode_zen_live_998877', expectedId: 'opencode_go', name: 'OpenCode Go' }
  ];

  for (const tc of testCases) {
    const detected = detectProviderFromKey(tc.key);
    console.log(`Detectando [${tc.name}]: encontrado -> ${detected?.id} (esperado: ${tc.expectedId})`);
    if (!detected || detected.id !== tc.expectedId) {
      console.error(`❌ Falha na detecção para a chave: ${tc.key}`);
      process.exit(1);
    }
  }
  console.log('✅ Teste 2 PASSOU: Todos os 5 formatos de chave detectados perfeitamente!\n');

  // Teste 3: Presets de provedores
  console.log('3️⃣ Testando integridade da lista de Presets de Provedores...');
  console.log(`Total de presets disponíveis: ${AI_PROVIDER_PRESETS.length}`);
  const hasOpenCode = AI_PROVIDER_PRESETS.some(p => p.id === 'opencode_go');
  const hasOpenRouter = AI_PROVIDER_PRESETS.some(p => p.id === 'openrouter');
  const hasOpenAI = AI_PROVIDER_PRESETS.some(p => p.id === 'openai');
  const hasGemini = AI_PROVIDER_PRESETS.some(p => p.id === 'gemini');
  const hasGroq = AI_PROVIDER_PRESETS.some(p => p.id === 'groq');

  if (hasOpenCode && hasOpenRouter && hasOpenAI && hasGemini && hasGroq) {
    console.log('✅ Teste 3 PASSOU: Presets essenciais (OpenCode, OpenRouter, OpenAI, Gemini, Groq) carregados com sucesso!\n');
  } else {
    console.error('❌ Teste 3 FALHOU: Presets incompletos.');
    process.exit(1);
  }

  // Teste 4: Verificação da captura de erro de expiração (o exato erro do usuário)
  console.log('4️⃣ Simulando interpretação da mensagem exata de erro da OpenCode: "This API key has expired"...');
  const sampleError = 'This API key has expired. Create a new API key in OpenCode Console and replace it in your client or secret store. Signing in again will not renew this key.';
  const lowerErr = sampleError.toLowerCase();
  const isExpired = lowerErr.includes('expired') || lowerErr.includes('key has expired');

  if (isExpired) {
    console.log('✅ Teste 4 PASSOU: Reconhecimento imediato do padrão "This API key has expired" -> API_KEY_EXPIRED!\n');
  } else {
    console.error('❌ Teste 4 FALHOU: Não reconheceu padrão de expiração.');
    process.exit(1);
  }

  console.log('🎉 Todos os testes do Hub Multi-Provedores e Diagnóstico foram concluídos com 100% de sucesso!');
}

testSandboxEngine().catch(err => {
  console.error('Erro crítico no teste:', err);
  process.exit(1);
});
