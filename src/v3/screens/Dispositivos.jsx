// ============================================================
// StarTouch V3 — Dispositivos
// ============================================================
// Área MISTA: quase tudo aqui é gratuito e continua sendo. A régua de
// 29/08/2026 aplica-se inteira nesta tela — contagem de toques, histórico,
// último toque e períodos são o que o cliente já tem hoje no painel atual, e
// nada disso pode migrar pra Resultados (que nasce Pro). O único recurso Pro
// previsto aqui é o link para dispositivo comprado fora, que ainda não existe.
// ============================================================
import React from 'react'
import { Head, Kpi, Panel, Chip, Delta, Barras, desde, diasDesde, dataBr } from '../ui.jsx'
import { Tablet } from 'lucide-react'
import { useToques, nomeProduto } from '../lib/dados.js'
import { api } from '../lib/api.js'

const JANELAS = [7, 30, 90]

function fotoProduto(tipo) {
  if (tipo === 'cartao_nfc') return '/hardware/cartao-startouch.webp'
  if (['placa_balcao', 'placa_mesa', 'placa_parede'].includes(tipo)) return '/hardware/placa-startouch.webp'
  return null
}

// O que o lojista ainda NÃO tem, sugerido no fim da tela. Mesma ideia da
// prévia do Menu Inteligente: ele vê o que é dele e, ao lado, o que caberia.
//
// ⚠️ A PULSEIRA NFC FICA DE FORA DE PROPÓSITO: está `soldOut: true` no
// KIT_CATALOG (api/billing.js). Sugerir um produto esgotado é pior do que não
// sugerir nada — manda o cliente a uma página onde ele não consegue comprar,
// que é o oposto do efeito pretendido. Se voltar a ter estoque, entra aqui.
//
// ⚠️ SEM PREÇO, também de propósito. O preço mora no KIT_CATALOG e muda lá; se
// fosse copiado para cá, um reajuste deixaria o painel anunciando um valor que
// o checkout não pratica. O link leva ao /kit, onde o número é o verdadeiro.
//
// `id` é a chave do KIT_CATALOG e alimenta /kit?add=<id>, que já pré-seleciona
// o item no carrinho.
const SUGESTOES_HARDWARE = [
  {
    id: 'cartao-nfc', nome: 'Cartão NFC', foto: '/hardware/cartao-startouch.webp',
    tem: (tipos) => tipos.has('cartao_nfc'),
    porque: 'Um para cada pessoa do atendimento. Você acompanha, aqui nesta tela, quantas interações cada um trouxe.'
  },
  {
    id: 'placa-balcao', nome: 'Placa de balcão', foto: '/hardware/placa-startouch.webp',
    tem: (tipos) => ['placa_balcao', 'placa_mesa', 'placa_parede'].some(t => tipos.has(t)),
    porque: 'Fica no balcão e trabalha sozinha: quem está pagando encosta o celular sem ninguém precisar pedir.'
  }
]

