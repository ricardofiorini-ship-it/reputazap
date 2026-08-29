// ============================================================
// StarTouch V3 — Início ("Meu negócio hoje")
// ============================================================
// REGRA DESTA TELA: todo indicador e todo aviso sai de dado que já temos.
// Nada é estimado, nada é inventado, e nada aparece zerado por falta de
// fonte — indicador que só sabe dizer zero ensina o dono a não olhar.
//
// Por isso NÃO existem aqui os cartões "Leads captados" e "Promoções
// resgatadas" que apareciam no mock: pertencem a Clientes, que não existe.
// E o aviso "tempo de espera foi mencionado 17 vezes" ficou de fora porque
// depende de conectar o Perfil da Empresa no Google — a API pública devolve
// só ~5 avaliações.
// ============================================================
import React from 'react'
import { AlertTriangle, TrendingUp, Tablet, Star as StarIcon } from 'lucide-react'
import { Head, Kpi, Panel, Chip, Delta, Estrelas, Carregando, desde, diasDesde } from '../ui.jsx'
import { useToques, nomeProduto } from '../lib/dados.js'

// ── Os avisos ───────────────────────────────────────────────
// Cada um só aparece se o dado SUSTENTAR. Nenhum tem texto de reserva: aviso
// que aparece sempre vira ruído, e ruído ensina a ignorar a tela.
function montarAvisos({ dispositivos, toques, posicao }) {
  const avisos = []
  const ativos = dispositivos.filter(d => d.status === 'active')

  // 1. Dispositivo parado. A informação mais acionável que temos hoje e que o
  //    painel atual não mostra em lugar nenhum: placa que virou, saiu do lugar
  //    ou foi guardada. Só vale pra quem já tocou alguma vez — dispositivo
  //    recém-ativado que nunca tocou é outro caso, e outro texto.
  const parados = ativos
    .filter(d => d.last_tapped_at && diasDesde(d.last_tapped_at) >= 7)
    .sort((a, b) => diasDesde(b.last_tapped_at) - diasDesde(a.last_tapped_at))
  if (parados.length) {
    const d = parados[0]
    avisos.push({
      tom: 'atencao', icone: AlertTriangle,
      titulo: `${d.channel_name || nomeProduto(d.product_type)} não registra toque há ${diasDesde(d.last_tapped_at)} dias`,
      sub: parados.length > 1
        ? `Mais ${parados.length - 1} ${parados.length === 2 ? 'dispositivo está' : 'dispositivos estão'} na mesma situação. Pode ter saído do lugar, virado ou sido guardado.`
        : 'Pode ter saído do lugar, virado ou sido guardado.',
      acao: { label: 'Ver dispositivos', ir: 'dispositivos' }
    })
  }

  // 2. Nunca tocado. Diferente de parado: este nunca entrou em uso.
  const nunca = ativos.filter(d => !d.last_tapped_at && diasDesde(d.activated_at) >= 3)
  if (nunca.length) {
    avisos.push({
      tom: 'atencao', icone: Tablet,
      titulo: `${nunca.length === 1 ? 'Um dispositivo ativado' : `${nunca.length} dispositivos ativados`} ainda não registrou nenhum toque`,
      sub: 'Vale conferir se está num lugar onde o cliente encosta o celular.',
      acao: { label: 'Ver dispositivos', ir: 'dispositivos' }
    })
  }

  // 3. Destaque de desempenho: o dispositivo que rende acima da média. Só faz
  //    sentido com 2+ dispositivos medidos e um volume mínimo — com 3 toques
  //    no total, "2,4× a média" é ruído estatístico com cara de descoberta.
  if (toques?.available && toques.total >= 20) {
    const porPlaca = toques.by_plate || {}
    const medidos = ativos.filter(d => porPlaca[d.id] != null && porPlaca[d.id] > 0)
    if (medidos.length >= 2) {
      const ord = [...medidos].sort((a, b) => porPlaca[b.id] - porPlaca[a.id])
      const topo = ord[0]
      const resto = ord.slice(1)
      const mediaResto = resto.reduce((s, d) => s + porPlaca[d.id], 0) / resto.length
      const vezes = mediaResto > 0 ? porPlaca[topo.id] / mediaResto : 0
      if (vezes >= 1.5) {
        avisos.push({
          tom: 'bom', icone: TrendingUp,
          titulo: `${topo.channel_name || nomeProduto(topo.product_type)} gera ${vezes.toFixed(1).replace('.', ',')}× mais toques que a média`,
          sub: `${porPlaca[topo.id]} toques no período, contra uma média de ${Math.round(mediaResto)} dos outros.`,
          acao: { label: 'Ver dispositivos', ir: 'dispositivos' }
        })
      }
    }
  }

  // 4. Movimento caindo. Só compara quando o período anterior está inteiro
  //    depois do início do log — o backend já garante isso mandando
  //    `prev_total: null` quando não dá pra comparar honestamente.
  if (toques?.available && toques.prev_total != null && toques.prev_total >= 10) {
    const queda = Math.round(((toques.total - toques.prev_total) / toques.prev_total) * 100)
    if (queda <= -20) {
      avisos.push({
        tom: 'atencao', icone: TrendingUp,
        titulo: `Os toques caíram ${Math.abs(queda)}% em relação ao período anterior`,
        sub: `${toques.total} agora, contra ${toques.prev_total} antes.`,
        acao: { label: 'Ver dispositivos', ir: 'dispositivos' }
      })
    }
  }

  // 5. Posição fraca na busca medida.
  if (posicao && posicao.coverage === 0) {
    avisos.push({
      tom: 'atencao', icone: StarIcon,
      titulo: `Você não aparece em nenhum ponto medido para “${posicao.term}”`,
      sub: `Testamos ${posicao.measured} lugares ao redor do seu endereço.`,
      acao: { label: 'Ver reputação', ir: 'reputacao' }
    })
  }

  return avisos
}

