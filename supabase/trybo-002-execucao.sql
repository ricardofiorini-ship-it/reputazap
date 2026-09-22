-- ============================================================
-- TRYBO 002 — devolve ao backend o direito de chamar as funcoes
-- Rodar UMA VEZ no Supabase, DEPOIS do trybo-001-banco.sql.
-- Idempotente.
-- ============================================================
--
-- POR QUE ESTE ARQUIVO EXISTE (conserto de um erro meu, 22/09/2026)
--
-- O trybo-001 fecha as duas funcoes com:
--     REVOKE ALL ON FUNCTION ... FROM public, anon, authenticated;
--
-- A intencao estava certa (o navegador nao pode perguntar "esta conta
-- pagou?"), mas o alvo passou do ponto: em Postgres TODA role e membro
-- implicito de PUBLIC. Revogar de PUBLIC revoga tambem do `service_role`,
-- que e justamente quem o nosso backend usa.
--
-- Resultado sem este arquivo: o painel salvaria os destinos e tomaria
-- "permission denied for function" — um erro ALTO, que aparece na hora.
-- Nao e falha silenciosa; e so um trabalho que nao terminaria.
--
-- A regra que fica: `REVOKE ... FROM public` nao e "tirar de estranhos", e
-- "tirar de todo mundo". Quem precisa continuar entrando precisa de GRANT
-- explicito depois.
-- ============================================================

GRANT EXECUTE ON FUNCTION public.has_entitlement(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.trybo_destinos_resolvidos(UUID) TO service_role;

-- ── CONFERENCIA ─────────────────────────────────────────────
-- Deve devolver DUAS linhas, ambas com pode_executar = true.
SELECT p.proname AS funcao,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS pode_executar,
       has_function_privilege('anon',         p.oid, 'EXECUTE') AS anon_pode_NAO,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS logado_pode_NAO
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('has_entitlement', 'trybo_destinos_resolvidos');
-- Leitura: pode_executar = true, as outras duas = false.
-- Se anon ou logado vier true, o navegador consegue sondar quem pagou.