export default function Dispositivos({ dados }) {
  const [dias, setDias] = React.useState(30)
  const historico = useToques(dias)
  const toques = dados.previewToquesPorPeriodo?.[dias] || historico.toques
  const carregando = dados.previewToquesPorPeriodo ? false : historico.carregando
  const [renomeando, setRenomeando] = React.useState(null)
  const [rascunho, setRascunho] = React.useState('')
  const [salvando, setSalvando] = React.useState(false)
  const [erroNome, setErroNome] = React.useState(null)
  const [nomesLocais, setNomesLocais] = React.useState({})

  const lista = dados.dispositivos
  const ativos = lista.filter(d => d.status === 'active')
  const porPlaca = toques?.by_plate || {}
  const parados = ativos.filter(d => d.last_tapped_at && diasDesde(d.last_tapped_at) >= 7).length
  const totalHistorico = ativos.reduce((s, d) => s + (d.total_taps || 0), 0)
  const nomeDe = (d) => nomesLocais[d.id] ?? d.channel_name

  // Considera TODOS os dispositivos, não só os ativos: quem comprou um cartão
  // e ainda não ativou já tem cartão — sugerir a compra de outro seria não
  // estar prestando atenção nele.
  const tiposQueTem = new Set(lista.map(d => d.product_type))
  const sugestoesHardware = SUGESTOES_HARDWARE.filter(s => !s.tem(tiposQueTem))

  async function salvarNome(d) {
    const novo = rascunho.trim()
    if (!novo || novo === nomeDe(d)) { setRenomeando(null); return }
    setSalvando(true); setErroNome(null)
    try {
      await api.renomear(d.id, novo)
      // Guarda local em vez de recarregar tudo: recarregar dispararia de novo
      // a grade, que é a única chamada paga da tela. Renomear é etiqueta.
      setNomesLocais(m => ({ ...m, [d.id]: novo }))
      setRenomeando(null)
    } catch (e) {
      setErroNome(e.message || 'Não foi possível renomear.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <Head titulo="Meus dispositivos" sub="Gerencie suas placas, cartões e outros pontos de contato">
        <a className="v3-btn solid" href="/app?tab=painel#dispositivos">Ativar dispositivo</a>
        <a className="v3-btn" href="/kit">Comprar mais</a>
      </Head>

      <div className="v3-kpis">
        <Kpi rotulo="Ativos" valor={ativos.length}/>
        <Kpi
          rotulo={`Toques (${dias} dias)`}
          valor={toques?.available ? toques.total.toLocaleString('pt-BR') : null}
          indisponivel={carregando ? '…' : 'histórico indisponível'}
          sub={toques?.available ? <Delta atual={toques.total} anterior={toques.prev_total}/> : null}/>
        <Kpi
          rotulo="Toques (total)"
          valor={totalHistorico.toLocaleString('pt-BR')}
          sub="desde a ativação de cada dispositivo"/>
        <Kpi
          rotulo="Sem uso há +7 dias"
          valor={ativos.length ? parados : null}
          sub={parados > 0 ? 'vale conferir onde estão' : 'todos registrando toques'}/>
      </div>

      {/* O log de toques começou num dia específico. Pedir 90 dias de um log
          mais novo que isso não pode parecer queda de movimento — por isso a
          data vem do backend e aparece na tela. */}
      {toques?.available && toques.measuring_since && (
        <Panel
          titulo="Toques por dia"
          extra={<Chip tipo="g">Free</Chip>}
          sub={`De ${dataBr(toques.from_day)} a ${dataBr(toques.to_day)} · registrando desde ${dataBr(toques.measuring_since)}`}>
          <div style={{ marginBottom: 12 }}>
            <div className="v3-seg">
              {JANELAS.map(j => (
                <button key={j} aria-pressed={dias === j} onClick={() => setDias(j)}>{j} dias</button>
              ))}
            </div>
          </div>
          <Barras serie={toques.by_day || []} rotuloA={dataBr(toques.from_day)} rotuloB={dataBr(toques.to_day)}/>
          {!!toques.by_medium && Object.keys(toques.by_medium).length > 0 && (
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--dim)' }}>
              Como chegaram:{' '}
              {Object.entries(toques.by_medium)
                .sort((a, b) => b[1] - a[1])
                .map(([m, n]) => `${n} por ${m === 'nfc' ? 'aproximação' : m === 'qr' ? 'QR Code' : m}`)
                .join(' · ')}
            </div>
          )}
        </Panel>
      )}

      {toques && !toques.available && (
        <div className="v3-callout">
          <div>
            <div className="t">O histórico de toques ainda não está ligado</div>
            <div className="s">
              A contagem total de cada dispositivo continua correta — o que falta é o registro com data,
              que é o que permite ver por dia e comparar períodos. Isso é “não sabemos”, não “ninguém tocou”.
            </div>
          </div>
        </div>
      )}

      <Panel
        titulo="Todos os dispositivos"
        extra={<Chip tipo="g">Free</Chip>}
        sub={ativos.length ? `${ativos.length} ${ativos.length === 1 ? 'ativo' : 'ativos'}` : null}>
        {lista.length === 0 && (
          <p style={{ fontSize: 12.8, color: 'var(--dim)', padding: '10px 0' }}>
            Você ainda não ativou nenhum dispositivo. Ao receber sua placa ou cartão, encoste o celular nele
            para ativar.
          </p>
        )}
        {lista.length > 0 && (
          <div className="v3-table-wrap">
            <table className="v3-t">
              <thead>
                <tr>
                  <th>Dispositivo</th><th>Código</th><th>Experiência</th>
                  <th className="num">{dias} dias</th><th className="num">Total</th>
                  <th>Último toque</th><th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map(d => {
                  const paradoDias = diasDesde(d.last_tapped_at)
                  const parado = d.last_tapped_at && paradoDias >= 7
                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="v3-device-ident">
                          <div className="foto">
                            {fotoProduto(d.product_type)
                              ? <img src={fotoProduto(d.product_type)} alt=""/>
                              : <Tablet size={20}/>} 
                          </div>
                          <div className="dados">{renomeando === d.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              autoFocus value={rascunho} maxLength={40}
                              onChange={e => setRascunho(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') salvarNome(d)
                                if (e.key === 'Escape') setRenomeando(null)
                              }}
                              style={{
                                font: 'inherit', fontSize: 12.5, padding: '6px 8px',
                                border: '1px solid var(--blue)', borderRadius: 6,
                                width: 140, maxWidth: '100%', minWidth: 0
                              }}/>
                            <button className="v3-btn solid" disabled={salvando} onClick={() => salvarNome(d)}>
                              {salvando ? '…' : 'Salvar'}
                            </button>
                            <button className="v3-btn ghost" onClick={() => setRenomeando(null)}>Cancelar</button>
                          </div>
                        ) : (
                          <>
                            <div className="nm">{nomeDe(d) || nomeProduto(d.product_type)}</div>
                            <div className="sm">{nomeProduto(d.product_type)}</div>
                          </>
                          )}
                          {renomeando === d.id && erroNome && (
                            <div className="sm" style={{ color: 'var(--red)' }}>{erroNome}</div>
                          )}</div>
                        </div>
                      </td>
                      <td className="sm">{d.code}</td>
                      <td>
                        {d.served_mode === 'menu'
                          ? <Chip>{d.experience_name || 'Menu Inteligente'}</Chip>
                          : <Chip tipo="g">Google Direto</Chip>}
                        {/* served_reason existe justamente pra o painel EXPLICAR
                            o rebaixamento em vez de a configuração parecer
                            perdida. Só aparece quando não é o caso trivial. */}
                        {d.served_mode !== 'menu' && d.served_reason && d.served_reason !== 'padrao' && (
                          <div className="sm" style={{ marginTop: 3 }}>{d.served_label || d.served_reason}</div>
                        )}
                      </td>
                      <td className="num">{toques?.available ? (porPlaca[d.id] || 0) : '—'}</td>
                      <td className="num">{(d.total_taps || 0).toLocaleString('pt-BR')}</td>
                      <td>
                        {d.status !== 'active'
                          ? <Chip tipo="n">não ativo</Chip>
                          : parado
                            ? <Chip tipo="a">há {paradoDias} dias</Chip>
                            : <span className="sm">{desde(d.last_tapped_at) || 'nunca tocado'}</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {renomeando !== d.id && d.status === 'active' && (
                          <button className="v3-btn ghost"
                            onClick={() => { setRenomeando(d.id); setRascunho(nomeDe(d) || ''); setErroNome(null) }}>
                            Renomear
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Só aparece se sobrar alguma sugestão. Quem já tem cartão e placa não
          precisa ver um bloco de venda no fim de toda visita — o botão
          "Comprar mais" lá em cima já dá conta. */}
      {sugestoesHardware.length > 0 && (
        <section className="v3-disp-sugestoes">
          <header>
            <h2>O que mais dá pra ter</h2>
            <p>Cada ponto de contato a mais é uma chance a mais de o cliente avaliar antes de ir embora.</p>
          </header>
          <div className="grade">
            {sugestoesHardware.map(s => (
              <a className="cartao" key={s.id} href={`/kit?add=${s.id}`}>
                <div className="foto">
                  {s.foto ? <img src={s.foto} alt="" loading="lazy"/> : <Tablet size={20}/>}
                </div>
                <div className="txt">
                  <strong>{s.nome}</strong>
                  <span>{s.porque}</span>
                </div>
                <span className="cta">Ver na loja →</span>
              </a>
            ))}
          </div>
        </section>
      )}

    </>
  )
}
