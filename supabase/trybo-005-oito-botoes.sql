-- ============================================================
-- TRYBO 005 — até OITO botões por cartão (19/10/2026)
-- Rodar UMA VEZ no Supabase, ANTES do deploy que libera 8 no painel.
-- Idempotente. Só ALARGA a regra do trybo-004 (que foi de 2 para 4).
-- ============================================================
--
-- Pedido do Ricardo no mesmo dia: com os botões avançados liberados, quatro
-- vagas não bastam (Instagram, WhatsApp, YouTube, TikTok + agenda, site...).
-- Oito é o teto: cabe com folga na página do toque (11,7 KB com 8) e não
-- vira uma lista que o cliente no balcão desiste de ler.
-- ============================================================

ALTER TABLE plate_destinations DROP CONSTRAINT IF EXISTS plate_destinations_posicao_check;
ALTER TABLE plate_destinations ADD CONSTRAINT plate_destinations_posicao_check
  CHECK (posicao BETWEEN 1 AND 8);

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
     LIMIT 8
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
-- Deve devolver: regra "CHECK ((posicao >= 1) AND (posicao <= 8))",
-- limite_8 = true e pode_executar = true.
SELECT
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
    WHERE conname = 'plate_destinations_posicao_check') AS regra,
  (SELECT prosrc LIKE '%LIMIT 8%' FROM pg_proc WHERE proname = 'trybo_destinos_resolvidos') AS limite_8,
  (SELECT has_function_privilege('service_role', 'public.trybo_destinos_resolvidos(uuid)', 'EXECUTE')) AS pode_executar;
