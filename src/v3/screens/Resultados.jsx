// ============================================================
// StarTouch V3 — Resultados
// ============================================================
// A tela conta uma história, nesta ordem: quantas pessoas interagiram → o que
// fizeram → onde aconteceu → como está evoluindo. Relatório técnico lista
// números; isto aqui precisa levar alguém do primeiro ao último bloco.
//
// A RÉGUA: a contagem de toques continua gratuita em Dispositivos. Aqui ela é
// DENOMINADOR — o número de baixo da conta. O que se paga é o cruzamento.
//
// UMA ARITMÉTICA QUE PRECISA CASAR: aberturas vindas do link compartilhado
// NÃO entram no percentual sobre toques, porque não houve toque. Misturar as
// duas coisas colocaria dois números discordantes na mesma tela — o indicador
// dizendo 67% e o bloco de baixo dizendo 50%. Elas aparecem à parte, com a
// razão escrita.
//
// NÃO EXISTE "taxa de conversão", e é decisão: toque → clique nós medimos;
// toque → avaliação publicada o Google não devolve.
// ============================================================
import React from 'react'
import { Info, TrendingUp, Link2, Lightbulb } from 'lucide-react'
import { Head, Kpi, Panel, Chip, Delta, Carregando, Erro, dataBr } from '../ui.jsx'
import { nomeProduto } from '../lib/dados.js'
import { get } from '../lib/api.js'

const JANELAS = [7, 30, 90]

const ACAO = {
  google:     { nome: 'Avaliar no Google', cor: '#F5A623', bg: '#FEF6E7', gl: '★' },
  whatsapp:   { nome: 'WhatsApp',          cor: '#1E8E3E', bg: '#E6F4EA', gl: '✆' },
  instagram:  { nome: 'Instagram',         cor: '#7B4BC4', bg: '#F2ECFB', gl: '◎' },
  food_menu:  { nome: 'Cardápio',          cor: '#B06000', bg: '#FEF3E0', gl: '▤' },
  phone:      { nome: 'Telefone',          cor: '#1557B0', bg: '#E8F0FE', gl: '☎' },
  location:   { nome: 'Como chegar',       cor: '#4A5666', bg: '#EDF1F6', gl: '⌖' },
  website:    { nome: 'Site',              cor: '#1557B0', bg: '#E8F0FE', gl: '⬡' },
  contact:    { nome: 'Salvar contato',    cor: '#B3261E', bg: '#FCE8E6', gl: '⊕' },
  custom_url: { nome: 'Link personalizado', cor: '#4A5666', bg: '#EDF1F6', gl: '↗' }
}
const acao = (t) => ACAO[t] || { nome: t || 'Outro', cor: '#4A5666', bg: '#EDF1F6', gl: '·' }

// Piso do StarTouch recomenda. Conselho tirado de três cliques não é insight,
// é ruído com cara de conselho — e ensina o dono a desconfiar dos próximos.
const PISO = { cliques: 10, aberturas: 5 }

// ── Gráfico de barras, largura inteira ──────────────────────
// Sem biblioteca: são N retângulos com altura percentual. A alternância entre
// as três séries é o que faz este gráfico ser diferente do gratuito de
// Dispositivos — lá é a contagem de toques; aqui é a comparação.
function Grafico({ serie, campo, cor }) {
  const max = Math.max(1, ...serie.map(p => p[campo]))
  const marcos = serie.length > 2 ? [0, Math.floor(serie.length / 2), serie.length - 1] : [0, serie.length - 1]
  return (
    <>
      <div className="v3-graf">
        {serie.map((p, i) => (
          <span key={i} className={'b' + (p[campo] === max && max > 0 ? ' hi' : '')}
            style={{ height: `${Math.max(2, (p[campo] / max) * 100)}%`, background: cor }}
            title={`${dataBr(p.dia)}: ${p[campo]}`}/>
        ))}
      </div>
      <div className="v3-eixo">
        {marcos.map(i => <span key={i}>{dataBr(serie[i]?.dia)}</span>)}
      </div>
    </>
  )
}

