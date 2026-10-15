# Diagnóstico inicial — Financeiro ContaJu
**Base de análise**: somente o repositório público `https://github.com/econtaju/financeiro-contaju`,
branch `main` consultada em 14/10/2026. Não foi acessado o banco vivo ou executado deploy.

## Constatações

| Gravidade | Evidência em código | Risco e recomendação |
|---|---|---|
| P0 | `supabase/schema.sql`: `CREATE POLICY "Public access for contaju" ... USING (true) WITH CHECK (true)` | Política não isola dados. Verificar roles e políticas efetivamente aplicadas; planejar políticas vinculadas a identidade e empresa. |
| P0 | `src/services/storageService.ts`: fluxo administrativo legado, credenciais fixas, login gerenciado no navegador e 2FA legada | Reestruturar para autenticação verificada no servidor, remover senhas/atalhos antigos, rotacionar credenciais comprometidas. |
| P0/P1 | `src/services/aiService.ts` + `src/components/Config/AiConfigView.tsx` | `apiKey` salva no navegador e enviada diretamente via `fetch`. Migrar chamada de modelos para backend autenticado, retirar chave do localStorage. |
| P1 | `src/services/aiService.ts`: endpoint e modelos padrão | O endpoint e a lista não batem com as rotas/modelos publicados atualmente para OpenCode Go. Revisar também a compatibilidade por protocolo. |
| P1 | `src/services/supabaseSyncService.ts` + `storageService.ts` | Sincronização offline/cloud: definir fonte de verdade, tratamento de conflito, exclusão e segurança entre empresas. |
| P2 | `src/components/Config/SettingsHubView.tsx`: aba `IA` e `AiConfigView` | Pode ser reaproveitada para configuração sem credenciais e aprovação de ações, em vez de substituir a UI existente. |

## Pontos de atenção
- A aplicação usa React/TypeScript/Vite, não Next.js.
- O banco usa prefixos `contaju_*`. Prefixo **não** substitui isolamento de acesso.
- O arquivo SQL de schema não comprova sozinho quais políticas estão instaladas no Supabase vivo.
- `VITE_*` é compilado para o cliente: jamais colocar chave privada de IA ou service role em uma dessas variáveis.
- Não reescrever o código de finanças antes de definir invariantes e testes de regressão.
- Não colar chaves aqui. Nunca fazer commits de `.env`.

## Referências diretas
- https://github.com/econtaju/financeiro-contaju/blob/main/src/services/aiService.ts
- https://github.com/econtaju/financeiro-contaju/blob/main/src/services/storageService.ts
- https://github.com/econtaju/financeiro-contaju/blob/main/supabase/schema.sql
- https://docs.opencode.ai/docs/go/
- https://opencode.ai/docs/agents/
