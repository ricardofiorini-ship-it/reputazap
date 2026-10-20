-- ============================================================
-- TRYBO 004 — até QUATRO destinos por cartão (19/10/2026)
-- Rodar UMA VEZ no Supabase, ANTES do deploy que libera 4 no painel.
-- Idempotente. Só ALARGA a regra: tudo que vale hoje continua valendo.
-- ============================================================
--
-- POR QUE MUDOU
-- O trybo-001 travou o cartão em dois destinos ("um botão converte mais que
-- dois"). Só que o produto foi VENDIDO com quatro: as fotos do anúncio
-- mostram Instagram, TikTok, WhatsApp e YouTube juntos no menu, e a
-- descrição do Mercado Livre diz "as quatro redes estão incluídas". O
-- primeiro cliente — o próprio Ricardo, testando — pôs Instagram e WhatsApp
-- e não conseguiu somar mais nenhuma. Promessa vendida vale mais que a tese
-- de conversão; quem quiser um botão só continua tendo (com UM destino o
-- cartão abre direto nele, sem menu).
--
-- O banco continua sendo a trava de verdade, só que em 4.
-- ============================================================

-- 1. A regra da tabela: posição de 1 a 4.
ALTER TABLE plate_destinations DROP CONSTRAINT IF EXISTS plate_destinations_posicao_check;
ALTER TABLE plate_destinations ADD CONSTRAINT plate_destinations_posicao_check
  CHECK (posicao BETWEEN 1 AND 4);

-- 2. O que o cartão serve: até 4 (era LIMIT 2). Mesmo corpo do trybo-001.
CREATE OR REPLACE FUNCTION trybo_destinos_resolvidos(p_plate UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH cartao AS (
    SELECT id, business_id FROM plates WHERE id = p_plate
  ),
  permitidos AS (
    SELECT d.posicao, d.kind, k.label, d.url
      FROM cartao c
      JOIN plate_destinations d ON d.plate_id = c.id
      JOIN destination_kinds  k ON k.kind = d.kind
     WHERE k.is_free
        OR has_entitlement(c.business_id, 'destinos')
     ORDER BY d.posicao
     LIMIT 4
  ),
  rede_de_seguranca AS (
    SELECT 1::SMALLINT AS posicao, p.kind, k.label, p.url
      FROM cartao c
      JOIN social_profiles p ON p.business_id = c.business_id AND p.is_active
      JOIN destination_kinds k ON k.kind = p.kind AND k.is_free
     ORDER BY k.ordem
     LIMIT 1
  )
  SELECT COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
              'posicao', posicao, 'kind', kind, 'label', label, 'url', url
            ) ORDER BY posicao) FROM permitidos),
    (SELECT jsonb_agg(jsonb_build_object(
              'posicao', posicao, 'kind', kind, 'label', label, 'url', url
            )) FROM rede_de_seguranca),
    '[]'::jsonb
  );
$fn$;

-- Mesmas permissões do trybo-001 + trybo-002: só o backend chama.
REVOKE ALL ON FUNCTION trybo_destinos_resolvidos(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trybo_destinos_resolvidos(UUID) TO service_role;

-- ── CONFERÊNCIA ─────────────────────────────────────────────
-- Deve devolver: regra "CHECK ((posicao >= 1) AND (posicao <= 4))",
-- limite_4 = true e pode_executar = true.
SELECT
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
    WHERE conname = 'plate_destinations_posicao_check') AS regra,
  (SELECT prosrc LIKE '%LIMIT 4%' FROM pg_proc WHERE proname = 'trybo_destinos_resolvidos') AS limite_4,
  (SELECT has_function_privilege('service_role', 'public.trybo_destinos_resolvidos(uuid)', 'EXECUTE')) AS pode_executar;