// ── StarTouch recomenda ─────────────────────────────────────
// O que aconteceu → o que significa → o que fazer. Devolve [] quando o dado
// não sustenta; o bloco simplesmente não existe nesse caso.
function recomendacoes(d) {
  const fora = []
  const aberturas = d.menu.aberturas
  const cliques = d.menu.cliques
  if (cliques < PISO.cliques || aberturas < PISO.aberturas) return fora

  // Com mais de um menu, a dica é POR MENU: "coloque no topo do menu" é
  // ambíguo quando existem dois, e conselho ambíguo não se executa.
  const menus = d.menu.por_experiencia || []
  const alvos = menus.length > 1
    ? menus.filter(m => (m.cliques || 0) >= PISO.cliques && (m.aberturas || 0) >= PISO.aberturas)
        .map(m => ({ nome: m.name, mapa: d.menu.por_acao_por_menu?.[m.experience_id] || {}, total: m.cliques }))
    : [{ nome: null, mapa: d.menu.por_acao, total: cliques }]

  for (const alvo of alvos) {
    const ord = Object.entries(alvo.mapa).sort((a, b) => b[1] - a[1])
    if (ord.length < 2 || !alvo.total) continue
    const [a1, a2] = ord
    const pct = Math.round(((a1[1] + a2[1]) / alvo.total) * 100)
    if (pct >= 60) {
      fora.push({
        titulo: `${acao(a1[0]).nome} e ${acao(a2[0]).nome} concentram ${pct}% das escolhas${alvo.nome ? ` em “${alvo.nome}”` : ''}`,
        texto: `Vale conferir se as duas estão entre os primeiros botões${alvo.nome ? ' desse menu' : ' do menu'} — a ordem muda o que as pessoas escolhem.`
      })
    }
  }

  // Dispositivo indo direto ao Google enquanto os com menu produzem escolhas.
  const semMenu = (d.por_dispositivo || []).filter(p => p.servindo !== 'menu' && p.toques >= 5)
  const media = aberturas > 0 ? cliques / aberturas : 0
  if (semMenu.length && media >= 1) {
    const top = semMenu.sort((a, b) => b.toques - a.toques)[0]
    fora.push({
      titulo: `${top.nome} recebeu ${top.toques} toques indo direto ao Google`,
      texto: `Nos seus dispositivos com menu, cada abertura gerou ${media.toFixed(1).replace('.', ',')} ações. Talvez valha experimentar um menu nele também.`
    })
  }
  return fora.slice(0, 2)
}

