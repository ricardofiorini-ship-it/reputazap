# Registro — rota anônima de `feedbacks`

**Data:** 22/08/2026
**Responsável:** Ricardo Fiorini (Encarregado pelo Tratamento de Dados Pessoais)

## O que era

A tabela `feedbacks` guarda contato (e-mail ou telefone), nome e texto deixados
por consumidores finais no formulário privado da "peneira" — o desvio que
oferecia ao cliente insatisfeito resolver no privado antes de avaliar
publicamente no Google.

A peneira foi removida do produto em **23/05/2026**. O formulário saiu da tela,
mas o caminho de gravação permaneceu aberto em **dois** pontos independentes:

1. **Endpoint** `POST /api/feedback` aceitava insert anônimo, sem autenticação:
   bastava `place_id` e `text`.
2. **Policy de RLS** `"Service can insert feedbacks"` (INSERT, `roles={public}`,
   `with_check=true`) permitia gravar direto pela chave anônima, sem passar pelo
   endpoint. O nome era enganoso: `service_role` ignora RLS por definição e
   nunca precisou de policy — ela existia para a peneira gravar do navegador.

Sem finalidade declarada, sem política de privacidade vigente à época e sem
consentimento rastreável.

## Verificação

Consulta executada em 22/08/2026, após o fechamento dos dois lados:

| | |
|---|---|
| Registros com contato preenchido | **0** |
| Titulares distintos | **0** |
| Registros com nome preenchido | **0** |
| Distribuição mensal | nenhuma linha |
| Total de registros na tabela | **5** |

**Nenhum dado pessoal de consumidor final foi coletado pelas rotas abertas.** Os
5 registros existentes na tabela não têm contato nem nome — são registros sem
identificação de pessoa.

Não houve operação de eliminação porque não havia o que eliminar. A porta esteve
aberta e nada entrou por ela.

*Nota metodológica:* "titulares distintos" seria contagem de contatos distintos
(`lower(btrim(contact))`), um limite superior — quem deixasse e-mail numa vez e
telefone noutra contaria duas vezes. Com resultado zero, a ressalva não se
aplica, mas fica registrada para uso futuro do mesmo procedimento.

## Fundamento

Art. 16 da LGPD — término do tratamento por fim da finalidade. A finalidade
original (mediação privada antes da avaliação pública) deixou de existir com a
remoção da peneira em 23/05/2026. Sem finalidade, não haveria hipótese que
sustentasse a guarda, e os registros seriam anonimizados. A verificação
dispensou a operação.

## Porta de entrada

Fechada em **22/08/2026**, nos dois lados:

- **Aplicação:** guard `410 Gone` em `api/feedback.js`, commit `5c4a575`; o bloco
  de código morto foi removido em seguida, commit `1c76ae5`.
- **Banco:** `drop policy "Service can insert feedbacks" on public.feedbacks;`
  Estado final confirmado: RLS ligada, **0 policies** — mesmo padrão de `orders`,
  `places_cache` e `rate_limits`.

Verificado em produção: `POST /api/feedback` responde **410**. Controle negativo:
`GET /api/feedback` sem token responde **401**, confirmando que a rota existe e
que o 410 é decisão, não rota inexistente.

Se a peneira voltar a existir, os dois lados precisam ser reabertos
deliberadamente — e antes disso é necessário contrato de operador com o lojista,
que nesse fluxo é o controlador do dado do consumidor.
