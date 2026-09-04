// ============================================================
// StarTouch V3 — Início ("Meu negócio hoje")
// Ordem aprovada: recomenda → KPIs → caminho → reputação → dispositivos.
// Ausência de medição nunca é convertida em zero.
// ============================================================
import React from 'react'
import { AlertTriangle, Check, Sparkles, TrendingUp } from 'lucide-react'
import { Head, Kpi, Delta, Estrelas, desde, diasDesde } from '../ui.jsx'
import { useToques, nomeProduto } from '../lib/dados.js'
import { currentUser } from '../lib/api.js'

const SETE_DIAS_EM_SEGUNDOS = 7 * 24 * 60 * 60

function novasAvaliacoes(avaliacoes) {
  const lista = avaliacoes?.reviews
  if (!Array.isArray(lista)) return null
  const limite = Math.floor(Date.now() / 1000) - SETE_DIAS_EM_SEGUNDOS
  const recentes = lista.filter(r => Number(r.id) >= limite).length
  // O Google devolve no máximo as cinco avaliações mais recentes. A contagem
  // só é exata se vemos a lista inteira ou a fronteira anterior ao período.
  const listaCompleta = avaliacoes?.total != null && lista.length >= avaliacoes.total
  const fronteiraVisivel = lista.some(r => Number(r.id) < limite)
  return listaCompleta || fronteiraVisivel ? recentes : null
}

function dispositivosEmAtencao(dispositivos) {
  return dispositivos.filter(d => {
    if (d.status !== 'active') return false
    if (d.last_tapped_at) return diasDesde(d.last_tapped_at) >= 7
    return diasDesde(d.activated_at) >= 3
  })
}

function montarAvisos({ dispositivos, toques }) {
  const avisos = []
  const ativos = dispositivos.filter(d => d.status === 'active')
  const parados = ativos
    .filter(d => d.last_tapped_at && diasDesde(d.last_tapped_at) >= 7)
    .sort((a, b) => diasDesde(b.last_tapped_at) - diasDesde(a.last_tapped_at))

  if (parados.length) {
    const d = parados[0]
    avisos.push({
      titulo: `Confira “${d.channel_name || nomeProduto(d.product_type)}”`,
      sub: `A última interação registrada foi há ${diasDesde(d.last_tapped_at)} dias. Veja se o dispositivo continua visível e sendo utilizado.`,
      destino: 'dispositivos'
    })
  }

  const nunca = ativos.filter(d => !d.last_tapped_at && diasDesde(d.activated_at) >= 3)
  if (nunca.length) {
    avisos.push({
      titulo: nunca.length === 1 ? 'Confira seu dispositivo recém-ativado' : 'Confira seus dispositivos recém-ativados',
      sub: nunca.length === 1
        ? 'Ele ainda não registrou nenhuma interação. Veja se está em um lugar visível para o cliente.'
        : 'Eles ainda não registraram nenhuma interação. Veja se estão em um lugar visível para o cliente.',
      destino: 'dispositivos'
    })
  }

  if (toques?.available && toques.prev_total != null && toques.prev_total >= 10) {
    const queda = Math.round(((toques.total - toques.prev_total) / toques.prev_total) * 100)
    if (queda <= -20) avisos.push({
      titulo: `As interações caíram ${Math.abs(queda)}% em relação ao período anterior`,
      sub: `${toques.total} agora, contra ${toques.prev_total} antes.`,
      destino: 'resultados'
    })
  }

  // Destaque de desempenho: o dispositivo que rende acima da média. É a única
  // boa notícia da lista, e por isso vai POR ÚLTIMO — a tela mostra um aviso
  // só, e problema tem que ganhar a vaga de elogio. Só aparece quando não há
  // nada pedindo atenção.
  //
  // As duas travas abaixo não são detalhe: com 2+ dispositivos medidos e pelo
  // menos 20 toques no total. Com 3 toques, "2,4× a média" é ruído estatístico
  // com cara de descoberta — e a tela perde a credibilidade justamente onde
  // ela deveria ganhar.
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
          tom: 'bom',
          titulo: `${topo.channel_name || nomeProduto(topo.product_type)} gera ${vezes.toFixed(1).replace('.', ',')}× mais toques que a média`,
          sub: `${porPlaca[topo.id]} interações no período, contra uma média de ${Math.round(mediaResto)} dos outros.`,
          destino: 'dispositivos'
        })
      }
    }
  }

  return avisos
}

