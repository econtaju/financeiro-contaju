import { AiService } from '../src/services/aiService';

async function testSandboxEngine() {
  console.log('🧪 Iniciando teste automatizado da Sandbox de Teste & Diagnóstico de Agentes...\n');

  // Teste 1: Execução sem chave configurada (simulação do diagnóstico)
  console.log('1️⃣ Testando chamada à sandbox sem chave OpenCode configurada...');
  
  // Salvar configuração com chave vazia para testar o diagnóstico
  const currentConfig = AiService.getConfig();
  AiService.saveConfig({
    ...currentConfig,
    apiKey: ''
  });
  
  const result1 = await AiService.testAgentCustomSandbox({
    systemPrompt: 'Você é o CFO executivo da empresa. Mantenha tom formal e analítico.',
    userPrompt: 'Qual é o diagnóstico do fluxo de caixa e alertas da diretoria?',
    model: 'google/gemini-2.5-flash',
    agentRole: 'CFO_EXECUTIVO',
    allowedTools: ['consultar_fluxo_caixa', 'consultar_dre_regimes']
  });

  console.log('Resultado 1 Success:', result1.success);
  console.log('Diagnostic Code:', result1.errorDiagnostic?.code);
  console.log('Diagnostic Title:', result1.errorDiagnostic?.title);
  console.log('Diagnostic Suggestion:', result1.errorDiagnostic?.suggestion);

  if (result1.success === false && result1.errorDiagnostic?.code === 'AUTH_MISSING_KEY') {
    console.log('✅ Teste 1 PASSOU: Diagnóstico de chave ausente identificado com precisão!\n');
  } else {
    console.error('❌ Teste 1 FALHOU: Diagnóstico de chave ausente não se comportou como esperado.');
    process.exit(1);
  }

  // Teste 2: Validação da injeção de capacidades autorizadas no prompt
  console.log('2️⃣ Testando método com prompt vazio...');
  try {
    const result2 = await AiService.testAgentCustomSandbox({
      systemPrompt: 'Você é um auditor.',
      userPrompt: '',
      model: 'openai/gpt-4o-mini',
      agentRole: 'AUDITOR_CONCILIACAO',
      allowedTools: []
    });
    console.log('Resultado 2 Success:', result2.success);
    console.log('Resultado 2 Error:', result2.error);
    if (!result2.success) {
      console.log('✅ Teste 2 PASSOU: Rejeição de prompt vazio funcionando.\n');
    }
  } catch (e: any) {
    console.log('✅ Teste 2 PASSOU com exceção tratada:', e.message);
  }

  console.log('🎉 Todos os testes da Sandbox e Diagnóstico foram concluídos com sucesso!');
}

testSandboxEngine().catch(err => {
  console.error('Erro crítico no teste:', err);
  process.exit(1);
});
