-- CONSULTA SOMENTE LEITURA para Supabase SQL Editor.
-- Executar somente após confirmar o ambiente correto; não altera tabelas nem permissões.
-- Não retorna dados financeiros nem credenciais.
SELECT n.nspname AS esquema,
       c.relname AS tabela,
       c.relrowsecurity AS rls_habilitada,
       c.relforcerowsecurity AS rls_forcada
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND c.relname LIKE 'contaju\_%' ESCAPE '\'
ORDER BY 1,2;

SELECT schemaname AS esquema,
       tablename AS tabela,
       policyname AS politica,
       roles AS papeis,
       cmd AS comando,
       qual AS regra_leitura,
       with_check AS regra_escrita
FROM pg_policies
WHERE tablename LIKE 'contaju\_%' ESCAPE '\'
ORDER BY 1,2,3;
