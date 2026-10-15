# Plano de integração — Central de Agentes do Financeiro ContaJu

## Importante: duas integrações diferentes
**OpenCode + OpenCode Go**: subagentes para desenvolver, auditar e testar código no Antigravity.
**Central de Agentes do aplicativo**: serviços de IA usados por usuários finais e financeiros.
A documentação de Go restringe o desenho de uso ao tráfego típico de agentes de programação;
não adotar automaticamente a assinatura/chave Go para chat financeiro de clientes.

## Arquitetura-alvo (após correção de segurança)
1. Interface React: nova aba `Central de Agentes` no SettingsHubView ou rota separada da Sidebar.
   Reutilizar componentes da aba IA atual, substituindo o campo de segredo por indicação
   de provedor configurado no servidor.
2. Auth: Supabase Auth com JWT validado no backend e tabela de associação usuário/empresa.
   Não confiar em `contaju_auth_session` do localStorage para autorização.
3. Servidor: Vercel Function `/api/agents/*` ou Supabase Edge Function com autenticação,
   seleção de tenant a partir do token e aplicação das permissões por empresa.
4. Orquestração: cadastro de agentes, ferramentas disponíveis, outputs estruturados (JSON schema),
   políticas, budget por empresa, limites de chamadas e logs.
5. Banco: tabelas novas, isoladas por empresa, para `agent_definitions`, `agent_runs`,
   `agent_actions`, `agent_approvals`, `agent_audit_events` e filas.
   Não criar diretamente em produção; versionar migration e validar RLS.
6. Provedor de modelos: chave server-side armazenada em secrets da Vercel/Supabase,
   escolher provedor adequado a uso no app; gateway que troca modelos por tarefa
   e prevê tempo limite, custo, tratamento de falhas e redatores de PII.
7. Ferramentas: listas explícitas como `consultar_fluxo_caixa`, `resumir_inadimplencia`,
   `listar_titulos_pendentes` e `sugerir_conciliacao`. Consultas pelo servidor/escopo JWT,
   nunca SQL livre gerado pela IA. Escritas apenas por funções oficiais transacionais.
8. Proteções: logs de auditoria, limites, idempotência, anti-prompt-injection,
   testes de autorização cross-tenant e circuit breaker.

## Níveis e entregas
| Fase | Escopo | Condição de aceitação |
|---|---|---|
| 0 | Conter P0 | Credenciais antigas invalidadas; login real com Auth; RLS validada e testada |
| 1 | Infraestrutura de IA backend | API autenticada e secrets server-side; não há acesso direto browser→modelo |
| 2 | Agente CFO/Fluxo de Caixa leitura | Retorna análise sem alterar dados; filtros da empresa são verificados no servidor |
| 3 | Auditor de títulos e conciliação leitura | Tarefas e sugestões rastreadas; testes de regressão financeira |
| 4 | Propostas com aprovação | Registros de aprovação do usuário antes de qualquer baixa/cancelamento |
| 5 | Autonomia limitada | Rotinas de baixo risco agendadas; quotas, alertas, auditoria, rollback e desligamento |

## Testes de aceite mínimos
- Usuário da Empresa A nunca consegue consultar dados da B (inclusive por alteração do corpo da requisição).
- Sem JWT ou com JWT expirado: API rejeita.
- Chave de IA não aparece em bundle `dist`, response, localStorage ou logs.
- Conciliação sugerida pela IA não altera movimentos até aprovação explícita.
- Solicitações duplicadas não geram liquidações duplicadas.
- Perda de rede, 429 e falha de modelo não quebram operações financeiras.
- Erros de análise não são apresentados como cálculos financeiros oficiais.
