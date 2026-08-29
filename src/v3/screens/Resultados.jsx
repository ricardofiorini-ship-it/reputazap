// ============================================================
// StarTouch V3 — Resultados
// ============================================================
// A camada de cruzamento: o que aconteceu DEPOIS do toque.
//
// A RÉGUA: a contagem de toques continua gratuita em Dispositivos. Aqui ela
// aparece como DENOMINADOR — sem o número de baixo, o cruzamento não diz
// nada. O que se paga é o cruzamento.
//
// A LEITURA UNIFICA OS DOIS CAMINHOS: todo toque termina de um jeito só de
// dois — ou foi direto ao Google, ou abriu um menu e escolheu. Assim o
// dispositivo em Google Direto não fica de fora do relatório, e a diferença
// entre os dois aparece MEDIDA.
//
// NÃO EXISTE "taxa de conversão" aqui, e é decisão, não esquecimento: toque →
// clique nós medimos; toque → avaliação publicada o Google não devolve. Um
// número que sugerisse a segunda leitura seria inventado.
// ============================================================
import React from 'react'
import { Info, TrendingUp } from 'lucide-react'
import { Head, Kpi, Panel, Chip, Delta, Carregando, Erro, dataBr } from '../ui.jsx'
import { nomeProduto } from '../lib/dados.js'
import { get } from '../lib/api.js'

const JANELAS = [7, 30, 90]

const NOME_ACAO = {
  google: 'Avaliar no Google', whatsapp: 'WhatsApp', instagram: 'Instagram',
  food_menu: 'Cardápio', phone: 'Telefone', location: 'Como chegar',
  website: 'Site', contact: 'Salvar contato', custom_url: 'Link personalizado'
}
const COR_ACAO = {
  google: '#F5A623', whatsapp: '#1E8E3E', instagram: '#7B4BC4', food_menu: '#B06000',
  phone: '#1557B0', location: '#4A5666', website: '#1557B0', contact: '#B3261E', custom_url: '#4A5666'
}

// Barra proporcional com rótulo. Sem biblioteca de gráfico: são linhas com
// largura percentual, e uma dependência pra isso seria peso sem retorno.
function Linha({ nome, cor, valor, maximo, sub }) {
  const pct = maximo > 0 ? Math.round((valor / maximo) * 100) : 0
  return (
    <div className="v3-linha">
      <span className="nm">{nome}</span>
      <span className="barra"><i style={{ width: `${Math.max(2, pct)}%`, background: cor || 'var(--blue)' }}/></span>
      <span className="v">{valor.toLocaleString('pt-BR')}</span>
      {sub && <span className="s">{sub}</span>}
    </div>
  )
}

