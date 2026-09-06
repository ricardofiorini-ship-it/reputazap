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
import { scoreDoNegocio, faixaDoScore, leituraDaColocacao } from '../lib/score.js'
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

export default function TopoPresenca({ dados, ir }) {
  const { avaliacoes, info, posicao } = dados
  const calc = scoreDoNegocio({ avaliacoes, info, posicao })
  const faixa = faixaDoScore(calc.score)
  const coloc = leituraDaColocacao(posicao)
  const pontos = (posicao?.points || []).filter(p => p.ok)

  // A frase que traduz o número. Sem isto o Score vira um número solto, e
  // número solto não diz a ninguém o que fazer com ele.
  const leitura = calc.score >= 80
    ? 'Sua presença está forte. O trabalho agora é manter.'
    : calc.score >= 55
      ? 'Sua presença está razoável, e há espaço claro para subir.'
      : 'Sua presença está fraca — é aqui que está a maior oportunidade.'

  return (
    <div className="v3-topo">
      <section className="cartao">
        <div className="score">
          <Anel score={calc.score} faixa={faixa}/>
          <div className="txt">
            <div className="rotulo">Score StarTouch</div>
            <h2>{leitura}</h2>
            <p>
              A conta pesa quatro coisas que o Google mostra sobre você:
              sua nota, quantas avaliações você tem, em que posição você
              aparece na região e se o seu perfil está completo.
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
        {!!calc.faltando.length && (
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
            <div className="grande">
              {coloc.aparece} <small>de {coloc.medidos} pontos</small>
            </div>
            <div className="sub">
              {coloc.top3 == null
                ? <>É em quantos lugares ao redor do seu endereço você aparece para quem busca{coloc.termo ? <> “<strong>{coloc.termo}</strong>”</> : ' pela sua categoria'}.</>
                : coloc.top3 > 0
                  ? <>Em <strong>{coloc.top3}</strong> deles você está entre os <strong>3 primeiros</strong> — que é onde as pessoas realmente olham.</>
                  : <>Você aparece, mas <strong>em nenhum deles está entre os 3 primeiros</strong> — e é nos três primeiros que as pessoas olham.</>}
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