const TOM = {
  atencao: { bg: 'var(--amber-soft)', cor: 'var(--amber)' },
  bom:     { bg: 'var(--green-soft)', cor: 'var(--green)' }
}

export default function Inicio({ dados, ir }) {
  const { biz, info, avaliacoes, dispositivos, posicao } = dados
  const { toques, carregando: carregandoToques } = useToques(7)

  const nota = avaliacoes?.rating ?? info?.rating ?? null
  const total = avaliacoes?.total ?? info?.total ?? null
  const ativos = dispositivos.filter(d => d.status === 'active')
  const avisos = montarAvisos({ dispositivos, toques, posicao })

  const primeiroNome = (() => {
    const n = (biz?.name || '').trim()
    return n ? n.split(/\s+/).slice(0, 3).join(' ') : 'seu negócio'
  })()

  return (
    <>
      <Head oi={`Olá — ${primeiroNome}`} titulo="Meu negócio hoje" sub="O que aconteceu nos últimos 7 dias">
        <div className="v3-picker">{biz?.name}</div>
        <div className="v3-picker">Últimos 7 dias</div>
      </Head>

      <div className="v3-kpis">
        <Kpi
          rotulo="Nota no Google"
          valor={nota != null ? nota.toFixed(1).replace('.', ',') : null}
          sub={nota != null ? <Estrelas nota={nota}/> : 'não foi possível consultar agora'}/>
        <Kpi
          rotulo="Avaliações no total"
          valor={total != null ? total.toLocaleString('pt-BR') : null}
          sub={total != null ? 'no seu perfil do Google' : 'não foi possível consultar agora'}/>
        <Kpi
          rotulo="Toques nos dispositivos"
          valor={toques?.available ? toques.total.toLocaleString('pt-BR') : null}
          indisponivel={carregandoToques ? '…' : 'histórico indisponível'}
          sub={toques?.available
            ? <Delta atual={toques.total} anterior={toques.prev_total}/>
            : 'o registro de toques ainda não está ligado'}/>
        <Kpi
          rotulo="Posição na região"
          valor={posicao && posicao.coverage > 0 && posicao.avg != null
            ? `${Math.round(posicao.avg)}º`
            : (posicao && posicao.coverage === 0 ? 'fora da lista' : null)}
          sub={posicao
            ? `em “${posicao.term}”, medido em ${posicao.measured} pontos ao redor do seu endereço`
            : 'não medida agora'}/>
      </div>

      <div className="v3-cols">
        <div>
          <Panel titulo="StarTouch recomenda" sub="O que aconteceu, o que significa e o que dá pra fazer agora">
            {/* "Nada pedindo atenção" só é verdade quando existe algo sendo
                vigiado. Sem dispositivo ativo, ou sem log de toques, o silêncio
                não é boa notícia — é ausência de medição, e dizer o contrário
                seria tranquilizar o dono com uma frase vazia. */}
            {avisos.length === 0 && (
              <p style={{ fontSize: 12.8, color: 'var(--dim)', padding: '10px 0' }}>
                {ativos.length === 0
                  ? 'Assim que você ativar um dispositivo, os avisos sobre ele aparecem aqui.'
                  : !toques?.available
                    ? 'O registro de toques ainda não está ligado, então não há como avisar sobre movimento dos dispositivos.'
                    : 'Nada pedindo atenção nos últimos 7 dias. Seus dispositivos estão registrando toques normalmente.'}
              </p>
            )}
            {avisos.map((a, i) => {
              const Ico = a.icone
              const tom = TOM[a.tom]
              return (
                <div className="v3-rec" key={i}>
                  <div className="ico" style={{ background: tom.bg }}>
                    <Ico size={15} color={tom.cor} strokeWidth={2}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t">{a.titulo}</div>
                    <div className="s">{a.sub}</div>
                  </div>
                  {a.acao && (
                    <button className="v3-btn" onClick={() => ir(a.acao.ir)}>{a.acao.label}</button>
                  )}
                </div>
              )
            })}
          </Panel>
        </div>

        <div>
          <Panel
            titulo="Seus dispositivos"
            sub={`${ativos.length} ${ativos.length === 1 ? 'ativo' : 'ativos'}${toques?.available ? ` · ${toques.total} ${toques.total === 1 ? 'toque' : 'toques'} em 7 dias` : ''}`}
            rodape={<button className="v3-btn ghost" onClick={() => ir('dispositivos')}>Ver todos os dispositivos →</button>}>
            {ativos.length === 0 && (
              <p style={{ fontSize: 12.8, color: 'var(--dim)', padding: '10px 0' }}>
                Nenhum dispositivo ativo ainda.
              </p>
            )}
            {ativos.length > 0 && (
              <div className="v3-table-wrap">
                <table className="v3-t">
                  <thead><tr><th>Dispositivo</th><th>Experiência</th><th className="num">Toques</th></tr></thead>
                  <tbody>
                    {[...ativos]
                      .sort((a, b) => (toques?.by_plate?.[b.id] || 0) - (toques?.by_plate?.[a.id] || 0))
                      .slice(0, 5)
                      .map(d => (
                        <tr key={d.id}>
                          <td>
                            <div className="nm">{d.channel_name || nomeProduto(d.product_type)}</div>
                            <div className="sm">{nomeProduto(d.product_type)}</div>
                          </td>
                          {/* Todo dispositivo hoje leva ao Google. A coluna já existe
                              porque é ela que ganha vida na Fase 2 — e mostrar o
                              estado real agora é mais honesto que escondê-la. */}
                          <td><Chip tipo="g">Google Direto</Chip></td>
                          <td className="num">
                            {toques?.available ? (toques.by_plate?.[d.id] || 0) : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}
