import { AgentDefinition } from '../types';

export const INITIAL_AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: 'agent-cfo-1',
    role: 'CFO_EXECUTIVO',
    name: 'CFO Executivo Virtual',
    description: 'Projeta liquidez, diagnostica descasamento de fluxo de caixa em 30/60/90 dias e elabora pareceres estratégicos para a diretoria.',
    avatarIcon: 'Briefcase',
    defaultModel: 'claude-3-5-sonnet',
    isAutonomous: false,
    requiresApproval: true,
    systemPrompt: 'Você é o CFO e Diretor Financeiro Executivo da empresa. Sua função é analisar indicadores de caixa, DRE gerencial, liquidez imediata e propor recomendações estratégicas fundamentadas.',
    allowedTools: [
      'consultar_fluxo_caixa',
      'consultar_dre_regimes',
      'projetar_liquidez_diaria',
      'gerar_parecer_executivo'
    ],
    isActive: true
  },
  {
    id: 'agent-reconcile-1',
    role: 'AUDITOR_CONCILIACAO',
    name: 'Auditor de Conciliação Bancária',
    description: 'Cruza transações de extrato OFX com contas a pagar e receber, sugere De-Para com grau de assertividade e prepara propostas para aprovação humana.',
    avatarIcon: 'CheckCheck',
    defaultModel: 'deepseek-reasoner',
    isAutonomous: false,
    requiresApproval: true,
    systemPrompt: 'Você é o Auditor Contábil Especialista em Conciliação Bancária. Você analisa lançamentos de extrato, identifica contrapartidas no ERP, valida tolerâncias de centavos e sugere classificações contábeis estritas.',
    allowedTools: [
      'analisar_transacao_extrato',
      'buscar_titulos_candidatos',
      'verificar_regras_depara',
      'propor_conciliacao'
    ],
    isActive: true
  },
  {
    id: 'agent-delinquency-1',
    role: 'ANALISTA_INADIMPLENCIA',
    name: 'Analista de Inadimplência & Cobrança',
    description: 'Monitora títulos vencidos, projeta curvas de risco de clientes, sugere réguas de contato preventivas e redige comunicados formais.',
    avatarIcon: 'AlertTriangle',
    defaultModel: 'gpt-4o',
    isAutonomous: false,
    requiresApproval: true,
    systemPrompt: 'Você é o Analista de Crédito e Cobrança do Financeiro. Você monitora a carteira de recebíveis, identifica atrasos críticos e redige notificações profissionais com respeito e conformidade.',
    allowedTools: [
      'listar_titulos_vencidos',
      'calcular_indice_inadimplencia',
      'analisar_historico_cliente',
      'propor_notificacao_cobranca'
    ],
    isActive: true
  },
  {
    id: 'agent-accounting-guard-1',
    role: 'GUARDIAO_CONTABIL',
    name: 'Guardião Contábil & Compliance',
    description: 'Audita integridade de partidas dobradas, respeita travas de períodos fechados e assegura consistência entre regime de caixa e competência.',
    avatarIcon: 'ShieldCheck',
    defaultModel: 'claude-3-5-sonnet',
    isAutonomous: false,
    requiresApproval: true,
    systemPrompt: 'Você é o Auditor Chefe de Conformidade e Integridade Contábil. Sua missão é garantir o respeito absoluto aos princípios contábeis, fechamento de períodos e rastreabilidade total.',
    allowedTools: [
      'verificar_fechamento_periodos',
      'auditar_partidas_dobradas',
      'detectar_titulos_duplicados',
      'validar_integridade_dre'
    ],
    isActive: true
  }
];
