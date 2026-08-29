// ============================================================
// StarTouch V3 — Reputação
// ============================================================
// Área MISTA e a base é gratuita: nota, total, avaliações recentes e posição
// por grade são o que o cliente já tem. Nada disso muda de plano aqui.
//
// Honestidade obrigatória desta tela: a API pública do Google devolve ~5
// avaliações, e só. Ler o conteúdo de todas, responder de dentro do painel e
// resumir assuntos recorrentes dependem de conectar o Perfil da Empresa. Isso
// aparece como CONVITE para conectar, nunca como card vazio esperando dado que
// não temos — e nunca como número estimado.
// ============================================================
import React from 'react'
import { ExternalLink, Link2 } from 'lucide-react'
import { Head, Kpi, Panel, Chip, Recursos, Estrelas, dataBr } from '../ui.jsx'

const RECURSOS = [
  { n: 'Nota e total de avaliações', p: 'free', s: 'pronto' },
  { n: 'Avaliações recentes', d: 'as que o Google devolve publicamente', p: 'free', s: 'pronto' },
  { n: 'Posição na região', d: 'medida por grade ao redor do seu endereço', p: 'free', s: 'pronto' },
  { n: 'Responder no Google de dentro do painel', d: 'exige conectar o Perfil da Empresa', p: 'pro', s: 'nao' },
  { n: 'Sugestão de resposta com IA', p: 'pro', s: 'nao' },
  { n: 'Assuntos recorrentes nas avaliações', p: 'pro', s: 'nao' }
]

function Avaliacao({ r }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: 12.8 }}>{r.author}</span>
        <Estrelas nota={r.rating} tamanho={12}/>
        <span className="sm">{r.date}</span>
      </div>
      {r.text
        ? <div style={{ fontSize: 12.5, color: 'var(--mid)', lineHeight: 1.5 }}>{r.text}</div>
        : <div className="sm" style={{ fontStyle: 'italic' }}>Avaliação sem texto — só a nota.</div>}
    </div>
  )
}

