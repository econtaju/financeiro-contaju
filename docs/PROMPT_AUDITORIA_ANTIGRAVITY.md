# Primeiro comando para o Antigravity / OpenCode

Atue como CTO do Financeiro ContaJu. Leia primeiro `AGENTS.md`.

Delegue (se houver suporte real) revisão paralela para:
`@contaju-seguranca`, `@contaju-supabase`, `@contaju-financeiro`,
`@contaju-orquestrador-ia`, `@contaju-vercel`, `@contaju-qualidade`.

Audite o estado atual do repositório, principalmente:
- `src/services/storageService.ts`, `src/services/aiService.ts`,
  `src/components/Config/AiConfigView.tsx`,
  `src/services/supabaseClient.ts`, `src/services/supabaseSyncService.ts`,
  `supabase/schema.sql`, `vercel.json`.
- Verifique como as credenciais e sessões são armazenadas.
- Verifique políticas SQL permissivas, permissões e ausência de vínculo por empresa.
- Verifique a integração atual com modelos, timeout, failover e vazamento de segredos.
- Investigue a integridade dos motores financeiros antes de qualquer alteração.

**Obrigatório:** MODO SOMENTE LEITURA.
Sem alteração de arquivos, sem SQL mutável, sem chamadas a produção, sem deploy.

Entregue:
1. Lista priorizada de falhas com arquivo/linha, evidência e hipótese vs confirmação.
2. Plano em PRs pequenos e independentes, com testes e rollback.
3. Arquitetura da Central de Agentes: API autenticada, modelos, ferramentas e aprovações.
4. Perguntas restantes indispensáveis para ligar o sistema em produção.
