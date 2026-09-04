-- ============================================================
-- StarTouch — Taxa de aceite do banner de cookies
-- Só leitura de estrutura. Supabase → SQL Editor → cola TUDO → Run.
-- Depende de supabase/schema-visitas.sql (rode aquele antes).
-- ============================================================
-- POR QUE EXISTE
--
-- Sabemos que o GA4 só conta quem aceita cookies, e sabemos que ele registra
-- uma fração do tráfego. O que NÃO sabemos é a fração exata — e sem ela não
-- dá pra decidir a única coisa acionável que sobrou: vale reescrever o banner?
--
--   • Se o aceite já for alto, o banner não é o problema. O problema é o site
--     ser pequeno demais pra a modelagem do Google ligar, e aí não há o que
--     fazer no texto — mexer no banner seria trabalho por nada.
--   • Se o aceite for baixo, o texto e o momento em que ele aparece viram a
--     alavanca legítima, e dá pra medir se a mudança funcionou.
--
-- Esta tabela responde isso, e responde mais uma coisa de brinde: o
-- percentual "com_analise / total" tem que bater, grosso modo, com a razão
-- entre as páginas vistas no GA4 e as contadas pela catraca. São duas
-- medições independentes do MESMO número. Se divergirem muito, uma das duas
-- está mentindo — e é bom saber qual antes de decidir alguma coisa com elas.
--
-- POR QUE NÃO PRECISA DE CONSENTIMENTO
--
-- Mesmo desenho da catraca: contador por dia, sem linha por pessoa, sem IP,
-- sem user agent, sem cookie, sem identificador, sem hora exata. Uma linha é
-- "no dia 4 de setembro, 37 carregamentos chegaram sem decisão tomada". Não
-- individualiza, logo não é dado pessoal (LGPD Art. 5º, I).
--
-- Repare que medir a decisão sobre cookies não é rastrear ninguém: é contar
-- quantas vezes cada botão foi apertado. Declarado na Política §6.5.
--
-- ⚠️ Vale aqui a MESMA proibição da tabela page_hits: nada que individualize.
-- ============================================================

create table if not exists consent_hits (
  dia    date    not null,
  evento text    not null,
  hits   integer not null default 0,
  primary key (dia, evento)
);

-- Os eventos possíveis, e o que cada um significa:
--
--   No carregamento da página (exatamente um por carregamento):
--     sem_decisao      — o banner apareceu; o GA4 está negado neste momento
--     com_analise      — já havia aceite de análise salvo; o GA4 PODE medir
--     sem_analise      — já havia recusa salva; o GA4 não mede
--
--   No clique (só quando a pessoa decide de fato):
--     decidiu_aceitar  — clicou aceitando análise
--     decidiu_recusar  — clicou recusando análise
--
-- As duas contas que importam:
--   Quanto do site o GA4 enxerga = com_analise / (sem_decisao + com_analise + sem_analise)
--   Conversão do banner          = decidiu_aceitar / (decidiu_aceitar + decidiu_recusar)
--   Quantos ignoram o banner     = sem_decisao - (decidiu_aceitar + decidiu_recusar)

create index if not exists idx_consent_hits_dia on consent_hits(dia desc);

create or replace function registrar_consentimento(p_dia date, p_evento text)
returns void
language sql
as $$
  insert into consent_hits (dia, evento, hits)
  values (p_dia, p_evento, 1)
  on conflict (dia, evento)
  do update set hits = consent_hits.hits + 1;
$$;

-- RLS ligada, zero policies: só a SERVICE_KEY entra. Tabela nova no schema
-- public nasce com GRANT ALL pra anon, e a chave anônima é pública.
alter table consent_hits enable row level security;

revoke execute on function registrar_consentimento(date, text) from public;
revoke execute on function registrar_consentimento(date, text) from anon;
revoke execute on function registrar_consentimento(date, text) from authenticated;
grant  execute on function registrar_consentimento(date, text) to   service_role;

-- ── Conferência: a proteção tem que provar que está ligada ───
select 'RLS ligada' as checagem,
       relrowsecurity as ok
  from pg_class where relname = 'consent_hits'
union all
select 'anon NAO executa a funcao',
       not has_function_privilege('anon', 'registrar_consentimento(date,text)', 'execute');
