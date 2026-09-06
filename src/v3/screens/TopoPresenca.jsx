// ============================================================
// StarTouch V3 — Topo de presença
// ============================================================
// O PEDAÇO DA TELA QUE VALE PARA TODO MUNDO. Ele responde uma pergunta só —
// "como está a minha presença?" — e essa pergunta é a mesma para as três
// pessoas que entram no painel:
//
//   fase 0 · visitante sem conta, que veio ver como está a empresa dele
//   fase 1 · conta criada, dispositivo ainda não ativado (inclui todo comprador
//            do Mercado Livre entre a compra e a chegada do cartão)
//   fase 2 · cliente operando, com dispositivos ativos
//
// O que muda entre elas é a resposta ao "e agora?", que mora ABAIXO deste
// bloco. Este topo não muda: os quatro ingredientes do Score e a medição de
// colocação são todos públicos, obtidos por `place_id`, e nenhum depende de ter
// dispositivo, conta ou plano.
//
// Antes disto, o Início do V3 assumia uma coisa só — "você é cliente e tem
// hardware instalado" — e para quem não tinha, metade da tela ficava vazia
// falando de dispositivos inexistentes, enquanto a colocação (a única coisa que
// a pessoa veio ver) ficava enterrada dentro de Reputação.
// ============================================================
import React from 'react'
import { scoreDoNegocio, faixaDoScore, leituraDaColocacao, maiorLacuna } from '../lib/score.js'
import { PESOS } from '../../../api/_lib/score-core.js'
import { dataBr } from '../ui.jsx'
import '../topo.css'