function ultimaInteracao(dispositivo) {
  return dispositivo.last_tapped_at ? desde(dispositivo.last_tapped_at) : 'Ainda não houve'
}

export default function Inicio({ dados, ir }) {
  const { biz, info, avaliacoes, dispositivos } = dados
  const historico = useToques(7)
  const toques = dados.previewToques || historico.toques
  const carregandoToques = dados.previewToques ? false : historico.carregando
  const nota = avaliacoes?.rating ?? info?.rating ?? null
  const totalAvaliacoes = avaliacoes?.total ?? info?.total ?? null
  const novas = novasAvaliacoes(avaliacoes)
  const ativos = dispositivos.filter(d => d.status === 'active')
  const emAtencao = dispositivosEmAtencao(dispositivos)
  const recomendacao = montarAvisos({ dispositivos, toques })[0] || null
  const idsAtencao = new Set(emAtencao.map(d => d.id))
  const destaques = [...ativos]
    .sort((a, b) => {
      const prioridade = Number(idsAtencao.has(b.id)) - Number(idsAtencao.has(a.id))
      if (prioridade) return prioridade
      if (idsAtencao.has(a.id) && idsAtencao.has(b.id)) {
        return (diasDesde(b.last_tapped_at) || 0) - (diasDesde(a.last_tapped_at) || 0)
      }
      return (toques?.by_plate?.[b.id] || 0) - (toques?.by_plate?.[a.id] || 0)
    })
    .slice(0, 2)
  const primeiroNome = ((currentUser()?.name || '').trim().split(/\s+/)[0]) || null
  const toquesDisponiveis = !!toques?.available

  return (
    <div className="v3-home">
      <Head oi={primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'} titulo="Meu negócio hoje"
        sub="Acompanhe o desempenho dos últimos 7 dias">
        <div className="v3-picker" title={biz?.name}>{biz?.name}</div>
        <div className="v3-picker">Últimos 7 dias</div>
      </Head>

      <section className="v3-home-section v3-home-recommendation-section" aria-labelledby="home-recomenda">
        {/* O tom decide a cor e o ícone. Sem isto, o destaque de desempenho —
            que é elogio — sairia com triângulo amarelo de alerta, e o cliente
            leria "seu melhor dispositivo" como problema. Reusa as classes
            `atencao` e `ok` que já existem. */}
        <div className={`v3-home-recommendation ${recomendacao && recomendacao.tom !== 'bom' ? 'atencao' : 'ok'}`}>
          <div className="icone">
            {!recomendacao ? <Check size={17}/>
              : recomendacao.tom === 'bom' ? <TrendingUp size={17}/>
                : <AlertTriangle size={17}/>}
          </div>
          <div className="texto">
            <span className="eyebrow" id="home-recomenda">
              {recomendacao?.tom === 'bom' ? 'STARTOUCH DESTACA' : 'STARTOUCH RECOMENDA'}
            </span>
            <strong>{recomendacao ? recomendacao.titulo : 'Tudo certo por aqui'}</strong>
            <span>{recomendacao ? recomendacao.sub
              : ativos.length === 0 ? 'Assim que você ativar um dispositivo, os avisos sobre ele aparecem aqui.'
                : !toquesDisponiveis ? 'O histórico de interações ainda não está disponível para gerar recomendações.'
                  : 'Não encontramos nada que precise da sua atenção agora.'}</span>
          </div>
          {recomendacao && <button type="button" className="v3-btn" onClick={() => ir(recomendacao.destino)}>
            {recomendacao.destino === 'resultados' ? 'Ver resultados →' : 'Ver dispositivo →'}
          </button>}
        </div>
      </section>

      <section className="v3-home-section" aria-labelledby="home-periodo">
        <div className="v3-home-section-title compacto"><h2 id="home-periodo">Nos últimos 7 dias</h2></div>
        <div className="v3-kpis tres v3-home-kpis">
          <Kpi rotulo="Interações STARTOUCH"
            valor={toquesDisponiveis ? toques.total.toLocaleString('pt-BR') : null}
            indisponivel={carregandoToques ? '…' : 'sem medição'}
            sub={toquesDisponiveis ? <Delta atual={toques.total} anterior={toques.prev_total}/> : 'histórico indisponível'}/>
          <Kpi rotulo="Avaliações no Google"
            valor={novas != null ? `+${novas.toLocaleString('pt-BR')}` : null}
            indisponivel="sem medição"
            sub={novas != null ? 'novas no período' : 'o Google não fornece um histórico completo'}/>
          <Kpi rotulo="Nota no Google"
            valor={nota != null ? nota.toFixed(1).replace('.', ',') : null}
            sub={nota != null
              ? <><Estrelas nota={nota}/> {totalAvaliacoes != null ? `${totalAvaliacoes.toLocaleString('pt-BR')} avaliações no total` : ''}</>
              : 'não foi possível consultar agora'}/>
        </div>
      </section>

      <section className="v3-home-insights">
        <article className="v3-home-card interacoes">
          <header><div><h2>Experiência após o toque</h2><p>O que está configurado para seus dispositivos</p></div></header>
          <div className="v3-home-experience">
            <div className="v3-home-current">
              <span className="rotulo">Experiência atual</span>
              <strong>Avaliação no Google</strong>
              <p>Ao interagir, o cliente é direcionado à sua página de avaliação.</p>
            </div>
            <div className="v3-home-upsell">
              <div className="icone"><Sparkles size={16}/></div>
              <div className="texto">
                <span className="pro">PRO</span>
                <strong>Menu Inteligente</strong>
                <p>Ofereça avaliação, cardápio, WhatsApp, promoções e outras ações em uma experiência personalizada.</p>
              </div>
              <button type="button" className="v3-btn solid" onClick={() => ir('experiencia')}>
                {biz?.plan === 'pro' ? 'Configurar menu →' : 'Conhecer o Menu Inteligente →'}
              </button>
            </div>
          </div>
        </article>

      </section>

      <section className="v3-home-devices" aria-labelledby="home-devices">
        <header><div><h2 id="home-devices">Seus dispositivos</h2>
          <p><strong>{ativos.length} {ativos.length === 1 ? 'dispositivo ativo' : 'dispositivos ativos'}</strong></p></div>
          <button type="button" className="v3-home-link" onClick={() => ir('dispositivos')}>Gerenciar dispositivos →</button></header>
        {destaques.length ? <div className="v3-home-device-list">{destaques.map(d => {
          const atencao = idsAtencao.has(d.id)
          const qtd = toques?.by_plate?.[d.id] || 0
          return <div className="v3-home-device" key={d.id}>
            <div><strong>{d.channel_name || nomeProduto(d.product_type)}</strong><span>{nomeProduto(d.product_type)}</span></div>
            <div className={atencao ? 'alerta' : ''}><strong>{toquesDisponiveis ? `${qtd.toLocaleString('pt-BR')} ${qtd === 1 ? 'interação' : 'interações'}` : 'Sem medição'}</strong><span>últimos 7 dias</span></div>
            <div className={atencao ? 'alerta direita' : 'direita'}><strong>{ultimaInteracao(d)}</strong><span>última interação</span></div>
          </div>
        })}</div> : <div className="v3-home-empty dispositivos">Nenhum dispositivo ativo ainda.</div>}
      </section>
    </div>
  )
}