export default function Resultados() {
  const [dias, setDias] = React.useState(30)
  const [estado, setEstado] = React.useState({ carregando: true, erro: null, d: null })

  const carregar = React.useCallback(async (j) => {
    setEstado(s => ({ ...s, carregando: true }))
    try {
      const d = await get(`/api/results?days=${j}`, { auth: true })
      setEstado({ carregando: false, erro: null, d })
    } catch (e) {
      setEstado({ carregando: false, erro: e.message || 'Não foi possível carregar.', d: null })
    }
  }, [])

  React.useEffect(() => { carregar(dias) }, [dias, carregar])

  if (estado.carregando && !estado.d) return <Carregando o="seus resultados"/>
  if (estado.erro) return <Erro mensagem={estado.erro} onTentar={() => carregar(dias)}/>

  const d = estado.d
  const toques = d.toques.total
  const aberturas = d.menu.aberturas
  const cliques = d.menu.cliques
  const direto = d.toques.direto_ao_google
  const acoes = Object.entries(d.menu.por_acao).sort((a, b) => b[1] - a[1])
  const maxAcao = Math.max(1, ...acoes.map(a => a[1]))
  // Quantas escolhas cada abertura gerou. É o número honesto que temos —
  // e não uma "conversão" que sugeriria avaliação publicada.
  const escolhasPorAbertura = aberturas > 0 ? (cliques / aberturas) : null

  const semNada = toques === 0 && aberturas === 0

  return (
    <>
      <Head titulo="Resultados" sub="O que aconteceu depois que alguém encostou o celular">
        <div className="v3-seg">
          {JANELAS.map(j => (
            <button key={j} aria-pressed={dias === j} onClick={() => setDias(j)}>{j} dias</button>
          ))}
        </div>
      </Head>

      {!d.disponivel.eventos && (
        <div className="v3-callout">
          <div>
            <div className="t">O registro de cliques ainda não está ligado</div>
            <div className="s">
              Os toques continuam sendo contados normalmente em Dispositivos. O que falta aqui é o registro
              do que a pessoa fez depois de abrir o menu.
            </div>
          </div>
        </div>
      )}

      {semNada ? (
        <div className="v3-empty">
          <TrendingUp size={20} color="var(--blue)"/>
          <h3>Ainda não há movimento neste período</h3>
          <p>
            Esta tela se preenche sozinha conforme as pessoas encostam o celular nos seus dispositivos.
            Se você acabou de ligar um menu, experimente um período maior ou volte em alguns dias.
          </p>
        </div>
      ) : (
        <>
          <div className="v3-kpis">
            <Kpi rotulo="Toques nos dispositivos" valor={toques.toLocaleString('pt-BR')}
              sub={<Delta atual={toques} anterior={d.toques.anterior}/>}/>
            <Kpi rotulo="Abriram um menu" valor={aberturas.toLocaleString('pt-BR')}
              sub={d.menu.aberturas_de_link > 0
                ? `${d.menu.aberturas_de_link} ${d.menu.aberturas_de_link === 1 ? 'veio' : 'vieram'} por link, sem dispositivo`
                : <Delta atual={aberturas} anterior={d.menu.aberturas_anterior}/>}/>
            <Kpi rotulo="Escolhas no menu" valor={cliques.toLocaleString('pt-BR')}
              sub={aberturas > 0 ? 'botões tocados pelos seus clientes' : null}/>
            <Kpi
              rotulo="Escolhas por abertura"
              valor={escolhasPorAbertura != null ? escolhasPorAbertura.toFixed(1).replace('.', ',') : null}
              indisponivel="sem abertura ainda"
              sub={escolhasPorAbertura != null ? 'quantas ações cada pessoa tocou' : null}/>
          </div>

          {/* A leitura principal: todo toque termina de um jeito só de dois. */}
          <Panel
            titulo="O que aconteceu depois do toque"
            extra={<Chip>PRO</Chip>}
            sub={`De ${dataBr(d.de)} a ${dataBr(d.ate)}`}>
            <p className="v3-dica" style={{ padding: '4px 0 12px' }}>
              <b>{toques.toLocaleString('pt-BR')} {toques === 1 ? 'pessoa encostou' : 'pessoas encostaram'} o celular</b> nos
              seus dispositivos neste período.
            </p>
            <Linha nome="Foram direto ao Google" cor="#F5A623" valor={direto} maximo={Math.max(1, toques)}
              sub="dispositivos em Google Direto"/>
            <Linha nome="Abriram um menu" cor="var(--blue)" valor={d.menu.aberturas_de_dispositivo} maximo={Math.max(1, toques)}
              sub="dispositivos com Menu Inteligente"/>
            {d.menu.aberturas_de_link > 0 && (
              <div className="v3-dica" style={{ marginTop: 10 }}>
                Mais {d.menu.aberturas_de_link} {d.menu.aberturas_de_link === 1 ? 'abertura veio' : 'aberturas vieram'} pelo
                link compartilhado, sem passar por um dispositivo — não entram na conta acima porque não houve toque.
              </div>
            )}
          </Panel>

          {acoes.length > 0 && (
            <Panel titulo="Para onde as pessoas foram" extra={<Chip>PRO</Chip>}
              sub={`${cliques} ${cliques === 1 ? 'escolha' : 'escolhas'} de quem abriu o menu`}>
              {acoes.map(([acao, n]) => (
                <Linha key={acao} nome={NOME_ACAO[acao] || acao} cor={COR_ACAO[acao]} valor={n} maximo={maxAcao}
                  sub={aberturas > 0 ? `${Math.round((n / aberturas) * 100)}% de quem abriu` : null}/>
              ))}
            </Panel>
          )}

          {d.menu.por_botao.length > 1 && (
            <Panel titulo="Por botão" extra={<Chip>PRO</Chip>}
              sub="O mesmo tipo de ação pode aparecer mais de uma vez no menu">
              <div className="v3-table-wrap">
                <table className="v3-t">
                  <thead><tr><th>Botão</th><th>Ação</th><th className="num">Escolhas</th></tr></thead>
                  <tbody>
                    {d.menu.por_botao.map(b => (
                      <tr key={b.button_id}>
                        <td className="nm">{b.label || <span className="sm">botão removido do menu</span>}</td>
                        <td className="sm">{NOME_ACAO[b.action] || b.action || '—'}</td>
                        <td className="num">{b.cliques}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          <div className="v3-cols">
            <Panel titulo="Por dispositivo" extra={<Chip>PRO</Chip>}
              sub="O que cada ponto de contato produziu — a contagem de toques em si fica em Dispositivos">
              {!d.por_dispositivo.length && <p className="v3-dica" style={{ padding: '8px 0' }}>Nenhum dispositivo com movimento no período.</p>}
              {d.por_dispositivo.length > 0 && (
                <div className="v3-table-wrap">
                  <table className="v3-t">
                    <thead><tr>
                      <th>Dispositivo</th><th>Serve</th>
                      <th className="num">Toques</th><th className="num">Aberturas</th><th className="num">Escolhas</th>
                    </tr></thead>
                    <tbody>
                      {d.por_dispositivo.map(p => (
                        <tr key={p.plate_id}>
                          <td><div className="nm">{p.nome}</div><div className="sm">{nomeProduto(p.product_type)}</div></td>
                          <td>{p.servindo === 'menu' ? <Chip>Menu</Chip> : <Chip tipo="g">Google</Chip>}</td>
                          <td className="num">{p.toques}</td>
                          {/* Traço, não zero: dispositivo em Google Direto não
                              tem menu pra abrir. Zero diria que ninguém abriu. */}
                          <td className="num">{p.servindo === 'menu' ? p.aberturas : '—'}</td>
                          <td className="num">{p.servindo === 'menu' ? p.cliques : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <div>
              {d.menu.por_experiencia.length > 0 && (
                <Panel titulo="Por menu" extra={<Chip>PRO</Chip>} sub="Quando você tem mais de um">
                  <div className="v3-table-wrap">
                    <table className="v3-t">
                      <thead><tr><th>Menu</th><th className="num">Aberturas</th><th className="num">Escolhas</th></tr></thead>
                      <tbody>
                        {d.menu.por_experiencia.map(e => (
                          <tr key={e.experience_id}>
                            <td className="nm">{e.name}</td>
                            <td className="num">{e.aberturas}</td>
                            <td className="num">{e.cliques}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              )}

              {/* O gráfico de toques por dia NÃO mora aqui. Ele é gratuito e
                  vive em Dispositivos — repetir a mesma informação em duas
                  telas faz o cliente não saber onde procurar, e ainda por
                  cima colocaria dentro do Pro algo que ele já tem de graça. */}
              <div className="v3-callout info">
                <Info size={16} color="var(--blue-dk)" style={{ flex: 'none', marginTop: 1 }}/>
                <div>
                  <div className="t">Procurando a contagem de toques por dia?</div>
                  <div className="s">
                    Ela fica em <b>Dispositivos</b>, com histórico, meio de chegada e último toque — e
                    continua gratuita. Aqui a gente mostra o que aconteceu <b>depois</b> do toque.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* A ausência que é decisão, dita em voz alta — senão alguém acrescenta
          o número "que falta" um dia, sem saber por que ele não estava lá. */}
      <div className="v3-callout info">
        <Info size={16} color="var(--blue-dk)" style={{ flex: 'none', marginTop: 1 }}/>
        <div>
          <div className="t">Por que não existe “taxa de conversão” aqui</div>
          <div className="s">
            Nós medimos quem tocou e quem escolheu cada botão. Quem de fato publicou uma avaliação depois de
            chegar ao Google, o Google não nos informa — então qualquer número com esse nome seria estimado,
            e a gente prefere não ter o número a ter um número inventado.
          </div>
        </div>
      </div>
    </>
  )
}