function Anel({ score, faixa }) {
  const R = 46
  const C = 2 * Math.PI * R
  const preenchido = C * (Math.max(0, Math.min(100, score)) / 100)
  return (
    <div className={`anel ${faixa}`}>
      <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">
        <circle cx="54" cy="54" r={R} fill="none" stroke="var(--bg)" strokeWidth="9"/>
        <circle cx="54" cy="54" r={R} fill="none" stroke="currentColor" strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${preenchido} ${C - preenchido}`}/>
      </svg>
      <div className="n">
        <b>{score}</b>
        <span>de 100</span>
      </div>
    </div>
  )
}

function Fator({ nome, ganho, maximo }) {
  const pct = maximo > 0 ? Math.round((ganho / maximo) * 100) : 0
  return (
    <div className="fator">
      <span className="nm">{nome}</span>
      <span className="barra"><i style={{ width: `${pct}%` }}/></span>
      <span className="pt">{Math.round(ganho)}/{maximo}</span>
    </div>
  )
}

/**
 * O QUE VAI EM DESTAQUE na colocação.
 *
 * Era "5 de 5 pontos" — que é uma conta, não um recado. Pior: quando o lojista
 * está no topo em toda a região, esse número esconde justamente a boa notícia,
 * e quando ele aparece em todo lugar mas nunca no topo, o "5 de 5" parece
 * elogio quando o caso é o oposto. Aparecer é o piso; estar entre os três
 * primeiros é o que a tela inteira diz que importa — então é isso que ocupa a
 * linha grande, e a cobertura vira o detalhe embaixo.
 */
function destaqueDaColocacao(coloc) {
  const abaixo = Math.max(0, coloc.aparece - (coloc.top3 || 0))
  const ausente = Math.max(0, coloc.medidos - coloc.aparece)
  const demais = []
  if (abaixo) demais.push(`em ${abaixo} você aparece abaixo do terceiro`)
  if (ausente) demais.push(`em ${ausente} você não aparece`)

  // Sem a lista de pontos não se sabe o top 3 — e o destaque não pode afirmar
  // nada sobre ele. Cai na cobertura, que é o que de fato se sabe.
  if (coloc.top3 == null) {
    return {
      titulo: <>{coloc.aparece} <small>de {coloc.medidos} lugares</small></>,
      sub: <>Você aparece em {coloc.aparece} dos {coloc.medidos} pontos medidos ao redor do seu endereço.</>
    }
  }
  if (coloc.top3 === coloc.medidos) {
    return {
      titulo: 'No topo em toda a região',
      sub: <>Você está entre os <strong>3 primeiros</strong> nos {coloc.medidos} pontos medidos
        ao redor do seu endereço. É o melhor resultado possível nesta medição.</>
    }
  }
  if (coloc.top3 > 0) {
    return {
      titulo: <>Top 3 em {coloc.top3} <small>de {coloc.medidos} lugares</small></>,
      sub: <>Nos demais, {demais.join(' e ')} — e é nos três primeiros que as pessoas olham.</>
    }
  }
  return {
    titulo: 'Fora do top 3',
    sub: <>Você aparece em {coloc.aparece} dos {coloc.medidos} pontos medidos, mas
      em <strong>nenhum deles</strong> está entre os 3 primeiros — e é nos três primeiros
      que as pessoas olham.</>
  }
}

export default function TopoPresenca({ dados, ir }) {
  const { avaliacoes, info, posicao } = dados
  const calc = scoreDoNegocio({ avaliacoes, info, posicao })

  // MEDIDO E FORA DE TUDO NAO PODE LER "presenca forte". Um negocio com nota
  // alta e muitas avaliacoes chega a 77 sem aparecer em NENHUM ponto da regiao
  // — o score vem de reputacao, e reputacao otima invisivel e exatamente o caso
  // que a StarTouch conserta. Sem esta trava, o cartao da esquerda dizia "sua
  // presenca esta forte" enquanto o da direita dizia "Fora da lista", na mesma
  // tela e sobre o mesmo negocio.
  //
  // A trava mora AQUI, na leitura, e nao na conta: `score-core.js` e
  // compartilhado com o painel e com o e-mail semanal, e mexer nele mudaria o
  // numero de todo mundo. O numero continua o mesmo; o que muda e o recado.
  const invisivel = calc.posFonte === 'fora'
  const faixaBruta = faixaDoScore(calc.score)
  // Rebaixa o verde, mas so o verde: quem ja esta em laranja ou vermelho nao
  // precisa de trava, e a frase muda conforme a reputacao seja boa ou nao —
  // "sua reputacao e boa, mas voce nao aparece" seria falso pra quem tem nota
  // baixa e poucas avaliacoes.
  const faixa = invisivel && faixaBruta === 'bom' ? 'medio' : faixaBruta
  const coloc = leituraDaColocacao(posicao)
  const pontos = (posicao?.points || []).filter(p => p.ok)
  // Uma vez só: chamar de novo na hora de desenhar refaria a conta e abriria
  // espaço pra título e detalhe descreverem estados diferentes.
  const destaque = coloc && !coloc.foraDeTudo ? destaqueDaColocacao(coloc) : null

  // O veredito sai da MESMA faixa que pinta o anel — se cada um tivesse sua
  // régua, um dia a cor diria uma coisa e a frase diria outra.
  const VEREDITO = {
    bom:   'Sua presença está forte',
    medio: 'Sua presença está razoável',
    baixo: 'Sua presença está fraca'
  }
  const lacuna = maiorLacuna(calc, dados)

  return (
    <div className="v3-topo">
      <section className="cartao">
        <div className="score">
          <Anel score={calc.score} faixa={faixa}/>
          <div className="txt">
            <div className="rotulo">Score StarTouch</div>
            <h2>{!invisivel ? VEREDITO[faixa]
              : faixaBruta === 'bom' ? 'Sua reputação é boa, mas você não aparece'
                : 'Você não está aparecendo na sua região'}</h2>
            {/* Antes, aqui morava a explicação da mecânica ("a conta pesa
                quatro coisas…"). Ela repetia em prosa o que as quatro barras
                logo abaixo já mostram, e deixava sem resposta a única pergunta
                que o lojista tem diante do número: e o que eu faço com isso? */}
            <p>
              Seu Score mostra o quanto seu negócio está <strong>aparecendo e se destacando</strong> no
              Google.{' '}
              {lacuna && <>Hoje, o principal fator que limita seu resultado é {lacuna.frase}.</>}
            </p>
          </div>
        </div>
        <div className="fatores">
          <Fator nome="Nota"        ganho={calc.notaPts}   maximo={PESOS.nota}/>
          <Fator nome="Avaliações"  ganho={calc.volPts}    maximo={PESOS.volume}/>
          <Fator nome="Posição"     ganho={calc.posPts}    maximo={PESOS.posicao}/>
          <Fator nome="Perfil"      ganho={calc.perfilPts} maximo={PESOS.perfil}/>
        </div>
        {/* O único fator que o lojista conserta hoje, sozinho e de graça: os
            outros três dependem de atendimento, tempo e concorrência. Por isso
            é o que ganha frase própria — e ela diz quantos pontos estão parados,
            não só o que falta. */}
        {!!calc.faltando.length && lacuna?.chave !== 'perfil' && (
          <p className="nota" style={{ marginTop: 9, fontSize: 11.5, color: 'var(--dim)' }}>
            No seu perfil do Google falta {calc.faltando.join(' e ')} —
            são {Math.round(PESOS.perfil - calc.perfilPts)} pontos parados esperando
            uma correção de dois minutos.
          </p>
        )}
      </section>

      <section className="cartao coloc">
        <div className="rotulo">Sua colocação na região</div>

        {!coloc ? (
          <div className="na">
            Ainda não medimos sua posição. Assim que a medição rodar, ela aparece aqui.
          </div>
        ) : coloc.foraDeTudo ? (
          <>
            <div className="grande">Fora da lista</div>
            <div className="sub">
              Testamos <strong>{coloc.medidos} pontos</strong> ao redor do seu endereço e você não
              apareceu em nenhum deles para quem busca{coloc.termo ? <> “<strong>{coloc.termo}</strong>”</> : ' pela sua categoria'}.
            </div>
            <div className="pontos">
              {Array.from({ length: coloc.medidos }).map((_, i) => <i key={i}/>)}
            </div>
          </>
        ) : (
          <>
            <div className={'grande' + (typeof destaque.titulo === 'string' ? ' frase' : '')}>{destaque.titulo}</div>
            <div className="sub">
              {destaque.sub}
              {coloc.termo && <> Medido para quem busca “<strong>{coloc.termo}</strong>”.</>}
            </div>
            {/* Uma barra por ponto medido ao redor do endereço. Verde = está
                entre os 3 primeiros ali; azul = aparece, mas abaixo do terceiro;
                vazia = não apareceu naquele ponto. `rank` nulo é ausência, e
                ausência não pode ser pintada como presença. */}
            <div className="pontos">
              {pontos.map((p, i) => (
                <i key={i} className={p.rank == null ? '' : (p.rank <= 3 ? 'top' : 'ok')}/>
              ))}
            </div>
          </>
        )}

        <p className="nota">
          O Google não mostra a mesma lista para todo mundo: ela muda conforme o lugar de onde a
          pessoa procura. Por isso medimos em vários pontos ao redor do seu endereço, e não em um só.
          {coloc?.medidoEm && <> Medido em {dataBr(coloc.medidoEm)}.</>}
        </p>

        {ir && (
          <button type="button" className="v3-btn" style={{ marginTop: 10 }} onClick={() => ir('reputacao')}>
            Ver quem aparece na sua frente →
          </button>
        )}
      </section>
    </div>
  )
}
