-- ============================================================
-- StarTouch — A CATRACA: contagem agregada de visitas
-- Só leitura de estrutura. Supabase → SQL Editor → cola TUDO → Run.
-- ============================================================
-- POR QUE EXISTE
--
-- Medido em 02/09/2026: em 7 dias o servidor viu ~1.100 carregamentos de
-- página com navegador real, e o GA4 registrou 195 visualizações. A diferença
-- não é bug — é o banner de cookies funcionando (o GA4 só conta quem aceita) e
-- o site ser pequeno demais pra o Google estimar o resto (a modelagem dele
-- exige 1.000 eventos/dia por 7 dias; o site faz 200).
--
-- Resultado: a régua de VOLUME do site passou a ser um número que mede
-- consentimento, não tráfego. Quem lê "81 sessões" e entende "81 visitas"
-- erra por um fator de 5 a 10. Já aconteceu: a queda do GA4 em agosto foi
-- lida como "o tráfego caiu".
--
-- Esta tabela é a catraca da porta. Ela conta a PORTA, não a PESSOA.
--
-- POR QUE NÃO PRECISA DE CONSENTIMENTO
--
-- Não existe linha por pessoa. Cada linha é um CONTADOR do dia, por página e
-- origem — `2026-09-02 | /landing | ig | paid_social | 37`. Não há IP, user
-- agent, cookie, nem identificador de navegador. Nada aqui permite
-- reconstituir uma pessoa, nem por cruzamento, porque a informação individual
-- nunca chega a ser gravada: ela é somada e descartada na mesma operação.
-- Não sendo dado pessoal (LGPD Art. 5º, I), não há tratamento de dado pessoal
-- a consentir. É o mesmo racional que já sustenta `plate_taps`.
-- Declarado na Política de Privacidade §6.5 e §9.
--
-- ⚠️ NUNCA ADICIONAR A ESTA TABELA: ip, user_agent, anon_id, session_id,
-- hora exata (timestamp), ou qualquer coluna que individualize um acesso.
-- No instante em que uma delas entrar, a tabela vira dado pessoal, a base
-- legal cai por terra e a Política de Privacidade publicada fica FALSA —
-- que é pior do que nunca ter declarado nada. Se precisar de granularidade
-- por pessoa, a resposta é o GA4 com consentimento, não esta tabela.
-- ============================================================

create table if not exists page_hits (
  dia       date    not null,
  path      text    not null,
  source    text    not null default '(direto)',
  medium    text    not null default '(nenhum)',
  campaign  text    not null default '(nenhuma)',
  hits      integer not null default 0,
  -- A chave é a granularidade inteira da tabela. Não existe "uma visita":
  -- existe o balde do dia, e ele só sabe somar.
  primary key (dia, path, source, medium, campaign)
);

create index if not exists idx_page_hits_dia on page_hits(dia desc);

-- ── Incremento atômico ──────────────────────────────────────
-- O supabase-js não tem "upsert que soma". Sem isto, o endpoint teria que
-- ler-somar-escrever, e dois acessos simultâneos perderiam uma contagem.
-- Aqui é uma instrução só, resolvida pelo Postgres.
create or replace function registrar_visita(
  p_dia      date,
  p_path     text,
  p_source   text,
  p_medium   text,
  p_campaign text
) returns void
language sql
as $$
  insert into page_hits (dia, path, source, medium, campaign, hits)
  values (p_dia, p_path, p_source, p_medium, p_campaign, 1)
  on conflict (dia, path, source, medium, campaign)
  do update set hits = page_hits.hits + 1;
$$;

-- ── RLS ligada com ZERO policies ────────────────────────────
-- Regra da casa, aprendida do jeito caro em 22/08/2026: o Supabase concede
-- GRANT ALL pra `anon` e `authenticated` em TODA tabela criada no schema
-- public. A chave anônima é pública. Tabela sem RLS nasce com INSERT, UPDATE,
-- DELETE e TRUNCATE abertos pra qualquer um. A única coisa que impede é a RLS.
-- Sem policy nenhuma: só a SERVICE_KEY (que ignora RLS) entra.
alter table page_hits enable row level security;

-- A função também precisa de porta fechada. Sem isto, `anon` poderia chamar
-- registrar_visita() direto pelo PostgREST e inflar o contador sem passar
-- pelo endpoint (que é onde vive a validação de origem).
revoke execute on function registrar_visita(date, text, text, text, text) from public;
revoke execute on function registrar_visita(date, text, text, text, text) from anon;
revoke execute on function registrar_visita(date, text, text, text, text) from authenticated;
grant  execute on function registrar_visita(date, text, text, text, text) to   service_role;

-- ── Conferência (a proteção tem que provar que está ligada) ──
-- Depois de rodar o bloco acima, rode isto. As duas linhas têm que voltar.
select 'RLS ligada' as checagem,
       relrowsecurity as ok
  from pg_class where relname = 'page_hits'
union all
select 'anon NAO executa a funcao',
       not has_function_privilege('anon', 'registrar_visita(date,text,text,text,text)', 'execute');