export default function Resultados() {
  const [dias, setDias] = React.useState(30)
  const [serie, setSerie] = React.useState('toques')
  const [aba, setAba] = React.useState('dispositivos')
  // Declarado AQUI, com os outros: hook depois de um `return` antecipado
  // quebra a ordem que o React espera e derruba a tela no segundo render.
  const [menuSel, setMenuSel] = React.useState('todos')
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
  const aberturasDisp = d.menu.aberturas_de_dispositivo
  const porLink = d.menu.aberturas_de_link
  const aberturas = d.menu.aberturas
  const cliques = d.menu.cliques
  const direto = d.toques.direto_ao_google
  const pctDireto = toques > 0 ? Math.round((direto / toques) * 100) : 0
  const pctMenu = toques > 0 ? Math.round((aberturasDisp / toques) * 100) : 0
  const mediaPorAbertura = aberturas > 0 ? cliques / aberturas : null
  // ── Escolhas: de qual menu? ──
  // Com mais de um menu, somar as escolhas dá um número certo com um
  // DENOMINADOR ERRADO: um botão que só existe no cartão do vendedor seria
  // dividido pelas aberturas do menu da mesa também. Por isso o percentual só
  // aparece quando o denominador é inequívoco — um menu escolhido, ou um menu
  // só existindo.
  const menus = d.menu.por_experiencia || []
  const umMenuSo = menus.length <= 1
  const menuAtivo = umMenuSo ? (menus[0] || null) : (menuSel === 'todos' ? null : menus.find(m => m.experience_id === menuSel))
  const acoesBrutas = menuAtivo
    ? (d.menu.por_acao_por_menu?.[menuAtivo.experience_id] || {})
    : d.menu.por_acao
  const acoes = Object.entries(acoesBrutas).sort((a, b) => b[1] - a[1])
  const maxAcao = Math.max(1, ...acoes.map(a => a[1]))
  // O denominador honesto: aberturas do menu escolhido, ou de todos quando só
  // existe um. Com vários menus somados, não há denominador — e aí não há %.
  const baseAberturas = menuAtivo ? menuAtivo.aberturas : (umMenuSo ? aberturas : null)
  const dicas = recomendacoes(d)
  const semNada = toques === 0 && aberturas === 0

  const SERIES = {
    toques:    { campo: 'toques',    cor: 'var(--blue)', rotulo: 'Toques' },
    aberturas: { campo: 'aberturas', cor: '#1E8E3E',     rotulo: 'Aberturas' },
    cliques:   { campo: 'cliques',   cor: '#7B4BC4',     rotulo: 'Ações' }
  }

  return (
    <>
      <Head titulo="Resultados" sub="Entenda o que seus clientes fizeram depois de encostar o celular">
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
          {/* ── 1 · TOPO: três números, e o terceiro carrega a média ── */}
          <div className="v3-kpis tres">
            <Kpi rotulo="Toques" valor={toques.toLocaleString('pt-BR')}
              sub={<>pessoas encostaram o celular nos seus dispositivos<br/><Delta atual={toques} anterior={d.toques.anterior}/></>}/>
            <Kpi rotulo="Abriram o Menu" valor={aberturasDisp.toLocaleString('pt-BR')}
              sub={<>
                <b>{pctMenu}% dos toques</b> abriram um menu
                {porLink > 0 && <><br/>+{porLink} {porLink === 1 ? 'abertura veio' : 'aberturas vieram'} por link</>}
              </>}/>
            <Kpi rotulo="Ações escolhidas" valor={cliques.toLocaleString('pt-BR')}
              sub={mediaPorAbertura != null
                ? `${mediaPorAbertura.toFixed(1).replace('.', ',')} ações por abertura, em média`
                : 'nenhuma abertura de menu ainda'}/>
          </div>

          <div className="v3-cols">
            <div>
              {/* ── 2 · A DIVISÃO, numa barra só ── */}
              <Panel titulo="O que aconteceu depois do toque"
                sub={`De ${dataBr(d.de)} a ${dataBr(d.ate)} · ${toques} ${toques === 1 ? 'toque' : 'toques'} nos seus dispositivos`}>
                {/* Barra ÚNICA dividida, e não duas independentes: duas barras
                    deixam o leitor somando de cabeça; uma barra dividida É a
                    divisão. */}
                <div className="v3-split">
                  <span style={{ width: `${toques ? (direto / toques) * 100 : 50}%`, background: '#F5A623' }}/>
                  <span style={{ width: `${toques ? (aberturasDisp / toques) * 100 : 50}%`, background: 'var(--blue)' }}/>
                </div>
                <div className="v3-legs">
                  <div className="leg">
                    <div className="top"><span className="n">{direto}</span><span className="p g">{pctDireto}%</span></div>
                    <div className="t">Foram direto ao Google</div>
                    <div className="sm">dispositivos em Google Direto</div>
                  </div>
                  <div className="leg">
                    <div className="top"><span className="n">{aberturasDisp}</span><span className="p m">{pctMenu}%</span></div>
                    <div className="t">Abriram um Menu Inteligente</div>
                    <div className="sm">dispositivos com menu ligado</div>
                  </div>
                </div>
                {porLink > 0 && (
                  <div className="v3-avisinho">
                    <Link2 size={15} color="var(--blue-dk)" style={{ flex: 'none', marginTop: 1 }}/>
                    <div>
                      <b>+{porLink} {porLink === 1 ? 'abertura pelo link compartilhado' : 'aberturas pelo link compartilhado'}.</b>{' '}
                      Não {porLink === 1 ? 'entra' : 'entram'} na divisão acima porque não houve toque em
                      dispositivo — {porLink === 1 ? 'veio' : 'vieram'} de um link, bio ou QR Code.
                    </div>
                  </div>
                )}
              </Panel>

              {/* ── 4 · ONDE, em abas ── */}
              <section className="v3-panel">
                <header><h2>Onde seus clientes interagiram</h2></header>
                <div className="v3-abas">
                  <button className={aba === 'dispositivos' ? 'on' : ''} onClick={() => setAba('dispositivos')}>Dispositivos</button>
                  <button className={aba === 'menus' ? 'on' : ''} onClick={() => setAba('menus')}>Menus</button>
                </div>
                <div className="body">
                  {aba === 'dispositivos' ? (
                    !d.por_dispositivo.length
                      ? <p className="v3-dica" style={{ padding: '8px 0' }}>Nenhum dispositivo com movimento no período.</p>
                      : <div className="v3-table-wrap">
                          <table className="v3-t">
                            <thead><tr><th>Dispositivo</th><th>Experiência</th><th className="num">Toques</th><th className="num">Aberturas</th></tr></thead>
                            <tbody>
                              {d.por_dispositivo.map(p => (
                                <tr key={p.plate_id}>
                                  <td><div className="nm">{p.nome}</div><div className="sm">{nomeProduto(p.product_type)}</div></td>
                                  <td>{p.servindo === 'menu' ? <Chip>Menu</Chip> : <Chip tipo="g">Google Direto</Chip>}</td>
                                  <td className="num">{p.toques}</td>
                                  {/* Traço, não zero: dispositivo em Google Direto
                                      não tem menu pra abrir. */}
                                  <td className="num">{p.servindo === 'menu' ? p.aberturas : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                  ) : (
                    !d.menu.por_experiencia.length
                      ? <p className="v3-dica" style={{ padding: '8px 0' }}>Nenhum menu foi aberto no período.</p>
                      : <div className="v3-table-wrap">
                          <table className="v3-t">
                            <thead><tr><th>Menu</th><th className="num">Aberturas</th><th className="num">Ações</th><th className="num">Média por abertura</th></tr></thead>
                            <tbody>
                              {d.menu.por_experiencia.map(e => (
                                <tr key={e.experience_id}>
                                  <td className="nm">{e.name}</td>
                                  <td className="num">{e.aberturas}</td>
                                  <td className="num">{e.cliques}</td>
                                  <td className="num">
                                    {e.aberturas > 0 ? (e.cliques / e.aberturas).toFixed(1).replace('.', ',') : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                  )}
                </div>
              </section>
            </div>

            {/* ── 3 · O BLOCO PRINCIPAL DO PRO ── */}
            <div>
              <Panel titulo="O que seus clientes escolheram" extra={<Chip>PRO</Chip>}
                sub={baseAberturas != null
                  ? `Com base nas ${baseAberturas} ${baseAberturas === 1 ? 'abertura' : 'aberturas'}${menuAtivo && !umMenuSo ? ` de “${menuAtivo.name}”` : ' de menu do período'}`
                  : `Somando ${menus.length} menus — escolha um para ver o percentual`}>
                {!umMenuSo && menus.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <select className="v3-select" value={menuSel} onChange={e => setMenuSel(e.target.value)}
                      aria-label="Filtrar por menu">
                      <option value="todos">Todos os menus</option>
                      {menus.map(m => <option key={m.experience_id} value={m.experience_id}>{m.name}</option>)}
                    </select>
                  </div>
                )}
                {!acoes.length
                  ? <p className="v3-dica" style={{ padding: '8px 0' }}>Ninguém escolheu nenhuma ação ainda.</p>
                  : <div className="v3-table-wrap">
                      <table className="v3-t">
                        <thead><tr>
                          <th>Ação</th><th></th><th className="num">Escolhas</th>
                          {baseAberturas != null && <th className="num">% das aberturas</th>}
                        </tr></thead>
                        <tbody>
                          {acoes.map(([k, n]) => {
                            const a = acao(k)
                            return (
                              <tr key={k}>
                                <td>
                                  <span className="v3-icoacao" style={{ background: a.bg, color: a.cor }}>{a.gl}</span>
                                  <b style={{ marginLeft: 8 }}>{a.nome}</b>
                                </td>
                                <td style={{ width: '32%' }}>
                                  <span className="v3-bar"><i style={{ width: `${(n / maxAcao) * 100}%`, background: a.cor }}/></span>
                                </td>
                                <td className="num">{n}</td>
                                {/* Percentual só com denominador inequívoco.
                                    Somando vários menus, a coluna não existe —
                                    melhor não ter o número do que ter um errado. */}
                                {baseAberturas != null && (
                                  <td className="num">{baseAberturas > 0 ? `${Math.round((n / baseAberturas) * 100)}%` : '—'}</td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>}
              </Panel>
            </div>
          </div>

          {/* ── 5 · EVOLUÇÃO, largura inteira ── */}
          <Panel
            titulo="Interações ao longo do tempo"
            extra={<Chip>PRO</Chip>}
            sub={`${dataBr(d.de)} a ${dataBr(d.ate)} · dados diários do período`}>
            <div style={{ marginBottom: 12 }}>
              <div className="v3-seg">
                {Object.entries(SERIES).map(([k, s]) => (
                  <button key={k} aria-pressed={serie === k} onClick={() => setSerie(k)}>{s.rotulo}</button>
                ))}
              </div>
            </div>
            <Grafico serie={d.por_dia} campo={SERIES[serie].campo} cor={SERIES[serie].cor}/>
          </Panel>

          {/* ── 6 · RECOMENDA: só com dado que sustente ── */}
          {dicas.map((r, i) => (
            <div className="v3-rec" key={i}>
              <span className="ic"><Lightbulb size={16} color="var(--amber)"/></span>
              <div>
                <div className="t">StarTouch recomenda</div>
                <div className="s"><b>{r.titulo}.</b> {r.texto}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── 7 · A transparência do Google, compacta ── */}
      <div className="v3-nota">
        <Info size={14} style={{ flex: 'none', marginTop: 2 }}/>
        <div>
          A StarTouch mede o clique em “Avaliar no Google”, mas o Google não informa se a avaliação foi
          efetivamente publicada. Por isso não mostramos uma taxa de conversão artificial.
        </div>
      </div>
    </>
  )
}