export default function Reputacao({ dados }) {
  const { biz, info, avaliacoes, posicao } = dados
  const nota = avaliacoes?.rating ?? info?.rating ?? null
  const total = avaliacoes?.total ?? info?.total ?? null
  const lista = avaliacoes?.reviews || []
  const linkGoogle = info?.gmapsUrl
    || (biz?.place_id ? `https://search.google.com/local/reviews?placeid=${biz.place_id}` : null)

  // Distribuição por estrelas SÓ do que veio — e dito com todas as letras.
  // Chamar isso de "distribuição das suas avaliações" seria mentira: são as
  // ~5 mais recentes, não as 800 do perfil.
  const dist = [5, 4, 3, 2, 1].map(n => ({ n, qtd: lista.filter(r => Math.round(r.rating) === n).length }))
  const maxDist = Math.max(1, ...dist.map(d => d.qtd))

  return (
    <>
      <Head titulo="Reputação" sub="Sua nota, suas avaliações e sua posição na região">
        {linkGoogle && (
          <a className="v3-btn" href={linkGoogle} target="_blank" rel="noopener noreferrer">
            Abrir no Google <ExternalLink size={12} style={{ verticalAlign: -1 }}/>
          </a>
        )}
      </Head>

      <div className="v3-kpis">
        <Kpi
          rotulo="Nota no Google"
          valor={nota != null ? nota.toFixed(1).replace('.', ',') : null}
          sub={nota != null ? <Estrelas nota={nota}/> : 'não foi possível consultar agora'}/>
        <Kpi
          rotulo="Avaliações no total"
          valor={total != null ? total.toLocaleString('pt-BR') : null}
          sub="no seu perfil do Google"/>
        <Kpi
          rotulo="Posição na região"
          valor={posicao && posicao.coverage > 0 && posicao.avg != null
            ? `${Math.round(posicao.avg)}º`
            : (posicao && posicao.coverage === 0 ? 'fora da lista' : null)}
          sub={posicao ? `em “${posicao.term}”` : 'não medida agora'}/>
        <Kpi
          rotulo="Onde você aparece"
          valor={posicao ? `${posicao.coverage} de ${posicao.measured}` : null}
          sub={posicao ? 'pontos medidos ao redor do seu endereço' : 'não medida agora'}/>
      </div>

      {posicao && (
        <Panel
          titulo="Sua posição na região"
          extra={<Chip tipo="g">Free</Chip>}
          sub={`Busca medida: “${posicao.term}”${posicao.measuredAt ? ` · medido em ${dataBr(posicao.measuredAt)}` : ''}`}
          rodape="O Google não mostra a mesma lista para todo mundo: ela muda conforme o lugar de onde a pessoa procura. Por isso medimos em vários pontos ao redor do seu endereço, e não em um só.">
          {posicao.coverage === 0 ? (
            <p style={{ fontSize: 12.8, color: 'var(--mid)', padding: '8px 0' }}>
              Testamos {posicao.measured} lugares ao redor do seu endereço e em nenhum deles você aparece
              para quem busca “{posicao.term}”. Isso costuma ser sinal de que a busca medida não é a que
              seus clientes usam — dá para trocar a busca nas configurações do painel atual.
            </p>
          ) : (
            <div className="v3-table-wrap">
              <table className="v3-t">
                <thead>
                  <tr><th>Negócio</th><th className="num">Lugar no Google</th><th className="num">Nota</th><th className="num">Avaliações</th></tr>
                </thead>
                <tbody>
                  {[...(posicao.ranking || [])]
                    .sort((a, b) => (a.avg ?? 99) - (b.avg ?? 99) || (b.points ?? 0) - (a.points ?? 0))
                    .slice(0, 10)
                    .map((r, i) => (
                      <tr key={i} style={r.is_me ? { background: 'var(--blue-soft)' } : null}>
                        <td>
                          <div className={r.is_me ? 'nm' : ''} style={r.is_me ? { color: 'var(--blue-dk)' } : null}>
                            {r.name}{r.is_me ? ' · você' : ''}
                          </div>
                          {r.points != null && r.points < posicao.measured && (
                            <div className="sm">aparece em {r.points} de {posicao.measured} pontos</div>
                          )}
                        </td>
                        <td className="num">{r.avg != null ? Math.round(r.avg) + 'º' : '—'}</td>
                        <td className="num">{r.rating != null ? r.rating.toFixed(1).replace('.', ',') : '—'}</td>
                        <td className="num">{r.reviews != null ? r.reviews.toLocaleString('pt-BR') : '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {!posicao && (
        <div className="v3-callout">
          <div>
            <div className="t">A posição não pôde ser medida agora</div>
            <div className="s">
              Pode ser limite de consultas ou uma falha momentânea do Google. Não quer dizer que você
              saiu da lista — é diferente de “fora da lista”, e por isso não mostramos um número no lugar.
            </div>
          </div>
        </div>
      )}

      <div className="v3-cols">
        <Panel
          titulo="Avaliações recentes"
          extra={<Chip tipo="g">Free</Chip>}
          sub={`As ${lista.length} que o Google devolve publicamente`}
          rodape={linkGoogle
            ? <a href={linkGoogle} target="_blank" rel="noopener noreferrer">Ver e responder no Google →</a>
            : null}>
          {lista.length === 0 && (
            <p style={{ fontSize: 12.8, color: 'var(--dim)', padding: '10px 0' }}>
              Nenhuma avaliação recente foi devolvida agora.
            </p>
          )}
          {lista.map((r, i) => <Avaliacao key={i} r={r}/>)}
        </Panel>

        <div>
          {lista.length > 0 && (
            <Panel
              titulo="Notas das recentes"
              sub="Só das avaliações acima — não do seu histórico inteiro">
              {dist.map(d => (
                <div key={d.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                  <span className="sm" style={{ width: 34 }}>{d.n} ★</span>
                  <div className="v3-meter" style={{ flex: 1 }}>
                    <i style={{ width: `${(d.qtd / maxDist) * 100}%` }}/>
                  </div>
                  <span className="num sm" style={{ width: 20 }}>{d.qtd}</span>
                </div>
              ))}
            </Panel>
          )}

          <div className="v3-callout info">
            <Link2 size={16} color="var(--blue-dk)" style={{ flex: 'none', marginTop: 1 }}/>
            <div>
              <div className="t">Conecte seu Perfil da Empresa no Google</div>
              <div className="s">
                É o que destrava ler todas as avaliações (não só as 5 públicas), responder sem sair
                daqui e resumir os assuntos que mais aparecem. Ainda não está disponível — quando
                estiver, o convite aparece aqui.
              </div>
            </div>
          </div>
        </div>
      </div>

      <Recursos itens={RECURSOS}/>
    </>
  )
}
